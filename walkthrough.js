/* ============================================================
   WALKTHROUGHS — resolution, embedding, and the facts panel

   One rule shapes everything here:

     the VIDEO teaches the procedure
     the PORTAL supplies the facts

   A recording says "use the exam name shown above". The exam name lives
   in the state guide. Rename an exam, move a URL, change a vendor, and
   the portal is right the next time it loads without anybody opening a
   screen recorder.

   That is also why walkthroughs are not keyed to states. They are keyed
   to what actually makes a procedure different:

     universal   same everywhere                    1 asset
     vendor      differs by who you do it with      a few
     state       the state's process is its own     rare

   Twenty-seven states book through Pearson VUE and share one exam
   walkthrough. Alabama tests through its own university and needs its
   own. Five assets cover fifty-one jurisdictions.
   ============================================================ */

import { STATES } from "./states.js?v=18";

/* Which playbook section supplies each requirement's facts and vendor. */
export const REQ_SECTION = {
  study_material: "study",
  exam: "exam",
  nipr_application: "state_app",
  license_number: null,
  npn: null,
  continuing_education: "ce",
  eo: "eo",
  contracting: "contracting",
};

/* Requirements that can carry a walkthrough. Kept as its own list rather
   than derived from REQS so a future requirement -- contracting handoff,
   appointment paperwork -- can have one before it has a step screen. */
export const WALKTHROUGH_REQS = [
  { key: "study_material",       label: "Study materials" },
  { key: "exam",                 label: "Exam registration" },
  { key: "nipr_application",     label: "NIPR / licence application" },
  { key: "license_number",       label: "Licence number & NPN" },
  { key: "npn",                  label: "NPN lookup" },
  { key: "continuing_education", label: "Continuing education" },
  { key: "eo",                   label: "Errors & Omissions" },
  { key: "contracting",          label: "Contracting handoff" },
];

/* Vendor keys are stable identifiers, not display names. An agency may
   call Pearson VUE whatever it likes in its own guide without detaching
   the recording from the twenty-seven states that use it. */
export function vendorKeyFor(playbook, requirementKey){
  const sec = REQ_SECTION[requirementKey];
  if (!sec || !playbook || !playbook[sec]) return null;
  const s = playbook[sec];
  if (s.vendor_key) return String(s.vendor_key).toLowerCase();
  /* Fall back to a slug of the label for vendors added by an agency. If
     it matches nothing, resolution simply falls through to the universal
     walkthrough, which is the safe answer rather than a broken one. */
  return s.vendor ? String(s.vendor).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : null;
}

/* ------------------------------------------------------------------
   RESOLUTION — most specific wins, and it always terminates.

     1  the agency chose one for this requirement in this state
     2  the agency chose one for this requirement in every state
     3  the agency's own asset for this state
     4  the agency's own asset for this vendor
     5  the agency's own universal asset
     6  the shared library's asset for this state
     7  the shared library's asset for this vendor
     8  the shared library's universal asset
     9  nothing yet -- the portal says so plainly

   Steps 1 and 2 are how an agency picks a different approved recording
   without anybody copying a file.
------------------------------------------------------------------- */
export function resolveWalkthrough(opts){
  const { requirementKey, stateCode, licenseType, agencyId, playbook,
          library = [], assignments = [] } = opts || {};
  if (!requirementKey) return null;

  const vendor = vendorKeyFor(playbook, requirementKey);
  const usable = (w) =>
    w && w.status === "active" && w.requirement_key === requirementKey &&
    (!w.license_type || !licenseType || w.license_type === licenseType);

  const byId = (id) => library.find((w) => w.id === id);

  /* 1 & 2 — an explicit choice beats everything derived. */
  const pick = assignments.find(
      (a) => a.requirement_key === requirementKey && a.state_code === stateCode)
    || assignments.find(
      (a) => a.requirement_key === requirementKey && !a.state_code);
  if (pick && pick.walkthrough_id) {
    const w = byId(pick.walkthrough_id);
    if (usable(w)) return { ...w, why: "assigned", assignment: pick };
  }

  const from = (owner) => {
    const mine = library.filter((w) => usable(w) &&
      (owner === null ? w.agency_id === null : w.agency_id === owner));
    return (
      (stateCode && mine.find((w) => w.scope === "state"  && w.state_code === stateCode)) ||
      (vendor    && mine.find((w) => w.scope === "vendor" && (w.vendor_key || "").toLowerCase() === vendor)) ||
      mine.find((w) => w.scope === "universal") || null
    );
  };

  /* 3-5 the agency's own shelf, then 6-8 the shared library. */
  const own = agencyId ? from(agencyId) : null;
  if (own) return { ...own, why: "agency", vendorKey: vendor };
  const shared = from(null);
  if (shared) return { ...shared, why: "library", vendorKey: vendor };
  return null;
}

/* ------------------------------------------------------------------
   THE FACTS PANEL

   Everything here comes from the state guide, never from the recording.
   Anything that could change is a row in this panel; the video points at
   the panel rather than repeating it.
------------------------------------------------------------------- */
export function factsFor(requirementKey, ctx){
  const { playbook, stateCode, licenseType } = ctx || {};
  const sec = REQ_SECTION[requirementKey];
  const s = (sec && playbook && playbook[sec]) || {};
  const out = [];
  const add = (k, v, opts) => { if (v) out.push({ k, v, ...(opts || {}) }); };

  add("State", STATES[stateCode]?.name || stateCode);
  add("Licence", licenseType);

  if (requirementKey === "exam") {
    add("Exam provider", s.vendor);
    add("Exam name", s.exam_name, { emphasis: true,
      missing: !s.exam_name,
      hint: s.exam_name ? null : "Not recorded for this state yet — check with your coordinator before booking." });
  } else {
    add(vendorLabelFor(requirementKey), s.vendor);
  }
  return out;
}

function vendorLabelFor(key){
  return key === "study_material" ? "Course provider"
    : key === "nipr_application"  ? "Applied through"
    : key === "continuing_education" ? "CE provider"
    : key === "eo" ? "E&O provider"
    : "Provider";
}

/* ------------------------------------------------------------------
   EMBEDDING

   YouTube and Vimeo bring their own controls, captions and speed menu.
   A file we host gets the native player plus a captions track when one
   exists. Either way the calling code does not care which it got.
------------------------------------------------------------------- */
export function videoSource(w){
  const url = (w && w.video_url) || "";
  if (!url) return null;
  const kind = (w.video_kind && w.video_kind !== "auto") ? w.video_kind : sniff(url);
  let m;
  if (kind === "youtube" && (m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/)))
    return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` };
  if (kind === "vimeo" && (m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}` };
  if (kind === "loom" && (m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/)))
    return { kind: "iframe", src: `https://www.loom.com/embed/${m[1]}` };
  if (kind === "mp4") return { kind: "file", src: url };
  return { kind: "iframe", src: url };
}

function sniff(url){
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com/.test(url))             return "vimeo";
  if (/loom\.com/.test(url))              return "loom";
  if (/\.(mp4|webm|mov)($|\?)/i.test(url)) return "mp4";
  return "other";
}

/* Only a file we serve ourselves can be resumed, sped up or rewound by
   our own controls; an embedded player owns its own. */
export const isFile = (w) => (videoSource(w) || {}).kind === "file";

export function fmtDuration(sec){
  if (!sec || sec < 1) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? `${m} min${s >= 30 ? " 30 sec" : ""}` : `${s} sec`;
}

export const clockTime = (sec) => {
  const t = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------
   THE RECORDING STANDARD

   Held in code so the shape of every walkthrough is the same one the
   admin console tells you to record, and so it can be shown next to the
   library rather than living in somebody's notes.
------------------------------------------------------------------- */
export const RECORDING_STANDARD = [
  { n: "1", t: "Title screen",
    d: "Three seconds. What this covers, and that it applies to any state." },
  { n: "2", t: "What you'll need",
    d: "Card number, licence details, the tab already open — whatever they should fetch before starting." },
  { n: "3", t: "The procedure",
    d: "Screen capture of the clicks. Point at the portal for anything specific: “use the exam name shown above”." },
  { n: "4", t: "Pause points",
    d: "On-screen “pause here and do this” before each stretch they perform themselves." },
  { n: "5", t: "Warnings",
    d: "The mistakes that cost weeks — wrong exam, wrong coverage, wrong state." },
  { n: "6", t: "What you should now have",
    d: "A confirmation number, a receipt, a certificate. Something they can check against." },
  { n: "7", t: "What happens next",
    d: "Which step to come back to, and what the portal will ask them for." },
];
