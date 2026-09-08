(function () {
  const authCard = document.getElementById("admin-auth-card");
  const adminDashboard = document.getElementById("admin-dashboard");
  const authMessage = document.getElementById("admin-auth-message");
  const changePasswordForm = document.getElementById(
    "admin-change-password-form",
  );
  const logoutButton = document.getElementById("admin-logout-button");
  const authGate = document.createElement("div");

  authGate.className = "auth-shell";

  function showMessage(message, isError = false) {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `auth-message${isError ? " error" : ""}`;
  }

  function setDashboardVisible(isVisible) {
    if (adminDashboard)
      adminDashboard.style.display = isVisible ? "block" : "none";
    if (changePasswordForm)
      changePasswordForm.style.display = isVisible ? "grid" : "none";
    if (logoutButton)
      logoutButton.style.display = isVisible ? "inline-block" : "none";
  }

  // script.js (loaded before this file) creates a top-level `supabaseClient`.
  // Classic <script> tags share the same global scope, so we can read it
  // directly here as long as script.js's init() has already run.
  function getClient() {
    if (typeof supabaseClient !== "undefined" && supabaseClient)
      return supabaseClient;
    return null;
  }

  async function renderAuthGate() {
    if (authGate.parentNode) {
      authGate.parentNode.removeChild(authGate);
    }

    const client = getClient();
    if (!client) {
      showMessage(
        "Supabase is not configured — check the browser console.",
        true,
      );
      setDashboardVisible(false);
      return;
    }

    const {
      data: { session },
    } = await client.auth.getSession();

    if (session) {
      setDashboardVisible(true);
      showMessage(`Logged in as ${session.user.email}`);
      return;
    }

    setDashboardVisible(false);

    const form = document.createElement("form");
    form.className = "auth-card auth-form";
    form.innerHTML = `
      <h1>Admin Login</h1>
      <p>Enter your admin email and password.</p>
      <label for="admin-login-email">Email</label>
      <input id="admin-login-email" type="email" placeholder="Enter email" required />
      <label for="admin-login-password">Password</label>
      <input id="admin-login-password" type="password" placeholder="Enter password" required />
      <button type="submit">Login</button>
      <div id="admin-login-message" class="auth-message"></div>
    `;

    authGate.innerHTML = "";
    authGate.appendChild(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const messageBox = document.getElementById("admin-login-message");
      const email = document.getElementById("admin-login-email")?.value || "";
      const password =
        document.getElementById("admin-login-password")?.value || "";

      if (!email || !password) {
        if (messageBox) {
          messageBox.textContent = "Please enter email and password.";
          messageBox.className = "auth-message error";
        }
        return;
      }

      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (messageBox) {
        messageBox.textContent = "Logging in...";
        messageBox.className = "auth-message";
      }

      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (messageBox) {
          messageBox.textContent = error.message || "Login failed.";
          messageBox.className = "auth-message error";
        }
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      await renderAuthGate();
    });

    if (authCard) {
      authCard.insertAdjacentElement("afterend", authGate);
    }
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const client = getClient();
      if (!client) {
        showMessage("Supabase is not configured.", true);
        return;
      }

      const currentPassword =
        document.getElementById("admin-current-password")?.value || "";
      const newPassword =
        document.getElementById("admin-new-password")?.value || "";
      const confirmPassword =
        document.getElementById("admin-new-password-confirm")?.value || "";

      if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage("Please fill in all password fields.", true);
        return;
      }
      if (newPassword !== confirmPassword) {
        showMessage("New passwords do not match.", true);
        return;
      }

      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session) {
        showMessage("You must be logged in to change your password.", true);
        return;
      }

      // Re-verify the current password before allowing a change.
      const { error: verifyError } = await client.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (verifyError) {
        showMessage("Current password is incorrect.", true);
        return;
      }

      const { error: updateError } = await client.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        showMessage(updateError.message || "Could not update password.", true);
        return;
      }

      changePasswordForm.reset();
      showMessage("Password changed successfully.");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const client = getClient();
      if (client) await client.auth.signOut();
      await renderAuthGate();
      showMessage("You have been logged out.");
    });
  }

  window.addEventListener("load", async () => {
    showMessage("Loading admin session…");
    await renderAuthGate();

    const client = getClient();
    if (client) {
      client.auth.onAuthStateChange(() => {
        renderAuthGate();
      });
    }
  });
})();
