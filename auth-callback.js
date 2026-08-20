/* ------------------------------------------------------------
   auth-callback.js

   Every redirect-based sign-in lands here: "Continue with Google",
   email confirmation links, magic links, password-recovery links.

   Supabase hands the result back in one of four shapes and the page
   has to be able to finish all of them, otherwise the user lands on a
   page that looks logged out and the whole flow appears broken:

     ?code=...                    PKCE (Google, and modern email links)
     ?token_hash=...&type=...     email links using the newer template
     #access_token=...            implicit flow (older templates)
     ?error=...                   the provider or Supabase said no
------------------------------------------------------------ */
import { supabase, isConfigured } from "./supabase.js";

const el = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const hash = new URLSearchParams(location.hash.replace(/^#/, ""));

function fail(message) {
  el("title").textContent = "We couldn't sign you in";
  el("sub").textContent = "";
  const a = el("alert");
  a.textContent = message;
  a.className = "alert show alert-error";
  el("actions").style.display = "block";
}

/* Sign-ups are disabled in Supabase because accounts are created per agency.
   That makes "signups not allowed" an expected outcome here, not a fault: it
   is what an unrecognised Google account gets instead of silently becoming a
   new user. It needs to read as an instruction, not an error dump. */
const NO_SIGNUP = /signups? not allowed|signup is disabled|user not allowed|not allowed for this instance/i;
function noSignupMessage() {
  return "There's no LicenseFlow account for that email yet. Accounts are created by your agency — " +
         "ask your licensing coordinator to add you, then sign in here.";
}

function succeed() {
  // Strip the code/token out of the address bar before leaving, so the
  // one-time credential is never left sitting in browser history.
  const next = params.get("next") || "app.html";
  const safe = /^[A-Za-z0-9_.-]+\.html(#.*)?$/.test(next) ? next : "app.html";
  history.replaceState({}, "", location.pathname);
  location.replace(safe);
}

(async function run() {
  if (!isConfigured) {
    fail("Supabase isn't configured for this site yet.");
    return;
  }

  // 1. The provider explicitly returned an error.
  const err = params.get("error") || hash.get("error");
  if (err) {
    const desc =
      params.get("error_description") ||
      hash.get("error_description") ||
      err;
    const code = params.get("error_code") || hash.get("error_code") || "";
    if (NO_SIGNUP.test(desc) || NO_SIGNUP.test(code)) {
      fail(noSignupMessage());
    } else if (code === "otp_expired" || /expired/i.test(desc)) {
      fail("That link has expired. Request a new one and try again.");
    } else if (/access_denied/i.test(err)) {
      fail("Sign-in was cancelled before it finished.");
    } else {
      fail(decodeURIComponent(desc).replace(/\+/g, " "));
    }
    return;
  }

  try {
    // 2. PKCE — Google sign-in and current-style email links.
    const code = params.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      succeed();
      return;
    }

    // 3. token_hash links (email confirmation / recovery templates).
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw error;
      succeed();
      return;
    }

    // 4. Implicit flow — tokens arrive in the URL fragment.
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      succeed();
      return;
    }

    // 5. Nothing in the URL. If a session already exists we're fine.
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      succeed();
      return;
    }

    fail("This sign-in link is missing information. Please start again.");
  } catch (e) {
    const msg = e?.message || "Something went wrong finishing sign-in.";

    // A one-time code can only be exchanged once. If this page ran twice --
    // a double-click on the provider's Continue button, a refresh, or the
    // back button -- the second attempt throws even though the first one
    // already signed the person in. Check for a session before crying wolf.
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        succeed();
        return;
      }
    } catch (_) {
      /* fall through to the error below */
    }

    // The PKCE verifier lives in this browser's local storage. If the link
    // was opened somewhere else (a different browser, or an email client's
    // in-app browser) there is nothing to exchange the code against.
    if (NO_SIGNUP.test(msg)) {
      fail(noSignupMessage());
    } else if (/code.?verifier|code challenge|invalid request/i.test(msg)) {
      fail(
        "This link has to be opened in the same browser you started in. " +
          "Please head back and sign in again here."
      );
    } else {
      fail(msg);
    }
  }
})();
