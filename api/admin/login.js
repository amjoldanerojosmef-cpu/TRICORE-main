const {
  cookieOptions,
  COOKIE_NAME,
  supabaseClient,
} = require("../../lib/admin-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return res.status(415).json({ error: "Send sign-in details as JSON." });
  }

  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.error("Admin sign-in configuration is missing.");
    return res.status(500).json({ error: "Admin sign-in is not configured." });
  }

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({ error: "Enter a valid email and password." });
  }

  try {
    const { data, error } = await supabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (
      error ||
      !data.session ||
      data.user?.email?.toLowerCase() !== adminEmail
    ) {
      return res.status(401).json({ error: "Invalid administrator credentials." });
    }

    const maxAge = Math.max(
      60,
      Math.min(Number(data.session.expires_in) || 3600, 86400),
    );
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(data.session.access_token)}; ${cookieOptions(maxAge)}`,
    );
    return res.status(200).json({
      user: { email: data.user.email },
    });
  } catch (error) {
    console.error("Admin sign-in request failed:", error.message);
    return res.status(502).json({ error: "Could not reach the sign-in service." });
  }
};
