(() => {
  "use strict";
  const client = window.boSupabase;
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const submitBtn = form.querySelector('button[type="submit"]');

  (async () => {
    const { data: { session } } = await client.auth.getSession();
    if (session) window.location.replace("/bo/demandes.html");
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Connexion…";

    const email = form.email.value.trim();
    const password = form.password.value;
    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = "Identifiants incorrects.";
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Se connecter";
      return;
    }
    window.location.replace("/bo/demandes.html");
  });
})();
