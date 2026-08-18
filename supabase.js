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
   Works on any host (Railway URL, licenseflow.app, localhost) because it is
   derived from wherever the page is currently being served. Every host you
   use must also be listed in Supabase → Authentication → URL Configuration. */
export function callbackUrl(next) {
  const u = new URL("auth-callback.html", window.location.href);
  if (next) u.searchParams.set("next", next);
  return u.href;
}

/* Small helper: redirect to login if there is no active session. */
export async function requireSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return null;
  }
  return data.session;
}
