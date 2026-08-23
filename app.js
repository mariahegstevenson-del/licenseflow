import { supabase, isConfigured, requireSession, hardSignOut } from "./supabase.js?v=2";
import { STATE_LIST, STATES, ceSlots } from "./states.js?v=7";
import * as F from "./flow.js?v=7";
import { loadTenant, renderUnknownAgency, applyTenantChrome, urlForAgency } from "./tenant.js?v=4";

const el = (id) => document.getElementById(id);
const root = el("root");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const stateName = (c) => STATES[c]?.name || c || "";
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

const S = { user:null, profile:null, instances:[], docs:[], sm:{}, journey:null, videos:{} };
let ceRows = []; // transient new-certificate rows for the CE view

/* ---------------- boot ---------------- */
(async function () {
  if (!isConfigured) { root.innerHTML = box("Connect Supabase to use the app."); return; }

  /* Which agency's portal is this? Resolved before anything is drawn, so
     an address naming an agency that doesn't exist never gets as far as
     showing a sign-in form. */
  S.tenant = await loadTenant();
  if (S.tenant.unknown) { renderUnknownAgency(S.tenant.slug); return; }
  applyTenantChrome(S.tenant.agency);

  const session = await requireSession(); if (!session) return;
  S.user = session.user;
  el("logout").onclick = async () => { await hardSignOut(); location.href = "index.html"; };
  window.addEventListener("hashchange", route);
  /* No admin affordance lives in the agent app. Administrators sign in to the
     Command Center through its own door (admin-login.html) so that what an
     agent sees is only ever the agent product. */
  await load();
})();

async function load() {
  const uid = S.user.id;
  /* A rejected query would take Promise.all down with it and leave the page
     sitting on "Loading…" forever, so each one resolves to a result shape
     whether it succeeds or throws. */
  const settle = (q) => Promise.resolve(q).then(
    (r) => r, (e) => ({ data: null, error: e || new Error("Request failed") }));

  const [p, inst, docs, vids] = await Promise.all([
    settle(supabase.from("licensing_profiles")
      .select("*, agency:agencies(id,slug,name,theme)").eq("user_id", uid).maybeSingle()),
    settle(supabase.from("requirement_instances").select("*").eq("user_id", uid)),
    settle(supabase.from("documents").select("*").eq("user_id", uid)),
    settle(supabase.from("step_videos").select("*")),
  ]);
  /* A failed profile read and a genuinely new agent both arrive here as
     null. Treating them the same is dangerous: an existing agent would be
     shown the registration form, and finishing it overwrites the profile
     they already have. Record the failure so route() can tell them apart. */
  S.profileError = p.error || null;
  S.profile = p.data; S.instances = inst.data || []; S.docs = docs.data || [];
  S.videos = {}; (vids.data||[]).forEach(v => S.videos[v.step_key] = v);
  S.sm = F.statusMap(S.instances);

  /* An agent who arrives on the wrong agency's address -- an old
     bookmark, a link from the main site -- is handed to their own
     portal rather than shown an empty one. This is a courtesy, not a
     control: the database already refuses them everything that isn't
     theirs, whichever host they ask from. */
  /* An agency's coordinator confirms their email like anyone else, and
     the link lands them here. Without this they'd be met by an agent
     registration form they should never fill in. Their invitation is
     turned into an admin row and they're handed to the Command Center
     instead. Nobody without an invitation is affected. */
  if (!S.profile && !S.profileError) {
    const { data: claimed } = await settle(supabase.rpc("lf_claim_admin"));
    if (claimed) { window.location.replace("admin.html"); return; }
  }

  const home = S.profile?.agency?.slug || null;
  if (home && home !== (S.tenant?.slug || null)) {
    /* A platform administrator is not lost -- they are looking. Sending
       them to whichever agency their own sample profile happens to sit
       under is how you click "Agent view" on Pacific Ridgeway's console
       and land on the demo portal wondering what you broke. */
    const { data: isPlatform } = await settle(supabase.rpc("lf_is_platform_admin"));
    if (!isPlatform) { window.location.replace(urlForAgency(home)); return; }
    S.foreignHost = true;
  }
  if (S.profile?.agency) applyTenantChrome(S.profile.agency);

  el("who").textContent = S.profile?.full_name || S.user.email;
  if (S.profile?.designated_state) S.journey = F.buildJourney(S.profile.designated_state);
  route();
}
/* ------------------------------------------------------------
   The trainer's registration key.

   It rides in the link the trainer sends (?k=...), so the recruit never
   types it. Stashed for this tab because the link lands on the sign-in
   page and the key isn't needed until the registration form two screens
   later. It is not a secret worth protecting in the browser -- the
   database is what decides whether it is right.
   ------------------------------------------------------------ */
function joinKey(){
  try {
    const fromUrl = new URLSearchParams(location.search).get("k");
    if (fromUrl) { setJoinKey(fromUrl); return fromUrl; }
    /* localStorage, not session: with email confirmation on, the recruit
       leaves for their inbox and comes back through a fresh tab. The PIN
       has to still be here when they do. It is scoped to this agency's
       own subdomain by the browser itself. */
    return localStorage.getItem("lf_join_key")
        || sessionStorage.getItem("lf_join_key") || "";
  } catch (_) { return ""; }
}
function setJoinKey(k){
  try { localStorage.setItem("lf_join_key", k); } catch (_) {}
  try { sessionStorage.setItem("lf_join_key", k); } catch (_) {}
}
function forgetJoinKey(){
  try { localStorage.removeItem("lf_join_key"); } catch (_) {}
  try { sessionStorage.removeItem("lf_join_key"); } catch (_) {}
}

function firstName(){ return (S.profile?.answers?.first_name) || (S.profile?.full_name||"").split(" ")[0] || "there"; }
function docFor(key){ return S.docs.find(d => d.doc_key === key); }
function sysLine(){ return `Licensing state: <strong>${esc(stateName(S.profile.designated_state))}</strong> &nbsp;·&nbsp; License: <strong>${esc(S.profile.license_type)}</strong>`; }
async function audit(event, before, after, meta={}) { await supabase.from("audit_events").insert({ user_id:S.user.id, event, status_before:before||null, status_after:after||null, source:"agent", meta }); }
function stepIndex(key){ return S.journey ? S.journey.reqs.findIndex(r=>r.key===key) : -1; }
function videoBlock(key, fallbackTitle){
  const v = S.videos?.[key];
  if (!v || !v.active || !v.url) {
    /* No recording for this step yet. Hold the space rather than letting
       the layout jump the day one is added, and say plainly that it is
       coming -- an empty frame with no explanation reads as broken. */
    return `<div class="section-k center-k">Watch this step</div>
      <div class="video is-soon">
        <div class="ph">
          <div class="pi"></div>
          <b>Walkthrough coming soon</b>
          <span>A short screen recording of this step is being made.</span>
        </div>
      </div>`;
  }
  return `<div class="section-k center-k">${esc(v.title||fallbackTitle||"Watch")}</div>
    <div class="video">${videoEmbed(v.url)}</div>
    ${v.description?`<p class="link-note" style="margin-top:-12px">${esc(v.description)}</p>`:""}`;
}

/* ------------------------------------------------------------
   The progress band.

   Full width, directly under the masthead, on every step screen. It is
   the one place that answers "where am I, how much is left" -- the job
   the side panel was doing badly and in front of people who had not
   earned the context to read it yet.
------------------------------------------------------------ */
/* Says plainly whose portal you are standing in when it isn't your own.
   Only ever seen by a platform administrator, who is the only person
   allowed to be here with somebody else's branding around them. */
function setHostNote(){
  let n = el("hostnote");
  if (!S.foreignHost) { if (n) n.remove(); return; }
  if (!n) {
    n = document.createElement("div");
    n.id = "hostnote";
    document.body.insertBefore(n, el("stepbar") || el("root"));
  }
  const here = S.tenant?.agency?.name || S.tenant?.slug || "this portal";
  const mine = S.profile?.agency?.name || "your own agency";
  n.innerHTML = `<div class="hn-in"><b>You're on ${esc(here)}'s portal</b>
    <span>&mdash; this is your own agent record from ${esc(mine)}, not an agent of theirs.</span>
    <a href="${esc(urlForAgency(S.profile?.agency?.slug || null))}">Go to my portal &rarr;</a></div>`;
}

function setStepBar(html){
  const n = el("stepbar");
  if (!n) return;
  n.innerHTML = html || "";
  n.classList.toggle("on", !!html);
}

function stepBarHTML(r, idx, total){
  let segs = "";
  for (let i = 0; i < total; i++) {
    const req = S.journey.reqs[i];
    const done = F.isDone(F.reqStatus(req.key, S.sm));
    segs += `<i class="${i === idx ? "now" : (done ? "done" : "")}"></i>`;
  }
  return `<div class="sb-in">
    <div class="sb-top">
      <a class="sb-back" href="#/dashboard">&larr; Your journey</a>
      <span class="sb-now">${esc(r.label || r.heading || "")}</span>
      <span class="sb-count">Step <b>${idx + 1}</b> of ${total}</span>
    </div>
    <div class="sb-seg" role="img" aria-label="Step ${idx + 1} of ${total}">${segs}</div>
  </div>`;
}

/* ------------------------------------------------------------
   One glow, and it always sits on the next thing that has to happen.

   The rule is deliberately dumb, because a rule an agent can predict is
   worth more than a clever one: whatever is still missing, glows. Save
   & continue only lights up once the step is genuinely satisfied, which
   is what stops somebody pressing it on the way past. It is still
   clickable before then -- submitGeneric() names what's missing, which
   is more use than a dead button nobody can explain.
------------------------------------------------------------ */
function openedKey(key){ return "lf_opened_" + (S.user?.id || "") + "_" + key; }
function markOpened(key){ try { localStorage.setItem(openedKey(key), "1"); } catch (_) {} }
function wasOpened(key){
  try { return localStorage.getItem(openedKey(key)) === "1"; } catch (_) { return false; }
}

function paintNext(r){
  const glow = (id, on) => { const n = el(id); if (n) n.classList.toggle("on", !!on); };
  const need = el("needLine");
  const go   = el("ctaGo");
  if (!go) return;

  /* 1. the outside task, if this step has one and they haven't been yet */
  const linkPending = !!r.link && !wasOpened(r.key) && !F.isDone(F.reqStatus(r.key, S.sm));

  /* 2. the first required answer still blank */
  let firstMissing = null;
  for (const f of (r.fields || [])) {
    if (!f.required) continue;
    const n = el("f_" + f.name);
    if (n && !String(n.value || "").trim()) { firstMissing = f; break; }
  }
  const df = el("docInput");
  const docMissing = !!(r.doc?.required && !docFor(r.key) && !(df && df.files[0]));

  /* Whether they actually went to the provider's site is guidance, not
     something we can check -- and on a step like E&O the agent often
     already has the certificate in hand and never needs to go there at
     all. So the link steers where the glow sits, but only the real
     requirements -- the answers and the file -- decide whether the step
     can be finished. Gating the button on the link trapped people who
     had done the work already. */
  const ready = !firstMissing && !docMissing;
  const steerToLink = linkPending && !ready;

  glow("ctaLink", steerToLink);
  (r.fields || []).forEach((f) => glow("w_" + f.name, !steerToLink && firstMissing === f));
  glow("ctaDoc", !steerToLink && !firstMissing && docMissing);
  glow("ctaGo", ready);
  go.classList.toggle("ready", ready);
  /* Not just quiet -- shut. The line underneath says what is missing, so
     a button that refuses to be pressed is never a mystery. */
  const btn = el("submitStep");
  if (btn) { btn.disabled = !ready; btn.setAttribute("aria-disabled", String(!ready)); }

  if (need) {
    let msg = "";
    if (steerToLink) msg = `Open ${esc(r.providerLabel || "the link above")} first &mdash; then come back and record what you did.`;
    else if (firstMissing) msg = `Enter your ${esc(String(firstMissing.label).toLowerCase())} to finish this step.`;
    else if (docMissing) msg = `Attach your ${esc(String(r.doc.label).toLowerCase())} to finish this step.`;
    need.innerHTML = msg ? `<span aria-hidden="true">&#9679;</span><span>${msg}</span>` : "";
    need.classList.toggle("hide", !msg);
  }
}

/* ------------------------------------------------------------
   Dropping a file on the page.

   The certificate is usually already sitting on someone's desktop, so
   dragging it straight in is the shortest path. Everything still runs
   through the same hidden file input, so the rest of the code -- the
   validation, the upload, the glow -- neither knows nor cares how the
   file arrived.
------------------------------------------------------------ */
const MAX_UPLOAD = 10 * 1024 * 1024;

function wireDrops(after){
  root.querySelectorAll(".drop").forEach((zone) => {
    if (zone.dataset.wired) return;
    zone.dataset.wired = "1";
    const input = el(zone.dataset.drop);
    const nameEl = zone.dataset.name ? el(zone.dataset.name) : null;
    if (!input) return;

    const show = () => {
      const f = input.files && input.files[0];
      if (f && f.size > MAX_UPLOAD) {
        input.value = "";
        zone.classList.remove("has");
        if (nameEl) nameEl.textContent = "That file is over 10 MB. Please attach a smaller copy.";
        zone.classList.add("bad");
        if (after) after();
        return;
      }
      zone.classList.remove("bad");
      zone.classList.toggle("has", !!f);
      if (nameEl) nameEl.textContent = f ? "Attached: " + f.name : "";
      if (after) after();
    };

    zone.querySelectorAll("[data-pick]").forEach((b) => {
      b.addEventListener("click", (e) => { e.stopPropagation(); input.click(); });
    });
    zone.addEventListener("click", (e) => {
      if (e.target.closest("[data-pick]")) return;
      input.click();
    });

    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => {
      e.preventDefault(); zone.classList.add("over");
    }));
    ["dragleave", "dragend"].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove("over")));

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("over");
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      /* Put the dropped file into the real input, so every other piece of
         code sees exactly what it would have seen from the file picker. */
      try {
        const dt = new DataTransfer();
        dt.items.add(f);
        input.files = dt.files;
      } catch (_) { return; }
      show();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    input.addEventListener("change", show);
  });
}

/* Wire the glow to everything that could change what's still missing. */
function wireNext(r){
  const link = el("stepLink");
  if (link) link.addEventListener("click", () => { markOpened(r.key); setTimeout(() => paintNext(r), 60); });
  (r.fields || []).forEach((f) => {
    const n = el("f_" + f.name);
    if (!n) return;
    n.addEventListener("input", () => paintNext(r));
    n.addEventListener("change", () => paintNext(r));
  });
  const df = el("docInput");
  if (df) df.addEventListener("change", () => paintNext(r));
  wireDrops(() => paintNext(r));
  paintNext(r);
}

/* ---------------- router ---------------- */
function route() {
  const p = S.profile;
  /* The scenery belongs to the two screens that greet somebody -- their
     registration and their welcome. Past those, the work gets a plain
     ground. Decided here, in one place, so no view can leave it on. */
  const greeting = !S.profileError && (!p || !p.registered || !p.welcome_completed
    || (location.hash || "").indexOf("#/welcome") === 0);
  setScene(greeting);
  setStepBar("");            // renderStep puts it back; every other view runs without it
  setHostNote();

  // Couldn't reach the profile at all -- say so and offer a retry. Never
  // fall through to registration on an error; see load().
  if (S.profileError) return renderLoadError();
  if (!p || !p.registered) return renderRegistration();
  if (!p.designated_state) {
    const path = F.determinePathway(p);
    if (path.needQuestion) return renderPathwayQuestion(path);
    if (path.confidence === "low" || path.exception) return renderReview(path);
    return persistPathway(path).then(route);
  }
  if (!p.welcome_completed) return renderWelcome();
  const h = (location.hash || "#/dashboard").replace("#/", "");
  const [base, arg] = h.split("/");
  if (base === "welcome") { renderWelcome(); return shell(); }
  if (base === "step") { renderStep(arg); return shell(); }
  renderDashboard(); return shell();
}
function goto(hash){ if (location.hash === hash) route(); else location.hash = hash; }

/* ------------------------------------------------------------
   PAGE SHELL
   The journey and step views are a single narrow column, which on a
   desktop monitor leaves most of the screen empty and reads as a phone
   layout that failed to load. On wide screens we move that column into a
   grid alongside a standing rail carrying the agent's own record -- the
   same material as the drawer, which stays as the small-screen route to
   it. Wrapping happens here rather than inside each render function so
   the views keep emitting one block of markup and nothing has to be kept
   in sync; moving the nodes preserves the handlers already bound to them.
   ------------------------------------------------------------ */
function shell(){
  const first = root.firstElementChild;
  if (!first || first.classList.contains("pg")) return;
  if (!first.classList.contains("wt") && !first.classList.contains("dash")) return;
  if (!S.profile || !S.journey) return;

  const pg   = document.createElement("div"); pg.className = "pg";
  const main = document.createElement("div"); main.className = "pg-main";
  const rail = document.createElement("aside"); rail.className = "pg-rail";
  rail.setAttribute("aria-label", "Your record");

  root.insertBefore(pg, first);
  main.appendChild(first);
  pg.appendChild(main);
  rail.innerHTML = railHTML();
  pg.appendChild(rail);
  wireCopy(rail);
  const t = rail.querySelector("#railTips");
  if (t) t.onclick = () => { const b = el("lfOpen"); if (b) b.click(); };
}

/* ============================================================
   REGISTRATION (with military branch) — unchanged behavior
   ============================================================ */
function stateOptions(sel){ return `<option value="">Select…</option>` + STATE_LIST.map(s=>`<option value="${s.code}" ${s.code===sel?"selected":""}>${esc(s.name)}</option>`).join(""); }
/* Shown when the profile lookup itself failed. Deliberately offers a retry
   and nothing else -- no form an existing agent could fill in and clobber
   their own record with. */
function renderLoadError() {
  root.innerHTML = `
    <div class="card pad" style="max-width:520px;margin:40px auto">
      <h2 style="margin-top:0">We couldn't load your account</h2>
      <p class="muted">Your progress is safe — we just couldn't reach it right now.
        This is usually a dropped connection.</p>
      <div class="alert show alert-error" style="margin-top:4px">${esc(S.profileError?.message || "Connection problem.")}</div>
      <button class="btn btn-primary" id="retryLoad" style="margin-top:6px">Try again</button>
      <p class="hint" style="margin-top:14px">Still stuck? Email
        <a href="mailto:${esc((window.LF_CONFIG||{}).SUPPORT_EMAIL || "support@lifelicenseflow.com")}">support</a>.</p>
    </div>`;
  const b = el("retryLoad");
  if (b) b.onclick = async () => { b.disabled = true; b.textContent = "Retrying…"; await load(); };
}

function renderRegistration() {
  const a = S.profile?.answers || {};
  root.innerHTML = `
  <div class="reg-wrap">
    <h1 style="font-size:1.9rem">Agent registration</h1>
    <p class="muted" style="margin-top:-2px">A few details so we can tailor your licensing steps. Takes about a minute.</p>
    <div class="card pad" style="margin-top:18px">
      <div class="row2">
        <div><label for="first">First name</label><input id="first" value="${esc(a.first_name||"")}"/></div>
        <div><label for="last">Last name</label><input id="last" value="${esc(a.last_name||"")}"/></div>
      </div>
      <label for="dob">Date of birth</label><input id="dob" type="date" value="${esc(a.dob||"")}"/>
      <label for="resident">Resident state (match your ID)</label>
      <select id="resident">${stateOptions(S.profile?.state)}</select>
      <label>Are you currently active-duty military?</label>
      <div class="seg" id="mil"><button type="button" data-v="No" class="on">No</button><button type="button" data-v="Yes">Yes, I'm active-duty military</button></div>
      <div id="milFields" style="display:none">
        <div class="callout" style="margin:14px 0 4px"><span class="lab">Military licensing details</span>Your duty station, legal residence, and licensing state are kept separate.</div>
        <div class="row2">
          <div><label for="duty">Current duty station (state)</label><select id="duty">${stateOptions("")}</select></div>
          <div><label for="domicile">Legal residence / domicile</label><select id="domicile">${stateOptions("")}</select></div>
        </div>
        <label for="intended">Intended licensing state</label>
        <select id="intended"><option value="">Not sure yet</option>${STATE_LIST.map(s=>`<option value="${s.code}">${esc(s.name)}</option>`).join("")}</select>
        <div class="row2">
          <div><label for="exlic">Existing insurance license (if any)</label><input id="exlic" placeholder="Optional"/></div>
          <div><label for="exnpn">Existing NPN (if any)</label><input id="exnpn" placeholder="Optional"/></div>
        </div>
      </div>
      <label>Lines of authority</label>
      <div class="seg" id="loa"><button type="button" data-v="Life &amp; Health" class="on">Life &amp; Health</button><button type="button" data-v="Life">Life</button></div>
      <label for="trainer">Who is your agency representative / trainer?</label>
      <input id="trainer" value="${esc(a.trainer||"")}"/>
      <div id="regAlert" class="alert"></div>
      <span class="cta-wrap" style="margin-top:20px"><button class="btn btn-primary btn-lg btn-block" id="regGo">Continue</button></span>
    </div>
  </div>`;
  segInit("mil","No"); segInit("loa", S.profile?.license_type || "Life & Health");
  const milBox = el("milFields");
  el("mil").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { milBox.style.display = (segVal("mil")==="Yes") ? "block" : "none"; }));
  el("regGo").onclick = submitReg;
}
function segInit(id, val){ const box=el(id); box.querySelectorAll("button").forEach(b=>{ b.classList.toggle("on", b.dataset.v===val); b.addEventListener("click",()=>{ box.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); }); }); }
function segVal(id){ const b=el(id).querySelector("button.on"); return b?b.dataset.v:null; }

/* The PIN, asked for a second time and in place, when whatever we were
   holding has gone. It appears on the registration form itself rather
   than sending anyone back to a sign-in page they've already passed. */
function askForPin(agencyId) {
  const A = el("regAlert");
  A.className = "alert show alert-error";
  const go = el("regGo");
  if (el("regPinWrap")) {
    A.textContent = "That PIN isn't right for this agency. Check it with your trainer.";
    const f = el("regPin"); f.focus(); f.select();
    return;
  }
  A.textContent = "One last thing before we can add you to your agency.";
  const wrap = document.createElement("div");
  wrap.id = "regPinWrap";
  wrap.style.marginTop = "14px";
  wrap.innerHTML =
    '<label for="regPin">Registration PIN</label>' +
    '<input id="regPin" type="text" autocomplete="off" spellcheck="false" ' +
    'placeholder="Ask your trainer for this"/>' +
    '<p class="hint" style="margin:6px 0 0">The same PIN your trainer gave you when you ' +
    'registered &mdash; it\'s one PIN for the whole agency.</p>';
  /* The button now sits inside its own halo wrapper, so the field goes
     above that wrapper rather than inside it. */
  const anchor = go.closest(".cta-wrap") || go;
  anchor.parentNode.insertBefore(wrap, anchor);
  const input = el("regPin");
  input.focus();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); go.click(); }
  });
}

async function submitReg() {
  const first=el("first").value.trim(), last=el("last").value.trim(), dob=el("dob").value;
  const resident=el("resident").value, trainer=el("trainer").value.trim();
  const military = segVal("mil")==="Yes", loa = segVal("loa")||"Life & Health";
  const A=el("regAlert");
  if(!first||!last||!resident||!dob){ A.className="alert show alert-error"; A.textContent="Please fill in your name, date of birth, and resident state."; return; }
  const payload = { user_id:S.user.id, full_name:`${first} ${last}`, state:resident, current_state:resident,
    license_type:loa, answers:{first_name:first,last_name:last,dob,trainer}, military,
    registered:true, registered_at:new Date().toISOString(), updated_at:new Date().toISOString() };
  if (military) {
    payload.duty_station=el("duty").value||null; payload.domicile_state=el("domicile").value||null;
    payload.intended_state=el("intended").value||null; payload.existing_license=el("exlic").value.trim()||null; payload.existing_npn=el("exnpn").value.trim()||null;
  }
  el("regGo").disabled=true; el("regGo").textContent="Please wait…";

  /* Registering on an agency's own portal joins that agency. The key is
     checked here only so the recruit gets a sentence they can act on --
     the database checks it again on the insert and is the thing that
     actually decides, so a page with this bypassed still can't get in. */
  const agencyId = S.tenant?.agency?.id || null;
  if (agencyId && !S.profile?.agency_id) {
    if (S.tenant.agency.needs_key) {
      const typed = el("regPin") ? el("regPin").value.trim() : "";
      const key = typed || joinKey();
      let ok = false;
      if (key) {
        const r = await supabase.rpc("lf_join_key_ok", { p_agency: agencyId, p_key: key });
        ok = !!r.data;
      }
      if (ok && typed) setJoinKey(typed);
      if (!ok) {
        /* Don't dead-end them. Someone who confirmed their email on a
           different device arrives here with nothing held, through no
           fault of their own -- so ask for the PIN again rather than
           telling them to go and find a link. */
        el("regGo").disabled=false; el("regGo").textContent="Continue";
        askForPin(agencyId);
        return;
      }
    }
    payload.agency_id = agencyId;
    payload.join_key  = joinKey();
  }

  const path = F.determinePathway(payload);
  payload.pathway_confidence = path.confidence;
  if (path.designated) payload.designated_state = path.designated;
  await supabase.from("licensing_profiles").upsert(payload);
  await supabase.from("profiles").upsert({ id:S.user.id, email:S.user.email, full_name:payload.full_name, state:resident, license_type:loa });
  await audit("registration", null, "complete", { military, confidence:path.confidence, designated:path.designated||null });
  if (path.exception) await createException(military?"ambiguous_military_pathway":"missing_data", path.exception, path.confidence);
  forgetJoinKey();
  delete payload.join_key;
  S.profile = { ...payload };
  el("who").textContent = payload.full_name;
  if (S.profile.designated_state) S.journey = F.buildJourney(S.profile.designated_state);
  route();
}
async function persistPathway(path){
  await supabase.from("licensing_profiles").update({ designated_state:path.designated, pathway_confidence:path.confidence, updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
  S.profile.designated_state=path.designated; S.profile.pathway_confidence=path.confidence; S.journey=F.buildJourney(path.designated);
}
async function createException(type, detail, confidence){ await supabase.from("exceptions").insert({ user_id:S.user.id, type, detail, confidence, status:"open" }); }

function renderPathwayQuestion(path){
  const duty=path.options.duty, dom=path.options.dom;
  root.innerHTML = `
  <div class="reg-wrap">
    <span class="conf conf-medium">One quick question</span>
    <h1 style="font-size:1.7rem;margin-top:10px">Which state will you license in?</h1>
    <p class="muted">Your duty station and legal residence are different states. Which state do you intend to pursue your insurance license in?</p>
    <div class="card pad" style="margin-top:8px">
      <button class="opt-lg" data-code="${duty}">My duty-station state — <strong>${esc(stateName(duty))}</strong></button>
      <button class="opt-lg" data-code="${dom}">My legal-residence state — <strong>${esc(stateName(dom))}</strong></button>
      <button class="opt-lg" data-code="">I'm not sure</button>
    </div>
  </div>`;
  root.querySelectorAll(".opt-lg").forEach(b => b.onclick = async () => {
    const code=b.dataset.code;
    if (code && STATES[code]) {
      await supabase.from("licensing_profiles").update({ intended_state:code, designated_state:code, pathway_confidence:"high", updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
      await audit("pathway_resolved","medium","high",{ designated:code });
      S.profile.intended_state=code; S.profile.designated_state=code; S.profile.pathway_confidence="high"; S.journey=F.buildJourney(code); route();
    } else {
      await supabase.from("licensing_profiles").update({ pathway_confidence:"low", updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
      await createException("ambiguous_military_pathway","Agent unsure which state to license in (duty vs domicile).","low");
      S.profile.pathway_confidence="low"; route();
    }
  });
}
function renderReview(path){
  root.innerHTML = `
  <div class="reg-wrap">
    <span class="conf conf-low">Under review</span>
    <h1 style="font-size:1.7rem;margin-top:10px">We're reviewing your licensing pathway</h1>
    <p class="muted">${esc(path?.exception || "Your information needs a quick human review before we can build your exact licensing journey.")}</p>
    <div class="card pad"><p style="margin:0">A member of the team will confirm the right licensing state for your situation. You don't need to do anything right now — we'll open your journey as soon as it's confirmed.</p></div>
  </div>`;
}

/* ============================================================
   WELCOME
   ============================================================ */
const EXPECT = [
  ["01","Study material","Buy your state-approved pre-licensing course."],
  ["02","Exam","Schedule your state exam \u2014 you can book it as soon as the course is bought."],
  ["03","Application","Submit your license application."],
  ["04","License","Record your license number and NPN."],
  ["05","Continuing education","Add your continuing-education certificates."],
  ["06","E&O","Upload your Errors & Omissions certificate."],
];
/* ------------------------------------------------------------
   The agency's own scenery, behind the top of the portal.

   Drawn rather than photographed: it paints with the page, costs no
   request, never pixelates, and takes its colours from the agency's
   theme -- so it is the agency's dawn, not a stock one. It appears only
   where an agency has asked for it in their theme row, which is why
   LicenseFlow's own domain and an unthemed agency stay plain.

   It is pinned to the window rather than to the column so it spans the
   whole width, and it fades into the page ground well above the first
   card, so nothing is ever read across a picture.
------------------------------------------------------------ */
function sceneMarkup() {
  return `
  <div id="lfScene" aria-hidden="true">
    <svg viewBox="0 0 1400 420" preserveAspectRatio="xMidYMax slice" focusable="false">
      <defs>
        <linearGradient id="lfSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"   style="stop-color:#DCE7F5;stop-color:color-mix(in srgb,var(--brand) 13%,#fff)"/>
          <stop offset=".58" style="stop-color:#F0E6D2;stop-color:color-mix(in srgb,var(--agency-gold,var(--brand)) 26%,#fff)"/>
          <stop offset="1"   style="stop-color:#F2F5F9"/>
        </linearGradient>
        <radialGradient id="lfSun" cx=".68" cy=".80" r=".44">
          <stop offset="0" style="stop-color:#F4D9A0;stop-color:color-mix(in srgb,var(--agency-gold,#E7C66B) 46%,#fff)" stop-opacity=".9"/>
          <stop offset="1" style="stop-color:#F4D9A0;stop-color:color-mix(in srgb,var(--agency-gold,#E7C66B) 46%,#fff)" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="lfFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:#93A9C6;stop-color:color-mix(in srgb,var(--brand) 42%,#fff)"/>
          <stop offset="1" style="stop-color:#C3D0E0;stop-color:color-mix(in srgb,var(--brand) 18%,#fff)"/>
        </linearGradient>
        <linearGradient id="lfNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:#7E96B8;stop-color:color-mix(in srgb,var(--brand) 54%,#fff)"/>
          <stop offset="1" style="stop-color:#AEBFD4;stop-color:color-mix(in srgb,var(--brand) 26%,#fff)"/>
        </linearGradient>
        <linearGradient id="lfFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F2F5F9" stop-opacity="0"/>
          <stop offset=".58" stop-color="#F2F5F9" stop-opacity=".5"/>
          <stop offset="1" stop-color="#F2F5F9" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="1400" height="420" fill="url(#lfSky)"/>
      <ellipse cx="996" cy="322" rx="520" ry="226" fill="url(#lfSun)"/>
      <path fill="url(#lfFar)" opacity=".52" d="M0,284 C150,275 234,258 324,248
        C412,238 468,206 542,200 C632,193 688,220 762,208 C848,194 908,138 974,136
        C1030,134 1082,194 1164,212 C1252,231 1334,222 1400,214 L1400,420 L0,420 Z"/>
      <path fill="url(#lfNear)" opacity=".46" d="M0,342 C112,324 236,340 364,318
        C492,296 578,322 696,310 C826,297 918,322 1046,310 C1164,299 1298,320 1400,304
        L1400,420 L0,420 Z"/>
      <rect width="1400" height="420" fill="url(#lfFade)"/>
    </svg>
  </div>`;
}

/* Put it on the page once, and only leave it showing on the two screens
   it belongs to. Everything else in the app keeps its plain ground. */
function setScene(on) {
  const wanted = !!on && (S.tenant?.agency?.theme || {}).scene === "sunrise";
  const root = document.documentElement;
  if (wanted && !el("lfScene")) document.body.insertAdjacentHTML("afterbegin", sceneMarkup());
  root.classList.toggle("scene-on", wanted);
}

function renderWelcome() {
  const p=S.profile, code=p.designated_state;
  const mil = p.military ? `
    <div class="desig">
      <div><span class="desig-k">Duty station</span>${esc(stateName(p.duty_station))||"—"}</div>
      <div><span class="desig-k">Domicile</span>${esc(stateName(p.domicile_state))||"—"}</div>
      <div><span class="desig-k">Licensing state</span><strong>${esc(stateName(code))}</strong></div>
    </div>${confBadge(p.pathway_confidence)}
    ${F.militaryTestingNote(code)?`<div class="callout" style="margin-top:14px"><span class="lab">Military testing option</span>${esc(F.militaryTestingNote(code))}</div>`:""}` : "";

  /* What the agent themselves told us, read back on the first screen.
     A wrong state or a misheard name is cheapest to catch here, before
     any of it has been carried into an application -- and a recruit who
     can see their own record believes the rest of the page more. */
  /* The masthead already says whose portal this is, so the strip stays
     to what the agent told us about themselves. */
  const facts = `
    <div class="desig">
      <div><span class="desig-k">Name</span><strong>${esc(p.full_name || "—")}</strong></div>
      <div><span class="desig-k">Licensing state</span><strong>${esc(stateName(code)) || "—"}</strong></div>
      <div><span class="desig-k">Lines of authority</span>${esc(p.license_type || "—")}</div>
      ${p.answers?.trainer ? `<div><span class="desig-k">Your trainer</span>${esc(p.answers.trainer)}</div>` : ""}
    </div>
    <p class="hint" style="margin:9px 0 20px">Something not right? Tell your licensing coordinator
      before you start &mdash; these details follow you onto your state application.</p>`;
  root.innerHTML = `
  <div class="welcome">
    <div class="welcome-hero">
      <div class="eyebrow2">Welcome to the team</div>
      <h1>Welcome to the team, ${esc(firstName())}.</h1>
      <p class="lead">We're glad you're here. Your licensing journey has been prepared for your <strong>${esc(stateName(code))} ${esc(p.license_type)} license</strong>.</p>
      ${mil || facts}
      <p class="muted" style="max-width:60ch">We'll guide you through the steps required to become properly licensed. The state regulator ultimately decides whether a license is issued — our job is to get your file properly prepared at every stage.</p>
    </div>
    <div class="card pad" style="margin-bottom:18px">
      <h3 style="margin-top:0">What to expect</h3>
      <div class="expect">${EXPECT.map(e=>`<div class="ex"><div class="ex-n">${e[0]}</div><div><div class="ex-t">${esc(e[1])}</div><div class="ex-d">${esc(e[2])}</div></div></div>`).join("")}</div>
    </div>
    <div class="card pad" style="margin-bottom:18px">
      <h3 style="margin-top:0">Why we follow the process</h3>
      <p class="muted" style="margin-bottom:0">Following the steps in order helps make sure your file is properly prepared before it moves to the next stage — which prevents delays and incomplete submissions. Our goal isn't simply to get you through a course; it's to help you become properly licensed, properly documented, and prepared for the next stage of your career.</p>
    </div>
    <div class="card pad launch">
      <div class="eyebrow2">Ready?</div>
      <h2 style="margin:.2rem 0 .4rem">${p.welcome_completed ? "Your licensing journey" : "Let's get your license started."}</h2>
      <p class="muted">${p.welcome_completed ? "You've already started — jump back into your journey anytime." : "We'll take you straight to your first step — no guessing where to go."}</p>
      <span class="cta-wrap"><button class="btn btn-primary btn-lg" id="launch">${p.welcome_completed ? "Back to my journey" : "Launch my licensing journey"}</button></span>
    </div>
  </div>`;
  el("launch").onclick = async () => {
    if (!S.profile.welcome_completed) {
      await supabase.from("licensing_profiles").update({ welcome_completed:true, onboarding_start:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
      await audit("welcome_completed", null, "complete", {});
      S.profile.welcome_completed = true;
      const ns = F.nextStep(S.journey, S.sm);
      if (ns.type === "do") { goto("#/step/"+ns.req.key); return; }
    }
    goto("#/dashboard");
  };
}
function confBadge(c){ if(!c) return ""; const m={high:["conf-high","High confidence — pathway identified"],medium:["conf-medium","Medium confidence"],low:["conf-low","Under review"]}[c]||["conf-high",c]; return `<div style="margin:10px 0"><span class="conf ${m[0]}">${esc(m[1])}</span></div>`; }

/* ============================================================
   DASHBOARD — unified journey, single progress
   ============================================================ */
function statusText(r, st){ return (F.isDone(st) && r.doneLabel) ? r.doneLabel : F.STATUS_LABEL[st]; }
function renderDashboard() {
  if (!S.journey) { root.innerHTML = box("Preparing your journey…"); return; }
  const pr = F.progress(S.journey, S.sm);
  const ns = F.nextStep(S.journey, S.sm);
  const p = S.profile;
  const milSub = p.military ? `<div class="dash-mil"><span>Duty: ${esc(stateName(p.duty_station))||"—"}</span><span>Domicile: ${esc(stateName(p.domicile_state))||"—"}</span><span>Licensing: <strong>${esc(stateName(p.designated_state))}</strong></span></div>` : "";
  root.innerHTML = `
  <div class="dash">
    <div class="dash-head">
      <div>
        <div class="eyebrow2">Your licensing journey</div>
        <h1 style="margin:.1rem 0">${esc(stateName(p.designated_state))} ${esc(p.license_type)} Insurance</h1>
        <div class="muted" style="font-size:.92rem">${esc(firstName())} · ${esc(stateName(p.designated_state))} · ${esc(p.license_type)}</div>
        ${milSub}
      </div>
      <div class="dash-overall"><div class="big">${pr.overall}%</div><div class="muted">complete</div></div>
    </div>
    <div class="progress" style="margin:2px 0 22px"><i style="width:${pr.overall}%"></i></div>
    ${nextCard(ns)}
    <div class="card pad" style="margin-top:20px">
      <h3 style="margin-top:0">Your steps</h3>
      <div class="jlist">
        ${S.journey.reqs.map(r => {
          const st = F.reqStatus(r.key, S.sm); const g = F.gate(r, S.sm); const locked = g.blocked && !F.isDone(st);
          const isNext = ns.type === "do" && ns.req && ns.req.key === r.key;
          const rail = F.isDone(st) ? " is-done" : (isNext ? " is-now" : "");
          return `<button class="jrow2 ${locked?"locked":""}${rail}" data-key="${r.key}">
            <span class="jmk ${F.STATUS_CLASS[st]}">${F.isDone(st)?"&#10003;":(locked?"&#8226;":"")}</span>
            <span class="jname">${esc(r.short)}</span>
            <span class="badge ${F.STATUS_CLASS[st]}">${esc(statusText(r, st))}</span>
          </button>`;
        }).join("")}
      </div>
    </div>
  </div>`;
  root.querySelectorAll(".jrow2[data-key]").forEach(b => b.onclick = () => goto("#/step/"+b.dataset.key));
  const dn = el("doNext"); if (dn) dn.onclick = () => goto("#/step/"+dn.dataset.key);
}
/* What the agent should have to hand before starting a step. Derived from the
   requirement's own required fields and document, so it can never drift from
   what the step actually asks for. */
function needsFor(r){
  const out = [];
  // Don't case-fold the label -- it turns "E&O certificate" into "e&o certificate".
  if (r.doc && r.doc.required) out.push(`Your ${r.doc.label} as a PDF or photo`);
  (r.fields || []).filter(f => f.required).forEach(f => out.push(f.label));
  return out;
}

function nextCard(ns){
  if (ns.type === "waiting") return `<div class="next waiting"><div class="nx-top"><div class="k">Current status</div></div><h2>You're all set for now</h2><p>There are no actions required from you right now — your ${esc(ns.req.short)} is with the team for review. We'll surface your next step here as soon as it changes.</p></div>`;
  if (ns.type === "done") return `<div class="next done"><div class="nx-top"><div class="k">Complete</div></div><h2>Your licensing journey is complete</h2><p>You've completed every step in your configured licensing journey.</p></div>`;

  const r = ns.req;
  const rej = ns.status === "rejected" || ns.status === "action_required";
  const all = S.journey ? S.journey.reqs : [];
  const idx = all.findIndex(x => x.key === r.key);
  const pos = idx >= 0 ? idx + 1 : null;
  const needs = needsFor(r);

  return `<div class="next">
    ${pos ? `<span class="ghost">${pos}</span>` : ""}
    <div class="nx-top">
      <div class="k">${rej ? "Needs your attention" : "Your next step"}</div>
      ${pos ? `<span class="nx-count">Step ${pos} of ${all.length}</span>` : ""}
    </div>
    <h2>${rej ? "Fix: " : ""}${esc(r.label)}</h2>
    <p>${esc(r.lead || r.heading)}</p>
    ${needs.length ? `<div class="need"><div class="t">What you'll need</div><ul>${
      needs.map(n => `<li><i>&#10003;</i><span>${esc(n)}</span></li>`).join("")
    }</ul></div>` : ""}
    <span class="cta-wrap">
      <button class="btn btn-primary" id="doNext" data-key="${r.key}">${
        rej ? "Resolve this" : "Continue"} <span aria-hidden="true">&#8594;</span></button>
    </span>
  </div>`;
}

/* ============================================================
   STEP DETAIL
   ============================================================ */
function openLabel(r, provider){
  if (r.key==="exam") return "Open " + provider;
  const map={ study_material:"Open Xcel Solutions", nipr_application:"Open NIPR", continuing_education:"Open Success CE", eo:"Open 360 Coverage Pros" };
  return map[r.key] || "Open this step";
}
function renderStep(key) {
  const r = S.journey?.reqs.find(x => x.key === key);
  if (!r) { goto("#/dashboard"); return; }
  const st = F.reqStatus(r.key, S.sm);
  const g = F.gate(r, S.sm);
  if (g.blocked && !F.isDone(st)) return renderGate(r, g);

  const idx = stepIndex(r.key), total = S.journey.reqs.length;
  setStepBar(stepBarHTML(r, idx, total));
  const head = `<div class="wt-head"><div class="wt-state">${sysLine()}</div></div>`;

  if (r.render === "exam") return renderExam(r, st, head);
  if (r.render === "ce") return renderCE(r, st, head);

  const meta = S.sm[r.key]?.meta || {};
  const doc = docFor(r.key);
  root.innerHTML = `
  <div class="wt">${head}
    <div class="step-card"><div class="step-body">
      <div class="step-top"><span></span><span class="badge ${F.STATUS_CLASS[st]}">${esc(statusText(r,st))}</span></div>
      <h2 style="margin-top:.4rem">${esc(r.heading)}</h2>
      <p class="step-desc">${esc(r.lead||"")}</p>
      ${st==="rejected"||st==="action_required" ? `<div class="callout callout-warn"><span class="lab">Action required</span>${esc(meta._reject || "This was sent back for correction. Please review and resubmit.")}</div>` : ""}
      ${r.help ? `<div class="callout"><span class="lab">${esc(r.help.title)}</span>${esc(r.help.body)}</div>` : ""}
      ${videoBlock(r.key, r.help?r.help.title:"Watch")}
      ${r.render==="action" && r.providerLabel ? `<div class="syscard"><span class="sys-k">Your provider</span><strong>${esc(r.providerLabel)}</strong></div>` : ""}
      ${r.link ? `<div class="link-row"><span class="cta" id="ctaLink"><a class="btn btn-accent btn-lg" id="stepLink" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(openLabel(r,""))}</a></span></div><div class="link-note">Opens in a new tab. When you're done there, come back and record it below.</div>` : ""}
      ${r.lookupUrl ? `<div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(r.lookupUrl)}" target="_blank" rel="noopener">${esc(r.lookupLabel||"Look it up")}</a></div><div class="link-note">Opens the official lookup in a new tab.</div>` : ""}
      ${r.instructions ? `<details class="inst" style="margin-top:16px"><summary>Step-by-step instructions</summary><ol>${r.instructions.map(i=>`<li>${linkify(i)}</li>`).join("")}</ol></details>` : ""}
      <div class="form-block">
        <h3 style="margin:22px 0 6px;font-size:1.02rem">${r.render==="eo"?"Upload your certificate":"Record what you did"}</h3>
        ${(r.fields||[]).map(f => field(f, meta)).join("")}
        ${r.doc && r.doc.label ? docField(r.doc, doc) : ""}
        <div id="stepAlert" class="alert"></div>
        <div class="wt-nav" style="margin-top:18px">
          <a class="btn btn-ghost" href="#/dashboard">Save for later</a>
          <span class="cta" id="ctaGo"><button class="btn btn-primary" id="submitStep">${r.verify==="admin"?"Submit for review":"Save & continue"}</button></span>
        </div>
        <p class="need-line" id="needLine"></p>
        ${r.verify==="admin" ? `<p class="hint" style="margin-top:8px">This is verified by the team before it's marked complete. Entering information here does not mean it's verified.</p>` : ""}
      </div>
    </div></div>
  </div>`;
  const df = el("docInput"); if (df) df.addEventListener("change", () => { const n=df.files[0]?.name; el("docName").textContent = n?`Selected: ${n}`:""; });
  el("submitStep").onclick = () => submitGeneric(r);
  wireNext(r);
}

function field(f, meta) {
  const v = meta[f.name] ?? "";
  /* The wrapper is what carries the glow when this is the answer still
     missing. It is display:block, so nothing about the field moves. */
  const open = `<label for="f_${f.name}">${esc(f.label)}${f.required?" *":""}</label><span class="cta fw" id="w_${f.name}">`;
  if (f.type === "select") return `${open}<select id="f_${f.name}"><option value="">Select…</option>${f.options.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select></span>`;
  return `${open}<input id="f_${f.name}" type="${f.type==="date"?"date":"text"}" value="${esc(v)}"/></span>`;
}
function docField(d, existing){
  return `<label style="margin-top:14px">${esc(d.label)}${d.required?" *":""}</label>
    <div class="drop cta" id="ctaDoc" data-drop="docInput" data-name="docName">
      <input id="docInput" type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"/>
      <b>Drag your ${esc(String(d.label).toLowerCase())} here</b>
      <span class="drop-or">or <button type="button" class="lnk-file" data-pick="docInput">${
        existing ? "choose a replacement" : "choose a file"}</button></span>
      <span id="docName" class="drop-name">${existing?`Uploaded: ${esc(existing.note||"certificate")}`:""}</span>
      <span class="drop-note">PDF or a photo of it. Up to 10&nbsp;MB.</span>
    </div>
    ${existing?`<div class="hint">${existing.meta_detected?`Detected: ${esc(existing.meta_detected)} · `:""}Uploaded ${new Date(existing.updated_at).toLocaleDateString()}</div>`:""}`;
}
function detectType(fn){ const n=(fn||"").toLowerCase(); if(/e&?o|errors|omission/.test(n))return "E&O certificate"; if(/cert|complet|ce/.test(n))return "Certificate"; return null; }

async function uploadFile(file, sub){
  const path = `${S.user.id}/${sub}/${Date.now()}_${file.name}`.replace(/\s+/g,"_");
  const up = await supabase.storage.from("docs").upload(path, file, { upsert:true });
  if (up.error) throw up.error;
  return path;
}

async function submitGeneric(r) {
  const A = el("stepAlert");
  const meta = { ...(S.sm[r.key]?.meta || {}) };
  for (const f of (r.fields||[])) { const node=el("f_"+f.name); if(node) meta[f.name]=node.value; }
  const missing = (r.fields||[]).filter(f => f.required && (meta[f.name]==null||meta[f.name]==="")).map(f=>f.label);
  const df = el("docInput"); const newFile = df && df.files[0];
  const hasDoc = !!docFor(r.key) || !!newFile;
  if (r.doc?.required && !hasDoc) missing.push(r.doc.label);
  if (r.key==="npn" && meta.npn && !/^\d{5,10}$/.test(String(meta.npn).trim())) missing.push("a valid NPN (5–10 digits)");
  if (missing.length) { A.className="alert show alert-error"; A.textContent="Please provide: "+missing.join(", ")+"."; return; }
  el("submitStep").disabled=true; el("submitStep").textContent="Saving…";
  try {
    if (newFile) {
      const path = await uploadFile(newFile, r.key);
      const detected = detectType(newFile.name);
      await supabase.from("documents").upsert({ user_id:S.user.id, doc_key:r.key, label:r.doc.label, status:"uploaded", note:newFile.name, file_url:path, meta_detected:detected, updated_at:new Date().toISOString() }, { onConflict:"user_id,doc_key" });
    }
    const before = F.reqStatus(r.key, S.sm);
    const status = F.submissionStatus(r, meta, hasDoc);
    const clean = { ...meta }; delete clean._reject;
    await supabase.from("requirement_instances").upsert({ user_id:S.user.id, requirement_key:r.key, label:r.label, status, meta:clean, completed_at:F.isDone(status)?new Date().toISOString():null, updated_at:new Date().toISOString() }, { onConflict:"user_id,requirement_key" });
    await audit(`requirement:${r.key}`, before, status, { method:r.verify==="admin"?"submitted_for_review":"self_validated" });
    await load();
    const ns = F.nextStep(S.journey, S.sm);
    if (status===F.ST.PENDING) { goto("#/dashboard"); return; }
    if (ns.type==="do" && ns.req.key!==r.key) goto("#/step/"+ns.req.key); else goto("#/dashboard");
  } catch (e) { A.className="alert show alert-error"; A.textContent="Something went wrong: "+(e.message||e); el("submitStep").disabled=false; el("submitStep").textContent=r.verify==="admin"?"Submit for review":"Save & continue"; }
}

/* ---------------- EXAM (guided action page) ---------------- */
function renderExam(r, st, head) {
  const info = F.examInfo(S.profile.designated_state, S.profile.license_type);
  const meta = S.sm[r.key]?.meta || {};
  const scheduled = F.isDone(st);
  root.innerHTML = `
  <div class="wt">${head}
    <div class="step-card"><div class="step-body">
      <div class="step-top"><span></span><span class="badge ${scheduled?"s-green":"s-gray"}">${scheduled?"Scheduled":"Not scheduled"}</span></div>
      <h2 style="margin-top:.4rem">Schedule your exam</h2>
      <p class="step-desc">${esc(info.examTitle)}. We've prepared the correct examination information for you. You can book this as soon as you've bought your course \u2014 you don't need to have finished studying.</p>

      ${videoBlock("exam","Watch before you schedule") || `<div class="section-k center-k">Watch before you schedule</div><div class="video">${videoEmbed(null)}</div><p class="link-note" style="margin-top:-12px">Learn how to schedule your licensing examination.</p>`}

      <div class="section-k" style="margin-top:22px">Your examination platform</div>
      <div class="syscard"><span class="sys-k">Scheduled through</span><strong>${esc(info.providerLabel)}</strong></div>
      <div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(info.url)}" target="_blank" rel="noopener">Open ${esc(info.providerLabel)}</a></div>
      <div class="link-note">This opens the official scheduling platform in a new tab.</div>
      ${r.instructions ? `<details class="inst" style="margin-top:16px"><summary>Step-by-step instructions</summary><ol>${r.instructions.map(i=>`<li>${linkify(i)}</li>`).join("")}</ol></details>` : ""}

      <div class="form-block">
        <div class="section-k" style="margin-top:22px">After you schedule</div>
        <p class="hint" style="margin-top:2px">Enter the date of your scheduled examination below.</p>
        <label for="f_exam_date">Exam date *</label>
        <input id="f_exam_date" type="date" value="${esc(meta.exam_date||"")}"/>
        <div id="stepAlert" class="alert"></div>
        <div class="wt-nav" style="margin-top:18px">
          <a class="btn btn-ghost" href="#/dashboard">Save for later</a>
          <button class="btn btn-primary" id="submitStep">Save &amp; continue</button>
        </div>
      </div>
    </div></div>
  </div>`;
  el("submitStep").onclick = async () => {
    const A=el("stepAlert"); const d=el("f_exam_date").value;
    if(!d){ A.className="alert show alert-error"; A.textContent="Please enter your exam date."; return; }
    el("submitStep").disabled=true; el("submitStep").textContent="Saving…";
    const before=F.reqStatus(r.key,S.sm);
    await supabase.from("requirement_instances").upsert({ user_id:S.user.id, requirement_key:r.key, label:r.label, status:F.ST.COMPLETE, meta:{ exam_date:d, provider:info.providerLabel, exam_type:S.profile.license_type }, completed_at:new Date().toISOString(), updated_at:new Date().toISOString() }, { onConflict:"user_id,requirement_key" });
    await audit("requirement:exam", before, "scheduled", { exam_date:d });
    await load();
    const ns=F.nextStep(S.journey,S.sm);
    if (ns.type==="do" && ns.req.key!==r.key) goto("#/step/"+ns.req.key); else goto("#/dashboard");
  };
}

/* ---------------- CONTINUING EDUCATION (multiple certificates) ---------------- */
function renderCE(r, st, head) {
  const meta = S.sm[r.key]?.meta || {};
  const certs = meta.certs || [];
  if (!ceRows.length) ceRows = [{ purchase_date:"", file:null }];
  const badge = (s)=>`<span class="badge ${F.STATUS_CLASS[s]||"s-blue"}">${esc(F.STATUS_LABEL[s]||"Uploaded")}</span>`;
  root.innerHTML = `
  <div class="wt">${head}
    <div class="step-card"><div class="step-body">
      <div class="step-top"><span></span><span class="badge ${F.STATUS_CLASS[st]}">${esc(F.STATUS_LABEL[st])}</span></div>
      <h2 style="margin-top:.4rem">Continuing education</h2>
      <p class="step-desc">${esc(r.lead)}</p>
      ${st==="action_required"||st==="rejected" ? `<div class="callout callout-warn"><span class="lab">Action required</span>${esc(meta._reject||"One certificate needs attention. Replace the flagged certificate below.")}</div>` : ""}
      ${videoBlock("continuing_education","How to complete your continuing education")}
      ${r.link ? `<div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(r.link)}" target="_blank" rel="noopener">Open Success CE</a></div><div class="link-note">Review your state's continuing-education requirements.</div>` : ""}

      ${(() => {
        const missing = ceMissing(certs);
        if (!missing.length) return "";
        return `<div class="callout callout-warn"><span class="lab">Needed before you can be contracted</span>
          ${missing.map(m => esc(m.label)).join(", ")}. Carriers will not appoint an agent whose
          file is missing these, whatever else is complete.</div>`;
      })()}

      ${certs.length ? `<div class="section-k" style="margin-top:22px">Your certificates</div>
        <div class="ce-list">${certs.map((c,i)=>`
          <div class="ce-item">
            <div class="ce-row"><strong>${esc(ceLabel(c.type) || ("Certificate " + (i+1)))}</strong>${badge(c.status)}</div>
            <div class="hint">Purchase date: ${esc(c.purchase_date||"—")} · ${esc(c.filename||"file")}</div>
            ${!c.type ? `<label for="ret_${i}" style="margin-top:8px">What is this certificate?</label>
              <select id="ret_${i}" class="ce-retype" data-idx="${i}">
                <option value="">Choose…</option>${ceSlotList().map(o=>`<option value="${esc(o.key)}">${esc(o.label)}</option>`).join("")}
              </select>` : ""}
            <label class="btn btn-ghost btn-sm" for="rep_${i}" style="margin-top:8px">Replace certificate</label>
            <input id="rep_${i}" type="file" data-idx="${i}" class="ce-replace" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"/>
            <span class="hint" id="repn_${i}"></span>
          </div>`).join("")}</div>` : ""}

      <div class="section-k" style="margin-top:22px">Add certificate</div>
      <div id="ceNew"></div>
      <button class="btn btn-ghost btn-sm" id="addCert" style="margin-top:6px">+ Add another certificate</button>

      <div id="stepAlert" class="alert"></div>
      <div class="wt-nav" style="margin-top:18px">
        <a class="btn btn-ghost" href="#/dashboard">Save for later</a>
        <button class="btn btn-primary" id="submitStep">Save certificates</button>
      </div>
      <p class="hint" style="margin-top:8px">Certificates are verified by the team before this step is marked complete.</p>
    </div></div>
  </div>`;
  drawCeRows();
  el("addCert").onclick = () => { ceRows.push({ purchase_date:"", file:null }); drawCeRows(); };
  root.querySelectorAll(".ce-replace").forEach(inp => inp.addEventListener("change", () => { el("repn_"+inp.dataset.idx).textContent = inp.files[0]?`Selected: ${inp.files[0].name}`:""; }));
  el("submitStep").onclick = () => submitCE(r);
}
function drawCeRows() {
  /* The agent says what each certificate is. Guessing from the file name
     filed "AML and Ethics.pdf" under one heading and gave up entirely on
     "scan_002.pdf" -- and a certificate in the wrong slot reads as a
     missing certificate to whoever is contracting them. */
  const opts = (sel) => ceSlotList().map(o =>
    `<option value="${esc(o.key)}"${o.key===sel?" selected":""}>${esc(o.label)}</option>`).join("");
  el("ceNew").innerHTML = ceRows.map((row,i)=>`
    <div class="ce-item">
      <label for="cet_${i}">What is this certificate?</label>
      <select id="cet_${i}" class="ce-type" data-i="${i}">
        <option value="">Choose…</option>${opts(row.type)}
      </select>
      <div class="row2" style="margin-top:12px">
        <div><label>Purchase date</label><input class="ce-date" data-i="${i}" type="date" value="${esc(row.purchase_date)}"/></div>
        <div><label>Certificate</label>
          <div class="drop drop-sm" data-drop="cef_${i}" data-name="cefn_${i}">
            <input id="cef_${i}" class="ce-file" data-i="${i}" type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"/>
            <b>Drag it here</b>
            <span class="drop-or">or <button type="button" class="lnk-file" data-pick="cef_${i}">choose a file</button></span>
            <span class="drop-name" id="cefn_${i}"></span>
          </div></div>
      </div>
      ${ceRows.length>1?`<button class="btn btn-quiet btn-sm ce-rm" data-i="${i}" style="margin-top:4px">Remove</button>`:""}
    </div>`).join("");
  root.querySelectorAll(".ce-type").forEach(sel=>sel.addEventListener("change",()=>{
    ceRows[Number(sel.dataset.i)].type = sel.value; }));
  root.querySelectorAll(".ce-file").forEach(inp=>inp.addEventListener("change",()=>{ el("cefn_"+inp.dataset.i).textContent = inp.files[0]?`Selected: ${inp.files[0].name}`:""; }));
  wireDrops();
  root.querySelectorAll(".ce-rm").forEach(b=>b.onclick=()=>{ ceRows.splice(Number(b.dataset.i),1); if(!ceRows.length) ceRows=[{purchase_date:"",file:null}]; drawCeRows(); });
}
async function submitCE(r) {
  const A = el("stepAlert");
  const meta = { ...(S.sm[r.key]?.meta || {}) };
  const certs = (meta.certs || []).map(c=>({ ...c }));
  // replacements on existing certs
  for (const inp of root.querySelectorAll(".ce-replace")) {
    const f = inp.files[0]; if (!f) continue; const idx = Number(inp.dataset.idx);
    try { const path = await uploadFile(f, "ce"); certs[idx] = { ...certs[idx], filename:f.name, path, status:"pending_review" }; }
    catch(e){ A.className="alert show alert-error"; A.textContent="Upload failed: "+(e.message||e); return; }
  }
  // new rows
  const dates = root.querySelectorAll(".ce-date"); const files = root.querySelectorAll(".ce-file");
  el("submitStep").disabled=true; el("submitStep").textContent="Saving…";
  try {
    for (let i=0;i<ceRows.length;i++){
      const d = dates[i]?.value || ""; const f = files[i]?.files[0];
      if (!f && !d) continue;
      if (f && !d) { A.className="alert show alert-error"; A.textContent="Please add a purchase date for each certificate."; el("submitStep").disabled=false; el("submitStep").textContent="Save certificates"; return; }
      const t = ceRows[i]?.type || "";
      if (f && !t) { A.className="alert show alert-error"; A.textContent="Please say what each certificate is."; el("submitStep").disabled=false; el("submitStep").textContent="Save certificates"; return; }
      if (f) { const path = await uploadFile(f, "ce"); certs.push({ id:"c"+Date.now()+i, type:t, purchase_date:d, filename:f.name, path, status:"pending_review" }); }
    }
    /* Types put on certificates that were uploaded before there was a
       choice. Saved even when nothing else on the page changed. */
    for (const sel of root.querySelectorAll(".ce-retype")) {
      if (sel.value) certs[Number(sel.dataset.idx)] = { ...certs[Number(sel.dataset.idx)], type: sel.value };
    }
    if (!certs.length) { A.className="alert show alert-error"; A.textContent="Add at least one certificate (purchase date + file)."; el("submitStep").disabled=false; el("submitStep").textContent="Save certificates"; return; }
    /* A file missing its AML certificate is not contractable, however
       many other certificates are in it -- so the step does not go
       forward for review until the required ones are present. Work
       already done is still saved; it just isn't called finished. */
    const missing = ceMissing(certs);
    const allVerified = certs.every(c=>["admin_verified","verified","complete"].includes(c.status));
    const status = missing.length ? F.ST.IN_PROGRESS
                 : (allVerified ? F.ST.COMPLETE : F.ST.PENDING);
    const before = F.reqStatus(r.key, S.sm);
    const clean = { certs }; // drop _reject on resubmit
    await supabase.from("requirement_instances").upsert({ user_id:S.user.id, requirement_key:r.key, label:r.label, status, meta:clean, completed_at:F.isDone(status)?new Date().toISOString():null, updated_at:new Date().toISOString() }, { onConflict:"user_id,requirement_key" });
    await audit("requirement:continuing_education", before, status, { count:certs.length, missing:missing.map(m=>m.key) });
    ceRows = [];
    await load();
    if (missing.length) {
      route();
      const A2 = el("stepAlert");
      if (A2) { A2.className = "alert show alert-ok";
        A2.textContent = "Saved. Still needed before you can be contracted: " +
          missing.map(m=>m.label).join(", ") + "."; }
      return;
    }
    goto("#/dashboard");
  } catch(e){ A.className="alert show alert-error"; A.textContent="Something went wrong: "+(e.message||e); el("submitStep").disabled=false; el("submitStep").textContent="Save certificates"; }
}

/* ---------------- gate ---------------- */
function renderGate(r, g) {
  const names = g.missing.map(k => F.REQ_BY_KEY[k]?.short || k);
  root.innerHTML = `
  <div class="wt"><div class="wt-head"><div class="wt-meta"><span><a href="#/dashboard" style="color:inherit">← Your journey</a></span></div></div>
    <div class="step-card"><div class="step-body">
      <div class="gate-ic">!</div>
      <h2>You're not quite ready for this step</h2>
      <p class="step-desc">Before <strong>${esc(r.label)}</strong>, this needs to be done first:</p>
      <ul class="miss">${names.map(n=>`<li>${esc(n)}</li>`).join("")}</ul>
      <button class="btn btn-primary" id="fix">Go to that step</button>
    </div></div>
  </div>`;
  el("fix").onclick = () => goto("#/step/"+g.missing[0]);
}

/* ---------------- helpers ---------------- */
function box(t){ return `<div class="wt"><div class="card pad">${esc(t)}</div></div>`; }
function videoEmbed(url){
  if(!url) return `<div class="ph"><div class="pi"></div>Video coming soon</div>`;
  let m;
  if((m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/))) return `<iframe src="https://www.youtube.com/embed/${m[1]}" allowfullscreen loading="lazy"></iframe>`;
  if((m=url.match(/vimeo\.com\/(\d+)/))) return `<iframe src="https://player.vimeo.com/video/${m[1]}" allowfullscreen loading="lazy"></iframe>`;
  if(/\.mp4($|\?)/.test(url)) return `<video controls preload="metadata" src="${esc(url)}"></video>`;
  return `<iframe src="${esc(url)}" allowfullscreen loading="lazy"></iframe>`;
}

/* ============================================================
   RESOURCE DRAWER
   Everything here is read from data already loaded for the page --
   no extra queries. Credentials and E&O come off the requirement
   metadata; CE certificates and other files off documents.
   ============================================================ */
const STUDY_TIPS = [
  "<b>Watch the videos.</b> They carry the course &#8212; don't skip ahead to the text.",
  "<b>Focus on vocabulary.</b> Most exam questions turn on knowing the exact term.",
  "<b>Review your notes and the chapter summaries</b> rather than re-reading whole chapters.",
  "<b>Take the practice quizzes and tests over and over.</b> Repetition is what makes it stick.",
];

/* Which certificates this agent needs comes from their licensing state
   now, not from a list hardcoded here -- see states.js. */
function ceSlotList(){ return ceSlots(S.profile?.designated_state); }

/* Legacy certificates were filed by guessing at the file name, which put
   "AML_and_Ethics_2026.pdf" in one slot and shrugged at "cert3.pdf".
   New ones carry the type the agent chose. These patterns are kept only
   to place certificates uploaded before there was a choice. */
const CE_GUESS = {
  aml:           /aml|money.?launder/i,
  ethics:        /ethic/i,
  best_interest: /best.?interest|\bbi\b/i,
};

/* Which of the agent's certificates sits in a given slot: what they said
   it was, or -- for older uploads -- what the file name suggests. */
function certInSlot(certs, slot, claimed){
  let hit = certs.find((c, i) => !claimed.has(i) && c.type === slot.key);
  if (!hit) {
    const pat = CE_GUESS[slot.key];
    if (pat) hit = certs.find((c, i) => !claimed.has(i) && !c.type && pat.test(c.filename || ""));
    else     hit = certs.find((c, i) => !claimed.has(i) && !c.type);
  }
  if (hit) claimed.add(certs.indexOf(hit));
  return hit || null;
}

/* What is still standing between this agent and being contractable. */
function ceLabel(key){
  const slot = ceSlotList().find(o => o.key === key);
  return slot ? slot.label : "";
}

function ceMissing(certs){
  const claimed = new Set();
  return ceSlotList().filter((slot) => slot.required && !certInSlot(certs, slot, claimed));
}

function metaOf(key){
  const i = S.instances.find(x => x.requirement_key === key);
  return (i && i.meta) || {};
}
function isVerified(key){ return F.isDone(F.reqStatus(key, S.sm)); }
function shortDate(v){
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString(undefined,{day:"numeric",month:"short"});
}
function extOf(name){
  const m = /\.([a-z0-9]{2,4})$/i.exec(String(name||""));
  return m ? m[1].toUpperCase().slice(0,3) : "DOC";
}

/* The drawer and the desktop rail both show these rows, so ids are prefixed
   per surface -- two elements answering to "lfLic" would break copy. */
function kvRow(label, value, id, verified){
  if (!value) return "";
  return `<div class="lf-kv"><span class="k">${esc(label)}</span>` +
    (verified ? `<span class="lf-ok">&#10003;</span>` : "") +
    `<span class="v" id="${id}">${esc(value)}</span>` +
    `<button class="lf-copy" type="button" data-copy="${id}">Copy</button></div>`;
}

/* Copy-to-clipboard, bound within one surface only. */
function wireCopy(scope){
  scope.querySelectorAll("[data-copy]").forEach(b => {
    b.onclick = () => {
      const t = el(b.dataset.copy);
      const txt = t ? t.textContent.trim() : "";
      const done = () => { b.textContent = "Copied"; b.classList.add("done");
        setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done"); }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else done();
    };
  });
}

/* Credentials, E&O, CE slots and documents, built once and rendered into
   whichever surface asked for them. `p` prefixes element ids. */
function recordGroups(p){
  const lic = metaOf("license_number").license_number;
  const npn = metaOf("npn").npn;
  const eo  = metaOf("eo");
  const eoDone = S.instances.find(x => x.requirement_key === "eo");

  /* CE certificates come off the CE step's own uploads. A slot with no file
     yet reads "Miscellaneous" until one is added, then takes the file name. */
  const certs = (metaOf("continuing_education").certs) || [];
  const claimed = new Set();
  const ceRows = ceSlotList().map(slot => {
    const hit = certInSlot(certs, slot, claimed);
    const done = !!hit;
    return `<div class="lf-slot${done ? " done" : ""}">
      <span class="lf-mark">${done ? "&#10003;" : ""}</span>
      <span class="lf-sn"><b>${esc(slot.label)}${
        slot.required && !done ? " \u00b7 required" : ""}</b><span>${
        done ? esc(hit.filename || "Uploaded") : "Not uploaded yet"}</span></span>
      ${done && hit.purchase_date ? `<span class="lf-sd">${esc(shortDate(hit.purchase_date))}</span>` : ""}
    </div>`;
  }).join("");

  const otherDocs = (S.docs || []).filter(d => d.doc_key !== "continuing_education");
  const docRows = otherDocs.length
    ? otherDocs.map(d => `<div class="lf-doc"><span class="ic">${esc(extOf(d.file_url || d.label))}</span>` +
        `<span class="dn">${esc(d.label || d.doc_key)}</span>` +
        `<span class="dd">${esc(shortDate(d.updated_at))}</span></div>`).join("")
    : `<div class="lf-doc pending"><span class="ic">&#8212;</span>` +
      `<span class="dn">Nothing uploaded yet</span><span class="dd"></span></div>`;

  const creds = kvRow("License number", lic, p+"Lic", isVerified("license_number")) +
                kvRow("NPN", npn, p+"Npn", isVerified("npn"));

  const eoRows =
    (eo.carrier ? `<div class="lf-kv"><span class="k">Carrier</span><span class="v">${esc(eo.carrier)}</span></div>` : "") +
    kvRow("Policy number", eo.policy_number, p+"Pol", false) +
    (eoDone && eoDone.completed_at
      ? `<div class="lf-kv"><span class="k">Added</span><span class="v">${esc(shortDate(eoDone.completed_at))}</span></div>` : "");

  return (creds ? `<div class="lf-g"><div class="lf-gt">Your credentials</div>${creds}</div>` : "") +
    (eoRows ? `<div class="lf-g"><div class="lf-gt">Errors &amp; Omissions</div>${eoRows}</div>` : "") +
    `<div class="lf-g"><div class="lf-gt">Continuing education</div>${ceRows}</div>` +
    `<div class="lf-g"><div class="lf-gt">Other documents</div>${docRows}</div>`;
}

function tipsGroup(){
  return `<div class="lf-g"><div class="lf-gt">Study tips</div>` +
    STUDY_TIPS.map(t => `<div class="lf-tip"><i></i><p>${t}</p></div>`).join("") + `</div>`;
}

function renderDrawer(){
  const body = el("lfBody");
  if (!body) return;
  body.innerHTML = tipsGroup() + recordGroups("lf");
  wireCopy(body);
}

/* The desktop rail. Same record as the drawer, on a light card, with the
   overall figure at the top so the agent always has their standing in
   view -- and a way through to the study tips, which stay in the drawer. */
function railHTML(){
  const pr = F.progress(S.journey, S.sm);
  const p  = S.profile;
  return `<div class="rail-card">
    <div class="rail-head">
      <div class="rail-pct">${pr.overall}<span>%</span></div>
      <div class="rail-sub"><b>Your record</b><span>${esc(stateName(p.designated_state))} &#183; ${esc(p.license_type)}</span></div>
    </div>
    <div class="progress"><i style="width:${pr.overall}%"></i></div>
    ${recordGroups("rl")}
    <button class="rail-tips" type="button" id="railTips">Study tips <span aria-hidden="true">&#8594;</span></button>
  </div>`;
}

(function wireDrawer(){
  const d = el("lfDrawer"), sc = el("lfScrim"), o = el("lfOpen"), c = el("lfClose");
  if (!d || !o) return;
  let last = null;
  const open = () => { renderDrawer(); last = document.activeElement;
    d.classList.add("on"); sc.classList.add("on"); o.setAttribute("aria-expanded","true"); c.focus(); };
  const close = () => { d.classList.remove("on"); sc.classList.remove("on");
    o.setAttribute("aria-expanded","false"); if (last) last.focus(); };
  o.onclick = open; c.onclick = close; sc.onclick = close;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && d.classList.contains("on")) close(); });
})();
