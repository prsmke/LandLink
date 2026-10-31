/**
 * login.js — handles login form submission with robust error handling
 * and return-redirect after successful authentication.
 *
 * Depends on: assets/backend.js (window.sb, window.llRequireConfig)
 */

(function () {
  "use strict";

  const form = document.querySelector("#login-form");
  const statusEl = document.querySelector("#status");
  const submitBtn = document.querySelector("#login-btn");

  if (!form) return;

  /**
   * After successful login, redirect back to the page the user was trying to
   * reach (e.g. inquiry.html for a property inquiry). Falls back to dashboard.
   */
  function redirectAfterLogin() {
    const returnPath = localStorage.getItem("landlink_return_after_login");
    if (returnPath) {
      localStorage.removeItem("landlink_return_after_login");
      window.location.href = returnPath;
    } else {
      window.location.href = "dashboard.html";
    }
  }

  function showError(message) {
    statusEl.textContent = message;
    statusEl.setAttribute("role", "alert");
  }

  function showLoading() {
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
    statusEl.textContent = "";
    statusEl.removeAttribute("role");
  }

  function resetButton() {
    submitBtn.disabled = false;
    submitBtn.textContent = "Login";
  }

  function getErrorMessage(error) {
    if (!error) return "An unexpected error occurred. Please try again.";
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    if (msg.includes("email not confirmed")) {
      return "Please confirm your email address before logging in.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return "Too many attempts. Please wait a few minutes before trying again.";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    return error.message || "An unexpected error occurred. Please try again.";
  }

  function validateForm() {
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    let valid = true;

    [email, password].forEach((field) => {
      field.classList.remove("error");
      const prevErr = field.parentElement.querySelector(".field-error");
      if (prevErr) prevErr.remove();
    });

    if (!email.value.trim()) {
      fieldError(email, "Email is required.");
      valid = false;
    } else if (!email.validity.valid) {
      fieldError(email, "Please enter a valid email address.");
      valid = false;
    }

    if (!password.value) {
      fieldError(password, "Password is required.");
      valid = false;
    }

    return valid;
  }

  function fieldError(field, message) {
    field.classList.add("error");
    const span = document.createElement("span");
    span.className = "field-error";
    span.textContent = message;
    field.parentElement.appendChild(span);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (typeof window.llRequireConfig === "function" && !window.llRequireConfig()) {
      return;
    }

    if (!window.sb) {
      showError("Authentication service is not available. Please try again later.");
      return;
    }

    if (!validateForm()) return;

    showLoading();

    const formData = new FormData(form);
    const email = formData.get("email")?.trim();
    const password = formData.get("password");

    try {
      const { data, error: authError } = await window.sb.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        showError(getErrorMessage(authError));
        return;
      }

      if (!data?.user) {
        showError("Login failed. Please try again.");
        return;
      }

      // Success — redirect to the return path or dashboard
      redirectAfterLogin();
    } catch (err) {
      console.error("Login error:", err);
      showError(getErrorMessage(err));
    } finally {
      if (document.querySelector("#login-form")) {
        resetButton();
      }
    }
  }

  form.addEventListener("submit", handleSubmit);
})();