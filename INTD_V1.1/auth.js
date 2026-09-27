// =========================================================
//   INTD — Auth (sign up / log in / log out)
//   Requires config.js to be loaded first (supabaseClient).
//   Only drives markup if the auth elements exist on the page.
// =========================================================

const authSection = document.getElementById("auth-section");
const sessionBar = document.getElementById("session-bar");

if (authSection && sessionBar) {
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authDisplayName = document.getElementById("auth-display-name");
  const authStatus = document.getElementById("auth-status");
  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const togglePasswordBtn = document.getElementById("toggle-password");
  const sessionName = document.getElementById("session-name");

  function setStatus(message, isError) {
    authStatus.textContent = message;
    authStatus.className = isError ? "error-text" : "auth-status-ok";
  }

  function setBusy(button, busy, busyLabel) {
    if (busy) {
      button.dataset.idleLabel = button.textContent;
      button.textContent = busyLabel;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.idleLabel || button.textContent;
      button.disabled = false;
    }
  }

  async function resolveDisplayName(user) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    return data?.display_name || user.email;
  }

  async function updateAuthUI(session) {
    if (session) {
      sessionName.textContent = await resolveDisplayName(session.user);
      authSection.hidden = true;
      sessionBar.hidden = false;
      return;
    }
    sessionName.textContent = "—";
    authSection.hidden = false;
    sessionBar.hidden = true;
  }

  signupBtn.addEventListener("click", async () => {
    setStatus("", false);
    setBusy(signupBtn, true, "Creating...");

    const { data, error } = await supabaseClient.auth.signUp({
      email: authEmail.value.trim(),
      password: authPassword.value,
    });

    if (error) {
      setStatus("Signup failed: " + error.message, true);
      setBusy(signupBtn, false);
      return;
    }

    if (!data.user) {
      setStatus("Account created. Check your email to confirm, then log in.", false);
      setBusy(signupBtn, false);
      return;
    }

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert([{ id: data.user.id, display_name: authDisplayName.value.trim() || data.user.email }]);

    setBusy(signupBtn, false);
    setStatus(
      profileError
        ? "Signed up, but your display name didn't save: " + profileError.message
        : "Signed in. Start your first Fly.",
      Boolean(profileError)
    );
  });

  loginBtn.addEventListener("click", async () => {
    setStatus("", false);
    setBusy(loginBtn, true, "Logging in...");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: authEmail.value.trim(),
      password: authPassword.value,
    });

    setBusy(loginBtn, false);
    setStatus(error ? "Login failed: " + error.message : "Logged in.", Boolean(error));
  });

  logoutBtn.addEventListener("click", async () => {
    setBusy(logoutBtn, true, "Logging out...");
    const { error } = await supabaseClient.auth.signOut();
    setBusy(logoutBtn, false);
    if (error) setStatus("Logout failed: " + error.message, true);
  });

  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = authPassword.type === "password";
    authPassword.type = isHidden ? "text" : "password";
    togglePasswordBtn.setAttribute("aria-pressed", String(isHidden));
    togglePasswordBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });

  authForm.addEventListener("submit", (e) => e.preventDefault());

  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
  });
}
