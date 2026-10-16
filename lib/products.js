const { randomUUID } = require("node:crypto");
const { authenticateAdmin, supabaseClient } = require("./admin-auth");

const PRODUCT_TABLE = "products";
const STORAGE_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function productImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  return `${process.env.SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${encodeURIComponent(imagePath)}`;
}

function validateCategoryName(value) {
  if (typeof value !== "string") {
    return "Category name is required.";
  }

  const name = value.trim();
  if (!name || name.length > 80) {
    return "Category name is required and must be 80 characters or fewer.";
  }

  return null;
}

function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid product data." };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const price =
    (typeof body.price === "number" || typeof body.price === "string") &&
    String(body.price).trim() !== ""
      ? Number(body.price)
      : Number.NaN;
  const imagePath =
    body.image_path === null || body.image_path === ""
      ? null
      : body.image_path;

  if (!name || name.length > 120) {
    return { error: "Product name is required and must be 120 characters or fewer." };
  }
  if (category.length > 80) {
    return { error: "Category must be 80 characters or fewer." };
  }
  if (!description || description.length > 2000) {
    return { error: "Description is required and must be 2,000 characters or fewer." };
  }
  if (!Number.isFinite(price) || price < 0 || price > 99999999.99) {
    return { error: "Enter a valid non-negative product price." };
  }
  if (
    imagePath !== null &&
    (typeof imagePath !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/.test(imagePath))
  ) {
    return { error: "Product image reference is invalid." };
  }

  return {
    product: {
      name,
      category: category || null,
      description,
      price: Math.round(price * 100) / 100,
      image_path: imagePath,
    },
  };
}

async function requireAdmin(req, res) {
  return authenticateAdmin(req, res);
}

async function createImageUpload(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!(await requireAdmin(req, res))) {
    return;
  }

  const contentType =
    typeof req.body?.contentType === "string"
      ? req.body.contentType.toLowerCase()
      : "";
  const extension = IMAGE_TYPES.get(contentType);
  const size = Number(req.body?.size);
  if (!extension || !Number.isSafeInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) {
    return res.status(400).json({
      error: "Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.",
    });
  }

  const imagePath = `${randomUUID()}.${extension}`;
  try {
    const { data, error } = await supabaseClient()
      .storage.from(STORAGE_BUCKET)
      .createSignedUploadUrl(imagePath);

    if (error || !data?.token) {
      console.error("Could not create product image upload URL:", error?.message);
      return res.status(502).json({ error: "Could not prepare the product image upload." });
    }

    return res.status(200).json({
      imagePath: data.path,
      uploadUrl: data.signedUrl,
    });
  } catch (error) {
    console.error("Product image upload setup failed:", error.message);
    return res.status(502).json({ error: "Could not prepare the product image upload." });
  }
}

module.exports = {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PRODUCT_TABLE,
  STORAGE_BUCKET,
  createImageUpload,
  productImageUrl,
  requireAdmin,
  supabaseClient,
  validateCategoryName,
  validateProduct,
};
