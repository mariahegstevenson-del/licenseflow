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
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

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
