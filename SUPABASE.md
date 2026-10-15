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

alter table public.service_requests enable row level security;
alter table public.contact_messages enable row level security;

revoke all on public.service_requests from anon, authenticated;
revoke all on public.contact_messages from anon, authenticated;
grant select, insert on public.service_requests to service_role;
grant select, insert on public.contact_messages to service_role;
```

The Vercel functions use the Supabase service-role key only on the server. The
browser never receives it, and anonymous users have no direct table access.

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
`/admin.html`. Submissions are loaded in pages of 25. Make sure the `service_role`
database role has `SELECT` permission on both tables:

```sql
grant select, insert on public.service_requests to service_role;
grant select, insert on public.contact_messages to service_role;
```
