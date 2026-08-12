/* ============================================================
   LicenseFlow OS — Licensing Rules Engine + State Machine
   ------------------------------------------------------------
   This is the core "understanding" of the product. The UI never
   hardcodes the licensing workflow; it asks the engine.

   IMPORTANT (compliance): the regulatory content below is
   SAMPLE data for demonstration. Every requirement carries a
   `source`, `verified` flag, and `asOf` date. Nothing here is
   authoritative. Real requirements are loaded into this same
   shape (ideally from NIPR / state DOI feeds) without changing
   the application code.
   ============================================================ */

// Canonical licensing stages (the state machine backbone).
export const STAGES = [
  { key: "profile",     label: "Create Profile" },
  { key: "eligibility", label: "Confirm Eligibility" },
  { key: "education",   label: "Required Education" },
  { key: "edu_done",    label: "Education Complete" },
  { key: "exam_prep",   label: "Exam Preparation" },
  { key: "exam",        label: "State Examination" },
  { key: "fingerprint", label: "Fingerprints / Background" },
  { key: "application", label: "Application" },
  { key: "review",      label: "State Review" },
  { key: "licensed",    label: "Licensed" },
];

export const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

// Status vocabulary for journey nodes.
export const STATUS = {
  COMPLETE: "complete",
  CURRENT: "current",
  LOCKED: "locked",
  WAITING: "waiting",
  ACTION: "action_required",
  FAILED: "failed",
  NA: "na",
};

/* ------------------------------------------------------------
   SAMPLE regulatory rule set.
   Keyed by state -> license type. Each entry lists which stages
   apply and per-stage sample detail. Marked verified:false.
------------------------------------------------------------ */
export const RULES = {
  TX: {
    name: "Texas",
    licenses: {
      "Life": {
        preLicensingHours: 20,
        examName: "Texas Life Agent Exam",
        examProvider: "Pearson VUE",
        fingerprintRequired: true,
        stages: ["profile","eligibility","education","edu_done","exam_prep","exam","fingerprint","application","review","licensed"],
        notes: "Sample values for demonstration only.",
        source: "SAMPLE — verify at Texas Department of Insurance (tdi.texas.gov) / NIPR",
        verified: false,
        asOf: "2026-08-01",
      },
      "Life & Health": {
        preLicensingHours: 40,
        examName: "Texas Life & Health Agent Exam",
        examProvider: "Pearson VUE",
        fingerprintRequired: true,
        stages: ["profile","eligibility","education","edu_done","exam_prep","exam","fingerprint","application","review","licensed"],
        source: "SAMPLE — verify at Texas Department of Insurance / NIPR",
        verified: false,
        asOf: "2026-08-01",
      },
    },
  },
  FL: {
    name: "Florida",
    licenses: {
      "Life": {
        preLicensingHours: 40,
        examName: "Florida 2-15 / 2-14 (Life) Exam",
        examProvider: "Pearson VUE",
        fingerprintRequired: true,
        stages: ["profile","eligibility","education","edu_done","exam_prep","exam","fingerprint","application","review","licensed"],
        source: "SAMPLE — verify at Florida DFS (myfloridacfo.com) / NIPR",
        verified: false,
        asOf: "2026-08-01",
      },
    },
  },
  CA: {
    name: "California",
    licenses: {
      "Life": {
        preLicensingHours: 20,
        examName: "California Life Agent Exam",
        examProvider: "PSI",
        fingerprintRequired: true,
        stages: ["profile","eligibility","education","edu_done","exam_prep","exam","fingerprint","application","review","licensed"],
        source: "SAMPLE — verify at California DOI (insurance.ca.gov) / NIPR",
        verified: false,
        asOf: "2026-08-01",
      },
    },
  },
};

export const SUPPORTED_STATES = Object.entries(RULES).map(([code, r]) => ({ code, name: r.name }));

// Non-resident applicants typically license via reciprocity and may
// skip a state's pre-licensing education. Modeled here (sample logic).
export function resolveWorkflow(profile) {
  const state = RULES[profile.state];
  if (!state) return null;
  const lic = state.licenses[profile.license_type] || Object.values(state.licenses)[0];
  if (!lic) return null;

  let stages = [...lic.stages];
  const adjustments = [];
  if (profile.resident === false) {
    // sample reciprocity logic
    stages = stages.filter((s) => s !== "education" && s !== "edu_done");
    adjustments.push("Non-resident: state pre-licensing education is typically waived via reciprocity (sample logic — verify).");
  }
  return {
    stateName: state.name,
    licenseType: profile.license_type || Object.keys(state.licenses)[0],
    stages,
    detail: lic,
    adjustments,
  };
}

/* ------------------------------------------------------------
   Progress calculators — three DISTINCT concepts.
------------------------------------------------------------ */

// A. Learning progress: % of curriculum modules complete.
export function learningProgress(moduleProgress, totalModules) {
  const done = moduleProgress.filter((m) => m.status === "complete").length;
  return totalModules ? Math.round((done / totalModules) * 100) : 0;
}

// B. Licensing progress: % of applicable licensing stages satisfied.
export function licensingProgress(workflow, reqStatus) {
  if (!workflow) return 0;
  // stages that represent real gates (exclude the terminal 'licensed' from the denominator-as-work)
  const gates = workflow.stages.filter((s) => s !== "profile");
  if (!gates.length) return 0;
  const complete = gates.filter((s) => reqStatus[s] === STATUS.COMPLETE).length;
  return Math.round((complete / gates.length) * 100);
}

// C. Exam readiness: weighted from recent practice performance + coverage.
export function examReadiness(attempts, moduleProgress, totalModules) {
  if (!attempts.length) {
    // pre-exam: readiness driven purely by learning coverage, capped low
    const cov = learningProgress(moduleProgress, totalModules);
    return Math.round(cov * 0.4); // studying alone ≠ exam ready
  }
  const recent = attempts.slice(0, 3);
  const avg = recent.reduce((s, a) => s + Number(a.score || 0), 0) / recent.length;
  const cov = learningProgress(moduleProgress, totalModules);
  // weight recent performance heavily, coverage modestly, consistency bonus
  const consistency = recent.length >= 2 ? 5 : 0;
  const val = avg * 0.75 + cov * 0.2 + consistency;
  return Math.max(0, Math.min(100, Math.round(val)));
}

// Topic strengths / weaknesses from attempt breakdowns.
export function topicInsights(attempts) {
  const agg = {};
  attempts.forEach((a) => {
    const tb = a.topic_breakdown || {};
    Object.entries(tb).forEach(([topic, v]) => {
      if (!agg[topic]) agg[topic] = { correct: 0, total: 0 };
      agg[topic].correct += v.correct || 0;
      agg[topic].total += v.total || 0;
    });
  });
  const rows = Object.entries(agg).map(([topic, v]) => ({
    topic,
    pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    total: v.total,
  }));
  return {
    strong: rows.filter((r) => r.pct >= 80).sort((a, b) => b.pct - a.pct),
    weak: rows.filter((r) => r.pct < 70).sort((a, b) => a.pct - b.pct),
    all: rows.sort((a, b) => a.pct - b.pct),
  };
}

/* ------------------------------------------------------------
   Journey status derivation: for each applicable stage, decide
   its status from the requirement instance map + current step.
------------------------------------------------------------ */
export function deriveJourney(workflow, reqStatus, currentStep) {
  if (!workflow) return [];
  const stages = workflow.stages;
  const curIdx = stages.indexOf(currentStep);
  return stages.map((key, i) => {
    const stageLabel = STAGES.find((s) => s.key === key)?.label || key;
    let status = reqStatus[key];
    if (!status) {
      if (i < curIdx) status = STATUS.COMPLETE;
      else if (i === curIdx) status = STATUS.CURRENT;
      else status = STATUS.LOCKED;
    }
    return { key, label: stageLabel, status, index: i };
  });
}

/* ------------------------------------------------------------
   The "One Thing" engine: compute the single highest-priority
   action for the agent right now, plus a human explanation.
------------------------------------------------------------ */
export function nextAction(ctx) {
  const { workflow, reqStatus, learning, readiness, documents } = ctx;
  if (!workflow) {
    return { key: "profile", title: "Set up your licensing profile", cta: "START", route: "#/onboarding",
             why: "Tell us your state and license so we can build your exact path.", minutes: 3 };
  }
  const stages = workflow.stages;
  // find first non-complete gate
  for (const key of stages) {
    if (key === "profile") continue;
    const st = reqStatus[key] || STATUS.LOCKED;
    if (st === STATUS.COMPLETE) continue;

    switch (key) {
      case "eligibility":
        return { key, title: "Confirm your eligibility", cta: "CONTINUE", route: "#/journey",
                 why: "A few quick questions to confirm you can be licensed in this state.", minutes: 2 };
      case "education":
        return { key, title: learning < 100 ? "Continue your required education" : "Finish your education requirement",
                 cta: "CONTINUE", route: "#/learn",
                 why: `Complete your state pre-licensing education (${learning}% done) before scheduling your exam.`, minutes: 18 };
      case "edu_done":
        return { key, title: "Complete Exam Preparation", cta: "CONTINUE", route: "#/readiness",
                 why: "Sharpen weak areas and build exam readiness before you schedule.", minutes: 18 };
      case "exam_prep":
        return { key, title: readiness >= 85 ? "Schedule your state examination" : "Keep building exam readiness",
                 cta: readiness >= 85 ? "SCHEDULE EXAM" : "CONTINUE",
                 route: "#/readiness",
                 why: readiness >= 85
                   ? "Your readiness looks strong. Time to schedule your exam."
                   : `You're at ${readiness}% exam readiness. Let's get you to 85%+ first.`, minutes: 15 };
      case "exam":
        return { key, title: "Record your exam result", cta: "CONTINUE", route: "#/status",
                 why: "Once you've taken the state exam, mark your result to unlock the next step.", minutes: 2 };
      case "fingerprint":
        return { key, title: "Complete fingerprints & background", cta: "CONTINUE", route: "#/documents",
                 why: "The state requires fingerprinting for your background check before your application.", minutes: 10 };
      case "application":
        return { key, title: "Submit your license application", cta: "SUBMIT APPLICATION", route: "#/status",
                 why: "Your prerequisites are done — submit your application to the state.", minutes: 12 };
      case "review":
        return { key, title: "Waiting on the state", cta: null, route: "#/status", waiting: true,
                 why: "Your application is with the state. There's nothing you need to do right now — we'll update you the moment your status changes.", minutes: null };
      default:
        break;
    }
  }
  return { key: "licensed", title: "You're licensed 🎉", cta: "VIEW LICENSE", route: "#/status",
           why: "Congratulations — your license has been issued.", minutes: null };
}

// Estimated completion date (sample heuristic from remaining stages).
export function estimateCompletion(workflow, reqStatus, fromDate) {
  if (!workflow) return null;
  const perStageDays = { eligibility:1, education:7, edu_done:1, exam_prep:5, exam:5, fingerprint:3, application:2, review:12, licensed:0 };
  let days = 0;
  for (const key of workflow.stages) {
    if (key === "profile") continue;
    if ((reqStatus[key] || "") === STATUS.COMPLETE) continue;
    days += perStageDays[key] ?? 3;
  }
  const d = new Date(fromDate.getTime() + days * 86400000);
  return d;
}

export function fmtDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}
