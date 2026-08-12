import { supabase, isConfigured, requireSession } from "./supabase.js";
import { STATES } from "./states.js?v=5";
import * as F from "./flow.js?v=5";

const el = (id) => document.getElementById(id);
const root = el("root");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const stateName = (c) => STATES[c]?.name || c || "—";
const fmtDT = (t) => t ? new Date(t).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "—";

const A = { me:null, admin:false, profiles:[], instances:[], exceptions:[], videos:[], view:{name:"overview"} };
const VIDEO_STEPS = ["study_material","exam","nipr_application","license_number","npn","continuing_education","eo"];

(async function () {
  if (!isConfigured) { root.innerHTML = pad("Connect Supabase."); return; }
  const session = await requireSession(); if (!session) return;
  A.me = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "index.html"; };
  const { data:adm } = await supabase.from("admins").select("user_id").eq("user_id", A.me.id).maybeSingle();
  A.admin = !!adm;
  if (!A.admin) { root.innerHTML = `<div class="adm"><div class="card pad"><h2 style="margin-top:0">Not authorized</h2><p class="muted">This area is for licensing administrators. <a href="app.html">Go to the agent app</a>.</p></div></div>`; return; }
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
  render();
}
function pad(t){ return `<div class="adm"><p class="muted">${esc(t)}</p></div>`; }
const prof = (uid) => A.profiles.find(x=>x.user_id===uid);
const pname = (uid) => prof(uid)?.full_name || "Agent";
const instFor = (uid) => A.instances.filter(i=>i.user_id===uid);
function agentJourney(uid){ const p=prof(uid); return p?.designated_state ? F.buildJourney(p.designated_state) : null; }
function agentDone(uid){ const j=agentJourney(uid); if(!j) return false; const sm=F.statusMap(instFor(uid)); return j.reqs.every(r=>F.isDone(F.reqStatus(r.key,sm))); }
function agentLicensed(uid){ const sm=F.statusMap(instFor(uid)); return F.isDone(F.reqStatus("license_number",sm)); }

/* ---------------- metrics ---------------- */
function metrics(){
  const active = A.profiles.filter(p=>p.registered).length;
  const pending = A.instances.filter(i=>i.status==="pending_review").length;
  const action = A.instances.filter(i=>["action_required","rejected"].includes(i.status)).length;
  const licensed = A.profiles.filter(p=>agentLicensed(p.user_id)).length;
  const completed = A.profiles.filter(p=>agentDone(p.user_id)).length;
  const inProgress = A.profiles.filter(p=>p.registered && p.welcome_completed && !agentDone(p.user_id)).length;
  const done = A.instances.filter(i=>["complete","admin_verified","verified","system_verified"].includes(i.status));
  const auto = done.filter(i=>F.REQ_BY_KEY[i.requirement_key]?.verify==="auto").length;
  const autoRate = done.length ? Math.round(auto/done.length*100) : 0;
  return { active, pending, action, licensed, completed, inProgress, autoRate };
}

/* ---------------- router ---------------- */
function render(){
  const v = A.view;
  if (v.name==="review") return renderReview(v.arg);
  if (v.name==="agent") return renderAgent(v.arg);
  if (v.name==="videos") return renderShell(renderVideos());
  if (v.name==="agents") return renderShell(renderAgents());
  return renderShell(renderOverview());
}
function renderShell(inner){
  const m = metrics();
  root.innerHTML = `
  <div class="adm">
    <h1 style="font-size:1.6rem">Command Center</h1>
    <p class="muted" style="margin-top:-2px">Automate by default. Escalate by exception.</p>
    <div class="kpis">
      ${kpi("Active agents",m.active,"")}
      ${kpi("In progress",m.inProgress,"working through steps")}
      ${kpi("Pending review",m.pending,"waiting on you", m.pending?"amber":"")}
      ${kpi("Action required",m.action,"sent back", m.action?"red":"")}
      ${kpi("Licensed",m.licensed,"license verified")}
      ${kpi("Completed",m.completed,"full journey")}
      ${kpi("Automation rate",m.autoRate+"%","auto-completed")}
      ${kpi("Open exceptions",A.exceptions.filter(e=>e.status==="open").length,"pathway review")}
    </div>
    <div class="qtabs">
      <button data-tab="overview" class="${A.view.name==="overview"||A.view.name==="review"?"on":""}">Pending review</button>
      <button data-tab="agents" class="${A.view.name==="agents"||A.view.name==="agent"?"on":""}">Agents</button>
      <button data-tab="videos" class="${A.view.name==="videos"?"on":""}">Videos</button>
    </div>
    ${inner}
  </div>`;
  root.querySelectorAll(".qtabs button").forEach(b=>b.onclick=()=>{ A.view={name:b.dataset.tab}; render(); });
  bindCommon();
}
function kpi(l,v,s,flag){ return `<div class="kpi"><div class="l">${esc(l)}</div><div class="v" ${flag==="red"&&v?'style="color:#a12622"':flag==="amber"&&v?'style="color:#8a5a00"':''}>${esc(String(v))}</div><div class="s">${esc(s)}</div></div>`; }

/* ---------------- overview: pending queue ---------------- */
function renderOverview(){
  const queue = A.instances.filter(i=>["pending_review","action_required"].includes(i.status))
    .sort((a,b)=> (a.status==="pending_review"?0:1)-(b.status==="pending_review"?0:1));
  const exOpen = A.exceptions.filter(e=>e.status==="open");
  return `<div class="card pad">
    <h3 style="margin-top:0">Pending review queue</h3>
    ${queue.length? `<table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>Requirement</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
      ${queue.map(i=>`<tr>
        <td><strong>${esc(pname(i.user_id))}</strong></td>
        <td>${esc(stateName(prof(i.user_id)?.designated_state))}</td>
        <td>${esc(F.REQ_BY_KEY[i.requirement_key]?.label||i.requirement_key)}</td>
        <td class="muted">${fmtDT(i.updated_at)}</td>
        <td><span class="badge ${F.STATUS_CLASS[i.status]}">${esc(F.STATUS_LABEL[i.status])}</span></td>
        <td><button class="btn btn-primary btn-sm" data-review="${i.id}">Review</button></td>
      </tr>`).join("")}
    </tbody></table>` : `<p class="muted" style="margin:0">Nothing to review right now. Everything is automated or complete.</p>`}
  </div>
  ${exOpen.length? `<div class="card pad" style="margin-top:16px"><h3 style="margin-top:0">Pathway exceptions</h3>
    <table class="tbl"><thead><tr><th>Agent</th><th>Detail</th><th>Set state</th><th></th></tr></thead><tbody>
    ${exOpen.map(e=>`<tr><td><strong>${esc(pname(e.user_id))}</strong></td><td class="muted" style="max-width:320px">${esc(e.detail||"")}</td>
      <td><select class="ex-state" data-id="${e.id}" style="width:auto;display:inline-block;padding:.4rem .6rem"><option value="">Select…</option>${Object.entries(STATES).map(([c,s])=>`<option value="${c}">${esc(s.name)}</option>`).join("")}</select></td>
      <td><button class="btn btn-primary btn-sm" data-resolve="${e.id}" data-user="${e.user_id}">Resolve</button></td></tr>`).join("")}
    </tbody></table></div>`:""}`;
}

/* ---------------- review detail ---------------- */
function renderReview(id){
  const i = A.instances.find(x=>x.id===id);
  if (!i){ A.view={name:"overview"}; return render(); }
  const r = F.REQ_BY_KEY[i.requirement_key]; const meta=i.meta||{};
  const rows = i.requirement_key==="continuing_education"
    ? (meta.certs||[]).map((c,n)=>`<div class="hl"><span>Certificate ${n+1} — ${esc(c.purchase_date||"—")}</span><span>${esc(c.filename||"file")} <span class="badge ${F.STATUS_CLASS[c.status]||"s-blue"}">${esc(F.STATUS_LABEL[c.status]||"Uploaded")}</span></span></div>`).join("")
    : Object.entries(meta).filter(([k])=>!k.startsWith("_")&&k!=="certs").map(([k,v])=>`<div class="hl"><span class="muted">${esc(k.replace(/_/g," "))}</span><strong>${esc(v)}</strong></div>`).join("");
  root.innerHTML = `<div class="adm">
    <button class="btn btn-ghost btn-sm" id="back" style="margin-bottom:14px">← Back to queue</button>
    <div class="card pad" style="max-width:620px">
      <div class="step-top"><span class="muted">${esc(pname(i.user_id))} · ${esc(stateName(prof(i.user_id)?.designated_state))}</span><span class="badge ${F.STATUS_CLASS[i.status]}">${esc(F.STATUS_LABEL[i.status])}</span></div>
      <h2 style="margin:.3rem 0">${esc(r?.label||i.requirement_key)}</h2>
      <div style="margin:14px 0">${rows||'<p class="muted">No details submitted.</p>'}</div>
      <div id="revAlert" class="alert"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
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

/* ---------------- agents list + profile ---------------- */
function renderAgents(){
  return `<div class="card pad"><h3 style="margin-top:0">All agents</h3>
    <table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>License</th><th>Progress</th><th>Status</th></tr></thead><tbody>
    ${A.profiles.map(p=>{
      const j=agentJourney(p.user_id); const sm=F.statusMap(instFor(p.user_id));
      const pr=j?F.progress(j,sm).overall:0;
      const status = agentDone(p.user_id)?'<span class="badge s-green">Completed</span>':(instFor(p.user_id).some(i=>i.status==="pending_review")?'<span class="badge s-amber">Pending review</span>':(instFor(p.user_id).some(i=>["action_required","rejected"].includes(i.status))?'<span class="badge s-red">Action required</span>':'<span class="badge s-blue">In progress</span>'));
      return `<tr data-agent="${p.user_id}" style="cursor:pointer">
        <td><strong>${esc(p.full_name||"Agent")}</strong>${p.military?' <span class="badge s-gray">Military</span>':''}</td>
        <td>${esc(stateName(p.designated_state))}</td><td>${esc(p.license_type||"—")}</td>
        <td>${pr}%</td><td>${status}</td></tr>`;
    }).join("")}
    </tbody></table></div>`;
}
async function renderAgent(uid){
  const p = prof(uid); if(!p){ A.view={name:"agents"}; return render(); }
  const j = agentJourney(uid); const sm = F.statusMap(instFor(uid));
  const pr = j?F.progress(j,sm).overall:0;
  const { data:aud } = await supabase.from("audit_events").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(30);
  const stepIcon = (s)=> F.isDone(s)?'<span class="jmk s-green">&#10003;</span>':(s==="pending_review"?'<span class="jmk s-amber">⏳</span>':(["action_required","rejected"].includes(s)?'<span class="jmk s-red">!</span>':'<span class="jmk s-gray"></span>'));
  root.innerHTML = `<div class="adm">
    <button class="btn btn-ghost btn-sm" id="back" style="margin-bottom:14px">← All agents</button>
    <div class="grid" style="display:grid;grid-template-columns:1.1fr .9fr;gap:16px">
      <div class="card pad">
        <h2 style="margin-top:0">${esc(p.full_name||"Agent")}</h2>
        <div class="muted">${esc(stateName(p.designated_state))} · ${esc(p.license_type||"—")}${p.military?" · Military":""}</div>
        <div class="hl"><span>Overall progress</span><strong>${pr}%</strong></div>
        <div class="progress" style="margin:6px 0 16px"><i style="width:${pr}%"></i></div>
        <div class="jlist">
          ${j? j.reqs.map(r=>{ const s=F.reqStatus(r.key,sm); return `<button class="jrow2" data-step="${r.key}" data-agent="${uid}"><span class="jmk ${F.STATUS_CLASS[s]}">${F.isDone(s)?"&#10003;":(s==="pending_review"?"⏳":(["action_required","rejected"].includes(s)?"!":""))}</span><span class="jname">${esc(r.short)}</span><span class="badge ${F.STATUS_CLASS[s]}">${esc(F.STATUS_LABEL[s])}</span></button>`;}).join("") : '<p class="muted">No journey yet.</p>'}
        </div>
      </div>
      <div class="card pad">
        <h3 style="margin-top:0">Audit trail</h3>
        ${(aud||[]).length? (aud||[]).map(a=>`<div class="hl" style="align-items:flex-start"><span class="muted" style="font-size:.82rem;white-space:nowrap">${fmtDT(a.created_at)}</span><span style="text-align:right">${esc((a.event||"").replace(/[:_]/g," "))}${a.status_after?` → <strong>${esc(F.STATUS_LABEL[a.status_after]||a.status_after)}</strong>`:""}${a.meta?.note?`<div class="hint">${esc(a.meta.note)}</div>`:""}${a.source==="admin"?'<div class="hint">by admin</div>':""}</span></div>`).join("") : '<p class="muted">No activity yet.</p>'}
      </div>
    </div>
  </div>`;
  el("back").onclick = () => { A.view={name:"agents"}; render(); };
  root.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{ const i=A.instances.find(x=>x.user_id===uid&&x.requirement_key===b.dataset.step); if(i){A.view={name:"review",arg:i.id};render();} else alert("Not submitted yet."); });
}

/* ---------------- videos ---------------- */
function renderVideos(){
  const byKey = {}; A.videos.forEach(v=>byKey[v.step_key]=v);
  return `<div class="card pad"><h3 style="margin-top:0">Instructional videos</h3>
    <p class="muted" style="margin-top:-4px">Paste a YouTube, Vimeo, or MP4 link. Toggle active to show it to agents. No code changes needed.</p>
    ${VIDEO_STEPS.map(k=>{ const v=byKey[k]||{step_key:k}; const label=F.REQ_BY_KEY[k]?.label||k;
      return `<div class="ce-item" style="margin-bottom:12px">
        <div class="ce-row"><strong>${esc(label)}</strong><label class="chk" style="margin:0"><input type="checkbox" data-active="${k}" ${v.active?"checked":""}/> Active</label></div>
        <label>Title</label><input data-vtitle="${k}" value="${esc(v.title||"")}"/>
        <label>Video URL</label><input data-vurl="${k}" value="${esc(v.url||"")}" placeholder="https://youtu.be/…"/>
        <label>Description</label><input data-vdesc="${k}" value="${esc(v.description||"")}"/>
        <button class="btn btn-primary btn-sm" data-vsave="${k}" style="margin-top:10px">Save</button>
        <span class="hint" id="vmsg_${k}"></span>
      </div>`;
    }).join("")}
  </div>`;
}

function bindCommon(){
  root.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>{ A.view={name:"review",arg:b.dataset.review}; render(); });
  root.querySelectorAll("tr[data-agent]").forEach(tr=>tr.onclick=()=>{ A.view={name:"agent",arg:tr.dataset.agent}; render(); });
  root.querySelectorAll("[data-resolve]").forEach(b=>b.onclick=async()=>{ const sel=root.querySelector(`.ex-state[data-id="${b.dataset.resolve}"]`); const code=sel?.value; if(!code){alert("Choose a state.");return;} await supabase.from("licensing_profiles").update({designated_state:code,pathway_confidence:"high",updated_at:new Date().toISOString()}).eq("user_id",b.dataset.user); await supabase.from("exceptions").update({status:"resolved",resolution:"State set to "+code,updated_at:new Date().toISOString()}).eq("id",b.dataset.resolve); await load(); });
  root.querySelectorAll("[data-vsave]").forEach(b=>b.onclick=async()=>{ const k=b.dataset.vsave;
    const payload={ step_key:k, title:root.querySelector(`[data-vtitle="${k}"]`).value.trim()||null, url:root.querySelector(`[data-vurl="${k}"]`).value.trim()||null, description:root.querySelector(`[data-vdesc="${k}"]`).value.trim()||null, active:root.querySelector(`[data-active="${k}"]`).checked, updated_at:new Date().toISOString() };
    const { error } = await supabase.from("step_videos").upsert(payload,{onConflict:"step_key"});
    el("vmsg_"+k).textContent = error? ("Error: "+error.message) : "Saved.";
    const idx=A.videos.findIndex(v=>v.step_key===k); if(idx>=0)A.videos[idx]=payload; else A.videos.push(payload);
  });
}
