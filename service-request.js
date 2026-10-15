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

// Replace this adapter with a real receiving service when one is configured.
async function submitServiceRequest(requestData) {
  return {
    sent: false,
    message:
      "Your details passed validation, but this website is not connected to receive requests. Nothing was sent or saved. Please contact us directly for now.",
  };
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
  requestStatus.textContent = "Checking your request...";
  requestStatus.className = "request-status";

  try {
    const requestData = Object.fromEntries(new FormData(requestForm).entries());
    const result = await submitServiceRequest(requestData);

    requestStatus.textContent = result.sent
      ? "Thank you. Your service request has been submitted."
      : result.message;
    requestStatus.classList.add(
      result.sent ? "request-status-success" : "request-status-warning",
    );
  } catch (error) {
    requestStatus.textContent =
      error.message || "We could not process the request. Please try again.";
    requestStatus.classList.add("request-status-error");
  } finally {
    submitButton.disabled = false;
  }
});

updateAddressField();
