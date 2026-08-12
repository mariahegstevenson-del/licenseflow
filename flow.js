/* ============================================================
   LicenseFlow — flow engine (state-aware, minimal data entry)
   The system owns configuration (state, license, exam provider,
   URLs). The agent only provides personal/action data.
   ============================================================ */
import { STATES, buildWalkthrough, examProvider } from "./states.js?v=5";

/* ---------------- status vocabulary ---------------- */
export const ST = {
  NOT_STARTED:"not_started", IN_PROGRESS:"in_progress", SUBMITTED:"submitted",
  UPLOADED:"document_uploaded", PENDING:"pending_review", VERIFIED:"verified",
  SYSTEM_VERIFIED:"system_verified", ADMIN_VERIFIED:"admin_verified",
  REJECTED:"rejected", ACTION:"action_required", NA:"not_applicable", COMPLETE:"complete",
};
export const STATUS_LABEL = {
  not_started:"Not started", in_progress:"In progress", submitted:"Submitted",
  document_uploaded:"Uploaded", pending_review:"Pending review", verified:"Verified",
  system_verified:"System verified", admin_verified:"Verified", rejected:"Rejected",
  action_required:"Action required", not_applicable:"Not applicable", complete:"Complete",
};
export const STATUS_CLASS = {
  not_started:"s-gray", in_progress:"s-blue", submitted:"s-blue", document_uploaded:"s-blue",
  pending_review:"s-amber", verified:"s-green", system_verified:"s-green", admin_verified:"s-green",
  rejected:"s-red", action_required:"s-amber", not_applicable:"s-gray", complete:"s-green",
};
const DONE = new Set([ST.VERIFIED, ST.SYSTEM_VERIFIED, ST.ADMIN_VERIFIED, ST.COMPLETE, ST.NA]);
export const isDone = (s) => DONE.has(s);

/* ---------------- requirements (unified journey) ----------------
   The agent-facing order. No state/agency taxonomy is exposed.
   verify: 'auto' completes on valid agent input; 'admin' waits for review.
   render: special page type ('exam' | 'ce' | 'eo'); else generic.
   linkKey: which per-state URL (from states.js) to open.
------------------------------------------------------------------ */
export const REQS = [
  { key:"study_material", label:"Study Material", short:"Study Material", verify:"auto",
    render:"action", linkKey:"study_material", providerLabel:"Xcel Solutions",
    heading:"Purchase your pre-licensing study material",
    lead:"Purchase and begin your state-approved Life & Health course.",
    fields:[{name:"purchase_date",label:"Study material purchase date",type:"date",required:true}],
    dependsOn:[] },

  { key:"exam", label:"Exam", short:"Exam", doneLabel:"Scheduled", verify:"auto",
    render:"exam", linkKey:"exam_registration",
    heading:"Schedule your exam",
    dependsOn:["study_material"] },

  { key:"nipr_application", label:"Application", short:"Application", verify:"auto",
    render:"action", linkKey:"state_app", providerLabel:"NIPR",
    heading:"Submit your license application",
    lead:"Apply for your license through NIPR.",
    fields:[{name:"application_date",label:"NIPR application date",type:"date",required:true}],
    dependsOn:["exam"] },

  { key:"license", label:"License Information", short:"License", verify:"admin",
    render:"generic",
    heading:"Record your license information",
    lead:"Once the state issues your license, enter your details below. We'll verify them.",
    fields:[
      {name:"license_number",label:"License number",type:"text",required:true},
      {name:"npn",label:"National Producer Number (NPN)",type:"text",required:true},
    ], dependsOn:["nipr_application"] },

  { key:"continuing_education", label:"Continuing Education", short:"Continuing Education", verify:"admin",
    render:"ce", linkKey:"success_ce",
    heading:"Complete your continuing education",
    lead:"Add each continuing-education certificate. You can add as many as you need.",
    dependsOn:["license"] },

  { key:"eo", label:"Errors & Omissions", short:"E&O", verify:"admin",
    render:"eo", linkKey:"eo",
    heading:"Upload your E&O certificate",
    lead:"Upload your Errors & Omissions insurance certificate.",
    fields:[
      {name:"carrier",label:"Carrier (optional)",type:"text"},
      {name:"policy_number",label:"Policy number (optional)",type:"text"},
    ], doc:{label:"E&O certificate",required:true},
    dependsOn:["continuing_education"] },
];
export const REQ_BY_KEY = Object.fromEntries(REQS.map(r => [r.key, r]));

const WALK_KEY = { study_material:"study_material", exam:"exam_registration",
  nipr_application:"state_app", continuing_education:"success_ce", eo:"eo" };

/* ---------------- system configuration for a state/license ---------------- */
export function examInfo(code, license) {
  const s = STATES[code]; if (!s) return null;
  const prov = examProvider(s.exam);
  const label = { pearson:"Pearson VUE", psi:"PSI", prometric:"Prometric" }[prov] || "your exam provider";
  return { url:s.exam, providerLabel:label, provider:prov, examTitle:`${s.name} ${license} Insurance Examination` };
}

export function buildJourney(code) {
  const w = buildWalkthrough(code);
  if (!w) return null;
  const links = {};
  w.steps.forEach(s => { links[s.key] = { link:s.link, instructions:s.instructions||null, video:s.video||null }; });
  const reqs = REQS.map(r => {
    const wk = WALK_KEY[r.key]; const ex = wk && links[wk] ? links[wk] : {};
    return { ...r, link:ex.link||null, instructions:ex.instructions||null, video:(ex.video!==undefined?ex.video:null) };
  });
  return { state:w.state, code, reqs };
}

/* ---------------- status computation ---------------- */
export function statusMap(instances){ const m={}; instances.forEach(r=>{ m[r.requirement_key]={status:r.status, meta:r.meta||{}}; }); return m; }
export function reqStatus(key, sm){ return sm[key]?.status || ST.NOT_STARTED; }

export function submissionStatus(req, meta, hasDoc){
  const need = (req.fields||[]).filter(f=>f.required);
  const filled = need.every(f => meta && meta[f.name]!=null && meta[f.name]!=="" && meta[f.name]!==false);
  const docOk = !req.doc?.required || hasDoc;
  if (!filled || !docOk) return ST.IN_PROGRESS;
  return req.verify==="auto" ? ST.COMPLETE : ST.PENDING;
}

/* ---------------- dependency gate ---------------- */
export function gate(req, sm){
  const missing = (req.dependsOn||[]).filter(dep => !isDone(reqStatus(dep, sm)));
  return missing.length ? { blocked:true, missing } : { blocked:false };
}

/* ---------------- next step ---------------- */
export function nextStep(journey, sm){
  for (const r of journey.reqs){
    const s = reqStatus(r.key, sm);
    if (isDone(s)) continue;
    if (s===ST.PENDING) continue;
    if (gate(r, sm).blocked) continue;
    return { type:"do", req:r, status:s };
  }
  const pending = journey.reqs.find(r => reqStatus(r.key, sm)===ST.PENDING);
  if (pending) return { type:"waiting", req:pending };
  return { type:"done" };
}

/* ---------------- progress (single, real) ---------------- */
export function progress(journey, sm){
  const keys = journey.reqs.map(r=>r.key);
  const done = keys.filter(k=>isDone(reqStatus(k,sm))).length;
  return { overall: keys.length ? Math.round(done/keys.length*100) : 0, done, total: keys.length };
}

/* ============================================================
   MILITARY PATHWAY + CONFIDENCE (unchanged behavior)
   ============================================================ */
export function determinePathway(p){
  if (!p.military){
    const st = p.state || p.intended_state;
    if (st && STATES[st]) return { designated:st, confidence:"high" };
    return { designated:null, confidence:"low", exception:"No supported resident state on file." };
  }
  const duty=p.duty_station, dom=p.domicile_state, intended=p.intended_state;
  if (intended){
    if (STATES[intended]) return { designated:intended, confidence:"high" };
    return { designated:null, confidence:"low", exception:`Intended licensing state (${intended}) is not yet supported — needs review.` };
  }
  if (duty && dom && duty===dom) return STATES[dom] ? { designated:dom, confidence:"high" } : { designated:null, confidence:"low", exception:"Home state not supported." };
  if (duty && dom && duty!==dom) return { designated:null, confidence:"medium", needQuestion:true, options:{ duty, dom } };
  return { designated:null, confidence:"low", exception:"Insufficient information to determine licensing state." };
}
export function militaryTestingNote(code){
  const w=buildWalkthrough(code); const prov=w?.provider; if(!prov) return null;
  const label={pearson:"Pearson VUE",psi:"PSI",prometric:"Prometric"}[prov]||"your exam provider";
  return `Active-duty service members may have access to on-base or alternative testing options through ${label}. This does not change your licensing state — confirm eligibility with your exam provider and installation.`;
}
