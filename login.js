const loginForm = document.querySelector("#login-form");
const loginPassword = document.querySelector("#login-password");
const loginStatus = document.querySelector("#login-status");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.hidden = false;
  loginStatus.textContent = "Signing in...";

  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginForm.elements.email.value,
        password: loginPassword.value,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Sign-in failed. Please try again.");
    }

    loginPassword.value = "";
    window.location.assign("/admin.html");
  } catch (error) {
    loginStatus.textContent =
      error.message || "Could not reach the sign-in server.";
    loginStatus.classList.add("login-status-error");
  } finally {
    submitButton.disabled = false;
  }
});

loginForm.addEventListener("input", () => {
  loginStatus.textContent = "";
  loginStatus.className = "login-status";
  loginStatus.hidden = true;
});
