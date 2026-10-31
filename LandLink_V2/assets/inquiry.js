/**
 * inquiry.js — shared module for submitting inquiries to Supabase.
 * Saves to the `inquiries` table so they appear in the admin inquiries panel
 * and on the owner's dashboard.
 *
 * Depends on: assets/backend.js (window.sb, window.llReady, window.llEscape)
 *
 * Usage:
 *   <script src="assets/inquiry.js"></script>
 *   <form id="inquiry-form"> ... </form>
 *
 * Optional query params (on the page URL):
 *   ?listing_id=abc&owner_id=xyz   — pre-fills hidden fields for a property inquiry
 */

(function () {
  "use strict";

  /**
   * Map Supabase/network errors to user-friendly messages.
   */
  function getErrorMessage(error) {
    if (!error) return "An unexpected error occurred. Please try again.";
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return "Too many attempts. Please wait a few minutes before trying again.";
    }
    if (msg.includes("row-level security") || msg.includes("policy")) {
      return "You are not permitted to submit an inquiry. Please contact support.";
    }
    return error.message || "An unexpected error occurred. Please try again.";
  }

  /**
   * Validate the form and show inline errors.
   * Returns true when all required fields pass.
   */
  function validateForm(form) {
    const fields = ["name", "email", "subject", "message"];
    let valid = true;

    fields.forEach((name) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) return;
      field.classList.remove("error");
      const prevErr = field.parentElement.querySelector(".field-error");
      if (prevErr) prevErr.remove();

      if (!field.value.trim()) {
        fieldError(field, "This field is required.");
        valid = false;
      } else if (field.type === "email" && !field.validity.valid) {
        fieldError(field, "Please enter a valid email address.");
        valid = false;
      }
    });

    return valid;
  }

  function fieldError(field, message) {
    field.classList.add("error");
    const span = document.createElement("span");
    span.className = "field-error";
    span.textContent = message;
    field.parentElement.appendChild(span);
  }

  /**
   * Submit an inquiry. Returns the inserted row on success, throws on error.
   */
  async function submitInquiry(values) {
    if (!window.sb) throw new Error("Service not available. Please try again later.");

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone ? values.phone.trim() : null,
      subject: values.subject.trim(),
      message: values.message.trim(),
      listing_id: values.listing_id || null,
      status: "new",
    };

    const { data, error } = await window.sb
      .from("inquiries")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Wire up a form with id="inquiry-form" (or pass a custom selector).
   * Reads hidden listing_id/owner_id if present.
   */
  function attachForm(selector) {
    const form = document.querySelector(selector || "#inquiry-form");
    if (!form) return;

    const statusEl = form.querySelector("#inquiry-status") || form.querySelector(".inline-status");
    const submitBtn = form.querySelector('button[type="submit"]');

    // Pre-fill hidden fields from query params
    const params = new URLSearchParams(location.search);
    const listingId = form.querySelector("#inquiry-listing-id, [name=listing_id]");
    const contextEl = document.getElementById("inquiry-context");
    const contextText = document.getElementById("inquiry-context-text");

    if (listingId && params.get("listing_id") && !listingId.value) {
      listingId.value = params.get("listing_id");
    }

    // Show context banner if a property is referenced
    if (contextEl && contextText) {
      const listingTitle = params.get("listing_title");
      if (listingId && listingId.value) {
        contextEl.style.display = "block";
        contextText.textContent = listingTitle
          ? `Property: ${listingTitle}`
          : "Your selected property";
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (typeof window.llRequireConfig === "function" && !window.llRequireConfig()) {
        return;
      }

      if (!validateForm(form)) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.removeAttribute("role");
      }

      const formData = new FormData(form);

      try {
        await submitInquiry({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          listing_id: formData.get("listing_id"),
          owner_id: formData.get("owner_id"),
        });

        if (statusEl) {
          statusEl.textContent = "Thanks! Your inquiry has been sent. The property owner and our team will review it shortly.";
          statusEl.setAttribute("role", "alert");
        }
        form.reset();
      } catch (err) {
        console.error("Inquiry error:", err);
        if (statusEl) {
          statusEl.textContent = getErrorMessage(err);
          statusEl.setAttribute("role", "alert");
        }
      } finally {
        if (submitBtn && document.querySelector("#inquiry-form")) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Inquiry";
        }
      }
    });
  }

  // Auto-attach on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => attachForm());

  // Expose for manual use (e.g. contact.html re-attaches after dynamic content)
  window.Inquiry = { attach: attachForm, submit: submitInquiry };
})();