const { createImageUpload } = require("../../lib/products");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  return createImageUpload(req, res);
};
