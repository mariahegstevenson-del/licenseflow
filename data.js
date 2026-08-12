/* ------------------------------------------------------------
   Static reference data: study modules + per-state CE hours.
   Editing this file is how you grow the study curriculum.
------------------------------------------------------------ */
window.LF_DATA = {
  // Exam / license study curriculum. `key` is stored in the DB
  // as the agent completes each module.
  studyModules: [
    { key: "basics",      title: "Insurance Basics & Terminology",     category: "Foundations",  desc: "Risk, indemnity, insurable interest, and how policies are structured." },
    { key: "life-types",  title: "Types of Life Insurance",            category: "Life",         desc: "Term, whole, universal, and variable life — features and differences." },
    { key: "policy-provisions", title: "Policy Provisions & Riders",   category: "Life",         desc: "Grace periods, incontestability, reinstatement, common riders." },
    { key: "annuities",   title: "Annuities",                          category: "Life",         desc: "Fixed, variable, and indexed annuities; accumulation and payout phases." },
    { key: "underwriting", title: "Underwriting & Applications",       category: "Practice",     desc: "Field underwriting, applications, MIB, and the risk-selection process." },
    { key: "beneficiaries", title: "Beneficiaries & Settlement",       category: "Practice",     desc: "Primary vs. contingent, per stirpes/capita, and settlement options." },
    { key: "taxation",    title: "Taxation of Life Insurance",         category: "Advanced",     desc: "MEC rules, tax treatment of death benefits, cash value, and 1035 exchanges." },
    { key: "ethics",      title: "Ethics & Suitability",               category: "Compliance",   desc: "Fiduciary duty, replacement rules, and suitability standards." },
    { key: "state-law",   title: "State Laws & Regulations",           category: "Compliance",   desc: "Licensing, marketing rules, unfair trade practices, and the DOI." },
    { key: "exam-prep",   title: "Exam Strategy & Practice Test",      category: "Exam",         desc: "How the state exam is scored, timing tips, and a full practice run." }
  ],

  // Typical CE requirement per renewal cycle (hours). This is a
  // convenience default — agents can override in their profile.
  // Always verify current figures with the state DOI.
  stateCE: {
    AL:24, AK:24, AZ:24, AR:24, CA:24, CO:24, CT:24, DE:24, FL:24, GA:24,
    HI:24, ID:24, IL:24, IN:24, IA:36, KS:24, KY:24, LA:24, ME:24, MD:24,
    MA:0, MI:24, MN:24, MS:24, MO:24, MT:24, NE:24, NV:30, NH:24, NJ:24,
    NM:24, NY:24, NC:24, ND:24, OH:24, OK:24, OR:24, PA:24, RI:24, SC:24,
    SD:24, TN:24, TX:24, UT:24, VT:24, VA:24, WA:24, WV:24, WI:24, WY:24, DC:24
  },

  states: ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],

  ceCategories: ["General", "Ethics", "Annuity Training", "Long-Term Care", "Flood", "Other"],
  ticketCategories: ["Licensing Question", "CE / Renewal Help", "Exam Prep", "Technical Issue", "Billing", "Other"]
};
