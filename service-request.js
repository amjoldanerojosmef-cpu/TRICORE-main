const requestForm = document.querySelector("#service-request-form");
const serviceMethod = document.querySelector("#service-method");
const addressField = document.querySelector("#address-field");
const addressInput = document.querySelector("#address");
const requestStatus = document.querySelector("#request-status");
const submitButton = requestForm.querySelector('button[type="submit"]');

function updateAddressField() {
  const addressIsRequired = serviceMethod.value === "On-site Service";

  addressField.hidden = !addressIsRequired;
  addressInput.required = addressIsRequired;
  addressInput.disabled = !addressIsRequired;

  if (!addressIsRequired) {
    addressInput.value = "";
  }
}

async function submitServiceRequest(requestData) {
  const response = await fetch("/api/service-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response. Please try again later.");
  }

  if (!response.ok) {
    throw new Error(result.error || "We could not submit your request.");
  }

  return result;
}

serviceMethod.addEventListener("change", updateAddressField);

requestForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    updateAddressField();
    requestStatus.textContent = "";
    requestStatus.className = "request-status";
  }, 0);
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (submitButton.disabled) {
    return;
  }

  submitButton.disabled = true;
  requestStatus.textContent = "Submitting your request...";
  requestStatus.className = "request-status";

  try {
    const requestData = Object.fromEntries(new FormData(requestForm).entries());
    await submitServiceRequest(requestData);

    requestForm.reset();
    window.setTimeout(() => {
      requestStatus.textContent =
        "Thank you. Your service request has been submitted.";
      requestStatus.className = "request-status request-status-success";
    }, 0);
  } catch (error) {
    requestStatus.textContent =
      error.message || "We could not process the request. Please try again.";
    requestStatus.classList.add("request-status-error");
  } finally {
    submitButton.disabled = false;
  }
});

updateAddressField();
