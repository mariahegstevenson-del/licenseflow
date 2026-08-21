/* ------------------------------------------------------------
   tenant.js — which agency is this?

   Each agency reaches LicenseFlow on its own subdomain:

     pacificridgeway.lifelicenseflow.com          the agents
     pacificridgeway.lifelicenseflow.com/admin…   their coordinator

   The subdomain decides whose portal is being served. It is a
   convenience and a piece of branding, not a security boundary -- the
   database decides what anyone may actually read, through the agency
   rules on every table. So nothing here needs to be trusted; the worst
   an altered host can do is show the wrong name above the wrong empty
   page.
------------------------------------------------------------ */
import { supabase, isConfigured } from "./supabase.js";

const APP_DOMAIN = "lifelicenseflow.com";

/* The slug in front of the domain, or null on the apex, on www, and on
   any host that isn't ours (the Railway URL, localhost, a preview). */
export function tenantSlug() {
  const h = (window.location.hostname || "").toLowerCase();
  if (h === APP_DOMAIN || !h.endsWith("." + APP_DOMAIN)) return null;
  const sub = h.slice(0, -(APP_DOMAIN.length + 1));
  if (!sub || sub === "www" || sub.includes(".")) return null;
  return sub;
}

/* Build the same page's address on another agency's subdomain, so a
   person who came through the wrong door can be handed to the right one
   without losing the page they asked for. */
export function urlForAgency(slug, path) {
  const p = path || (window.location.pathname + window.location.hash);
  if (!slug) return "https://" + APP_DOMAIN + p;
  return "https://" + slug + "." + APP_DOMAIN + p;
}

/* Resolve the subdomain to a real agency.

   Returns { slug, agency, unknown }:
     slug     what the address claimed, or null on the main domain
     agency   { id, slug, name, status } once resolved
     unknown  true when the address named an agency that doesn't exist

   Suspended agencies deliberately resolve to nothing, so switching an
   agency off in the database switches off their portal. */
export async function loadTenant() {
  const slug = tenantSlug();
  if (!slug || !isConfigured) return { slug, agency: null, unknown: false };

  const { data, error } = await supabase.rpc("lf_agency_public", { p_slug: slug });
  if (error) {
    // Treat a lookup failure as "don't know yet" rather than "no such
    // agency" -- a network blip shouldn't tell an agency they don't exist.
    console.warn("Agency lookup failed:", error.message);
    return { slug, agency: null, unknown: false, error };
  }
  const agency = Array.isArray(data) ? data[0] : data;
  return { slug, agency: agency || null, unknown: !agency };
}

/* The page shown when the address names no agency we know. Its own
   markup, because it has to work before any stylesheet the app would
   normally rely on has been given a tenant to theme. */
export function renderUnknownAgency(slug) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;padding:40px 18px;
                background:#F2F5F9;font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif;
                color:#061223">
      <div style="max-width:460px;text-align:center">
        <div style="width:34px;height:34px;border-radius:9px;background:#0C3D82;color:#fff;
                    display:grid;place-items:center;font-weight:800;margin:0 auto 18px">L</div>
        <h1 style="font-family:'Libre Franklin',Inter,sans-serif;font-size:1.5rem;
                   letter-spacing:-.03em;margin:0 0 8px">This portal isn't set up</h1>
        <p style="color:#51637A;line-height:1.6;margin:0 0 20px">
          There's no LicenseFlow agency at <strong>${String(slug || "").replace(/[&<>"']/g, "")}</strong>.
          Check the address with whoever sent it to you.
        </p>
        <a href="https://${APP_DOMAIN}/" style="color:#0C3D82;font-weight:650;text-decoration:none">
          Go to LicenseFlow &#8594;</a>
      </div>
    </div>`;
}

/* Put the agency's name in the page: the tab title, and any element
   marked data-agency-name. The product stays LicenseFlow -- this is a
   portal an agency is given, not software pretending to be theirs. */
export function applyTenantChrome(agency) {
  if (!agency) return;
  document.title = agency.name + " — LicenseFlow";
  document.querySelectorAll("[data-agency-name]").forEach((n) => {
    n.textContent = agency.name;
    n.removeAttribute("hidden");
  });
}
