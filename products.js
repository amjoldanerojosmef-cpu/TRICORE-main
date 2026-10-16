const productList = document.querySelector("#product-list");
const productStatus = document.querySelector("#products-status");
const productSearch = document.querySelector("#products-search");
const legacyProducts = document.querySelector(".products-legacy");
let products = [];
const productCurrency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

legacyProducts.hidden = true;

function renderProduct(product) {
  const card = document.createElement("article");
  card.className = "card product-card";

  if (product.image_url) {
    const image = document.createElement("img");
    image.className = "product-photo";
    image.src = product.image_url;
    image.alt = product.name;
    image.loading = "lazy";
    card.append(image);
  }

  const content = document.createElement("div");
  content.className = "product-card-content";

  if (product.category) {
    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.category;
    content.append(category);
  }

  const heading = document.createElement("h2");
  heading.textContent = product.name;
  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent = product.description;
  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = productCurrency.format(Number(product.price));
  const inquiry = document.createElement("a");
  inquiry.className = "btn product-inquiry";
  inquiry.textContent = "Inquire about this product";
  inquiry.href = `mailto:tricoredigitalworks@gmail.com?subject=${encodeURIComponent(`Product inquiry: ${product.name}`)}&body=${encodeURIComponent(`Hello, I would like to ask about ${product.name}.`)}`;

  content.append(heading, description, price, inquiry);
  card.append(content);
  return card;
}

async function loadProducts() {
  productList.replaceChildren();
  productStatus.hidden = false;
  productStatus.className = "products-notice";
  productStatus.textContent = "Loading products...";

  try {
    const response = await fetch("/api/products");
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not load products.");
    }

    products = result.products;
    renderProducts();
  } catch (error) {
    productStatus.hidden = false;
    productStatus.className = "products-notice products-notice-error";
    productStatus.textContent =
      error.message || "Could not load products. Please try again later.";
  }
}

function renderProducts() {
  const query = productSearch.value.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((product) =>
    [product.name, product.category, product.description]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase().includes(query)),
  );

  productList.replaceChildren(...filteredProducts.map(renderProduct));
  productStatus.className = "products-notice";
  if (filteredProducts.length > 0) {
    productStatus.hidden = true;
  } else {
    productStatus.hidden = false;
    productStatus.textContent = query
      ? "No products match your search."
      : "No products are available right now.";
  }
}

productSearch.addEventListener("input", renderProducts);

loadProducts();
