import { supabase, isConfigured, requireSession } from "./supabase.js";
import { STATE_LIST, buildWalkthrough } from "./states.js";

const el = (id) => document.getElementById(id);
const root = el("root");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));

const S = { user:null, profile:null, done:new Set(), wt:null, idx:0 };

(async function () {
  if (!isConfigured) { root.innerHTML = `<div class="wt"><p class="muted">Connect Supabase to use the app.</p></div>`; return; }
  const session = await requireSession(); if (!session) return;
  S.user = session.user;
  el("logout").onclick = async () => { await supabase.auth.signOut(); location.href = "index.html"; };
  await load();
})();

async function load() {
  const uid = S.user.id;
  const [prof, prog] = await Promise.all([
    supabase.from("licensing_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("walkthrough_progress").select("step_key").eq("user_id", uid),
  ]);
  S.profile = prof.data;
  S.done = new Set((prog.data || []).map(r => r.step_key));
  const nm = S.profile?.full_name || S.user.email;
  el("who").textContent = nm;
  if (!S.profile || !S.profile.registered || !S.profile.state) renderRegistration();
  else startWalkthrough();
}

/* ---------------- REGISTRATION ---------------- */
function renderRegistration() {
  const states = STATE_LIST.map(s => `<option value="${s.code}">${esc(s.name)}</option>`).join("");
  const a = S.profile?.answers || {};
  root.innerHTML = `
  <div class="reg-wrap">
    <h1 style="font-size:1.9rem">Agent registration</h1>
    <p class="muted" style="margin-top:-2px">A few details so we can tailor your licensing steps to your state. Takes about a minute.</p>
    <div class="card pad" style="margin-top:18px">
      <div class="row2">
        <div><label for="first">First name</label><input id="first" value="${esc(a.first_name||"")}"/></div>
        <div><label for="last">Last name</label><input id="last" value="${esc(a.last_name||"")}"/></div>
      </div>
      <label for="dob">Date of birth</label>
      <input id="dob" type="date" value="${esc(a.dob||"")}"/>

      <label for="state">Resident state (match your ID)</label>
      <select id="state"><option value="">Select your state…</option>${states}</select>

      <label>Are you active duty military?</label>
      <div class="seg" id="mil">
        <button type="button" data-v="No" class="on">No</button>
        <button type="button" data-v="Yes">Yes</button>
        <button type="button" data-v="Other">Other</button>
      </div>

      <label>Lines of authority</label>
      <div class="seg" id="loa">
        <button type="button" data-v="Life &amp; Health" class="on">Life &amp; Health</button>
        <button type="button" data-v="Life">Life</button>
      </div>

      <label for="trainer">Who is your agency representative / trainer?</label>
      <input id="trainer" value="${esc(a.trainer||"")}"/>

      <div id="regAlert" class="alert"></div>
      <button class="btn btn-primary btn-lg btn-block" id="regGo" style="margin-top:20px">Start my walkthrough</button>
    </div>
  </div>`;

  if (S.profile?.state) el("state").value = S.profile.state;
  setupSeg("mil", a.military);
  setupSeg("loa", S.profile?.license_type);
  el("regGo").onclick = submitReg;
}
function setupSeg(id, val) {
  const box = el(id);
  const btns = box.querySelectorAll("button");
  if (val) btns.forEach(b => b.classList.toggle("on", b.dataset.v === val));
  btns.forEach(b => b.onclick = () => { btns.forEach(x => x.classList.remove("on")); b.classList.add("on"); });
}
function segVal(id) { const b = el(id).querySelector("button.on"); return b ? b.dataset.v : null; }

async function submitReg() {
  const first = el("first").value.trim(), last = el("last").value.trim();
  const dob = el("dob").value, state = el("state").value, trainer = el("trainer").value.trim();
  const military = segVal("mil"), loa = segVal("loa");
  const A = el("regAlert");
  if (!first || !last || !state || !dob) { A.className = "alert show alert-error"; A.textContent = "Please fill in your name, date of birth, and state."; return; }
  el("regGo").disabled = true; el("regGo").textContent = "Setting up…";
  const payload = {
    user_id: S.user.id, full_name: `${first} ${last}`, state, license_type: loa || "Life & Health",
    answers: { first_name:first, last_name:last, dob, military, trainer },
    registered: true, registered_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("licensing_profiles").upsert(payload);
  await supabase.from("profiles").upsert({ id:S.user.id, email:S.user.email, full_name:payload.full_name, state, license_type:payload.license_type });
  if (error) { A.className = "alert show alert-error"; A.textContent = error.message; el("regGo").disabled=false; el("regGo").textContent="Start my walkthrough"; return; }
  S.profile = payload;
  el("who").textContent = payload.full_name;
  startWalkthrough();
}

/* ---------------- WALKTHROUGH ---------------- */
function startWalkthrough() {
  S.wt = buildWalkthrough(S.profile.state);
  if (!S.wt) { root.innerHTML = `<div class="wt"><p class="muted">We don't have steps for that state yet. Please contact your trainer.</p></div>`; return; }
  attachMisc();
  // resume at first incomplete step
  const firstIncomplete = S.wt.steps.findIndex(st => !S.done.has(st.key));
  S.idx = firstIncomplete === -1 ? S.wt.steps.length : firstIncomplete;
  renderStep();
}
function attachMisc() {
  if (!S.wt.misc) return;
  const m = S.wt.misc.toLowerCase();
  let key = "state_app";
  if (/print|background|code|fingerprint/.test(m)) key = "fingerprinting";
  else if (/exam|test/.test(m)) key = "exam_registration";
  const target = S.wt.steps.find(s => s.key === key) || S.wt.steps.find(s => s.key === "state_app");
  if (target) target._misc = S.wt.misc;
}

function renderStep() {
  const steps = S.wt.steps, total = steps.length;
  if (S.idx >= total) return renderDone();
  const st = steps[S.idx];
  const completedCount = S.done.size;
  const pct = Math.round((completedCount / total) * 100);
  const isDone = S.done.has(st.key);

  root.innerHTML = `
  <div class="wt">
    <div class="wt-head">
      <div class="wt-meta"><span>Step ${S.idx + 1} of ${total}</span><span>${completedCount} of ${total} complete</span></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="wt-state">${esc(S.profile.license_type)} license — ${esc(S.wt.state.name)}</div>
    </div>

    <div class="step-card">
      <div class="step-body">
        <div class="step-k">Step ${S.idx + 1}</div>
        <h2>${esc(st.title)}</h2>
        <p class="step-desc">${esc(st.desc || "")}</p>

        <div class="video">${videoEmbed(st.video)}</div>

        ${st._misc ? `<div class="callout"><span class="lab">Note for ${esc(S.wt.state.name)}</span>${linkify(st._misc)}</div>` : ""}
        ${st.note ? `<div class="callout">${linkify(st.note)}</div>` : ""}

        ${st.link ? `<div class="link-row"><a class="btn btn-accent btn-lg" href="${esc(st.link)}" target="_blank" rel="noopener">Open this step</a></div>
          <div class="link-note">Opens in a new tab. Come back here when you're done.</div>` : ""}

        ${st.instructions ? `<details class="inst" ${S.idx===0?"open":""} style="margin-top:20px">
          <summary>Step-by-step instructions</summary>
          <ol>${st.instructions.map(i => `<li>${linkify(i)}</li>`).join("")}</ol>
        </details>` : ""}
      </div>
    </div>

    <div class="wt-nav">
      <button class="btn btn-ghost" id="back" ${S.idx===0?"disabled":""}>Back</button>
      <button class="btn btn-primary" id="next">${isDone ? (S.idx===total-1?"Finish":"Next") : (S.idx===total-1?"Mark complete & finish":"Mark complete & continue")}</button>
    </div>

    <div class="rail">
      ${steps.map((s, i) => {
        const cls = S.done.has(s.key) ? "done" : (i === S.idx ? "cur" : "");
        const mark = S.done.has(s.key) ? "&#10003;" : (i + 1);
        return `<div class="rail-item ${cls}" data-i="${i}"><span class="rn">${mark}</span>${esc(shortTitle(s.title))}</div>`;
      }).join("")}
    </div>
  </div>`;

  el("back").onclick = () => { if (S.idx > 0) { S.idx--; renderStep(); window.scrollTo({top:0,behavior:"smooth"}); } };
  el("next").onclick = async () => {
    if (!S.done.has(st.key)) {
      S.done.add(st.key);
      await supabase.from("walkthrough_progress").upsert({ user_id:S.user.id, step_key:st.key, completed:true, completed_at:new Date().toISOString() }, { onConflict:"user_id,step_key" });
    }
    S.idx++; renderStep(); window.scrollTo({ top:0, behavior:"smooth" });
  };
  root.querySelectorAll(".rail-item[data-i]").forEach(r => r.onclick = () => { S.idx = Number(r.dataset.i); renderStep(); window.scrollTo({top:0,behavior:"smooth"}); });
}

function renderDone() {
  const total = S.wt.steps.length;
  root.innerHTML = `
  <div class="done-card">
    <div class="check">&#10003;</div>
    <h2>You've completed every step</h2>
    <p class="muted">All ${total} steps for your ${esc(S.profile.license_type)} license in ${esc(S.wt.state.name)} are marked complete. Your trainer has what they need — nice work.</p>
    <div class="chips" style="justify-content:center;margin-top:14px">
      ${S.wt.steps.map(s => `<span class="chip">${esc(shortTitle(s.title))}</span>`).join("")}
    </div>
    <div style="margin-top:24px"><button class="btn btn-ghost" id="review">Review the steps again</button></div>
  </div>`;
  el("review").onclick = () => { S.idx = 0; renderStep(); window.scrollTo({top:0,behavior:"smooth"}); };
}

/* ---------------- helpers ---------------- */
function shortTitle(t) {
  return t.replace(/\s*\(.*\)\s*$/, "").replace(/^Register for your state exam.*/, "Exam registration")
    .replace(/^Complete your pre-licensing.*/, "Study material")
    .replace(/^Complete fingerprinting.*/, "Fingerprinting")
    .replace(/^Submit your state application.*/, "State application")
    .replace(/^Complete your state affidavit.*/, "Affidavit")
    .replace(/^Set up your continuing education.*/, "Continuing education")
    .replace(/^Complete carrier contracting.*/, "Carrier contracting")
    .replace(/^Get your E&O.*/, "E&O insurance");
}
function linkify(text) {
  const safe = esc(text);
  return safe.replace(/(https?:\/\/[^\s]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}
function videoEmbed(url) {
  if (!url) return `<div class="ph"><div class="pi"></div>Video coming soon</div>`;
  let m;
  if ((m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/))) return `<iframe src="https://www.youtube.com/embed/${m[1]}" allowfullscreen loading="lazy"></iframe>`;
  if ((m = url.match(/vimeo\.com\/(\d+)/))) return `<iframe src="https://player.vimeo.com/video/${m[1]}" allowfullscreen loading="lazy"></iframe>`;
  if (/\.mp4($|\?)/.test(url)) return `<video controls preload="metadata" src="${esc(url)}"></video>`;
  return `<iframe src="${esc(url)}" allowfullscreen loading="lazy"></iframe>`;
}
