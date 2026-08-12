import { supabase, isConfigured } from "./supabase.js";

const params = new URLSearchParams(location.search);
let mode = params.get("mode") === "signup" ? "signup" : "login";
const el = (id) => document.getElementById(id);
const A = el("alert");
const show = (m, ok) => { A.textContent = m; A.className = "alert show " + (ok ? "alert-ok" : "alert-error"); };
const clear = () => { A.className = "alert"; };

function render() {
  const s = mode === "signup";
  el("tabLogin").classList.toggle("active", !s);
  el("tabSignup").classList.toggle("active", s);
  el("nameField").style.display = s ? "block" : "none";
  el("title").textContent = s ? "Create your account" : "Welcome back";
  el("sub").textContent = s ? "Start your licensing journey in minutes" : "Log in to your licensing dashboard";
  el("submit").textContent = s ? "Create account" : "Log in";
  el("password").setAttribute("autocomplete", s ? "new-password" : "current-password");
  el("hint").innerHTML = s ? 'Already have an account? <a href="#" id="toL">Log in</a>' : 'New here? <a href="#" id="toS">Create an account</a>';
  const l = el("toL"), g = el("toS");
  if (l) l.onclick = (e) => { e.preventDefault(); mode = "login"; render(); };
  if (g) g.onclick = (e) => { e.preventDefault(); mode = "signup"; render(); };
  clear();
}
el("tabLogin").onclick = () => { mode = "login"; render(); };
el("tabSignup").onclick = () => { mode = "signup"; render(); };

(async () => {
  if (isConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session) location.href = "app.html";
  }
})();

el("form").addEventListener("submit", async (e) => {
  e.preventDefault(); clear();
  if (!isConfigured) { show("Demo mode: connect Supabase to enable accounts.", false); return; }
  const email = el("email").value.trim(), password = el("password").value, full_name = el("fullName").value.trim();
  el("submit").disabled = true; el("submit").textContent = "…";
  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } });
      if (error) throw error;
      if (data.session) location.href = "app.html";
      else { show("Account created! Check your email to confirm, then log in. ✅", true); mode = "login"; render(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.href = "app.html";
    }
  } catch (err) { show(err.message || "Something went wrong.", false); }
  finally { el("submit").disabled = false; el("submit").textContent = mode === "signup" ? "Create account" : "Log in"; }
});
render();
