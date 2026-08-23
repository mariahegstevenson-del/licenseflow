/* ============================================================
   LicenseFlow — State licensing data (from "Trainer Essentials")
   Drives the tailored, per-state step-by-step walkthrough.
   Edit CONSTANTS.successCe and VIDEOS when you have those links.
   ============================================================ */

export const CONSTANTS = {
  study:   "https://partners.xcelsolutions.com/insurance-license/life-and-health?partner=pris",
  nipr:    "https://nipr.com/",
  surelc:  "https://accounts.surancebay.com/oauth/authorize?redirect_uri=https:%2F%2Fsurelc.surancebay.com%2Fproducer%2Foauth%3FreturnUrl%3D%252Fprofile%252Fcontact-info%253FgaId%253D381&gaId=381&client_id=surecrmweb&response_type=code",
  eo:      "https://www.360coveragepros.com/ba",
  successCe: null, // add the Success CE link here
};

// Per-step walkthrough videos. Fill in URLs (YouTube/Vimeo/MP4) as you record them.
// Exam step picks the provider-specific video based on the state's exam link.
export const VIDEOS = {
  study_material: null,
  exam_pearson: null,
  exam_psi: null,
  exam_prometric: null,
  fingerprinting: null,
  state_app: null,
  affidavit: null,
  success_ce: null,
  surelc: null,
  eo: null,
};

// Provider registration instructions (from the sheet's orientation notes).
export const PROVIDER_STEPS = {
  xcel: [
    "Click the link for Xcel.",
    "Select your state.",
    'Select the "Life & Health Package" Self-Study Course ($60).',
    "Register for a new account.",
    "Proceed to checkout and skip add-ons (no promo code — the link is partner-specific; you are paying for your material).",
  ],
  pearson: [
    "Click your state-specific link.",
    'Opt in to permissions & "Register for New Account".',
    "Fill out all fields marked with an asterisk and validate your info.",
    "Once your account is created you can share your screen with your trainer.",
    "View the tests available.",
    'Register for the "Life & Health Exam".',
    "Choose a test-center location, date, and time (in person preferred).",
    "Proceed to checkout.",
    "Send your agency your name, state, test date and time.",
  ],
  psi: [
    "Click your state-specific link.",
    "Sign in / Create Account (top right).",
    "Fill out all fields marked with an asterisk and validate your info.",
    "Once your account is created you can share your screen with your trainer.",
    "View the tests available.",
    'Register for the "Life & Health Exam" (in person preferred).',
    "Choose a test-center location, date, and time.",
    "Proceed to checkout.",
    "Send your agency your name, state, test date and time.",
  ],
  prometric: [
    "Click your state-specific link.",
    'Scroll down under "Test Center Exams" and select "Schedule".',
    "Opt in to permissions & select your test.",
    "Find & schedule your test center. We recommend testing about 14 days out.",
    "Purchase your exam and create your account.",
    "Fill out all fields marked with an asterisk and validate your info.",
  ],
};

// state code -> { name, exam, fp, affidavit?, misc?, order? }
// order: overrides sequence of core steps for the starred states.
export const STATES = {
  AL: { name: "Alabama", exam: "https://www.enrole.com/ua/jsp/index.jsp?categoryId=80211EE0", fp: "https://fieldprintalabama.com/individuals", affidavit: "https://aldoi.gov/LicenseeCZ/Initial.aspx" },
  AK: { name: "Alaska", exam: "https://www.pearsonvue.com/us/en/ak/insurance.html", fp: "https://pearsonwest.ibtfingerprint.com/" },
  AZ: { name: "Arizona", exam: "https://test-takers.psiexams.com/anzins", fp: "https://docs.google.com/document/d/1JpuV0S7YKeLG5pvMB4a1ssCpOlzkLXdZOPSLRjeMUOA/edit?usp=sharing", affidavit: "https://aldoi.gov/LicenseeCZ/Initial.aspx" },
  AR: { name: "Arkansas", exam: "https://test-takers.psiexams.com/arins", fp: "https://www.ark.org/background-check/index.php/home/index/aid", order: { fingerprinting: 2, exam_registration: 3 } },
  CA: { name: "California", exam: "https://test-takers.psiexams.com/cadi", fp: "https://www.applicantservices.com/cdi/" },
  CO: { name: "Colorado", exam: "http://www.pearsonvue.com/co/insurance", fp: null },
  CT: { name: "Connecticut", exam: "http://www.pearsonvue.com/ct/insurance", fp: null },
  DE: { name: "Delaware", exam: "https://home.pearsonvue.com/de/insurance", fp: "https://dsp.delaware.gov/obtaining-a-certified-criminal-history/" },
  FL: { name: "Florida", exam: "http://www.pearsonvue.com/fl/insurance", fp: "https://fl.ibtfingerprint.com/" },
  GA: { name: "Georgia", exam: "http://www.pearsonvue.com/ga/insurance", fp: "https://ga.state.identogo.com/ata", affidavit: "https://oci.georgia.gov/citizenship-affidavit", order: { exam_registration: 1, affidavit: 2, state_app: 3, fingerprinting: 4 } },
  HI: { name: "Hawaii", exam: "http://www.pearsonvue.com/hi/insurance", fp: "https://www.fieldprinthawaii.com/" },
  ID: { name: "Idaho", exam: "https://home.pearsonvue.com/id/insurance", fp: "https://www.psiexams.com/idin" },
  IL: { name: "Illinois", exam: "http://www.pearsonvue.com/il/insurance", fp: null, misc: "Webinar" },
  IN: { name: "Indiana", exam: "https://home.pearsonvue.com/in/insurance", fp: null },
  IA: { name: "Iowa", exam: "http://www.pearsonvue.com/ia/insurance", fp: "https://fieldprintiowa.com/individuals", affidavit: "https://stateofiowa.seamlessdocs.com/f/DPS_DCI_Criminal_History_Billing_and_Request_Form" },
  KS: { name: "Kansas", exam: "http://www.pearsonvue.com/ks/insurance", fp: "https://www.pearsonvue.com/us/en/ks/insurance.html", affidavit: "https://www.kdor.ks.gov/apps/taxclearance/default.aspx", misc: "Fingerprint Code: KSINSFP. Bring: https://insurance.ks.gov/documents/agentagency/DCF-FP1020.pdf — Upload clearance as ALD on NIPR.", order: { exam_registration: 1, affidavit: 2, fingerprinting: 3, state_app: 4 } },
  KY: { name: "Kentucky", exam: "https://insurance.ky.gov/doieservices/userrole.aspx", fp: null, affidavit: "https://courts.ky.gov/", order: { affidavit: 1, state_app: 2, exam_registration: 3 } },
  LA: { name: "Louisiana", exam: "https://test-takers.psiexams.com/ladi", fp: "https://uenroll.identogo.com/" },
  ME: { name: "Maine", exam: "https://home.pearsonvue.com/me/insurance", fp: null },
  MD: { name: "Maryland", exam: "https://www.prometric.com/maryland/insurance", fp: null },
  MA: { name: "Massachusetts", exam: "https://www.prometric.com/massachusetts/insurance", fp: null },
  MI: { name: "Michigan", exam: "https://test-takers.psiexams.com/midifs", fp: null, misc: "State exam #60731." },
  MN: { name: "Minnesota", exam: "https://test-takers.psiexams.com/mnins/", fp: "https://proctor2.psionline.com/programs/MN%20INS%20Fingerprint%20hours.pdf" },
  MS: { name: "Mississippi", exam: "http://www.pearsonvue.com/ms/insurance", fp: null },
  MO: { name: "Missouri", exam: "http://www.pearsonvue.com/mo/insurance", fp: null },
  MT: { name: "Montana", exam: "http://www.pearsonvue.com/mt/insurance", fp: "https://csimt.gov/wp-content/uploads/2024/06/fingerprint-concent-form_6.24-1.pdf" },
  NE: { name: "Nebraska", exam: "https://test-takers.psiexams.com/neins", fp: null },
  NV: { name: "Nevada", exam: "https://home.pearsonvue.com/nv/insurance", fp: "https://pearsonwest.ibtfingerprint.com/" },
  NH: { name: "New Hampshire", exam: "https://test-takers.psiexams.com/nhins", fp: null },
  NJ: { name: "New Jersey", exam: "https://test-takers.psiexams.com/njins", fp: "https://uenroll.identogo.com/" },
  NM: { name: "New Mexico", exam: "https://test-takers.psiexams.com/nmins/test", fp: "https://nm.state.identogo.com/" },
  NY: { name: "New York", exam: "https://test-takers.psiexams.com/nyins", fp: "https://myportal.dfs.ny.gov/nylinxext/elorg.alice" },
  NC: { name: "North Carolina", exam: "https://home.pearsonvue.com/nc/insurance", fp: "https://www.ncdoi.com/ASD/Documents/Insurance%20Producer%20Fingerprint%20Criminal%20Background%20Packet.pdf", order: { state_app: 1, fingerprinting: 2, exam_registration: 3 } },
  ND: { name: "North Dakota", exam: "https://test-takers.psiexams.com/ndins/test", fp: "https://www.nbinformation.com/locations/lawEnforcement/byCounty/ND.php" },
  OH: { name: "Ohio", exam: "https://test-takers.psiexams.com/ohins", fp: "https://insurance.ohio.gov/agents-and-agencies/agent-education/background-check", misc: "Prints: https://www.fastfingerprints.com/" },
  OK: { name: "Oklahoma", exam: "https://test-takers.psiexams.com/okins", fp: null },
  OR: { name: "Oregon", exam: "https://test-takers.psiexams.com/orins", fp: "https://proctor2.psionline.com/media/programs/INS%20Fingerprint%20hours.pdf" },
  PA: { name: "Pennsylvania", exam: "https://test-takers.psiexams.com/pain", fp: "https://uenroll.identogo.com/workflows/1kgbgj", misc: "Service code: 1kgbgj." },
  RI: { name: "Rhode Island", exam: "https://home.pearsonvue.com/ri/insurance", fp: "tel:410-274-4400", fpNote: "Background check report: call the fingerprint number (410-274-4400).", misc: "Background check report — call fingerprint number." },
  SC: { name: "South Carolina", exam: "https://home.pearsonvue.com/sc/insurance", fp: "https://sc.state.identogo.com/" },
  SD: { name: "South Dakota", exam: "http://www.pearsonvue.com/sd/insurance", fp: null, misc: "Must wait 48 hours after exam." },
  TN: { name: "Tennessee", exam: "http://www.pearsonvue.com/tn/insurance", fp: "http://www.identogo.com" },
  TX: { name: "Texas", exam: "https://home.pearsonvue.com/tx/insurance", fp: "https://uenroll.identogo.com/workflows/11G6QF" },
  UT: { name: "Utah", exam: "https://www.prometric.com/utah/insurance", fp: "https://proscheduler.prometric.com/home", misc: "Pass exam & have NIPR confirmation for fingerprints.", order: { exam_registration: 1, state_app: 2, fingerprinting: 3 } },
  VT: { name: "Vermont", exam: "https://www.prometric.com/vermont/insurance", fp: null },
  VA: { name: "Virginia", exam: "https://www.prometric.com/virginia/insurance", fp: "https://fieldprintvirginia.com/" },
  WA: { name: "Washington", exam: "https://test-takers.psiexams.com/waoic", fp: "http://www.identogo.com/FP/Washington.aspx" },
  WV: { name: "West Virginia", exam: "http://www.pearsonvue.com/wv/insurance", fp: "https://uenroll.identogo.com/workflows/228QG9" },
  WI: { name: "Wisconsin", exam: "https://test-takers.psiexams.com/wiins", fp: "https://www.fieldprintwisconsin.com/", order: { fingerprinting: 1, exam_registration: 2, state_app: 3 } },
  WY: { name: "Wyoming", exam: "https://home.pearsonvue.com/wy/insurance", fp: null, fpNote: "Fingerprints are handled via the state DOI package.", misc: "DOI package for fingerprints." },
  DC: { name: "Washington DC", exam: "https://home.pearsonvue.com/dc/insurance", fp: "https://schedule.fieldprint.com/User/SignIn" },
};

export const STATE_LIST = Object.entries(STATES)
  .map(([code, s]) => ({ code, name: s.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function examProvider(url) {
  if (!url) return null;
  if (url.includes("pearsonvue")) return "pearson";
  if (url.includes("psiexams") || url.includes("psionline")) return "psi";
  if (url.includes("prometric")) return "prometric";
  if (url.includes("enrole")) return "pearson";
  return null;
}

// Build the ordered, tailored walkthrough for a given state code.
export function buildWalkthrough(code) {
  const s = STATES[code];
  if (!s) return null;
  const provider = examProvider(s.exam);
  const providerLabel = { pearson: "Pearson VUE", psi: "PSI", prometric: "Prometric" }[provider] || "your exam provider";

  const core = [];
  const def = { exam_registration: 1, fingerprinting: 2, state_app: 3, affidavit: 4 };
  const ord = (key) => (s.order && s.order[key] != null ? s.order[key] : def[key]);

  core.push({
    key: "exam_registration", n: ord("exam_registration"),
    title: `Register for your state exam (${providerLabel})`,
    link: s.exam, video: VIDEOS["exam_" + provider] || null,
    instructions: PROVIDER_STEPS[provider] || null,
    desc: `Create your account with ${providerLabel} and schedule your Life & Health exam.`,
  });
  if (s.fp || s.fpNote) core.push({
    key: "fingerprinting", n: ord("fingerprinting"),
    title: "Complete fingerprinting & background check",
    link: (s.fp && s.fp.startsWith("http")) ? s.fp : null,
    note: s.fpNote || (s.fp && !s.fp.startsWith("http") ? s.fp : null),
    video: VIDEOS.fingerprinting,
    desc: "Complete your state-required fingerprinting and background check.",
  });
  core.push({
    key: "state_app", n: ord("state_app"),
    title: "Submit your state application (NIPR)",
    link: CONSTANTS.nipr, video: VIDEOS.state_app,
    desc: "Apply for your license through NIPR once your prerequisites are complete.",
  });
  if (s.affidavit) core.push({
    key: "affidavit", n: ord("affidavit"),
    title: "Complete your state affidavit / additional requirement",
    link: s.affidavit, video: VIDEOS.affidavit,
    desc: "Complete the additional document your state requires.",
  });
  core.sort((a, b) => a.n - b.n);

  const steps = [
    { key: "study_material", title: "Complete your pre-licensing study material (Xcel)",
      link: CONSTANTS.study, video: VIDEOS.study_material, instructions: PROVIDER_STEPS.xcel,
      desc: "Purchase and complete your Life & Health self-study course through Xcel Solutions ($60)." },
    ...core,
    { key: "success_ce", title: "Review your continuing education requirements (Success CE)",
      link: `https://successce.com/insurance-ce-requirements-${code}/`, video: VIDEOS.success_ce,
      desc: `Review ${s.name}'s continuing education requirements and set up your CE with Success CE.` },
    { key: "surelc", title: "Complete carrier contracting (SureLC)",
      link: CONSTANTS.surelc, video: VIDEOS.surelc,
      desc: "Complete your carrier contracting through SureLC by SuranceBay." },
    { key: "eo", title: "Get your E&O insurance",
      link: CONSTANTS.eo, video: VIDEOS.eo,
      desc: "Obtain your Errors & Omissions (E&O) insurance through 360 Coverage Pros." },
  ];
  return { state: s, provider, misc: s.misc || null, steps };
}

/* ------------------------------------------------------------------
   CONTINUING EDUCATION — which certificates an agent must produce.

   AML is a federal carrier requirement and applies everywhere, so it is
   the one entry marked required by default: a file with no AML
   certificate is not contractable, however complete the rest looks.

   Everything else varies by state. Six states are pinned down below in
   CE_BY_STATE, each checked against that state's own department of
   insurance, statute or rule. Every other state falls back to CE_DEFAULT,
   which says plainly that the state is not configured yet rather than
   implying an answer we do not have.

   Two findings from that research are worth keeping in view, because both
   contradict what the product used to imply:

     - ETHICS is a renewal requirement, not a starting one. In all six
       states it sits inside the biennial CE cycle. Telling a brand-new
       agent they need ethics hours before they can be contracted is
       wrong and costs them money.
     - ANNUITY BEST INTEREST training is the real gate. Every one of the
       six requires a one-time course before the agent may sell an
       annuity, and the insurer has to see it. California wants 8 hours;
       the rest want 4.

   To add a state, add an entry to CE_BY_STATE with a source comment.
   Do not infer one state's rules from its neighbour's.
------------------------------------------------------------------ */
/* Two tiers, and the difference matters. `required` blocks the step: the
   agent cannot finish continuing education without it, because a carrier
   will not appoint them without it. `advise` does not block -- it is a
   real requirement, but only for an agent who sells that product line,
   and we cannot know from here whether they will. Advisory slots are
   listed on the screen with their reason so nobody is surprised later. */
const AML = { key:"aml", label:"Anti-Money Laundering (AML)", required:true,
  note:"Carriers will not appoint you without it. This is a federal anti-money-laundering rule that applies to the insurer, not a state licensing rule — which is why every state needs it." };
const OTHER = { key:"other", label:"Other", required:false,
  note:"Anything else your carrier or agency asks for." };
/* Ethics appears for every state and always will. The research says it is
   a renewal-cycle requirement rather than a gate on getting started, and
   the wording says so -- but it is part of the CE package agents buy, so
   the slot is always here to upload into. */
const ETHICS_RENEWAL = (hrs, yrs) => ({ key:"ethics", label:"Ethics", required:false, advise:true,
  note:`Part of your CE package — take it. The state counts these ${hrs} hours toward your ${yrs}-year renewal cycle rather than requiring them before you start, so it will not hold this step up. Upload the certificate here as soon as you have it.` });

export const CE_DEFAULT = [
  AML,
  { key:"best_interest", label:"Annuity Best Interest training", required:false, advise:true,
    note:"Most states require a one-time annuity training course before you may sell annuities. Your state is not configured here yet — check with your carrier or CE provider before you write annuity business." },
  { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
    note:"Required in most states before selling long-term-care policies. Only needed if you will write LTC." },
  { key:"ethics", label:"Ethics", required:false, advise:true,
    note:"Part of your CE package — take it. In most states these hours count toward your renewal cycle rather than being required before you start, so it will not hold this step up. Upload the certificate here as soon as you have it." },
  OTHER,
];

/* Per-state lists. Every entry below was checked against that state's own
   department of insurance, statute or administrative rule in August 2026;
   sources are named so the next person can re-check them. Nothing here is
   inferred from a neighbouring state. */
export const CE_BY_STATE = {
  /* Ins. Code s1749.8; CDI annuity-training FAQ; CDI 8-hour LTC outline (Mar 2025);
     DHCS Partnership agent training. Ethics: CDI ethics-CE FAQ -- renewal only. */
  CA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (8 hours)", required:true,
      note:"California requires an 8-hour Best Interest course before you may sell any annuity, then 4 hours before each renewal. It is the longest of any state — book it early." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Needed before you sell long-term care, then 8 hours again each renewal. Partnership policies need a further 8 classroom hours on top." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Fla. Stat. s627.4554 (annuity, best-interest standard in statute);
     Fla. Admin. Code 69O-157.1155 (LTC before selling); Fla. Stat. s626.2815 (CE). */
  FL: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Florida requires a one-time 4-hour annuity course, and the insurer has to see it before it will let you sell an annuity." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Florida requires training before you sell, solicit or negotiate long-term care. Confirm the hours with your CE provider — the rule states the timing, not a number we could verify." },
    { key:"ethics", label:"Law & Ethics update", required:false, advise:true,
      note:"Part of your CE package — take it. Florida folds ethics into a 4-hour Law & Ethics update every 2 years, so it counts toward renewal rather than holding this step up. Upload it here as soon as you have it." },
    OTHER,
  ],
  /* GA OCI continuing-education page and Annuity Best Interest FAQ (Rule 120-2-94,
     eff. 1 Aug 2023); Ga. Comp. R. & Regs. 120-2-16-.34 (LTC Partnership). */
  GA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Georgia has required a one-time 4-hour Annuity Best Interest course since 1 August 2023 before you may sell annuities." },
    { key:"ltc", lines:"health", label:"Long-Term Care Partnership training (8 hours)", required:false, advise:true,
      note:"Needed before you sell a Partnership long-term-care policy, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Tex. Ins. Code ch. 1115 (annuity training, best-interest duty);
     TDI long-term-care certification page; TDI agent CE page. */
  TX: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 credits)", required:true,
      note:"Texas requires a one-time 4-credit annuity course, and the insurer must verify it before letting you sell an annuity." },
    { key:"ltc", lines:"health", label:"Long-Term Care Partnership training (8 hours)", required:false, advise:true,
      note:"Needed before you act on a Partnership long-term-care policy, then 4 hours each reporting period." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* NCDOI CE page and Long-Term Care Partnership FAQ. The annuity best-interest
     rule is confirmed adopted (the old suitability statute, G.S. 58-60-150 to -180,
     was repealed effective 1 Jan 2023) but the hour count comes from CE providers
     rather than a rule we could read -- hence the wording below. */
  NC: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:true,
      note:"North Carolina replaced its old annuity suitability rule with a best-interest standard in January 2023. Training is required before you sell annuities — CE providers run it as a one-time 4-hour course; confirm the length with yours." },
    { key:"ltc", lines:"health", label:"Long-Term Care Partnership training (8 hours)", required:false, advise:true,
      note:"Needed before you sell a Partnership long-term-care policy, then 4 hours each compliance period." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Ohio DOI annuity-suitability FAQ (eff. 14 Aug 2021); Ohio DOI specialty CE
     training requirements PDF (LTC); Ohio DOI CE requirements page. */
  OH: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 credits)", required:true,
      note:"Ohio has required a one-time 4-credit Annuity Best Interest course since 14 August 2021. Without it you are not eligible to sell annuities at all." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Needed before you sell long-term care, then a 4-hour refresher each renewal period." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
};

/* Long-term care is a health product line. An agent licensed Life only
   cannot sell it at all, so putting the training in front of them is
   noise at best and a wasted course fee at worst. Slots carrying
   lines:"health" are dropped unless the licence includes health.
   Called without a licence type -- as the admin console does when it is
   just resolving a label for a certificate already on file -- nothing is
   filtered, so old certificates never lose their names. */
const hasHealth = (lt) => /health/i.test(String(lt || ""));

export function ceSlots(code, licenseType){
  const base = CE_BY_STATE[code]
    || ((STATES[code] && Array.isArray(STATES[code].ce) && STATES[code].ce.length)
          ? STATES[code].ce : CE_DEFAULT);
  if (licenseType == null) return base;
  return base.filter(s => s.lines !== "health" || hasHealth(licenseType));
}

/* True when we hold checked, state-specific requirements rather than the
   generic fallback. The screen says which of the two the agent is seeing,
   because "we don't know yet" is useful information to an agent and a
   silent default is not. */
export function ceIsConfigured(code){ return !!CE_BY_STATE[code]; }
