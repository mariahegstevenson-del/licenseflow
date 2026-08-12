import { supabase, isConfigured, requireSession } from "./supabase.js";
import { STATE_LIST, STATES } from "./states.js";
import * as F from "./flow.js";

const el = (id) => document.getElementById(id);
const root = el("root");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const stateName = (c) => STATES[c]?.name || c || "";
const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

const S = { user:null, profile:null, instances:[], docs:[], sm:{}, journey:null };

/* ---------------- boot ---------------- */
(async function () {
  if (!isConfigured) { root.innerHTML = box("Connect Supabase to use the app."); return; }
  const session = await requireSession(); if (!session) return;
  S.user = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "index.html"; };
  window.addEventListener("hashchange", route);
  await load();
})();

async function load() {
  const uid = S.user.id;
  const [p, inst, docs] = await Promise.all([
    supabase.from("licensing_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("requirement_instances").select("*").eq("user_id", uid),
    supabase.from("documents").select("*").eq("user_id", uid),
  ]);
  S.profile = p.data; S.instances = inst.data || []; S.docs = docs.data || [];
  S.sm = F.statusMap(S.instances);
  el("who").textContent = S.profile?.full_name || S.user.email;
  if (S.profile?.designated_state) S.journey = F.buildJourney(S.profile.designated_state);
  route();
}

function firstName() { return (S.profile?.answers?.first_name) || (S.profile?.full_name || "").split(" ")[0] || "there"; }
function docFor(key) { return S.docs.find(d => d.doc_key === key); }

async function audit(event, before, after, meta = {}) {
  await supabase.from("audit_events").insert({ user_id:S.user.id, event, status_before:before||null, status_after:after||null, source:"agent", meta });
}

/* ---------------- router ---------------- */
function route() {
  const p = S.profile;
  if (!p || !p.registered) return renderRegistration();
  if (!p.designated_state) {
    const path = F.determinePathway(p);
    if (path.needQuestion) return renderPathwayQuestion(path);
    if (path.confidence === "low" || path.exception) return renderReview(path);
    // high — persist and continue
    return persistPathway(path).then(route);
  }
  if (!p.welcome_completed) return renderWelcome();
  const h = (location.hash || "#/dashboard").replace("#/", "");
  const [base, arg] = h.split("/");
  if (base === "step") return renderStep(arg);
  return renderDashboard();
}
function goto(hash){ if (location.hash === hash) route(); else location.hash = hash; }

/* ============================================================
   REGISTRATION (with military branch)
   ============================================================ */
function stateOptions(sel) {
  return `<option value="">Select…</option>` + STATE_LIST.map(s => `<option value="${s.code}" ${s.code===sel?"selected":""}>${esc(s.name)}</option>`).join("");
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
      <div class="seg" id="mil">
        <button type="button" data-v="No" class="on">No</button>
        <button type="button" data-v="Yes">Yes, I'm active-duty military</button>
      </div>

      <div id="milFields" style="display:none">
        <div class="callout" style="margin:14px 0 4px"><span class="lab">Military licensing details</span>These stay separate — your duty station, legal residence, and licensing state are not assumed to be the same.</div>
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
    payload.duty_station = el("duty").value || null;
    payload.domicile_state = el("domicile").value || null;
    payload.intended_state = el("intended").value || null;
    payload.existing_license = el("exlic").value.trim() || null;
    payload.existing_npn = el("exnpn").value.trim() || null;
  }
  el("regGo").disabled=true; el("regGo").textContent="Please wait…";
  const path = F.determinePathway(payload);
  payload.pathway_confidence = path.confidence;
  if (path.designated) { payload.designated_state = path.designated; }
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
  S.profile.designated_state = path.designated; S.profile.pathway_confidence = path.confidence;
  S.journey = F.buildJourney(path.designated);
}
async function createException(type, detail, confidence){
  await supabase.from("exceptions").insert({ user_id:S.user.id, type, detail, confidence, status:"open" });
}

/* ---------------- pathway question (MEDIUM confidence) ---------------- */
function renderPathwayQuestion(path){
  const duty=path.options.duty, dom=path.options.dom;
  root.innerHTML = `
  <div class="reg-wrap">
    <span class="conf conf-medium">Medium confidence — one question</span>
    <h1 style="font-size:1.7rem;margin-top:10px">A quick question about your license</h1>
    <p class="muted">Your current duty station and your legal residence are different states. Which state do you intend to pursue your insurance license in?</p>
    <div class="card pad" style="margin-top:8px">
      <button class="opt-lg" data-code="${duty}">My duty-station state — <strong>${esc(stateName(duty))}</strong></button>
      <button class="opt-lg" data-code="${dom}">My legal-residence state — <strong>${esc(stateName(dom))}</strong></button>
      <button class="opt-lg" data-code="">I'm not sure</button>
    </div>
  </div>`;
  root.querySelectorAll(".opt-lg").forEach(b => b.onclick = async () => {
    const code = b.dataset.code;
    if (code && STATES[code]) {
      await supabase.from("licensing_profiles").update({ intended_state:code, designated_state:code, pathway_confidence:"high", updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
      await audit("pathway_resolved","medium","high",{ designated:code });
      S.profile.intended_state=code; S.profile.designated_state=code; S.profile.pathway_confidence="high";
      S.journey=F.buildJourney(code); route();
    } else {
      await supabase.from("licensing_profiles").update({ pathway_confidence:"low", updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
      await createException("ambiguous_military_pathway","Agent unsure which state to license in (duty vs domicile).","low");
      await audit("pathway_escalated","medium","low",{});
      S.profile.pathway_confidence="low"; route();
    }
  });
}

/* ---------------- review (LOW confidence / exception) ---------------- */
function renderReview(path){
  root.innerHTML = `
  <div class="reg-wrap">
    <span class="conf conf-low">Under review</span>
    <h1 style="font-size:1.7rem;margin-top:10px">We're reviewing your licensing pathway</h1>
    <p class="muted">${esc(path?.exception || "Your information needs a quick human review before we can build your exact licensing journey.")}</p>
    <div class="card pad">
      <p style="margin:0">A member of the team will confirm the right licensing state for your situation. You don't need to do anything right now — we'll open your journey as soon as it's confirmed.</p>
    </div>
    <p class="hint" style="margin-top:12px">This happens only when duty station, residence, and intended state can't be resolved automatically — the exception is with the team, not with you.</p>
  </div>`;
}

/* ============================================================
   WELCOME TO THE TEAM
   ============================================================ */
const EXPECT = [
  ["01","Prepare","Complete your required pre-licensing education.","state"],
  ["02","Get exam ready","Study, practice, and prepare for your state examination.","state"],
  ["03","Take your exam","Schedule and complete the applicable examination.","state"],
  ["04","Complete your application","Submit the required licensing application.","state"],
  ["05","Complete documentation","Provide fingerprints, background, or other required documents when applicable.","state"],
  ["06","Receive your license","Your license information is recorded and verified.","state"],
  ["07","Agency onboarding","Complete the agency's compliance and onboarding requirements.","agency"],
  ["08","Contract","Complete carrier contracting requirements.","agency"],
  ["09","Field ready","Once licensing, contracting, and agency requirements are satisfied, you're ready to begin working within the permitted scope.","agency"],
];
function renderWelcome() {
  const p = S.profile, code = p.designated_state;
  const mil = p.military ? `
    <div class="desig">
      <div><span class="desig-k">Duty station</span>${esc(stateName(p.duty_station)) || "—"}</div>
      <div><span class="desig-k">Domicile</span>${esc(stateName(p.domicile_state)) || "—"}</div>
      <div><span class="desig-k">Licensing state</span><strong>${esc(stateName(code))}</strong></div>
    </div>
    ${confBadge(p.pathway_confidence)}
    ${F.militaryTestingNote(code) ? `<div class="callout" style="margin-top:14px"><span class="lab">Military testing option</span>${esc(F.militaryTestingNote(code))}</div>` : ""}` : "";

  root.innerHTML = `
  <div class="welcome">
    <div class="welcome-hero">
      <div class="eyebrow2">Welcome to the team</div>
      <h1>Welcome to the team, ${esc(firstName())}.</h1>
      <p class="lead">We're glad you're here. Your licensing journey has been prepared for your <strong>${esc(stateName(code))} ${esc(p.license_type)} license</strong>.</p>
      ${mil}
      <p class="muted" style="max-width:60ch">We'll guide you through the steps required to become properly licensed and prepared for the agency's contracting and onboarding process. The state regulator ultimately decides whether a license is issued — our job is to get your file properly prepared at every stage.</p>
    </div>

    <div class="card pad" style="margin-bottom:18px">
      <h3 style="margin-top:0">What to expect</h3>
      <div class="expect">
        ${EXPECT.map(e=>`<div class="ex"><div class="ex-n">${e[0]}</div><div><div class="ex-t">${esc(e[1])} <span class="tag-${e[3]}">${e[3]==="state"?"State":"Agency"}</span></div><div class="ex-d">${esc(e[2])}</div></div></div>`).join("")}
      </div>
    </div>

    <div class="card pad" style="margin-bottom:18px">
      <h3 style="margin-top:0">Why we follow the process</h3>
      <p class="muted" style="margin-bottom:0">Insurance licensing involves state requirements, regulatory documentation, and agency requirements. Following the steps in order helps make sure your file is properly prepared before it moves to the next stage — which prevents delays and incomplete submissions. Our goal isn't simply to get you through a course; it's to help you become properly licensed, properly documented, and prepared for the next stage of your career.</p>
      <div class="legend" style="margin-top:14px">
        <span><span class="tag-state">State</span> Required by the regulator.</span>
        <span><span class="tag-agency">Agency</span> Required by the agency for onboarding, contracting, or field readiness.</span>
      </div>
    </div>

    <div class="card pad launch">
      <div class="eyebrow2">Ready?</div>
      <h2 style="margin:.2rem 0 .4rem">Let's get your license started.</h2>
      <p class="muted">We'll take you straight to your first step — no guessing where to go.</p>
      <button class="btn btn-primary btn-lg" id="launch">Launch my licensing journey</button>
    </div>
  </div>`;
  el("launch").onclick = async () => {
    await supabase.from("licensing_profiles").update({ welcome_completed:true, onboarding_start:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("user_id",S.user.id);
    await audit("welcome_completed", null, "complete", {});
    S.profile.welcome_completed = true;
    const ns = F.nextStep(S.journey, S.sm);
    if (ns.type === "do") goto("#/step/" + ns.req.key); else goto("#/dashboard");
  };
}
function confBadge(c){ if(!c) return ""; const m={high:["conf-high","High confidence — pathway identified"],medium:["conf-medium","Medium confidence"],low:["conf-low","Under review"]}[c]||["conf-high",c]; return `<div style="margin:10px 0"><span class="conf ${m[0]}">${esc(m[1])}</span></div>`; }

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  if (!S.journey) { root.innerHTML = box("Preparing your journey…"); return; }
  const pr = F.progress(S.journey, S.sm);
  const ms = F.milestones(S.journey, S.sm);
  const ns = F.nextStep(S.journey, S.sm);
  const p = S.profile;
  const milSub = p.military ? `<div class="dash-mil"><span>Duty: ${esc(stateName(p.duty_station))||"—"}</span><span>Domicile: ${esc(stateName(p.domicile_state))||"—"}</span><span>Licensing: <strong>${esc(stateName(p.designated_state))}</strong></span></div>` : "";

  root.innerHTML = `
  <div class="dash">
    <div class="dash-head">
      <div>
        <div class="eyebrow2">Your license</div>
        <h1 style="margin:.1rem 0">${esc(stateName(p.designated_state))} — ${esc(p.license_type)} Insurance</h1>
        ${milSub}
      </div>
      <div class="dash-overall"><div class="big">${pr.overall}%</div><div class="muted">complete</div></div>
    </div>

    ${nextCard(ns)}

    <div class="meters">
      ${meter("Learning", pr.learning)}
      ${meter("Licensing", pr.licensing)}
      ${meter("Documentation", pr.documentation)}
      ${meter("Agency onboarding", pr.agency)}
      ${meter("Contracting", pr.contracting)}
    </div>

    <div class="milestones">
      ${mstone("Licensed", ms.licensed)}
      ${mstone("Contracting ready", ms.contractingReady)}
      ${mstone("Field ready", ms.fieldReady)}
    </div>

    <div class="card pad" style="margin-top:20px">
      <h3 style="margin-top:0">Your journey</h3>
      <div class="jlist">
        ${S.journey.reqs.map(r => {
          const st = F.reqStatus(r.key, S.sm);
          const g = F.gate(r, S.sm);
          const locked = g.blocked && !F.isDone(st);
          return `<button class="jrow2 ${locked?"locked":""}" data-key="${r.key}">
            <span class="jmk ${F.STATUS_CLASS[st]}">${F.isDone(st)?"&#10003;":(locked?"&#8226;":"")}</span>
            <span class="jname">${esc(r.short)} <span class="tag-${r.category}">${r.category==="state"?"State":"Agency"}</span></span>
            <span class="badge ${F.STATUS_CLASS[st]}">${esc(F.STATUS_LABEL[st])}</span>
          </button>`;
        }).join("")}
      </div>
    </div>
  </div>`;
  root.querySelectorAll(".jrow2[data-key]").forEach(b => b.onclick = () => goto("#/step/" + b.dataset.key));
  const dn = el("doNext"); if (dn) dn.onclick = () => goto("#/step/" + dn.dataset.key);
}
function nextCard(ns){
  if (ns.type === "waiting")
    return `<div class="next waiting"><div class="k">Current status</div><h2>You're all set for now</h2><p>There are no actions required from you right now — your ${esc(ns.req.short)} submission is with the team for review. We'll surface your next step here as soon as it changes.</p></div>`;
  if (ns.type === "done")
    return `<div class="next done"><div class="k">Nice work</div><h2>Every current requirement is complete</h2><p>You're up to date on everything required right now.</p></div>`;
  const r = ns.req; const rej = ns.status==="rejected"||ns.status==="action_required";
  return `<div class="next"><div class="k">Your next step</div><h2>${rej?"Fix: ":""}${esc(r.label)}</h2><p>${esc(r.desc)}</p>
    <button class="btn btn-primary btn-lg" id="doNext" data-key="${r.key}">${rej?"Resolve this":"Continue"}</button></div>`;
}
function meter(label,val){ return `<div class="mtr"><div class="mtr-l">${label}</div><div class="mtr-v">${val}%</div><div class="mbar"><i style="width:${val}%"></i></div></div>`; }
function mstone(label,on){ return `<div class="ms ${on?"on":""}"><span class="ms-dot">${on?"&#10003;":""}</span>${label}</div>`; }

/* ============================================================
   STEP DETAIL (validation-first)
   ============================================================ */
function renderStep(key) {
  const r = S.journey?.reqs.find(x => x.key === key);
  if (!r) { goto("#/dashboard"); return; }
  const st = F.reqStatus(r.key, S.sm);
  const g = F.gate(r, S.sm);
  if (g.blocked && !F.isDone(st)) return renderGate(r, g);

  const meta = S.sm[r.key]?.meta || {};
  const doc = docFor(r.key);
  const idx = S.journey.reqs.findIndex(x=>x.key===key);
  const total = S.journey.reqs.length;

  root.innerHTML = `
  <div class="wt">
    <div class="wt-head">
      <div class="wt-meta"><span><a href="#/dashboard" style="color:inherit">← Dashboard</a></span><span>${esc(stateName(S.profile.designated_state))} · ${esc(S.profile.license_type)}</span></div>
    </div>
    <div class="step-card"><div class="step-body">
      <div class="step-top"><span class="tag-${r.category}">${r.category==="state"?"State requirement":"Agency requirement"}</span><span class="badge ${F.STATUS_CLASS[st]}">${esc(F.STATUS_LABEL[st])}</span></div>
      <h2 style="margin-top:.4rem">${esc(r.label)}</h2>
      <p class="step-desc">${esc(r.desc)}</p>

      ${st==="rejected"||st==="action_required" ? `<div class="callout callout-warn"><span class="lab">Action required</span>${esc(meta._reject || "This was sent back for correction. Please review and resubmit.")}</div>` : ""}

      ${r.video!==undefined ? `<div class="video">${videoEmbed(r.video)}</div>` : ""}

      ${r.link ? `<div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(r.link)}" target="_blank" rel="noopener">Open this step</a></div><div class="link-note">Opens in a new tab. Complete it, then record the details below.</div>` : ""}
      ${r.note ? `<div class="callout" style="margin-top:14px">${linkify(r.note)}</div>` : ""}
      ${r.misc ? `<div class="callout" style="margin-top:14px"><span class="lab">Note for ${esc(stateName(S.profile.designated_state))}</span>${linkify(r.misc)}</div>` : ""}
      ${r.instructions ? `<details class="inst" style="margin-top:16px"><summary>Step-by-step instructions</summary><ol>${r.instructions.map(i=>`<li>${linkify(i)}</li>`).join("")}</ol></details>` : ""}

      <div class="form-block">
        <h3 style="margin:22px 0 6px;font-size:1.02rem">Record your details</h3>
        ${(r.fields||[]).map(f => field(f, meta)).join("")}
        ${r.doc && r.doc.label ? docField(r.doc, doc) : ""}
        <div id="stepAlert" class="alert"></div>
        <div class="wt-nav" style="margin-top:18px">
          <a class="btn btn-ghost" href="#/dashboard">Save for later</a>
          <button class="btn btn-primary" id="submitStep">${r.verify==="admin"?"Submit for review":"Save & complete"}</button>
        </div>
        ${r.verify==="admin" ? `<p class="hint" style="margin-top:8px">This requirement is verified by the team before it's marked complete. Entering information here does not mean it's verified.</p>` : ""}
      </div>
    </div></div>
  </div>`;

  const df = el("docInput");
  if (df) df.addEventListener("change", () => { const n=df.files[0]?.name; el("docName").textContent = n ? `Selected: ${n}` : ""; });
  el("submitStep").onclick = () => submitStep(r);
}
function field(f, meta) {
  const v = meta[f.name] ?? "";
  if (f.type === "check") return `<label class="chk"><input type="checkbox" id="f_${f.name}" ${v?"checked":""}/> ${esc(f.label)}</label>`;
  if (f.type === "select") return `<label>${esc(f.label)}${f.required?" *":""}</label><select id="f_${f.name}"><option value="">Select…</option>${f.options.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  return `<label>${esc(f.label)}${f.required?" *":""}</label><input id="f_${f.name}" type="${f.type==="time"?"time":f.type==="date"?"date":"text"}" value="${esc(v)}"/>`;
}
function docField(d, existing) {
  return `<label style="margin-top:14px">${esc(d.label)}${d.required?" *":""}</label>
    <div class="upload">
      <label class="btn btn-ghost btn-sm" for="docInput">${existing?"Replace file":"Choose file"}</label>
      <input id="docInput" type="file" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"/>
      <span id="docName" class="hint">${existing?`Uploaded: ${esc(existing.note||"document")}`:""}</span>
    </div>
    ${existing?`<div class="hint">${existing.meta_detected?`Detected: ${esc(existing.meta_detected)} · `:""}Uploaded ${new Date(existing.updated_at).toLocaleDateString()}</div>`:""}`;
}

function detectType(filename){
  const n=(filename||"").toLowerCase();
  if(/e&?o|errors|omission/.test(n)) return "E&O certificate";
  if(/licen/.test(n)) return "License document";
  if(/finger|background/.test(n)) return "Background / fingerprint receipt";
  if(/cert|complet/.test(n)) return "Education certificate";
  if(/confirm|sched/.test(n)) return "Confirmation";
  return null;
}

async function submitStep(r) {
  const A = el("stepAlert");
  const meta = { ...(S.sm[r.key]?.meta || {}) };
  for (const f of (r.fields||[])) {
    const node = el("f_" + f.name); if (!node) continue;
    meta[f.name] = f.type === "check" ? node.checked : node.value;
  }
  // required validation
  const missing = (r.fields||[]).filter(f => f.required && (meta[f.name]==null || meta[f.name]==="" || meta[f.name]===false)).map(f=>f.label);
  const df = el("docInput"); const newFile = df && df.files[0];
  const hasDoc = !!docFor(r.key) || !!newFile;
  if (r.doc?.required && !hasDoc) missing.push(r.doc.label);
  // NPN format check
  if (r.key === "npn" && meta.npn && !/^\d{5,10}$/.test(String(meta.npn).trim())) missing.push("a valid NPN (5–10 digits)");
  if (missing.length) { A.className="alert show alert-error"; A.textContent = "Please provide: " + missing.join(", ") + "."; return; }

  el("submitStep").disabled = true; el("submitStep").textContent = "Saving…";
  // upload doc
  if (newFile) {
    const path = `${S.user.id}/${r.key}/${Date.now()}_${newFile.name}`.replace(/\s+/g,"_");
    const up = await supabase.storage.from("docs").upload(path, newFile, { upsert:true });
    if (up.error) { A.className="alert show alert-error"; A.textContent="Upload failed: "+up.error.message; el("submitStep").disabled=false; el("submitStep").textContent=r.verify==="admin"?"Submit for review":"Save & complete"; return; }
    const detected = detectType(newFile.name);
    await supabase.from("documents").upsert({ user_id:S.user.id, doc_key:r.key, label:r.doc.label, status:"uploaded", note:newFile.name, file_url:path, meta_detected:detected, updated_at:new Date().toISOString() }, { onConflict:"user_id,doc_key" });
    await audit(`document:${r.key}`, null, "document_uploaded", { file:newFile.name, detected });
  }
  const before = F.reqStatus(r.key, S.sm);
  const status = F.submissionStatus(r, meta, hasDoc);
  const clean = { ...meta }; delete clean._reject;
  await supabase.from("requirement_instances").upsert({ user_id:S.user.id, requirement_key:r.key, label:r.label, status, meta:clean, completed_at: F.isDone(status)?new Date().toISOString():null, updated_at:new Date().toISOString() }, { onConflict:"user_id,requirement_key" });
  await audit(`requirement:${r.key}`, before, status, { method: r.verify==="admin"?"submitted_for_review":"self_validated" });

  await load();
  const ns = F.nextStep(S.journey, S.sm);
  if (status === F.ST.PENDING) { goto("#/dashboard"); return; }
  if (ns.type === "do" && ns.req.key !== r.key) goto("#/step/" + ns.req.key); else goto("#/dashboard");
}

/* ---------------- dependency gate ---------------- */
function renderGate(r, g) {
  const names = g.missing.map(k => F.REQ_BY_KEY[k]?.short || k);
  root.innerHTML = `
  <div class="wt">
    <div class="wt-head"><div class="wt-meta"><span><a href="#/dashboard" style="color:inherit">← Dashboard</a></span></div></div>
    <div class="step-card"><div class="step-body">
      <div class="gate-ic">!</div>
      <h2>You're not quite ready for this step</h2>
      <p class="step-desc">Before <strong>${esc(r.label)}</strong>, you'll need to finish:</p>
      <ul class="miss">${names.map(n=>`<li>${esc(n)}</li>`).join("")}</ul>
      <button class="btn btn-primary" id="fix">Fix these items</button>
    </div></div>
  </div>`;
  el("fix").onclick = () => goto("#/step/" + g.missing[0]);
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
