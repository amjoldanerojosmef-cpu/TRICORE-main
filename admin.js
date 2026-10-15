const pages = {
  requests: {
    type: "service_requests",
    offset: 0,
    rows: document.querySelector("#requests-table"),
    count: document.querySelector("#requests-count"),
    status: document.querySelector("#requests-status"),
    more: document.querySelector("#requests-more"),
  },
  messages: {
    type: "contact_messages",
    offset: 0,
    rows: document.querySelector("#messages-table"),
    count: document.querySelector("#messages-count"),
    status: document.querySelector("#messages-status"),
    more: document.querySelector("#messages-more"),
  },
};

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
  row.append(cell);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderItem(page, item) {
  const row = document.createElement("tr");

  if (page.type === "service_requests") {
    addCell(row, formatDate(item.created_at));
    addCell(row, item.full_name);
    addCell(row, [item.contact_number, item.email].filter(Boolean).join("\n"));
    addCell(row, [item.service_category, item.device_type, item.device_model].filter(Boolean).join("\n"));
    addCell(row, [item.description, item.additional_notes && `Notes: ${item.additional_notes}`, item.budget && `Budget: ${item.budget}`, item.serial_number && `Serial: ${item.serial_number}`].filter(Boolean).join("\n\n"));
    addCell(row, [item.service_method, item.address].filter(Boolean).join("\n"));
    addCell(row, item.preferred_date);
  } else {
    addCell(row, formatDate(item.created_at));
    addCell(row, item.name);
    addCell(row, item.email);
    addCell(row, item.subject);
    addCell(row, item.message);
  }

  page.rows.append(row);
}

async function loadPage(page) {
  page.more.disabled = true;
  page.status.hidden = false;
  page.status.textContent = "Loading submissions...";
  page.status.className = "admin-status";

  try {
    const response = await fetch(
      `/api/admin/submissions?type=${encodeURIComponent(page.type)}&offset=${page.offset}`,
    );
    const result = await response.json();

    if (response.status === 401) {
      window.location.replace("/signin.html");
      return;
    }
    if (!response.ok) {
      throw new Error(result.error || "Could not load submissions.");
    }

    result.items.forEach((item) => renderItem(page, item));
    page.offset += result.items.length;
    page.count.textContent = `${page.offset} of ${result.total}`;
    page.more.hidden = !result.hasMore;
    if (page.offset === 0) {
      page.status.textContent = "No submissions yet.";
      page.status.hidden = result.total !== 0;
    } else {
      page.status.hidden = true;
    }
  } catch (error) {
    page.status.hidden = false;
    page.status.textContent =
      error.message || "Could not load submissions. Please try again.";
    page.status.classList.add("admin-status-error");
  } finally {
    page.more.disabled = false;
  }
}

pages.requests.more.addEventListener("click", () => loadPage(pages.requests));
pages.messages.more.addEventListener("click", () => loadPage(pages.messages));

document.querySelector("#admin-logout").addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  try {
    const response = await fetch("/api/admin/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error("Could not sign out. Please try again.");
    }
    window.location.replace("/signin.html");
  } catch (error) {
    const requestsStatus = pages.requests.status;
    requestsStatus.hidden = false;
    requestsStatus.textContent = error.message;
    requestsStatus.className = "admin-status admin-status-error";
    event.currentTarget.disabled = false;
  }
});

Promise.all([loadPage(pages.requests), loadPage(pages.messages)]);
