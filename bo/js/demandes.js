(() => {
  "use strict";
  const client = window.boSupabase;

  const adminEmailEl = document.getElementById("admin-email");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const searchInput = document.getElementById("search-input");
  const listEl = document.getElementById("demandes-list");
  const countEl = document.getElementById("demandes-count");
  const stateEl = document.getElementById("demandes-state");

  let allDemandes = [];

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  const fmtDateTime = (iso) =>
    new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  const optionsLabel = (d) => {
    const opts = [];
    if (d.hebergement) opts.push("Hébergement");
    if (d.dj) opts.push("DJ");
    if (d.chef_cuisine) opts.push("Chef de cuisine");
    return opts.length ? opts.join(", ") : "Aucune";
  };

  const render = (demandes) => {
    countEl.textContent = `${demandes.length} demande${demandes.length > 1 ? "s" : ""}`;

    if (!demandes.length) {
      listEl.innerHTML = "";
      stateEl.textContent = allDemandes.length
        ? "Aucune demande ne correspond à votre recherche."
        : "Aucune demande pour le moment.";
      stateEl.hidden = false;
      return;
    }
    stateEl.hidden = true;

    listEl.innerHTML = demandes
      .map(
        (d) => `
      <details class="bo-card">
        <summary>
          <span class="bo-card-name">${esc(d.prenom)} ${esc(d.nom)}</span>
          <span class="bo-card-type">${esc(d.type_evenement || "—")}</span>
          <span class="bo-card-date">Événement : ${fmtDate(d.date_evenement)}</span>
          <span class="bo-card-received">Reçu le ${fmtDateTime(d.created_at)}</span>
        </summary>
        <div class="bo-card-body">
          <dl>
            <div><dt>Email</dt><dd><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></dd></div>
            <div><dt>Téléphone</dt><dd><a href="tel:${esc(d.telephone)}">${esc(d.telephone)}</a></dd></div>
            <div><dt>Invités</dt><dd>${d.nb_adultes ?? "—"} adulte(s), ${d.nb_enfants ?? 0} enfant(s), ${d.nb_bebes ?? 0} bébé(s)</dd></div>
            <div><dt>Moment</dt><dd>${esc(d.moment || "—")}</dd></div>
            <div><dt>Options</dt><dd>${esc(optionsLabel(d))}</dd></div>
            <div><dt>Autre prestataire</dt><dd>${esc(d.autre_prestataire || "—")}</dd></div>
            <div><dt>Page d'origine</dt><dd>${esc(d.source_page || "—")}</dd></div>
          </dl>
          ${d.message ? `<p class="bo-card-message">${esc(d.message)}</p>` : ""}
        </div>
      </details>`
      )
      .join("");
  };

  const applyFilter = () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = !q
      ? allDemandes
      : allDemandes.filter((d) =>
          [d.prenom, d.nom, d.email, d.telephone, d.type_evenement].some((v) =>
            (v || "").toLowerCase().includes(q)
          )
        );
    render(filtered);
  };

  const loadDemandes = async () => {
    stateEl.hidden = false;
    stateEl.textContent = "Chargement…";
    listEl.innerHTML = "";

    const { data, error } = await client
      .from("demandes_devis")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      stateEl.textContent = "Erreur lors du chargement des demandes : " + error.message;
      countEl.textContent = "";
      return;
    }

    allDemandes = data || [];
    applyFilter();
  };

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      await client.auth.signOut();
    } finally {
      window.location.replace("/bo/index.html");
    }
  });
  refreshBtn.addEventListener("click", loadDemandes);
  searchInput.addEventListener("input", applyFilter);

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
    loadDemandes();
  })();
})();
