import { supabase, isConfigured, callbackUrl, hardSignOut } from "./supabase.js?v=3";
import { loadTenant, renderUnknownAgency, applyTenantChrome } from "./tenant.js?v=5";

/* LicenseFlow is sold per agency. Whether a recruit can make their own
   account is the agency's decision, held in agencies.open_signup, and
   this screen shows the Create account tab only where that is on.

   What stops a stranger joining an agency is not this form and not the
   Supabase sign-up setting -- sign-ups are open at the project level,
   because agencies that take open registrations need them. It is the
   lf_stamp_agency trigger on licensing_profiles: on insert it checks
   the registration key against the agency and, if it doesn't match,
   quietly sets agency_id to null. So the worst an unrecognised person
   can do is create a login attached to nobody, which sees nothing.
   Treat the PIN check in this file as courtesy, not enforcement. */
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
  /* Two different rejections both call a password "weak", and the fix is
     different for each, so this has to come before the length rule.
     Supabase checks new passwords against the Have I Been Pwned list --
     a long password can still be refused because it has appeared in a
     breach somewhere else, which is baffling unless you say so. */
  if (/known to be weak|easy to guess|pwned|leaked|compromised/i.test(msg))
    return "That password has turned up in a past data breach somewhere on the internet, so it isn't safe to reuse. Any three unrelated words together will pass — length is what counts here, not symbols.";
  if (/password should be at least|weak.?password/i.test(msg)) return "Please choose a password of at least 8 characters.";
  if (/email not confirmed/i.test(msg)) return "This account hasn't been confirmed yet. Check your inbox for the confirmation link.";
  if (/password should be at least/i.test(msg)) return "Please use a password of at least 8 characters.";
  if (/rate limit|too many requests|only request this after|for security purposes/i.test(msg)) return "Too many attempts just now. Please wait a minute and try again.";
  if (/error sending confirmation|error sending email|smtp/i.test(msg)) return "We couldn't send that email. Please contact support so we can get you sorted.";
  /* Kept for agencies that don't take open registrations, and for the
     day sign-ups are switched off at the project level. Says what to do
     about it rather than "not allowed". */
  if (/signups not allowed|signup is disabled|user not allowed|not allowed for this instance/i.test(msg)) return "There's no LicenseFlow account for that email yet. Accounts are created by your agency — ask your licensing coordinator to add you.";
  if (/provider is not enabled/i.test(msg)) return "Google sign-in isn't switched on for this site yet.";
  if (/failed to fetch|network/i.test(msg)) return "We couldn't reach the server. Check your connection and try again.";
  return msg;
}

const COPY = {
  login:  { title: "Welcome back", sub: "Log in to continue your licensing walkthrough",
            submit: "Log in", pw: "current-password", hint: "" },
  signup: { title: "Create your account", sub: "",
            submit: "Create my account", pw: "new-password",
            /* Said before they submit, not after: the confirmation email
               is the one moment a recruit can wander off. */
            hint: 'We\'ll email you a link to confirm your address &mdash; click it, '
                + 'then come back and log in.<br/>'
                + 'Already have an account? <a href="#" data-go="login">Log in</a>' },
  reset:  { title: "Reset your password", sub: "We'll email you a link to set a new one",
            submit: "Send reset link", pw: "current-password",
            hint: 'Remembered it? <a href="#" data-go="login">Back to log in</a>' },
};

/* Set once the agency is resolved, so the copy can name them and the
   sign-up door only appears where an agency has actually opened it. */
let TENANT = null;

/* Registering on an agency's portal takes the PIN their trainer hands
   out. It can arrive two ways -- typed into the box below, or carried
   invisibly on a link -- and either way it is checked against the
   database before the account form is shown at all. pinOK records that
   the check has passed in this tab. */
let pinOK = false;
let pinTries = 0;

function heldKey() {
  try {
    return new URLSearchParams(location.search).get("k")
      || localStorage.getItem("lf_join_key")
      || sessionStorage.getItem("lf_join_key") || "";
  } catch (_) { return ""; }
}

/* Hold the verified PIN where the app will still find it after the
   recruit has left for their inbox and come back through a new tab.
   localStorage is scoped to this agency's own subdomain by the browser,
   and the registration form clears it once they're through. */
function keepPin(k) {
  try { localStorage.setItem("lf_join_key", k); } catch (_) {}
  try { sessionStorage.setItem("lf_join_key", k); } catch (_) {}
}

/* Ask the database whether this is really the agency's PIN. Tolerates
   case and stray spaces; the function itself does the comparing, so the
   key never has to be readable from the browser. */
async function checkPin(pin) {
  const a = TENANT && TENANT.agency;
  if (!a || !pin) return false;
  try {
    const { data, error } = await supabase.rpc("lf_join_key_ok",
      { p_agency: a.id, p_key: pin });
    if (error) return false;
    return !!data;
  } catch (_) { return false; }
}

/* Somebody arriving at a sign-in page has come to make a choice. Sending
   them straight through on a session they may have forgotten about --
   often one belonging to a different agency's subdomain, since each
   keeps its own -- takes that choice away and looks like the page
   ignored them. Offer both doors and let them pick. */
function showAlreadySignedIn(user) {
  const box = el("already");
  if (!box) { location.href = "app.html"; return; }
  el("title").textContent = "You're already signed in";
  el("sub").textContent = "";
  el("alreadyWho").textContent = "as " + (user?.email || "this account");
  box.style.display = "";
  ["form", "pinForm", "google", "modeSwitch", "hint"].forEach((id) => {
    const n = el(id); if (n) n.style.display = "none";
  });
  const or = document.querySelector(".or"); if (or) or.style.display = "none";
  document.querySelectorAll(".no-signup-note, .platform-only").forEach((n) => { n.style.display = "none"; });

  el("alreadyGo").onclick = () => { location.href = "app.html"; };
  el("alreadyOut").onclick = async () => {
    el("alreadyOut").disabled = true;
    el("alreadyOut").textContent = "Signing out\u2026";
    await hardSignOut();
    location.replace("login.html?fresh=1");
  };
}

function render(keepAlert) {
  /* The sign-up door exists only on an agency's own portal, and only
     where that agency takes registrations. On LicenseFlow's own domain
     there is no such door at all: accounts there are made for people. */
  const a = TENANT && TENANT.agency;
  const canSignUp = !!(a && a.open_signup);
  if (!canSignUp && mode === "signup") mode = "login";

  const c = COPY[mode];
  const resetting = mode === "reset";
  const signing   = mode === "signup";
  /* Registering is two steps when the agency uses a PIN: prove you were
     sent here, then make the account. Doing it in that order means
     nobody creates a login they then can't use. */
  const pinStep = signing && !!(a && a.needs_key) && !pinOK;

  el("title").textContent = pinStep ? "First time here?" : c.title;
  el("sub").textContent = pinStep
    ? "Enter the registration PIN your trainer gave you"
    : (signing && a
        ? "Join " + (a.theme?.short_name || a.name) + " and start your licensing"
        : c.sub);
  el("submit").textContent = c.submit;

  const tabs = el("modeSwitch");
  if (tabs) tabs.style.display = canSignUp && !resetting ? "" : "none";
  document.querySelectorAll("[data-mode-tab]").forEach((b) => {
    b.classList.toggle("on", b.dataset.modeTab === mode);
  });
  /* Contradicts the Create account tab sitting right above it. */
  document.querySelectorAll(".no-signup-note").forEach((n) => {
    n.style.display = canSignUp ? "none" : "";
  });

  /* The PIN step replaces the account form rather than sitting above it,
     so there is only ever one thing on screen to fill in. */
  const pinForm = el("pinForm");
  if (pinForm) pinForm.style.display = pinStep ? "" : "none";
  el("form").style.display = pinStep ? "none" : "";
  /* A hidden `required` field blocks submit silently, so take the inputs
     out of validation as well as out of view. */
  el("email").disabled = pinStep;
  el("pwWrap").style.display = resetting || pinStep ? "none" : "";
  el("password").disabled = resetting || pinStep;
  el("password").setAttribute("autocomplete", c.pw);
  el("forgot").style.display = resetting || pinStep ? "none" : "";
  if (el("pwNote")) el("pwNote").style.display = signing && !pinStep ? "" : "none";
  if (el("pin")) el("pin").disabled = !pinStep;

  const g = el("google"), or = document.querySelector(".or");
  if (g) g.style.display = resetting || pinStep ? "none" : "";
  if (or) or.style.display = resetting || pinStep ? "none" : "";

  el("hint").innerHTML = pinStep
    ? 'Don\'t have a PIN? Your trainer has it. &middot; <a href="#" data-go="login">Log in instead</a>'
    : c.hint;
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

  const wants = new URLSearchParams(location.search).get("mode");
  if (wants === "signup" && tenant.agency && tenant.agency.open_signup) mode = "signup";

  render();

  /* A link may carry the PIN for someone -- a trainer sending it ahead,
     a second page in the same tab. If it checks out, skip the box; if it
     doesn't, say nothing and let them type it. Nothing depends on the
     link existing: the PIN box on its own is the whole route in. */
  if (isConfigured && tenant.agency && tenant.agency.needs_key) {
    const k = heldKey();
    if (k && await checkPin(k)) {
      pinOK = true;
      keepPin(k);
      render(true);
    }
  }

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
  /* ?fresh=1 means we have just signed them out on purpose. Never offer
     the "already signed in" choice on that arrival, even if a stale
     session somehow survived -- that is precisely the loop. */
  const justSignedOut = new URLSearchParams(location.search).get("fresh") === "1";
  if (data.session && !justSignedOut) { showAlreadySignedIn(data.session.user); return; }
})();

/* ---------- the PIN step ---------- */
const pinForm = el("pinForm");
if (pinForm) {
  pinForm.addEventListener("submit", async (e) => {
    e.preventDefault(); clear();
    const pin = el("pin").value.trim();
    if (!pin) { show("Please enter your agency's registration PIN.", false); return; }
    /* A PIN is short by design, so it is worth slowing down guessing.
       Five wrong tries in a tab and the box stops answering. */
    if (pinTries >= 5) {
      show("Too many tries. Reload the page and check the PIN with your trainer.", false);
      return;
    }
    const b = el("pinSubmit");
    b.disabled = true; b.textContent = "Checking…";
    const ok = await checkPin(pin);
    b.disabled = false; b.textContent = "Continue";
    if (!ok) {
      pinTries++;
      show("That PIN isn't right for this agency. Check it with your trainer.", false);
      el("pin").select();
      return;
    }
    pinOK = true;
    keepPin(pin);
    render();
    el("email").focus();
  });
}

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
