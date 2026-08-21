import { supabase, isConfigured, requireSession } from "./supabase.js";
import { STATE_LIST, STATES } from "./states.js?v=6";
import * as F from "./flow.js?v=6";

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
  const session = await requireSession(); if (!session) return;
  S.user = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "index.html"; };
  window.addEventListener("hashchange", route);
  supabase.from("admins").select("user_id").eq("user_id", S.user.id).maybeSingle().then(({ data }) => { if (data) { const a = el("adminLink"); if (a) a.style.display = ""; } });
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
    settle(supabase.from("licensing_profiles").select("*").eq("user_id", uid).maybeSingle()),
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
  el("who").textContent = S.profile?.full_name || S.user.email;
  if (S.profile?.designated_state) S.journey = F.buildJourney(S.profile.designated_state);
  route();
}
function firstName(){ return (S.profile?.answers?.first_name) || (S.profile?.full_name||"").split(" ")[0] || "there"; }
function docFor(key){ return S.docs.find(d => d.doc_key === key); }
function sysLine(){ return `Licensing state: <strong>${esc(stateName(S.profile.designated_state))}</strong> &nbsp;·&nbsp; License: <strong>${esc(S.profile.license_type)}</strong>`; }
async function audit(event, before, after, meta={}) { await supabase.from("audit_events").insert({ user_id:S.user.id, event, status_before:before||null, status_after:after||null, source:"agent", meta }); }
function stepIndex(key){ return S.journey ? S.journey.reqs.findIndex(r=>r.key===key) : -1; }
function videoBlock(key, fallbackTitle){
  const v = S.videos?.[key];
  if (!v || !v.active || !v.url) return "";
  return `<div class="section-k">${esc(v.title||fallbackTitle||"Watch")}</div>
    <div class="video">${videoEmbed(v.url)}</div>
    ${v.description?`<p class="link-note" style="margin-top:-12px">${esc(v.description)}</p>`:""}`;
}

/* ---------------- router ---------------- */
function route() {
  const p = S.profile;
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
  if (base === "welcome") return renderWelcome();
  if (base === "step") return renderStep(arg);
  return renderDashboard();
}
function goto(hash){ if (location.hash === hash) route(); else location.hash = hash; }

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
      <button class="btn btn-primary btn-lg btn-block" id="regGo" style="margin-top:20px">Continue</button>
    </div>
  </div>`;
  segInit("mil","No"); segInit("loa", S.profile?.license_type || "Life & Health");
  const milBox = el("milFields");
  el("mil").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { milBox.style.display = (segVal("mil")==="Yes") ? "block" : "none"; }));
  el("regGo").onclick = submitReg;
}
function segInit(id, val){ const box=el(id); box.querySelectorAll("button").forEach(b=>{ b.classList.toggle("on", b.dataset.v===val); b.addEventListener("click",()=>{ box.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); }); }); }
function segVal(id){ const b=el(id).querySelector("button.on"); return b?b.dataset.v:null; }

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
  const path = F.determinePathway(payload);
  payload.pathway_confidence = path.confidence;
  if (path.designated) payload.designated_state = path.designated;
  await supabase.from("licensing_profiles").upsert(payload);
  await supabase.from("profiles").upsert({ id:S.user.id, email:S.user.email, full_name:payload.full_name, state:resident, license_type:loa });
  await audit("registration", null, "complete", { military, confidence:path.confidence, designated:path.designated||null });
  if (path.exception) await createException(military?"ambiguous_military_pathway":"missing_data", path.exception, path.confidence);
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
  ["01","Study material","Purchase and complete your pre-licensing education."],
  ["02","Exam","Schedule and take your state examination."],
  ["03","Application","Submit your license application."],
  ["04","License","Record your license number and NPN."],
  ["05","Continuing education","Add your continuing-education certificates."],
  ["06","E&O","Upload your Errors & Omissions certificate."],
];
function renderWelcome() {
  const p=S.profile, code=p.designated_state;
  const mil = p.military ? `
    <div class="desig">
      <div><span class="desig-k">Duty station</span>${esc(stateName(p.duty_station))||"—"}</div>
      <div><span class="desig-k">Domicile</span>${esc(stateName(p.domicile_state))||"—"}</div>
      <div><span class="desig-k">Licensing state</span><strong>${esc(stateName(code))}</strong></div>
    </div>${confBadge(p.pathway_confidence)}
    ${F.militaryTestingNote(code)?`<div class="callout" style="margin-top:14px"><span class="lab">Military testing option</span>${esc(F.militaryTestingNote(code))}</div>`:""}` : "";
  root.innerHTML = `
  <div class="welcome">
    <div class="welcome-hero">
      <div class="eyebrow2">Welcome to the team</div>
      <h1>Welcome to the team, ${esc(firstName())}.</h1>
      <p class="lead">We're glad you're here. Your licensing journey has been prepared for your <strong>${esc(stateName(code))} ${esc(p.license_type)} license</strong>.</p>
      ${mil}
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
      <button class="btn btn-primary btn-lg" id="launch">${p.welcome_completed ? "Back to my journey" : "Launch my licensing journey"}</button>
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
  const head = `
    <div class="wt-head"><div class="wt-meta"><span><a href="#/dashboard" style="color:inherit">← Your journey</a></span><span>Step ${idx+1} of ${total}</span></div><div class="wt-state">${sysLine()}</div></div>`;

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
      ${r.link ? `<div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(openLabel(r,""))}</a></div><div class="link-note">Opens in a new tab. Complete it, then record the details below.</div>` : ""}
      ${r.lookupUrl ? `<div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(r.lookupUrl)}" target="_blank" rel="noopener">${esc(r.lookupLabel||"Look it up")}</a></div><div class="link-note">Opens the official lookup in a new tab.</div>` : ""}
      ${r.instructions ? `<details class="inst" style="margin-top:16px"><summary>Step-by-step instructions</summary><ol>${r.instructions.map(i=>`<li>${linkify(i)}</li>`).join("")}</ol></details>` : ""}
      <div class="form-block">
        <h3 style="margin:22px 0 6px;font-size:1.02rem">${r.render==="eo"?"Upload your certificate":"Enter your details"}</h3>
        ${(r.fields||[]).map(f => field(f, meta)).join("")}
        ${r.doc && r.doc.label ? docField(r.doc, doc) : ""}
        <div id="stepAlert" class="alert"></div>
        <div class="wt-nav" style="margin-top:18px">
          <a class="btn btn-ghost" href="#/dashboard">Save for later</a>
          <button class="btn btn-primary" id="submitStep">${r.verify==="admin"?"Submit for review":"Save & continue"}</button>
        </div>
        ${r.verify==="admin" ? `<p class="hint" style="margin-top:8px">This is verified by the team before it's marked complete. Entering information here does not mean it's verified.</p>` : ""}
      </div>
    </div></div>
  </div>`;
  const df = el("docInput"); if (df) df.addEventListener("change", () => { const n=df.files[0]?.name; el("docName").textContent = n?`Selected: ${n}`:""; });
  el("submitStep").onclick = () => submitGeneric(r);
}

function field(f, meta) {
  const v = meta[f.name] ?? "";
  if (f.type === "select") return `<label>${esc(f.label)}${f.required?" *":""}</label><select id="f_${f.name}"><option value="">Select…</option>${f.options.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  return `<label>${esc(f.label)}${f.required?" *":""}</label><input id="f_${f.name}" type="${f.type==="date"?"date":"text"}" value="${esc(v)}"/>`;
}
function docField(d, existing){
  return `<label style="margin-top:14px">${esc(d.label)}${d.required?" *":""}</label>
    <div class="upload"><label class="btn btn-ghost btn-sm" for="docInput">${existing?"Replace certificate":"Choose file"}</label>
      <input id="docInput" type="file" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"/>
      <span id="docName" class="hint">${existing?`Uploaded: ${esc(existing.note||"certificate")}`:""}</span></div>
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
      <p class="step-desc">${esc(info.examTitle)}. We've prepared the correct examination information for you.</p>

      ${videoBlock("exam","Watch before you schedule") || `<div class="section-k">Watch before you schedule</div><div class="video">${videoEmbed(null)}</div><p class="link-note" style="margin-top:-12px">Learn how to schedule your licensing examination.</p>`}

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

      ${certs.length ? `<div class="section-k" style="margin-top:22px">Your certificates</div>
        <div class="ce-list">${certs.map((c,i)=>`
          <div class="ce-item">
            <div class="ce-row"><strong>Certificate ${i+1}</strong>${badge(c.status)}</div>
            <div class="hint">Purchase date: ${esc(c.purchase_date||"—")} · ${esc(c.filename||"file")}</div>
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
  el("ceNew").innerHTML = ceRows.map((row,i)=>`
    <div class="ce-item">
      <div class="row2">
        <div><label>Purchase date</label><input class="ce-date" data-i="${i}" type="date" value="${esc(row.purchase_date)}"/></div>
        <div><label>Certificate</label><div class="upload"><label class="btn btn-ghost btn-sm" for="cef_${i}">Choose file</label><input id="cef_${i}" class="ce-file" data-i="${i}" type="file" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"/><span class="hint" id="cefn_${i}"></span></div></div>
      </div>
      ${ceRows.length>1?`<button class="btn btn-quiet btn-sm ce-rm" data-i="${i}" style="margin-top:4px">Remove</button>`:""}
    </div>`).join("");
  root.querySelectorAll(".ce-file").forEach(inp=>inp.addEventListener("change",()=>{ el("cefn_"+inp.dataset.i).textContent = inp.files[0]?`Selected: ${inp.files[0].name}`:""; }));
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
      if (f) { const path = await uploadFile(f, "ce"); certs.push({ id:"c"+Date.now()+i, purchase_date:d, filename:f.name, path, status:"pending_review" }); }
    }
    if (!certs.length) { A.className="alert show alert-error"; A.textContent="Add at least one certificate (purchase date + file)."; el("submitStep").disabled=false; el("submitStep").textContent="Save certificates"; return; }
    const allVerified = certs.every(c=>["admin_verified","verified","complete"].includes(c.status));
    const status = allVerified ? F.ST.COMPLETE : F.ST.PENDING;
    const before = F.reqStatus(r.key, S.sm);
    const clean = { certs }; // drop _reject on resubmit
    await supabase.from("requirement_instances").upsert({ user_id:S.user.id, requirement_key:r.key, label:r.label, status, meta:clean, completed_at:F.isDone(status)?new Date().toISOString():null, updated_at:new Date().toISOString() }, { onConflict:"user_id,requirement_key" });
    await audit("requirement:continuing_education", before, status, { count:certs.length });
    ceRows = [];
    await load();
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
      <p class="step-desc">Before <strong>${esc(r.label)}</strong>, you'll need to finish:</p>
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

/* The CE step collects several certificates, not one. Which ones an agent
   needs is set by their registered state, so this list is a starting point
   that should come from state configuration -- see states.js. */
const CE_SLOTS = [
  { key:"aml",           label:"Anti-Money Laundering (AML)", match:/aml|money.?launder/i },
  { key:"ethics",        label:"Ethics",                      match:/ethic/i },
  { key:"best_interest", label:"Best Interest",               match:/best.?interest|\bbi\b/i },
  { key:"other",         label:"Other",                       match:null },
];

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

function kvRow(label, value, id, verified){
  if (!value) return "";
  return `<div class="lf-kv"><span class="k">${esc(label)}</span>` +
    (verified ? `<span class="lf-ok">&#10003;</span>` : "") +
    `<span class="v" id="${id}">${esc(value)}</span>` +
    `<button class="lf-copy" type="button" data-copy="${id}">Copy</button></div>`;
}

function renderDrawer(){
  const body = el("lfBody");
  if (!body) return;

  const lic = metaOf("license_number").license_number;
  const npn = metaOf("npn").npn;
  const eo  = metaOf("eo");
  const eoDone = S.instances.find(x => x.requirement_key === "eo");

  /* CE certificates come off the CE step's own uploads. A slot with no file
     yet reads "Miscellaneous" until one is added, then takes the file name. */
  const certs = (metaOf("continuing_education").certs) || [];
  const claimed = new Set();
  const ceRows = CE_SLOTS.map(slot => {
    let hit = null;
    if (slot.match) {
      hit = certs.find((c, i) => !claimed.has(i) && slot.match.test(c.filename || "")) || null;
    } else {
      hit = certs.find((c, i) => !claimed.has(i)) || null;   // "Other" takes the leftovers
    }
    if (hit) claimed.add(certs.indexOf(hit));
    const done = !!hit;
    return `<div class="lf-slot${done ? " done" : ""}">
      <span class="lf-mark">${done ? "&#10003;" : ""}</span>
      <span class="lf-sn"><b>${esc(slot.label)}</b><span>${
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

  const creds = kvRow("License number", lic, "lfLic", isVerified("license_number")) +
                kvRow("NPN", npn, "lfNpn", isVerified("npn"));

  const eoRows =
    (eo.carrier ? `<div class="lf-kv"><span class="k">Carrier</span><span class="v">${esc(eo.carrier)}</span></div>` : "") +
    kvRow("Policy number", eo.policy_number, "lfPol", false) +
    (eoDone && eoDone.completed_at
      ? `<div class="lf-kv"><span class="k">Added</span><span class="v">${esc(shortDate(eoDone.completed_at))}</span></div>` : "");

  body.innerHTML =
    `<div class="lf-g"><div class="lf-gt">Study tips</div>` +
      STUDY_TIPS.map((t,i) => `<div class="lf-tip"><i>${i+1}</i><p>${t}</p></div>`).join("") +
    `</div>` +
    (creds ? `<div class="lf-g"><div class="lf-gt">Your credentials</div>${creds}</div>` : "") +
    (eoRows ? `<div class="lf-g"><div class="lf-gt">Errors &amp; Omissions</div>${eoRows}</div>` : "") +
    `<div class="lf-g"><div class="lf-gt">Continuing education</div>${ceRows}</div>` +
    `<div class="lf-g"><div class="lf-gt">Other documents</div>${docRows}</div>`;

  body.querySelectorAll("[data-copy]").forEach(b => {
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
