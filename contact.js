const contactForm = document.querySelector("#contact-form");
const contactFormStatus = document.querySelector("#contact-form-status");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitContactMessage();
});

contactForm.addEventListener("input", () => {
  contactFormStatus.hidden = true;
  contactFormStatus.textContent = "";
  contactFormStatus.className = "contact-form-status";
});

async function submitContactMessage() {
  const submitButton = contactForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  contactFormStatus.hidden = false;
  contactFormStatus.textContent = "Sending your message...";
  contactFormStatus.className = "contact-form-status";

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(new FormData(contactForm).entries()),
      ),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response. Please try again later.");
    }

    if (!response.ok) {
      throw new Error(result.error || "We could not send your message.");
    }

    contactForm.reset();
    contactFormStatus.textContent = "Thank you. Your message has been submitted.";
    contactFormStatus.classList.add("contact-form-status-success");
  } catch (error) {
    contactFormStatus.textContent =
      error.message || "We could not send your message. Please try again.";
    contactFormStatus.classList.add("contact-form-status-error");
  } finally {
    submitButton.disabled = false;
  }
}
