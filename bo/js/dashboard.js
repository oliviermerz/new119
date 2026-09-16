(() => {
  "use strict";
  const client = window.boSupabase;

  const adminEmailEl = document.getElementById("admin-email");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const periodSelect = document.getElementById("period-select");
  const stateEl = document.getElementById("analytics-state");
  const statViews = document.getElementById("stat-views");
  const statPages = document.getElementById("stat-pages");
  const statDuration = document.getElementById("stat-duration");
  const chartEl = document.getElementById("chart-views");
  const topPagesBody = document.getElementById("top-pages-body");
  const formsFunnelsEl = document.getElementById("forms-funnels");

  /* Nom lisible pour chaque form_name connu (voir js/main.js -> sendFormEvent).
     Un formulaire pas encore repertorie ici s'affiche quand meme, sous son identifiant technique. */
  const FORM_LABELS = {
    devis: "Demande de devis",
  };
  const formLabel = (name) => FORM_LABELS[name] || name;

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const fmtDuration = (seconds) => {
    if (!seconds || seconds <= 0) return "—";
    if (seconds < 60) return `${Math.round(seconds)} s`;
    return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
  };

  const dayKey = (iso) => iso.slice(0, 10);

  const renderChart = (rows) => {
    const counts = new Map();
    rows.forEach((r) => {
      const k = dayKey(r.created_at);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const days = Array.from(counts.keys()).sort();

    if (!days.length) {
      chartEl.innerHTML = '<p class="bo-state">Aucune donnée sur cette période.</p>';
      return;
    }

    const max = Math.max(...days.map((d) => counts.get(d)));
    const w = 40;
    const gap = 8;
    const svgWidth = days.length * (w + gap);
    const svgHeight = 160;

    const bars = days
      .map((d, i) => {
        const value = counts.get(d);
        const barHeight = max ? (value / max) * 120 : 0;
        const x = i * (w + gap);
        const y = svgHeight - barHeight - 24;
        const label = new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        });
        return `
          <g>
            <rect x="${x}" y="${y}" width="${w}" height="${barHeight}" rx="3" fill="var(--bo-accent)"></rect>
            <text x="${x + w / 2}" y="${svgHeight - 6}" text-anchor="middle" font-size="10" fill="var(--bo-muted)">${label}</text>
            <text x="${x + w / 2}" y="${y - 4}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--bo-text)">${value}</text>
          </g>`;
      })
      .join("");

    chartEl.innerHTML = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" role="img" aria-label="Vues par jour">${bars}</svg>`;
  };

  const renderTopPages = (rows) => {
    const byPage = new Map();
    rows.forEach((r) => {
      const entry = byPage.get(r.page_path) || { views: 0, durationSum: 0, durationCount: 0 };
      entry.views += 1;
      if (r.duration_seconds != null) {
        entry.durationSum += r.duration_seconds;
        entry.durationCount += 1;
      }
      byPage.set(r.page_path, entry);
    });

    const sorted = Array.from(byPage.entries()).sort((a, b) => b[1].views - a[1].views);

    if (!sorted.length) {
      topPagesBody.innerHTML = '<tr><td colspan="3">Aucune donnée sur cette période.</td></tr>';
      return;
    }

    topPagesBody.innerHTML = sorted
      .slice(0, 20)
      .map(
        ([page, entry]) => `
        <tr>
          <td>${esc(page)}</td>
          <td>${entry.views}</td>
          <td>${fmtDuration(entry.durationCount ? entry.durationSum / entry.durationCount : null)}</td>
        </tr>`
      )
      .join("");
  };

  const renderStats = (rows) => {
    statViews.textContent = rows.length;
    statPages.textContent = new Set(rows.map((r) => r.page_path)).size;

    const withDuration = rows.filter((r) => r.duration_seconds != null);
    const avgDuration = withDuration.length
      ? withDuration.reduce((sum, r) => sum + r.duration_seconds, 0) / withDuration.length
      : null;
    statDuration.textContent = fmtDuration(avgDuration);
  };

  const emptyFunnel = () => ({ open: 0, start: 0, submit: 0 });
  const deriveFunnel = (counts) => ({
    open: counts.open,
    bounce: Math.max(counts.open - counts.start, 0),
    abandon: Math.max(counts.start - counts.submit, 0),
    submit: counts.submit,
  });

  const renderFunnel = (rows) => {
    const byForm = new Map();
    rows.forEach((r) => {
      if (!byForm.has(r.form_name)) byForm.set(r.form_name, { total: emptyFunnel(), byPage: new Map() });
      const group = byForm.get(r.form_name);

      if (group.total[r.event_type] !== undefined) group.total[r.event_type] += 1;

      const page = r.page_path || "—";
      const pageCounts = group.byPage.get(page) || emptyFunnel();
      if (pageCounts[r.event_type] !== undefined) pageCounts[r.event_type] += 1;
      group.byPage.set(page, pageCounts);
    });

    if (!byForm.size) {
      formsFunnelsEl.innerHTML = '<p class="bo-state">Aucun formulaire suivi sur cette période.</p>';
      return;
    }

    const pct = (n, base) => (base ? `${Math.round((n / base) * 100)}% des ouvertures` : "");

    const forms = Array.from(byForm.entries()).sort((a, b) =>
      formLabel(a[0]).localeCompare(formLabel(b[0]))
    );

    formsFunnelsEl.innerHTML = forms
      .map(([formName, group]) => {
        const f = deriveFunnel(group.total);

        const pageRows = Array.from(group.byPage.entries())
          .map(([page, counts]) => [page, deriveFunnel(counts)])
          .sort((a, b) => b[1].open - a[1].open);

        const pageRowsHtml = pageRows
          .map(
            ([page, pf]) => `
            <tr>
              <td>${esc(page)}</td>
              <td>${pf.open}</td>
              <td>${pf.bounce}</td>
              <td>${pf.abandon}</td>
              <td>${pf.submit}</td>
            </tr>`
          )
          .join("");

        return `
          <div class="bo-form-group">
            <h3>${esc(formLabel(formName))}</h3>
            <div class="bo-funnel">
              <div class="bo-funnel-step">
                <p class="bo-funnel-value">${f.open}</p>
                <p class="bo-funnel-label">Ouvertures</p>
              </div>
              <div class="bo-funnel-step">
                <p class="bo-funnel-value">${f.bounce}</p>
                <p class="bo-funnel-label">Rebond <span class="bo-funnel-hint">ouvert, rien rempli</span></p>
                <p class="bo-funnel-pct">${pct(f.bounce, f.open)}</p>
              </div>
              <div class="bo-funnel-step">
                <p class="bo-funnel-value">${f.abandon}</p>
                <p class="bo-funnel-label">Abandon <span class="bo-funnel-hint">rempli, non envoyé</span></p>
                <p class="bo-funnel-pct">${pct(f.abandon, f.open)}</p>
              </div>
              <div class="bo-funnel-step bo-funnel-step-success">
                <p class="bo-funnel-value">${f.submit}</p>
                <p class="bo-funnel-label">Finalisés</p>
                <p class="bo-funnel-pct">${pct(f.submit, f.open)}</p>
              </div>
            </div>

            <table class="bo-table bo-form-page-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Ouvertures</th>
                  <th>Rebond</th>
                  <th>Abandon</th>
                  <th>Finalisés</th>
                </tr>
              </thead>
              <tbody>${pageRowsHtml}</tbody>
            </table>
          </div>`;
      })
      .join("");
  };

  const sinceIso = () => {
    const days = Number(periodSelect.value);
    return days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;
  };

  const loadStats = async () => {
    stateEl.textContent = "Chargement…";
    const since = sinceIso();

    let viewsQuery = client.from("page_views").select("page_path, created_at, duration_seconds");
    if (since) viewsQuery = viewsQuery.gte("created_at", since);

    let formsQuery = client.from("form_events").select("form_name, event_type, page_path, created_at");
    if (since) formsQuery = formsQuery.gte("created_at", since);

    const [viewsResult, formsResult] = await Promise.all([
      viewsQuery.order("created_at", { ascending: true }),
      formsQuery,
    ]);

    if (viewsResult.error) {
      stateEl.textContent = "Erreur lors du chargement des statistiques : " + viewsResult.error.message;
      return;
    }

    const rows = viewsResult.data || [];
    stateEl.textContent = `${rows.length} vue${rows.length > 1 ? "s" : ""} sur la période sélectionnée`;
    renderStats(rows);
    renderChart(rows);
    renderTopPages(rows);

    if (!formsResult.error) renderFunnel(formsResult.data || []);
  };

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      await client.auth.signOut();
    } finally {
      window.location.replace("/bo/index.html");
    }
  });
  refreshBtn.addEventListener("click", loadStats);
  periodSelect.addEventListener("change", loadStats);

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
    loadStats();
  })();
})();
