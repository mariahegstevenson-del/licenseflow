import { supabase, isConfigured, requireSession } from "./supabase.js";

const D = window.LF_DATA;
let session = null;
let user = null;
let profile = null;
let ceRows = [];
let doneModules = new Set();

/* ---------------- helpers ---------------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" }) : "—";
function alertOn(id, msg, ok){ const el=$("#"+id); el.textContent=msg; el.className="alert show "+(ok?"alert-ok":"alert-error"); }
function alertOff(id){ const el=$("#"+id); if(el) el.className="alert"; }

/* ---------------- nav ---------------- */
const titles = { overview:"Overview", study:"Study Hub", ce:"CE Tracker", support:"Support", profile:"Profile" };
function go(view){
  $$(".side-link[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $$(".view").forEach(v => v.classList.remove("active"));
  $("#view-"+view).classList.add("active");
  $("#viewTitle").textContent = titles[view] || "Overview";
  closeSidebar();
}
$$(".side-link[data-view]").forEach(b => b.addEventListener("click", () => go(b.dataset.view)));
document.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) go(g.dataset.goto); });

const sidebar = $("#sidebar"), overlay = $("#overlay");
function openSidebar(){ sidebar.classList.add("open"); overlay.classList.add("show"); }
function closeSidebar(){ sidebar.classList.remove("open"); overlay.classList.remove("show"); }
$("#menuBtn")?.addEventListener("click", openSidebar);
overlay?.addEventListener("click", closeSidebar);

$("#logoutBtn").addEventListener("click", async () => {
  if (isConfigured) await supabase.auth.signOut();
  location.href = "index.html";
});

/* ---------------- populate selects ---------------- */
function fillSelect(el, items, selected){
  el.innerHTML = "";
  items.forEach(v => { const o=document.createElement("option"); o.value=v; o.textContent=v; if(v===selected)o.selected=true; el.appendChild(o); });
}
fillSelect($("#ceCat"), D.ceCategories);
fillSelect($("#ticketCat"), D.ticketCategories);
fillSelect($("#profState"), D.states);

/* ============================================================
   BOOT
   ============================================================ */
(async function boot(){
  if (!isConfigured) {
    // Demo mode — show a friendly banner, keep UI usable.
    $("#hello").textContent = "Demo mode — connect Supabase to save real data.";
    renderModules(); renderCE(); renderTickets([]);
    return;
  }
  session = await requireSession();
  if (!session) return;
  user = session.user;

  await Promise.all([loadProfile(), loadCE(), loadStudy(), loadTickets()]);
  $("#supEmail")?.setAttribute("href", "mailto:" + (window.LF_CONFIG.SUPPORT_EMAIL || "support@lifelicenseflow.com"));
  renderAll();
})();

/* ---------------- data loads ---------------- */
async function loadProfile(){
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  profile = data || { id:user.id, email:user.email, full_name:"" };
  // seed CE requirement from state if unset
}
async function loadCE(){
  const { data } = await supabase.from("ce_credits").select("*").order("completed_date", { ascending:false });
  ceRows = data || [];
}
async function loadStudy(){
  const { data } = await supabase.from("study_progress").select("module_key,completed").eq("completed", true);
  doneModules = new Set((data || []).map(r => r.module_key));
}
async function loadTickets(){
  const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending:false });
  window.__tickets = data || [];
}

/* ============================================================
   RENDER
   ============================================================ */
function ceTotal(){ return ceRows.reduce((s,r)=> s + Number(r.hours || 0), 0); }
function ceRequired(){ return Number(profile?.ce_required_hours ?? (D.stateCE[profile?.state] ?? 24)); }

function renderAll(){
  const name = profile?.full_name || user.email.split("@")[0];
  $("#hello").textContent = "Welcome back, " + name.split(" ")[0];
  renderProfileForm();
  renderModules();
  renderCE();
  renderTickets(window.__tickets || []);
  renderOverview();
}

function renderOverview(){
  const total = ceTotal(), req = ceRequired();
  const pct = req ? Math.min(100, Math.round(total/req*100)) : 100;
  $("#kpiCE").textContent = total;
  $("#kpiCESub").textContent = "of " + req + " required";
  $("#ceBar").style.width = pct + "%";
  $("#ceLine").textContent = req
    ? `${total} of ${req} hours logged — ${Math.max(0, req-total)} to go.`
    : "No CE hours required this cycle.";

  const sm = D.studyModules.length;
  const dm = doneModules.size;
  const spct = Math.round(dm/sm*100);
  $("#kpiStudy").textContent = spct + "%";
  $("#kpiStudySub").textContent = `${dm} of ${sm} modules`;

  // license status + renewal
  const exp = profile?.license_expiration;
  const statusEl = $("#kpiStatus"), subEl = $("#kpiStatusSub");
  const daysEl = $("#kpiDays"), daysSub = $("#kpiDaysSub");
  if (exp){
    const days = Math.ceil((new Date(exp+"T00:00:00") - new Date()) / 86400000);
    daysEl.textContent = days;
    daysSub.textContent = "Renews " + fmtDate(exp);
    if (days < 0){ statusEl.innerHTML = '<span class="badge badge-red">Expired</span>'; subEl.textContent = "Renew as soon as possible"; }
    else if (days <= 60){ statusEl.innerHTML = '<span class="badge badge-amber">Renew soon</span>'; subEl.textContent = days + " days left"; }
    else { statusEl.innerHTML = '<span class="badge badge-green">Active</span>'; subEl.textContent = (profile.license_type||"License"); }
  } else {
    statusEl.innerHTML = '<span class="badge badge-gray">Not set</span>';
    subEl.textContent = "Add details in Profile";
    daysEl.textContent = "—";
  }

  // next steps
  const steps = [];
  if (!exp) steps.push("Add your license expiration date in Profile.");
  if (total < req) steps.push(`Log ${Math.max(0, req-total)} more CE hours before renewal.`);
  if (dm < sm) steps.push(`Finish ${sm-dm} more study module${sm-dm>1?"s":""}.`);
  if (!profile?.license_number) steps.push("Save your license number for quick reference.");
  if (!steps.length) steps.push("You're all caught up. 🎉");
  $("#nextSteps").innerHTML = steps.map(s => `<div style="display:flex;gap:.6rem;padding:.4rem 0"><span>→</span><span>${esc(s)}</span></div>`).join("");

  // recent CE
  const recent = ceRows.slice(0,5);
  $("#recentCE").innerHTML = recent.length
    ? tableCE(recent, false)
    : `<p class="muted">No credits yet. <a href="#" data-goto="ce">Add your first CE credit →</a></p>`;
}

/* ---------- study modules ---------- */
function renderModules(){
  const wrap = $("#moduleList");
  wrap.innerHTML = D.studyModules.map(m => {
    const done = doneModules.has(m.key);
    return `<div class="module ${done?"done":""}" data-key="${m.key}">
      <div class="chk">✓</div>
      <div style="flex:1">
        <div class="mtitle">${esc(m.title)} <span class="badge badge-gray" style="margin-left:6px">${esc(m.category)}</span></div>
        <div class="mdesc">${esc(m.desc)}</div>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll(".module").forEach(el => {
    el.addEventListener("click", () => toggleModule(el.dataset.key, el));
  });
}
async function toggleModule(key, el){
  const nowDone = !doneModules.has(key);
  el.classList.toggle("done", nowDone);
  if (nowDone) doneModules.add(key); else doneModules.delete(key);
  renderOverview();
  if (!isConfigured) return;
  if (nowDone){
    await supabase.from("study_progress").upsert({ user_id:user.id, module_key:key, completed:true, updated_at:new Date().toISOString() });
  } else {
    await supabase.from("study_progress").delete().eq("user_id", user.id).eq("module_key", key);
  }
}

/* ---------- CE ---------- */
function tableCE(rows, withDelete){
  return `<table class="tbl"><thead><tr><th>Course</th><th>Provider</th><th>Category</th><th>Hours</th><th>Date</th>${withDelete?"<th></th>":""}</tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td>${esc(r.course_name)}</td>
      <td class="muted">${esc(r.provider||"—")}</td>
      <td><span class="badge badge-blue">${esc(r.category||"General")}</span></td>
      <td><strong>${Number(r.hours)}</strong></td>
      <td class="muted">${fmtDate(r.completed_date)}</td>
      ${withDelete?`<td><button class="btn btn-ghost btn-sm" data-del-ce="${r.id}">Delete</button></td>`:""}
    </tr>`).join("")}
  </tbody></table>`;
}
function renderCE(){
  const total = ceTotal(), req = ceRequired();
  const pct = req ? Math.min(100, Math.round(total/req*100)) : 100;
  $("#ceTotalBig").innerHTML = `${total}<span style="font-size:1rem;color:var(--muted)"> / ${req} hrs</span>`;
  $("#ceBar2").style.width = pct + "%";
  $("#ceRemain").textContent = req ? `${Math.max(0, req-total)} hours remaining` : "No requirement set";
  $("#ceTableWrap").innerHTML = ceRows.length ? tableCE(ceRows, true) : `<p class="muted">No CE credits logged yet.</p>`;
  $$("[data-del-ce]").forEach(b => b.addEventListener("click", () => deleteCE(b.dataset.delCe)));
}
$("#ceForm").addEventListener("submit", async (e) => {
  e.preventDefault(); alertOff("ceAlert");
  const fd = Object.fromEntries(new FormData(e.target).entries());
  fd.hours = Number(fd.hours);
  if (!isConfigured){ alertOn("ceAlert","Demo mode — connect Supabase to save.", false); return; }
  const { data, error } = await supabase.from("ce_credits").insert([{ ...fd, user_id:user.id }]).select();
  if (error){ alertOn("ceAlert", error.message, false); return; }
  ceRows.unshift(data[0]);
  e.target.reset();
  alertOn("ceAlert","Credit added ✅", true);
  renderCE(); renderOverview();
});
async function deleteCE(id){
  if (isConfigured){ await supabase.from("ce_credits").delete().eq("id", id); }
  ceRows = ceRows.filter(r => r.id !== id);
  renderCE(); renderOverview();
}

/* ---------- tickets ---------- */
function renderTickets(rows){
  const wrap = $("#ticketList");
  if (!rows.length){ wrap.innerHTML = `<p class="muted">No tickets yet.</p>`; return; }
  const badge = { open:"badge-amber", in_progress:"badge-blue", resolved:"badge-green" };
  wrap.innerHTML = `<table class="tbl"><thead><tr><th>Subject</th><th>Category</th><th>Status</th><th>Opened</th></tr></thead><tbody>
    ${rows.map(t => `<tr>
      <td><strong>${esc(t.subject)}</strong><div class="muted" style="font-size:.85rem">${esc(t.message).slice(0,80)}</div></td>
      <td class="muted">${esc(t.category||"General")}</td>
      <td><span class="badge ${badge[t.status]||"badge-gray"}">${esc((t.status||"open").replace("_"," "))}</span></td>
      <td class="muted">${new Date(t.created_at).toLocaleDateString()}</td>
    </tr>`).join("")}
  </tbody></table>`;
}
$("#ticketForm").addEventListener("submit", async (e) => {
  e.preventDefault(); alertOff("ticketAlert");
  const fd = Object.fromEntries(new FormData(e.target).entries());
  if (!isConfigured){ alertOn("ticketAlert","Demo mode — connect Supabase to submit.", false); return; }
  const { data, error } = await supabase.from("support_tickets").insert([{ ...fd, user_id:user.id }]).select();
  if (error){ alertOn("ticketAlert", error.message, false); return; }
  window.__tickets.unshift(data[0]);
  e.target.reset();
  alertOn("ticketAlert","Ticket submitted — we'll be in touch ✅", true);
  renderTickets(window.__tickets);
});

/* ---------- profile ---------- */
function renderProfileForm(){
  const f = $("#profileForm");
  f.full_name.value = profile.full_name || "";
  if (profile.state) f.state.value = profile.state;
  if (profile.license_type) f.license_type.value = profile.license_type;
  f.license_number.value = profile.license_number || "";
  f.license_expiration.value = profile.license_expiration || "";
  f.ce_required_hours.value = profile.ce_required_hours ?? (D.stateCE[profile.state] ?? 24);
}
$("#profileForm").addEventListener("submit", async (e) => {
  e.preventDefault(); alertOff("profAlert");
  const fd = Object.fromEntries(new FormData(e.target).entries());
  fd.ce_required_hours = Number(fd.ce_required_hours || 0);
  if (!fd.license_expiration) delete fd.license_expiration;
  if (!isConfigured){ alertOn("profAlert","Demo mode — connect Supabase to save.", false); return; }
  const payload = { id:user.id, email:user.email, ...fd, updated_at:new Date().toISOString() };
  const { error } = await supabase.from("profiles").upsert(payload);
  if (error){ alertOn("profAlert", error.message, false); return; }
  profile = { ...profile, ...payload };
  alertOn("profAlert","Profile saved ✅", true);
  renderOverview(); renderCE();
});
