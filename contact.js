const contactForm = document.querySelector("#contact-form");
const contactFormStatus = document.querySelector("#contact-form-status");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  contactFormStatus.hidden = false;
  contactFormStatus.textContent =
    "Message delivery is not configured. Your message has not been sent.";
});

contactForm.addEventListener("input", () => {
  contactFormStatus.hidden = true;
  contactFormStatus.textContent = "";
});
