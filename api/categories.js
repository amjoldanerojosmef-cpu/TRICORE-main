const {
  requireAdmin,
  supabaseClient,
  validateCategoryName,
} = require("../lib/products");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const isAdmin = req.query?.admin === "1";
    if (isAdmin && !(await requireAdmin(req, res))) {
      return;
    }
    res.setHeader(
      "Cache-Control",
      isAdmin
        ? "private, no-store"
        : "public, s-maxage=60, stale-while-revalidate=300",
    );
    try {
      const { data, error } = await supabaseClient()
        .from("product_categories")
        .select("name")
        .order("name", { ascending: true });
      if (error) {
        console.error("Could not load product categories:", error.message);
        return res.status(500).json({ error: "Could not load product categories." });
      }
      return res.status(200).json({ categories: data.map((category) => category.name) });
    } catch (error) {
      console.error("Product category list request failed:", error.message);
      return res.status(502).json({ error: "Could not load product categories." });
    }
  }

  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!(await requireAdmin(req, res))) {
    return;
  }
  if (!(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return res.status(415).json({ error: "Send category data as JSON." });
  }

  const validationError = validateCategoryName(req.body?.name);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { data, error } = await supabaseClient()
      .from("product_categories")
      .insert({ name: req.body.name.trim() })
      .select("name")
      .single();
    if (error) {
      console.error("Could not create product category:", error.message);
      return res.status(error.code === "23505" ? 409 : 500).json({
        error: error.code === "23505"
          ? "A category with that name already exists."
          : "Could not create the category.",
      });
    }
    return res.status(201).json({ category: data.name });
  } catch (error) {
    console.error("Product category creation failed:", error.message);
    return res.status(502).json({ error: "Could not create the category." });
  }
};
