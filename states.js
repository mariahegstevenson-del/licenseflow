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
    "Text Pacific Ridgeway Operations with your name, state, test date and time.",
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
    "Text Pacific Ridgeway Operations with your name, state, test date and time.",
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
    { key: "success_ce", title: "Set up your continuing education (Success CE)",
      link: CONSTANTS.successCe, video: VIDEOS.success_ce,
      desc: "Set up your continuing education account.", note: CONSTANTS.successCe ? null : "Your trainer will provide the Success CE link." },
    { key: "surelc", title: "Complete carrier contracting (SureLC)",
      link: CONSTANTS.surelc, video: VIDEOS.surelc,
      desc: "Complete your carrier contracting through SureLC by SuranceBay." },
    { key: "eo", title: "Get your E&O insurance",
      link: CONSTANTS.eo, video: VIDEOS.eo,
      desc: "Obtain your Errors & Omissions (E&O) insurance through 360 Coverage Pros." },
  ];
  return { state: s, provider, misc: s.misc || null, steps };
}
