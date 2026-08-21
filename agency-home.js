/* ------------------------------------------------------------
   agency-home.js — the front page of an agency's own subdomain.

   index.html carries two documents: LicenseFlow's sales page, and this.
   A tiny inline script in the head has already decided which of the two
   is allowed to paint, purely from the hostname, so an agency's people
   never glimpse a pitch aimed at their owner. This module then resolves
   the agency for real and fills the page in.

   Everything rendered here comes out of the agencies row. All of it is
   escaped: an agency's own copy is not a reason to let markup through.
------------------------------------------------------------ */
import { loadTenant, renderUnknownAgency, applyTheme } from "./tenant.js?v=3";

const root = document.getElementById("agencyHome");
const site = document.getElementById("lfSite");
const foot = document.getElementById("lfFoot");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

/* A drawn dawn rather than a photograph: it paints instantly, costs no
   request, and never fights the words in front of it. An agency that
   would rather have their own picture can drop it in behind the same
   scrim without any of this changing. */
function scene() {
  return `
  <svg class="ah-scene" viewBox="0 0 1200 460" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="ahSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#04112A"/><stop offset=".30" stop-color="#0A2B5E"/>
        <stop offset=".50" stop-color="#33547F"/><stop offset=".62" stop-color="#8C7458"/>
        <stop offset=".70" stop-color="#C79552"/><stop offset=".78" stop-color="#E9BE77"/>
        <stop offset="1" stop-color="#F0CE97"/>
      </linearGradient>
      <radialGradient id="ahSun" cx=".72" cy=".70" r=".40">
        <stop offset="0" stop-color="#FFE3A8" stop-opacity=".95"/>
        <stop offset=".45" stop-color="#E7C66B" stop-opacity=".38"/>
        <stop offset="1" stop-color="#E7C66B" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ahFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5A7AA6"/><stop offset="1" stop-color="#8AA3C4"/></linearGradient>
      <linearGradient id="ahMid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#25446F"/><stop offset="1" stop-color="#3A5A85"/></linearGradient>
      <linearGradient id="ahNear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0B2247"/><stop offset="1" stop-color="#061731"/></linearGradient>
    </defs>
    <rect width="1200" height="460" fill="url(#ahSky)"/>
    <ellipse cx="864" cy="322" rx="470" ry="215" fill="url(#ahSun)"/>
    <path fill="url(#ahFar)" opacity=".70" d="M0,344 C120,336 190,328 262,322 C332,316 382,302 442,298
      C518,292 560,302 618,294 C698,283 738,238 788,234 C834,230 876,276 942,290
      C1012,304 1082,296 1200,290 L1200,460 L0,460 Z"/>
    <g opacity=".5" fill="#EAF1FA">
      <ellipse cx="230" cy="356" rx="260" ry="17"/>
      <ellipse cx="660" cy="364" rx="300" ry="15"/>
      <ellipse cx="1040" cy="356" rx="250" ry="14"/>
    </g>
    <path fill="url(#ahMid)" d="M0,396 C90,388 152,376 222,370 C300,363 340,320 394,316
      C446,312 488,356 558,368 C642,382 702,362 782,358 C882,353 962,370 1062,364
      C1132,360 1172,364 1200,362 L1200,460 L0,460 Z"/>
    <g opacity=".38" fill="#F3F8FF">
      <ellipse cx="420" cy="400" rx="320" ry="14"/>
      <ellipse cx="900" cy="408" rx="330" ry="12"/>
    </g>
    <path fill="url(#ahNear)" d="M0,418 C120,402 196,414 300,398 C404,382 470,399 566,390
      C672,380 742,397 848,388 C950,379 1040,393 1200,381 L1200,460 L0,460 Z"/>
  </svg>`;
}

function markGlyph() {
  return `<svg width="17" height="12" viewBox="0 0 17 12" aria-hidden="true" focusable="false">
    <path d="M1 11 L5.6 3.2 Q6 2.6 6.5 3.2 L9.2 7 L11.3 4.4 Q11.7 3.9 12.1 4.4 L16 11 Z"
      fill="currentColor"/></svg>`;
}

function railTiles(lit) {
  const on = new Set(Array.isArray(lit) ? lit : []);
  const half = Math.ceil(STATES.length / 2);
  const build = (arr) => {
    let html = "";
    for (let pass = 0; pass < 2; pass++) {
      arr.forEach((c) => {
        html += `<span class="ah-tile${on.has(c) ? " on" : ""}">${esc(c)}</span>`;
      });
    }
    return html;
  };
  return {
    a: build(STATES.slice(0, half)),
    b: build(STATES.slice(half)),
  };
}

function leaderBlock(l) {
  if (!l || !l.name) return "";
  const stats = Array.isArray(l.stats) ? l.stats : [];
  return `
  <section class="ah-leader">
    <div class="ah-face" aria-hidden="true"><b>${esc(l.initials || "")}</b></div>
    <div>
      <div class="ah-eye">Meet the CEO</div>
      <h2>${esc(l.name)}</h2>
      ${l.role ? `<div class="ah-role">${esc(l.role)}</div>` : ""}
      ${l.bio ? `<p>${esc(l.bio)}</p>` : ""}
      ${stats.length ? `<div class="ah-stats">${stats.map((s) =>
        `<div><b>${esc(s.v)}</b><span>${esc(s.l)}</span></div>`).join("")}</div>` : ""}
    </div>
  </section>`;
}

function render(agency) {
  const t = agency.theme || {};
  const short = t.short_name || agency.name;
  const rails = railTiles(t.states_lit);

  root.innerHTML = `
  <header class="ah-bar">
    <a class="ah-logo" href="index.html">
      <span class="ah-mark">${markGlyph()}</span>
      <span class="ah-word"><b>${esc(short)}</b>${
        t.strapline ? `<span>${esc(t.strapline)}</span>` : ""}</span>
    </a>
    <span class="ah-tag">Licensing Portal</span>
    <nav class="ah-nav" aria-label="Sign in">
      <a href="login.html">Agent login</a>
      <a href="admin-login.html">Command Center</a>
    </nav>
  </header>

  <div class="ah-hero">
    ${scene()}
    <div class="ah-scrim"></div>
    <div class="ah-in">
      <p class="ah-kicker">Licensing Portal</p>
      <h1>${esc(t.hero_title || "Everything your licence needs,")}
        ${t.hero_em ? `<em>${esc(t.hero_em)}</em>` : ""}</h1>
      ${t.hero_body ? `<p class="ah-lede">${esc(t.hero_body)}</p>` : ""}
      <!-- One front door, two ways through it. A recruit who has never
           been here has somewhere obvious to click, and the PIN their
           trainer gives them is the only thing they need to bring --
           no link to find, nothing to have been sent in advance. -->
      <div class="ah-doors">
        <a class="ah-btn gold" href="login.html">I'm an agent &mdash; log in</a>
        ${agency.open_signup
          ? `<a class="ah-btn ghost" href="login.html?mode=signup">First time here &mdash; register</a>`
          : `<a class="ah-btn ghost" href="admin-login.html">Command Center</a>`}
      </div>
      ${agency.open_signup
        ? `<p class="ah-note">Registering takes the PIN your trainer gives you.</p>` : ""}
    </div>
  </div>

  ${t.tagline || t.mission ? `
  <section class="ah-mission">
    ${t.tagline ? `<p class="ah-quote">&ldquo;${esc(t.tagline)}&rdquo;</p>` : ""}
    <div class="ah-rule"></div>
    ${t.mission ? `<p>${esc(t.mission)}</p>` : ""}
  </section>` : ""}

  <section class="ah-band" aria-label="Licensing coverage">
    <div class="ah-lab"><span>Coverage</span><b>All 51 jurisdictions maintained</b></div>
    <div class="ah-rail" aria-hidden="true"><div class="ah-track a">${rails.a}</div></div>
    <div class="ah-rail" aria-hidden="true"><div class="ah-track b">${rails.b}</div></div>
  </section>

  ${leaderBlock(t.leader)}

  <section class="ah-strip">
    <div><b>Know your next step</b><p>One clear action at a time, in the order your state
      actually requires it.</p></div>
    <div><b>Keep your documents</b><p>Your certificates and E&amp;O live here, so they're found
      when contracting needs them.</p></div>
    <div><b>Nobody chasing you</b><p>Your coordinator can see where you are without having to
      ask you for an update.</p></div>
  </section>

  <footer class="ah-foot">
    <span>&copy; ${new Date().getFullYear()} ${esc(agency.name)}</span>
    <span>Trouble signing in? Ask your licensing coordinator
      &middot; <a href="https://lifelicenseflow.com/">Powered by LicenseFlow</a></span>
  </footer>`;

  root.removeAttribute("hidden");
  document.title = agency.name + " — Licensing Portal";
}

(async function () {
  /* The platform's own site: leave it exactly as it was. */
  if (!document.documentElement.classList.contains("is-tenant")) return;

  const t = await loadTenant();
  if (t.unknown) { renderUnknownAgency(t.slug); return; }

  if (!t.agency) {
    /* Couldn't reach the database. Better to show the agency nothing than
       to fall back to LicenseFlow's sales page on their domain. */
    root.innerHTML = `<div class="ah-fallback">
      <h1>We can't reach the portal right now</h1>
      <p>This is usually a dropped connection. Please try again in a moment.</p>
      <p><a class="ah-btn gold" href="login.html">Go to sign-in</a></p></div>`;
    root.removeAttribute("hidden");
    return;
  }

  applyTheme(t.agency.theme);
  render(t.agency);
  if (site) site.remove();
  if (foot) foot.remove();
})();
