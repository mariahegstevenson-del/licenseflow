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
import { supabase, isConfigured } from "./supabase.js?v=3";

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
  /* Marks the document as an agency's portal from the hostname alone,
     before the lookup returns. Anything that belongs to LicenseFlow's
     own business -- a sales link, a "book a call" -- hides on this
     class, so it can never surface on a customer's domain. */
  if (slug) document.documentElement.classList.add("is-tenant");
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
  const t = (agency && agency.theme) || {};
  const short = typeof t.short_name === "string" ? t.short_name.trim() : "";

  document.title = agency.name + " \u2014 LicenseFlow";

  /* A branded agency wears its own name in the masthead, with the pill
     saying what the thing is. Without a theme the product name stays put
     and the pill carries the agency -- so an unbranded agency still gets
     a page that makes sense. */
  if (short) {
    document.querySelectorAll("[data-brand-name]").forEach((n) => { n.textContent = short; });
    document.querySelectorAll("[data-brand-initial]").forEach((n) => {
      n.textContent = short.charAt(0).toUpperCase();
    });
    document.querySelectorAll("[data-agency-name]").forEach((n) => {
      n.textContent = "Licensing Portal";
      n.removeAttribute("hidden");
    });
  } else {
    document.querySelectorAll("[data-agency-name]").forEach((n) => {
      n.textContent = agency.name;
      n.removeAttribute("hidden");
    });
  }

  applyTheme(t);
}

/* ------------------------------------------------------------
   The theme.

   An agency's branding is a row, not a stylesheet: a handful of color
   tokens written onto :root, over the top of the ones styles.css and
   auth.css already use. Every rule in the product reads those tokens,
   so recoloring the whole app is this one loop.

   Only recognised keys are read, and each value must look like a hex
   color before it is written -- the theme comes from the database, and
   a CSS custom property is a place where a hostile string could
   otherwise end up inside a url() or a declaration.
   ------------------------------------------------------------ */
const HEX = /^#[0-9a-fA-F]{3,8}$/;

/* theme key -> the variables that key drives, across all three sheets */
const VAR_MAP = {
  brand:      ["--brand", "--accent", "--pri"],
  brand_600:  ["--brand-600", "--accent-600", "--pri6"],
  brand_400:  ["--brand-400"],
  accent_050: ["--accent-050", "--pri05"],
  gold:       ["--agency-gold"],
  gold_ink:   ["--agency-gold-ink"],
  gold_050:   ["--agency-gold-050"],
};

export function applyTheme(theme) {
  if (!theme || typeof theme !== "object") return;
  const root = document.documentElement;

  /* An agency row with an empty theme is not a themed agency. Counting
     what actually lands is what stops LicenseFlow's own demo wearing
     another customer's design just because it has a row in the table. */
  let applied = 0;
  Object.keys(VAR_MAP).forEach((key) => {
    const v = theme[key];
    if (typeof v === "string" && HEX.test(v)) {
      applied++;
      VAR_MAP[key].forEach((name) => root.style.setProperty(name, v));
    }
  });

  /* A display face, if the agency has one. Loaded from Google Fonts by
     family name -- never by a URL out of the database, which would let
     an agency record point the page at any host it liked. */
  const display = typeof theme.display === "string" ? theme.display.trim() : "";
  if (display && /^[A-Za-z0-9 ]{2,40}$/.test(display)) {
    const href = "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(display).replace(/%20/g, "+") +
      ":ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap";
    if (!document.querySelector('link[data-agency-font]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href; l.setAttribute("data-agency-font", "");
      document.head.appendChild(l);
    }
    root.style.setProperty("--ff-display", '"' + display + '", Georgia, serif');
    root.classList.add("has-agency-display");
  }
  root.classList.add(applied ? "themed" : "plain");
}
