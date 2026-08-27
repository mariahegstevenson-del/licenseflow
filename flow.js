/* ============================================================
   LicenseFlow — flow engine (state-aware, minimal data entry)
   The system owns configuration (state, license, exam provider,
   URLs). The agent only provides personal/action data.
   ============================================================ */
import { STATES, buildWalkthrough, examProvider, PROVIDER_LABEL } from "./states.js?v=10";

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
  { key:"study_material", label:"Study Materials", short:"Study Materials", verify:"auto",
    doneLabel:"Purchased",
    render:"action", linkKey:"study_material", providerLabel:"Xcel Solutions",
    heading:"Purchase your pre-licensing study material",
    /* Buying it is the whole of this step. Finishing the course is not a
       prerequisite for scheduling the exam, and saying otherwise costs
       agents weeks -- exam slots are booked out further than the course
       takes to study. */
    lead:"Buy your state-approved Life & Health course. As soon as it's purchased you can go and schedule your exam \u2014 you don't have to finish the course first.",
    fields:[{name:"purchase_date",label:"Study material purchase date",type:"date",required:true}],
    dependsOn:[] },

  { key:"exam", label:"Exam", short:"Exam", doneLabel:"Scheduled", verify:"auto",
    render:"exam", linkKey:"exam_registration",
    heading:"Schedule your exam",
    dependsOn:["study_material"] },

  { key:"nipr_application", label:"NIPR Application", short:"NIPR Application", verify:"auto",
    render:"action", linkKey:"state_app", providerLabel:"NIPR",
    heading:"Submit your license application",
    lead:"Apply for your license through NIPR.",
    fields:[{name:"application_date",label:"NIPR application date",type:"date",required:true}],
    dependsOn:["exam"] },

  { key:"license_number", label:"License Number", short:"License Number", verify:"admin",
    render:"generic",
    heading:"Enter your license number",
    lead:"Once the state issues your license, enter your license number below. We'll verify it.",
    help:{ title:"How to find your license number", body:"Your license number is typically provided by your state's insurance department — through email, official correspondence, your license documentation, or the state's official license lookup system." },
    fields:[{name:"license_number",label:"License number",type:"text",required:true}],
    dependsOn:["nipr_application"] },

  { key:"npn", label:"NPN", short:"NPN", verify:"admin",
    render:"generic",
    heading:"Enter your National Producer Number",
    lead:"Your NPN is assigned when your license is processed. Enter it below and we'll verify it.",
    help:{ title:"How to find your NPN", body:"Your National Producer Number (NPN) is assigned by the NAIC. You can look it up on the official NIPR site using your name and state." },
    lookupUrl:"https://nipr.com/licensing-center/look-up-a-national-producer-number", lookupLabel:"Look up my NPN",
    fields:[{name:"npn",label:"NPN",type:"text",required:true}],
    dependsOn:["license_number"] },

  { key:"continuing_education", label:"Continuing Education", short:"Continuing Education", verify:"admin",
    render:"ce", linkKey:"success_ce",
    heading:"Complete your continuing education",
    lead:"Add each continuing-education certificate. You can add as many as you need.",
    dependsOn:["npn"] },

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
  const label = PROVIDER_LABEL[prov] || "your exam provider";
  return { url:s.exam, providerLabel:label, provider:prov, examTitle:`${s.name} ${license} Insurance Examination` };
}

/* Which playbook section supplies each agent-facing requirement. */
const PLAYBOOK_KEY = {
  study_material:"study", exam:"exam", nipr_application:"state_app",
  continuing_education:"ce", eo:"eo",
};

/* `playbook` is the resolved state playbook -- the agency's overrides on
   top of the LicenseFlow master on top of the built-in defaults. Passing
   nothing gives exactly the old behaviour, which is what keeps the
   registration screens working before a profile has an agency. */
export function buildJourney(code, playbook) {
  const w = buildWalkthrough(code);
  if (!w) return null;
  const links = {};
  w.steps.forEach(s => { links[s.key] = { link:s.link, instructions:s.instructions||null, video:s.video||null }; });
  const reqs = REQS.map(r => {
    const wk = WALK_KEY[r.key]; const ex = wk && links[wk] ? links[wk] : {};
    const out = { ...r, link:ex.link||null, instructions:ex.instructions||null,
                  video:(ex.video!==undefined?ex.video:null) };

    const pb = playbook && playbook[PLAYBOOK_KEY[r.key]];
    if (pb) {
      /* Only override what the playbook actually carries. An agency that
         changed one link keeps every other default, including the
         provider-specific instructions. */
      if (pb.url) out.link = pb.url;
      if (pb.vendor) out.providerLabel = pb.vendor;
      if (Array.isArray(pb.steps) && pb.steps.length) out.instructions = pb.steps;
      if (pb.note) out.stateNote = pb.note;
      if (r.key === "exam" && pb.exam_name) out.examName = pb.exam_name;
    }
    return out;
  });
  return { state:w.state, code, reqs, playbook: playbook || null };
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
/* Has the agent done everything that is theirs to do? True when every
   requirement is either finished or sitting with the team for review --
   the moment their part is over, even though the file is not yet
   cleared. Worth marking: it is the only point where somebody has
   genuinely finished, and the product should say so. */
export function allSubmitted(journey, sm){
  if (!journey) return false;
  return journey.reqs.every(r => {
    const s = reqStatus(r.key, sm);
    return isDone(s) || s === ST.PENDING;
  });
}

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
  const label = PROVIDER_LABEL[prov] || "your exam provider";
  return `Active-duty service members may have access to on-base or alternative testing options through ${label}. This does not change your licensing state — confirm eligibility with your exam provider and installation.`;
}
