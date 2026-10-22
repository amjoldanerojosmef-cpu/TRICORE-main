const { authenticateAdmin, supabaseClient } = require("../../lib/admin-auth");

const PAGE_SIZE = 25;
const TABLES = new Set(["service_requests", "contact_messages"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const SEARCH_COLUMNS = {
  service_requests: [
    "full_name",
    "contact_number",
    "email",
    "service_category",
    "device_type",
    "device_model",
    "serial_number",
    "description",
    "service_method",
    "address",
    "budget",
    "additional_notes",
    "priority",
  ],
  contact_messages: ["name", "email", "subject", "message"],
};

function escapePostgrestText(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

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
  const searchValue = req.query?.search ?? "";
  const priorityValue = req.query?.priority ?? "";
  const offset = Number(offsetValue);
  if (
    typeof table !== "string" ||
    !TABLES.has(table) ||
    !/^\d+$/.test(String(offsetValue)) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    typeof searchValue !== "string" ||
    searchValue.length > 100 ||
    typeof priorityValue !== "string" ||
    (priorityValue !== "" &&
      (table !== "service_requests" || !PRIORITIES.has(priorityValue)))
  ) {
    return res.status(400).json({ error: "Invalid submissions page request." });
  }

  try {
    let query = supabaseClient()
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    const search = searchValue.trim();
    if (search) {
      const escapedSearch = escapePostgrestText(search);
      query = query.or(
        SEARCH_COLUMNS[table]
          .map((column) => `${column}.ilike."%${escapedSearch}%"`)
          .join(","),
      );
    }
    if (priorityValue) {
      query = query.eq("priority", priorityValue);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + PAGE_SIZE - 1,
    );

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
