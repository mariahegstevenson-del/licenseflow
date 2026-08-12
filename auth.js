import { supabase, isConfigured } from "./supabase.js";

let mode = new URLSearchParams(location.search).get("mode") === "login" ? "login" : "signup";
const el = (id) => document.getElementById(id);
const A = el("alert");
const show = (m, ok) => { A.textContent = m; A.className = "alert show " + (ok ? "alert-ok" : "alert-error"); };
const clear = () => { A.className = "alert"; };

function render() {
  const s = mode === "signup";
  el("tabSignup").classList.toggle("on", s);
  el("tabLogin").classList.toggle("on", !s);
  el("title").textContent = s ? "Create your account" : "Welcome back";
  el("sub").textContent = s ? "Register to start your licensing walkthrough" : "Log in to continue your walkthrough";
  el("submit").textContent = s ? "Create account" : "Log in";
  el("password").setAttribute("autocomplete", s ? "new-password" : "current-password");
  el("hint").innerHTML = s ? 'Already registered? <a href="#" id="sw">Log in</a>' : 'New here? <a href="#" id="sw">Create an account</a>';
  const sw = el("sw"); if (sw) sw.onclick = (e) => { e.preventDefault(); mode = s ? "login" : "signup"; render(); };
  clear();
}
el("tabSignup").onclick = () => { mode = "signup"; render(); };
el("tabLogin").onclick = () => { mode = "login"; render(); };

(async () => {
  if (isConfigured) { const { data } = await supabase.auth.getSession(); if (data.session) location.href = "app.html"; }
})();

el("form").addEventListener("submit", async (e) => {
  e.preventDefault(); clear();
  if (!isConfigured) { show("Connect Supabase to enable accounts.", false); return; }
  const email = el("email").value.trim(), password = el("password").value;
  el("submit").disabled = true; el("submit").textContent = "Please wait…";
  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) location.href = "app.html";
      else { show("Account created. Check your email to confirm, then log in.", true); mode = "login"; render(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.href = "app.html";
    }
  } catch (err) { show(err.message || "Something went wrong.", false); }
  finally { el("submit").disabled = false; el("submit").textContent = mode === "signup" ? "Create account" : "Log in"; }
});
render();
