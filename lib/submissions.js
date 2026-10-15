const { createClient } = require("@supabase/supabase-js");

const SERVICE_CATEGORIES = [
  "Computer Repair & Maintenance",
  "Printer Setup & Support",
  "Networking Solutions",
  "Hardware & Accessories",
  "Website Development",
  "IT Support & Consultation",
  "Other",
];

const DEVICE_TYPES = [
  "Desktop Computer",
  "Laptop",
  "Printer",
  "Router",
  "Network Equipment",
  "Website",
  "Other",
];

const SERVICE_METHODS = [
  "Bring-in Service",
  "On-site Service",
  "Remote Support",
];

class ValidationError extends Error {}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} is required.`);
  }

  const text = value.trim();
  if (!text || text.length > maxLength) {
    throw new ValidationError(
      `${label} is required and must be ${maxLength} characters or fewer.`,
    );
  }

  return text;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return value.trim() || null;
}

function emailAddress(value, label, required) {
  const email = required
    ? requiredText(value, label, 254)
    : optionalText(value, label, 254);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(`${label} must be a valid email address.`);
  }

  return email;
}

function oneOf(value, label, allowed) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationError(`Select a valid ${label.toLowerCase()}.`);
  }

  return value;
}

function optionalDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedDate =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00.000Z`)
      : null;

  if (
    !parsedDate ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError("Preferred service date must be a valid date.");
  }

  return value;
}

function validateServiceRequest(body) {
  const serviceMethod = oneOf(
    body.serviceMethod,
    "service method",
    SERVICE_METHODS,
  );
  const address = optionalText(body.address, "Address", 300);

  if (serviceMethod === "On-site Service" && !address) {
    throw new ValidationError("Address is required for on-site service.");
  }

  return {
    full_name: requiredText(body.fullName, "Full name", 120),
    contact_number: requiredText(body.contactNumber, "Contact number", 40),
    email: emailAddress(body.email, "Email address", false),
    service_category: oneOf(
      body.serviceCategory,
      "service category",
      SERVICE_CATEGORIES,
    ),
    device_type: oneOf(body.deviceType, "device type", DEVICE_TYPES),
    device_model: optionalText(body.deviceModel, "Device model", 120),
    serial_number: optionalText(body.serialNumber, "Serial number", 100),
    description: requiredText(body.description, "Description", 2000),
    preferred_date: optionalDate(body.preferredDate),
    service_method: serviceMethod,
    address: serviceMethod === "On-site Service" ? address : null,
    budget: optionalText(body.budget, "Budget", 100),
    additional_notes: optionalText(
      body.additionalNotes,
      "Additional notes",
      2000,
    ),
  };
}

function validateContactMessage(body) {
  return {
    name: requiredText(body.name, "Name", 120),
    email: emailAddress(body.email, "Email address", true),
    subject: requiredText(body.subject, "Subject", 200),
    message: requiredText(body.message, "Message", 5000),
  };
}

async function saveSubmission(req, res, table, validate) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return res.status(415).json({ error: "Send the form as JSON." });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "The submitted form data is invalid." });
  }

  let row;
  try {
    row = validate(body);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase submission configuration is missing.");
    return res
      .status(500)
      .json({ error: "Submissions are temporarily unavailable." });
  }

  let error;
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    ({ error } = await supabase.from(table).insert(row));
  } catch (requestError) {
    console.error(`Supabase ${table} submission request failed:`, requestError);
    return res
      .status(502)
      .json({ error: "Could not save your submission. Please try again." });
  }

  if (error) {
    console.error(`Could not save ${table} submission:`, error.message);
    return res
      .status(500)
      .json({ error: "Could not save your submission. Please try again." });
  }

  return res.status(201).json({ submitted: true });
}

module.exports = {
  saveSubmission,
  validateContactMessage,
  validateServiceRequest,
};
