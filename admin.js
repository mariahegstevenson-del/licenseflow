import * as E from "./engine.js";

/* Command Center — demonstration data.
   Cross-agent visibility requires elevated DB access; RLS correctly
   blocks the public key from reading other agents. This prototype
   therefore runs on a realistic sample pipeline. */

const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const content = el("content");

const STAGE_ORDER = ["eligibility","education","exam_prep","exam","fingerprint","application","review","licensed"];
const STAGE_LABEL = Object.fromEntries(E.STAGES.map(s=>[s.key,s.label]));

// deterministic sample agents
const FIRST = ["Jordan","Alicia","Devon","Marcus","Priya","Sofia","Liam","Grace","Noah","Maya","Ethan","Chloe","Diego","Aisha","Owen","Zoe","Caleb","Nina","Ravi","Tara","Jamal","Elena","Kyle","Bianca","Omar","Lena","Sean","Ivy","Cole","Rosa"];
const LAST = ["Miller","Reyes","King","Cole","Shah","Ramos","Nolan","Park","Diaz","Webb","Hunt","Frost","Vega","Khan","Boyd","Lane","Ford","Ash","Roy","Bell","Cruz","Wolf","Bright","Snow","Fox","Rhodes","Blair","Storm","Reed","Lynn"];
const STATES = ["TX","FL","CA"];
function mk(i){
  const stageIdx = [0,1,1,1,2,2,2,3,3,4,4,5,5,6,6,7,1,2,3,5,6,0,1,2,4,6,7,2,3,5][i%30];
  const stage = STAGE_ORDER[stageIdx];
  const daysIn = [3,9,14,21,2,6,11,18,4,12,7,1,5,8,16,22,10,13,19,25,30,2,6,9,15,20,28,3,17,24][i%30];
  const learning = Math.min(100, 20 + (stageIdx*12) + (i%5)*4);
  const readiness = stageIdx>=3?90:(stageIdx*22);
  const idle = [5,80,12,3,50,90,2,120,8,30,4,6,72,10,20,1,96,15,40,2,60,3,110,7,18,5,0,84,9,22][i%30];
  return { id:1800+i, name:`${FIRST[i%FIRST.length]} ${LAST[i%LAST.length]}`, state:STATES[i%3], stage, stageIdx, daysIn, learning, readiness, idle };
}
const AGENTS = Array.from({length:30}, (_,i)=>mk(i));

function boot(){
  el("menu").onclick=()=>{el("side").classList.add("open");el("overlay").classList.add("show")};
  el("overlay").onclick=()=>{el("side").classList.remove("open");el("overlay").classList.remove("show")};
  document.querySelectorAll(".nav-item[data-route]").forEach(b=>b.onclick=()=>{location.hash=b.dataset.route;el("side").classList.remove("open");el("overlay").classList.remove("show")});
  window.addEventListener("hashchange", route);
  const risk = AGENTS.filter(a=>a.idle>=72 && a.stage!=="licensed" && a.stage!=="review").length;
  el("riskTag").textContent = risk;
  if(!location.hash) location.hash="#/pipeline"; else route();
}
function setActive(base){ document.querySelectorAll(".nav-item[data-route]").forEach(b=>b.classList.toggle("active",b.dataset.route==="#/"+base)); }

function route(){
  const h=(location.hash||"#/pipeline").slice(2);
  const [base,arg]=h.split("/");
  el("ttl").textContent={pipeline:"Pipeline",atrisk:"At-Risk Agents",agents:"Agents",requirements:"State Requirements",agent:"Agent Detail"}[base]||"Pipeline";
  setActive(base==="agent"?"agents":base);
  if(base==="pipeline")return renderPipeline();
  if(base==="atrisk")return renderAtRisk();
  if(base==="agents")return renderAgents();
  if(base==="agent")return renderAgentDetail(Number(arg));
  if(base==="requirements")return renderRequirements();
  renderPipeline();
}

function kpis(){
  const active=AGENTS.filter(a=>a.stage!=="licensed").length;
  const licensed=AGENTS.filter(a=>a.stage==="licensed").length;
  const apps=AGENTS.filter(a=>a.stage==="application"||a.stage==="review").length;
  const risk=AGENTS.filter(a=>a.idle>=72&&a.stage!=="licensed"&&a.stage!=="review").length;
  return {active,licensed,apps,risk,avg:24};
}

function renderPipeline(){
  const k=kpis();
  const cols=STAGE_ORDER.map(st=>{
    const list=AGENTS.filter(a=>a.stage===st);
    return `<div class="col"><h4>${esc(STAGE_LABEL[st])} <span>${list.length}</span></h4>
      ${list.slice(0,6).map(a=>`<div class="chip" data-id="${a.id}"><div class="nm">${esc(a.name)}</div><div class="mt">${a.state} · ${a.daysIn}d in stage${a.idle>=72?' · <span style="color:var(--red)">stalled</span>':''}</div></div>`).join("")}
      ${list.length>6?`<div class="note" style="margin-top:6px">+${list.length-6} more</div>`:""}
    </div>`;
  }).join("");
  content.innerHTML=`
  <div class="grid g4" style="margin-bottom:20px">
    ${kpi("Active agents",k.active,"in the pipeline")}
    ${kpi("Licensed (sample month)",k.licensed,"issued")}
    ${kpi("Avg. time to license",k.avg+" days","enrollment → licensed")}
    ${kpi("At risk",k.risk,"no progress in 72h+","risk")}
  </div>
  <div class="panel"><h3 style="margin-top:0">Licensing pipeline</h3><div class="board">${cols}</div></div>`;
  content.querySelectorAll(".chip[data-id]").forEach(c=>c.onclick=()=>location.hash="#/agent/"+c.dataset.id);
}
function kpi(l,v,s,flag){ return `<div class="kpi"><div class="l">${esc(l)}</div><div class="v" ${flag==="risk"&&v>0?'style="color:var(--red)"':''}>${esc(String(v))}</div><div class="s">${esc(s)}</div></div>`; }

function renderAtRisk(){
  const risk=AGENTS.filter(a=>a.idle>=72&&a.stage!=="licensed"&&a.stage!=="review").sort((a,b)=>b.idle-a.idle);
  content.innerHTML=`
  <div class="panel"><h3 style="margin-top:0">${risk.length} agents haven't progressed recently</h3>
  <p class="muted" style="margin-top:0">Automatically flagged so your team doesn't have to check every agent by hand.</p>
  <table class="tbl"><thead><tr><th>Agent</th><th>Stage</th><th>Progress</th><th>Idle</th><th>Recommended</th><th></th></tr></thead><tbody>
  ${risk.map(a=>`<tr>
    <td><strong>${esc(a.name)}</strong><div class="mt" style="font-size:.78rem;color:var(--muted)">#${a.id} · ${a.state}</div></td>
    <td>${esc(STAGE_LABEL[a.stage])}</td>
    <td>${a.learning}% learning</td>
    <td><span class="badge ${a.idle>=96?'b-red':'b-amber'}">${Math.round(a.idle/24)}d idle</span></td>
    <td class="muted">Send reminder</td>
    <td><button class="btn btn-ghost btn-sm" data-msg="${a.id}">Message</button> <button class="btn btn-ghost btn-sm" data-id="${a.id}">Open</button></td>
  </tr>`).join("")}
  </tbody></table></div>`;
  content.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>location.hash="#/agent/"+b.dataset.id);
  content.querySelectorAll("[data-msg]").forEach(b=>b.onclick=()=>alert("Automation: reminder queued to agent #"+b.dataset.msg+" (demo)."));
}

function renderAgents(){
  content.innerHTML=`
  <div class="panel"><h3 style="margin-top:0">All agents (${AGENTS.length})</h3>
  <table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>Stage</th><th>Learning</th><th>Readiness</th><th>Idle</th></tr></thead><tbody>
  ${AGENTS.map(a=>`<tr data-id="${a.id}" style="cursor:pointer">
    <td><strong>${esc(a.name)}</strong> <span class="mt" style="color:var(--muted)">#${a.id}</span></td>
    <td>${a.state}</td><td>${esc(STAGE_LABEL[a.stage])}</td>
    <td>${a.learning}%</td><td>${a.readiness}%</td>
    <td>${a.idle>=72?`<span class="badge b-amber">${Math.round(a.idle/24)}d</span>`:`${Math.round(a.idle/24)}d`}</td>
  </tr>`).join("")}
  </tbody></table></div>`;
  content.querySelectorAll("tr[data-id]").forEach(r=>r.onclick=()=>location.hash="#/agent/"+r.dataset.id);
}

function renderAgentDetail(id){
  const a=AGENTS.find(x=>x.id===id); if(!a){location.hash="#/agents";return;}
  const idx=STAGE_ORDER.indexOf(a.stage);
  const journey=STAGE_ORDER.map((st,i)=>({key:st,label:STAGE_LABEL[st],status:i<idx?"complete":(i===idx?(st==="review"?"waiting":"current"):"locked")}));
  const timeline=[
    {t:`${a.daysIn} days ago`,e:"Entered "+STAGE_LABEL[a.stage]},
    {t:"—",e:"Completed "+(STAGE_LABEL[STAGE_ORDER[Math.max(0,idx-1)]]||"Profile")},
    {t:"—",e:"Enrolled and created profile"},
  ];
  content.innerHTML=`
  <a href="#/pipeline" class="btn btn-ghost btn-sm" style="margin-bottom:14px">← Back to pipeline</a>
  <div class="grid g2">
    <div>
      <div class="panel"><h3 style="margin-top:0">${esc(a.name)}</h3>
        <div class="muted">#${a.id} · Life — ${a.state}</div>
        <div class="hl"><span>Current step</span><strong>${esc(STAGE_LABEL[a.stage])}</strong></div>
        <div class="hl"><span>Learning</span><span class="badge b-blue">${a.learning}%</span></div>
        <div class="hl"><span>Exam readiness</span><span class="badge b-violet">${a.readiness}%</span></div>
        <div class="hl"><span>Idle time</span><span class="badge ${a.idle>=72?'b-amber':'b-gray'}">${Math.round(a.idle/24)} days</span></div>
        <div class="hl"><span>Blocker</span>${a.idle>=72?'<span class="badge b-amber">Stalled in stage</span>':'<span class="badge b-green">None</span>'}</div>
        <div class="hl"><span>Next action</span><strong>${esc(STAGE_LABEL[a.stage])}</strong></div>
        <button class="btn btn-primary btn-sm btn-block" style="margin-top:12px" onclick="alert('Message sent (demo).')">Message agent</button>
      </div>
    </div>
    <div>
      <div class="panel"><h3 style="margin-top:0">Licensing journey</h3><ul class="journey">${journey.map(n=>{
        const icon={complete:"✓",current:"→",waiting:"⏳",locked:"○"}[n.status];
        return `<li class="jrow ${n.status}"><div class="jrail"></div><div class="jmark">${icon}</div><div class="jbody"><div class="t">${esc(n.label)}</div></div></li>`;
      }).join("")}</ul></div>
      <div class="panel"><h3 style="margin-top:0">Timeline</h3>${timeline.map(t=>`<div class="hl"><span class="muted">${esc(t.t)}</span><span>${esc(t.e)}</span></div>`).join("")}</div>
    </div>
  </div>`;
}

function renderRequirements(){
  const blocks=Object.entries(E.RULES).map(([code,st])=>{
    const lics=Object.entries(st.licenses).map(([name,l])=>`
      <div class="panel" style="box-shadow:none;border:1px solid var(--line);margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <strong>${esc(name)}</strong>
          <span class="badge ${l.verified?'b-green':'b-amber'}">${l.verified?'Verified':'Unverified sample'}</span>
        </div>
        <div class="hl"><span>Pre-licensing hours</span><strong>${l.preLicensingHours}</strong></div>
        <div class="hl"><span>Exam</span><span>${esc(l.examName)} (${esc(l.examProvider)})</span></div>
        <div class="hl"><span>Fingerprints</span><span>${l.fingerprintRequired?'Required':'Not required'}</span></div>
        <div class="hl"><span>Stages</span><span class="muted" style="font-size:.82rem">${l.stages.map(s=>STAGE_LABEL[s]).join(" → ")}</span></div>
        <div class="hl"><span>Source</span><span class="muted" style="font-size:.8rem">${esc(l.source)}</span></div>
        <div class="hl"><span>As of</span><span>${esc(l.asOf)}</span></div>
      </div>`).join("");
    return `<div class="panel"><h3 style="margin-top:0">${esc(st.name)} <span class="pill">${code}</span></h3>${lics}</div>`;
  }).join("");
  content.innerHTML=`
  <div class="locknote" style="margin-bottom:16px"><span>📜</span><div>This is the <strong>rules layer</strong> that generates every agent's journey. Requirements live here — not in UI code — so verified state data can be loaded and versioned without touching the app. All values below are <strong>sample/unverified</strong>.</div></div>
  ${blocks}`;
}

boot();
