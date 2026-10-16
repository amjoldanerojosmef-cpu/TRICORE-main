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

const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editFields = document.querySelector("#edit-fields");
const editStatus = document.querySelector("#edit-status");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteDescription = document.querySelector("#delete-description");
const deleteStatus = document.querySelector("#delete-status");
const deleteConfirm = document.querySelector("#delete-confirm");
let editing = null;
let deleting = null;

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
  page.count.textContent = `${page.offset} of ${page.total}`;
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
  const response = await fetch(
    `/api/admin/submissions/${encodeURIComponent(item.id)}?type=${encodeURIComponent(page.type)}`,
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
    page.type === "service_requests" ? "service request" : "contact message";
  const subject = item.full_name || item.name || item.subject;
  deleteDescription.textContent = subject
    ? `Permanently delete the ${label} from ${subject}? This action cannot be undone.`
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
    deletion.page.search.focus();
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
