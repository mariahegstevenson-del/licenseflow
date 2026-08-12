import { supabase, isConfigured } from "./supabase.js";

const params    = new URLSearchParams(location.search);
let mode        = params.get("mode") === "signup" ? "signup" : "login";

const els = {
  title:    document.getElementById("authTitle"),
  sub:      document.getElementById("authSub"),
  tabLogin: document.getElementById("tabLogin"),
  tabSignup:document.getElementById("tabSignup"),
  nameField:document.getElementById("nameField"),
  fullName: document.getElementById("fullName"),
  form:     document.getElementById("authForm"),
  submit:   document.getElementById("authSubmit"),
  alert:    document.getElementById("authAlert"),
  hint:     document.getElementById("switchHint"),
  password: document.getElementById("password"),
};

function showAlert(msg, ok) {
  els.alert.textContent = msg;
  els.alert.className = "alert show " + (ok ? "alert-ok" : "alert-error");
}
function clearAlert(){ els.alert.className = "alert"; }

function render() {
  const signup = mode === "signup";
  els.tabLogin.classList.toggle("active", !signup);
  els.tabSignup.classList.toggle("active", signup);
  els.nameField.style.display = signup ? "block" : "none";
  els.title.textContent = signup ? "Create your account" : "Welcome back";
  els.sub.textContent   = signup ? "Start managing your license in minutes" : "Log in to your agent dashboard";
  els.submit.textContent= signup ? "Create account" : "Log in";
  els.password.setAttribute("autocomplete", signup ? "new-password" : "current-password");
  els.hint.innerHTML = signup
    ? 'Already have an account? <a href="#" id="toLogin">Log in</a>'
    : 'New here? <a href="#" id="toSignup">Create an account</a>';
  wireHints();
  clearAlert();
}
function wireHints() {
  const l = document.getElementById("toLogin");
  const s = document.getElementById("toSignup");
  if (l) l.onclick = (e) => { e.preventDefault(); mode = "login"; render(); };
  if (s) s.onclick = (e) => { e.preventDefault(); mode = "signup"; render(); };
}
els.tabLogin.onclick  = () => { mode = "login";  render(); };
els.tabSignup.onclick = () => { mode = "signup"; render(); };

// If already signed in, go straight to the dashboard.
(async () => {
  if (isConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session) location.href = "dashboard.html";
  }
})();

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert();

  if (!isConfigured) {
    showAlert("Demo mode: connect Supabase (add your URL + anon key) to enable real accounts.", false);
    return;
  }

  const email    = document.getElementById("email").value.trim();
  const password = els.password.value;
  const fullName = els.fullName.value.trim();

  els.submit.disabled = true;
  els.submit.textContent = mode === "signup" ? "Creating…" : "Logging in…";

  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      if (data.session) {
        location.href = "dashboard.html";
      } else {
        showAlert("Account created! Check your email to confirm, then log in. ✅", true);
        mode = "login"; render();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.href = "dashboard.html";
    }
  } catch (err) {
    showAlert(err.message || "Something went wrong. Please try again.", false);
  } finally {
    els.submit.disabled = false;
    els.submit.textContent = mode === "signup" ? "Create account" : "Log in";
  }
});

render();
