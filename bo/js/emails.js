(() => {
  "use strict";
  const client = window.boSupabase;

  const adminEmailEl = document.getElementById("admin-email");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const listEl = document.getElementById("templates-list");
  const countEl = document.getElementById("templates-count");
  const stateEl = document.getElementById("templates-state");

  const editorEl = document.getElementById("editor");
  const editorTitleEl = document.getElementById("editor-title");
  const editorActiveToggle = document.getElementById("editor-active-toggle");
  const editorNameEl = document.getElementById("editor-name");
  const editorRuleEl = document.getElementById("editor-rule");
  const editorSubjectEl = document.getElementById("editor-subject");
  const editorSurfaceEl = document.getElementById("editor-surface");
  const editorSourceEl = document.getElementById("editor-source");
  const editorPreviewEl = document.getElementById("editor-preview");
  const editorStateEl = document.getElementById("editor-state");
  const toggleSourceBtn = document.getElementById("toggle-source-btn");

  let templates = [];
  let currentId = null;

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const fmtDateTime = (iso) =>
    new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  /* Copie simplifiee du wrapper d'email (voir supabase/functions/send-devis-thankyou/helpers.ts),
     utilisee uniquement pour l'apercu visuel ici — a mettre a jour si ce layout change la-bas. */
  const previewDoc = (bodyHtml) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F8F9F9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9F9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
<tr><td style="background:#001018;padding:28px 32px;text-align:center;">
<span style="color:#fff;font-weight:700;letter-spacing:.08em;">LE 119</span>
</td></tr>
<tr><td style="padding:36px 32px;color:#111111;">
${bodyHtml}
</td></tr>
<tr><td style="background:#001E26;padding:24px 32px;text-align:center;color:rgba(255,255,255,.72);font-size:12px;line-height:1.6;">
Le 119 — 119 rue de Famars, 59300 Valenciennes<br>06 47 98 28 29
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const updatePreview = () => {
    const html = editorEl.classList.contains("is-source-mode")
      ? editorSourceEl.value
      : editorSurfaceEl.innerHTML;
    editorPreviewEl.srcdoc = previewDoc(html);
  };

  const renderList = () => {
    countEl.textContent = `${templates.length} email${templates.length > 1 ? "s" : ""}`;

    if (!templates.length) {
      listEl.innerHTML = "";
      stateEl.textContent = "Aucun email configuré pour le moment.";
      stateEl.hidden = false;
      return;
    }
    stateEl.hidden = true;

    listEl.innerHTML = templates
      .map(
        (t) => `
      <div class="bo-template-card" data-id="${t.id}">
        <span class="bo-template-name">${esc(t.name)}</span>
        <span class="bo-template-status ${t.is_active ? "is-active" : ""}">${t.is_active ? "Actif" : "En pause"}</span>
        <label class="bo-switch" title="${t.is_active ? "Mettre en pause" : "Activer"}">
          <input type="checkbox" data-action="toggle" data-id="${t.id}" ${t.is_active ? "checked" : ""}>
          <span class="bo-switch-track" aria-hidden="true"></span>
        </label>
        <button type="button" class="bo-btn bo-btn-outline" data-action="edit" data-id="${t.id}">Modifier</button>
      </div>`
      )
      .join("");
  };

  const loadTemplates = async () => {
    stateEl.hidden = false;
    stateEl.textContent = "Chargement…";
    listEl.innerHTML = "";

    const { data, error } = await client
      .from("email_templates")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      stateEl.textContent = "Erreur lors du chargement des emails : " + error.message;
      countEl.textContent = "";
      return;
    }

    templates = data || [];
    renderList();
  };

  const toggleActive = async (id, isActive) => {
    const { error } = await client.from("email_templates").update({ is_active: isActive }).eq("id", id);
    if (error) {
      alert("Erreur lors de la mise à jour : " + error.message);
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (t) t.is_active = isActive;
    renderList();
    if (currentId === id) editorActiveToggle.checked = isActive;
  };

  const openEditor = (id) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    currentId = id;

    editorTitleEl.textContent = t.name;
    editorActiveToggle.checked = t.is_active;
    editorNameEl.value = t.name;
    editorRuleEl.value = t.business_rule || "";
    editorSubjectEl.value = t.subject;
    editorSurfaceEl.innerHTML = t.html_content;
    editorSourceEl.value = t.html_content;
    editorEl.classList.remove("is-source-mode");
    toggleSourceBtn.textContent = "Voir le code HTML";
    editorStateEl.hidden = true;
    updatePreview();

    editorEl.classList.add("is-open");
    editorEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const closeEditor = () => {
    editorEl.classList.remove("is-open");
    currentId = null;
  };

  const syncBeforeModeSwitch = (toSource) => {
    if (toSource) {
      editorSourceEl.value = editorSurfaceEl.innerHTML;
    } else {
      editorSurfaceEl.innerHTML = editorSourceEl.value;
    }
  };

  toggleSourceBtn.addEventListener("click", () => {
    const goingToSource = !editorEl.classList.contains("is-source-mode");
    syncBeforeModeSwitch(goingToSource);
    editorEl.classList.toggle("is-source-mode", goingToSource);
    toggleSourceBtn.textContent = goingToSource ? "Retour à l'aperçu visuel" : "Voir le code HTML";
    updatePreview();
  });

  document.querySelectorAll(".bo-editor-toolbar button[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editorSurfaceEl.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === "createLink") {
        const url = prompt("URL du lien :", "https://");
        if (!url) return;
        document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      updatePreview();
    });
  });

  editorSurfaceEl.addEventListener("input", updatePreview);
  editorSourceEl.addEventListener("input", updatePreview);

  editorActiveToggle.addEventListener("change", () => {
    if (currentId) toggleActive(currentId, editorActiveToggle.checked);
  });

  document.getElementById("editor-close-btn").addEventListener("click", closeEditor);
  document.getElementById("editor-cancel-btn").addEventListener("click", closeEditor);

  document.getElementById("editor-save-btn").addEventListener("click", async () => {
    if (!currentId) return;
    syncBeforeModeSwitch(editorEl.classList.contains("is-source-mode"));

    const htmlContent = editorEl.classList.contains("is-source-mode")
      ? editorSourceEl.value
      : editorSurfaceEl.innerHTML;

    editorStateEl.hidden = false;
    editorStateEl.textContent = "Enregistrement…";

    const { error } = await client
      .from("email_templates")
      .update({
        name: editorNameEl.value.trim(),
        business_rule: editorRuleEl.value.trim(),
        subject: editorSubjectEl.value.trim(),
        html_content: htmlContent,
      })
      .eq("id", currentId);

    if (error) {
      editorStateEl.textContent = "Erreur lors de l'enregistrement : " + error.message;
      return;
    }

    editorStateEl.textContent = "Enregistré.";
    await loadTemplates();
    setTimeout(() => { editorStateEl.hidden = true; }, 2000);
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='edit']");
    if (btn) openEditor(btn.dataset.id);
  });

  listEl.addEventListener("change", (e) => {
    const input = e.target.closest("[data-action='toggle']");
    if (input) toggleActive(input.dataset.id, input.checked);
  });

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      await client.auth.signOut();
    } finally {
      window.location.replace("/bo/index.html");
    }
  });
  refreshBtn.addEventListener("click", loadTemplates);

  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") window.location.replace("/bo/index.html");
  });

  (async () => {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      window.location.replace("/bo/index.html");
      return;
    }
    adminEmailEl.textContent = session.user.email;
    loadTemplates();
  })();
})();
