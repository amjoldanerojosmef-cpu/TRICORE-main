const { authenticateAdmin, supabaseClient } = require("../../../lib/admin-auth");

const TABLE_COLUMNS = {
  service_requests: new Set([
    "full_name",
    "contact_number",
    "email",
    "service_category",
    "device_type",
    "device_model",
    "serial_number",
    "description",
    "preferred_date",
    "service_method",
    "address",
    "budget",
    "additional_notes",
    "priority",
  ]),
  contact_messages: new Set(["name", "email", "subject", "message"]),
};
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const ALLOWED_VALUES = {
  service_category: new Set([
    "Computer Repair & Maintenance",
    "Printer Setup & Support",
    "Networking Solutions",
    "Hardware & Accessories",
    "Website Development",
    "IT Support & Consultation",
    "Other",
  ]),
  device_type: new Set([
    "Desktop Computer",
    "Laptop",
    "Printer",
    "Router",
    "Network Equipment",
    "Website",
    "Other",
  ]),
  service_method: new Set([
    "Bring-in Service",
    "On-site Service",
    "Remote Support",
  ]),
};
const REQUIRED_FIELDS = {
  service_requests: [
    "full_name",
    "contact_number",
    "service_category",
    "device_type",
    "description",
    "service_method",
  ],
  contact_messages: ["name", "email", "subject", "message"],
};

function validateChanges(table, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid update data.";
  }

  const fields = TABLE_COLUMNS[table];
  const entries = Object.entries(body);
  if (!entries.length || entries.some(([field]) => !fields.has(field))) {
    return "One or more fields cannot be edited.";
  }

  for (const [field, value] of entries) {
    if (field === "priority") {
      if (table !== "service_requests" || !PRIORITIES.has(value)) {
        return "Select a valid priority.";
      }
      continue;
    }

    const isDate = field === "preferred_date";
    if (value === null && !REQUIRED_FIELDS[table].includes(field)) {
      continue;
    }
    if (typeof value !== "string") {
      return `${field} must be text.`;
    }

    const text = value.trim();
    const limit =
      field === "description" || field === "additional_notes" || field === "message"
        ? 5000
        : field === "address"
          ? 300
          : field === "email"
            ? 254
            : 500;

    if ((!text && REQUIRED_FIELDS[table].includes(field)) || text.length > limit) {
      return `${field} is required and must be no more than ${limit} characters.`;
    }
    if (isDate && text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return "Preferred service date must be a valid date.";
    }
    if (field === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return "Enter a valid email address.";
    }
    if (ALLOWED_VALUES[field] && !ALLOWED_VALUES[field].has(text)) {
      return `Select a valid ${field.replaceAll("_", " ")}.`;
    }
    if (isDate && text) {
      const parsedDate = new Date(`${text}T00:00:00.000Z`);
      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== text
      ) {
        return "Preferred service date must be a valid date.";
      }
    }
  }

  const resultingMethod = body.service_method;
  const resultingAddress = body.address;
  if (
    table === "service_requests" &&
    resultingMethod === "On-site Service" &&
    resultingAddress !== undefined &&
    !String(resultingAddress || "").trim()
  ) {
    return "Address is required for on-site service.";
  }

  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!["PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const user = await authenticateAdmin(req, res);
  if (!user) {
    return;
  }

  const id = req.query?.id;
  const table = req.query?.type;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    typeof table !== "string" ||
    !Object.hasOwn(TABLE_COLUMNS, table)
  ) {
    return res.status(400).json({ error: "Invalid submission." });
  }

  try {
    const client = supabaseClient();
    if (req.method === "DELETE") {
      const { data, error } = await client
        .from(table)
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error(`Could not delete ${table} submission:`, error.message);
        return res.status(500).json({ error: "Could not delete the submission." });
      }
      if (!data) {
        return res.status(404).json({ error: "Submission not found." });
      }
      return res.status(200).json({ deleted: true });
    }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return res.status(415).json({ error: "Send changes as JSON." });
    }

    const validationError = validateChanges(table, req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const changes = Object.fromEntries(
      Object.entries(req.body).map(([field, value]) => [
        field,
        typeof value === "string" ? value.trim() || null : value,
      ]),
    );
    const { data, error } = await client
      .from(table)
      .update(changes)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(`Could not update ${table} submission:`, error.message);
      return res.status(500).json({ error: "Could not update the submission." });
    }
    if (!data) {
      return res.status(404).json({ error: "Submission not found." });
    }
    return res.status(200).json({ item: data });
  } catch (error) {
    console.error(`Admin update for ${table} failed:`, error.message);
    return res.status(502).json({ error: "Could not update the submission." });
  }
};
