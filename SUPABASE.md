# Supabase submissions on Vercel

The service-request and contact forms submit to Vercel serverless functions:

- `POST /api/service-request` saves to `public.service_requests`.
- `POST /api/contact` saves to `public.contact_messages`.

## 1. Create the Supabase tables

In the Supabase SQL Editor, run:

```sql
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact_number text not null,
  email text,
  service_category text not null,
  device_type text not null,
  device_model text,
  serial_number text,
  description text not null,
  preferred_date date,
  service_method text not null,
  address text,
  budget text,
  additional_notes text,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  constraint service_requests_category_check check (service_category in (
    'Computer Repair & Maintenance',
    'Printer Setup & Support',
    'Networking Solutions',
    'Hardware & Accessories',
    'Website Development',
    'IT Support & Consultation',
    'Other'
  )),
  constraint service_requests_device_check check (device_type in (
    'Desktop Computer',
    'Laptop',
    'Printer',
    'Router',
    'Network Equipment',
    'Website',
    'Other'
  )),
  constraint service_requests_method_check check (service_method in (
    'Bring-in Service',
    'On-site Service',
    'Remote Support'
  )),
  constraint service_requests_onsite_address_check check (
    service_method <> 'On-site Service' or address is not null
  )
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;
alter table public.contact_messages enable row level security;
alter table public.products enable row level security;

revoke all on public.service_requests from anon, authenticated;
revoke all on public.contact_messages from anon, authenticated;
revoke all on public.products from anon, authenticated;
grant select, insert, update, delete on public.service_requests to service_role;
grant select, insert, update, delete on public.contact_messages to service_role;
grant select, insert, update, delete on public.products to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

The Vercel functions use the Supabase service-role key only on the server. The
browser never receives it, and anonymous users have no direct database table
access. Product images are served from a public Supabase Storage bucket; image
uploads and deletes are created by authenticated server endpoints.

## 2. Configure Vercel

In the Vercel project, open **Settings → Environment Variables** and add:

- `SUPABASE_URL` — your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the project's service-role key from **Project
  Settings → API**.
- `ADMIN_EMAIL` — the exact email address of the administrator's Supabase Auth
  account.

Add all three values to the environments you use (Production, Preview, and/or
Development), then redeploy. Add the administrator account under **Supabase →
Authentication → Users** and make `ADMIN_EMAIL` match that account. Only that
email can use the admin dashboard. Never put the service-role key in a public
environment variable such as a `VITE_` or `NEXT_PUBLIC_` variable or in browser
JavaScript.

## 3. Test the deployed forms

Submit the contact form and service-request form on the deployed site. A
successful response means the row was saved; the corresponding row will appear
in the Supabase table. Server-side validation rejects invalid input.

The existing `npm run dev` command starts the PHP sign-in server and BrowserSync;
it does not emulate Vercel functions. To test these APIs locally, use the Vercel
CLI (`vercel dev`) with the same environment variables. Admin credentials are
verified with Supabase Auth. The access token is kept in an HttpOnly cookie, and
the server verifies the administrator account for every dashboard data request.
The service-role key is used only by server-side functions to fetch protected
submissions.

The administrator can sign in at `/signin.html`; the dashboard is at
`/admin.html`. The dashboard manages products, searches submissions, and
supports editing and deleting them. Product images are uploaded to Supabase
Storage. Products display publicly on `/products.html` with a PHP price and an
email inquiry link. Service requests have Low, Normal, High, and Urgent priority
values. Submissions are loaded in pages of 25. Ensure the
`service_role` database role has the following permissions:

```sql
grant select, insert, update, delete on public.service_requests to service_role;
grant select, insert, update, delete on public.contact_messages to service_role;
grant select, insert, update, delete on public.products to service_role;
```

If the tables already exist from an earlier setup, run this migration once to
add the priority field:

```sql
alter table public.service_requests
  add column if not exists priority text not null default 'normal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_priority_check'
      and conrelid = 'public.service_requests'::regclass
  ) then
    alter table public.service_requests
      add constraint service_requests_priority_check
      check (priority in ('low', 'normal', 'high', 'urgent'));
  end if;
end
$$;

grant select, insert, update, delete on public.service_requests to service_role;
grant select, insert, update, delete on public.contact_messages to service_role;
```
