const { createClient } = require("@supabase/supabase-js");

const COOKIE_NAME = "tricore_admin_session";

function supabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cookieOptions(maxAge) {
  const secure =
    process.env.VERCEL === "1" ||
    (process.env["x-forwarded-proto"] || "").includes("https");

  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function readSessionToken(req) {
  const cookieHeader = req.headers.cookie || "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

  if (!sessionCookie) {
    return null;
  }

  try {
    return decodeURIComponent(sessionCookie.slice(COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

async function authenticateAdmin(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.error("Admin sign-in configuration is missing.");
    res.status(500).json({ error: "Admin sign-in is not configured." });
    return null;
  }

  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Administrator sign-in required." });
    return null;
  }

  try {
    const { data, error } = await supabaseClient().auth.getUser(token);
    const user = data?.user;
    if (error || !user || user.email?.toLowerCase() !== adminEmail) {
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=; ${cookieOptions(0)}`);
      res.status(401).json({ error: "Administrator sign-in required." });
      return null;
    }

    return user;
  } catch (error) {
    console.error("Admin session verification failed:", error.message);
    res.status(502).json({ error: "Could not verify the administrator session." });
    return null;
  }
}

module.exports = {
  authenticateAdmin,
  cookieOptions,
  COOKIE_NAME,
  readSessionToken,
  supabaseClient,
};
