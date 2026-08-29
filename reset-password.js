/* ------------------------------------------------------------
   reset-password.js

   The last leg of the recovery flow. The email link goes to
   auth-callback.html, which exchanges the one-time code for a
   session and then forwards here with ?next=reset-password.html.
   So by the time this page runs, the person is already
   authenticated -- all that's left is to set the new password.

   The page still has to cope with arriving cold (bookmarked, or
   opened after the link expired), which is what the session check
   below is for.
------------------------------------------------------------ */
import { supabase, isConfigured } from "./supabase.js?v=3";

const el = (id) => document.getElementById(id);
const A = el("alert");
const show = (m, ok) => { A.textContent = m; A.className = "alert show " + (ok ? "alert-ok" : "alert-error"); };
const clear = () => { A.className = "alert"; };

function deadEnd(message) {
  el("sub").textContent = "";
  el("form").style.display = "none";
  el("actions").style.display = "block";
  show(message, false);
}

function friendly(err) {
  const msg = err?.message || "We couldn't save that password.";
  if (/should be at least|password.*short/i.test(msg)) return "Please use a password of at least 8 characters.";
  if (/different from the old|same as the old/i.test(msg)) return "That's the password you already had. Please choose a different one.";
  if (/rate limit|too many requests|for security purposes/i.test(msg)) return "Too many attempts just now. Please wait a minute and try again.";
  if (/session|jwt|not authenticated|expired/i.test(msg)) return "Your reset link has expired. Please request a new one.";
  if (/failed to fetch|network/i.test(msg)) return "We couldn't reach the server. Check your connection and try again.";
  return msg;
}

(async function boot() {
  if (!isConfigured) {
    deadEnd("Accounts aren't connected on this site yet.");
    return;
  }

  // A recovery link that has already been used, or one that sat in an inbox
  // past its expiry, leaves us here with no session at all.
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    deadEnd("This reset link has expired or was already used. Request a new one from the log-in page.");
    return;
  }

  const email = data.session.user?.email;
  el("sub").textContent = email ? `Choose a new password for ${email}` : "Choose a new password";
  el("form").style.display = "";
  el("password").focus();
})();

el("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clear();

  const pw = el("password").value;
  const confirm = el("confirm").value;

  // Catch the mismatch here rather than letting someone save a password
  // they typed wrong twice over and then can't log in with.
  if (pw !== confirm) {
    show("Those two passwords don't match.", false);
    el("confirm").focus();
    return;
  }
  if (pw.length < 8) {
    show("Please use a password of at least 8 characters.", false);
    return;
  }

  el("submit").disabled = true;
  el("submit").textContent = "Saving…";
  try {
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) throw error;

    el("form").style.display = "none";
    el("sub").textContent = "";
    el("title").textContent = "Password updated";
    show("You're all set. Taking you to your dashboard…", true);
    setTimeout(() => location.replace("app.html"), 1400);
  } catch (err) {
    show(friendly(err), false);
    el("submit").disabled = false;
    el("submit").textContent = "Save new password";
  }
});
