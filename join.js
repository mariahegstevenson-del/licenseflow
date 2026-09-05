/* ------------------------------------------------------------
   join.js — the public contracting intake.

   Reached as join.html?t=<token>. No sign-in: whoever has the link
   can submit, which is the whole point — most recruits do not have a
   LicenseFlow account when they fill this in.

   What keeps that safe is that the page can only ever call two
   functions, both SECURITY DEFINER on the database side:

     ct_intake_look    given a token, returns the carrier and agency
                       name and nothing else. Never the hierarchy,
                       never a person, never a document.
     ct_intake_submit  writes one pending row. The submitter cannot
                       choose an agency, cannot set a status, and
                       cannot touch anyone else's record.

   Direct table access for anon is refused by RLS, so a mistake here
   leaks nothing; the worst a stranger with the link can do is put a
   greyed-out row in front of an admin who then rejects it.

   Files are uploaded before the submit call, into
   <agency>/intake/<token>/<random>/, a prefix anon may write to and
   may not read, list, overwrite or delete.
------------------------------------------------------------ */
import { supabase, isConfigured } from "./supabase.js?v=3";

const el = (id) => document.getElementById(id);
const token = new URLSearchParams(location.search).get("t") || "";

const DOCS = [
  { k:"aml",           input:"f_aml", label:"AML" },
  { k:"eo",            input:"f_eo",  label:"E&O" },
  { k:"best_interest", input:"f_bi",  label:"Best Interest" },
];

const MAX_BYTES = 25 * 1024 * 1024;
let carrier = null;

function show(id){
  ["loading", "dead", "form", "done"].forEach(k => { el(k).hidden = (k !== id); });
}
function say(msg, kind){
  const a = el("alert");
  a.textContent = msg || "";
  a.className = "alert" + (msg ? " alert-" + (kind || "error") : "");
}

/* ---------------- open the link ---------------- */
async function start(){
  if (!isConfigured || !supabase) return show("dead");
  if (!/^[0-9a-f]{32}$/.test(token)) return show("dead");

  const { data, error } = await supabase.rpc("ct_intake_look", { p_token: token });
  if (error || !data || !data.length) return show("dead");

  carrier = data[0];
  el("agency").textContent  = carrier.agency_name;
  el("carrier").textContent = carrier.hub_name
    ? `${carrier.hub_name} — ${carrier.carrier_name}`
    : carrier.carrier_name;
  if (carrier.invite_note) el("note").textContent = carrier.invite_note;
  if (carrier.kit_url) {
    el("kitlink").href = carrier.kit_url;
    el("kitline").hidden = false;
  }
  show("form");
  el("f_name").focus();
}

/* ---------------- files ---------------- */
function markFile(d, cls, msg){
  const wrap = el(d.input).closest(".jn-doc");
  wrap.className = "jn-doc" + (cls ? " " + cls : "");
  let n = wrap.querySelector(".jn-note");
  if (!msg) { if (n) n.remove(); return; }
  if (!n) { n = document.createElement("p"); wrap.appendChild(n); }
  n.className = "jn-note" + (cls === "bad" ? " bad" : "");
  n.textContent = msg;
}

DOCS.forEach(d => {
  const input = el(d.input);
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return markFile(d, "", "");
    if (f.size > MAX_BYTES) {
      input.value = "";
      return markFile(d, "bad", "That file is over 25 MB. Send a smaller copy.");
    }
    markFile(d, "ok", `${f.name} · ${(f.size / 1024 / 1024).toFixed(1)} MB`);
  };
});

/* Keep the extension, drop everything else about the filename: it
   arrives from a stranger's computer and ends up in a storage path. */
function safeExt(name){
  const m = String(name || "").match(/\.([A-Za-z0-9]{1,8})$/);
  return m ? "." + m[1].toLowerCase() : "";
}

async function uploadOne(d, folder){
  const f = el(d.input).files && el(d.input).files[0];
  if (!f) return null;
  const path = `${carrier.agency_id}/intake/${token}/${folder}/${d.k}${safeExt(f.name)}`;
  const { error } = await supabase.storage.from("contracting")
    .upload(path, f, { upsert: false, contentType: f.type || "application/octet-stream" });
  if (error) throw new Error(`${d.label}: ${error.message}`);
  return { kind: d.k, path, name: f.name };
}

/* ---------------- send ---------------- */
el("send").onclick = async () => {
  const btn  = el("send");
  const name = el("f_name").value.trim();
  say("");

  if (name.length < 2) {
    say("Please put your full name in.");
    return el("f_name").focus();
  }

  btn.classList.add("is-busy");
  btn.textContent = "Sending…";
  let sentDocs = 0;

  try {
    /* One folder per submission, so two people sending the same form
       can never land on the same path. */
    const folder = (crypto.randomUUID ? crypto.randomUUID()
                                      : String(Date.now()) + Math.random()).replace(/[^a-z0-9-]/gi, "");
    const docs = [];
    for (const d of DOCS) {
      btn.textContent = `Sending ${d.label}…`;
      const up = await uploadOne(d, folder);
      if (up) docs.push(up);
    }
    sentDocs = docs.length;

    btn.textContent = "Sending…";
    const { error } = await supabase.rpc("ct_intake_submit", {
      p_token: token,
      p_name:  name,
      p_upline: el("f_upline").value.trim() || null,
      p_level:  el("f_level").value.trim()  || null,
      p_email:  el("f_email").value.trim()  || null,
      p_phone:  el("f_phone").value.trim()  || null,
      p_docs:   docs,
    });
    if (error) throw error;

    el("donesub").textContent =
      `${carrier.agency_name} can see you now. They'll check your details and confirm your place in the hierarchy.`;
    if (sentDocs) {
      el("donedocs").hidden = false;
      el("donedocs").textContent =
        `${sentDocs} document${sentDocs === 1 ? "" : "s"} went with it.`;
    }
    show("done");
    window.scrollTo(0, 0);

  } catch (e) {
    btn.classList.remove("is-busy");
    btn.textContent = "Send to my agency";
    say(e && e.message
      ? `That didn't go through. ${e.message}`
      : "That didn't go through. Try again in a moment.");
  }
};

start();
