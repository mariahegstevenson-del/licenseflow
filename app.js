import { supabase, isConfigured, requireSession } from "./supabase.js";
import * as E from "./engine.js";
import { MODULES, EXAM_BANK, TOTAL_MODULES } from "./curriculum.js";

/* ---------------- state ---------------- */
const S = {
  user: null, profile: null,
  instances: [], modules: [], attempts: [], documents: [],
  workflow: null, reqStatus: {}, currentStep: "profile",
};
const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const content = el("content");

/* ---------------- boot ---------------- */
(async function () {
  if (!isConfigured) { content.innerHTML = card("Connect Supabase to use the app."); return; }
  const session = await requireSession(); if (!session) return;
  S.user = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "index.html"; };
  el("menu").onclick = () => { el("side").classList.add("open"); el("overlay").classList.add("show"); };
  el("overlay").onclick = closeSide;
  document.querySelectorAll(".nav-item[data-route]").forEach(b => b.onclick = () => { location.hash = b.dataset.route; closeSide(); });
  window.addEventListener("hashchange", route);
  await loadAll();
  if (!location.hash) location.hash = "#/dashboard";
  else route();
})();

function closeSide(){ el("side").classList.remove("open"); el("overlay").classList.remove("show"); }

async function loadAll() {
  const uid = S.user.id;
  const [prof, inst, mods, atts, docs] = await Promise.all([
    supabase.from("licensing_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("requirement_instances").select("*").eq("user_id", uid),
    supabase.from("module_progress").select("*").eq("user_id", uid),
    supabase.from("exam_attempts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", uid),
  ]);
  S.profile = prof.data; S.instances = inst.data || []; S.modules = mods.data || [];
  S.attempts = atts.data || []; S.documents = docs.data || [];
  recompute();
  const nm = S.profile?.full_name || S.user.email.split("@")[0];
  el("whoName").textContent = nm;
}

function recompute() {
  S.workflow = S.profile ? E.resolveWorkflow(S.profile) : null;
  // build reqStatus from explicit instances
  const map = { profile: S.profile ? E.STATUS.COMPLETE : E.STATUS.CURRENT };
  S.instances.forEach(r => map[r.requirement_key] = r.status);
  // auto: education complete when all modules complete
  const lp = E.learningProgress(S.modules, TOTAL_MODULES);
  if (lp === 100 && map.education !== E.STATUS.COMPLETE) map.education = E.STATUS.COMPLETE;
  if (map.education === E.STATUS.COMPLETE && !map.edu_done) map.edu_done = E.STATUS.COMPLETE;
  S.reqStatus = map;
  // current step = first applicable gate not complete
  if (S.workflow) {
    S.currentStep = S.workflow.stages.find(k => k !== "profile" && map[k] !== E.STATUS.COMPLETE) || "licensed";
  }
}

/* metrics */
function metrics() {
  const learning = E.learningProgress(S.modules, TOTAL_MODULES);
  const licensing = E.licensingProgress(S.workflow, S.reqStatus);
  const readiness = E.examReadiness(S.attempts, S.modules, TOTAL_MODULES);
  return { learning, licensing, readiness };
}

/* persist helpers */
async function setStage(key, status, meta = {}) {
  const before = S.reqStatus[key];
  await supabase.from("requirement_instances").upsert({
    user_id: S.user.id, requirement_key: key, status, meta, completed_at: status === E.STATUS.COMPLETE ? new Date().toISOString() : null, updated_at: new Date().toISOString()
  }, { onConflict: "user_id,requirement_key" });
  await audit(`stage:${key}`, before, status);
  await loadAll();
}
async function audit(event, before, after, meta = {}) {
  await supabase.from("audit_events").insert({ user_id: S.user.id, event, status_before: before || null, status_after: after || null, source: "agent", meta });
}

/* ---------------- router + forced progression ---------------- */
const TITLES = { dashboard:"Dashboard", journey:"Licensing Journey", learn:"Education", readiness:"Exam Readiness", documents:"Documents", status:"Licensing Status", concierge:"AI Concierge", onboarding:"Set up your profile", module:"Learning Module" };

function route() {
  if (!S.profile) { renderOnboarding(); setActive("dashboard"); return; }
  const h = (location.hash || "#/dashboard").slice(2);
  const [base, arg] = h.split("/");
  el("ttl").textContent = TITLES[base] || "Dashboard";
  const m = metrics();
  el("greet").textContent = greeting(m);
  setActive(base);
  // access control
  const gate = canAccess(base, m);
  if (!gate.ok) { renderLock(gate); return; }
  switch (base) {
    case "dashboard": return renderDashboard(m);
    case "journey": return renderJourney(m);
    case "learn": return renderLearn(m);
    case "module": return renderModule(arg, m);
    case "readiness": return renderReadiness(m);
    case "documents": return renderDocuments(m);
    case "status": return renderStatus(m);
    case "concierge": return renderConcierge(m);
    default: return renderDashboard(m);
  }
}
function setActive(base){ document.querySelectorAll(".nav-item[data-route]").forEach(b=>b.classList.toggle("active", b.dataset.route === "#/"+base)); }
function greeting(m){ return `${S.workflow.licenseType} License · ${S.workflow.stateName} · ${m.licensing}% licensing complete`; }

function canAccess(base, m) {
  if (base === "readiness") {
    if (S.reqStatus.education !== E.STATUS.COMPLETE)
      return { ok:false, what:"Exam Readiness", why:"You need to finish your Required Education before exam preparation opens.", goto:"#/learn", gotoLabel:"Go to Education" };
  }
  if (base === "module") return { ok:true }; // handled inside
  return { ok:true };
}

/* ---------------- ONBOARDING ---------------- */
function renderOnboarding() {
  el("ttl").textContent = "Set up your profile"; el("greet").textContent = "A few quick questions to build your exact path";
  const states = E.SUPPORTED_STATES.map(s=>`<option value="${s.code}">${s.name}</option>`).join("");
  content.innerHTML = `
  <div class="panel" style="max-width:640px">
    <div class="eyebrow">Step 1 of 1</div>
    <h3 style="margin-top:.3rem">Let's build your licensing path</h3>
    <p class="muted">Tell us where and what you're licensing. We'll generate your exact journey.</p>
    <label>Full name</label><input id="ob_name" value="${esc(S.profile?.full_name||S.user.email.split("@")[0])}"/>
    <div class="row2">
      <div><label>State</label><select id="ob_state">${states}</select></div>
      <div><label>License type</label><select id="ob_type"><option>Life</option><option>Life &amp; Health</option></select></div>
    </div>
    <label>Are you a resident of this state?</label>
    <select id="ob_res"><option value="true">Yes — resident</option><option value="false">No — non-resident</option></select>
    <div id="ob_alert" class="alert"></div>
    <button class="btn btn-primary btn-lg btn-block" id="ob_go" style="margin-top:16px">Build my licensing journey →</button>
    <p class="note" style="margin-top:10px">Sample requirements are shown for demonstration. Verify specifics with your state DOI.</p>
  </div>`;
  el("ob_go").onclick = async () => {
    const state = el("ob_state").value, license_type = el("ob_type").value, resident = el("ob_res").value === "true", full_name = el("ob_name").value.trim();
    if (!E.RULES[state]) { el("ob_alert").className="alert show alert-error"; el("ob_alert").textContent="Please choose a supported state."; return; }
    el("ob_go").disabled = true; el("ob_go").textContent = "Building…";
    await supabase.from("licensing_profiles").upsert({ user_id: S.user.id, full_name, state, license_type, resident, current_step: "eligibility", status: "in_progress", updated_at: new Date().toISOString() });
    await supabase.from("profiles").upsert({ id: S.user.id, email: S.user.email, full_name, state, license_type });
    await audit("profile:created", null, "complete", { state, license_type, resident });
    // seed documents for this workflow
    await seedDocuments({ state, license_type, resident });
    await loadAll();
    location.hash = "#/dashboard";
    route();
  };
}

async function seedDocuments(p) {
  const wf = E.resolveWorkflow(p); if (!wf) return;
  const base = [
    { doc_key:"id", label:"Government-issued ID", status:"required" },
    { doc_key:"edu_cert", label:"Pre-licensing education certificate", status:"required" },
  ];
  if (wf.detail.fingerprintRequired) base.push({ doc_key:"fingerprint", label:"Fingerprint / background receipt", status:"required" });
  base.push({ doc_key:"exam_result", label:"Exam result documentation", status:"na" });
  for (const d of base) await supabase.from("documents").upsert({ user_id:S.user.id, ...d }, { onConflict:"user_id,doc_key" });
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard(m) {
  const na = E.nextAction({ workflow:S.workflow, reqStatus:S.reqStatus, learning:m.learning, readiness:m.readiness, documents:S.documents });
  const est = E.estimateCompletion(S.workflow, S.reqStatus, new Date());
  const journey = E.deriveJourney(S.workflow, S.reqStatus, S.currentStep);
  const docReq = S.documents.filter(d=>d.status==="required"||d.status==="requested").length;
  const docOk = S.documents.filter(d=>d.status==="accepted"||d.status==="uploaded").length;

  content.innerHTML = `
  ${nextStepBlock(na, est)}
  <div class="meters" style="margin:20px 0">
    ${meter("Learning", m.learning, "learn", "How much education is complete")}
    ${meter("Licensing", m.licensing, "license", "Requirements satisfied")}
    ${meter("Exam readiness", m.readiness, "ready", "How prepared you are")}
  </div>
  <div class="grid g2">
    <div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Your licensing journey</h3><a href="#/journey" class="btn btn-ghost btn-sm">View all</a></div>
      <ul class="journey" style="margin-top:14px">${journey.map(journeyRow).join("")}</ul>
    </div>
    <div>
      <div class="panel"><h3 style="margin-top:0">Documents</h3>
        <div class="hl"><span>Accepted / uploaded</span><span class="badge b-green">${docOk}</span></div>
        <div class="hl"><span>Still required</span><span class="badge ${docReq?"b-amber":"b-gray"}">${docReq}</span></div>
        <a href="#/documents" class="btn btn-ghost btn-sm btn-block" style="margin-top:12px">Manage documents</a>
      </div>
      <div class="panel"><h3 style="margin-top:0">Need help?</h3>
        <p class="muted" style="margin-top:0">Ask the AI concierge anything about your licensing — it knows exactly where you are.</p>
        <a href="#/concierge" class="btn btn-primary btn-sm btn-block">💬 Ask the concierge</a>
      </div>
    </div>
  </div>`;
  wireNext(na);
  if (docReq) { el("docTag").style.display="inline-block"; el("docTag").textContent=docReq; }
}

function nextStepBlock(na, est) {
  const waiting = na.waiting;
  return `<div class="nextstep ${waiting?"waiting":""}">
    <div class="k">${waiting?"Current status":"Your next step"}</div>
    <h2>${esc(na.title)}</h2>
    <p class="why">${esc(na.why)}</p>
    <div class="meta">
      ${na.minutes?`<span>⏱️ About ${na.minutes} minutes</span>`:""}
      ${est?`<span>📅 Estimated completion: ${E.fmtDate(est)}</span>`:""}
    </div>
    ${na.cta?`<button class="btn btn-primary btn-lg" id="doNext">${esc(na.cta)}</button>`:`<span class="badge b-amber">Waiting on the state</span>`}
  </div>`;
}
function wireNext(na){ const b=el("doNext"); if(b) b.onclick=()=>{ location.hash = na.route || "#/journey"; }; }

function meter(label, val, cls, sub) {
  return `<div class="meter"><div class="lbl">${label}</div><div class="val">${val}%</div>
    <div class="bar ${cls}"><i style="width:${val}%"></i></div><div class="note" style="margin-top:6px">${sub}</div></div>`;
}
function journeyRow(n) {
  const icon = { complete:"✓", current:"→", waiting:"⏳", action_required:"!", failed:"✕", locked:"○" }[n.status] || "○";
  const badge = { complete:'<span class="badge b-green">Done</span>', current:'<span class="badge b-blue">In progress</span>', waiting:'<span class="badge b-amber">Waiting on state</span>', action_required:'<span class="badge b-amber">Action needed</span>', locked:'', failed:'<span class="badge b-red">Retry</span>' }[n.status]||"";
  return `<li class="jrow ${n.status}"><div class="jrail"></div><div class="jmark">${icon}</div>
    <div class="jbody"><div class="t">${esc(n.label)} ${badge}</div></div></li>`;
}

/* ---------------- JOURNEY ---------------- */
function renderJourney(m) {
  const journey = E.deriveJourney(S.workflow, S.reqStatus, S.currentStep);
  const est = E.estimateCompletion(S.workflow, S.reqStatus, new Date());
  const adj = S.workflow.adjustments?.length ? `<div class="locknote" style="margin-bottom:16px"><span>ℹ️</span><div>${S.workflow.adjustments.map(esc).join("<br>")}</div></div>` : "";
  content.innerHTML = `
  <div class="panel">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center">
      <div><h3 style="margin:0">${esc(S.workflow.licenseType)} License — ${esc(S.workflow.stateName)}</h3>
      <div class="muted">${m.licensing}% licensing complete · est. completion ${E.fmtDate(est)}</div></div>
      ${S.reqStatus.education!==E.STATUS.COMPLETE?'<a href="#/learn" class="btn btn-primary btn-sm">Continue education</a>':'<a href="#/readiness" class="btn btn-primary btn-sm">Exam prep</a>'}
    </div>
    <div class="bar license" style="margin:14px 0 20px"><i style="width:${m.licensing}%"></i></div>
    ${adj}
    <ul class="journey">${journey.map(journeyDetailRow).join("")}</ul>
  </div>
  <div class="panel">
    <h3 style="margin-top:0">Where this data comes from</h3>
    <p class="muted" style="margin:0">Your path is generated from the licensing rules layer: <strong>${esc(S.workflow.detail.source)}</strong> · rules as of ${esc(S.workflow.detail.asOf)} · <span class="badge b-amber">Unverified sample</span></p>
  </div>`;
  content.querySelectorAll("[data-act]").forEach(b => b.onclick = () => actOnStage(b.dataset.act));
}
function journeyDetailRow(n) {
  const icon = { complete:"✓", current:"→", waiting:"⏳", action_required:"!", failed:"✕", locked:"🔒" }[n.status] || "○";
  const desc = stageDesc(n);
  const action = stageAction(n);
  return `<li class="jrow ${n.status}"><div class="jrail"></div><div class="jmark">${icon}</div>
    <div class="jbody"><div class="t">${esc(n.label)}</div><div class="d">${esc(desc)}</div>${action}</div></li>`;
}
function stageDesc(n) {
  const d = {
    profile:"Your state, license type, and residency.",
    eligibility:"Confirm you meet the basic requirements to be licensed.",
    education:`Complete your state pre-licensing education (${S.workflow.detail.preLicensingHours} hours — sample).`,
    edu_done:"Your education requirement is satisfied.",
    exam_prep:"Build exam readiness and review weak areas before scheduling.",
    exam:`${S.workflow.detail.examName} (via ${S.workflow.detail.examProvider} — sample).`,
    fingerprint:"Fingerprints and background check as required by the state.",
    application:"Submit your license application to the state.",
    review:"The state reviews your application. Nothing needed from you.",
    licensed:"Your license is issued. You're official.",
  }[n.key] || "";
  return d;
}
function stageAction(n) {
  if (n.status === E.STATUS.COMPLETE) return "";
  if (n.status === E.STATUS.LOCKED) return `<div class="note" style="margin-top:6px">🔒 Opens after the previous step.</div>`;
  switch (n.key) {
    case "eligibility": return `<button class="btn btn-primary btn-sm" data-act="eligibility" style="margin-top:8px">Confirm eligibility</button>`;
    case "education": return `<a href="#/learn" class="btn btn-primary btn-sm" style="margin-top:8px">Go to education</a>`;
    case "exam_prep": return `<a href="#/readiness" class="btn btn-primary btn-sm" style="margin-top:8px">Open exam prep</a>`;
    case "exam": return `<button class="btn btn-primary btn-sm" data-act="exam" style="margin-top:8px">Record exam result</button>`;
    case "fingerprint": return `<button class="btn btn-primary btn-sm" data-act="fingerprint" style="margin-top:8px">Mark fingerprints done</button>`;
    case "application": return `<button class="btn btn-primary btn-sm" data-act="application" style="margin-top:8px">Submit application</button>`;
    case "review": return `<span class="badge b-amber" style="margin-top:8px">Waiting on the state</span> <button class="btn btn-ghost btn-sm" data-act="issue" style="margin-top:8px">Simulate: license issued</button>`;
    default: return "";
  }
}
async function actOnStage(key) {
  if (key === "eligibility") return setStage("eligibility", E.STATUS.COMPLETE);
  if (key === "exam") {
    const ok = confirm("Did you PASS your state exam? Click OK for pass, Cancel for not yet.");
    if (ok) { await setStage("exam", E.STATUS.COMPLETE); await setDoc("exam_result","accepted"); }
    return route();
  }
  if (key === "fingerprint") { await setDoc("fingerprint","accepted"); return setStage("fingerprint", E.STATUS.COMPLETE); }
  if (key === "application") { await setStage("application", E.STATUS.COMPLETE); return setStage("review", E.STATUS.WAITING); }
  if (key === "issue") { await setStage("review", E.STATUS.COMPLETE); return setStage("licensed", E.STATUS.COMPLETE); }
}

/* ---------------- EDUCATION (module list) ---------------- */
function renderLearn(m) {
  const done = new Set(S.modules.filter(x=>x.status==="complete").map(x=>x.module_key));
  let firstIncompleteIdx = MODULES.findIndex(mod=>!done.has(mod.key));
  const rows = MODULES.map((mod, i) => {
    const isDone = done.has(mod.key);
    const locked = !isDone && i > firstIncompleteIdx && firstIncompleteIdx !== -1;
    const cls = isDone ? "done" : (locked ? "locked" : "");
    const best = S.modules.find(x=>x.module_key===mod.key)?.best_score;
    return `<div class="mod ${cls}">
      <div class="chk">✓</div>
      <div style="flex:1"><div class="mt">Module ${mod.n} · ${esc(mod.title)} <span class="badge b-gray">${esc(mod.topic)}</span></div>
        <div class="md">${isDone?`Completed${best!=null?` · best ${best}%`:""}`:`${mod.minutes} min · Learn → Try → Check → Prove`}</div></div>
      ${locked?'<span class="md">🔒 Locked</span>':`<a class="btn ${isDone?"btn-ghost":"btn-primary"} btn-sm" href="#/module/${mod.key}">${isDone?"Review":"Start"}</a>`}
    </div>`;
  }).join("");
  content.innerHTML = `
  <div class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div><h3 style="margin:0">Required Education</h3><div class="muted">${m.learning}% complete · ${S.modules.filter(x=>x.status==="complete").length}/${TOTAL_MODULES} modules</div></div>
      ${m.learning===100?'<span class="badge b-green">Education complete ✓</span>':''}
    </div>
    <div class="bar learn" style="margin:14px 0 18px"><i style="width:${m.learning}%"></i></div>
    ${rows}
    ${m.learning===100?`<div class="locknote" style="margin-top:14px;background:var(--green-050);border-color:#bbf7d0;color:#0f7a37"><span>✓</span><div>Your education requirement is satisfied. Next: <a href="#/readiness">Exam Preparation →</a></div></div>`:""}
  </div>`;
}

/* ---------------- MODULE micro-flow ---------------- */
const MFLOW = {}; // transient per-module UI state
function renderModule(key, m) {
  const mod = MODULES.find(x=>x.key===key);
  if (!mod) { location.hash="#/learn"; return; }
  // lock check: previous module must be complete
  const idx = MODULES.findIndex(x=>x.key===key);
  const done = new Set(S.modules.filter(x=>x.status==="complete").map(x=>x.module_key));
  if (idx>0 && !done.has(MODULES[idx-1].key) && !done.has(key)) {
    return renderLock({ what:`Module ${mod.n}`, why:`Finish Module ${MODULES[idx-1].n} — ${MODULES[idx-1].title} first. Modules build on each other.`, goto:`#/module/${MODULES[idx-1].key}`, gotoLabel:"Go to previous module" });
  }
  MFLOW[key] = MFLOW[key] || { phase:"learn", checkIdx:0, correct:0 };
  drawModulePhase(mod);
}
function drawModulePhase(mod) {
  const st = MFLOW[mod.key];
  const phases = ["learn","try","check","prove","complete"];
  const stepper = `<div class="stepper">${phases.map(p=>{
    const pi=phases.indexOf(p), ci=phases.indexOf(st.phase);
    return `<div class="s ${p===st.phase?"active":(pi<ci?"done":"")}">${p}</div>`;}).join("")}</div>`;
  const back = `<a href="#/learn" class="btn btn-ghost btn-sm">← All modules</a>`;
  let body = "";
  if (st.phase === "learn") {
    body = `<div class="lesson">${mod.learn.map(b=>`<div class="blk"><h3>${esc(b.h)}</h3><p class="muted">${esc(b.p)}</p></div>`).join("")}
      <button class="btn btn-primary btn-lg" id="next">Got it — practice →</button></div>`;
  } else if (st.phase === "try") {
    body = questionBlock(mod.try, "Practice", true);
  } else if (st.phase === "check") {
    const q = mod.check[st.checkIdx];
    body = `<div class="muted" style="margin-bottom:8px">Knowledge check ${st.checkIdx+1} of ${mod.check.length}</div>` + questionBlock(q, "Check", false);
  } else if (st.phase === "prove") {
    body = `<div class="panel" style="box-shadow:none;border:none;padding:0"><h3>Prove it</h3><p class="muted">Answer to complete the module.</p></div>` + questionBlock(mod.check[mod.check.length-1], "Assessment", false, true);
  } else if (st.phase === "complete") {
    const nextMod = MODULES[MODULES.findIndex(x=>x.key===mod.key)+1];
    body = `<div class="lesson center" style="padding:20px 0">
      <div style="font-size:2.4rem">✅</div>
      <h3>Module ${mod.n} complete</h3>
      <p class="muted">Knowledge requirement satisfied.</p>
      ${nextMod?`<p>Next up:</p><div class="mod" style="text-align:left"><div class="chk"></div><div style="flex:1"><div class="mt">Module ${nextMod.n} · ${esc(nextMod.title)}</div><div class="md">${nextMod.minutes} min</div></div></div>
        <a class="btn btn-primary btn-lg" href="#/module/${nextMod.key}">Continue →</a>`
        :`<p>That was the last module. Your education is complete! 🎉</p><a class="btn btn-primary btn-lg" href="#/readiness">Go to Exam Readiness →</a>`}
    </div>`;
  }
  content.innerHTML = `<div class="panel">${stepper}<div style="display:flex;justify-content:space-between;margin-bottom:10px">${back}<span class="badge b-gray">${esc(mod.topic)}</span></div><h2 style="margin-top:0">${esc(mod.title)}</h2>${body}</div>`;
  wireModule(mod);
}
function questionBlock(q, tag, showExplainOnly, isProve) {
  return `<div class="qwrap"><div class="eyebrow">${tag}</div><h3 style="margin-top:.3rem">${esc(q.q)}</h3>
    <div id="opts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>
    <div id="fb"></div>
    <div id="advance" style="margin-top:10px"></div></div>`;
}
function wireModule(mod) {
  const st = MFLOW[mod.key];
  const nb = el("next"); if (nb) nb.onclick = () => { st.phase="try"; drawModulePhase(mod); };
  const opts = content.querySelector("#opts");
  if (!opts) return;
  const q = st.phase==="try" ? mod.try : (st.phase==="check" ? mod.check[st.checkIdx] : mod.check[mod.check.length-1]);
  opts.querySelectorAll(".opt").forEach(b => b.onclick = () => {
    const i = Number(b.dataset.i);
    opts.querySelectorAll(".opt").forEach(x=>x.style.pointerEvents="none");
    const correct = i === q.answer;
    b.classList.add(correct?"correct":"wrong");
    if (!correct) opts.querySelector(`.opt[data-i="${q.answer}"]`).classList.add("correct");
    el("fb").innerHTML = `<div class="explain">${correct?"✓ Correct. ":"Not quite. "}${esc(q.explain||"")}</div>`;
    const adv = el("advance");
    adv.innerHTML = `<button class="btn btn-primary" id="adv">Continue →</button>`;
    el("adv").onclick = () => advanceModule(mod, correct);
  });
}
async function advanceModule(mod, wasCorrect) {
  const st = MFLOW[mod.key];
  if (st.phase === "try") { st.phase = "check"; st.checkIdx = 0; return drawModulePhase(mod); }
  if (st.phase === "check") {
    if (wasCorrect) st.correct++;
    if (st.checkIdx < mod.check.length - 1) { st.checkIdx++; return drawModulePhase(mod); }
    st.phase = "prove"; return drawModulePhase(mod);
  }
  if (st.phase === "prove") {
    // compute score across checks
    const score = Math.round(((st.correct + (wasCorrect?1:0)) / (mod.check.length + 1)) * 100);
    const prev = S.modules.find(x=>x.module_key===mod.key)?.best_score ?? 0;
    await supabase.from("module_progress").upsert({ user_id:S.user.id, module_key:mod.key, status:"complete", score, best_score: Math.max(prev, score), updated_at:new Date().toISOString() }, { onConflict:"user_id,module_key" });
    await audit(`module:${mod.key}`, "in_progress", "complete", { score });
    // if all modules complete, mark education complete
    await loadAll();
    if (E.learningProgress(S.modules, TOTAL_MODULES) === 100) { await setStage("education", E.STATUS.COMPLETE); }
    st.phase = "complete"; return drawModulePhase(mod);
  }
}

/* ---------------- EXAM READINESS ---------------- */
const QUIZ = { active:false, idx:0, answers:[], qs:[] };
function renderReadiness(m) {
  const insights = E.topicInsights(S.attempts);
  const last = S.attempts[0];
  const scheduled = S.reqStatus.exam_prep === E.STATUS.COMPLETE;
  content.innerHTML = `
  <div class="panel center">
    <div class="eyebrow">Exam readiness</div>
    <div style="font-size:3.4rem;font-weight:800;line-height:1;margin:.2rem 0">${m.readiness}%</div>
    <div class="bar ready" style="max-width:420px;margin:8px auto 6px"><i style="width:${m.readiness}%"></i></div>
    <p class="muted">${readinessMsg(m.readiness)}</p>
    ${m.readiness>=85 && !scheduled ? `<button class="btn btn-primary btn-lg" id="sched">Schedule my exam</button>`:""}
    ${scheduled?'<span class="badge b-green">Exam prep complete ✓</span>':""}
  </div>
  <div class="grid g2">
    <div class="panel"><h3 style="margin-top:0">Strong areas</h3>${insights.strong.length?insights.strong.map(r=>`<div class="hl"><span><span class="dot" style="background:var(--green)"></span> ${esc(r.topic)}</span><span class="badge b-green">${r.pct}%</span></div>`).join(""):'<p class="muted" style="margin:0">Take a practice exam to see your strengths.</p>'}</div>
    <div class="panel"><h3 style="margin-top:0">Review recommended</h3>${insights.weak.length?insights.weak.map(r=>`<div class="hl"><span><span class="dot" style="background:var(--amber)"></span> ${esc(r.topic)}</span><span class="badge b-amber">${r.pct}%</span></div>`).join(""):'<p class="muted" style="margin:0">No weak areas flagged yet.</p>'}</div>
  </div>
  <div class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div><h3 style="margin:0">Practice exam</h3><div class="muted">${EXAM_BANK.length} questions · topic-scored · builds your readiness</div></div>
      <button class="btn btn-primary" id="startQuiz">Start practice exam</button>
    </div>
    ${last?`<div class="note" style="margin-top:10px">Last attempt: <strong>${last.score}%</strong> (${last.correct}/${last.total}) · ${new Date(last.created_at).toLocaleDateString()}</div>`:""}
    <div id="quizArea" style="margin-top:16px"></div>
  </div>`;
  const sb = el("sched"); if (sb) sb.onclick = async () => { await setStage("exam_prep", E.STATUS.COMPLETE, { scheduled:true }); alert("Exam prep marked complete. Next: take your state exam, then record your result on the Journey."); route(); };
  el("startQuiz").onclick = () => startQuiz();
}
function readinessMsg(r){ if(r>=85) return "You're looking exam-ready. This is an estimate, not a guarantee — keep your weak areas sharp."; if(r>=60) return "Getting there. Focus on your review areas below, then re-test."; if(r>0) return "Early days. Keep taking practice exams to build readiness."; return "Take your first practice exam to measure your readiness."; }

function startQuiz() {
  QUIZ.active=true; QUIZ.idx=0; QUIZ.answers=[]; QUIZ.qs = shuffle([...EXAM_BANK]).slice(0, EXAM_BANK.length);
  drawQuiz();
}
function drawQuiz() {
  const area = el("quizArea");
  if (QUIZ.idx >= QUIZ.qs.length) return finishQuiz();
  const q = QUIZ.qs[QUIZ.idx];
  area.innerHTML = `<div class="muted" style="margin-bottom:6px">Question ${QUIZ.idx+1} of ${QUIZ.qs.length} · ${esc(q.topic)}</div>
    <h3 style="margin-top:0">${esc(q.q)}</h3>
    <div id="qopts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>`;
  area.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.i);
    QUIZ.answers.push({ topic:q.topic, correct: i===q.answer });
    QUIZ.idx++; drawQuiz();
  });
}
async function finishQuiz() {
  const total = QUIZ.qs.length;
  const correct = QUIZ.answers.filter(a=>a.correct).length;
  const score = Math.round((correct/total)*100);
  const tb = {};
  QUIZ.answers.forEach(a=>{ tb[a.topic]=tb[a.topic]||{correct:0,total:0}; tb[a.topic].total++; if(a.correct) tb[a.topic].correct++; });
  await supabase.from("exam_attempts").insert({ user_id:S.user.id, kind:"practice", score, total, correct, topic_breakdown:tb });
  await audit("practice_exam", null, `${score}%`, { correct, total });
  QUIZ.active=false;
  await loadAll();
  route();
  setTimeout(()=>{ const a=el("quizArea"); if(a){ a.scrollIntoView({behavior:"smooth"}); } }, 60);
}

/* ---------------- DOCUMENTS ---------------- */
async function setDoc(key, status, note){
  const d = S.documents.find(x=>x.doc_key===key);
  await supabase.from("documents").upsert({ user_id:S.user.id, doc_key:key, label:d?.label||key, status, note:note||d?.note||null, updated_at:new Date().toISOString() }, { onConflict:"user_id,doc_key" });
  await loadAll();
}
function renderDocuments(m) {
  const rows = S.documents.length ? S.documents : [];
  const statusBadge = { required:'<span class="badge b-amber">Required</span>', requested:'<span class="badge b-amber">Requested</span>', uploaded:'<span class="badge b-blue">Uploaded</span>', accepted:'<span class="badge b-green">Accepted</span>', rejected:'<span class="badge b-red">Rejected</span>', expired:'<span class="badge b-red">Expired</span>', na:'<span class="badge b-gray">N/A</span>' };
  content.innerHTML = `
  <div class="panel"><h3 style="margin-top:0">Your documents</h3>
    <p class="muted" style="margin-top:0">Everything the state needs, why it's needed, and its status.</p>
    <table class="tbl"><thead><tr><th>Document</th><th>Why it's needed</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(d=>`<tr><td><strong>${esc(d.label)}</strong></td><td class="muted">${esc(docWhy(d.doc_key))}</td><td>${statusBadge[d.status]||d.status}</td>
      <td>${d.status==="required"||d.status==="requested"?`<button class="btn btn-ghost btn-sm" data-up="${esc(d.doc_key)}">Mark uploaded</button>`:d.status==="uploaded"?`<span class="note">Pending review</span>`:""}</td></tr>`).join("")}
    </tbody></table>
    <div class="locknote" style="margin-top:16px"><span>ℹ️</span><div>Document uploads are simulated in this demo. In production, files upload to secure storage and are reviewed by your licensing team.</div></div>
  </div>`;
  content.querySelectorAll("[data-up]").forEach(b=>b.onclick=async()=>{ await setDoc(b.dataset.up,"uploaded"); route(); });
}
function docWhy(k){ return { id:"Confirms your identity for the state application.", edu_cert:"Proves you completed required pre-licensing education.", fingerprint:"Required for your state background check.", exam_result:"Documents that you passed the state exam." }[k]||"Required for your application."; }

/* ---------------- LICENSING STATUS ---------------- */
function renderStatus(m) {
  const j = E.deriveJourney(S.workflow, S.reqStatus, S.currentStep);
  const licensed = S.reqStatus.licensed === E.STATUS.COMPLETE;
  const reviewing = S.reqStatus.review === E.STATUS.WAITING;
  content.innerHTML = `
  <div class="panel ${licensed?'':''}">
    <h3 style="margin-top:0">Application &amp; licensing status</h3>
    ${licensed?`<div class="nextstep" style="background:linear-gradient(120deg,#0f7a37,#16a34a)"><div class="k">Congratulations</div><h2>You're licensed 🎉</h2><p class="why">Your ${esc(S.workflow.licenseType)} license in ${esc(S.workflow.stateName)} has been issued. Welcome — you did this.</p></div>`
    : reviewing?`<div class="nextstep waiting"><div class="k">Current status</div><h2>The state is reviewing your application</h2><p class="why">Your application has been submitted. There's nothing you need to do right now — we'll update you the moment your status changes.</p></div>`
    : `<p class="muted">Complete your prerequisites to submit your application. Track everything here.</p>`}
  </div>
  <div class="panel"><h3 style="margin-top:0">Requirement checklist</h3>
    ${j.filter(x=>x.key!=="profile").map(x=>`<div class="hl"><span>${esc(x.label)}</span>${{complete:'<span class="badge b-green">Complete</span>',current:'<span class="badge b-blue">In progress</span>',waiting:'<span class="badge b-amber">Waiting on state</span>',locked:'<span class="badge b-gray">Not yet</span>',action_required:'<span class="badge b-amber">Action needed</span>'}[x.status]||`<span class="badge b-gray">${x.status}</span>`}</div>`).join("")}
  </div>`;
}

/* ---------------- CONCIERGE ---------------- */
const CHAT = { msgs: [] };
function renderConcierge(m) {
  content.innerHTML = `
  <div class="panel chat">
    <div class="suggest">
      <button data-q="What do I need to do next?">What do I need to do next?</button>
      <button data-q="How close am I to being licensed?">How close am I?</button>
      <button data-q="What documents do I still need?">Documents I still need?</button>
      <button data-q="Am I ready for my exam?">Am I exam ready?</button>
      <button data-q="How many education hours do I need?">Education hours?</button>
    </div>
    <div class="msgs" id="msgs"></div>
    <div class="chat-in"><input id="ask" placeholder="Ask anything about your licensing…"/><button class="btn btn-primary" id="send">Send</button></div>
  </div>`;
  if (!CHAT.msgs.length) pushBot(`Hi ${esc(S.profile.full_name?.split(" ")[0]||"there")} — I'm your licensing concierge. I know your ${esc(S.workflow.licenseType)} path in ${esc(S.workflow.stateName)} and exactly where you are. Ask me anything.`);
  else paintChat();
  const send = () => { const v = el("ask").value.trim(); if (!v) return; el("ask").value=""; pushMe(v); setTimeout(()=>answer(v, m), 250); };
  el("send").onclick = send;
  el("ask").addEventListener("keydown", e=>{ if(e.key==="Enter") send(); });
  content.querySelectorAll(".suggest button").forEach(b=>b.onclick=()=>{ pushMe(b.dataset.q); setTimeout(()=>answer(b.dataset.q, m),250); });
}
function pushBot(html, src){ CHAT.msgs.push({who:"bot",html,src}); paintChat(); }
function pushMe(t){ CHAT.msgs.push({who:"me",html:esc(t)}); paintChat(); }
function paintChat(){ const c=el("msgs"); if(!c) return; c.innerHTML=CHAT.msgs.map(mm=>`<div class="msg ${mm.who}">${mm.html}${mm.src?`<span class="src">⚠︎ ${esc(mm.src)}</span>`:""}</div>`).join(""); c.scrollTop=c.scrollHeight; }

function answer(qRaw, m) {
  const q = qRaw.toLowerCase();
  const na = E.nextAction({ workflow:S.workflow, reqStatus:S.reqStatus, learning:m.learning, readiness:m.readiness, documents:S.documents });
  const verify = `Sample data — verify with the ${esc(S.workflow.stateName)} Department of Insurance / NIPR.`;
  // waiting on state
  if (S.reqStatus.review === E.STATUS.WAITING && /(status|waiting|application|how long|next)/.test(q)) {
    return pushBot(`Your application is <strong>with the state for review</strong>. You've completed your education, exam, and application. <strong>There's nothing you need to do right now</strong> — I'll surface your next step here the moment your status changes.`);
  }
  if (/next|what.*do|what.*next/.test(q)) {
    return pushBot(`Your single next step is: <strong>${esc(na.title)}</strong>. ${esc(na.why)} ${na.cta?`<br><a href="${na.route}">${esc(na.cta)} →</a>`:""}`);
  }
  if (/close|how far|progress|almost/.test(q)) {
    return pushBot(`You're <strong>${m.licensing}% through your licensing requirements</strong> (learning ${m.learning}%, exam readiness ${m.readiness}%). Your current step is <strong>${esc(E.STAGES.find(s=>s.key===S.currentStep)?.label||S.currentStep)}</strong>.`);
  }
  if (/document|upload|paperwork|fingerprint/.test(q)) {
    const need = S.documents.filter(d=>d.status==="required"||d.status==="requested");
    if (!need.length) return pushBot(`You have <strong>no outstanding documents</strong> right now. 🎉`);
    return pushBot(`You still need: ${need.map(d=>`<strong>${esc(d.label)}</strong>`).join(", ")}. <br><a href="#/documents">Open Documents →</a>`);
  }
  if (/exam ready|ready.*exam|am i ready|pass/.test(q)) {
    const ins = E.topicInsights(S.attempts);
    const weak = ins.weak.map(w=>w.topic).join(", ");
    return pushBot(`Your exam readiness is <strong>${m.readiness}%</strong>. ${m.readiness>=85?"That's a strong estimate — but it's an estimate, not a guarantee.":"Aim for 85%+ before scheduling."} ${weak?`Focus your review on: <strong>${esc(weak)}</strong>.`:"Take a practice exam to pinpoint weak areas."} <br><a href="#/readiness">Open Exam Readiness →</a>`);
  }
  if (/hour|education|pre-?licens|how many/.test(q)) {
    return pushBot(`For ${esc(S.workflow.licenseType)} in ${esc(S.workflow.stateName)}, the sample requirement is <strong>${S.workflow.detail.preLicensingHours} hours</strong> of pre-licensing education. You're ${m.learning}% through the coursework.`, verify);
  }
  if (/fee|cost|price|how much/.test(q)) {
    return pushBot(`Exact licensing fees vary by state and change over time. I don't want to give you a number I can't verify right now.`, verify);
  }
  if (/(florida|texas|california|new york|another state|different state|non-?resident)/.test(q)) {
    return pushBot(`Licensing in another state follows its own path — resident vs. non-resident status, education, exam, and reciprocity all differ. I can build that path once we add the state, but I won't invent its specific requirements.`, verify);
  }
  if (/exam.*schedule|schedule.*exam|when.*exam/.test(q)) {
    return pushBot(`You schedule the exam once your readiness is strong (85%+). You're at ${m.readiness}%. The sample exam is the <strong>${esc(S.workflow.detail.examName)}</strong> via ${esc(S.workflow.detail.examProvider)}.`, verify);
  }
  return pushBot(`I can help with your next step, your progress, documents, exam readiness, and your ${esc(S.workflow.stateName)} ${esc(S.workflow.licenseType)} path. For specific state rules (hours, fees, deadlines), I'll always point you to verify with the state so you get accurate information. What would you like to know?`);
}

/* ---------------- LOCK ---------------- */
function renderLock(g) {
  content.innerHTML = `<div class="panel"><div class="locknote"><span style="font-size:1.3rem">🔒</span>
    <div><strong>${esc(g.what)} isn't available yet.</strong>
      <p class="muted" style="margin:.4rem 0 0">${esc(g.why)}</p>
      <a href="${g.goto}" class="btn btn-primary btn-sm" style="margin-top:12px">${esc(g.gotoLabel||"Go there")}</a>
    </div></div></div>`;
}

/* ---------------- utils ---------------- */
function card(t){ return `<div class="panel">${esc(t)}</div>`; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(i*7+3)%(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
