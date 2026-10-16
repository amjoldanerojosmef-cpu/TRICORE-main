const {
  PRODUCT_TABLE,
  STORAGE_BUCKET,
  productImageUrl,
  requireAdmin,
  supabaseClient,
  validateProduct,
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

  const id = req.query?.id;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ error: "Invalid product." });
  }

  try {
    const client = supabaseClient();
    if (req.method === "DELETE") {
      const { data, error } = await client
        .from(PRODUCT_TABLE)
        .delete()
        .eq("id", id)
        .select("image_path")
        .maybeSingle();
      if (error) {
        console.error("Could not delete product:", error.message);
        return res.status(500).json({ error: "Could not delete the product." });
      }
      if (!data) {
        return res.status(404).json({ error: "Product not found." });
      }
      if (data.image_path) {
        const { error: storageError } = await client.storage
          .from(STORAGE_BUCKET)
          .remove([data.image_path]);
        if (storageError) {
          console.error("Could not remove deleted product image:", storageError.message);
        }
      }
      return res.status(200).json({ deleted: true });
    }

    if (!(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      return res.status(415).json({ error: "Send product data as JSON." });
    }
    const validation = validateProduct(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const { data: previous, error: readError } = await client
      .from(PRODUCT_TABLE)
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (readError) {
      console.error("Could not read product before update:", readError.message);
      return res.status(500).json({ error: "Could not update the product." });
    }
    if (!previous) {
      return res.status(404).json({ error: "Product not found." });
    }

    const { data, error } = await client
      .from(PRODUCT_TABLE)
      .update(validation.product)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("Could not update product:", error.message);
      return res.status(500).json({ error: "Could not update the product." });
    }

    if (previous.image_path && previous.image_path !== data.image_path) {
      const { error: storageError } = await client.storage
        .from(STORAGE_BUCKET)
        .remove([previous.image_path]);
      if (storageError) {
        console.error("Could not remove replaced product image:", storageError.message);
      }
    }
    return res.status(200).json({
      product: { ...data, image_url: productImageUrl(data.image_path) },
    });
  } catch (error) {
    console.error("Product update request failed:", error.message);
    return res.status(502).json({ error: "Could not update the product." });
  }
};
