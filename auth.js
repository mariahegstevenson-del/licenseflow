import { supabase, isConfigured, callbackUrl } from "./supabase.js";
import { loadTenant, renderUnknownAgency, applyTenantChrome } from "./tenant.js?v=3";

/* LicenseFlow is sold per agency: accounts are created for agents, never
   self-served. This screen therefore has exactly two states -- log in, and
   "email me a reset link". Sign-up is also disabled server-side in Supabase
   (Authentication -> Sign In / Providers -> allow new users to sign up), and
   that is what actually enforces it: removing the form alone would still
   leave the API and the Google button able to mint new accounts. */
let mode = "login";
const el = (id) => document.getElementById(id);
const A = el("alert");
const show = (m, ok) => { A.textContent = m; A.className = "alert show " + (ok ? "alert-ok" : "alert-error"); };
const clear = () => { A.className = "alert"; };

/* Turn Supabase's terse errors into something a person can act on. */
function friendly(err) {
  const msg = err?.message || "Something went wrong.";
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match an account. Check them, or use the reset link.";
  if (/already registered|already been registered|user already exists/i.test(msg)) return "There's already an account with that email. Log in instead, or use the reset link if you've forgotten the password.";
  if (/password should be at least|weak.?password/i.test(msg)) return "Please choose a password of at least 8 characters.";
  if (/email not confirmed/i.test(msg)) return "This account hasn't been confirmed yet. Check your inbox for the confirmation link.";
  if (/password should be at least/i.test(msg)) return "Please use a password of at least 8 characters.";
  if (/rate limit|too many requests|only request this after|for security purposes/i.test(msg)) return "Too many attempts just now. Please wait a minute and try again.";
  if (/error sending confirmation|error sending email|smtp/i.test(msg)) return "We couldn't send that email. Please contact support so we can get you sorted.";
  /* Sign-ups are off by design, so this is what an unrecognised Google
     account hits. Say what to do about it rather than "not allowed". */
  if (/signups not allowed|signup is disabled|user not allowed|not allowed for this instance/i.test(msg)) return "There's no LicenseFlow account for that email yet. Accounts are created by your agency — ask your licensing coordinator to add you.";
  if (/pwned|leaked|compromised|known.{0,12}password/i.test(msg)) return "That password has turned up in a known data breach. Please pick a different one.";
  if (/provider is not enabled/i.test(msg)) return "Google sign-in isn't switched on for this site yet.";
  if (/failed to fetch|network/i.test(msg)) return "We couldn't reach the server. Check your connection and try again.";
  return msg;
}

const COPY = {
  login:  { title: "Welcome back", sub: "Log in to continue your licensing walkthrough",
            submit: "Log in", pw: "current-password", hint: "" },
  signup: { title: "Create your account", sub: "",
            submit: "Create my account", pw: "new-password",
            hint: 'Already have an account? <a href="#" data-go="login">Log in</a>' },
  reset:  { title: "Reset your password", sub: "We'll email you a link to set a new one",
            submit: "Send reset link", pw: "current-password",
            hint: 'Remembered it? <a href="#" data-go="login">Back to log in</a>' },
};

/* Set once the agency is resolved, so the copy can name them and the
   sign-up door only appears where an agency has actually opened it. */
let TENANT = null;

function render(keepAlert) {
  const c = COPY[mode];
  const resetting = mode === "reset";
  const signing  = mode === "signup";
  el("title").textContent = c.title;
  el("sub").textContent = signing && TENANT?.agency
    ? "Join " + (TENANT.agency.theme?.short_name || TENANT.agency.name) + " and start your licensing"
    : c.sub;
  el("submit").textContent = c.submit;

  /* The sign-up door exists only on an agency's own portal, and only
     when that agency takes open registrations. */
  const canSignUp = !!(TENANT && TENANT.agency && TENANT.agency.open_signup);
  const tabs = el("modeSwitch");
  if (tabs) tabs.style.display = canSignUp && !resetting ? "" : "none";
  document.querySelectorAll("[data-mode-tab]").forEach((b) => {
    b.classList.toggle("on", b.dataset.modeTab === mode);
  });

  // Hiding an input isn't enough -- a hidden `required` field blocks submit
  // silently. Disabling it takes it out of validation as well as out of view.
  el("pwWrap").style.display = resetting ? "none" : "";
  el("password").disabled = resetting;
  el("password").setAttribute("autocomplete", c.pw);
  el("forgot").style.display = resetting ? "none" : "";

  const g = el("google"), or = document.querySelector(".or");
  if (g) g.style.display = resetting ? "none" : "";
  if (or) or.style.display = resetting ? "none" : "";

  el("hint").innerHTML = c.hint;
  const sw = el("hint").querySelector("[data-go]");
  if (sw) sw.onclick = (e) => { e.preventDefault(); mode = sw.dataset.go; render(); };
  if (!keepAlert) clear();
}

el("forgot").onclick = (e) => { e.preventDefault(); mode = "reset"; render(); el("email").focus(); };

document.querySelectorAll("[data-mode-tab]").forEach((b) => {
  b.addEventListener("click", () => { mode = b.dataset.modeTab; render(); });
});

/* ---------- boot ---------- */
(async () => {
  /* On an agency's own subdomain the sign-in card carries their name.
     An address naming an agency that doesn't exist never gets a form. */
  const tenant = await loadTenant();
  if (tenant.unknown) { renderUnknownAgency(tenant.slug); return; }
  applyTenantChrome(tenant.agency);
  TENANT = tenant;

  /* A trainer's link carries the key. Hold it for this tab so the
     recruit never sees it, and never has to type it. */
  try {
    const k = new URLSearchParams(location.search).get("k");
    if (k) sessionStorage.setItem("lf_join_key", k);
  } catch (_) {}

  const wants = new URLSearchParams(location.search).get("mode");
  if (wants === "signup" && tenant.agency && tenant.agency.open_signup) mode = "signup";

  render();

  // If a redirect bounced back here with an error, say so rather than
  // dropping the user on a blank-looking login form.
  const q = new URLSearchParams(location.search);
  if (q.get("error_description") || q.get("error")) {
    const raw = decodeURIComponent(q.get("error_description") || q.get("error")).replace(/\+/g, " ");
    show(friendly({ message: raw }), false);
  }

  if (!isConfigured) {
    show("Accounts aren't connected on this site yet.", false);
    el("submit").disabled = true;
    if (el("google")) el("google").disabled = true;
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) location.href = "app.html";
})();

/* ---------- email + password ---------- */
el("form").addEventListener("submit", async (e) => {
  e.preventDefault(); clear();
  if (!isConfigured) { show("Accounts aren't connected on this site yet.", false); return; }

  const email = el("email").value.trim();
  const password = el("password").value;
  el("submit").disabled = true; el("submit").textContent = "Please wait…";

  try {
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("reset-password.html"),
      });
      if (error) throw error;
      // Always the same message whether or not the address is on file --
      // a different reply here would let anyone test which emails have
      // accounts.
      show("If that email has an account, a reset link is on its way. It expires in an hour.", true);
      return;
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      /* With email confirmation on, signUp returns no session and the
         person has to click a link first. Say so plainly rather than
         bouncing them to an app that will send them back here. */
      if (!data.session) {
        show("Account created. Check " + email + " for a confirmation link, then come back and log in.", true);
        mode = "login"; render(true);
        return;
      }
      location.href = "app.html";
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    location.href = "app.html";
  } catch (err) {
    show(friendly(err), false);
  } finally {
    el("submit").disabled = false;
    el("submit").textContent = COPY[mode].submit;
  }
});

/* ---------- Continue with Google ----------
   Kept on for returning agents. Because sign-ups are disabled in Supabase,
   an unrecognised Google account is refused at the callback instead of
   quietly becoming a brand-new user. */
const google = el("google");
if (google) {
  google.addEventListener("click", async () => {
    clear();
    if (!isConfigured) { show("Accounts aren't connected on this site yet.", false); return; }
    google.disabled = true;
    const label = google.querySelector(".g-label");
    const previous = label ? label.textContent : "";
    if (label) label.textContent = "Redirecting…";
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      // On success the browser is navigating away; nothing more to do.
    } catch (err) {
      show(friendly(err), false);
      google.disabled = false;
      if (label) label.textContent = previous;
    }
  });
}
