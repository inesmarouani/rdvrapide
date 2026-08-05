const API = window.API_BASE_URL || "/api";

const PILIERS = ["Problème", "Méthode", "Coulisses", "Recrutement pilote", "Bilan"];
const PLATEFORMES = ["LinkedIn", "Facebook", "Instagram"];
const STATUTS_LEAD = ["Nouveau", "Qualifié", "Contacté", "Converti", "Perdu"];
const STATUT_COLOR = {
  Nouveau: "#8891A0", Qualifié: "#2E5468", Contacté: "#C77B4A",
  Converti: "#4C8067", Perdu: "#B2543F",
};
const TYPES_EVENEMENT = ["Publication", "Prise de contact", "Rappel", "Jalon"];
const PLATFORM_COLOR = { LinkedIn: "#2E5468", Facebook: "#4C6EA8", Instagram: "#C77B4A" };

let state = { tab: "dashboard", posts: [], leads: [], events: [], openLeadId: null, pricing: null };

// ---------------------------------------------------------------------------
// Authentification — mot de passe partagé, jeton stocké en local
// ---------------------------------------------------------------------------
const TOKEN_KEY = "rdvrapide_token";
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function login(password) {
  const res = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur de connexion" }));
    throw new Error(err.detail || "Mot de passe incorrect");
  }
  const data = await res.json();
  setToken(data.token);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (res.status === 401) {
    clearToken();
    renderLogin("Ta session a expiré — reconnecte-toi.");
    throw new Error("Session expirée");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Erreur API");
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadAll() {
  const [posts, leads, events, pricing] = await Promise.all([
    api("/posts"), api("/leads"), api("/events"), api("/pricing"),
  ]);
  state.posts = posts; state.leads = leads; state.events = events; state.pricing = pricing;
}

// ---------------------------------------------------------------------------
// Écran de connexion
// ---------------------------------------------------------------------------
function renderLogin(errorMsg) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="wrap" style="max-width:380px;padding-top:80px;">
      <div class="eyebrow">RdvRapide</div>
      <h1 style="margin-bottom:18px;">Connexion</h1>
      <div class="card">
        <div class="field">Mot de passe<input type="password" id="login-password" autofocus /></div>
        ${errorMsg ? `<div class="muted" style="color:var(--bad);margin-top:8px;">${esc(errorMsg)}</div>` : ""}
        <button class="btn" id="btn-login" style="margin-top:12px;width:100%;justify-content:center;">Se connecter</button>
      </div>
    </div>
  `;
  const submit = async () => {
    const pwd = document.getElementById("login-password").value;
    if (!pwd) return;
    try {
      await login(pwd);
      await boot();
    } catch (e) {
      renderLogin(e.message);
    }
  };
  document.getElementById("btn-login").addEventListener("click", submit);
  document.getElementById("login-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

// ---------------------------------------------------------------------------
// Render root
// ---------------------------------------------------------------------------
async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="wrap">
      <div class="eyebrow">RdvRapide</div>
      <h1>Pilotage communication &amp; CRM</h1>
      <div class="tabs">
        ${tabButton("dashboard", "Tableau de bord")}
        ${tabButton("posts", "Posts")}
        ${tabButton("leads", "Leads (CRM)")}
        ${tabButton("events", "Événements")}
        ${tabButton("pricing", "Tarification")}
      </div>
      <div id="tab-content"></div>
    </div>
  `;
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => { state.tab = btn.dataset.tab; render(); });
  });
  renderTabContent();
}

function tabButton(id, label) {
  return `<button class="tab ${state.tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
}

function renderTabContent() {
  const el = document.getElementById("tab-content");
  if (state.tab === "dashboard") el.innerHTML = renderDashboard();
  if (state.tab === "posts") el.innerHTML = renderPosts();
  if (state.tab === "leads") el.innerHTML = renderLeads();
  if (state.tab === "events") el.innerHTML = renderEvents();
  if (state.tab === "pricing") el.innerHTML = renderPricing();
  bindTabEvents();
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function engagementByPillar() {
  const map = {};
  PILIERS.forEach((p) => (map[p] = { pilier: p, posts: 0, sum: 0 }));
  state.posts.forEach((p) => {
    if (!map[p.pilier]) map[p.pilier] = { pilier: p.pilier, posts: 0, sum: 0 };
    map[p.pilier].posts += 1;
    map[p.pilier].sum += p.taux_engagement;
  });
  return Object.values(map).map((m) => ({
    pilier: m.pilier, posts: m.posts, engagement: m.posts ? Number((m.sum / m.posts).toFixed(1)) : 0,
  }));
}

function renderDashboard() {
  const posts = state.posts, leads = state.leads;
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
  const avgRate = posts.length ? posts.reduce((s, p) => s + p.taux_engagement, 0) / posts.length : 0;
  const convertis = leads.filter((l) => l.statut === "Converti").length;
  const tauxConv = leads.length ? ((convertis / leads.length) * 100).toFixed(0) : 0;

  const byPillar = engagementByPillar();
  const withPosts = byPillar.filter((p) => p.posts > 0);
  const best = [...withPosts].sort((a, b) => b.engagement - a.engagement)[0];
  const worst = [...withPosts].sort((a, b) => a.engagement - b.engagement)[0];
  const maxEng = Math.max(1, ...byPillar.map((p) => p.engagement));

  return `
    <div class="kpis">
      ${kpiCard("Posts publiés", posts.length)}
      ${kpiCard("Impressions cumulées", totalImpressions.toLocaleString("fr-FR"))}
      ${kpiCard("Engagement moyen", avgRate.toFixed(1) + "%", null, avgRate >= 2 ? "good" : "bad")}
      ${kpiCard("Leads", leads.length)}
      ${kpiCard("Taux de conversion", tauxConv + "%", convertis + " converti(s)", convertis > 0 ? "good" : "")}
    </div>

    <div class="card">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;">Engagement moyen par pilier de contenu</h2>
      <div class="bar-chart">
        ${byPillar.map((p) => `
          <div class="bar-col">
            <div class="bar-value">${p.posts ? p.engagement + "%" : "—"}</div>
            <div class="bar ${best && p.pilier === best.pilier ? "best" : ""}" style="height:${p.posts ? Math.max(6, (p.engagement / maxEng) * 130) : 4}px;"></div>
            <div class="bar-label">${esc(p.pilier)}<br/>(${p.posts})</div>
          </div>
        `).join("")}
      </div>
      ${best && worst && best.pilier !== worst.pilier ? `
        <div class="muted" style="margin-top:8px;">
          <strong style="color:var(--good)">${esc(best.pilier)}</strong> performe le mieux (${best.engagement}%) —
          <strong style="color:var(--bad)">${esc(worst.pilier)}</strong> le moins bien (${worst.engagement}%).
        </div>` : ""}
    </div>

    <div class="card">
      <div class="top-actions" style="margin-bottom:0;">
        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;">✨ Recommandation stratégique</h2>
        <button class="btn accent" id="btn-analyze">Analyser avec Claude</button>
      </div>
      <div id="ai-result" style="margin-top:10px;"></div>
    </div>
  `;
}

function kpiCard(label, value, sub, tone) {
  return `
    <div class="kpi">
      <div class="kpi-label">${esc(label)}</div>
      <div class="kpi-value ${tone || ""}">${value}</div>
      ${sub ? `<div class="kpi-sub">${esc(sub)}</div>` : ""}
    </div>
  `;
}

async function handleAnalyze() {
  const btn = document.getElementById("btn-analyze");
  const out = document.getElementById("ai-result");
  btn.disabled = true;
  btn.innerHTML = `<span class="spin">↻</span> Analyse en cours...`;
  out.innerHTML = "";
  try {
    const data = await api("/analyze", { method: "POST" });
    out.innerHTML = `<div class="ai-box">${esc(data.recommandation)}</div>`;
  } catch (e) {
    out.innerHTML = `<div class="muted" style="color:var(--bad);">${esc(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Analyser avec Claude";
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
let showPostForm = false;

function renderPosts() {
  const sorted = [...state.posts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const avgRate = state.posts.length ? state.posts.reduce((s, p) => s + p.taux_engagement, 0) / state.posts.length : 0;

  return `
    <div class="top-actions">
      <div class="info-note">ℹ️ Saisis les stats depuis LinkedIn/Meta — pas d'import automatique (restriction API des plateformes).</div>
      <button class="btn" id="btn-toggle-post-form">+ Ajouter un post</button>
    </div>
    ${showPostForm ? postForm() : ""}
    <div class="muted" style="margin-bottom:8px;">${state.posts.length} post(s) — engagement moyen : ${avgRate.toFixed(1)}%</div>
    ${sorted.length === 0 ? `<div class="empty">Aucun post enregistré.</div>` : sorted.map(postCard).join("")}
  `;
}

function postForm() {
  return `
    <div class="card">
      <div class="row">
        <div class="field">Date<input type="date" id="p-date" value="${todayISO()}" /></div>
        <div class="field">Plateforme
          <select id="p-plateforme">${PLATEFORMES.map((p) => `<option>${p}</option>`).join("")}</select>
        </div>
        <div class="field">Pilier
          <select id="p-pilier">${PILIERS.map((p) => `<option>${p}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field">Résumé du post<textarea id="p-contenu" placeholder="Ex : Pourquoi on démarre avec des téléopératrices humaines..."></textarea></div>
      <div class="row" style="margin-top:10px;">
        <div class="field">Impressions<input type="number" id="p-impressions" value="0" /></div>
        <div class="field">Likes<input type="number" id="p-likes" value="0" /></div>
        <div class="field">Commentaires<input type="number" id="p-commentaires" value="0" /></div>
        <div class="field">Partages<input type="number" id="p-partages" value="0" /></div>
      </div>
      <div class="row" style="margin-top:8px;">
        <button class="btn" id="btn-save-post">Enregistrer</button>
        <button class="btn ghost" id="btn-cancel-post">Annuler</button>
      </div>
    </div>
  `;
}

function postCard(p) {
  const rate = p.taux_engagement;
  return `
    <div class="card">
      <div class="list-item">
        <div style="flex:1;min-width:0;">
          <div style="margin-bottom:5px;">
            <span class="pill" style="background:${PLATFORM_COLOR[p.plateforme]}1A;color:${PLATFORM_COLOR[p.plateforme]}">${esc(p.plateforme)}</span>
            <span class="pill">${esc(p.pilier)}</span>
            <span class="muted">${p.date}</span>
          </div>
          <div style="font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.contenu)}</div>
          <div class="muted" style="margin-top:4px;">${p.impressions || 0} impr. · ${p.likes || 0} likes · ${p.commentaires || 0} comm. · ${p.partages || 0} partages</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="text-align:right;">
            <div style="font-size:15px;font-weight:700;color:${rate >= 2 ? "var(--good)" : "var(--bad)"};">${rate.toFixed(1)}%</div>
            <div class="muted" style="font-size:10.5px;">engagement</div>
          </div>
          <button class="btn icon" data-delete-post="${p.id}">🗑</button>
        </div>
      </div>
    </div>
  `;
}

async function savePost() {
  const body = {
    date: document.getElementById("p-date").value,
    plateforme: document.getElementById("p-plateforme").value,
    pilier: document.getElementById("p-pilier").value,
    contenu: document.getElementById("p-contenu").value,
    impressions: Number(document.getElementById("p-impressions").value) || 0,
    likes: Number(document.getElementById("p-likes").value) || 0,
    commentaires: Number(document.getElementById("p-commentaires").value) || 0,
    partages: Number(document.getElementById("p-partages").value) || 0,
  };
  if (!body.contenu.trim()) return;
  await api("/posts", { method: "POST", body: JSON.stringify(body) });
  showPostForm = false;
  await loadAll();
  renderTabContent();
}

// ---------------------------------------------------------------------------
// Leads (CRM)
// ---------------------------------------------------------------------------
let showLeadForm = false;

function renderLeads() {
  const leads = state.leads;
  const stageOrder = ["Nouveau", "Qualifié", "Contacté", "Converti"];
  const cumulative = stageOrder.map((stage, idx) => ({
    name: stage, value: leads.filter((l) => stageOrder.indexOf(l.statut) >= idx).length,
  }));
  const maxVal = Math.max(1, ...cumulative.map((c) => c.value));

  const openLead = state.openLeadId ? leads.find((l) => l.id === state.openLeadId) : null;

  return `
    <div class="top-actions">
      <div class="muted">${leads.length} candidature(s) au total</div>
      <button class="btn" id="btn-toggle-lead-form">+ Ajouter un lead</button>
    </div>

    ${leads.length > 0 ? `
    <div class="card">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;">Entonnoir de conversion</h2>
      <div class="funnel" style="margin-top:8px;">
        ${cumulative.map((c) => `
          <div class="funnel-row">
            <div class="funnel-name">${esc(c.name)}</div>
            <div class="funnel-bar" style="width:${Math.max(8, (c.value / maxVal) * 100)}%;background:${STATUT_COLOR[c.name]}">${c.value}</div>
          </div>
        `).join("")}
      </div>
    </div>` : ""}

    ${showLeadForm ? leadForm() : ""}

    ${leads.length === 0 ? `<div class="empty">Aucun lead enregistré pour le moment.</div>` :
      leads.map((l) => leadCard(l)).join("")}

    ${openLead ? leadDetailModal(openLead) : ""}
  `;
}

function leadForm() {
  const postOptions = state.posts.map((p) => `<option value="${p.id}">${p.date} · ${p.plateforme} · ${esc(p.contenu.slice(0, 40))}</option>`).join("");
  return `
    <div class="card">
      <div class="row">
        <div class="field">Cabinet<input id="l-cabinet" /></div>
        <div class="field">Contact<input id="l-contact" /></div>
        <div class="field">Statut<select id="l-statut">${STATUTS_LEAD.map((s) => `<option>${s}</option>`).join("")}</select></div>
      </div>
      <div class="row">
        <div class="field">Email<input id="l-email" /></div>
        <div class="field">Téléphone<input id="l-telephone" /></div>
        <div class="field">Ville<input id="l-ville" /></div>
      </div>
      <div class="row">
        <div class="field">Volume d'appels/semaine (estimé)<input id="l-volume" /></div>
        <div class="field">Post source (optionnel)<select id="l-source"><option value="">— aucun —</option>${postOptions}</select></div>
      </div>
      <div class="row" style="margin-top:8px;">
        <button class="btn" id="btn-save-lead">Enregistrer</button>
        <button class="btn ghost" id="btn-cancel-lead">Annuler</button>
      </div>
    </div>
  `;
}

function leadCard(l) {
  const source = state.posts.find((p) => p.id === l.source_post_id);
  const prochaine = (l.relances || []).filter((r) => !r.fait).sort((a, b) => (a.date_prevue < b.date_prevue ? -1 : 1))[0];
  return `
    <div class="card" style="cursor:pointer;" data-open-lead="${l.id}">
      <div class="list-item">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;">${esc(l.cabinet)}</div>
          <div class="muted">${esc(l.contact)}${l.email ? " · " + esc(l.email) : ""}${l.telephone ? " · " + esc(l.telephone) : ""}${l.ville ? " · " + esc(l.ville) : ""}</div>
          ${source ? `<div class="muted" style="font-size:11.5px;margin-top:3px;">Source : ${esc(source.plateforme)} — ${esc(source.contenu.slice(0, 50))}...</div>` : ""}
          ${prochaine ? `<div class="muted" style="font-size:11.5px;margin-top:3px;">📌 Prochaine relance : ${prochaine.date_prevue} — ${esc(prochaine.titre)}</div>` : ""}
        </div>
        <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation();">
          <select class="statut-select" data-statut-lead="${l.id}" style="color:${STATUT_COLOR[l.statut]};border-color:${STATUT_COLOR[l.statut]};">
            ${STATUTS_LEAD.map((s) => `<option ${s === l.statut ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <button class="btn icon" data-delete-lead="${l.id}">🗑</button>
        </div>
      </div>
    </div>
  `;
}

function leadDetailModal(l) {
  return `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h2>${esc(l.cabinet)}</h2>
          <button class="btn icon" id="btn-close-modal">✕</button>
        </div>
        <div class="lead-detail">
          <div class="muted">${esc(l.contact)} ${l.email ? "· " + esc(l.email) : ""} ${l.telephone ? "· " + esc(l.telephone) : ""}</div>

          <div>
            <h2 style="font-size:12.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;margin-bottom:6px;">Historique d'échanges</h2>
            ${(l.notes || []).length === 0 ? `<div class="muted">Aucun échange enregistré.</div>` :
              l.notes.map((n) => `<div class="note-item"><strong>${new Date(n.created_at).toLocaleString("fr-FR")}</strong><br/>${esc(n.contenu)}</div>`).join("")}
            <div class="row" style="margin-top:8px;">
              <input id="new-note" placeholder="Ajouter une note de contact..." style="flex:1;" />
              <button class="btn ghost" id="btn-add-note">Ajouter</button>
            </div>
          </div>

          <div>
            <h2 style="font-size:12.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;margin-bottom:6px;">Relances programmées</h2>
            ${(l.relances || []).length === 0 ? `<div class="muted">Aucune relance programmée.</div>` :
              l.relances.map((r) => `
                <div class="relance-item ${r.fait ? "fait" : ""}">
                  <label style="cursor:pointer;">
                    <input type="checkbox" ${r.fait ? "checked" : ""} data-toggle-relance="${r.id}" />
                    ${r.date_prevue} — ${esc(r.titre)}
                  </label>
                </div>`).join("")}
            <div class="row" style="margin-top:8px;">
              <input type="date" id="new-relance-date" value="${todayISO()}" style="max-width:150px;" />
              <input id="new-relance-titre" placeholder="Ex : Rappeler pour proposer une date" style="flex:1;" />
              <button class="btn ghost" id="btn-add-relance">Programmer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function saveLead() {
  const body = {
    cabinet: document.getElementById("l-cabinet").value,
    contact: document.getElementById("l-contact").value,
    email: document.getElementById("l-email").value,
    telephone: document.getElementById("l-telephone").value,
    statut: document.getElementById("l-statut").value,
    ville: document.getElementById("l-ville").value,
    volume_appels_semaine: document.getElementById("l-volume").value,
    source_post_id: document.getElementById("l-source").value || null,
  };
  if (!body.cabinet.trim()) return;
  await api("/leads", { method: "POST", body: JSON.stringify(body) });
  showLeadForm = false;
  await loadAll();
  renderTabContent();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
let showEventForm = false;

function renderEvents() {
  const sorted = [...state.events].sort((a, b) => (a.date < b.date ? 1 : -1));
  return `
    <div class="top-actions" style="justify-content:flex-end;">
      <button class="btn" id="btn-toggle-event-form">+ Ajouter un événement</button>
    </div>
    ${showEventForm ? eventForm() : ""}
    <div class="timeline">
      ${sorted.length === 0 ? `<div class="empty">Aucun événement enregistré.</div>` :
        sorted.map((ev, i) => `
          <div class="timeline-item">
            <div class="timeline-dot"><div class="dot"></div>${i < sorted.length - 1 ? `<div class="line"></div>` : ""}</div>
            <div class="card" style="flex:1;margin-bottom:0;">
              <div class="list-item">
                <div>
                  <span class="pill">${esc(ev.type)}</span> <span class="muted">${ev.date}</span>
                  <div style="font-weight:600;font-size:13.5px;margin-top:3px;">${esc(ev.titre)}</div>
                  ${ev.notes ? `<div class="muted" style="margin-top:3px;">${esc(ev.notes)}</div>` : ""}
                </div>
                <button class="btn icon" data-delete-event="${ev.id}">🗑</button>
              </div>
            </div>
          </div>
        `).join("")}
    </div>
  `;
}

function eventForm() {
  return `
    <div class="card">
      <div class="row">
        <div class="field">Date<input type="date" id="e-date" value="${todayISO()}" /></div>
        <div class="field">Type<select id="e-type">${TYPES_EVENEMENT.map((t) => `<option>${t}</option>`).join("")}</select></div>
      </div>
      <div class="field">Titre<input id="e-titre" placeholder="Ex : Appel de qualification — Cabinet Dr Martin" /></div>
      <div class="field" style="margin-top:8px;">Notes<textarea id="e-notes"></textarea></div>
      <div class="row" style="margin-top:8px;">
        <button class="btn" id="btn-save-event">Enregistrer</button>
        <button class="btn ghost" id="btn-cancel-event">Annuler</button>
      </div>
    </div>
  `;
}

async function saveEvent() {
  const body = {
    date: document.getElementById("e-date").value,
    type: document.getElementById("e-type").value,
    titre: document.getElementById("e-titre").value,
    notes: document.getElementById("e-notes").value,
  };
  if (!body.titre.trim()) return;
  await api("/events", { method: "POST", body: JSON.stringify(body) });
  showEventForm = false;
  await loadAll();
  renderTabContent();
}

// ---------------------------------------------------------------------------
// Tarification
// ---------------------------------------------------------------------------
let pricingDirty = false;

function pricingCoutParAgenda(params) {
  const max = params.capaciteMin ? params.forfaitTeleoperatrice / params.capaciteMin : 0; // pire cas
  const min = params.capaciteMax ? params.forfaitTeleoperatrice / params.capaciteMax : 0; // meilleur cas
  return { min, max };
}

function renderPricing() {
  const p = state.pricing;
  if (!p) return `<div class="empty">Chargement du scénario de tarification...</div>`;
  const { params, tiers, nb_cabinets_par_tier: nb } = p;
  const { min: coutMin, max: coutMax } = pricingCoutParAgenda(params);

  const tierRows = tiers.map((t) => {
    const coutPrudent = coutMax * t.poids;
    const coutOptimiste = coutMin * t.poids;
    const margePleinPrudent = t.prix - coutPrudent;
    const margePleinPrudentPct = t.prix ? (margePleinPrudent / t.prix) * 100 : 0;
    const prixPilote = t.prix * (1 - params.remisePilote / 100);
    const margePilotePrudent = prixPilote - coutPrudent;
    const margePilotePrudentPct = prixPilote ? (margePilotePrudent / prixPilote) * 100 : 0;
    const margeOk = margePilotePrudentPct >= 0;
    return `
      <div class="card" data-tier-id="${t.id}">
        <div class="row">
          <div class="field">Nom<input data-tier-field="nom" value="${esc(t.nom)}" /></div>
          <div class="field">Poids (équiv. agenda)<input type="number" step="0.1" data-tier-field="poids" value="${t.poids}" /></div>
          <div class="field">Prix plein tarif (€/mois)<input type="number" data-tier-field="prix" value="${t.prix}" /></div>
          <div class="field">Cabinets simulés<input type="number" data-tier-nb value="${nb[t.id] || 0}" /></div>
          <button class="btn icon" data-remove-tier="${t.id}">🗑</button>
        </div>
        <div class="row" style="font-size:12.5px;padding-top:8px;border-top:1px dashed var(--border);">
          <div>Coût (prudent→optimiste) : <strong>${coutPrudent.toFixed(0)} € → ${coutOptimiste.toFixed(0)} €</strong></div>
          <div>Marge plein tarif : <strong style="color:${margePleinPrudent >= 0 ? "var(--good)" : "var(--bad)"}">${margePleinPrudent.toFixed(0)} € (${margePleinPrudentPct.toFixed(0)}%)</strong></div>
          <div>Tarif pilote (-${params.remisePilote}%) : <strong>${prixPilote.toFixed(0)} €</strong></div>
          <div>Marge tarif pilote : <strong style="color:${margeOk ? "var(--good)" : "var(--bad)"}">${margePilotePrudent.toFixed(0)} € (${margePilotePrudentPct.toFixed(0)}%)</strong></div>
        </div>
        ${!margeOk ? `<div class="muted" style="color:var(--bad);margin-top:6px;">⚠️ Marge négative au tarif pilote (scénario prudent).</div>` : ""}
      </div>
    `;
  }).join("");

  let totalRevenu = 0, totalCoutPrudent = 0, totalPoids = 0, totalCabinets = 0;
  tiers.forEach((t) => {
    const n = nb[t.id] || 0;
    totalRevenu += t.prix * n;
    totalCoutPrudent += coutMax * t.poids * n;
    totalPoids += t.poids * n;
    totalCabinets += n;
  });
  const margeNette = totalRevenu - totalCoutPrudent - params.chargesFixesMensuelles;
  const margeNettePct = totalRevenu ? (margeNette / totalRevenu) * 100 : 0;
  const etpPrudent = params.capaciteMin ? totalPoids / params.capaciteMin : 0;
  const etpOptimiste = params.capaciteMax ? totalPoids / params.capaciteMax : 0;
  const isEstimeAnnuel = Math.max(0, margeNette) * 12 * (params.tauxIS / 100);

  return `
    <div class="top-actions">
      <div class="info-note">ℹ️ Scénario partagé — sauvegardé en base, visible par toute personne connectée avec le mot de passe.</div>
      <button class="btn" id="btn-save-pricing">💾 Sauvegarder</button>
    </div>

    <div class="card">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;">Coût du sous-traitant téléopératrices</h2>
      <div class="row" style="margin-top:8px;">
        <div class="field">Forfait mensuel / téléopératrice (€, tout compris)<input type="number" id="pr-forfait" value="${params.forfaitTeleoperatrice}" /></div>
        <div class="field">Agendas couverts — min<input type="number" id="pr-capmin" value="${params.capaciteMin}" /></div>
        <div class="field">Agendas couverts — max<input type="number" id="pr-capmax" value="${params.capaciteMax}" /></div>
      </div>
      <div class="muted" style="margin-top:6px;">Coût par agenda : entre ${coutMin.toFixed(0)} € et ${coutMax.toFixed(0)} € selon la capacité réelle.</div>
    </div>

    <div class="card">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;">Charges de structure</h2>
      <div class="row" style="margin-top:8px;">
        <div class="field">Charges fixes mensuelles (€)<input type="number" id="pr-charges" value="${params.chargesFixesMensuelles}" /></div>
        <div class="field">Taux d'IS estimé (%)<input type="number" id="pr-is" value="${params.tauxIS}" /></div>
        <div class="field">Remise cabinets pilotes (%)<input type="number" id="pr-remise" value="${params.remisePilote}" /></div>
      </div>
    </div>

    <div class="top-actions" style="justify-content:space-between;">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;margin:0;">Paliers tarifaires</h2>
      <button class="btn ghost" id="btn-add-tier">+ Ajouter un palier</button>
    </div>
    ${tierRows}

    <div class="card">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink-soft);font-family:inherit;">Vue d'ensemble (${totalCabinets} cabinets simulés)</h2>
      <div class="kpis" style="margin-top:10px;margin-bottom:0;">
        ${kpiCard("Revenu mensuel", totalRevenu.toFixed(0) + " €")}
        ${kpiCard("Coût téléopératrices", totalCoutPrudent.toFixed(0) + " €")}
        ${kpiCard("Marge nette", margeNette.toFixed(0) + " €", margeNettePct.toFixed(0) + "%", margeNette >= 0 ? "good" : "bad")}
        ${kpiCard("ETP nécessaires", etpOptimiste.toFixed(1) + " – " + etpPrudent.toFixed(1))}
      </div>
      <div class="muted" style="margin-top:10px;">IS estimé (indicatif, ${params.tauxIS}% du bénéfice annuel) : <strong>${isEstimeAnnuel.toFixed(0)} €/an</strong></div>
    </div>
  `;
}

function collectPricingFromDOM() {
  const params = {
    forfaitTeleoperatrice: Number(document.getElementById("pr-forfait").value) || 0,
    capaciteMin: Number(document.getElementById("pr-capmin").value) || 1,
    capaciteMax: Number(document.getElementById("pr-capmax").value) || 1,
    chargesFixesMensuelles: Number(document.getElementById("pr-charges").value) || 0,
    tauxIS: Number(document.getElementById("pr-is").value) || 0,
    remisePilote: Number(document.getElementById("pr-remise").value) || 0,
  };
  const tiers = [];
  const nb = {};
  document.querySelectorAll("[data-tier-id]").forEach((card) => {
    const id = card.dataset.tierId;
    const nom = card.querySelector('[data-tier-field="nom"]').value;
    const poids = Number(card.querySelector('[data-tier-field="poids"]').value) || 0;
    const prix = Number(card.querySelector('[data-tier-field="prix"]').value) || 0;
    const cabinets = Number(card.querySelector('[data-tier-nb]').value) || 0;
    tiers.push({ id, nom, poids, prix });
    nb[id] = cabinets;
  });
  return { params, tiers, nb_cabinets_par_tier: nb };
}

async function savePricing() {
  const payload = collectPricingFromDOM();
  const updated = await api("/pricing", { method: "PUT", body: JSON.stringify(payload) });
  state.pricing = updated;
  renderTabContent();
}

function addPricingTier() {
  const payload = collectPricingFromDOM();
  const id = "t" + Math.random().toString(36).slice(2, 7);
  payload.tiers.push({ id, nom: "Nouveau palier", poids: 1, prix: 150 });
  payload.nb_cabinets_par_tier[id] = 0;
  state.pricing = { ...state.pricing, ...payload };
  renderTabContent();
}

function removePricingTier(id) {
  const payload = collectPricingFromDOM();
  payload.tiers = payload.tiers.filter((t) => t.id !== id);
  delete payload.nb_cabinets_par_tier[id];
  state.pricing = { ...state.pricing, ...payload };
  renderTabContent();
}

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------
function bindTabEvents() {
  const el = document.getElementById("tab-content");

  // Dashboard
  el.querySelector("#btn-analyze")?.addEventListener("click", handleAnalyze);

  // Posts
  el.querySelector("#btn-toggle-post-form")?.addEventListener("click", () => { showPostForm = !showPostForm; renderTabContent(); });
  el.querySelector("#btn-cancel-post")?.addEventListener("click", () => { showPostForm = false; renderTabContent(); });
  el.querySelector("#btn-save-post")?.addEventListener("click", savePost);
  el.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/posts/${btn.dataset.deletePost}`, { method: "DELETE" });
      await loadAll(); renderTabContent();
    });
  });

  // Leads
  el.querySelector("#btn-toggle-lead-form")?.addEventListener("click", () => { showLeadForm = !showLeadForm; renderTabContent(); });
  el.querySelector("#btn-cancel-lead")?.addEventListener("click", () => { showLeadForm = false; renderTabContent(); });
  el.querySelector("#btn-save-lead")?.addEventListener("click", saveLead);
  el.querySelectorAll("[data-delete-lead]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await api(`/leads/${btn.dataset.deleteLead}`, { method: "DELETE" });
      await loadAll(); renderTabContent();
    });
  });
  el.querySelectorAll("[data-statut-lead]").forEach((sel) => {
    sel.addEventListener("click", (e) => e.stopPropagation());
    sel.addEventListener("change", async () => {
      await api(`/leads/${sel.dataset.statutLead}`, { method: "PATCH", body: JSON.stringify({ statut: sel.value }) });
      await loadAll(); renderTabContent();
    });
  });
  el.querySelectorAll("[data-open-lead]").forEach((card) => {
    card.addEventListener("click", () => { state.openLeadId = card.dataset.openLead; renderTabContent(); });
  });

  // Lead modal
  el.querySelector("#btn-close-modal")?.addEventListener("click", () => { state.openLeadId = null; renderTabContent(); });
  el.querySelector("#modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") { state.openLeadId = null; renderTabContent(); }
  });
  el.querySelector("#btn-add-note")?.addEventListener("click", async () => {
    const input = document.getElementById("new-note");
    if (!input.value.trim()) return;
    await api(`/leads/${state.openLeadId}/notes`, { method: "POST", body: JSON.stringify({ contenu: input.value }) });
    await loadAll(); renderTabContent();
  });
  el.querySelector("#btn-add-relance")?.addEventListener("click", async () => {
    const titre = document.getElementById("new-relance-titre");
    const date = document.getElementById("new-relance-date");
    if (!titre.value.trim()) return;
    await api(`/leads/${state.openLeadId}/relances`, { method: "POST", body: JSON.stringify({ titre: titre.value, date_prevue: date.value }) });
    await loadAll(); renderTabContent();
  });
  el.querySelectorAll("[data-toggle-relance]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      await api(`/relances/${cb.dataset.toggleRelance}/toggle`, { method: "PATCH" });
      await loadAll(); renderTabContent();
    });
  });

  // Pricing
  el.querySelector("#btn-save-pricing")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-save-pricing");
    btn.disabled = true; btn.textContent = "Sauvegarde...";
    try { await savePricing(); } finally { btn.disabled = false; }
  });
  el.querySelector("#btn-add-tier")?.addEventListener("click", addPricingTier);
  el.querySelectorAll("[data-remove-tier]").forEach((btn) => {
    btn.addEventListener("click", () => removePricingTier(btn.dataset.removeTier));
  });

  // Events
  el.querySelector("#btn-toggle-event-form")?.addEventListener("click", () => { showEventForm = !showEventForm; renderTabContent(); });
  el.querySelector("#btn-cancel-event")?.addEventListener("click", () => { showEventForm = false; renderTabContent(); });
  el.querySelector("#btn-save-event")?.addEventListener("click", saveEvent);
  el.querySelectorAll("[data-delete-event]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/events/${btn.dataset.deleteEvent}`, { method: "DELETE" });
      await loadAll(); renderTabContent();
    });
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  if (!getToken()) {
    renderLogin();
    return;
  }
  document.getElementById("app").innerHTML = `<div class="wrap"><div class="empty">Chargement...</div></div>`;
  try {
    await loadAll();
  } catch {
    return; // renderLogin() a déjà été appelé par api() en cas de 401
  }
  render();
}

boot();
