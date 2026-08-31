/* ============================================================
   LicenseFlow — flow engine (state-aware, minimal data entry)
   The system owns configuration (state, license, exam provider,
   URLs). The agent only provides personal/action data.
   ============================================================ */
import { STATES, buildWalkthrough, examProvider, PROVIDER_LABEL,
         stepOrder, SUPPLEMENTAL, STATE_GOTCHA } from "./states.js?v=28";

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
    /* The vendor is not always NIPR -- Georgia applies through Sircon -- so
       the lead does not name one. The playbook supplies the real vendor,
       link and steps for the agent's own state. */
    lead:"Apply for your license, then follow it up until it is issued.",
    fields:[{name:"application_date",label:"NIPR application date",type:"date",required:true}],
    dependsOn:["exam"] },

  { key:"fingerprinting", label:"Fingerprinting", short:"Fingerprints", verify:"admin",
    doneLabel:"Done",
    render:"action", linkKey:"fingerprinting",
    heading:"Get your fingerprints taken",
    lead:"Your state runs a criminal background check and needs your fingerprints on file. Book it, go, and record the date here.",
    fields:[{name:"fingerprint_date",label:"Date completed",type:"date",required:true}],
    doc:{label:"Receipt or confirmation (if you were given one)"},
    dependsOn:[] },

  /* The sheet calls this the affidavit column, but only Georgia's is one.
     The label and the opening line come from the state -- see SUPPLEMENTAL
     in states.js -- so a Kansas agent is asked for a tax clearance rather
     than sent looking for an affidavit that does not exist. */
  { key:"affidavit", label:"Supplemental document", short:"Supplemental", verify:"admin",
    render:"action", linkKey:"affidavit",
    heading:"Your state's supplemental requirement",
    lead:"Your state asks for one more document. Open the link, follow the instructions there, and upload what it gives you.",
    fields:[{name:"affidavit_date",label:"Date completed",type:"date",required:true}],
    doc:{label:"Completed document", required:true},
    dependsOn:[] },

  { key:"license_number", label:"License Number", short:"License Number", verify:"admin",
    render:"generic",
    heading:"Enter your license number",
    lead:"Once the state issues your license, enter your license number below. We'll verify it.",
    /* The waiting is the hard part of this step, so the help says what to
       do during it rather than only where the number turns up. Chasing the
       department daily is what the coordinators actually advise. */
    help:{ title:"How to find your license number", body:"Call your state's department of insurance daily to check where your application has got to — applications sit until somebody asks about them. Once it is approved, ask them for your license number then and there. It also arrives by email or in your license documentation, and appears on the state's license lookup." },
    fields:[{name:"license_number",label:"License number",type:"text",required:true}],
    dependsOn:["nipr_application"] },

  { key:"npn", label:"NPN", short:"NPN", verify:"admin",
    render:"generic",
    heading:"Enter your National Producer Number",
    lead:"Your NPN is assigned when your license is processed. Enter it below and we'll verify it.",
    help:{ title:"How to find your NPN", body:"Your National Producer Number is assigned by the NAIC and shows up about 24 hours after your license is issued — so if you look straight away and find nothing, that is normal. Look it up on the official NIPR site using your name and state." },
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
  nipr_application:"state_app", continuing_education:"success_ce", eo:"eo",
  fingerprinting:"fingerprinting", affidavit:"affidavit" };

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
  fingerprinting:"fingerprinting", affidavit:"affidavit",
};

/* `playbook` is the resolved state playbook -- the agency's overrides on
   top of the LicenseFlow master on top of the built-in defaults. Passing
   nothing gives exactly the old behavior, which is what keeps the
   registration screens working before a profile has an agency. */
export function buildJourney(code, playbook) {
  const w = buildWalkthrough(code);
  if (!w) return null;
  const links = {};
  w.steps.forEach(s => { links[s.key] = { link:s.link, instructions:s.instructions||null, video:s.video||null }; });

  /* ------------------------------------------------------------
     Whose pre-licensing course is this?

     LicenseFlow is sold to agencies, and they do not all buy their
     study material from the same provider. Any step that has to name
     that provider writes {study_vendor} instead and gets it filled in
     here, from the same resolved playbook the study step itself uses --
     so an agency that switches provider changes one field and every
     mention follows.

     PSI's booking form is the reason this exists: it makes an agent
     pick their school from a dropdown of hundreds, and the name has to
     match the course they actually bought. Hardcoding ours would send
     every other agency's agents to the wrong entry.

     With no provider configured it falls back to a phrase that is true
     everywhere rather than a name that is true here.
  ------------------------------------------------------------ */
  const studyVendor = (playbook && playbook.study && playbook.study.vendor)
    || "the provider you bought your course from";
  const fillStudyVendor = (s) =>
    typeof s === "string" ? s.split("{study_vendor}").join(studyVendor) : s;

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
      /* A state can rewrite the opening line of a step, not just its
         links and steps. Illinois needs it: the standard "go and book
         your exam, you don't have to finish first" is false there. */
      if (pb.lead) out.lead = pb.lead;
      if (Array.isArray(pb.steps) && pb.steps.length) out.instructions = pb.steps.map(fillStudyVendor);
      if (pb.note) out.stateNote = pb.note;
      if (r.key === "exam" && pb.exam_name) out.examName = pb.exam_name;
    }
    return out;
  });

  /* ---- order, and the dependency chain that follows from it ----
     Steps the state does not run are dropped: only 35 jurisdictions
     fingerprint through this process and only 6 want a supplemental
     document. What survives is then chained in the state's own order, so
     "you cannot book the exam until you have applied" is true in Arkansas
     and North Carolina and false everywhere else, without either being
     written into the code. */
  const runs = (r) => {
    if (r.key === "fingerprinting") {
      const f = (playbook && playbook.fingerprinting) || {};
      return !!(f.url || f.note);
    }
    if (r.key === "affidavit") {
      const a = (playbook && playbook.affidavit) || {};
      return !!(a.url || a.note || SUPPLEMENTAL[code]);
    }
    return true;
  };

  const rank = stepOrder(code);
  const ordered = reqs
    .filter(runs)
    .sort((a, b) => rank.indexOf(a.key) - rank.indexOf(b.key));

  /* Each step waits on the one before it. Rebuilding the chain rather than
     trusting the static dependsOn is the whole point -- a resequenced
     state gets a resequenced gate for free. */
  ordered.forEach((r, i) => { r.dependsOn = i ? [ordered[i - 1].key] : []; });

  /* The state's blocking note goes on the step it blocks. Appended rather
     than replacing, so a state can have both a vendor note and a gotcha. */
  const gotcha = STATE_GOTCHA[code];
  if (gotcha) {
    const target = ordered.find((r) => r.key === gotcha.step);
    if (target) target.stateNote = target.stateNote
      ? target.stateNote + " " + gotcha.text
      : gotcha.text;
  }

  /* The supplemental document is named by its state. */
  const sup = SUPPLEMENTAL[code];
  if (sup) {
    const a = ordered.find((r) => r.key === "affidavit");
    if (a) {
      a.label = sup.label;
      a.short = sup.label;
      a.heading = sup.label;
      a.lead = sup.lead;
      /* Where we do not know what the state actually wants, the step still
         appears -- there IS a requirement -- but it does not hold the agent
         hostage to a document nobody can name. The coordinator clears it. */
      if (sup.unverified) {
        a.unverified = true;
        a.doc = a.doc ? { ...a.doc, label: "Whatever your coordinator asks for", required: false } : a.doc;
        a.fields = [];
      } else if (a.doc) {
        a.doc = { ...a.doc, label: sup.label };
      }
    }
  }

  return { state:w.state, code, reqs: ordered, playbook: playbook || null };
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
/* Two different numbers, and conflating them is what made the agent
   dashboard say "71%" directly above a card saying "your file is
   complete".

     done      requirements the team has actually verified
     submitted requirements the agent has finished with -- verified, or
               handed over and waiting on review

   The agent's screen should lead with `submitted`, because that is the
   part they control and the part they can finish. `done` still drives
   the coordinator's console, where the distinction is the job. */
export function progress(journey, sm){
  const keys = journey.reqs.map(r => r.key);
  const done = keys.filter(k => isDone(reqStatus(k, sm))).length;
  const submitted = keys.filter(k => {
    const s = reqStatus(k, sm);
    return isDone(s) || s === ST.PENDING;
  }).length;
  const pct = (n) => keys.length ? Math.round(n / keys.length * 100) : 0;
  return { overall: pct(done), done, total: keys.length,
           submitted, submittedPct: pct(submitted),
           waiting: submitted - done };
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
