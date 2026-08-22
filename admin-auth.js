/* ------------------------------------------------------------
   admin-auth.js — the Command Center's own front door.

   LicenseFlow ships as two products off one account system: the agent
   walkthrough at login.html, and this. The agent app carries no link to
   the console at all, so an agent has no route in even if they know the
   filename -- admin.js refuses anyone without a row in `admins`, and the
   database enforces the same thing through RLS. This page exists so that
   administrators have a door of their own rather than signing in as an
   agent and then finding a button.

   Being refused here is not an error state. Somebody can perfectly well
   be an agent using the wrong door, so they get pointed at the right one
   and keep their session.
------------------------------------------------------------ */
import { supabase, isConfigured, callbackUrl } from "./supabase.js";
import { loadTenant, renderUnknownAgency, applyTenantChrome } from "./tenant.js?v=3";

const el = (id) => document.getElementById(id);
const A = el("alert");
const show = (m, kind) => { A.innerHTML = m; A.className = "alert show alert-" + (kind || "error"); };
const clear = () => { A.className = "alert"; };

let mode = "login";

function friendly(err) {
  const msg = err?.message || "Something went wrong.";
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(msg)) return "This account hasn't been confirmed yet. Check your inbox for the confirmation link.";
  if (/known to be weak|easy to guess|pwned|leaked|compromised/i.test(msg))
    return "That password has turned up in a past data breach somewhere on the internet, so it isn't safe to reuse. Any three unrelated words together will pass.";
  if (/password should be at least|weak.?password/i.test(msg)) return "Please choose a password of at least 8 characters.";
  if (/rate limit|too many requests|only request this after|for security purposes/i.test(msg)) return "Too many attempts just now. Please wait a minute and try again.";
  if (/signups? not allowed|signup is disabled|user not allowed|not allowed for this instance/i.test(msg)) return "There's no LicenseFlow account for that email.";
  if (/provider is not enabled/i.test(msg)) return "Google sign-in isn't switched on for this site yet.";
  if (/failed to fetch|network/i.test(msg)) return "We couldn't reach the server. Check your connection and try again.";
  return msg;
}

const NOT_ADMIN =
  "This sign-in is for licensing administrators. " +
  'Your account is set up as an agent &#8212; <a href="app.html">open the agent app</a>.';

/* Signed in: send administrators through, and tell everyone else where
   they actually belong. The `admins` lookup is itself protected by RLS,
   so a non-admin simply reads back nothing. */
async function routeBySession(user) {
  const uid = user?.id || (await supabase.auth.getUser()).data?.user?.id;
  if (!uid) { show("We couldn't confirm your sign-in. Please try again."); return false; }

  /* An agency's coordinator is put on a list before they have an
     account. This is where that list becomes real: the database checks
     the invited address against the one Supabase has confirmed for this
     session, and writes the admin row itself. It does nothing at all for
     everyone else, so it is safe to call on every sign-in. */
  try { await supabase.rpc("lf_claim_admin"); } catch (_) {}

  const { data: adm, error } = await supabase.from("admins")
    .select("user_id").eq("user_id", uid).maybeSingle();
  if (error) { show("We couldn't check your access just now. Please try again."); return false; }
  if (adm) { location.href = "admin.html"; return true; }
  show(NOT_ADMIN);
  return false;
}

function setMode(next) {
  mode = next;
  const resetting = mode === "reset";
  el("submit").textContent = resetting ? "Send reset link" : "Sign in to Command Center";
  el("password").disabled = resetting;                 // a hidden `required` field blocks submit silently
  el("password").style.display = resetting ? "none" : "";
  el("forgot").style.display = resetting ? "none" : "";
  document.querySelector('label[for="password"]').style.display = resetting ? "none" : "";
  const g = el("google"), or = document.querySelector(".or");
  if (g) g.style.display = resetting ? "none" : "";
  if (or) or.style.display = resetting ? "none" : "";
}

el("forgot").onclick = (e) => { e.preventDefault(); clear(); setMode("reset"); el("email").focus(); };

/* ---------- boot ---------- */
(async () => {
  const tenant = await loadTenant();
  if (tenant.unknown) { renderUnknownAgency(tenant.slug); return; }
  applyTenantChrome(tenant.agency);

  const q = new URLSearchParams(location.search);
  if (q.get("denied")) show(NOT_ADMIN);

  if (!isConfigured) {
    show("Accounts aren't connected on this site yet.");
    el("submit").disabled = true;
    if (el("google")) el("google").disabled = true;
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) await routeBySession(data.session.user);
})();

/* ---------- email + password ---------- */
el("form").addEventListener("submit", async (e) => {
  e.preventDefault(); clear();
  if (!isConfigured) { show("Accounts aren't connected on this site yet."); return; }

  const email = el("email").value.trim();
  const password = el("password").value;
  const label = el("submit").textContent;
  el("submit").disabled = true; el("submit").textContent = "Please wait…";

  try {
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("reset-password.html"),
      });
      if (error) throw error;
      // Same reply either way, so this can't be used to test which
      // addresses have accounts.
      show("If that email has an account, a reset link is on its way. It expires in an hour.", "ok");
      return;
    }
    const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await routeBySession(signed?.user);
  } catch (err) {
    show(friendly(err));
  } finally {
    el("submit").disabled = false;
    el("submit").textContent = label;
  }
});

/* ---------- Continue with Google ----------
   The callback lands on admin.html, which does the same `admins` check and
   shows its own "not authorized" screen to anyone who shouldn't be there. */
const google = el("google");
if (google) {
  google.addEventListener("click", async () => {
    clear();
    if (!isConfigured) { show("Accounts aren't connected on this site yet."); return; }
    google.disabled = true;
    const label = google.querySelector(".g-label");
    const previous = label ? label.textContent : "";
    if (label) label.textContent = "Redirecting…";
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl("admin.html"), queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
    } catch (err) {
      show(friendly(err));
      google.disabled = false;
      if (label) label.textContent = previous;
    }
  });
}
