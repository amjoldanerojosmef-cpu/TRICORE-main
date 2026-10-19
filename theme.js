const THEME_STORAGE_KEY = "tricore-theme";
const root = document.documentElement;

let savedTheme = "dark";

try {
  savedTheme = localStorage.getItem(THEME_STORAGE_KEY) === "light"
    ? "light"
    : "dark";
} catch (error) {
  console.error("Could not read the saved theme preference.", error);
}

function applyTheme(theme) {
  root.dataset.theme = theme;

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const nextTheme = theme === "light" ? "dark" : "light";
    button.textContent = `${nextTheme === "light" ? "Light" : "Dark"} mode`;
    button.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  });
}

applyTheme(savedTheme);

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(root.dataset.theme);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = root.dataset.theme === "light" ? "dark" : "light";
      applyTheme(theme);

      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.error("Could not save the theme preference.", error);
      }
    });
  });
});

window.addEventListener("storage", (event) => {
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) {
    return;
  }

  applyTheme(event.newValue === "light" ? "light" : "dark");
});
