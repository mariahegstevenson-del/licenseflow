import { supabase, isConfigured, requireSession } from "./supabase.js";
import { STATES } from "./states.js?v=5";
import { STATUS_LABEL, STATUS_CLASS, REQ_BY_KEY } from "./flow.js?v=5";

const el = (id) => document.getElementById(id);
const root = el("root");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const stateName = (c) => STATES[c]?.name || c || "—";

const A = { me:null, admin:false, profiles:[], instances:[], exceptions:[], tab:"queue" };

(async function () {
  if (!isConfigured) { root.innerHTML = `<div class="adm"><p class="muted">Connect Supabase.</p></div>`; return; }
  const session = await requireSession(); if (!session) return;
  A.me = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "index.html"; };
  const { data:adm } = await supabase.from("admins").select("user_id").eq("user_id", A.me.id).maybeSingle();
  A.admin = !!adm;
  if (!A.admin) { root.innerHTML = `<div class="adm"><div class="card pad"><h2 style="margin-top:0">Not authorized</h2><p class="muted">This area is for licensing administrators. <a href="app.html">Go to the agent app</a>.</p></div></div>`; return; }
  await load();
})();

async function load() {
  const [p, inst, ex] = await Promise.all([
    supabase.from("licensing_profiles").select("*"),
    supabase.from("requirement_instances").select("*"),
    supabase.from("exceptions").select("*").order("created_at", { ascending:false }),
  ]);
  A.profiles = p.data || []; A.instances = inst.data || []; A.exceptions = ex.data || [];
  render();
}
function pname(uid){ const p=A.profiles.find(x=>x.user_id===uid); return p?.full_name || "Agent"; }
function pstate(uid){ const p=A.profiles.find(x=>x.user_id===uid); return p?.designated_state; }

function metrics() {
  const done = A.instances.filter(i => ["complete","verified","admin_verified","system_verified"].includes(i.status));
  const auto = done.filter(i => REQ_BY_KEY[i.requirement_key]?.verify === "auto").length;
  const adminItems = A.instances.filter(i => REQ_BY_KEY[i.requirement_key]?.verify === "admin");
  const total = done.length || 1;
  const autoRate = Math.round((auto / total) * 100);
  const openEx = A.exceptions.filter(e => e.status === "open").length;
  const pending = A.instances.filter(i => i.status === "pending_review").length;
  return { autoRate, humanRate: 100 - autoRate, openEx, pending, agents: A.profiles.length };
}

function render() {
  const m = metrics();
  const queue = A.instances.filter(i => i.status === "pending_review" || i.status === "action_required");
  root.innerHTML = `
  <div class="adm">
    <h1 style="font-size:1.6rem">Command Center</h1>
    <p class="muted" style="margin-top:-2px">Automate by default. Escalate by exception.</p>
    <div class="kpis">
      <div class="kpi"><div class="l">Automation rate</div><div class="v">${m.autoRate}%</div><div class="s">completed without review</div></div>
      <div class="kpi"><div class="l">Human intervention</div><div class="v">${m.humanRate}%</div><div class="s">needed a reviewer</div></div>
      <div class="kpi"><div class="l">In validation queue</div><div class="v">${m.pending}</div><div class="s">awaiting review</div></div>
      <div class="kpi"><div class="l">Open exceptions</div><div class="v" ${m.openEx?'style="color:#a12622"':''}>${m.openEx}</div><div class="s">need a decision</div></div>
    </div>
    <div class="qtabs">
      <button data-tab="queue" class="${A.tab==="queue"?"on":""}">Validation queue (${queue.length})</button>
      <button data-tab="exceptions" class="${A.tab==="exceptions"?"on":""}">Exceptions (${A.exceptions.filter(e=>e.status==="open").length})</button>
      <button data-tab="agents" class="${A.tab==="agents"?"on":""}">Agents (${A.profiles.length})</button>
    </div>
    <div class="card pad">${A.tab==="queue"?queueView(queue):A.tab==="exceptions"?exView():agentsView()}</div>
  </div>`;
  root.querySelectorAll(".qtabs button").forEach(b => b.onclick = () => { A.tab = b.dataset.tab; render(); });
  wireActions();
}

function queueView(queue) {
  if (!queue.length) return `<p class="muted" style="margin:0">Nothing to review. Everything is automated or complete.</p>`;
  return `<table class="tbl"><thead><tr><th>Agent</th><th>State</th><th>Requirement</th><th>Details</th><th>Status</th><th>Action</th></tr></thead><tbody>
    ${queue.map(i => {
      const meta = i.meta || {};
      const det = i.requirement_key === "continuing_education"
        ? `${(meta.certs||[]).length} certificate(s)`
        : Object.entries(meta).filter(([k])=>!k.startsWith("_")&&k!=="certs").slice(0,3).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join(", ");
      return `<tr>
        <td><strong>${esc(pname(i.user_id))}</strong></td>
        <td>${esc(stateName(pstate(i.user_id)))}</td>
        <td>${esc(REQ_BY_KEY[i.requirement_key]?.label || i.requirement_key)}</td>
        <td class="muted" style="max-width:260px">${esc(det)||"—"}</td>
        <td><span class="badge ${STATUS_CLASS[i.status]}">${esc(STATUS_LABEL[i.status])}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-primary btn-sm" data-approve="${i.id}">Approve</button>
          <button class="btn btn-ghost btn-sm" data-reject="${i.id}">Reject</button>
        </td>
      </tr>`;
    }).join("")}
  </tbody></table>`;
}
function exView() {
  const open = A.exceptions.filter(e=>e.status==="open");
  if (!open.length) return `<p class="muted" style="margin:0">No open exceptions.</p>`;
  return `<table class="tbl"><thead><tr><th>Agent</th><th>Type</th><th>Detail</th><th>Confidence</th><th>Action</th></tr></thead><tbody>
    ${open.map(e => `<tr>
      <td><strong>${esc(pname(e.user_id))}</strong></td>
      <td>${esc(e.type.replace(/_/g," "))}</td>
      <td class="muted" style="max-width:320px">${esc(e.detail||"")}</td>
      <td><span class="badge ${e.confidence==="low"?"s-red":"s-amber"}">${esc(e.confidence||"—")}</span></td>
      <td style="white-space:nowrap">
        <select class="ex-state" data-id="${e.id}" style="width:auto;display:inline-block;padding:.4rem .6rem">
          <option value="">Set licensing state…</option>
          ${Object.entries(STATES).map(([c,s])=>`<option value="${c}">${esc(s.name)}</option>`).join("")}
        </select>
        <button class="btn btn-primary btn-sm" data-resolve="${e.id}" data-user="${e.user_id}">Resolve</button>
      </td>
    </tr>`).join("")}
  </tbody></table>`;
}
function agentsView() {
  return `<table class="tbl"><thead><tr><th>Agent</th><th>Designated state</th><th>License</th><th>Military</th><th>Confidence</th><th>Requirements done</th></tr></thead><tbody>
    ${A.profiles.map(p => {
      const reqs = A.instances.filter(i=>i.user_id===p.user_id);
      const done = reqs.filter(i=>["complete","verified","admin_verified","system_verified"].includes(i.status)).length;
      return `<tr>
        <td><strong>${esc(p.full_name||"Agent")}</strong></td>
        <td>${esc(stateName(p.designated_state))}</td>
        <td>${esc(p.license_type||"—")}</td>
        <td>${p.military?"Yes":"No"}</td>
        <td><span class="badge ${p.pathway_confidence==="low"?"s-red":p.pathway_confidence==="medium"?"s-amber":"s-green"}">${esc(p.pathway_confidence||"—")}</span></td>
        <td>${done} / ${reqs.length}</td>
      </tr>`;
    }).join("")}
  </tbody></table>`;
}

function wireActions() {
  root.querySelectorAll("[data-approve]").forEach(b => b.onclick = () => act(b.dataset.approve, "admin_verified"));
  root.querySelectorAll("[data-reject]").forEach(b => b.onclick = async () => {
    const note = prompt("Reason for rejection / correction needed:");
    if (note === null) return;
    await act(b.dataset.reject, "action_required", note);
  });
  root.querySelectorAll("[data-resolve]").forEach(b => b.onclick = async () => {
    const id = b.dataset.resolve, uid = b.dataset.user;
    const sel = root.querySelector(`.ex-state[data-id="${id}"]`);
    const code = sel?.value;
    if (!code) { alert("Choose the licensing state to resolve this exception."); return; }
    await supabase.from("licensing_profiles").update({ designated_state:code, pathway_confidence:"high", updated_at:new Date().toISOString() }).eq("user_id", uid);
    await supabase.from("exceptions").update({ status:"resolved", resolution:"Designated state set to "+code, updated_at:new Date().toISOString() }).eq("id", id);
    await load();
  });
}
async function act(id, status, note) {
  const row = A.instances.find(i => i.id === id); if (!row) return;
  const meta = { ...(row.meta||{}) };
  if (note) meta._reject = note;
  if (row.requirement_key === "continuing_education" && status === "admin_verified" && Array.isArray(meta.certs)) {
    meta.certs = meta.certs.map(c => ({ ...c, status:"admin_verified" }));
  }
  await supabase.from("requirement_instances").update({ status, meta, completed_at: status==="admin_verified"?new Date().toISOString():null, updated_at:new Date().toISOString() }).eq("id", id);
  await load();
}
