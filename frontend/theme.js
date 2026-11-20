
/* ==========================================
   NESTNOTES — THEME CONTROLLER
========================================== */

(() => {
  const STORAGE_KEY = "nestnotes-theme";
  const root = document.documentElement;

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch (error) {
      console.warn("Theme preference could not be loaded.");
    }

    return "light";
  }

  function applyTheme(theme, animate = true) {
    const validTheme = theme === "dark" ? "dark" : "light";

    if (animate) root.classList.add("theme-transition");

    root.setAttribute("data-theme", validTheme);

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const isDark = validTheme === "dark";

      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );

      const icon = button.querySelector(".theme-toggle-icon");
      const label = button.querySelector(".theme-toggle-label");

      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
      if (label) label.textContent = isDark ? "Light mode" : "Dark mode";

      button.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    });

    try {
      localStorage.setItem(STORAGE_KEY, validTheme);
    } catch (error) {
      console.warn("Theme preference could not be saved.");
    }

    if (animate) {
      window.setTimeout(() => {
        root.classList.remove("theme-transition");
      }, 250);
    }
  }

  function createThemeButton(className) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `theme-toggle ${className}`;
    button.setAttribute("data-theme-toggle", "");
    button.setAttribute("aria-pressed", "false");

    button.innerHTML = `
      <span class="theme-toggle-icon" aria-hidden="true">🌙</span>
      <span class="theme-toggle-label">Dark mode</span>
    `;

    return button;
  }

  function setupThemeToggle() {
    const existingButtons = document.querySelectorAll("[data-theme-toggle]");

    if (existingButtons.length === 0) {
      const navLinks = document.querySelector(
        ".navbar .nav-links, .dashboard-nav-links, .inbox-nav-links"
      );

      const mobileActions = document.querySelector(
        ".mobile-nav-actions, .dashboard-mobile-controls"
      );

      const inboxNavbar = document.querySelector(".inbox-navbar");
      const inboxHamburger = inboxNavbar?.querySelector(".inbox-menu-toggle");

      // Desktop button
      if (navLinks) {
        const desktopButton = createThemeButton("theme-toggle-desktop");

        const accountButton = navLinks.querySelector(
          ".nav-login, .nav-signup, .nav-logout"
        );

        if (accountButton) {
          navLinks.insertBefore(desktopButton, accountButton);
        } else {
          navLinks.appendChild(desktopButton);
        }
      }

      // Mobile button for normal mobile navigation
      if (mobileActions) {
        const mobileButton = createThemeButton("theme-toggle-mobile");
        const hamburger = mobileActions.querySelector(
          ".mobile-menu-toggle, .dashboard-menu-toggle"
        );

        if (hamburger) {
          mobileActions.insertBefore(mobileButton, hamburger);
        } else {
          mobileActions.appendChild(mobileButton);
        }
      }

      // Owner Inbox has a different navigation structure
      if (inboxNavbar && inboxHamburger) {
        const mobileButton = createThemeButton("theme-toggle-mobile");
        inboxNavbar.insertBefore(mobileButton, inboxHamburger);
      }

      // Floating fallback only when no navigation exists
      if (!navLinks && !mobileActions && !inboxNavbar) {
        document.body.appendChild(
          createThemeButton("theme-toggle-floating")
        );
      }
    }

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeInitialized === "true") return;

      button.dataset.themeInitialized = "true";

      button.addEventListener("click", () => {
        const current = root.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
      });
    });

    applyTheme(root.getAttribute("data-theme") || getSavedTheme(), false);
  }

  // Apply saved theme before page setup.
  applyTheme(getSavedTheme(), false);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupThemeToggle, {
      once: true
    });
  } else {
    setupThemeToggle();
  }

  window.NestNotesTheme = {
    apply: applyTheme,
    get: () => root.getAttribute("data-theme") || "light",
    toggle: () => {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    }
  };
})();
