const pages = {
  requests: {
    type: "service_requests",
    offset: 0,
    total: 0,
    requestId: 0,
    items: new Map(),
    rows: document.querySelector("#requests-table"),
    count: document.querySelector("#requests-count"),
    status: document.querySelector("#requests-status"),
    search: document.querySelector("#requests-search"),
    more: document.querySelector("#requests-more"),
  },
  messages: {
    type: "contact_messages",
    offset: 0,
    total: 0,
    requestId: 0,
    items: new Map(),
    rows: document.querySelector("#messages-table"),
    count: document.querySelector("#messages-count"),
    status: document.querySelector("#messages-status"),
    search: document.querySelector("#messages-search"),
    more: document.querySelector("#messages-more"),
  },
};

const productPage = {
  type: "products",
  offset: 0,
  total: 0,
  items: new Map(),
  rows: document.querySelector("#admin-products-table"),
  count: document.querySelector("#products-heading").parentElement.querySelector(".admin-count"),
  status: document.querySelector("#products-admin-status"),
  focusTarget: document.querySelector("#add-product"),
};
const categoryPage = {
  type: "categories",
  offset: 0,
  total: 0,
  items: new Map(),
  rows: document.querySelector("#categories-table"),
  count: null,
  status: document.querySelector("#categories-status"),
  focusTarget: document.querySelector("#manage-categories"),
};
const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editFields = document.querySelector("#edit-fields");
const editStatus = document.querySelector("#edit-status");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteDescription = document.querySelector("#delete-description");
const deleteStatus = document.querySelector("#delete-status");
const deleteConfirm = document.querySelector("#delete-confirm");
const productDialog = document.querySelector("#product-dialog");
const productForm = document.querySelector("#product-form");
const productFormStatus = document.querySelector("#product-form-status");
const productImageInput = document.querySelector("#product-image");
const productImagePreview = document.querySelector("#product-image-preview");
const categoriesDialog = document.querySelector("#categories-dialog");
const categoryFormDialog = document.querySelector("#category-form-dialog");
const categoryForm = document.querySelector("#category-form");
const categoryNameInput = document.querySelector("#category-name");
const categoryFormStatus = document.querySelector("#category-form-status");
const productCategorySelect = productForm.elements.category;
const themeToggle = document.querySelector("#admin-theme-toggle");
let editing = null;
let deleting = null;
let editingProduct = null;
let editingCategory = null;
let previewUrl = null;
let categories = [];

function applyAdminTheme(theme) {
  const isLight = theme === "light";
  document.body.dataset.theme = isLight ? "light" : "dark";
  themeToggle.textContent = isLight ? "Use dark mode" : "Use light mode";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark mode" : "Switch to light mode",
  );
}

try {
  applyAdminTheme(localStorage.getItem("admin-theme") === "light" ? "light" : "dark");
} catch (error) {
  console.error("Could not read the saved admin theme preference.", error);
  applyAdminTheme("dark");
}

themeToggle.addEventListener("click", () => {
  const theme = document.body.dataset.theme === "light" ? "dark" : "light";
  applyAdminTheme(theme);
  try {
    localStorage.setItem("admin-theme", theme);
  } catch (error) {
    console.error("Could not save the admin theme preference.", error);
  }
});

const FIELD_CONFIG = {
  service_requests: [
    ["full_name", "Customer name", "text"],
    ["contact_number", "Contact number", "tel"],
    ["email", "Email", "email"],
    ["service_category", "Service category", "select", [
      "Computer Repair & Maintenance", "Printer Setup & Support",
      "Networking Solutions", "Hardware & Accessories",
      "Website Development", "IT Support & Consultation", "Other",
    ]],
    ["device_type", "Device type", "select", [
      "Desktop Computer", "Laptop", "Printer", "Router",
      "Network Equipment", "Website", "Other",
    ]],
    ["device_model", "Device model", "text"],
    ["serial_number", "Serial number", "text"],
    ["description", "Description", "textarea"],
    ["preferred_date", "Preferred date", "date"],
    ["service_method", "Service method", "select", [
      "Bring-in Service", "On-site Service", "Remote Support",
    ]],
    ["address", "Address", "text"],
    ["budget", "Budget", "text"],
    ["additional_notes", "Additional notes", "textarea"],
  ],
  contact_messages: [
    ["name", "Name", "text"],
    ["email", "Email", "email"],
    ["subject", "Subject", "text"],
    ["message", "Message", "textarea"],
  ],
};

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error("The server returned an invalid response. Please try again.");
  }
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
  row.append(cell);
  return cell;
}

function addButton(row, label, action, item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "admin-action";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = item.id;
  row.append(button);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderItem(page, item) {
  page.items.set(item.id, item);
  const row = document.createElement("tr");
  row.dataset.id = item.id;

  if (page.type === "service_requests") {
    addCell(row, formatDate(item.created_at));
    addCell(row, item.full_name);
    addCell(row, [item.contact_number, item.email].filter(Boolean).join("\n"));
    addCell(row, [item.service_category, item.device_type, item.device_model].filter(Boolean).join("\n"));
    addCell(row, [item.description, item.additional_notes && `Notes: ${item.additional_notes}`, item.budget && `Budget: ${item.budget}`, item.serial_number && `Serial: ${item.serial_number}`].filter(Boolean).join("\n\n"));
    addCell(row, [item.service_method, item.address].filter(Boolean).join("\n"));
    addCell(row, item.preferred_date);

    const priorityCell = document.createElement("td");
    const prioritySelect = document.createElement("select");
    prioritySelect.className = "admin-priority";
    prioritySelect.setAttribute("aria-label", `Priority for ${item.full_name}`);
    for (const priority of ["low", "normal", "high", "urgent"]) {
      const option = document.createElement("option");
      option.value = priority;
      option.textContent = priority[0].toUpperCase() + priority.slice(1);
      option.selected = (item.priority || "normal") === priority;
      prioritySelect.append(option);
    }
    prioritySelect.dataset.previous = item.priority || "normal";
    priorityCell.append(prioritySelect);
    row.append(priorityCell);
  } else {
    addCell(row, formatDate(item.created_at));
    addCell(row, item.name);
    addCell(row, item.email);
    addCell(row, item.subject);
    addCell(row, item.message);
  }

  const actions = document.createElement("td");
  addButton(actions, "Edit", "edit", item);
  addButton(actions, "Delete", "delete", item);
  row.append(actions);
  return row;
}

function updateCount(page) {
  if (page.count) {
    page.count.textContent = `${page.offset} of ${page.total}`;
  }
}

async function loadPage(page, reset = false) {
  if (reset) {
    page.offset = 0;
    page.total = 0;
    page.items.clear();
    page.rows.replaceChildren();
  }

  const requestId = ++page.requestId;
  page.more.disabled = true;
  page.status.hidden = false;
  page.status.textContent = "Loading submissions...";
  page.status.className = "admin-status";

  try {
    const params = new URLSearchParams({
      type: page.type,
      offset: String(page.offset),
      search: page.search.value.trim(),
    });
    const response = await fetch(`/api/admin/submissions?${params}`);
    const result = await readJson(response);

    if (requestId !== page.requestId) {
      return;
    }
    if (response.status === 401) {
      window.location.replace("/signin.html");
      return;
    }
    if (!response.ok) {
      throw new Error(result.error || "Could not load submissions.");
    }

    result.items.forEach((item) => page.rows.append(renderItem(page, item)));
    page.offset += result.items.length;
    page.total = result.total;
    updateCount(page);
    page.more.hidden = !result.hasMore;
    page.status.textContent = "No submissions found.";
    page.status.hidden = result.total !== 0;
  } catch (error) {
    if (requestId !== page.requestId) {
      return;
    }
    page.status.hidden = false;
    page.status.textContent =
      error.message || "Could not load submissions. Please try again.";
    page.status.classList.add("admin-status-error");
  } finally {
    if (requestId === page.requestId) {
      page.more.disabled = false;
    }
  }
}

function openEditor(page, item) {
  editing = { page, item };
  document.querySelector("#edit-heading").textContent =
    `Edit ${page.type === "service_requests" ? "Service Request" : "Contact Message"}`;
  editFields.replaceChildren();
  editStatus.hidden = true;

  for (const [name, labelText, kind, choices] of FIELD_CONFIG[page.type]) {
    const label = document.createElement("label");
    label.className = "admin-edit-field";
    label.textContent = labelText;

    let input;
    if (kind === "select") {
      input = document.createElement("select");
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "Select an option";
      input.append(emptyOption);
      choices.forEach((choice) => {
        const option = document.createElement("option");
        option.value = choice;
        option.textContent = choice;
        input.append(option);
      });
    } else {
      input = document.createElement(kind === "textarea" ? "textarea" : "input");
      if (kind !== "textarea") {
        input.type = kind;
      }
      if (kind === "textarea") {
        input.rows = 4;
      }
    }

    input.name = name;
    input.value = item[name] || "";
    input.maxLength =
      name === "description" || name === "additional_notes" || name === "message"
        ? 5000
        : 500;
    input.required = [
      "full_name", "contact_number", "service_category", "device_type",
      "description", "service_method", "name", "email", "subject", "message",
    ].includes(name);
    label.append(input);
    editFields.append(label);
  }

  editDialog.showModal();
}

async function sendMutation(page, item, method, body) {
  const url = page.type === "products"
    ? `/api/products/${encodeURIComponent(item.id)}`
    : page.type === "categories"
      ? `/api/categories/${encodeURIComponent(item.name)}`
      : `/api/admin/submissions/${encodeURIComponent(item.id)}?type=${encodeURIComponent(page.type)}`;
  const response = await fetch(
    url,
    {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const result = await readJson(response);
  if (response.status === 401) {
    window.location.replace("/signin.html");
    throw new Error("Your administrator session has expired.");
  }
  if (!response.ok) {
    throw new Error(result.error || "Could not update the submission.");
  }
  return result;
}

function openDeleteConfirmation(page, item, row, trigger) {
  deleting = { page, item, row, trigger };
  const label =
    page.type === "service_requests"
      ? "service request"
      : page.type === "contact_messages"
        ? "contact message"
        : page.type === "categories"
          ? "category"
          : "product";
  const subject = page.type === "categories"
    ? item.name
    : item.full_name || item.name || item.subject;
  deleteDescription.textContent = subject
    ? `Permanently delete ${label === "product" ? "" : "the "}${label}${label === "product" ? ` “${subject}”` : ` from ${subject}`}? This action cannot be undone.`
    : `Permanently delete this ${label}? This action cannot be undone.`;
  deleteStatus.hidden = true;
  deleteStatus.textContent = "";
  deleteConfirm.disabled = false;
  deleteDialog.showModal();
}

pages.requests.more.addEventListener("click", () => loadPage(pages.requests));
pages.messages.more.addEventListener("click", () => loadPage(pages.messages));

for (const page of Object.values(pages)) {
  let debounceId;
  page.search.addEventListener("input", () => {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => loadPage(page, true), 250);
  });

  page.rows.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const row = button.closest("tr");
    const item = page.items.get(row.dataset.id);
    if (!item) {
      return;
    }

    if (button.dataset.action === "edit") {
      openEditor(page, item);
      return;
    }

    if (button.dataset.action === "delete") {
      openDeleteConfirmation(page, item, row, button);
    }
  });

  page.rows.addEventListener("change", async (event) => {
    const select = event.target.closest("select.admin-priority");
    if (!select) {
      return;
    }
    const row = select.closest("tr");
    const item = page.items.get(row.dataset.id);
    if (!item) {
      return;
    }

    select.disabled = true;
    try {
      const result = await sendMutation(page, item, "PATCH", {
        priority: select.value,
      });
      page.items.set(item.id, result.item);
      select.dataset.previous = result.item.priority;
      page.status.textContent = "Priority updated.";
      page.status.className = "admin-status admin-status-success";
      page.status.hidden = false;
    } catch (error) {
      select.value = select.dataset.previous;
      page.status.textContent = error.message;
      page.status.className = "admin-status admin-status-error";
      page.status.hidden = false;
    } finally {
      select.disabled = false;
    }
  });

}

function renderAdminProduct(product) {
  productPage.items.set(product.id, product);
  const row = document.createElement("tr");
  row.dataset.id = product.id;

  const imageCell = document.createElement("td");
  if (product.image_url) {
    const image = document.createElement("img");
    image.className = "admin-product-thumbnail";
    image.src = product.image_url;
    image.alt = "";
    image.loading = "lazy";
    imageCell.append(image);
  } else {
    imageCell.textContent = "—";
  }
  row.append(imageCell);
  addCell(row, product.name);
  addCell(row, product.category);
  addCell(row, new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(product.price)));

  const actions = document.createElement("td");
  addButton(actions, "Edit", "edit", product);
  addButton(actions, "Delete", "delete", product);
  row.append(actions);
  return row;
}

async function loadAdminProducts() {
  productPage.status.hidden = false;
  productPage.status.textContent = "Loading products...";
  productPage.status.className = "admin-status";
  try {
    const response = await fetch("/api/products?admin=1");
    const result = await readJson(response);
    if (!response.ok) {
      throw new Error(result.error || "Could not load products.");
    }
    productPage.items.clear();
    productPage.rows.replaceChildren(...result.products.map(renderAdminProduct));
    productPage.offset = result.products.length;
    productPage.total = result.products.length;
    updateCount(productPage);
    productPage.status.textContent = "No products yet. Add your first product.";
    productPage.status.hidden = result.products.length > 0;
  } catch (error) {
    productPage.status.hidden = false;
    productPage.status.textContent =
      error.message || "Could not load products. Please try again.";
    productPage.status.className = "admin-status admin-status-error";
  }
}

async function loadCategories() {
  categoryPage.status.hidden = false;
  categoryPage.status.textContent = "Loading categories...";
  categoryPage.status.className = "admin-status";
  try {
    const response = await fetch("/api/categories?admin=1");
    const result = await readJson(response);
    if (!response.ok) {
      throw new Error(result.error || "Could not load categories.");
    }

    categories = result.categories;
    categoryPage.items.clear();
    categoryPage.rows.replaceChildren(
      ...categories.map((name) => {
        const item = { name };
        categoryPage.items.set(name, item);
        const row = document.createElement("tr");
        row.dataset.id = name;
        addCell(row, name);
        const actions = document.createElement("td");
        addButton(actions, "Edit", "edit", item);
        addButton(actions, "Delete", "delete", item);
        row.append(actions);
        return row;
      }),
    );
    categoryPage.total = categories.length;
    categoryPage.status.textContent =
      "No categories yet. Add a category before creating products.";
    categoryPage.status.hidden = categories.length > 0;
    populateProductCategories();
  } catch (error) {
    categoryPage.status.hidden = false;
    categoryPage.status.textContent =
      error.message || "Could not load categories. Please try again.";
    categoryPage.status.className = "admin-status admin-status-error";
  }
}

function populateProductCategories(selected = productCategorySelect.value) {
  productCategorySelect.replaceChildren(new Option("No category", ""));
  for (const category of categories) {
    productCategorySelect.add(new Option(category, category));
  }
  productCategorySelect.value = categories.includes(selected) ? selected : "";
}

function openCategoryForm(category = null) {
  editingCategory = category;
  categoryForm.reset();
  categoryNameInput.value = category?.name || "";
  document.querySelector("#category-form-title").textContent =
    category ? "Edit Category" : "Add Category";
  categoryFormStatus.hidden = true;
  categoryFormDialog.showModal();
  categoryNameInput.focus();
}

function clearImagePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  productImagePreview.removeAttribute("src");
  productImagePreview.hidden = true;
}

function openProductEditor(product = null) {
  editingProduct = product;
  productForm.reset();
  clearImagePreview();
  populateProductCategories(product?.category || "");
  productForm.elements.name.value = product?.name || "";
  productForm.elements.price.value = product?.price ?? "";
  productForm.elements.description.value = product?.description || "";
  productForm.elements.image_path.value = product?.image_path || "";
  productForm.elements.image.required = false;
  if (product?.image_url) {
    productImagePreview.src = product.image_url;
    productImagePreview.hidden = false;
  }
  document.querySelector("#product-dialog-title").textContent =
    product ? "Edit Product" : "Add Product";
  productFormStatus.hidden = true;
  productDialog.showModal();
}

async function uploadProductImage(file) {
  const signedResponse = await fetch("/api/admin/product-image-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  const signedResult = await readJson(signedResponse);
  if (!signedResponse.ok) {
    throw new Error(signedResult.error || "Could not prepare the image upload.");
  }

  const uploadResponse = await fetch(signedResult.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "cache-control": "max-age=3600",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error("Could not upload the product image. Please try again.");
  }
  return signedResult.imagePath;
}

productPage.rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const row = button.closest("tr");
  const product = productPage.items.get(row.dataset.id);
  if (!product) {
    return;
  }
  if (button.dataset.action === "edit") {
    openProductEditor(product);
  } else if (button.dataset.action === "delete") {
    openDeleteConfirmation(productPage, product, row, button);
  }
});

categoryPage.rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const row = button.closest("tr");
  const category = categoryPage.items.get(row.dataset.id);
  if (!category) {
    return;
  }
  if (button.dataset.action === "edit") {
    openCategoryForm(category);
  } else if (button.dataset.action === "delete") {
    openDeleteConfirmation(categoryPage, category, row, button);
  }
});

document.querySelector("#add-product").addEventListener("click", () => {
  openProductEditor();
});

document.querySelector("#manage-categories").addEventListener("click", async () => {
  categoriesDialog.showModal();
  await loadCategories();
});

document.querySelector("#categories-close").addEventListener("click", () => {
  categoriesDialog.close();
});

document.querySelector("#add-category").addEventListener("click", () => {
  openCategoryForm();
});

document.querySelector("#category-form-close").addEventListener("click", () => {
  categoryFormDialog.close();
});

document.querySelector("#category-form-cancel").addEventListener("click", () => {
  categoryFormDialog.close();
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const saveButton = categoryForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  categoryFormStatus.hidden = false;
  categoryFormStatus.textContent = "Saving category...";
  categoryFormStatus.className = "admin-status";

  try {
    const name = categoryNameInput.value.trim();
    const response = await fetch(
      editingCategory
        ? `/api/categories/${encodeURIComponent(editingCategory.name)}`
        : "/api/categories",
      {
        method: editingCategory ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      },
    );
    const result = await readJson(response);
    if (response.status === 401) {
      window.location.replace("/signin.html");
      return;
    }
    if (!response.ok) {
      throw new Error(result.error || "Could not save category.");
    }
    categoryFormDialog.close();
    await loadCategories();
    await loadAdminProducts();
  } catch (error) {
    categoryFormStatus.textContent =
      error.message || "Could not save category. Please try again.";
    categoryFormStatus.className = "admin-status admin-status-error";
  } finally {
    saveButton.disabled = false;
  }
});

productImageInput.addEventListener("change", () => {
  clearImagePreview();
  const file = productImageInput.files[0];
  if (file) {
    previewUrl = URL.createObjectURL(file);
    productImagePreview.src = previewUrl;
    productImagePreview.hidden = false;
  } else if (editingProduct?.image_url) {
    productImagePreview.src = editingProduct.image_url;
    productImagePreview.hidden = false;
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const saveButton = productForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  productFormStatus.hidden = false;
  productFormStatus.textContent = "Saving product...";
  productFormStatus.className = "admin-status";

  try {
    const fields = new FormData(productForm);
    const file = productImageInput.files[0];
    let imagePath = fields.get("image_path") || null;
    if (file) {
      productFormStatus.textContent = "Uploading product photo...";
      imagePath = await uploadProductImage(file);
    }

    const product = {
      name: fields.get("name"),
      category: fields.get("category"),
      price: fields.get("price"),
      description: fields.get("description"),
      image_path: imagePath,
    };
    const isEditing = Boolean(editingProduct);
    const response = await fetch(
      isEditing ? `/api/products/${encodeURIComponent(editingProduct.id)}` : "/api/products",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      },
    );
    const result = await readJson(response);
    if (response.status === 401) {
      window.location.replace("/signin.html");
      return;
    }
    if (!response.ok) {
      throw new Error(result.error || "Could not save product.");
    }

    await loadAdminProducts();
    productDialog.close();
  } catch (error) {
    productFormStatus.textContent =
      error.message || "Could not save product. Please try again.";
    productFormStatus.className = "admin-status admin-status-error";
  } finally {
    saveButton.disabled = false;
  }
});

function closeProductDialog() {
  productDialog.close();
  editingProduct = null;
  clearImagePreview();
}

document.querySelector("#product-close").addEventListener("click", closeProductDialog);
document.querySelector("#product-cancel").addEventListener("click", closeProductDialog);

deleteConfirm.addEventListener("click", async () => {
  if (!deleting) {
    return;
  }

  const deletion = deleting;
  deleteConfirm.disabled = true;
  deleteStatus.hidden = false;
  deleteStatus.textContent = "Deleting submission...";
  deleteStatus.className = "admin-status";

  try {
    await sendMutation(deletion.page, deletion.item, "DELETE");
    deletion.row.remove();
    deletion.page.items.delete(deletion.item.id);
    deletion.page.offset = Math.max(0, deletion.page.offset - 1);
    deletion.page.total -= 1;
    updateCount(deletion.page);
    deletion.page.status.textContent = "Submission deleted.";
    deletion.page.status.className = "admin-status admin-status-success";
    deletion.page.status.hidden = false;
    if (deletion.page.type === "products") {
      await loadAdminProducts();
    } else if (deletion.page.type === "categories") {
      await loadCategories();
      await loadAdminProducts();
    }
    deleteDialog.close();
  } catch (error) {
    deleteStatus.textContent = error.message;
    deleteStatus.className = "admin-status admin-status-error";
  } finally {
    deleteConfirm.disabled = false;
  }
});

deleteDialog.addEventListener("close", () => {
  const deletion = deleting;
  deleting = null;
  if (deletion?.trigger.isConnected) {
    deletion.trigger.focus();
  } else if (deletion) {
    (deletion.page.search || deletion.page.focusTarget).focus();
  }
});

deleteDialog.addEventListener("cancel", (event) => {
  if (deleteConfirm.disabled) {
    event.preventDefault();
  }
});

document.querySelector("#delete-cancel").addEventListener("click", () => {
  deleteDialog.close();
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editing) {
    return;
  }

  const saveButton = editForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  editStatus.hidden = false;
  editStatus.textContent = "Saving changes...";
  editStatus.className = "admin-status";

  try {
    const changes = Object.fromEntries(new FormData(editForm).entries());
    const result = await sendMutation(editing.page, editing.item, "PATCH", changes);
    editing.page.items.set(result.item.id, result.item);
    const oldRow = editing.page.rows.querySelector(
      `tr[data-id="${CSS.escape(editing.item.id)}"]`,
    );
    oldRow.replaceWith(renderItem(editing.page, result.item));
    editDialog.close();
  } catch (error) {
    editStatus.textContent = error.message;
    editStatus.className = "admin-status admin-status-error";
  } finally {
    saveButton.disabled = false;
  }
});

function closeEditor() {
  editDialog.close();
  editing = null;
}

document.querySelector("#edit-close").addEventListener("click", closeEditor);
document.querySelector("#edit-cancel").addEventListener("click", closeEditor);

document.querySelector("#admin-logout").addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  try {
    const response = await fetch("/api/admin/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error("Could not sign out. Please try again.");
    }
    window.location.replace("/signin.html");
  } catch (error) {
    pages.requests.status.hidden = false;
    pages.requests.status.textContent = error.message;
    pages.requests.status.className = "admin-status admin-status-error";
    event.currentTarget.disabled = false;
  }
});

Promise.all([loadPage(pages.requests), loadPage(pages.messages)]);
loadAdminProducts();
loadCategories();
