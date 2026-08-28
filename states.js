/* ============================================================
   LicenseFlow — State licensing data (from "Trainer Essentials")
   Drives the tailored, per-state step-by-step walkthrough.
   Edit CONSTANTS.successCe and VIDEOS when you have those links.
   ============================================================ */

export const CONSTANTS = {
  study:   "https://partners.xcelsolutions.com/insurance-license/life-and-health?partner=pris",
  nipr:    "https://nipr.com/",
  surelc:  "https://accounts.surancebay.com/oauth/authorize?redirect_uri=https:%2F%2Fsurelc.surancebay.com%2Fproducer%2Foauth%3FreturnUrl%3D%252Fprofile%252Fcontact-info%253FgaId%253D381&gaId=381&client_id=surecrmweb&response_type=code",
  /* NAPA rather than the previous carrier, whose program was tied to a
     single IMO. This is the default every agency inherits; any agency can
     point their own E&O elsewhere from the State guide. */
  eo:      "https://www.napa-benefits.org/nd/errors-and-omissions#life-and-health-agents",
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
  /* Alabama contracts its producer testing to the University of Alabama's
     continuing-education arm, so the path is a city page rather than a
     national catalog. Source: aldoi.gov/licensing/examsites.aspx */
  ua: [
    "Click the link for Alabama insurance testing.",
    "Choose the city you want to test in — Birmingham, Huntsville, Mobile, Tuscaloosa or Montgomery.",
    'Select "Register Today", then "Registration".',
    'Choose the "Producer Combined Life and Health" exam and pick a date.',
    "Pay the exam fee and save your confirmation.",
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
  /* Massachusetts moved from Prometric to Pearson VUE on 22 July 2026.
     The old Prometric link still resolves, which is what makes this the
     dangerous kind of stale data -- it looks like it works. */
  MA: { name: "Massachusetts", exam: "https://www.pearsonvue.com/us/en/ma/insurance.html", fp: null },
  MI: { name: "Michigan", exam: "https://test-takers.psiexams.com/midifs", fp: null },
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
  RI: { name: "Rhode Island", exam: "https://home.pearsonvue.com/ri/insurance", fp: null, fpNote: "Rhode Island takes fingerprints in person. Visit the Rhode Island Attorney General\u2019s Customer Service Center \u2014 there is no online booking for this.", fpNote: "Rhode Island takes fingerprints in person. Visit the Rhode Island Attorney General\u2019s Customer Service Center \u2014 there is no online booking, and no link to follow.", misc: "Background check report — call fingerprint number." },
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
  WY: { name: "Wyoming", exam: "https://home.pearsonvue.com/wy/insurance", fp: null, fpNote: "Wyoming posts you a packet once your license application is in \u2014 there is nothing to book and no link to follow. Watch for it in the mail, follow the instructions inside, and record the date here when it is done.", misc: "DOI package for fingerprints." },
  DC: { name: "Washington DC", exam: "https://home.pearsonvue.com/dc/insurance", fp: "https://schedule.fieldprint.com/User/SignIn" },
};

export const STATE_LIST = Object.entries(STATES)
  .map(([code, s]) => ({ code, name: s.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/* Not every state uses one of the three national vendors, and pretending
   otherwise strands people. Alabama contracts its testing to the
   University of Alabama and Kentucky runs registration through its own
   DOI portal; both were previously answered as "Pearson VUE" or as
   nothing at all, which meant an Alabama candidate was handed Pearson's
   click-path for a site that looks nothing like it. */
export function examProvider(url) {
  if (!url) return null;
  if (url.includes("pearsonvue")) return "pearson";
  if (url.includes("psiexams") || url.includes("psionline")) return "psi";
  if (url.includes("prometric")) return "prometric";
  if (url.includes("enrole")) return "ua";
  if (url.includes("insurance.ky.gov")) return "kydoi";
  return null;
}

export const PROVIDER_LABEL = {
  pearson: "Pearson VUE",
  psi: "PSI",
  prometric: "Prometric",
  ua: "The University of Alabama",
  kydoi: "the Kentucky Department of Insurance",
};

// Build the ordered, tailored walkthrough for a given state code.
export function buildWalkthrough(code) {
  const s = STATES[code];
  if (!s) return null;
  const provider = examProvider(s.exam);
  const providerLabel = PROVIDER_LABEL[provider] || "your exam provider";

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
      desc: "Obtain your Errors & Omissions (E&O) insurance through NAPA. Choose the package that includes fixed annuities." },
  ];
  return { state: s, provider, misc: s.misc || null, steps };
}

/* ------------------------------------------------------------------
   CONTINUING EDUCATION — which certificates an agent must produce.

   AML is a federal carrier requirement and applies everywhere, so it is
   the one entry marked required by default: a file with no AML
   certificate is not contractable, however complete the rest looks.

   Everything else varies by state. All fifty-one jurisdictions are held
   in CE_BY_STATE below, pulled from Success CE -- the provider the agency
   actually buys from -- so what the portal tells an agent and what they
   see in the basket are the same thing. CE_DEFAULT survives only as the
   fallback for a state code we do not recognize.

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

   CE_BY_STATE and CE_CART are generated, not hand-edited: a weekly audit
   re-reads Success CE and reports what moved. Change them by regenerating
   from that audit, or per agency through the state guide -- never by
   inferring one state's rules from its neighbour's.
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
  note:`Part of your CE package — take it. The state counts ${hrs === 1 ? "this hour" : `these ${hrs} hours`} toward your ${yrs}-year renewal cycle rather than requiring them before you start, so it will not hold this step up. Upload the certificate here as soon as you have it.` });

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
/* Per-state slot lists, generated from Success CE on 28 August 2026 --
   the same source, and the same two clicks, an agency owner uses by hand:
   pick the state, open the full requirements. All 51 jurisdictions are
   here now, so no agent lands on a generic screen.

   Long-term care carries lines:"health" throughout. It is a health-line
   product: a Life-only agent cannot sell it, and putting the course in
   front of them is a wasted fee. */
export const CE_BY_STATE = {
  /* Alaska — Success CE, captured 28 Aug 2026. */
  AK: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Alaska requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Alaska wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Alabama — Success CE, captured 28 Aug 2026. */
  AL: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Alabama requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Alabama wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Arkansas — Success CE, captured 28 Aug 2026. */
  AR: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Arkansas requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Arkansas wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Arizona — Success CE, captured 28 Aug 2026. */
  AZ: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Arizona requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Arizona wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(6, 4),
    OTHER,
  ],
  /* California — Success CE, captured 28 Aug 2026. */
  CA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (8 hours)", required:true,
      note:"California wants 8 hours before you may sell any annuity — the longest of any state — then 4 hours before each renewal. Book it early." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. California wants 8 hours before you sell it, then 8 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Colorado — Success CE, captured 28 Aug 2026. */
  CO: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Colorado requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (16 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Colorado wants 16 hours before you sell it, then 8 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Connecticut — Success CE, captured 28 Aug 2026. */
  CT: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Connecticut requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Connecticut publishes no hour figure and stocks no Connecticut-specific course — only a general 10-hour one. It is a one-time requirement with no follow-up. Confirm with your carrier that the general course satisfies it before you rely on it." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* District of Columbia — Success CE, captured 28 Aug 2026. */
  DC: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"District of Columbia requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. District of Columbia lists no long-term-care course at all. If you intend to write LTC, ask your carrier what it wants — a carrier can ask for more than the state does." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Delaware — Success CE, captured 28 Aug 2026. */
  DE: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Delaware requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Delaware's hour figure is not published by our source. The course is on the catalog — confirm the length with your CE provider before you book it." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Florida — Success CE, captured 28 Aug 2026. */
  FL: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Florida requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Florida's hour figure is not published by our source. The course is on the catalog — confirm the length with your CE provider before you book it." },
    ETHICS_RENEWAL(4, 2),
    OTHER,
  ],
  /* Georgia — Success CE, captured 28 Aug 2026. */
  GA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Georgia requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Georgia wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Hawaii — Success CE, captured 28 Aug 2026. */
  HI: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Hawaii requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Hawaii lists no long-term-care course at all. If you intend to write LTC, ask your carrier what it wants — a carrier can ask for more than the state does." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Iowa — Success CE, captured 28 Aug 2026. */
  IA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Iowa requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Iowa wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 3),
    OTHER,
  ],
  /* Idaho — Success CE, captured 28 Aug 2026. */
  ID: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Idaho requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Idaho wants 8 hours before you sell it, then 4 hours each renewal." },
    { key:"ethics", label:"Ethics", required:false, advise:true,
      note:"Part of your CE package — take it. Our source does not publish an ethics hour figure for Idaho, so buy the package and let the provider count the hours. It will not hold this step up." },
    OTHER,
  ],
  /* Illinois — Success CE, captured 28 Aug 2026. */
  IL: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Illinois requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (6 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Illinois wants 6 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Indiana — Success CE, captured 28 Aug 2026. */
  IN: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:true,
      note:"Indiana requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Indiana wants 8 hours before you sell it, then 5 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Kansas — Success CE, captured 28 Aug 2026. */
  KS: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Kansas requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (4 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Kansas wants 4 hours before you sell it, then 1 hour every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Kentucky — Success CE, captured 28 Aug 2026. */
  KY: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:true,
      note:"Kentucky requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Kentucky wants 8 hours before you sell it, then 4 hours each renewal." },
    { key:"ethics", label:"Ethics", required:false, advise:true,
      note:"Part of your CE package — take it. Our source does not publish an ethics hour figure for Kentucky, so buy the package and let the provider count the hours. It will not hold this step up." },
    OTHER,
  ],
  /* Louisiana — Success CE, captured 28 Aug 2026. */
  LA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Louisiana requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Louisiana wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Massachusetts — Success CE, captured 28 Aug 2026. */
  MA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Massachusetts requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Massachusetts wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 3),
    OTHER,
  ],
  /* Maryland — Success CE, captured 28 Aug 2026. */
  MD: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Maryland requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Maryland wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Maine — Success CE, captured 28 Aug 2026. */
  ME: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:true,
      note:"Maine requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Maine wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Michigan — Success CE, captured 28 Aug 2026. */
  MI: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Michigan requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Michigan wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Minnesota — Success CE, captured 28 Aug 2026. */
  MN: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Minnesota requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Minnesota runs it through the Medical Assistance Eligibility and LTC Partnership program: 8 hours before you sell it, then 4 hours each renewal. The state's own requirements page describes this for non-resident producers only, so confirm with your coordinator if you are resident." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Missouri — Success CE, captured 28 Aug 2026. */
  MO: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Missouri requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Missouri wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Mississippi — Success CE, captured 28 Aug 2026. */
  MS: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Mississippi requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Mississippi lists no long-term-care course at all. If you intend to write LTC, ask your carrier what it wants — a carrier can ask for more than the state does." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Montana — Success CE, captured 28 Aug 2026. */
  MT: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Montana requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Montana wants 8 hours before you sell it, then 4 hours every 24 months." },
    { key:"ethics", label:"Ethics", required:false, advise:true,
      note:"Part of your CE package — take it. Our source does not publish an ethics hour figure for Montana, so buy the package and let the provider count the hours. It will not hold this step up." },
    OTHER,
  ],
  /* North Carolina — Success CE, captured 28 Aug 2026. */
  NC: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"North Carolina requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. North Carolina wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* North Dakota — Success CE, captured 28 Aug 2026. */
  ND: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"North Dakota requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. North Dakota wants 8 hours before you sell it, then 4 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Nebraska — Success CE, captured 28 Aug 2026. */
  NE: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Nebraska requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Nebraska wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* New Hampshire — Success CE, captured 28 Aug 2026. */
  NH: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"New Hampshire requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. New Hampshire wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* New Jersey — Success CE, captured 28 Aug 2026. */
  NJ: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"New Jersey requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. New Jersey wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* New Mexico — Success CE, captured 28 Aug 2026. */
  NM: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"New Mexico requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. New Mexico wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Nevada — Success CE, captured 28 Aug 2026. */
  NV: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Nevada requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Nevada wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 3),
    OTHER,
  ],
  /* New York — Success CE, captured 28 Aug 2026. */
  NY: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:false, advise:true,
      note:"New York runs Regulation 187, where the training duty sits with the insurer rather than with you. Ask your carrier what it wants before you write an annuity — do not assume you are exempt." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. New York lists no long-term-care course at all. If you intend to write LTC, ask your carrier what it wants — a carrier can ask for more than the state does." },
    ETHICS_RENEWAL(1, 2),
    OTHER,
  ],
  /* Ohio — Success CE, captured 28 Aug 2026. */
  OH: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Ohio requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Ohio wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Oklahoma — Success CE, captured 28 Aug 2026. */
  OK: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Oklahoma requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Oklahoma wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Oregon — Success CE, captured 28 Aug 2026. */
  OR: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Oregon requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Oregon wants 8 hours before you sell it, then 4 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Pennsylvania — Success CE, captured 28 Aug 2026. */
  PA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:false, advise:true,
      note:"Our source lists no annuity training for Pennsylvania, but every neighbouring state requires one. Confirm with your carrier before you write an annuity." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Pennsylvania wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Rhode Island — Success CE, captured 28 Aug 2026. */
  RI: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Rhode Island requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Rhode Island's hour figure is not published by our source. The course is on the catalog — confirm the length with your CE provider before you book it." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* South Carolina — Success CE, captured 28 Aug 2026. */
  SC: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"South Carolina requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. South Carolina wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* South Dakota — Success CE, captured 28 Aug 2026. */
  SD: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"South Dakota requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. South Dakota wants 8 hours before you sell it, then 4 hours every 24 months." },
    { key:"ethics", label:"Ethics", required:false, advise:true,
      note:"Part of your CE package — take it. Our source does not publish an ethics hour figure for South Dakota, so buy the package and let the provider count the hours. It will not hold this step up." },
    OTHER,
  ],
  /* Tennessee — Success CE, captured 28 Aug 2026. */
  TN: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Tennessee requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Tennessee wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Texas — Success CE, captured 28 Aug 2026. */
  TX: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Texas requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Texas wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Utah — Success CE, captured 28 Aug 2026. */
  UT: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Utah requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (3 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Utah wants 3 hours before you sell it, then 3 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Virginia — Success CE, captured 28 Aug 2026. */
  VA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Virginia requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Virginia wants 8 hours before you sell it, then 2 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Vermont — Success CE, captured 28 Aug 2026. */
  VT: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training", required:false, advise:true,
      note:"Our source lists no annuity training for Vermont, but every neighbouring state requires one. Confirm with your carrier before you write an annuity." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Vermont wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Washington — Success CE, captured 28 Aug 2026. */
  WA: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Washington requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Washington wants 8 hours before you sell it, then 4 hours each renewal." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Wisconsin — Success CE, captured 28 Aug 2026. */
  WI: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Wisconsin requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Wisconsin wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* West Virginia — Success CE, captured 28 Aug 2026. */
  WV: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"West Virginia requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. West Virginia wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
  /* Wyoming — Success CE, captured 28 Aug 2026. */
  WY: [
    AML,
    { key:"best_interest", label:"Annuity Best Interest training (4 hours)", required:true,
      note:"Wyoming requires this one-time course before you may sell an annuity, and the carrier has to see the certificate before it will let you write one." },
    { key:"ltc", lines:"health", label:"Long-Term Care training (8 hours)", required:false, advise:true,
      note:"Only if you will write long-term care — it is a health-line product, so a Life-only license does not need it at all. Wyoming wants 8 hours before you sell it, then 4 hours every 24 months." },
    ETHICS_RENEWAL(3, 2),
    OTHER,
  ],
};

/* What to actually put in the basket at Success CE, per state.
   Pulled from their catalog API on 28 August 2026.

   The AML course is chosen, not just listed. Agents write in more
   than one state, so the certificate has to travel: it must carry
   real CE credit and it must be worth two hours, which is what a
   non-resident state will accept without argument. Success CE also
   sells a $0.00 AML course carrying zero CE hours -- fine for the
   federal obligation on its own, useless on a multi-state file, and
   the one an agent picks by accident. AML_TRAP names it so the
   portal can warn them off it by name.

   Forty-eight states get "The Battle Rages On". Connecticut,
   Minnesota and Ohio do not stock it at two hours, so they get
   "AML Developments" instead -- same credit, same price. `alt`
   holds the other two-hour options in that state for anyone who
   wants a different subject. */
export const AML_TRAP = "AML - Anti-Money Laundering for Insurance/Securities";

export const CE_CART = {
  AK: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "AML Risk Management", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Alaska 8 Hour LTC Initial Training", h:8, p:"$9.95" }, { n:"Alaska 4 Hour LTC Follow-up", h:4, p:"$9.95" }], extras:[] },
  AL: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Alabama Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  AR: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments"] }, ltc:[{ n:"Arkansas Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  AZ: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Arizona Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  CA: { packages:4, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"New California Long-Term Care", h:8, p:"$9.95" }], extras:[{ n:"Life Insurance Policies", h:4, p:"$19.95" }, { n:"Comprehensive Annuity Training", h:8, p:"$19.95" }] },
  CO: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Colorado Long Term Care General", h:8, p:"$9.95" }], extras:[] },
  CT: { packages:2, aml:{ n:"AML Developments", h:2, p:"$4.95", alt:["Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Principles of Long-Term Care", h:10, p:"$9.95", generic:true }], extras:[] },
  DC: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[], extras:[] },
  DE: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Delaware Partnership LTC Follow-Up", h:3, p:"$9.95" }, { n:"Principles of Long-Term Care", h:8, p:"$9.95" }], extras:[] },
  FL: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC 4 hour Follow-up", h:4, p:"$9.95" }], extras:[] },
  GA: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments"] }, ltc:[{ n:"Georgia Long Term Care Partnership", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  HI: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[], extras:[{ n:"Hawaii Insurance Rules & Regulations - L&H", h:5, p:"" }] },
  IA: { packages:3, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  ID: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"ID LTC Partnership", h:8, p:"$9.95" }, { n:"Principles of Long-Term Care", h:8, p:"$9.95" }], extras:[] },
  IL: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  IN: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Long Term Care in Indiana", h:8, p:"$9.95" }, { n:"Indiana 5 Hour Long Term Care", h:5, p:"$9.95" }], extras:[] },
  KS: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC Initial Training", h:4, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  KY: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML - Agent/Rep Responsibilities Under AML Laws", "AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Kentucky Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  LA: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Louisiana Long Term Care Partnership", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  MA: { packages:3, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML - Agent/Rep Responsibilities Under AML Laws", "AML - What's New", "AML Developments", "Anti-Money Laundering Trends", "Bank Secrecy Act and AML Review", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"MA 8hr Partnership Long-Term Care", h:8, p:"$9.95" }, { n:"MA 4hr Partnership LTC Follow-up", h:4, p:"$9.95" }], extras:[] },
  MD: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  ME: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Maine Long Term Care Partnership", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  MI: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Michigan Long Term Care Partnership", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  MN: { packages:2, aml:{ n:"AML Developments", h:2, p:"$4.95", alt:[] }, ltc:[{ n:"Medical Assistance Eligibility & The LTC Partnership Program", h:8, p:"$9.95" }, { n:"Medical Assistance Eligibility and the LTC Partnership Program - 4 Hours", h:4, p:"$9.95" }], extras:[] },
  MO: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Missouri Partnership LTC", h:8, p:"" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  MS: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[], extras:[] },
  MT: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Montana Long Term Care and Partnership Program", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[{ n:"Montana Legislative Updates", h:1, p:"" }] },
  NC: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"North Carolina Partnership Long-Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  ND: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"North Dakota Long Term Care Partnership", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  NE: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Nebraska LTC Partnership", h:8, p:"" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  NH: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"New Hampshire Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  NJ: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"New Jersey Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  NM: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"New Mexico Long-Term Care Partnership Program", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  NV: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  NY: { packages:3, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["Bank Secrecy Act and AML Review", "AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[], extras:[{ n:"New York Insurance Law", h:1, p:"" }, { n:"Professional Insurance Standards", h:3, p:"" }] },
  OH: { packages:2, aml:{ n:"AML Developments", h:2, p:"$4.95", alt:["Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Ohio Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  OK: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Oklahoma Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow-Up", h:4, p:"" }], extras:[{ n:"Oklahoma Legislative Updates", h:2, p:"" }, { n:"Earthquake Insurance", h:1, p:"" }] },
  OR: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"OR Long Term Care Partnership", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[{ n:"Oregon Statutes & Regulations", h:3, p:"" }] },
  PA: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  RI: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Rhode Island Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  SC: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"South Carolina Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow-up", h:4, p:"$9.95" }], extras:[] },
  SD: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"South Dakota Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow Up", h:4, p:"$9.95" }], extras:[{ n:"South Dakota Medicaid", h:1, p:"" }] },
  TN: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Tennessee Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  TX: { packages:3, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Texas Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[{ n:"Texas Annuities", h:8, p:"" }] },
  UT: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Utah Long Term Care Initial Training", h:3, p:"" }, { n:"Partnership LTC Follow up", h:3, p:"" }], extras:[] },
  VA: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Virginia Partnership LTC", h:8, p:"" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  VT: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Vermont LTC Partnership Program and Medicaid", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  WA: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"WA LTC Initial 8 Hour Course", h:8, p:"" }, { n:"WA LTC Refresher 4 hour Course", h:4, p:"" }], extras:[] },
  WI: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"WI Partnership LTC & Medicaid Training", h:8, p:"" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[{ n:"Specific Medicaid & LTC Information Training", h:2, p:"" }] },
  WV: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"West Virginia Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
  WY: { packages:2, aml:{ n:"AML - The Battle Rages On", h:2, p:"$4.95", alt:["AML Developments", "Safeguarding Insurance: Comprehensive AML Measures"] }, ltc:[{ n:"Wyoming Partnership Long Term Care", h:8, p:"$9.95" }, { n:"Partnership LTC Follow up", h:4, p:"$9.95" }], extras:[] },
};

export function ceCart(code, licenseType){
  const c = CE_CART[code];
  if (!c) return null;
  /* Long-term care is a health-line product. A Life-only agent cannot
     sell it, so the course is dropped rather than sold to them. */
  const health = licenseType == null || /health/i.test(String(licenseType));
  return { ...c, ltc: health ? c.ltc : [] };
}

/* ------------------------------------------------------------------
   THE BASKET, RENDERED

   This lives here rather than in the agent app because two screens
   have to show exactly the same thing: the agent's continuing-education
   step, and the agent preview inside the admin console's state guide.
   The whole point of that preview is to let an owner check placement
   without creating fifty-one accounts -- so if it renders a different
   basket, it is worse than useless.

   One function, one source of truth, two callers.
------------------------------------------------------------------- */
const bEsc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

export const CE_CATALOG_URL = "https://app.successce.com/v2Theme/Courses/SelectCourse.aspx";
export const CE_CAPTURED = "28 August 2026";

export function ceBasketHTML(code, licenseType, playbook){
  const cart = ceCart(code, licenseType);
  if (!cart) return "";

  /* Only meaningful while the agency is actually sending people to
     Success CE. A changed vendor means a changed basket. */
  const vendorKey = (playbook && playbook.ce && playbook.ce.vendor_key
    ? String(playbook.ce.vendor_key) : "successce").toLowerCase();
  if (vendorKey !== "successce") return "";

  const stateName = (STATES[code] && STATES[code].name) || "your state";
  const health = /health/i.test(String(licenseType || ""));
  const money = (c) => [c.h ? `${c.h} hrs` : null, c.p || null].filter(Boolean).join(" \u00b7 ");
  const line  = (c) => `<div class="cart-course"><span class="cc-n">${bEsc(c.n)}</span>${
    money(c) ? `<span class="cc-m">${bEsc(money(c))}</span>` : ""}</div>`;

  const steps = [];
  steps.push({ t: "Open the course catalog",
    b: `<a class="btn btn-accent btn-sm" href="${CE_CATALOG_URL}" target="_blank" rel="noopener">Open Success CE</a>` });

  steps.push({ t: "Choose your state and license",
    b: `<div class="cart-pick"><span>${bEsc(stateName)}</span><span>Life Only / Life &amp; Health / Annuity (Reg BI) / Ethics / LTC</span></div>` });

  steps.push({ t: "Add one all-inclusive package",
    b: `<p class="cart-note">${cart.packages} to choose from. Any single one of them meets ${bEsc(stateName)}&rsquo;s minimum hours, so pick the one that matches what you intend to sell &mdash; you do not need more than one.</p>` });

  if (cart.ltc.length) {
    /* A generic course is one the catalog stocks but the state does not
       mandate. Saying so matters: an agent who buys it believing it clears
       a state requirement has bought the wrong thing. */
    const generic = cart.ltc.every((c) => c.generic);
    steps.push({ t: "Add your long-term care course",
      b: cart.ltc.map(line).join("") + (generic
        ? `<p class="cart-note">${bEsc(stateName)} does not publish its own long-term-care course or hour count. This is the general one &mdash; useful, but confirm with your carrier that it accepts it before you rely on it.</p>`
        : `<p class="cart-note">Take the initial course now. The follow-up is for your next renewal, not today.</p>`) });
  } else if (health) {
    steps.push({ t: "Long-term care &mdash; nothing to buy",
      b: `<p class="cart-note">${bEsc(stateName)} has no long-term-care training requirement and Success CE lists no course for it, so there is nothing to add here. If you intend to write LTC, ask your carrier &mdash; a carrier can ask for more than the state does.</p>` });
  }

  /* The one course an agent is most likely to get wrong, and the one that
     costs them most later. Most agents end up writing in more than one
     state, and the AML certificate travels with them -- so it has to carry
     real CE credit and be worth two hours, or a non-resident state will not
     take it. The free course on the same screen carries none. */
  if (cart.aml) {
    steps.push({ t: "Add anti-money laundering",
      b: line(cart.aml) +
        `<p class="cart-note">Two hours, and it carries CE credit &mdash; both matter. You will almost certainly end up licensed in more than one state, and this certificate goes with you. A shorter one, or one with no CE credit, gets refused when you apply somewhere new.</p>` +
        `<p class="cart-note cart-warn">Do <b>not</b> take &ldquo;${bEsc(AML_TRAP)}&rdquo;. It is free because it carries <b>no CE credit at all</b> &mdash; it satisfies the federal rule and nothing else. It sits right next to the right one on the same screen.</p>` +
        ((cart.aml.alt && cart.aml.alt.length)
          ? `<p class="cart-note">If you would rather a different subject, ${
              cart.aml.alt.length === 1 ? "this one is" : "these are"
            } also two hours with CE credit: ${bEsc(cart.aml.alt.join(", "))}.</p>`
          : "") });
  } else {
    steps.push({ t: "Anti-money laundering",
      b: `<p class="cart-note cart-warn">Success CE does not carry an AML course for ${bEsc(stateName)}. You still need one &mdash; carriers will not appoint you without it. Ask your coordinator where to take it.</p>` });
  }

  if (cart.extras.length) {
    steps.push({ t: `Add ${bEsc(stateName)}&rsquo;s own courses`,
      b: cart.extras.map(line).join("") +
         `<p class="cart-note">${bEsc(stateName)} asks for these on top of the package. They are not optional.</p>` });
  }

  steps.push({ t: "Check out",
    b: `<p class="cart-note">Then upload each certificate below as it comes through. You do not have to wait until you have all of them.</p>` });

  return `
    <div class="section-k" style="margin-top:24px">Your courses in ${bEsc(stateName)}</div>
    <ol class="cart">${steps.map((s) => `
      <li class="cart-step">
        <div class="cart-t">${s.t}</div>
        <div class="cart-b">${s.b}</div>
      </li>`).join("")}</ol>
    <p class="hint cart-foot">Course names and prices read from Success CE&rsquo;s catalog on ${CE_CAPTURED}${
      health ? "" : ", for a Life-only license &mdash; long-term care is left out because you cannot sell it on this license"
    }. If what you see in the basket differs, believe the basket and tell your coordinator.</p>`;
}

/* Long-term care is a health product line. An agent licensed Life only
   cannot sell it at all, so putting the training in front of them is
   noise at best and a wasted course fee at worst. Slots carrying
   lines:"health" are dropped unless the license includes health.
   Called without a license type -- as the admin console does when it is
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

/* ============================================================
   STATE PLAYBOOKS

   What an agent is told to do in a given state: vendor, link, what the
   exam is actually called there, and the click-by-click steps.

   Three layers, resolved most-specific-first:

     1. the agency's own row   (they changed vendors)
     2. the LicenseFlow master (Mariah improved the default)
     3. the defaults below     (compiled in, always present)

   Layer 3 is why no seeding was needed and why nothing is ever blank:
   a state nobody has touched still answers completely. A row only comes
   into existence the moment somebody edits that state, and it carries
   only that state, for only that owner.
   ============================================================ */

/* The five steps that carry a vendor and a link. Fingerprinting and the
   affidavit are links without a vendor; misc is a free note. */
export const PLAYBOOK_SECTIONS = [
  { key:"study",     label:"Study material",       req:"study_material" },
  { key:"exam",      label:"Exam registration",    req:"exam" },
  { key:"state_app", label:"State application",    req:"nipr_application" },
  { key:"ce",        label:"Continuing education", req:"continuing_education" },
  { key:"eo",        label:"Errors & Omissions",   req:"eo" },
];

/* The completion screen's editable fields, in the order they appear on it. */
export const COMPLETE_FIELDS = [
  { key:"eyebrow",    label:"Small label above the heading", kind:"line" },
  { key:"heading",    label:"Heading",                       kind:"line" },
  { key:"lead",       label:"Opening sentence",              kind:"text" },
  { key:"now_title",  label:"NOW \u2014 heading",            kind:"line" },
  { key:"now_body",   label:"NOW \u2014 wording",            kind:"text" },
  { key:"next_title", label:"NEXT \u2014 heading",           kind:"line" },
  { key:"next_body",  label:"NEXT \u2014 wording",           kind:"text" },
  { key:"keep_title", label:"KEEP \u2014 heading",           kind:"line" },
  { key:"keep_body",  label:"KEEP \u2014 wording",           kind:"text" },
];

/* {name}, {state} and {license} are the only substitutions. Anything else
   in braces is left exactly as typed rather than silently emptied. */
export function fillTokens(str, vals){
  return String(str || "").replace(/\{(name|state|license)\}/g, (m, k) =>
    vals[k] != null && vals[k] !== "" ? vals[k] : m);
}

/* The written steps for continuing education, in the same order as the
   basket the agent actually sees. They exist so the command center's
   Steps pane is not blank for this one requirement, and so an agency can
   rewrite them the way it can rewrite every other step list.

   Built from CE_CART rather than typed out, because a hand-written copy
   would drift from the basket the first time Success CE moves a course.
   Written for a Life & Health agent -- the fuller case -- with the
   long-term-care line marked as health-only rather than dropped, since a
   coordinator reading this needs to see it either way. */
/* ------------------------------------------------------------------
   THE LICENSE APPLICATION

   Transcribed from the agency's own NIPR handout rather than written
   from the outside, because the click path is not guessable and getting
   it wrong costs an agent an afternoon. Three things in here are the
   difference between an approval and a delay, and all three come from
   the handout:

     - the background check is FEDERAL and pulls ten years, so any
       discrepancy in what they type stalls the file
     - answering YES to a background question means sending the
       supporting documents to NIPR straight away, not waiting to be asked
     - employment history wants five unbroken years; gaps are filled
       with Self-Employed or Unemployed rather than left blank

   Georgia is not NIPR at all -- see below.
------------------------------------------------------------------- */
const NIPR_WARNING =
  "Your state runs a FEDERAL background check going back at least ten years. " +
  "Any discrepancy between what you enter and what it finds will delay approval, " +
  "so take your time over names, dates and addresses. If you answer YES to any " +
  "background question, send the supporting documents to NIPR straight away \u2014 " +
  "do not wait to be asked for them.";

const NIPR_WARNING_ALT = (state, system) =>
  `${state} does not use NIPR for a resident's first license \u2014 you apply through ${system} instead. ` +
  "Everything else still holds: the state runs a FEDERAL background check going back at least ten years, " +
  "any discrepancy will delay approval, and if you answer YES to a background question, send the supporting " +
  "documents in straight away rather than waiting to be asked.";

const NIPR_STEPS = [
  "Open NIPR and click \u201cStart Now\u201d under Apply for a New License.",
  "Choose \u201cIndividual\u201d.",
  "Choose \u201cSocial Security Number\u201d.",
  "Enter your Social Security number and last name, then click NEXT.",
  "Enter your date of birth, then click NEXT.",
  "Click \u201cStart\u201d.",
  "Choose \u201cProducer License\u201d.",
  "Choose \u201cInitial\u201d.",
  "Choose \u201cResident\u201d, then click NEXT.",
  "Select your state, then click NEXT.",
  "Select your line of authority \u2014 Life if that is what you passed, or both Life and Health if you passed both \u2014 then click NEXT.",
  "Review the price, then carry on.",
  "Fill in the application with your personal details.",
  "Business address: use the same address as your mailing address.",
  "Employment history: give five consecutive years. Fill any gap with Self-Employed or Unemployed rather than leaving it blank.",
  "Aliases and affiliations: skip both sections.",
  "Finish the form and submit payment.",
];

/* Georgia is the only state that does not take a resident's first
   application through NIPR. That is not a guess: NIPR's own "Select a
   State" list, walked on 28 August 2026, runs Florida, Guam, Hawaii --
   Georgia is absent from it, while California, Florida, Minnesota,
   Nevada, New York and Wyoming are all present and selectable.

   An earlier version of this file had all seven marked as non-NIPR. That
   was wrong, and the mistake is worth naming so it is not repeated:
   several state departments point residents at Sircon on their own
   websites, and Sircon is a private licensing gateway, not a state
   system -- being pointed at one gateway does not mean the other is
   closed. Only Georgia actually closes it.

   An agent gets one route and no caveats. Telling them their state also
   has another portal answers a question they were never asking, and the
   step screen is the wrong place to hedge. */
export const APPLY_ELSEWHERE = {
  GA: { vendor:"Sircon", vendor_key:"sircon", url:"https://www.sircon.com/georgia" },
};

const ALT_STEPS = (state, system) => [
  `Open ${system} \u2014 ${state} residents apply there, not through NIPR.`,
  "Apply for an initial resident Producer license.",
  "Select your line of authority \u2014 Life if that is what you passed, or both Life and Health if you passed both.",
  "Business address: use the same address as your mailing address.",
  "Employment history: give five consecutive years. Fill any gap with Self-Employed or Unemployed rather than leaving it blank.",
  "Aliases and affiliations: skip both sections.",
  "Finish the form and submit payment.",
  `${system}'s own screens are not written out here yet \u2014 if anything does not match, tell your coordinator so this list can be fixed.`,
];


export function ceSteps(code){
  const c = CE_CART[code];
  if (!c) return [];
  const name = (STATES[code] && STATES[code].name) || code;
  const out = [
    `Open the Success CE course catalog.`,
    `Choose ${name}, and the license category "Life Only / Life & Health / Annuity (Reg BI) / Ethics / LTC".`,
    `Add ONE all-inclusive package \u2014 there ${c.packages === 1 ? "is 1" : "are " + c.packages} to choose from and any single one meets the state minimum.`,
  ];
  if (c.ltc.length) {
    out.push(`Long-Term Care (only if the agent holds a health line): add "${c.ltc[0].n}"${
      c.ltc[0].h ? ` \u2014 ${c.ltc[0].h} hours` : ""}${c.ltc[0].p ? `, ${c.ltc[0].p}` : ""}.${
      c.ltc.length > 1 ? ` The ${c.ltc[1].h}-hour follow-up is for the next renewal, not now.` : ""}`);
  } else {
    out.push(`Long-Term Care: ${name} lists no course. Nothing to add \u2014 the carrier may still ask for one.`);
  }
  if (c.aml) {
    out.push(`Add "${c.aml.n}" \u2014 ${c.aml.h} hours, ${c.aml.p}. It must be 2 hours AND carry CE credit so it travels to other states.`);
    out.push(`Do NOT add "${AML_TRAP}". It is free because it carries no CE credit, and it sits right beside the right one.`);
  }
  if (c.extras.length) {
    out.push(`${name} also requires: ${c.extras.map(x => `${x.n} (${x.h} hrs${x.p ? ", " + x.p : ""})`).join("; ")}.`);
  }
  out.push(`Check out, then upload each certificate to the portal as it arrives.`);
  return out;
}

/* ==================================================================
   THE ORDER OF THE JOURNEY

   For most of the country the sequence is the same, and for years this
   product assumed it was the same everywhere. It is not. Seven states
   put the state application, the fingerprints or a supplemental document
   BEFORE the exam, and in two of them -- Arkansas and North Carolina --
   an agent who books the exam first has done the steps backwards.

   So the order is data now, not code. Each state names its own sequence
   and the dependency chain is rebuilt from it, which means a state can
   be resequenced by editing one line rather than by rewriting the flow.

   Steps a state does not have are dropped: only 34 states fingerprint
   through this process and only 6 want a supplemental document, so the
   rest never see those screens.
   ================================================================== */
export const STEP_ORDER_DEFAULT = [
  "study_material", "exam", "fingerprinting", "nipr_application", "affidavit",
  "license_number", "npn", "continuing_education", "eo",
];

/* Taken from the licensing sheet, where these seven carry an asterisk and
   numbered links. The trailing steps -- license number, NPN, continuing
   education, E&O -- never move: you cannot be issued a number before you
   have applied for one. */
const TAIL = ["license_number", "npn", "continuing_education", "eo"];

export const STEP_ORDER = {
  AR: ["study_material", "nipr_application", "fingerprinting", "exam", ...TAIL],
  NC: ["study_material", "nipr_application", "fingerprinting", "exam", ...TAIL],
  KY: ["study_material", "affidavit", "nipr_application", "exam", ...TAIL],
  GA: ["study_material", "exam", "affidavit", "nipr_application", "fingerprinting", ...TAIL],
  KS: ["study_material", "exam", "affidavit", "fingerprinting", "nipr_application", ...TAIL],
  UT: ["study_material", "exam", "nipr_application", "fingerprinting", ...TAIL],
  WI: ["study_material", "fingerprinting", "exam", "nipr_application", ...TAIL],
  /* Wyoming mails the packet only after the application is filed, so
     fingerprinting cannot come before it. */
  WY: ["study_material", "exam", "nipr_application", "fingerprinting", ...TAIL],
};

export function stepOrder(code){
  return (STEP_ORDER[code] || STEP_ORDER_DEFAULT).slice();
}

/* ------------------------------------------------------------------
   THE SUPPLEMENTAL DOCUMENT

   The sheet calls this column "Affidavit", but only Georgia's actually is
   one. Kansas wants a tax clearance from the Department of Revenue,
   Kentucky a court records check, Iowa a criminal-history request. Telling
   a Kansas agent to find an affidavit sends them looking for the wrong
   document, so each state names its own; `affidavit` survives only as the
   internal key.
------------------------------------------------------------------- */
export const SUPPLEMENTAL = {
  AL: { label: "Initial licensee form",
        lead: "Alabama asks for its initial licensee form before your file can be cleared. Open it, follow the instructions on the page, and upload what it gives you." },
  GA: { label: "Citizenship affidavit",
        lead: "Georgia requires a citizenship affidavit. Open it, follow the instructions on the page, and upload the completed affidavit." },
  IA: { label: "Criminal history request",
        lead: "Iowa asks you to submit a criminal-history billing and request form. Open it, follow the instructions on the page, and upload your confirmation." },
  KS: { label: "Tax clearance certificate",
        lead: "Kansas asks for a tax clearance certificate from the Department of Revenue \u2014 not an affidavit. Request it, then upload the certificate." },
  KY: { label: "Court records check",
        lead: "Kentucky asks for a court records check. Open the courts site, follow the instructions there, and upload what it returns." },
  /* The sheet's Arizona row carries Alabama's Department of Insurance URL
     (aldoi.gov). Rather than send an Arizona agent to another state's
     licensing form, this step says what we know and stops. */
  AZ: { label: "Supplemental document",
        lead: "Arizona has a supplemental requirement on file, but the link we hold points at another state's department. Ask your coordinator what Arizona needs before you act on it.",
        unverified: true },
};

/* ------------------------------------------------------------------
   COPY THAT TWO SCREENS SHARE

   The agent's step and the state guide's preview of that step have to say
   the same thing. When this text lived inside app.js the preview silently
   showed an older version, which is worse than useless -- the whole point
   of the preview is to check what an agent will actually see.

   Ordered by what moves a score, not by the order you meet them in the
   course. Practice questions first: these exams turn on how a question is
   worded, and reading the material through once does not prepare anybody
   for that.
------------------------------------------------------------------- */
export const STUDY_TIPS = [
  "<b>Take the practice quizzes and tests over and over.</b> This is the part that matters \u2014 far more than reading the material through again.",
  "<b>Focus on vocabulary.</b> Most exam questions turn on knowing the exact term, and the wording is deliberately tricky.",
  "<b>Watch the videos.</b> They carry the course \u2014 don't skip ahead to the text.",
  "<b>Review your notes and the chapter summaries</b> rather than re-reading whole chapters.",
];

/* One instruction, identical in every state. Seventeen states issue a
   certificate and thirty-three do not, but an agent does not need that
   taxonomy -- they either have one in hand or they don't. */
export const EXAM_BRING = {
  label: "Bring to your exam",
  body: "Have your certificate of completion ready by your exam date, along with photo ID. " +
        "If your course issues one, you will not be seated without it.",
};

/* ------------------------------------------------------------------
   PRE-LICENSING THAT HAS TO BE SCHEDULED

   Illinois is the only state of the fifty-one that makes part of
   pre-licensing LIVE. Twenty hours per line of authority, of which 7.5
   must be a classroom or a live webinar -- so a Life & Health candidate
   sits through two of them, one for Life and one for Health, and has to
   attend the whole session to get the certificate. Pearson VUE will not
   seat anybody without a current signed copy of it.

   That breaks the advice this product gives everywhere else. The study
   step normally says "buy it and go book your exam, you don't have to
   finish the course first", which is true where the whole requirement is
   self-study and false in Illinois: the webinar runs on somebody else's
   calendar, and until it has been attended there is no certificate and
   therefore no exam.

   The fix is not to warn them later. Xcel lets an agent book the webinar
   at the moment they buy the course, so the instruction belongs in the
   study step, on day one, while they are already on the site.

   Verified on the Illinois DOI's own producer page and on Xcel's Illinois
   requirements page, August 2026. Every other state allows the whole
   requirement by self-study, or has no pre-licensing requirement at all.
------------------------------------------------------------------- */
export const PRELICENSE_LIVE = {
  IL: {
    live_hours: 7.5,
    lead: "Buy your state-approved course \u2014 and book your webinar dates in the same sitting. " +
          "Illinois is the one state where part of pre-licensing has to be attended live, so unlike " +
          "everywhere else you cannot book your exam until that is done.",
    note: "Illinois requires 20 hours per line of authority, and 7.5 of them must be a classroom or " +
          "live webinar. Licensing for Life and Health means TWO webinars \u2014 one for each line \u2014 " +
          "and you have to attend the whole session to get your certificate.",
    steps: [
      "Book your webinar dates while you are buying the course. Xcel lets you do both in one go, and the dates fill up.",
      "Licensing for both Life and Health? Book two webinars \u2014 one for each line. They are separate sessions.",
      "Attend the whole session. Leaving early means no certificate, and the certificate is what gets you into the exam.",
      "Keep the signed certificate. Pearson VUE will not seat you without a current copy of it \u2014 a photo on your phone is fine.",
    ],
  },
};

export function playbookDefaults(code){
  const s = STATES[code];
  if (!s) return null;
  const prov = examProvider(s.exam);
  const fpHttp = !!(s.fp && s.fp.startsWith("http"));
  return {
    exam: {
      vendor: PROVIDER_LABEL[prov] || "",
      /* Taken from the exam URL rather than the label, so renaming
         "Pearson VUE" to "Pearson" in the guide cannot silently detach the
         Pearson walkthrough from twenty-seven states. */
      vendor_key: prov || "",
      url: s.exam || "",
      /* Deliberately empty except where it has been checked. The exam's
         name in the vendor's own catalog varies state by state -- and
         guessing it sends somebody to sit the wrong paper. Blank reads
         as "nobody has filled this in", which is true and safe. */
      exam_name: s.examName || "",
      /* Where pre-licensing has a live component, the exam step has a gate
         in front of it that no other state has -- say so here rather than
         letting somebody find out at the test center door. */
      note: PRELICENSE_LIVE[code]
        ? "Before you can book: Pearson VUE will not seat you without a current signed copy of your Pre-License Course Certificate, and you only get that once you have attended your webinar in full. If you have not sat it yet, go back and do that first."
        : "",
      steps: (PROVIDER_STEPS[prov] || []).slice(),
    },
    study:     (() => {
      const live = PRELICENSE_LIVE[code];
      const base = { vendor:"Xcel Solutions", vendor_key:"xcel", url:CONSTANTS.study,
                     note:"", steps:PROVIDER_STEPS.xcel.slice() };
      if (!live) return base;
      /* The live-webinar states get the booking instruction first, because
         it is the thing with a deadline attached. */
      return { ...base, lead: live.lead, note: live.note,
               steps: live.steps.concat(base.steps) };
    })(),
    /* Seven states do not take a resident's first application through NIPR
       at all -- see APPLY_ELSEWHERE. An agent sent to NIPR in one of them
       spends an afternoon on a site that cannot process their file. */
    state_app: (() => {
      const alt = APPLY_ELSEWHERE[code];
      if (alt) return { ...alt,
        note: NIPR_WARNING_ALT(s.name, alt.vendor),
        steps: ALT_STEPS(s.name, alt.vendor) };
      return { vendor:"NIPR", vendor_key:"nipr", url:CONSTANTS.nipr,
        note: NIPR_WARNING, steps: NIPR_STEPS.slice() };
    })(),
    ce:        { vendor:"Success CE", vendor_key:"successce", url:`https://successce.com/insurance-ce-requirements-${code}/`, note:"", steps:ceSteps(code) },
    eo:        { vendor:"NAPA", vendor_key:"napa", url:CONSTANTS.eo,
                 /* The single most asked question on this step, so it is
                    stated up front rather than left to be discovered. */
                 note:"Choose the package that includes FIXED ANNUITIES. The cheapest option covers life and health only \u2014 if you write annuities and your certificate doesn't cover them, you are not protected and carriers may not accept it.",
                 steps:[
                   "Open the NAPA link and go to the Life & Health Agents section.",
                   "Compare the coverage options.",
                   "Pick the option that includes fixed annuities \u2014 not the basic life-and-health-only one.",
                   "Apply online. Coverage and proof of it come through in minutes.",
                   "Save the certificate, then come back and upload it here.",
                 ] },
    /* The screen an agent sees when their part is over. Editable because
       what happens next is an agency's own process: one hands straight to
       contracting, another books a call first. {name}, {state} and
       {license} are filled in for the agent reading it. */
    complete: {
      eyebrow: "Licensing complete",
      heading: "Well done, {name}.",
      lead:    "You've finished every step of your {state} {license} licensing. There is nothing further you need to do.",
      now_title: "Your file is with the licensing team",
      now_body:  "You'll see it change here once it's cleared.",
      next_title: "Contracting begins",
      next_body:  "Once your file is cleared, the licensing and contracting team can start your carrier contracting straight away \u2014 everything they need is already in one place, which is the point of having done it in this order.",
      keep_title: "Your record stays here",
      keep_body:  "Your license number, NPN, certificates and E&O live in the menu, top left. Come back for them whenever contracting or a carrier asks.",
    },
    fingerprinting: { url: fpHttp ? s.fp : "", note: s.fpNote || (s.fp && !fpHttp ? s.fp : "") },
    affidavit: { url: s.affidavit || "", note:"" },
    misc: s.misc || "",
  };
}

/* Section-by-section, field-by-field. A layer that omits a field leaves
   the one underneath showing, so an agency that only changed its E&O
   carrier keeps every improvement made to the other four sections. An
   explicitly emptied field is still an edit and does override -- clearing
   a step list has to mean something. */
export function mergePlaybook(...layers){
  const out = {};
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    for (const [k, v] of Object.entries(layer)) {
      if (v == null) continue;
      if (Array.isArray(v) || typeof v !== "object") { out[k] = v; continue; }
      out[k] = mergePlaybook(out[k], v);
    }
  }
  return out;
}

/* The resolved answer for one state, for one agency. */
export function resolvePlaybook(code, masterRow, agencyRow){
  const base = playbookDefaults(code);
  if (!base) return null;
  return mergePlaybook(base, masterRow || null, agencyRow || null);
}
