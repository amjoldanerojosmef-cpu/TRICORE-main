const { authenticateAdmin, supabaseClient } = require("../../lib/admin-auth");

const PAGE_SIZE = 25;
const TABLES = new Set(["service_requests", "contact_messages"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const user = await authenticateAdmin(req, res);
  if (!user) {
    return;
  }

  const table = req.query?.type;
  const offsetValue = req.query?.offset ?? "0";
  const offset = Number(offsetValue);
  if (
    typeof table !== "string" ||
    !TABLES.has(table) ||
    !/^\d+$/.test(String(offsetValue)) ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    return res.status(400).json({ error: "Invalid submissions page request." });
  }

  try {
    const { data, error, count } = await supabaseClient()
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`Could not read ${table} for admin:`, error.message);
      return res.status(500).json({ error: "Could not load submissions." });
    }

    return res.status(200).json({
      items: data,
      total: count,
      offset,
      limit: PAGE_SIZE,
      hasMore: offset + data.length < count,
    });
  } catch (error) {
    console.error(`Admin read request for ${table} failed:`, error.message);
    return res.status(502).json({ error: "Could not load submissions." });
  }
};
