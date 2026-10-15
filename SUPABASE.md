# Supabase sign-in server

The PHP server handles `POST /api/login` and keeps Supabase session tokens in a
PHP session cookie. Configure the project URL and anon/publishable key as
environment variables; never use a Supabase service-role key here.

In PowerShell, from the project directory:

```powershell
$env:SUPABASE_URL = "https://xhvlqhfkdhfehjdqnhze.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodmxxaGZrZGhmZWhqZHFuaHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MjAwNDcsImV4cCI6MjEwNzQ5NjA0N30.EOF1lCgRw56in4UWEAbyjTwjayS-8UXAoVFsiAJt4s4"
npm run dev
```

Open `http://127.0.0.1:3000/signin.html`. BrowserSync reloads the page when you
save an HTML, CSS, JavaScript, or PHP file. To test from another device on the
same network, open `http://your-computer-ip:3000/signin.html` there.

Configure the same environment variables in the PHP hosting environment for
deployment, and use HTTPS there. Email/password sign-in must be enabled in the
Supabase project's Auth settings.
