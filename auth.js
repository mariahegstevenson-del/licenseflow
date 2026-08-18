import { supabase, isConfigured, callbackUrl } from "./supabase.js";

let mode = new URLSearchParams(location.search).get("mode") === "login" ? "login" : "signup";
const el = (id) => document.getElementById(id);
const A = el("alert");
const show = (m, ok) => { A.textContent = m; A.className = "alert show " + (ok ? "alert-ok" : "alert-error"); };
const clear = () => { A.className = "alert"; };

/* Turn Supabase's terse errors into something a person can act on. */
function friendly(err) {
  const msg = err?.message || "Something went wrong.";
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match an account. Check them, or create an account instead.";
  if (/email not confirmed/i.test(msg)) return "This account hasn't been confirmed yet. Check your inbox for the confirmation link.";
  if (/user already registered|already been registered/i.test(msg)) return "There's already an account with that email. Try logging in instead.";
  if (/password should be at least/i.test(msg)) return "Please use a password of at least 6 characters.";
  if (/rate limit|too many requests|only request this after|for security purposes/i.test(msg)) return "Too many attempts just now. Please wait a minute and try again.";
  if (/error sending confirmation|error sending email|smtp/i.test(msg)) return "We couldn't send the confirmation email. Please contact support so we can get you set up.";
  if (/signups not allowed|signup is disabled/i.test(msg)) return "New sign-ups are turned off right now. Please contact support.";
  if (/provider is not enabled/i.test(msg)) return "Google sign-in isn't switched on for this site yet.";
  if (/failed to fetch|network/i.test(msg)) return "We couldn't reach the server. Check your connection and try again.";
  return msg;
}

function render(keepAlert) {
  const s = mode === "signup";
  el("tabSignup").classList.toggle("on", s);
  el("tabLogin").classList.toggle("on", !s);
  el("title").textContent = s ? "Create your account" : "Welcome back";
  el("sub").textContent = s ? "Register to start your licensing walkthrough" : "Log in to continue your walkthrough";
  el("submit").textContent = s ? "Create account" : "Log in";
  el("password").setAttribute("autocomplete", s ? "new-password" : "current-password");
  el("hint").innerHTML = s ? 'Already registered? <a href="#" id="sw">Log in</a>' : 'New here? <a href="#" id="sw">Create an account</a>';
  const sw = el("sw"); if (sw) sw.onclick = (e) => { e.preventDefault(); mode = s ? "login" : "signup"; render(); };
  if (!keepAlert) clear();
}
el("tabSignup").onclick = () => { mode = "signup"; render(); };
el("tabLogin").onclick = () => { mode = "login"; render(); };

/* ---------- boot ---------- */
(async () => {
  render();

  // If a redirect bounced back here with an error, say so rather than
  // dropping the user on a blank-looking login form.
  const q = new URLSearchParams(location.search);
  if (q.get("error_description") || q.get("error")) {
    show(decodeURIComponent(q.get("error_description") || q.get("error")).replace(/\+/g, " "), false);
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
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) throw error;

      if (data.session) {
        // Email confirmation is off — the account is live immediately.
        location.href = "app.html";
        return;
      }

      // No session came back. Supabase deliberately returns a look-alike
      // user with an empty identities array when the address is already
      // registered, so that signup can't be used to probe for accounts.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        mode = "login"; render(true);
        show("There's already an account with that email. Try logging in instead.", false);
        return;
      }

      mode = "login"; render(true);
      show("Account created. Check your email for the confirmation link, then log in.", true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.href = "app.html";
    }
  } catch (err) {
    show(friendly(err), false);
  } finally {
    el("submit").disabled = false;
    el("submit").textContent = mode === "signup" ? "Create account" : "Log in";
  }
});

/* ---------- Continue with Google ---------- */
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
