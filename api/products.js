const {
  PRODUCT_TABLE,
  productImageUrl,
  requireAdmin,
  supabaseClient,
  validateProduct,
} = require("../lib/products");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    try {
      const { data, error } = await supabaseClient()
        .from(PRODUCT_TABLE)
        .select("id, name, category, description, price, image_path, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Could not load public products:", error.message);
        return res.status(500).json({ error: "Could not load products." });
      }
      return res.status(200).json({
        products: data.map((product) => ({
          ...product,
          image_url: productImageUrl(product.image_path),
        })),
      });
    } catch (error) {
      console.error("Public product request failed:", error.message);
      return res.status(502).json({ error: "Could not load products." });
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
    return res.status(415).json({ error: "Send product data as JSON." });
  }

  const validation = validateProduct(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const { data, error } = await supabaseClient()
      .from(PRODUCT_TABLE)
      .insert(validation.product)
      .select("*")
      .single();
    if (error) {
      console.error("Could not create product:", error.message);
      return res.status(500).json({ error: "Could not save the product." });
    }
    return res.status(201).json({
      product: { ...data, image_url: productImageUrl(data.image_path) },
    });
  } catch (error) {
    console.error("Product creation failed:", error.message);
    return res.status(502).json({ error: "Could not save the product." });
  }
};
