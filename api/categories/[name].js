const {
  requireAdmin,
  supabaseClient,
  validateCategoryName,
} = require("../../lib/products");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!["PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const currentName = req.query?.name;
  const nameError = validateCategoryName(currentName);
  if (nameError) {
    return res.status(400).json({ error: "Invalid category." });
  }

  if (req.method === "PATCH") {
    if (!(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      return res.status(415).json({ error: "Send category data as JSON." });
    }
    const validationError = validateCategoryName(req.body?.name);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
  }

  try {
    const client = supabaseClient();
    const query = req.method === "DELETE"
      ? client.from("product_categories").delete().eq("name", currentName)
      : client.from("product_categories").update({ name: req.body.name.trim() }).eq("name", currentName);
    const { data, error } = await query.select("name").maybeSingle();

    if (error) {
      console.error(`Could not ${req.method === "DELETE" ? "delete" : "rename"} product category:`, error.message);
      return res.status(error.code === "23505" ? 409 : 500).json({
        error: error.code === "23505"
          ? "A category with that name already exists."
          : `Could not ${req.method === "DELETE" ? "delete" : "rename"} the category.`,
      });
    }
    if (!data) {
      return res.status(404).json({ error: "Category not found." });
    }
    return res.status(200).json(
      req.method === "DELETE" ? { deleted: true } : { category: data.name },
    );
  } catch (error) {
    console.error("Product category update failed:", error.message);
    return res.status(502).json({ error: "Could not update the category." });
  }
};
