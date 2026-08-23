/* Supabase client (ES module). Imported by auth.js / dashboard.js. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cfg = window.LF_CONFIG || {};
const configured =
  cfg.SUPABASE_URL &&
  !cfg.SUPABASE_URL.includes("__SUPABASE_URL__") &&
  cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_ANON_KEY.includes("__SUPABASE_ANON_KEY__");

export const isConfigured = configured;

export const supabase = configured
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: {
        // PKCE is the right flow for a browser app and is what the
        // ?code=... link in confirmation / OAuth redirects uses.
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        // We handle the redirect ourselves on auth-callback.html so that
        // no other page tries to consume the code out from under it.
        detectSessionInUrl: false,
      },
    })
  : null;

/* Absolute URL of the page that finishes a sign-in redirect.
   Works on any host (Railway URL, lifelicenseflow.com, localhost) because it is
   derived from wherever the page is currently being served. Every host you
   use must also be listed in Supabase → Authentication → URL Configuration. */
export function callbackUrl(next) {
  const u = new URL("auth-callback.html", window.location.href);
  if (next) u.searchParams.set("next", next);
  return u.href;
}

/* Small helper: redirect to login if there is no active session.
   The agent app and the Command Center have separate front doors, so the
   caller says which one a signed-out visitor should be sent to. */
export async function requireSession(loginPage) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = loginPage || "login.html";
    return null;
  }
  return data.session;
}

/* ------------------------------------------------------------
   Signing out, and meaning it.

   supabase.auth.signOut() revokes the refresh token on the server, and
   that call can fail -- most often because the token was already
   revoked from another of this account's subdomains, each of which
   keeps its own copy. Some versions then leave the local session
   sitting in storage, so the next page load finds a session, decides
   you are signed in, and offers to sign you out again. That is the
   loop.

   So: ask the server, then ask locally, then clear the browser's copy
   by hand. Only this origin's keys, and only Supabase's own.
------------------------------------------------------------ */
export async function hardSignOut() {
  if (supabase) {
    try { await supabase.auth.signOut(); } catch (_) {}
    try { await supabase.auth.signOut({ scope: "local" }); } catch (_) {}
  }
  try {
    Object.keys(localStorage).forEach((k) => {
      if (/^sb-.+-auth-token/.test(k) || k.indexOf("supabase.auth.") === 0) {
        localStorage.removeItem(k);
      }
    });
  } catch (_) {}
  /* The registration PIN and anything else held for this visit go too --
     signing out should not leave the next person's session primed. */
  try { sessionStorage.clear(); } catch (_) {}
  try { localStorage.removeItem("lf_join_key"); } catch (_) {}
}
