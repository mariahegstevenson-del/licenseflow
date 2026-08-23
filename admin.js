import { supabase, isConfigured, requireSession } from "./supabase.js";
import { STATES } from "./states.js?v=6";
import * as F from "./flow.js?v=6";
import { loadTenant, renderUnknownAgency, applyTenantChrome, urlForAgency } from "./tenant.js?v=4";

const el = (id) => document.getElementById(id);
const root = el("root"), navEl = el("nav"), railEl = el("rail");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const stateName = (c) => STATES[c]?.name || c || "—";
const fmtDT = (t) => t ? new Date(t).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "—";

const A = { me:null, admin:false, profiles:[], instances:[], exceptions:[], videos:[],
            view:{name:"overview"}, win:30 };
const VIDEO_STEPS = ["study_material","exam","nipr_application","license_number","npn","continuing_education","eo"];

/* how long a submission may sit before we call it overdue */
const OVERDUE_HOURS = 24;
/* how long an agent may go without movement before we call them stuck */
const STUCK_DAYS = 14;

const DAY = 86400000;
const now = () => Date.now();
const ts  = (v) => v ? new Date(v).getTime() : null;
const within = (t, from, to) => t != null && t >= from && t < to;

/* ---------------- boot ---------------- */
(async function () {
  if (!isConfigured) { root.innerHTML = pad("Connect Supabase."); return; }

  A.tenant = await loadTenant();
  if (A.tenant.unknown) { renderUnknownAgency(A.tenant.slug); return; }
  applyTenantChrome(A.tenant.agency);

  /* Signed-out visitors go to the console's own front door, not the agent
     login -- the two products have separate doors on purpose. */
  const session = await requireSession("admin-login.html"); if (!session) return;
  A.me = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "admin-login.html"; };

  /* Turns a pending invitation into a real admin row. Harmless and
     silent for anyone who wasn't invited. Repeated here because Google
     sign-in lands straight on this page without passing the door. */
  try { await supabase.rpc("lf_claim_admin"); } catch (_) {}

  const { data:adm } = await supabase.from("admins")
    .select("user_id, is_platform, agency:agencies(id,slug,name)")
    .eq("user_id", A.me.id).maybeSingle();
  A.admin = !!adm;
  A.platform = !!adm?.is_platform;
  A.agency = adm?.agency || null;
  if (!A.admin) {
    /* Not a fault -- an agent signed in and reached for a URL that isn't
       theirs. Send them to their own app rather than leaving them here.
       The database refuses them too: every table behind this console is
       admin-gated by RLS, so there is nothing to read even if they stay. */
    navEl.innerHTML = ""; railEl.innerHTML = "";
    document.body.classList.add("cc-locked");
    root.innerHTML = `<div class="card pad" style="max-width:520px;margin:48px auto">
      <h2 style="margin-top:0">This area is for administrators</h2>
      <p class="muted">Your LicenseFlow account is set up as an agent. Your licensing
      walkthrough is in the agent app.</p>
      <a class="btn btn-primary" href="app.html">Open the agent app</a></div>`;
    return;
  }

  /* An agency's coordinator belongs on their agency's console. Arriving
     anywhere else -- the main domain, or another agency's address --
     hands them to their own. LicenseFlow staff are not redirected: their
     remit is every agency, so whichever address they used is the right
     one. Again a courtesy, not the control; the database is the control. */
  if (!A.platform && A.agency && A.agency.slug !== (A.tenant?.slug || null)) {
    window.location.replace(urlForAgency(A.agency.slug, "/admin.html"));
    return;
  }
  if (A.agency) applyTenantChrome(A.agency);
  else if (A.platform) {
    document.querySelectorAll("[data-agency-name]").forEach((n) => {
      n.textContent = A.tenant?.agency ? A.tenant.agency.name : "All agencies";
      n.removeAttribute("hidden");
    });
  }

  await load();
})();

async function load() {
  const [p, inst, ex, vids] = await Promise.all([
    supabase.from("licensing_profiles").select("*"),
    supabase.from("requirement_instances").select("*"),
    supabase.from("exceptions").select("*").order("created_at",{ascending:false}),
    supabase.from("step_videos").select("*"),
  ]);
  A.profiles=p.data||[]; A.instances=inst.data||[]; A.exceptions=ex.data||[]; A.videos=vids.data||[];

  /* An agency administrator is already limited to their own agency by
     the database, so this narrowing does nothing for them. It is for
     LicenseFlow staff, who can read every agency: standing on an
     agency's own address should show that agency's console, not the
     whole platform's. The main domain still shows everything. */
  if (A.platform && A.tenant?.agency) {
    const only = A.tenant.agency.id;
    A.profiles = A.profiles.filter(x => x.agency_id === only);
    const mine = new Set(A.profiles.map(x => x.user_id));
    A.instances  = A.instances.filter(x => mine.has(x.user_id));
    A.exceptions = A.exceptions.filter(x => mine.has(x.user_id));
  }

  render();
}
function pad(t){ return `<p class="muted">${esc(t)}</p>`; }
const prof = (uid) => A.profiles.find(x=>x.user_id===uid);
const pname = (uid) => prof(uid)?.full_name || "Agent";
const instFor = (uid) => A.instances.filter(i=>i.user_id===uid);
function agentJourney(uid){ const p=prof(uid); return p?.designated_state ? F.buildJourney(p.designated_state) : null; }
function agentDone(uid){ const j=agentJourney(uid); if(!j) return false; const sm=F.statusMap(instFor(uid)); return j.reqs.every(r=>F.isDone(F.reqStatus(r.key,sm))); }

/* Which requirement is an agent actually blocked on right now? This is the
   single source of truth for "where does this person sit in the funnel" --
   the first not-yet-done requirement in their journey, or "compliant" once
   every requirement (including NPN, continuing ed, and E&O) is done. */
function currentStage(uid){
  const j = agentJourney(uid);
  if (!j) return "study_material";
  const sm = F.statusMap(instFor(uid));
  for (const r of j.reqs) if (!F.isDone(F.reqStatus(r.key, sm))) return r.key;
  return "compliant";
}
/* Collapse the 7 granular requirement keys into agency-friendly funnel
   buckets. Getting a license number is one step among several -- NPN,
   continuing education, and E&O still have to happen before an agent is
   actually done. "License issued" and "Fully compliant" stay separate
   buckets on purpose, so a trainer glancing at the roster never mistakes
   "has a license number" for "finished." */
const STAGE_BUCKET = {
  study_material:"pre", exam:"pre",
  nipr_application:"passedExam",
  license_number:"applied",
  npn:"issued", continuing_education:"issued", eo:"issued",
  compliant:"compliant",
};
function pipelineCounts(){
  const out = { pre:0, passedExam:0, applied:0, issued:0, compliant:0 };
  A.profiles.forEach(p => out[STAGE_BUCKET[currentStage(p.user_id)]]++);
  return out;
}

/* initials + a stable colour per agent, so faces are recognisable in a list */
/* Avatar grounds: all dark enough to carry white initials at 4.5:1+. */
const AV = ["#1E5FB4","#B04513","#0F6F40","#6B45C4","#A81552","#0B6E85"];
function avatar(uid){
  const n = (pname(uid)||"A").trim().split(/\s+/);
  const ini = ((n[0]?.[0]||"A") + (n[1]?.[0]||"")).toUpperCase();
  let h=0; for(const ch of String(uid)) h=(h*31+ch.charCodeAt(0))>>>0;
  return `<span class="av" style="background:${AV[h%AV.length]}">${esc(ini)}</span>`;
}
function elapsed(from){
  if(!from) return {txt:"—", hrs:0};
  const ms = now()-from, h = ms/3600000;
  if (h < 1)  return {txt:`${Math.max(1,Math.round(ms/60000))}m`, hrs:h};
  if (h < 48) return {txt:`${Math.floor(h)}h ${Math.round((h%1)*60).toString().padStart(2,"0")}m`, hrs:h};
  return {txt:`${Math.floor(h/24)}d ${Math.round(h%24).toString().padStart(2,"0")}h`, hrs:h};
}

/* ============================================================
   METRICS — everything below is computed from real rows.
   Enrolment      → licensing_profiles.started_at
   Completions    → requirement_instances.completed_at
   Automation     → REQS[key].verify === "auto"
   ============================================================ */
const enrolledAt = (p) => ts(p.registered_at) ?? ts(p.started_at) ?? ts(p.onboarding_start);
const DONE_SET = ["complete","admin_verified","verified","system_verified"];
const isDoneStatus = (s) => DONE_SET.includes(s);
const doneAt = (i) => ts(i.completed_at) ?? ts(i.updated_at);

function licensedAtFor(uid){
  const i = A.instances.find(x=>x.user_id===uid && x.requirement_key==="license_number" && isDoneStatus(x.status));
  return i ? doneAt(i) : null;
}
function median(arr){
  if(!arr.length) return null;
  const s=[...arr].sort((a,b)=>a-b), m=s.length>>1;
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
}

/* one window's worth of numbers */
function windowStats(days, offset=0){
  const to   = now() - offset*days*DAY;
  const from = to - days*DAY;

  /* people who enrolled during the window */
  const cohort = A.profiles.filter(p=>within(enrolledAt(p), from, to));
  const enrolled = cohort.length;

  /* people who got licensed during the window — a different set of people:
     most of them enrolled well before it started */
  const licensedRows = A.profiles
    .map(p=>({p, at:licensedAtFor(p.user_id)}))
    .filter(x=>within(x.at, from, to));
  const licensed = licensedRows.length;

  /* Conversion has to follow the COHORT, not divide two unrelated counts.
     "licensed this month ÷ enrolled this month" compares different people and
     can exceed 100% in a slow month. This asks: of the people who enrolled in
     this window, how many have since been licensed? */
  const cohortLicensed = cohort.filter(p=>licensedAtFor(p.user_id)!=null).length;
  const convRate = enrolled ? Math.round(cohortLicensed/enrolled*100) : null;

  const durations = licensedRows
    .map(x => (x.at - enrolledAt(x.p)) / DAY)
    .filter(d => Number.isFinite(d) && d >= 0);
  const medDays = median(durations);

  const completed = A.instances.filter(i=>isDoneStatus(i.status) && within(doneAt(i), from, to));
  const auto = completed.filter(i=>F.REQ_BY_KEY[i.requirement_key]?.verify==="auto").length;
  const autoRate = completed.length ? Math.round(auto/completed.length*100) : null;

  return { enrolled, licensed, cohortLicensed, convRate,
           medDays: medDays==null ? null : Math.round(medDays),
           autoRate };
}

/* six evenly spaced buckets across the window, for the sparkline */
function trend(days, pick){
  const buckets=6, span=days*DAY/buckets, out=[];
  for(let b=buckets-1;b>=0;b--){
    const to=now()-b*span, from=to-span;
    out.push(pick(from,to));
  }
  return out;
}

/* things that need a human, right now — not window-dependent */
function attention(){
  const overdue = A.instances.filter(i=>i.status==="pending_review"
    && elapsed(ts(i.updated_at)).hrs > OVERDUE_HOURS).length;
  const stuck = A.profiles.filter(p=>{
    if(!p.registered || agentDone(p.user_id)) return false;
    const times = instFor(p.user_id).map(i=>ts(i.updated_at)).filter(Boolean);
    const last = times.length ? Math.max(...times) : enrolledAt(p);
    return last != null && (now()-last) > STUCK_DAYS*DAY;
  }).length;
  const exceptions = A.exceptions.filter(e=>e.status==="open").length;
  const sentBack = A.instances.filter(i=>["action_required","rejected"].includes(i.status)).length;
  return { overdue, stuck, exceptions, sentBack };
}

function counts(){
  const at = attention();
  const pipe = pipelineCounts();
  return {
    pending:   A.instances.filter(i=>i.status==="pending_review").length,
    sentBack:  at.sentBack,
    exceptions:at.exceptions,
    agents:    A.profiles.length,
    stuck:     at.stuck,
    videos:    A.videos.filter(v=>v.active).length,
    overdue:   at.overdue,
    pre:        pipe.pre,
    passedExam: pipe.passedExam,
    applied:    pipe.applied,
    issued:     pipe.issued,
    compliant:  pipe.compliant,
  };
}

/* ---------------- left nav ---------------- */
const NAV = [
  {grp:"Queue"},
  {v:"overview", label:"Waiting on you",  c:"pending",  tone:"hot"},
  {v:"sentback", label:"Sent back",       c:"sentBack", tone:"crit"},
  {v:"exceptions", label:"Exceptions",    c:"exceptions"},
  {v:"stuck",    label:"Stuck 14+ days",  c:"stuck", tone:"hot"},
  {grp:"Pipeline"},
  {v:"agents",      label:"All agents",      c:"agents"},
  {v:"pre",         label:"Pre-licensing",   c:"pre"},
  {v:"passedExam",  label:"Passed exam",     c:"passedExam"},
  {v:"applied",     label:"Applied",         c:"applied"},
  {v:"issued",      label:"License issued",  c:"issued"},
  {v:"compliant",   label:"Fully compliant", c:"compliant"},
  {grp:"Content"},
  {v:"videos",   label:"Step videos",     c:"videos"},
];
function renderNav(){
  const c = counts(), cur = A.view.name;
  const active = {review:"overview", agent:"agents"}[cur] || cur;
  navEl.innerHTML = NAV.map(n=>{
    if(n.grp) return `<div class="grp">${esc(n.grp)}</div>`;
    const val = c[n.c] ?? 0;
    const tone = val && n.tone ? " "+n.tone : "";
    return `<button data-view="${n.v}" class="${active===n.v?"on":""}">
      <span>${esc(n.label)}</span><span class="n${tone}">${val}</span></button>`;
  }).join("");
  navEl.querySelectorAll("[data-view]").forEach(b=>
    b.onclick=()=>{ A.view={name:b.dataset.view}; render(); });
}

/* ---------------- agency rail ---------------- */
const WINDOWS = [
  {d:30,  short:"30D", label:"Rolling 30 days",  unit:"30 days"},
  {d:90,  short:"3M",  label:"Rolling 3 months", unit:"3 months"},
  {d:180, short:"6M",  label:"Rolling 6 months", unit:"6 months"},
  {d:365, short:"12M", label:"Rolling 12 months",unit:"12 months"},
];

function sparkline(vals, tone){
  const clean = vals.map(v=>v==null?0:v);
  if(clean.every(v=>v===0)) return "";
  const w=62,h=20,min=Math.min(...clean),max=Math.max(...clean),r=(max-min)||1;
  const pts=clean.map((v,i)=>`${(i*(w/(clean.length-1))).toFixed(1)},${(h-((v-min)/r)*h).toFixed(1)}`).join(" ");
  const lx=w, ly=(h-((clean.at(-1)-min)/r)*h).toFixed(1);
  const col = tone==="up" ? "#0F6F40" : tone==="down" ? "#A32019" : "#51637A";
  return `<svg width="${w+4}" height="${h+4}" viewBox="-2 -2 ${w+4} ${h+4}" aria-hidden="true">
    <polyline fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round"
      stroke-linejoin="round" points="${pts}"/><circle cx="${lx}" cy="${ly}" r="2.2" fill="${col}"/></svg>`;
}

/* good:"up" means a rising number is good for this metric */
function deltaChip(nowV, priorV, good){
  if(nowV==null || priorV==null || priorV===0)
    return {html:`<span class="cc-delta flat">—</span>`, tone:"flat"};
  const pctChange = ((nowV-priorV)/Math.abs(priorV))*100;
  const moved = pctChange > 0.5 ? "up" : pctChange < -0.5 ? "down" : "flat";
  const tone  = moved==="flat" ? "flat" : (moved===good ? "up" : "down");
  const arrow = moved==="up" ? "▲" : moved==="down" ? "▼" : "→";
  const txt = (pctChange>0?"+":"") +
    (Math.abs(pctChange)>=10 ? pctChange.toFixed(0) : pctChange.toFixed(1)) + "%";
  return {html:`<span class="cc-delta ${tone}">${arrow} ${txt}</span>`, tone};
}

function renderRail(){
  const W = WINDOWS.find(w=>w.d===A.win) || WINDOWS[0];
  const cur = windowStats(W.d, 0), prev = windowStats(W.d, 1);
  const at = attention();

  const metrics = [
    {k:"New agents enrolled", now:cur.enrolled, prior:prev.enrolled, good:"up",
     fmt:v=>v==null?"—":String(v),
     tr:trend(W.d,(f,t)=>A.profiles.filter(p=>within(enrolledAt(p),f,t)).length)},
    {k:"Newly licensed", now:cur.licensed, prior:prev.licensed, good:"up",
     fmt:v=>v==null?"—":String(v),
     tr:trend(W.d,(f,t)=>A.profiles.filter(p=>within(licensedAtFor(p.user_id),f,t)).length)},
    {k:"Enrolled → licensed", now:cur.convRate, prior:prev.convRate, good:"up",
     fmt:v=>v==null?"—":v+"%", tr:null,
     foot:cur.enrolled ? `${cur.cohortLicensed} of the ${cur.enrolled} who enrolled` : null,
     // The caveat exists to explain why a short window reads low: the cohort
     // hasn't had time to finish. It only applies if somebody actually IS
     // unfinished -- on a 100% window it would be plainly false.
     caveat:W.d<=90 && cur.cohortLicensed < cur.enrolled
              ? cur.enrolled - cur.cohortLicensed : 0},
    {k:"Typical time to license", now:cur.medDays, prior:prev.medDays, good:"down",
     // "0 days" reads like a missing value rather than a fast result.
     fmt:v=>v==null?"—":v===0?"Same day":v+(v===1?" day":" days"), tr:null},
    {k:"Handled automatically", now:cur.autoRate, prior:prev.autoRate, good:"up",
     fmt:v=>v==null?"—":v+"%", tr:null},
  ];

  const attnRows = [
    {t:"Reviews overdue",       v:at.overdue,    bad:true,  go:"overview"},
    {t:"Sent back to agent",    v:at.sentBack,   bad:true,  go:"sentback"},
    {t:`Agents stuck ${STUCK_DAYS}+ days`, v:at.stuck, go:"stuck"},
    {t:"Unresolved exceptions", v:at.exceptions, go:"exceptions"},
  ].filter(r=>r.v>0);

  railEl.innerHTML = `
    <h2>Agency performance</h2>
    <div class="rail-sub">${esc(W.label)} · vs prior ${esc(W.unit)}</div>
    <div class="cc-win" role="group" aria-label="Rolling window">
      ${WINDOWS.map(w=>`<button data-win="${w.d}" class="${w.d===A.win?"on":""}"
        aria-pressed="${w.d===A.win}">${w.short}</button>`).join("")}
    </div>

    ${attnRows.length ? `<div class="cc-attn">
        <div class="hd">⚠ Needs attention</div>
        ${attnRows.map(r=>`<button class="row" data-go="${r.go}">
          <span>${esc(r.t)}</span>
          <span class="v${r.bad?" bad":""}">${r.v}</span></button>`).join("")}
      </div>`
    : `<div class="cc-attn clear"><div class="hd">✓ All clear</div>
        <p class="ok">Nothing is waiting on a human right now.</p></div>`}

    ${metrics.map(m=>{
      const d = deltaChip(m.now, m.prior, m.good);
      const foot = m.foot
        ? esc(m.foot) + (m.caveat
            ? ` · ${m.caveat === 1 ? "1 is" : m.caveat + " are"} still working through it`
            : "")
        : (m.prior==null ? "no prior data"
           : esc(m.fmt(m.prior))+" in the prior "+esc(W.unit));
      return `<div class="cc-kpi">
        <div class="l"><span>${esc(m.k)}</span>${d.html}</div>
        <div class="row2"><span class="v">${esc(m.fmt(m.now))}</span>
          ${m.tr ? sparkline(m.tr, d.tone) : ""}</div>
        <div class="cmp">${foot}</div>
      </div>`;}).join("")}

    <p class="cc-note">Counted from enrolment and completion dates on your own records.
      Windows are rolling — “${esc(W.label.toLowerCase())}” means the ${esc(W.unit)} ending today,
      compared with the ${esc(W.unit)} before that. Enrolled → licensed follows the people who
      enrolled in the window, so short windows read low until that group has had time to finish.</p>`;

  railEl.querySelectorAll("[data-win]").forEach(b=>
    b.onclick=()=>{ A.win=Number(b.dataset.win); renderRail(); });
  railEl.querySelectorAll("[data-go]").forEach(b=>
    b.onclick=()=>{ A.view={name:b.dataset.go}; render(); });
}

/* ---------------- router ---------------- */
function render(){
  renderNav(); renderRail();
  const v = A.view;
  if (v.name==="review") return renderReview(v.arg);
  if (v.name==="agent")  return renderAgent(v.arg);
  if (v.name==="videos")     return shell("Step videos","Paste a link; agents see it on that step.", renderVideos());
  if (v.name==="agents")     return shell("All agents","Everyone enrolled, whatever stage they're at.", renderAgents(A.profiles));
  if (v.name==="pre")        return shell("Pre-licensing","Working through study material, or registered for the exam but hasn't passed it yet.",
                                   renderAgents(A.profiles.filter(p=>STAGE_BUCKET[currentStage(p.user_id)]==="pre")));
  if (v.name==="passedExam") return shell("Passed exam","Exam complete — hasn't submitted a state application yet.",
                                   renderAgents(A.profiles.filter(p=>STAGE_BUCKET[currentStage(p.user_id)]==="passedExam")));
  if (v.name==="applied")    return shell("Applied","State application submitted — waiting on the license to be issued.",
                                   renderAgents(A.profiles.filter(p=>STAGE_BUCKET[currentStage(p.user_id)]==="applied")));
  if (v.name==="issued")     return shell("License issued","License number is verified, but NPN, continuing education, or E&O may still be outstanding — not yet fully compliant.",
                                   renderAgents(A.profiles.filter(p=>STAGE_BUCKET[currentStage(p.user_id)]==="issued")));
  if (v.name==="compliant")  return shell("Fully compliant","Every requirement is complete, including NPN, continuing education, and E&O.",
                                   renderAgents(A.profiles.filter(p=>STAGE_BUCKET[currentStage(p.user_id)]==="compliant")));
  if (v.name==="stuck")      return shell(`Stuck ${STUCK_DAYS}+ days`,"No movement for two weeks or more.", renderStuck());
  if (v.name==="sentback")   return shell("Sent back","Waiting on the agent to fix something.", renderQueue(["action_required","rejected"]));
  if (v.name==="exceptions") return shell("Exceptions","Pathway couldn't be determined automatically.", renderExceptions());
  return shell("Waiting on you","Automate by default. Escalate by exception.", renderTiles()+renderStages()+renderQueue(["pending_review"]));
}
function shell(title, sub, inner){
  root.innerHTML = `<div class="cc-h"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div></div>${inner}`;
  bindCommon();
}

function renderTiles(){
  const c = counts();
  const s = windowStats(30,0);
  return `<div class="cc-tiles">
    <div class="cc-tile"><div class="l">Waiting on you</div>
      <div class="v${c.pending?" warn":""}">${c.pending}</div><div class="d">submissions</div></div>
    <div class="cc-tile"><div class="l">Overdue past ${OVERDUE_HOURS}h</div>
      <div class="v${c.overdue?" crit":""}">${c.overdue}</div><div class="d">of those</div></div>
    <div class="cc-tile"><div class="l">Handled automatically</div>
      <div class="v">${s.autoRate==null?"—":s.autoRate+"%"}</div><div class="d">last 30 days</div></div>
    <div class="cc-tile"><div class="l">Active agents</div>
      <div class="v">${c.agents}</div><div class="d">${c.compliant} fully compliant</div></div>
  </div>`;
}

/* stacked bar: where agents are sitting, by stage */
function renderStages(){
  const keys = ["study_material","exam","fingerprints","nipr_application","license_number","eo"];
  const present = keys.filter(k=>F.REQ_BY_KEY[k]);
  if(!present.length || !A.profiles.length) return "";
  const data = present.map(k=>{
    const rows = A.instances.filter(i=>i.requirement_key===k);
    return { k, label:F.REQ_BY_KEY[k]?.short || F.REQ_BY_KEY[k]?.label || k,
             done: rows.filter(i=>isDoneStatus(i.status)).length,
             prog: rows.filter(i=>!isDoneStatus(i.status) && i.status!=="locked").length };
  });
  const max = Math.max(1, ...data.map(d=>d.done+d.prog));
  const W=580,H=172,base=140,plot=104,bw=Math.min(60,(W-60)/data.length-14),gap=(W-40-bw*data.length)/(data.length-1||1);
  const u = plot/max;
  const bars = data.map((d,n)=>{
    const x = 20+n*(bw+gap);
    const hDone = d.done*u, hProg = d.prog*u;
    const yDone = base-hDone, yProg = yDone-2-hProg;
    const total = d.done+d.prog;
    return `${d.done?`<rect x="${x}" y="${yDone}" width="${bw}" height="${hDone}" fill="#0F6F40"/>`:""}
      ${d.prog?`<rect x="${x}" y="${yProg}" width="${bw}" height="${hProg}" fill="#1E5FB4" rx="4"/>`:""}
      ${total?`<text x="${x+bw/2}" y="${(d.prog?yProg:yDone)-7}" fill="#51637A" font-size="11"
        text-anchor="middle">${total}</text>`:""}
      <text x="${x+bw/2}" y="158" fill="#51637A" font-size="11" text-anchor="middle">${esc(d.label)}</text>`;
  }).join("");
  return `<div class="cc-panel">
    <div class="cc-panel-h"><h2>Where agents are sitting</h2>
      <span class="sub">${A.profiles.length} enrolled · stacked by stage</span></div>
    <div class="pad">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img"
        aria-label="Agents at each stage, in progress versus complete">
        <line x1="16" y1="${base+.5}" x2="${W-16}" y2="${base+.5}" stroke="#DCE3EC"/>${bars}</svg>
      <div class="cc-legend"><span><i style="background:#1E5FB4"></i>In progress</span>
        <span><i style="background:#0F6F40"></i>Complete</span>
        <span style="color:var(--faint)">· number above each bar = agents at that stage</span></div>
    </div></div>`;
}

function renderQueue(statuses){
  const rows = A.instances.filter(i=>statuses.includes(i.status))
    .sort((a,b)=> (ts(a.updated_at)||0) - (ts(b.updated_at)||0));
  const overdue = rows.filter(i=>elapsed(ts(i.updated_at)).hrs > OVERDUE_HOURS).length;
  if(!rows.length) return `<div class="cc-panel"><div class="cc-empty">
    Nothing here. Everything is automated or complete.</div></div>`;
  return `<div class="cc-panel">
    <div class="cc-panel-h"><h2>${statuses[0]==="pending_review"?"Review queue":"Sent back"}</h2>
      <span class="sub">${rows.length} total${overdue?` · ${overdue} past ${OVERDUE_HOURS}h`:""} · oldest first</span></div>
    <table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>Requirement</th>
      <th>Waiting</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(i=>{ const e=elapsed(ts(i.updated_at));
        const cls = e.hrs>OVERDUE_HOURS*2 ? " vlate" : e.hrs>OVERDUE_HOURS ? " late" : "";
        return `<tr>
          <td><div class="who">${avatar(i.user_id)}<span>${esc(pname(i.user_id))}</span></div></td>
          <td>${esc(stateName(prof(i.user_id)?.designated_state))}</td>
          <td>${esc(F.REQ_BY_KEY[i.requirement_key]?.label||i.requirement_key)}</td>
          <td><span class="ago${cls}">${esc(e.txt)}</span></td>
          <td><span class="badge ${F.STATUS_CLASS[i.status]}">${esc(F.STATUS_LABEL[i.status])}</span></td>
          <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-review="${i.id}">Review</button></td>
        </tr>`;}).join("")}
    </tbody></table></div>`;
}

function renderStuck(){
  const rows = A.profiles.map(p=>{
    const times = instFor(p.user_id).map(i=>ts(i.updated_at)).filter(Boolean);
    const last = times.length ? Math.max(...times) : enrolledAt(p);
    return {p, last};
  }).filter(x=>x.p.registered && !agentDone(x.p.user_id)
             && x.last!=null && (now()-x.last) > STUCK_DAYS*DAY)
    .sort((a,b)=>a.last-b.last);
  if(!rows.length) return `<div class="cc-panel"><div class="cc-empty">
    No one has gone quiet for ${STUCK_DAYS}+ days.</div></div>`;
  return `<div class="cc-panel">
    <div class="cc-panel-h"><h2>Stuck agents</h2>
      <span class="sub">${rows.length} with no movement</span></div>
    <table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>Last activity</th>
      <th>Next step</th></tr></thead><tbody>
      ${rows.map(({p,last})=>{
        const j=agentJourney(p.user_id), sm=F.statusMap(instFor(p.user_id));
        const nx=j?F.nextStep(j,sm):null;
        return `<tr data-agent="${p.user_id}" style="cursor:pointer">
          <td><div class="who">${avatar(p.user_id)}<span>${esc(p.full_name||"Agent")}</span></div></td>
          <td>${esc(stateName(p.designated_state))}</td>
          <td><span class="ago vlate">${esc(elapsed(last).txt)} ago</span></td>
          <td class="muted">${esc(nx?.short || nx?.label || "—")}</td></tr>`;}).join("")}
    </tbody></table></div>`;
}

function renderExceptions(){
  const open = A.exceptions.filter(e=>e.status==="open");
  if(!open.length) return `<div class="cc-panel"><div class="cc-empty">
    No open exceptions. Every agent has a determined pathway.</div></div>`;
  return `<div class="cc-panel">
    <div class="cc-panel-h"><h2>Pathway exceptions</h2>
      <span class="sub">${open.length} to resolve</span></div>
    <table class="tbl"><thead><tr><th>Agent</th><th>Detail</th><th>Set state</th><th></th></tr></thead><tbody>
    ${open.map(e=>`<tr>
      <td><div class="who">${avatar(e.user_id)}<span>${esc(pname(e.user_id))}</span></div></td>
      <td class="muted" style="max-width:320px">${esc(e.detail||"")}</td>
      <td><select class="ex-state" data-id="${e.id}" style="width:auto;display:inline-block;padding:.35rem .55rem">
        <option value="">Select…</option>
        ${Object.entries(STATES).map(([c,s])=>`<option value="${c}">${esc(s.name)}</option>`).join("")}
      </select></td>
      <td style="text-align:right"><button class="btn btn-primary btn-sm"
        data-resolve="${e.id}" data-user="${e.user_id}">Resolve</button></td></tr>`).join("")}
    </tbody></table></div>`;
}

/* ---------------- review detail ---------------- */
function renderReview(id){
  const i = A.instances.find(x=>x.id===id);
  if (!i){ A.view={name:"overview"}; return render(); }
  const r = F.REQ_BY_KEY[i.requirement_key]; const meta=i.meta||{};
  const rows = i.requirement_key==="continuing_education"
    ? (meta.certs||[]).map((c,n)=>`<div class="hl"><span>Certificate ${n+1} — ${esc(c.purchase_date||"—")}</span><span>${esc(c.filename||"file")} <span class="badge ${F.STATUS_CLASS[c.status]||"s-blue"}">${esc(F.STATUS_LABEL[c.status]||"Uploaded")}</span></span></div>`).join("")
    : Object.entries(meta).filter(([k])=>!k.startsWith("_")&&k!=="certs").map(([k,v])=>`<div class="hl"><span class="muted">${esc(k.replace(/_/g," "))}</span><strong>${esc(v)}</strong></div>`).join("");
  const e = elapsed(ts(i.updated_at));
  root.innerHTML = `
    <div class="cc-h"><div><h1>${esc(r?.label||i.requirement_key)}</h1>
      <p>${esc(pname(i.user_id))} · ${esc(stateName(prof(i.user_id)?.designated_state))} ·
         waiting ${esc(e.txt)}</p></div></div>
    <button class="btn btn-ghost btn-sm" id="back" style="margin-bottom:14px">← Back to queue</button>
    <div class="cc-panel" style="max-width:640px">
      <div class="cc-panel-h"><h2>Submission</h2>
        <span class="badge ${F.STATUS_CLASS[i.status]}">${esc(F.STATUS_LABEL[i.status])}</span></div>
      <div class="pad">
        ${rows||'<p class="muted" style="margin:0">No details submitted.</p>'}
        <div id="revAlert" class="alert"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
          <button class="btn btn-primary" id="verify">Verify</button>
          <button class="btn btn-ghost" id="correct">Request correction</button>
          <button class="btn btn-ghost" id="reject">Reject</button>
          <button class="btn btn-quiet" id="back2">Save &amp; exit</button>
        </div>
      </div>
    </div>`;
  el("back").onclick = el("back2").onclick = () => { A.view={name:"overview"}; render(); };
  el("verify").onclick = () => act(i, "admin_verified");
  el("correct").onclick = async () => { const n=prompt("What needs correcting? The agent will see this."); if(n===null)return; if(!n.trim()){alert("Please enter a note.");return;} await act(i,"action_required",n,"correction_requested"); };
  el("reject").onclick = async () => { const n=prompt("Reason for rejection:"); if(n===null)return; await act(i,"rejected",n||"Rejected","rejected"); };
}
async function act(i, status, note, eventName){
  const meta = { ...(i.meta||{}) };
  if (note) meta._reject = note; else delete meta._reject;
  if (i.requirement_key==="continuing_education" && status==="admin_verified" && Array.isArray(meta.certs)) meta.certs = meta.certs.map(c=>({...c,status:"admin_verified"}));
  await supabase.from("requirement_instances").update({ status, meta, completed_at: status==="admin_verified"?new Date().toISOString():null, updated_at:new Date().toISOString() }).eq("id", i.id);
  await supabase.from("audit_events").insert({ user_id:i.user_id, event:`review:${i.requirement_key}`, status_before:i.status, status_after:status, source:"admin", meta:{ note:note||null, admin:A.me.email, action:eventName||(status==="admin_verified"?"verified":status) } });
  A.view = { name:"overview" };
  await load();
}

/* ---------------- agents ---------------- */
function renderAgents(list){
  if(!list.length) return `<div class="cc-panel"><div class="cc-empty">No agents yet.</div></div>`;
  return `<div class="cc-panel">
    <div class="cc-panel-h"><h2>Agents</h2><span class="sub">${list.length} shown</span></div>
    <table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>License</th>
      <th>Progress</th><th>Status</th></tr></thead><tbody>
    ${list.map(p=>{
      const j=agentJourney(p.user_id); const sm=F.statusMap(instFor(p.user_id));
      const pr=j?F.progress(j,sm).overall:0;
      const status = agentDone(p.user_id)?'<span class="badge s-green">Completed</span>'
        :(instFor(p.user_id).some(i=>i.status==="pending_review")?'<span class="badge s-amber">Waiting on you</span>'
        :(instFor(p.user_id).some(i=>["action_required","rejected"].includes(i.status))?'<span class="badge s-red">Sent back</span>'
        :'<span class="badge s-blue">In progress</span>'));
      return `<tr data-agent="${p.user_id}" style="cursor:pointer">
        <td><div class="who">${avatar(p.user_id)}<span>${esc(p.full_name||"Agent")}</span>
          ${p.military?'<span class="badge s-gray">Military</span>':''}</div></td>
        <td>${esc(stateName(p.designated_state))}</td><td>${esc(p.license_type||"—")}</td>
        <td><span class="ago">${pr}%</span></td><td>${status}</td></tr>`;
    }).join("")}
    </tbody></table></div>`;
}
async function renderAgent(uid){
  const p = prof(uid); if(!p){ A.view={name:"agents"}; return render(); }
  const j = agentJourney(uid); const sm = F.statusMap(instFor(uid));
  const pr = j?F.progress(j,sm).overall:0;
  const { data:aud } = await supabase.from("audit_events").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(30);
  root.innerHTML = `
    <div class="cc-h"><div><h1>${esc(p.full_name||"Agent")}</h1>
      <p>${esc(stateName(p.designated_state))} · ${esc(p.license_type||"—")}${p.military?" · Military":""}</p></div></div>
    <button class="btn btn-ghost btn-sm" id="back" style="margin-bottom:14px">← All agents</button>
    <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:16px" class="grid">
      <div class="cc-panel">
        <div class="cc-panel-h"><h2>Journey</h2><span class="sub">${pr}% complete</span></div>
        <div class="pad">
          <div class="progress" style="margin-bottom:14px"><i style="width:${pr}%"></i></div>
          <div class="jlist">
          ${j? j.reqs.map(r=>{ const s=F.reqStatus(r.key,sm);
            return `<button class="jrow2" data-step="${r.key}">
              <span class="jmk ${F.STATUS_CLASS[s]}">${F.isDone(s)?"&#10003;":(s==="pending_review"?"⏳":(["action_required","rejected"].includes(s)?"!":""))}</span>
              <span class="jname">${esc(r.short)}</span>
              <span class="badge ${F.STATUS_CLASS[s]}">${esc(F.STATUS_LABEL[s])}</span></button>`;}).join("")
            : '<p class="muted">No journey yet.</p>'}
          </div>
        </div>
      </div>
      <div class="cc-panel">
        <div class="cc-panel-h"><h2>Audit trail</h2><span class="sub">most recent first</span></div>
        <div class="pad">
        ${(aud||[]).length? (aud||[]).map(a=>`<div class="hl" style="align-items:flex-start">
          <span class="muted" style="font-size:.82rem;white-space:nowrap">${fmtDT(a.created_at)}</span>
          <span style="text-align:right">${esc((a.event||"").replace(/[:_]/g," "))}${a.status_after?` → <strong>${esc(F.STATUS_LABEL[a.status_after]||a.status_after)}</strong>`:""}
          ${a.meta?.note?`<div class="hint">${esc(a.meta.note)}</div>`:""}
          ${a.source==="admin"?'<div class="hint">by admin</div>':""}</span></div>`).join("")
          : '<p class="muted" style="margin:0">No activity yet.</p>'}
        </div>
      </div>
    </div>`;
  el("back").onclick = () => { A.view={name:"agents"}; render(); };
  root.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{
    const i=A.instances.find(x=>x.user_id===uid&&x.requirement_key===b.dataset.step);
    if(i){A.view={name:"review",arg:i.id};render();} else alert("Not submitted yet."); });
}

/* ---------------- videos ---------------- */
function renderVideos(){
  const byKey = {}; A.videos.forEach(v=>byKey[v.step_key]=v);
  return `<div class="cc-panel"><div class="cc-panel-h"><h2>Instructional videos</h2>
    <span class="sub">YouTube, Vimeo or MP4</span></div><div class="pad">
    ${VIDEO_STEPS.map(k=>{ const v=byKey[k]||{step_key:k}; const label=F.REQ_BY_KEY[k]?.label||k;
      return `<div class="ce-item" style="margin-bottom:12px">
        <div class="ce-row"><strong>${esc(label)}</strong>
          <label class="chk" style="margin:0"><input type="checkbox" data-active="${k}" ${v.active?"checked":""}/> Active</label></div>
        <label>Title</label><input data-vtitle="${k}" value="${esc(v.title||"")}"/>
        <label>Video URL</label><input data-vurl="${k}" value="${esc(v.url||"")}" placeholder="https://youtu.be/…"/>
        <label>Description</label><input data-vdesc="${k}" value="${esc(v.description||"")}"/>
        <button class="btn btn-primary btn-sm" data-vsave="${k}" style="margin-top:10px">Save</button>
        <span class="hint" id="vmsg_${k}"></span>
      </div>`;}).join("")}
  </div></div>`;
}

function bindCommon(){
  root.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>{ A.view={name:"review",arg:b.dataset.review}; render(); });
  root.querySelectorAll("tr[data-agent]").forEach(tr=>tr.onclick=()=>{ A.view={name:"agent",arg:tr.dataset.agent}; render(); });
  root.querySelectorAll("[data-resolve]").forEach(b=>b.onclick=async()=>{
    const sel=root.querySelector(`.ex-state[data-id="${b.dataset.resolve}"]`); const code=sel?.value;
    if(!code){alert("Choose a state.");return;}
    await supabase.from("licensing_profiles").update({designated_state:code,pathway_confidence:"high",updated_at:new Date().toISOString()}).eq("user_id",b.dataset.user);
    await supabase.from("exceptions").update({status:"resolved",resolution:"State set to "+code,updated_at:new Date().toISOString()}).eq("id",b.dataset.resolve);
    await load(); });
  root.querySelectorAll("[data-vsave]").forEach(b=>b.onclick=async()=>{ const k=b.dataset.vsave;
    const payload={ step_key:k, title:root.querySelector(`[data-vtitle="${k}"]`).value.trim()||null,
      url:root.querySelector(`[data-vurl="${k}"]`).value.trim()||null,
      description:root.querySelector(`[data-vdesc="${k}"]`).value.trim()||null,
      active:root.querySelector(`[data-active="${k}"]`).checked, updated_at:new Date().toISOString() };
    const { error } = await supabase.from("step_videos").upsert(payload,{onConflict:"step_key"});
    el("vmsg_"+k).textContent = error? ("Error: "+error.message) : "Saved.";
    const idx=A.videos.findIndex(v=>v.step_key===k); if(idx>=0)A.videos[idx]=payload; else A.videos.push(payload);
  });
}
