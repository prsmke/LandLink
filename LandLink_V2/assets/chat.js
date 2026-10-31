/**
 * chat.js — popup chat-messenger for replying to inquiries.
 *
 * Opens in a small window/popup from the admin or owner dashboard.
 * Reads ?inquiry_id=X from the URL and renders a real-time chat UI.
 *
 * Depends on: assets/backend.js (window.sb, window.llReady, window.llEscape)
 */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const messagesEl = $("#chat-messages");
  const inputEl = $("#chat-input");
  const sendBtn = $("#chat-send");
  const statusEl = $("#chat-status");
  const nameEl = $("#chat-name");
  const subEl = $("#chat-sub");

  let inquiryId = null;
  let currentSender = null; // 'owner' or 'admin'
  let viewRole = null;      // 'admin' or 'owner' — determines whether client msgs are shown
  let channel = null;

  function esc(s) {
    return window.llEscape ? window.llEscape(s) : String(s ?? "");
  }

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function appendMessage(body, sender, createdAt) {
    // Admin view: hide client messages — only owner and admin see those.
    if (viewRole === "admin" && sender === "client") return;
    const wrap = document.createElement("div");
    wrap.className = "msg " + (sender === currentSender ? "outgoing" : "incoming");
    wrap.innerHTML =
      esc(body) +
      (createdAt ? `<div class="meta">${formatTime(createdAt)}</div>` : "");
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showEmpty(text) {
    messagesEl.innerHTML = `<div class="chat-empty">${esc(text)}</div>`;
  }

  async function loadInquiry() {
    const params = new URLSearchParams(location.search);
    inquiryId = params.get("inquiry_id");
    if (!inquiryId) {
      showEmpty("No inquiry specified.");
      return;
    }

    try {
      const { data, error } = await window.sb
        .from("inquiries")
        .select("*, listings(title, location, owner_id)")
        .eq("id", inquiryId)
        .single();
      if (error) throw error;

      nameEl.textContent = esc(data.name);
      subEl.textContent = `Inquiry: ${esc(data.subject || "—")}${
        data.listings ? ` · ${esc(data.listings.title)}` : ""
      }`;

      // Determine sender role and view role: admin if user is admin, otherwise owner
      const { data: user } = await window.sb.auth.getUser();
      if (user?.user) {
        const { data: profile } = await window.sb
          .from("profiles")
          .select("role")
          .eq("id", user.user.id)
          .single();
        currentSender = profile?.role === "admin" ? "admin" : "owner";
        viewRole = profile?.role === "admin" ? "admin" : "owner";
      }

      // Seed the original inquiry as the first "client" message so it appears
      // in the owner's chat but is hidden from the admin view.
      appendMessage(data.message, "client", data.created_at);

      // Load existing replies
      const { data: replies, error: rErr } = await window.sb
        .from("inquiry_replies")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true });
      if (rErr) throw rErr;

      if (replies && replies.length > 0) {
        replies.forEach((r) => appendMessage(r.body, r.sender, r.created_at));
      }

      // Subscribe to new replies in real time
      channel = window.sb
        .channel("inquiry_replies_" + inquiryId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "inquiry_replies",
            filter: "inquiry_id=eq." + inquiryId,
          },
          (payload) => {
            appendMessage(
              payload.new.body,
              payload.new.sender,
              payload.new.created_at,
            );
          },
        )
        .subscribe();

      // Update inquiry status to 'replied' when there are messages
      if (replies && replies.length > 0) {
        await window.sb
          .from("inquiries")
          .update({ status: "replied" })
          .eq("id", inquiryId);
      }
    } catch (err) {
      console.error("Chat load error:", err);
      showEmpty("Unable to load conversation: " + esc(err.message));
    }
  }

  async function sendMessage() {
    const body = inputEl.value.trim();
    if (!body || !inquiryId) return;

    sendBtn.disabled = true;
    statusEl.textContent = "";

    try {
      const { error } = await window.sb.from("inquiry_replies").insert({
        inquiry_id: inquiryId,
        sender: currentSender || "owner",
        body,
      });
      if (error) throw error;

      inputEl.value = "";
      // Optimistically add our own message
      appendMessage(body, currentSender || "owner", new Date().toISOString());

      // Update inquiry status
      await window.sb
        .from("inquiries")
        .update({ status: "replied" })
        .eq("id", inquiryId);
    } catch (err) {
      statusEl.textContent = "Failed to send: " + esc(err.message);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // Wire up events
  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  // Auto-grow textarea
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
  });

  document.addEventListener("DOMContentLoaded", loadInquiry);

  // Cleanup on unload
  window.addEventListener("beforeunload", () => {
    if (channel) channel.unsubscribe();
  });

  // Expose for manual use
  window.Chat = { send: sendMessage, load: loadInquiry };
})();