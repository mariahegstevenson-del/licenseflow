/* ============================================================
   LicenseFlow — flow engine
   Requirement config, validation statuses, dependency gates,
   military pathway + confidence, progress, and next-step logic.
   Extends states.js (per-state links + instructions).
   ============================================================ */
import { STATES, buildWalkthrough } from "./states.js";

/* ---------------- status vocabulary ---------------- */
export const ST = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  UPLOADED: "document_uploaded",
  PENDING: "pending_review",
  VERIFIED: "verified",
  SYSTEM_VERIFIED: "system_verified",
  ADMIN_VERIFIED: "admin_verified",
  REJECTED: "rejected",
  ACTION: "action_required",
  NA: "not_applicable",
  COMPLETE: "complete",
};
export const STATUS_LABEL = {
  not_started:"Not started", in_progress:"In progress", submitted:"Submitted",
  document_uploaded:"Document uploaded", pending_review:"Pending review",
  verified:"Verified", system_verified:"System verified", admin_verified:"Admin verified",
  rejected:"Rejected", action_required:"Action required", not_applicable:"Not applicable",
  complete:"Complete",
};
export const STATUS_CLASS = {
  not_started:"s-gray", in_progress:"s-blue", submitted:"s-blue", document_uploaded:"s-blue",
  pending_review:"s-amber", verified:"s-green", system_verified:"s-green", admin_verified:"s-green",
  rejected:"s-red", action_required:"s-amber", not_applicable:"s-gray", complete:"s-green",
};
const DONE = new Set([ST.VERIFIED, ST.SYSTEM_VERIFIED, ST.ADMIN_VERIFIED, ST.COMPLETE, ST.NA]);
export const isDone = (s) => DONE.has(s);

/* ---------------- requirement configs ----------------
   verify: 'auto'  -> complete once required fields (+doc) are present
           'admin' -> submitted/pending until an admin verifies
   phase:  prepare | exam | application | license | agency | contracting
   category: 'state' | 'agency'
------------------------------------------------------- */
export const REQS = [
  { key:"education", label:"Pre-Licensing Education", short:"Education", category:"state", phase:"prepare", verify:"auto",
    desc:"Purchase and complete your state pre-licensing education.",
    fields:[
      {name:"provider",label:"Provider",type:"text",required:true},
      {name:"purchase_date",label:"Purchase date",type:"date",required:true},
      {name:"completion_date",label:"Completion date",type:"date"},
    ], doc:{label:"Certificate / proof of purchase",required:true},
    dependsOn:[], required_for:["exam","application","licensing"] },

  { key:"exam_schedule", label:"Exam Schedule", short:"Exam schedule", category:"state", phase:"exam", verify:"auto",
    desc:"Register for and schedule your state examination.",
    fields:[
      {name:"exam_type",label:"Exam type",type:"select",options:["Life","Life & Health","Health"],required:true},
      {name:"exam_date",label:"Exam date",type:"date",required:true},
      {name:"exam_time",label:"Exam time",type:"time"},
      {name:"provider",label:"Exam provider",type:"text",required:true},
    ], doc:{label:"Scheduling confirmation",required:true},
    dependsOn:["education"], required_for:["exam","application"] },

  { key:"exam_passed", label:"Exam Result", short:"Exam result", category:"state", phase:"exam", verify:"auto",
    desc:"Record your exam result once you've taken it.",
    fields:[
      {name:"result",label:"Result",type:"select",options:["Passed","Not yet"],required:true},
      {name:"pass_date",label:"Date taken",type:"date"},
    ], doc:{label:"Score report (if provided)",required:false},
    dependsOn:["exam_schedule"], required_for:["application"] },

  { key:"fingerprinting", label:"Fingerprints & Background", short:"Fingerprinting", category:"state", phase:"application", verify:"auto",
    desc:"Complete your state-required fingerprinting and background check.",
    fields:[ {name:"date",label:"Date completed",type:"date",required:true} ],
    doc:{label:"Fingerprint / background receipt",required:true},
    dependsOn:["education"], required_for:["application","licensing"], conditional:"fingerprinting" },

  { key:"nipr_application", label:"NIPR Application", short:"Application", category:"state", phase:"application", verify:"admin",
    desc:"Submit your license application through NIPR.",
    fields:[
      {name:"application_date",label:"Application date",type:"date",required:true},
      {name:"license_type",label:"License type",type:"text",required:true},
      {name:"confirmation_ref",label:"Confirmation / reference number",type:"text"},
    ], doc:{label:"Application confirmation",required:false},
    dependsOn:["exam_passed"], required_for:["licensing","agency_onboarding"] },

  { key:"license_info", label:"License Information", short:"License", category:"state", phase:"license", verify:"admin",
    desc:"Record your license details once the state issues your license.",
    fields:[
      {name:"license_number",label:"License number",type:"text",required:true},
      {name:"effective_date",label:"Effective date",type:"date"},
      {name:"expiration_date",label:"Expiration date",type:"date"},
      {name:"lines",label:"Lines of authority",type:"text"},
    ], doc:{label:"License document (optional)",required:false},
    dependsOn:["nipr_application"], required_for:["agency_onboarding","contracting"] },

  { key:"npn", label:"National Producer Number", short:"NPN", category:"state", phase:"license", verify:"admin",
    desc:"Record your NPN. We run a basic format check; regulatory verification is separate.",
    fields:[ {name:"npn",label:"NPN",type:"text",required:true} ],
    doc:{label:null,required:false},
    dependsOn:["nipr_application"], required_for:["contracting"] },

  { key:"eo", label:"Errors & Omissions Insurance", short:"E&O", category:"agency", phase:"agency", verify:"admin",
    desc:"Provide your E&O insurance certificate and policy details.",
    fields:[
      {name:"carrier",label:"Carrier",type:"text",required:true},
      {name:"policy_number",label:"Policy number",type:"text",required:true},
      {name:"effective_date",label:"Effective date",type:"date"},
      {name:"expiration_date",label:"Expiration date",type:"date"},
      {name:"named_insured",label:"Named insured",type:"text"},
    ], doc:{label:"E&O certificate",required:true},
    dependsOn:[], required_for:["contracting","field_activity"] },

  { key:"agency_docs", label:"Agency Onboarding Documents", short:"Agency docs", category:"agency", phase:"agency", verify:"admin",
    desc:"Complete and upload the agency's onboarding documentation.",
    fields:[ {name:"acknowledged",label:"I have completed the agency onboarding documents",type:"check",required:true} ],
    doc:{label:"Signed onboarding documents",required:true},
    dependsOn:[], required_for:["contracting"] },

  { key:"contracting", label:"Carrier Contracting", short:"Contracting", category:"agency", phase:"contracting", verify:"admin",
    desc:"Complete carrier contracting through SureLC.",
    fields:[ {name:"submitted_date",label:"Date submitted",type:"date"} ],
    doc:{label:"Contracting confirmation (optional)",required:false},
    dependsOn:["license_info","eo","agency_docs"], required_for:["field_activity"] },
];

export const REQ_BY_KEY = Object.fromEntries(REQS.map(r => [r.key, r]));

/* link/instructions come from the per-state walkthrough data */
const WALK_KEY = { education:"study_material", exam_schedule:"exam_registration", fingerprinting:"fingerprinting",
  nipr_application:"state_app", eo:"eo", contracting:"surelc" };

export function buildJourney(code) {
  const w = buildWalkthrough(code);
  if (!w) return null;
  const links = {};
  w.steps.forEach(s => { links[s.key] = { link:s.link, instructions:s.instructions||null, video:s.video||null, provider:w.provider, note:s.note||null }; });
  const hasFp = !!(STATES[code] && (STATES[code].fp || STATES[code].fpNote));
  const reqs = REQS
    .filter(r => r.conditional !== "fingerprinting" || hasFp)
    .map(r => {
      const wk = WALK_KEY[r.key];
      const extra = wk && links[wk] ? links[wk] : {};
      return { ...r, ...extra, misc: r.key==="fingerprinting" ? (w.misc||null) : null };
    });
  return { state: w.state, code, misc: w.misc, reqs };
}

/* ---------------- status computation ---------------- */
// instances: rows from requirement_instances [{requirement_key,status,meta}]
export function statusMap(instances) {
  const m = {};
  instances.forEach(r => { m[r.requirement_key] = { status:r.status, meta:r.meta||{} }; });
  return m;
}
export function reqStatus(key, sm) { return sm[key]?.status || ST.NOT_STARTED; }

// Given a requirement's config + entered meta + whether a doc exists, compute the
// status the agent's submission should move to (before any admin action).
export function submissionStatus(req, meta, hasDoc) {
  const need = (req.fields || []).filter(f => f.required);
  const filled = need.every(f => meta && meta[f.name] != null && meta[f.name] !== "" && meta[f.name] !== false);
  const docOk = !req.doc?.required || hasDoc;
  if (!filled && !docOk) return ST.IN_PROGRESS;
  if (!filled || !docOk) return ST.IN_PROGRESS;
  // special: exam_passed "Not yet" stays in progress
  if (req.key === "exam_passed" && meta.result !== "Passed") return ST.IN_PROGRESS;
  if (req.verify === "auto") return ST.COMPLETE;
  return ST.PENDING; // admin verification required
}

/* ---------------- dependency gate ---------------- */
export function gate(req, sm) {
  const missing = (req.dependsOn || []).filter(dep => !isDone(reqStatus(dep, sm)));
  return missing.length ? { blocked:true, missing } : { blocked:false };
}

/* ---------------- next step ---------------- */
export function nextStep(journey, sm) {
  for (const r of journey.reqs) {
    const s = reqStatus(r.key, sm);
    if (isDone(s)) continue;
    if (s === ST.PENDING) continue; // waiting on review, not actionable
    const g = gate(r, sm);
    if (g.blocked) continue;
    return { type:"do", req:r, status:s };
  }
  // anything pending review?
  const pending = journey.reqs.find(r => reqStatus(r.key, sm) === ST.PENDING);
  if (pending) return { type:"waiting", req:pending };
  // rejected?
  const rej = journey.reqs.find(r => reqStatus(r.key, sm) === ST.REJECTED || reqStatus(r.key, sm) === ST.ACTION);
  if (rej) return { type:"do", req:rej, status:reqStatus(rej.key, sm) };
  return { type:"done" };
}

/* ---------------- progress dimensions ---------------- */
function pct(keys, sm) {
  if (!keys.length) return 0;
  const done = keys.filter(k => isDone(reqStatus(k, sm))).length;
  return Math.round(done / keys.length * 100);
}
export function progress(journey, sm) {
  const keys = journey.reqs.map(r => r.key);
  const stateKeys = journey.reqs.filter(r => r.category === "state").map(r => r.key);
  const agencyKeys = journey.reqs.filter(r => r.category === "agency" && r.key !== "contracting").map(r => r.key);
  const docKeys = journey.reqs.filter(r => r.doc && r.doc.label).map(r => r.key);
  const learnKeys = ["education","exam_schedule","exam_passed"].filter(k => keys.includes(k));
  return {
    overall: pct(keys, sm),
    learning: pct(learnKeys, sm),
    licensing: pct(stateKeys, sm),
    documentation: pct(docKeys, sm),
    agency: pct(agencyKeys, sm),
    contracting: journey.reqs.some(r=>r.key==="contracting") ? pct(["contracting"], sm) : 0,
  };
}

/* milestone flags */
export function milestones(journey, sm) {
  const licensed = isDone(reqStatus("license_info", sm));
  const contractingReady = ["license_info","eo","agency_docs","npn"].every(k => !journey.reqs.some(r=>r.key===k) || isDone(reqStatus(k, sm)));
  const contracted = isDone(reqStatus("contracting", sm));
  const fieldReady = journey.reqs.filter(r => (r.required_for||[]).includes("field_activity")).every(r => isDone(reqStatus(r.key, sm)));
  return { licensed, contractingReady: licensed && contractingReady, contracted, fieldReady: licensed && fieldReady };
}

/* ============================================================
   MILITARY PATHWAY + CONFIDENCE
   Sample logic — not authoritative. Determines the designated
   licensing state and a confidence level.
   ============================================================ */
export function determinePathway(p) {
  if (!p.military) {
    const st = p.state || p.intended_state;
    if (st && STATES[st]) return { designated: st, confidence: "high" };
    return { designated: null, confidence: "low", exception: "No supported resident state on file." };
  }
  // military
  const duty = p.duty_station, dom = p.domicile_state, intended = p.intended_state;
  if (intended) {
    if (STATES[intended]) return { designated: intended, confidence: "high" };
    return { designated: null, confidence: "low", exception: `Intended licensing state (${intended}) is not yet supported — needs review.` };
  }
  if (duty && dom && duty === dom) {
    return STATES[dom] ? { designated: dom, confidence: "high" } : { designated:null, confidence:"low", exception:"Home state not supported." };
  }
  if (duty && dom && duty !== dom) {
    return { designated: null, confidence: "medium", needQuestion: true, options: { duty, dom } };
  }
  return { designated: null, confidence: "low", exception: "Insufficient information to determine licensing state." };
}

export function militaryTestingNote(code) {
  const w = buildWalkthrough(code);
  const prov = w?.provider;
  if (!prov) return null;
  const label = { pearson:"Pearson VUE", psi:"PSI", prometric:"Prometric" }[prov] || "your exam provider";
  return `Active-duty service members may have access to on-base or alternative testing options through ${label}. This does not change your licensing state — confirm eligibility with your exam provider and installation.`;
}
