(() => {

let skills = [];
let activeDomain = null;
let activeGraphDiv = null;
let capabilityApiBase = "";

/* =========================
   INIT
========================= */

window.initCapabilityInsights = async function initCapabilityInsights(apiBase) {
  capabilityApiBase = apiBase;

  const res = await fetch(`${apiBase}/analytics/capability-insights-dashboard`);
  if (!res.ok) throw new Error("Failed to load capability insights");

  const data = await res.json();
  skills = data.skills || [];

  buildExplorer();
  buildInventoryTable();
  renderChart();
  bindEvents();
};

window.refreshCapabilityInsights = function () {
  if (activeGraphDiv && window.Plotly) {
    Plotly.Plots.resize(activeGraphDiv);
  }
};

/* =========================
   DOMAIN EXPLORER
========================= */

function getDomains() {
  const map = {};
  skills.forEach(s => {
    if (!map[s.domain_id]) {
      map[s.domain_id] = {
        domain_id: s.domain_id,
        domain: s.domain,
        sort_order: s.domain_sort_order,
        summary: s.domain_summary
      };
    }
  });
  return Object.values(map).sort((a,b)=>a.sort_order-b.sort_order);
}

function buildExplorer() {
  const container = document.getElementById("capability-explorer");
  if (!container) return;

  const domains = getDomains();

  container.innerHTML = domains.map(d => `
    <div class="explorer-domain">
      <button class="explorer-domain-header" data-domain="${d.domain_id}">
        <div class="explorer-domain-title">${d.domain}</div>
        <div class="domain-toggle-indicator">VIEW</div>
      </button>
    </div>
  `).join("");

  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeDomain = parseInt(btn.dataset.domain);
      renderChart();
    });
  });
}

/* =========================
   CHART
========================= */

function renderChart() {
  const el = document.getElementById("capability-chart");
  if (!el) return;

  if (!window.Plotly) {
    el.innerHTML = "<p>Plotly not loaded</p>";
    return;
  }

  const filtered = activeDomain
    ? skills.filter(s => s.domain_id === activeDomain)
    : skills;

  if (!filtered.length) {
    el.innerHTML = "<p>No data</p>";
    return;
  }

  const x = filtered.map(s => s.depth);
  const y = filtered.map(s => s.experience);
  const text = filtered.map(s => s.skill_name);

  const trace = {
    x,
    y,
    text,
    mode: "markers",
    type: "scatter",
    marker: {
      size: 12,
      color: "#0a6ed1",
      opacity: 0.85
    },
    hovertemplate:
      "<b>%{text}</b><br>" +
      "Depth: %{x}<br>" +
      "Experience: %{y}<extra></extra>"
  };

  const layout = {
    margin: { t: 20, r: 20, b: 40, l: 40 },
    xaxis: { title: "Depth (1–4)", range: [0, 5] },
    yaxis: { title: "Experience (0–3)", range: [-0.5, 3.5] },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent"
  };

  Plotly.newPlot(el, [trace], layout, { displayModeBar: false });
  activeGraphDiv = el;
}

/* =========================
   INVENTORY TABLE
========================= */

function buildInventoryTable() {
  const body = document.getElementById("capability-inventory-table-body");
  if (!body) return;

  const sorted = [...skills].sort((a,b)=>{
    if (a.domain_sort_order !== b.domain_sort_order) return a.domain_sort_order - b.domain_sort_order;
    return a.display_order - b.display_order;
  });

  body.innerHTML = sorted.map(s => `
    <tr>
      <td>${s.domain}</td>
      <td>${s.skill_name}</td>
      <td>${s.depth}</td>
      <td>${s.experience}</td>
      <td>${s.confidence}</td>
    </tr>
  `).join("");
}

/* =========================
   MODAL
========================= */

function bindInventoryModal() {
  const openBtn = document.getElementById("capability-inventory-modal-open");
  const modal = document.getElementById("capability-inventory-modal");
  const closeBtn = document.getElementById("capability-inventory-modal-close");
  const backdrop = document.getElementById("capability-inventory-modal-backdrop");

  if (!openBtn || !modal) return;

  openBtn.onclick = () => {
    modal.classList.add("is-visible");
    document.body.classList.add("modal-open");
  };

  function close() {
    modal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
  }

  closeBtn && (closeBtn.onclick = close);
  backdrop && (backdrop.onclick = close);
}

/* =========================
   EVENTS
========================= */

function bindEvents() {
  bindInventoryModal();
}

})();
