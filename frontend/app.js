const PROD_API_BASE = "https://human-data-product-api.onrender.com";

const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://127.0.0.1:8000"
  : PROD_API_BASE;

let capabilityInsightsInitPromise = null;
let capabilityInsightsInitialized = false;
const DEFAULT_SQL_QUERY = `SELECT experience_id, company, role, start_date, end_date, domain
FROM experience
ORDER BY sort_order;`;

const DEFAULT_SQL_OUTPUT_MESSAGE = "Load a predefined query and submit.";
const DEFAULT_API_ENDPOINT = "/summary";
const DEFAULT_API_OUTPUT_MESSAGE = "Execute an endpoint to populate this area.";
const DEFAULT_INSIGHTS_TAB_ID = "visualizations-tab";
const DEFAULT_VALUE_DISTRIBUTION_DIMENSION = "solution_type";

const DISTRIBUTION_DEFINITIONS = {
  solution_type: {
    capability_expansion: "Expands what users or teams can do through new self-service or enablement capabilities.",
    metadata_standardization: "Introduces structure, taxonomy, and governance to improve consistency and trust.",
    workflow_optimization: "Reduces friction in delivery, process flow, or operational execution.",
    experience_enhancement: "Improves usability, clarity, and the experience of consuming product or platform functionality.",
    access_extension: "Extends access to capabilities, data, or functionality across more users or channels.",
    analytical_refinement: "Improves insight quality, reporting utility, or analytical usability.",
    data_modeling: "Strengthens the underlying data model or semantic structure supporting downstream consumption.",
    workflow_automation: "Automates repetitive execution steps to reduce manual dependency."
  },
  problem_type: {
    capability_gap: "A missing capability prevented users from completing work efficiently.",
    metadata_gap: "Inconsistent or missing metadata reduced trust, traceability, or scale.",
    workflow_gap: "A process breakdown or inefficient flow limited delivery or execution.",
    clarity_gap: "Ambiguity made the system or process harder to understand or use.",
    visibility_gap: "Lack of visibility reduced oversight, reporting quality, or actionability.",
    decision_support_gap: "Decision-making lacked the data or framing required for confidence.",
    data_gap: "Underlying data structure or availability limited downstream use."
  },
  system_layer: {
    integration: "Cross-system connectivity, interfaces, or handoffs.",
    governance: "Standards, control, metadata, and structural consistency.",
    UI: "User-facing configuration, workflow, or interaction layer.",
    workflow: "Operational flow, process execution, and delivery mechanics.",
    data: "Underlying data model, structure, or semantic layer."
  },
  impact_type: {
    reliability: "Improves consistency, stability, or trustworthiness of delivery or output.",
    self_service: "Reduces dependency by allowing users to act independently.",
    usability: "Improves ease of use, clarity, or adoption experience.",
    governance: "Improves structure, traceability, or control.",
    decision_support: "Enables better decisions through stronger analytics or framing.",
    interoperability: "Improves compatibility or coordination across systems.",
    interpretability: "Makes information easier to understand and act on.",
    scalability: "Enables broader use, higher volume, or lower-friction growth."
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  bindCatalogNavigation();
  bindSideNavigation();
  bindTabs();
  bindSqlWorkspace();
  bindApiWorkspace();
  bindOutputPorts();
  bindLandingModals();
  bindInsightHelpPopovers();
  initLandingContextRotator();

const loaders = [
    loadMetadata,
    loadOverview,
    loadVisualizations,
    loadContactInfo,
    loadNextOpportunity
  ];

  for (const loader of loaders) {
    try {
      await loader();
    } catch (error) {
      console.error(`Loader failed: ${loader.name}`, error);
    }
  }
});

function bindCatalogNavigation() {
  document.getElementById("open-product-btn")?.addEventListener("click", () => {
    const catalogPage = document.getElementById("catalog-page");
    const productPage = document.getElementById("product-page");
    const overviewPanel = document.getElementById("overview-panel");
    const workspace = document.querySelector(".workspace");

    catalogPage?.classList.add("hidden");
    productPage?.classList.remove("hidden");

    document.querySelectorAll(".workspace-panel").forEach(panel => {
      panel.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.panel === "overview-panel");
    });

    overviewPanel?.classList.add("active");

    /* Force Safari/WebKit to commit layout before scrolling */
    void productPage?.offsetHeight;
    void overviewPanel?.offsetHeight;
    void workspace?.offsetHeight;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);

        const scrollTarget =
          overviewPanel?.querySelector(".panel-header") ||
          overviewPanel ||
          workspace ||
          productPage;

        scrollTarget?.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: "auto"
        });
      });
    });
  });

  document.getElementById("back-to-catalog-btn")?.addEventListener("click", () => {
    const productPage = document.getElementById("product-page");
    const catalogPage = document.getElementById("catalog-page");

    productPage?.classList.add("hidden");
    catalogPage?.classList.remove("hidden");

    void catalogPage?.offsetHeight;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        catalogPage?.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: "auto"
        });
      });
    });
  });
}

const LANDING_CONTEXT_TILES = [
  {
    kicker: "ABOUT ANTHONY",
    title: "Behind the Data",
    summary:
      "Anthony lives in Libertyville, IL, with his fiancée and his two sons. He focuses on turning complex systems into structured, scalable platforms and enjoys solving real problems with technology.",
    chips: ["Father", "Foodie", "Curious Builder"]
  },
  {
    kicker: "TARGET ROLE",
    title: "Opportunity Profile",
    summary:
      "Senior architecture-oriented roles focused on enterprise data platforms, analytics enablement, and data product strategy, with strongest fit in strategic individual contributor environments.",
    chips: ["Data Architect", "Principal", "Remote / Hybrid"]
  }
];

function initLandingContextRotator() {
  const kickerEl = document.getElementById("landing-context-kicker");
  const titleEl = document.getElementById("landing-context-title");
  const summaryEl = document.getElementById("landing-context-summary");
  const chipsEl = document.getElementById("landing-context-chips");
  const prevEl = document.getElementById("landing-context-prev");
  const nextEl = document.getElementById("landing-context-next");

  if (!kickerEl || !titleEl || !summaryEl || !chipsEl || !prevEl || !nextEl) return;

  let activeIndex = 0;

  const renderLandingContextTile = () => {
    const tile = LANDING_CONTEXT_TILES[activeIndex];
    if (!tile) return;

    kickerEl.textContent = tile.kicker;
    titleEl.textContent = tile.title;
    summaryEl.textContent = tile.summary;
    chipsEl.innerHTML = "";

    (tile.chips || []).forEach(chip => {
      const chipEl = document.createElement("span");
      chipEl.className = "tag-chip human-context-chip";
      chipEl.textContent = chip;
      chipsEl.appendChild(chipEl);
    });
  };

  prevEl.addEventListener("click", () => {
    activeIndex = (activeIndex - 1 + LANDING_CONTEXT_TILES.length) % LANDING_CONTEXT_TILES.length;
    renderLandingContextTile();
  });

  nextEl.addEventListener("click", () => {
    activeIndex = (activeIndex + 1) % LANDING_CONTEXT_TILES.length;
    renderLandingContextTile();
  });

  renderLandingContextTile();
}

function bindLandingModals() {
  document.querySelectorAll("[data-modal-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modalTarget;
      document.getElementById(modalId)?.classList.remove("hidden");
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.closeModal;
      document.getElementById(modalId)?.classList.add("hidden");
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.classList.add("hidden");
      }
    });
  });
}

function bindSideNavigation() {
  document.querySelectorAll(".nav-btn[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      openWorkspacePanel(btn.dataset.panel);
    });
  });
}

async function openWorkspacePanel(panelId, tabId = null, options = {}) {
  if (!panelId) return;

  const {
    scrollBehavior = "smooth"
  } = options;

  const currentActivePanelId = document.querySelector(".workspace-panel.active")?.id || null;
  const panelChanged = currentActivePanelId !== panelId;

  const resolvedTabId =
    panelChanged && panelId === "insights-panel"
      ? DEFAULT_INSIGHTS_TAB_ID
      : tabId;

  if (panelChanged) {
    resetWorkspaceState(panelId);
  }

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".workspace-panel").forEach(panel => panel.classList.remove("active"));

  const activePanel = document.getElementById(panelId);
  activePanel?.classList.add("active");

  const matchingNav = Array.from(document.querySelectorAll(".nav-btn"))
    .find(btn => btn.dataset.panel === panelId);

  if (matchingNav) matchingNav.classList.add("active");

  if (resolvedTabId) {
    activateTab(resolvedTabId);
  }

  if (resolvedTabId === "capability-insights-tab") {
    try {
      await ensureCapabilityInsightsInitialized();

      if (typeof window.refreshCapabilityInsights === "function") {
        scheduleCapabilityInsightsRefresh();
      }
    } catch (error) {
      console.error("Capability Insights init failed:", error);
    }
  }

  requestAnimationFrame(() => {
    scrollPanelToTop(activePanel, scrollBehavior);
  });
}

function scrollPanelToTop(panel, behavior = "smooth") {
  if (!panel) return;

  const target = panel.querySelector(".panel-header") || panel;
  const top = window.scrollY + target.getBoundingClientRect().top - 12;

  window.scrollTo({
    top: Math.max(top, 0),
    behavior
  });
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tabId = btn.dataset.tab;

      activateTab(tabId);

      if (tabId === "capability-insights-tab") {
        try {
          await ensureCapabilityInsightsInitialized();

          if (typeof window.refreshCapabilityInsights === "function") {
            scheduleCapabilityInsightsRefresh();
          }
        } catch (error) {
          console.error("Capability Insights init failed:", error);
        }
      }
    });
  });
}

function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  if (tabId === "capability-insights-tab" && typeof window.refreshCapabilityInsights === "function") {
    scheduleCapabilityInsightsRefresh();
  }
}

function scheduleCapabilityInsightsRefresh() {
  const refreshPasses = [0, 90, 220];

  refreshPasses.forEach(delay => {
    window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (typeof window.refreshCapabilityInsights === "function") {
            window.refreshCapabilityInsights();
          }
        });
      });
    }, delay);
  });
}

function bindOutputPorts() {
  document.querySelectorAll(".interactive-port").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetPanel = btn.dataset.panelTarget;
      const targetTab = btn.dataset.tabTarget || null;
      openWorkspacePanel(targetPanel, targetTab);
    });
  });
}

function resetWorkspaceState(panelId) {
  if (panelId === "sql-panel") {
    resetSqlWorkspace();
    return;
  }

  if (panelId === "api-panel") {
    resetApiWorkspace();
    return;
  }

  if (panelId === "insights-panel") {
    resetInsightsWorkspace();
  }
}

function resetSqlWorkspace() {
  const editor = document.getElementById("sql-editor");
  const output = document.getElementById("sql-output");

  if (editor) editor.value = DEFAULT_SQL_QUERY;
  if (output) output.textContent = DEFAULT_SQL_OUTPUT_MESSAGE;
}

function resetApiWorkspace() {
  const input = document.getElementById("api-endpoint-input");
  const output = document.getElementById("api-output");

  if (input) input.value = DEFAULT_API_ENDPOINT;
  if (output) output.textContent = DEFAULT_API_OUTPUT_MESSAGE;
}

function resetInsightsWorkspace() {
  activateTab(DEFAULT_INSIGHTS_TAB_ID);

  document
    .querySelector(`[data-distribution-dimension="${DEFAULT_VALUE_DISTRIBUTION_DIMENSION}"]`)
    ?.click();

  if (typeof window.resetCapabilityInsightsState === "function") {
    window.resetCapabilityInsightsState();
  }
}

function bindSqlWorkspace() {
  const editor = document.getElementById("sql-editor");
  const output = document.getElementById("sql-output");

  if (editor) {
    editor.value = DEFAULT_SQL_QUERY;
  }

  document.querySelectorAll(".sql-template-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const template = btn.dataset.sql || "";
      editor.value = template.trim();
    });
  });

  document.getElementById("run-sql-btn")?.addEventListener("click", async () => {
    const sql = editor.value.trim();

    output.textContent = "Loading...";

    try {
      const data = await postJson("/query/execute", { sql });
      output.textContent = formatSqlResults(data);
    } catch (error) {
      output.textContent =
        "SQL execution failed.\n\n" +
        `Message: ${error.message}\n\n` +
        "Check that:\n" +
        "1. Uvicorn is still running\n" +
        "2. The SQL is read-only (SELECT / WITH only)\n" +
        "3. The query references valid tables / columns\n";
    }
  });

  document.getElementById("clear-sql-btn")?.addEventListener("click", () => {
    if (editor) editor.value = "";
    if (output) output.textContent = DEFAULT_SQL_OUTPUT_MESSAGE;
  });
}

function bindApiWorkspace() {
  document.querySelectorAll(".endpoint-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("api-endpoint-input").value = btn.textContent.trim();
    });
  });

  document.getElementById("call-api-btn")?.addEventListener("click", async () => {
    const endpoint = document.getElementById("api-endpoint-input").value.trim();
    const output = document.getElementById("api-output");

    output.textContent = "Loading...";

    try {
      const data = await fetchJson(endpoint);
      output.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      output.textContent =
        "API call failed.\n\n" +
        `Message: ${error.message}\n\n` +
        "Check that:\n" +
        "1. Uvicorn is still running\n" +
        "2. The API endpoint is valid\n" +
        "3. CORS is enabled in FastAPI\n";
    }
  });
}

function setTextValue(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = value;
}

function setStatusPill(elementId, value, isMuted = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.classList.toggle("muted", isMuted);
  el.innerHTML = `<span class="status-dot"></span>${escapeHtml(String(value))}`;
}

async function loadMetadata() {
  try {
    const metadata = await fetchJson("/product-metadata");

    const getMeta = (key, fallback = "Unavailable") =>
      metadata.find(item => item.meta_key === key)?.meta_value || fallback;

    const version = getMeta("version", "1.0.0");
    const refresh = getMeta("last_pipeline_refresh", "2026-03-05");
    const status = getMeta("status", "ACTIVE");
    const type = getMeta("data_product_type", "Derived");
    const owner = getMeta("owner", "Unknown");

    const versionText = document.getElementById("catalog-version-text");
    if (versionText) versionText.textContent = `Version ${version}`;

    setStatusPill("meta-status", status, false);
    setTextValue("meta-refresh", refresh);
    setTextValue("meta-type", type);
    setTextValue("meta-version", version);
    setTextValue("meta-owner", owner);

    function applyHealthStatus(elementId, value) {
      const normalized = String(value).toLowerCase();
      const isHealthy =
        normalized.includes("pass") ||
        normalized.includes("active") ||
        normalized.includes("operational");

      setStatusPill(elementId, value, !isHealthy);
    }

    applyHealthStatus("health-schema", getMeta("schema_validation", "Pass"));
    applyHealthStatus("health-query", getMeta("query_engine", "Active"));
    applyHealthStatus("health-api", getMeta("api_status", "Operational"));
  } catch (error) {
    console.error("Failed to load metadata:", error);
  }
}
async function loadOverview() {
  const [summary, identity] = await Promise.all([
    fetchJson("/summary"),
    fetchJson("/identity")
  ]);

  document.getElementById("product-owner").textContent = summary.owner || "Unknown Owner";
  document.getElementById("product-specialization").textContent = identity.specialization || "No specialization available";

  const metaOwner = document.getElementById("meta-owner");
  if (metaOwner && metaOwner.textContent === "Loading...") {
    metaOwner.textContent = summary.owner || "Unavailable";
  }

  document.getElementById("meta-experience-count").textContent = summary.experience_count ?? "Unavailable";
  document.getElementById("meta-project-count").textContent = summary.project_count ?? "Unavailable";
  document.getElementById("meta-skill-count").textContent = summary.skill_count ?? "Unavailable";

    const focusList = document.getElementById("focus-area-list");
  if (focusList) {
    focusList.innerHTML = "";

    const focusAreas = identity.core_focus_areas || [];

    if (focusAreas.length === 0) {
      focusList.innerHTML = '<span class="tag-chip">No focus areas available</span>';
    } else {
      focusAreas.forEach(item => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = item;
        focusList.appendChild(chip);
      });
    }
  }
}

async function loadVisualizations() {
  const data = await fetchJson("/analytics/value-insights-dashboard");

  bindValueDistributionToggles(data.distribution_views);
  renderValueDelivery(data.value_delivery);
  renderValueRealization(data.value_realization);
  bindPatternInfoTooltips();
  bindInsightHelpPopovers();
}

async function loadCapabilityInsights() {
  if (typeof window.initCapabilityInsights !== "function") return;
  await window.initCapabilityInsights(API_BASE);
}

async function ensureCapabilityInsightsInitialized() {
  if (capabilityInsightsInitialized) return;

  if (!capabilityInsightsInitPromise) {
    capabilityInsightsInitPromise = loadCapabilityInsights()
      .then(() => {
        capabilityInsightsInitialized = true;
      })
      .catch((error) => {
        capabilityInsightsInitPromise = null;
        throw error;
      });
  }

  await capabilityInsightsInitPromise;
}

function renderTimeline(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const compactRole = role => {
    return (role || "")
      .replace(", Product Success", "")
      .replace("Senior ", "")
      .replace("Client Relationship Consultant / Associate", "Client Relationship Consultant")
      .replace("Independent / Side Projects", "Side Projects");
  };

  const compactCompany = company => {
    if (company === "Capsim Management Simulations") return "CAPSIM";
    if (company === "Personal") return "PERSONAL";
    return company.toUpperCase();
  };

  const formatRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const startText = start.toLocaleString("en-US", { month: "short", year: "numeric" });
    const endText = end
      ? end.toLocaleString("en-US", { month: "short", year: "numeric" })
      : "Present";
    return `${startText} – ${endText}`;
  };

  const toneClassFor = index => {
    if (index <= 1) return "timeline-role-tile--current";
    if (index <= 3) return "timeline-role-tile--recent";
    return "timeline-role-tile--foundation";
  };

  container.innerHTML = `
    <div class="timeline-viz-grid timeline-viz-grid--dense">
      ${(items || []).map((item, index) => `
        <article class="timeline-role-tile timeline-role-tile--dense ${toneClassFor(index)}">
          <div class="timeline-role-meta-row">
            <span class="timeline-role-company">${escapeHtml(compactCompany(item.company))}</span>
            <span class="timeline-role-range">${escapeHtml(formatRange(item.start_date, item.end_date))}</span>
          </div>
          <div class="timeline-role-title">${escapeHtml(compactRole(item.role))}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderSkillPatternMatrix(containerId, summaryId, data) {
  const container = document.getElementById(containerId);
  const summary = document.getElementById(summaryId);
  if (!container || !summary) return;

  const skills = data?.skills || [];
  const pairs = data?.pairs || [];

  if (!skills.length) {
    container.textContent = "No capability pattern data available.";
    summary.innerHTML = "";
    return;
  }

  const maxPairCount = Math.max(...pairs.map(pair => pair.pair_count || 0), 1);
  const pairMap = new Map();

  pairs.forEach(pair => {
    pairMap.set(`${pair.skill_a_id}-${pair.skill_b_id}`, pair.pair_count);
    pairMap.set(`${pair.skill_b_id}-${pair.skill_a_id}`, pair.pair_count);
  });

  const grid = document.createElement("div");
  grid.className = "skill-matrix-grid";

  const corner = document.createElement("div");
  corner.className = "skill-matrix-corner";
  corner.textContent = "Skills";
  grid.appendChild(corner);

  skills.forEach(skill => {
    const col = document.createElement("div");
    col.className = "skill-matrix-axis skill-matrix-axis--column is-hoverable";
    col.innerHTML = formatMatrixAxisLabel(skill.skill_name);
    attachFloatingTooltip(
      col,
      `
        <span class="insights-hover-tooltip-title">${escapeHtml(skill.skill_name)}</span>
        <span class="insights-hover-tooltip-body">${capitalize(skill.category)} · ${capitalize(skill.level)} · ${skill.project_count} linked project${skill.project_count === 1 ? "" : "s"}</span>
      `
    );
    grid.appendChild(col);
  });

  skills.forEach(rowSkill => {
    const rowLabel = document.createElement("div");
    rowLabel.className = "skill-matrix-axis skill-matrix-axis--row is-hoverable";
    rowLabel.innerHTML = formatMatrixAxisLabel(rowSkill.skill_name);
    attachFloatingTooltip(
      rowLabel,
      `
        <span class="insights-hover-tooltip-title">${escapeHtml(rowSkill.skill_name)}</span>
        <span class="insights-hover-tooltip-body">${capitalize(rowSkill.category)} · ${capitalize(rowSkill.level)} · ${rowSkill.project_count} linked project${rowSkill.project_count === 1 ? "" : "s"}</span>
      `
    );
    grid.appendChild(rowLabel);

    skills.forEach(colSkill => {
      const cell = document.createElement("div");
      const sameSkill = rowSkill.skill_id === colSkill.skill_id;

      if (sameSkill) {
        cell.className = "skill-matrix-cell is-empty";
        grid.appendChild(cell);
        return;
      }

      const count = pairMap.get(`${rowSkill.skill_id}-${colSkill.skill_id}`) || 0;
      const normalized = count === 0 ? 0 : Math.ceil((count / maxPairCount) * 5);

      cell.className = `skill-matrix-cell ${count === 0 ? "is-empty" : `level-${normalized} is-hoverable`}`;

      if (count > 0) {
        attachFloatingTooltip(
          cell,
          `
            <span class="insights-hover-tooltip-title">${escapeHtml(rowSkill.skill_name)} + ${escapeHtml(colSkill.skill_name)}</span>
            <span class="insights-hover-tooltip-body">Observed together in ${count} project${count === 1 ? "" : "s"}.</span>
            <span class="insights-hover-tooltip-body">Darker intersections indicate recurring capability pairings across the project dataset.</span>
          `
        );
      }

      grid.appendChild(cell);
    });
  });

  container.innerHTML = "";
  container.appendChild(grid);

  const topPairs = [...pairs]
    .sort((a, b) => (b.pair_count || 0) - (a.pair_count || 0))
    .slice(0, 2)
    .map(pair => {
      const skillA = skills.find(skill => skill.skill_id === pair.skill_a_id)?.skill_name || "Unknown";
      const skillB = skills.find(skill => skill.skill_id === pair.skill_b_id)?.skill_name || "Unknown";
      return `<div class="matrix-summary-item"><strong>${escapeHtml(skillA)} + ${escapeHtml(skillB)}</strong> (${pair.pair_count})</div>`;
    })
    .join("");

  summary.innerHTML = topPairs;
}

function renderProjectPatternBlocks(containerId, projectsByExperience, allProjects) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!projectsByExperience?.length || !allProjects?.length) {
    container.textContent = "No value pattern data available.";
    return;
  }

  const projectsByExpId = new Map();

  allProjects.forEach(project => {
    const key = project.experience_id;
    if (!projectsByExpId.has(key)) projectsByExpId.set(key, []);
    projectsByExpId.get(key).push(project);
  });

  const rows = projectsByExperience
    .filter(item => (item.project_count || 0) > 0)
    .slice(0, 4)
    .map(item => {
      const linkedProjects = projectsByExpId.get(item.experience_id) || [];
      const categories = deriveProjectCategories(linkedProjects);

      if (!categories.length) {
        return `
          <div class="project-pattern-row">
            <div class="project-pattern-role">${escapeHtml(item.role)}</div>
            <div class="project-pattern-meta">${escapeHtml(item.company)} • ${linkedProjects.length} project${linkedProjects.length === 1 ? "" : "s"}</div>
            <div class="project-pattern-empty">No recurring value categories detected.</div>
          </div>
        `;
      }

      const total = categories.reduce((sum, category) => sum + category.count, 0);
      const topCategory = categories[0];
      const supportingCategories = categories.slice(1, 3);

      return `
        <div class="project-pattern-row">
          <div class="project-pattern-role">${escapeHtml(item.role)}</div>
          <div class="project-pattern-meta">${escapeHtml(item.company)} • ${linkedProjects.length} project${linkedProjects.length === 1 ? "" : "s"}</div>

          <div class="project-pattern-bar" aria-hidden="true">
            ${categories.map((category, index) => {
              const pct = Math.max((category.count / total) * 100, 10);
              return `
                <span
                  class="project-pattern-segment segment-${Math.min(index + 1, 4)}"
                  style="width: ${pct}%"
                  title="${escapeHtml(category.label)}: ${category.count}"
                ></span>
              `;
            }).join("")}
          </div>

          <div class="project-pattern-summary">
            <div class="project-pattern-primary">${escapeHtml(topCategory.label)}</div>
            ${supportingCategories.length ? `
              <div class="project-pattern-supporting">
                ${supportingCategories.map(category => escapeHtml(category.label)).join(" • ")}
              </div>
            ` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = rows;
}

function deriveProjectCategories(projects) {
  const categoryRules = [
    {
      label: "Enablement",
      description: "Self-service, adoption, integration, and enablement-oriented work",
      test: project => /enablement|self-service|adoption|integration/i.test(`${project.domain} ${project.name} ${project.value}`)
    },
    {
      label: "Analytics",
      description: "Analytics, reporting, and usage insight work",
      test: project => /analytics|reporting|usage|insight/i.test(`${project.domain} ${project.name} ${project.value}`)
    },
    {
      label: "Architecture",
      description: "Platform, metadata, architecture, and structural design work",
      test: project => /architecture|metadata|platform|data product|governance/i.test(`${project.domain} ${project.name} ${project.value}`)
    },
    {
      label: "Strategy",
      description: "Business case, roadmap, monetization, and strategic framing work",
      test: project => /strategy|roadmap|monetization|business case|decision/i.test(`${project.domain} ${project.name} ${project.value}`)
    },
    {
      label: "Execution",
      description: "Operational delivery, release readiness, and practical execution work",
      test: project => /testing|defect|launch|delivery|execution|readiness/i.test(`${project.domain} ${project.name} ${project.value}`)
    }
  ];

  return categoryRules
    .map(rule => ({
      label: rule.label,
      description: rule.description,
      count: projects.filter(project => rule.test(project)).length
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 4);
}

function renderFeedbackValidation(chartId, items) {
  const chart = document.getElementById(chartId);
  if (!chart) return;

  if (!items || items.length === 0) {
    chart.textContent = "No feedback theme data available.";
    return;
  }

  const segments = items.map(item => ({
    key: item.theme,
    label: titleCase(item.theme),
    value: item.feedback_count || 0
  }));

  const colors = [
  "#0a6ed1",  // primary
  "#1f7fe0",
  "#3a93ea",
  "#5ba6f0",
  "#7cb9f5",
  "#9dcbf8",
  "#bcdcfb",
  "#d6ebfd",
  "#e9f3fe"
];

  chart.innerHTML = buildDonutSvg(
    segments.map((segment, index) => ({
      ...segment,
      color: colors[index % colors.length]
    })),
    segments.length,
    "Themes"
  );

  const svg = chart.querySelector("svg");
  if (!svg) return;

  svg.querySelectorAll("title").forEach(node => node.remove());

  svg.querySelectorAll("[data-segment-index]").forEach(node => {
    const idx = Number(node.getAttribute("data-segment-index"));
    const segment = segments[idx];

    attachFloatingTooltip(
      node,
      `
        <span class="insights-hover-tooltip-title">${escapeHtml(segment.label)}</span>
        <span class="insights-hover-tooltip-body">${segment.value} supporting excerpt${segment.value === 1 ? "" : "s"}</span>
      `
    );

    node.addEventListener("click", async () => {
      try {
        const data = await fetchJson(`/analytics/feedback-theme-details/${encodeURIComponent(segment.key)}`);
        openFeedbackDetailModal(segment.label, data.entries || []);
      } catch (error) {
        console.error("Failed to load feedback theme details:", error);
      }
    });
  });
}

function openFeedbackDetailModal(themeLabel, entries) {
  const modal = document.getElementById("feedback-detail-modal");
  const title = document.getElementById("feedback-detail-modal-title");
  const body = document.getElementById("feedback-detail-modal-body");
  if (!modal || !title || !body) return;

  let expanded = false;

  function renderModalContent() {
    const curatedEntries = entries.slice(0, 3);
    const visibleEntries = expanded ? entries : curatedEntries;

    body.innerHTML = `
      ${visibleEntries.length ? `
        <div class="detail-card-list">
          ${visibleEntries.map(entry => `
            <div class="feedback-quote-card">
              <div class="feedback-source-pill">${escapeHtml(titleCase((entry.source_type || "source").replaceAll("_", " ")))}</div>
              <p>${escapeHtml(entry.quote || "")}</p>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="detail-empty-state">
          <p>No feedback entries found.</p>
        </div>
      `}

      ${entries.length > 3 ? `
        <div class="feedback-preview-actions">
          <button type="button" class="btn-secondary" id="feedback-detail-expand-btn">
            ${expanded ? "Show curated view" : `View all ${entries.length} records`}
          </button>
        </div>
      ` : ""}
    `;

    body.scrollTop = 0;

    body.querySelector("#feedback-detail-expand-btn")?.addEventListener("click", () => {
      expanded = !expanded;
      renderModalContent();
    });
  }

  title.textContent = `${themeLabel} Feedback`;
  renderModalContent();
  modal.classList.remove("hidden");
}

function bindPatternInfoTooltips() {
  document.querySelectorAll(".info-tooltip-wrap").forEach(wrapper => {
    const button = wrapper.querySelector(".pattern-info-btn");
    if (!button) return;

    button.addEventListener("click", event => {
	  event.stopPropagation();
	  hideFloatingInsightsTooltip();
	  const isOpen = wrapper.classList.contains("is-open");
	  document.querySelectorAll(".info-tooltip-wrap.is-open").forEach(node => node.classList.remove("is-open"));
	  if (!isOpen) wrapper.classList.add("is-open");
	});
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".info-tooltip-wrap.is-open").forEach(node => node.classList.remove("is-open"));
    hideFloatingInsightsTooltip();
  });
}

function formatMatrixAxisLabel(skillName) {
  return splitSkillLabel(skillName)
    .map(line => `<span class="skill-matrix-axis-line">${escapeHtml(line)}</span>`)
    .join("");
}

function splitSkillLabel(skillName) {
  const explicit = {
    "Attention to Detail": ["Attention to", "Detail"],
    "Executive Communication": ["Executive", "Communication"],
    "Structured Communication": ["Structured", "Communication"],
    "Cross-Functional Collaboration": ["Cross-Functional", "Collaboration"],
    "Strategic Thinking": ["Strategic", "Thinking"],
    "SQL": ["SQL"]
  };

  if (explicit[skillName]) return explicit[skillName];

  const parts = String(skillName).split(" ");
  if (parts.length <= 2) return [skillName];

  const midpoint = Math.ceil(parts.length / 2);
  return [parts.slice(0, midpoint).join(" "), parts.slice(midpoint).join(" ")];
}
let valueDeliveryFeedbackGroups = [];
let activeInsightsTooltipTrigger = null;
let activeInsightsTooltipBounds = null;
let insightsTooltipDismissBound = false;
const opportunityTreemapState = {
  activeDimension: null
};

function usesClickOnlyInsightsTooltips() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function bindGlobalInsightsTooltipDismiss() {
  if (insightsTooltipDismissBound) return;

  document.addEventListener("click", event => {
    const tooltip = document.getElementById("insights-hover-tooltip");
    if (!tooltip || tooltip.classList.contains("hidden")) return;

    if (activeInsightsTooltipTrigger && activeInsightsTooltipTrigger.contains(event.target)) {
      return;
    }

    hideFloatingInsightsTooltip();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      hideFloatingInsightsTooltip();
    }
  });

  window.addEventListener("resize", () => {
    hideFloatingInsightsTooltip();
  });

  window.addEventListener("scroll", () => {
    if (usesClickOnlyInsightsTooltips()) {
      hideFloatingInsightsTooltip();
    }
  }, true);

  insightsTooltipDismissBound = true;
}

function getInsightsTooltipBounds(element) {
  const boundedSurface =
    element.closest(".insight-surface-card") ||
    element.closest(".insight-observed-card") ||
    element.closest(".card") ||
    element.closest(".tab-panel");

  return boundedSurface?.getBoundingClientRect() || null;
}

function attachFloatingTooltip(element, html) {
  if (!element) return;

  bindGlobalInsightsTooltipDismiss();

  const showFromElement = () => {
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + (rect.width / 2);
    const clientY = rect.top + (rect.height / 2);
    activeInsightsTooltipTrigger = element;
    activeInsightsTooltipBounds = getInsightsTooltipBounds(element);
    showFloatingInsightsTooltip(html, clientX, clientY, activeInsightsTooltipBounds);
  };

  if (!usesClickOnlyInsightsTooltips()) {
    element.addEventListener("mouseenter", event => {
      activeInsightsTooltipTrigger = element;
      activeInsightsTooltipBounds = getInsightsTooltipBounds(element);
      showFloatingInsightsTooltip(html, event.clientX, event.clientY, activeInsightsTooltipBounds);
    });

    element.addEventListener("mousemove", event => {
      activeInsightsTooltipBounds = getInsightsTooltipBounds(element);
      positionFloatingInsightsTooltip(event.clientX, event.clientY);
    });

    element.addEventListener("mouseleave", () => {
      if (activeInsightsTooltipTrigger === element) {
        hideFloatingInsightsTooltip();
      }
    });
  }

  element.addEventListener("focus", () => {
    showFromElement();
  });

  element.addEventListener("blur", () => {
    if (activeInsightsTooltipTrigger === element) {
      hideFloatingInsightsTooltip();
    }
  });

  element.addEventListener("click", event => {
    if (!usesClickOnlyInsightsTooltips()) return;

    event.preventDefault();
    event.stopPropagation();

    const tooltip = document.getElementById("insights-hover-tooltip");
    const isSameTriggerOpen =
      activeInsightsTooltipTrigger === element &&
      tooltip &&
      !tooltip.classList.contains("hidden");

    if (isSameTriggerOpen) {
      hideFloatingInsightsTooltip();
      return;
    }

    showFromElement();
  });
}

function showFloatingInsightsTooltip(html, clientX, clientY, bounds = null) {
  const tooltip = document.getElementById("insights-hover-tooltip");
  if (!tooltip) return;

  tooltip.innerHTML = html;
  tooltip.classList.remove("hidden");
  tooltip.classList.add("is-visible");
  tooltip.setAttribute("aria-hidden", "false");

  activeInsightsTooltipBounds = bounds || activeInsightsTooltipBounds;
  positionFloatingInsightsTooltip(clientX, clientY);
}

function hideFloatingInsightsTooltip() {
  const tooltip = document.getElementById("insights-hover-tooltip");
  if (!tooltip) return;

  tooltip.classList.add("hidden");
  tooltip.classList.remove("is-visible", "is-tile-bounded");
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.style.removeProperty("--tooltip-bound-width");
  tooltip.style.left = "";
  tooltip.style.top = "";

  activeInsightsTooltipTrigger = null;
  activeInsightsTooltipBounds = null;
}

function attachTileBoundedTooltip(element, getHtml) {
  if (!element) return;

  bindGlobalInsightsTooltipDismiss();

  const showFromEvent = (clientX, clientY) => {
    const tooltip = document.getElementById("insights-hover-tooltip");
    const bounds = element.getBoundingClientRect();

    if (!tooltip) return;

    activeInsightsTooltipTrigger = element;
    activeInsightsTooltipBounds = bounds;

    tooltip.classList.add("is-tile-bounded");
    tooltip.style.setProperty("--tooltip-bound-width", `${Math.max(bounds.width, 96)}px`);

    showFloatingInsightsTooltip(
      typeof getHtml === "function" ? getHtml() : getHtml,
      clientX,
      clientY,
      bounds
    );
  };

  if (!usesClickOnlyInsightsTooltips()) {
    element.addEventListener("mouseenter", event => {
      showFromEvent(event.clientX, event.clientY);
    });

    element.addEventListener("mousemove", event => {
      const tooltip = document.getElementById("insights-hover-tooltip");
      const bounds = element.getBoundingClientRect();

      activeInsightsTooltipBounds = bounds;

      if (tooltip) {
        tooltip.classList.add("is-tile-bounded");
        tooltip.style.setProperty("--tooltip-bound-width", `${Math.max(bounds.width, 96)}px`);
      }

      positionFloatingInsightsTooltip(event.clientX, event.clientY);
    });

    element.addEventListener("mouseleave", () => {
      if (activeInsightsTooltipTrigger === element) {
        hideFloatingInsightsTooltip();
      }
    });
  }

  element.addEventListener("focus", () => {
    const rect = element.getBoundingClientRect();
    showFromEvent(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  element.addEventListener("blur", () => {
    if (activeInsightsTooltipTrigger === element) {
      hideFloatingInsightsTooltip();
    }
  });
}

function positionFloatingInsightsTooltip(clientX, clientY) {
  const tooltip = document.getElementById("insights-hover-tooltip");
  if (!tooltip || tooltip.classList.contains("hidden")) return;

  const padding = 12;
  const gap = 12;
  const tooltipRect = tooltip.getBoundingClientRect();

  const bounds = activeInsightsTooltipBounds || {
    left: padding,
    top: padding,
    right: window.innerWidth - padding,
    bottom: window.innerHeight - padding
  };

  let left = clientX + gap;
  let top = clientY + gap;

  if (left + tooltipRect.width > bounds.right - 8) {
    left = clientX - tooltipRect.width - gap;
  }

  if (top + tooltipRect.height > bounds.bottom - 8) {
    top = clientY - tooltipRect.height - gap;
  }

  const minLeft = bounds.left + 8;
  const maxLeft = Math.max(minLeft, bounds.right - tooltipRect.width - 8);
  const minTop = bounds.top + 8;
  const maxTop = Math.max(minTop, bounds.bottom - tooltipRect.height - 8);

  left = Math.max(minLeft, Math.min(left, maxLeft));
  top = Math.max(minTop, Math.min(top, maxTop));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function renderProjectsByExperience(containerId, items) {
  const container = document.getElementById(containerId);
  const drilldown = document.getElementById("experience-drilldown");
  if (!container || !drilldown) return;

  container.innerHTML = "";
  renderEmptyDetailState(
    drilldown,
    "Experience Drilldown",
    "Select a role",
    "Click a bar to explore the projects associated with that experience."
  );

  if (!items || items.length === 0) {
    container.textContent = "No experience/project data available.";
    return;
  }

  const sorted = [...items].sort((a, b) => (b.project_count || 0) - (a.project_count || 0));
  const maxValue = Math.max(...sorted.map(item => item.project_count || 0), 1);

  sorted.forEach(item => {
    const button = document.createElement("button");
    button.className = "viz-row-button";
    button.type = "button";

    const pct = (item.project_count / maxValue) * 100;
    button.innerHTML = `
      <div class="viz-item">
        <div class="viz-label-row">
          <div class="viz-label-main">
            <strong>${escapeHtml(item.role)}</strong>
            <div class="viz-label-subtext">${escapeHtml(item.company)}</div>
          </div>
          <span class="viz-count-pill">${item.project_count}</span>
        </div>
        <div class="viz-bar">
          <div class="viz-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;

    button.addEventListener("click", async () => {
      container.querySelectorAll(".viz-row-button").forEach(el => el.classList.remove("is-active"));
      button.classList.add("is-active");
      renderLoadingDetailState(drilldown, "Loading related projects...");

      try {
  const data = await fetchJson(`/analytics/experience-projects/${item.experience_id}`);
  const experience = data.experience || null;
  const projects = data.projects || [];

  renderProjectDrilldown(
    drilldown,
    {
      eyebrow: "Experience Drilldown",
      title: experience?.role || item.role,
      meta: `${escapeHtml(experience?.company || item.company)} • ${projects.length} project${projects.length === 1 ? "" : "s"}`,
      chips: [experience?.company || item.company],
      projects
    }
  );
} catch (error) {
  renderEmptyDetailState(
    drilldown,
    "Experience Drilldown",
    "Unable to load projects",
    "There was a problem loading the selected experience detail."
  );
}
    });

    container.appendChild(button);
  });
}

function renderFeedbackThemes(chartId, legendId, detailId, items) {
  const chart = document.getElementById(chartId);
  const legend = document.getElementById(legendId);
  const detail = document.getElementById(detailId);

  if (!chart || !legend || !detail) return;

  if (!items || items.length === 0) {
    chart.textContent = "No feedback theme data available.";
    legend.innerHTML = "";
    renderEmptyDetailState(
      detail,
      "Theme Drilldown",
      "No theme data",
      "Feedback themes are not available right now."
    );
    return;
  }

  const themeSegments = items.map(item => ({
    key: item.theme,
    label: titleCase(item.theme),
    value: item.feedback_count || 0
  }));

  const resetThemeView = () => {
    renderDonutView({
      chart,
      legend,
      segments: themeSegments,
      centerValue: themeSegments.length,
      centerLabel: "Themes",
      onSelect: async (segment, index) => {
        renderLoadingDetailState(detail, "Loading feedback details...");

        try {
          const data = await fetchJson(`/analytics/feedback-theme-details/${encodeURIComponent(segment.key)}`);
          const entries = data.entries || [];
          const sourceCounts = aggregateBy(entries, "source_type").map(item => ({
            key: item.key,
            label: titleCase(item.key.replaceAll("_", " ")),
            value: item.count
          }));

        const showEntries = (sourceFilter = null, activeIndex = null, showAll = false) => {
            const filtered = sourceFilter
              ? entries.filter(entry => entry.source_type === sourceFilter)
              : entries;

            renderFeedbackDetail(detail, {
              eyebrow: "Theme Drilldown",
              title: titleCase(segment.key),
              subtitle: sourceFilter
                ? `${titleCase(sourceFilter.replaceAll("_", " "))} • ${filtered.length} entries`
                : `${entries.length} feedback entries`,
              entries: filtered,
              showAll,
              onBack: resetThemeView,
              onToggleShowAll: (nextShowAll) => {
                showEntries(sourceFilter, activeIndex, nextShowAll);
              }
            });

            renderDonutView({
              chart,
              legend,
              segments: sourceCounts,
              centerValue: sourceCounts.length,
              centerLabel: "Sources",
              activeIndex,
              onSelect: (sourceSegment, idx) => {
                showEntries(sourceSegment.key, idx);
              },
              onBack: resetThemeView
            });
          };

          showEntries();
        } catch (error) {
          renderEmptyDetailState(
            detail,
            "Theme Drilldown",
            "Unable to load theme detail",
            "There was a problem loading the selected feedback theme."
          );
        }
      }
    });

    renderEmptyDetailState(
      detail,
      "Theme Drilldown",
      "Select a theme",
      "Hover the donut to preview theme counts, or click a segment to view source breakdown and supporting feedback excerpts."
    );
  };

  resetThemeView();
}

function renderDonutView({
  chart,
  legend,
  segments,
  centerValue = null,
  centerLabel,
  activeIndex = null,
  onSelect,
  onBack = null
}) {
  const safeSegments = (segments || []).filter(item => (item.value || 0) > 0);
  const total = safeSegments.reduce((sum, item) => sum + item.value, 0);
  const colors = ["#0a6ed1", "#4f8fe8", "#69b2ff", "#7a6ff0", "#2f6cb3", "#7cc0d8", "#8f9fb7", "#8ba3c7", "#5f8fd6"];
  const displayValue = centerValue ?? total;

  chart.innerHTML = total
    ? buildDonutSvg(
        safeSegments.map((segment, index) => ({
          ...segment,
          color: colors[index % colors.length]
        })),
        displayValue,
        centerLabel
      )
    : `<div class="detail-empty-state"><p>No chart data available.</p></div>`;

  const svg = chart.querySelector("svg");
    if (svg) {
	    svg.querySelectorAll("title").forEach(node => node.remove());
	
	    svg.querySelectorAll("[data-segment-index]").forEach(node => {
	      const idx = Number(node.getAttribute("data-segment-index"));
	      const segment = safeSegments[idx];
	
	      attachFloatingTooltip(
	        node,
	        `
	          <span class="insights-hover-tooltip-title">${escapeHtml(segment.label)}</span>
	          <span class="insights-hover-tooltip-body">${segment.value} record${segment.value === 1 ? "" : "s"}</span>
	        `
	      );
	
	      node.addEventListener("click", event => {
	        if (usesClickOnlyInsightsTooltips()) return;
	        onSelect?.(segment, idx);
	      });
	
	      if (usesClickOnlyInsightsTooltips()) {
	        node.addEventListener("dblclick", event => {
	          event.preventDefault();
	          onSelect?.(segment, idx);
	        });
	      }
	    });
	  }

  legend.innerHTML = "";

  if (onBack) {
    const toolbar = document.createElement("div");
    toolbar.className = "detail-toolbar";
    toolbar.innerHTML = `
      <div class="detail-eyebrow">Feedback View</div>
      <button type="button" class="detail-back-btn">Back</button>
    `;
    toolbar.querySelector("button")?.addEventListener("click", onBack);
    legend.appendChild(toolbar);
  }
}

function renderProjectDrilldown(container, { eyebrow, title, meta, chips = [], projects = [] }) {
  if (!projects.length) {
    renderEmptyDetailState(
      container,
      eyebrow,
      title,
      "No related projects were found for this selection."
    );
    return;
  }

  container.innerHTML = `
    <div class="detail-eyebrow">${escapeHtml(eyebrow)}</div>
    <div class="detail-header-row">
      <div>
        <h4>${escapeHtml(title)}</h4>
        <p class="detail-meta">${escapeHtml(meta)}</p>
      </div>
    </div>
    <div class="detail-chip-row">
      ${chips.map(chip => `<span class="detail-chip">${escapeHtml(chip)}</span>`).join("")}
    </div>
    <div class="detail-card-list">
      ${projects.map(project => `
        <div class="detail-project-card">
          <div class="detail-project-domain">${escapeHtml(project.domain || "Project")}</div>
          <h5>${escapeHtml(project.name || "Untitled project")}</h5>
          <p>${escapeHtml(truncateText(project.value || "No project description available.", 180))}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFeedbackDetail(
  container,
  {
    eyebrow,
    title,
    subtitle,
    entries = [],
    onBack,
    showAll = false,
    onToggleShowAll = null
  }
) {
  const curatedData = splitCuratedFeedbackEntries(entries);
  const curatedEntries = curatedData.curated;
  const visibleEntries = showAll || curatedEntries.length === 0 ? entries : curatedEntries;
  const showingCurated = !showAll && curatedEntries.length > 0;

  container.innerHTML = `
    <div class="detail-toolbar">
      <div>
        <div class="detail-eyebrow">${escapeHtml(eyebrow)}</div>
        <h4>${escapeHtml(title)}</h4>
      </div>
      <button type="button" class="detail-back-btn">Back</button>
    </div>
    <p class="detail-note">${escapeHtml(subtitle)}</p>
    ${curatedEntries.length && entries.length > curatedEntries.length ? `
      <div class="detail-toolbar" style="margin-bottom: 10px;">
        <div class="detail-eyebrow">
          ${showingCurated ? `Showing curated highlights (${curatedEntries.length})` : `Showing all entries (${entries.length})`}
        </div>
        <button type="button" class="detail-back-btn detail-toggle-btn">
          ${showingCurated ? `Show all (${entries.length})` : "Show curated"}
        </button>
      </div>
    ` : ""}
    <div class="detail-card-list">
      ${visibleEntries.length ? visibleEntries.map(entry => `
        <div class="feedback-quote-card">
          <div class="feedback-source-pill">${escapeHtml(titleCase((entry.source_type || "source").replaceAll("_", " ")))}</div>
          <p>${escapeHtml(entry.quote || "")}</p>
        </div>
      `).join("") : `<div class="detail-empty-state"><p>No feedback entries found.</p></div>`}
    </div>
  `;

  container.querySelector(".detail-back-btn")?.addEventListener("click", onBack);
  container.querySelector(".detail-toggle-btn")?.addEventListener("click", () => {
    onToggleShowAll?.(!showAll);
  });
}

function renderEmptyDetailState(container, eyebrow, title, body) {
  container.innerHTML = `
    <div class="detail-empty-state">
      <div class="detail-eyebrow">${escapeHtml(eyebrow)}</div>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function renderLoadingDetailState(container, message) {
  container.innerHTML = `
    <div class="detail-empty-state">
      <div class="detail-eyebrow">Loading</div>
      <h4>Please wait</h4>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function buildDonutSvg(segments, centerValue, centerLabel) {
  const size = 220;
  const radius = 74;
  const stroke = 24;
  const circumference = 2 * Math.PI * radius;
  let offsetRatio = 0;

  const circles = segments.map((segment, index) => {
    const ratio = segment.value / segments.reduce((sum, item) => sum + item.value, 0);
    const dash = ratio * circumference;
    const gap = circumference - dash;
    const rotation = -90 + (offsetRatio * 360);
    offsetRatio += ratio;

    return `
      <circle
        class="donut-segment"
        cx="${size / 2}"
        cy="${size / 2}"
        r="${radius}"
        stroke="${segment.color}"
        stroke-width="${stroke}"
        stroke-dasharray="${dash} ${gap}"
        transform="rotate(${rotation} ${size / 2} ${size / 2})"
        data-segment-index="${index}"
      >
        <title>${escapeHtml(segment.label)}: ${segment.value}</title>
      </circle>
    `;
  }).join("");

  return `
    <svg class="donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(centerLabel)} donut chart">
      <circle class="donut-track" cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke-width="${stroke}"></circle>
      ${circles}
      <text x="${size / 2}" y="${size / 2 - 2}" class="donut-center-total">${centerValue}</text>
      <text x="${size / 2}" y="${size / 2 + 18}" class="donut-center-label">${escapeHtml(centerLabel)}</text>
    </svg>
  `;
}

function aggregateBy(items, key) {
  const map = new Map();

  items.forEach(item => {
    const raw = item?.[key] || "unknown";
    map.set(raw, (map.get(raw) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([entryKey, count]) => ({ key: entryKey, count }))
    .sort((a, b) => b.count - a.count);
}

function splitCuratedFeedbackEntries(entries = []) {
  const curated = entries
    .filter(entry => entry.viz_display_flag)
    .sort((a, b) => {
      const rankA = a.viz_display_rank ?? 999;
      const rankB = b.viz_display_rank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
      return (b.feedback_id ?? 0) - (a.feedback_id ?? 0);
    });

  return {
    curated,
    all: entries
  };
}

function formatMonthYear(value) {
  if (!value || value === "Present") return "Present";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function feedbackGroupKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncateText(value, maxLength = 160) {
  const str = String(value || "");
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength).trim()}…`;
}

async function loadContactInfo() {
  try {
    const contacts = await fetchJson("/contact-info");

    const iconMap = {
      email: "@",
      phone: "✆",
      linkedin: "in",
      location: "⌂"
    };

    const labelMap = {
      email: "Email",
      phone: "Phone",
      linkedin: "LinkedIn",
      location: "Location"
    };

    const formatted = contacts
      .map(contact => {
        const category = contact.category || "";
        const label = labelMap[category] || capitalize(category);
        const icon = iconMap[category] || "•";

        let valueHtml = escapeHtml(contact.value);

        if (category === "email") {
          valueHtml = `<a href="mailto:${escapeHtml(contact.value)}">${escapeHtml(contact.value)}</a>`;
        } else if (category === "phone") {
          valueHtml = `<a href="tel:${escapeHtml(contact.value)}">${escapeHtml(contact.value)}</a>`;
        } else if (category === "linkedin") {
          valueHtml = `<a href="${escapeHtml(contact.value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.value)}</a>`;
        }

        return `
          <div class="contact-detail-item">
            <div class="contact-detail-icon" aria-hidden="true">${icon}</div>
            <div class="contact-detail-copy">
              <span class="contact-detail-label">${label}</span>
              <span class="contact-detail-value">${valueHtml}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const landingList = document.getElementById("landing-contact-list");
    if (landingList) {
      landingList.innerHTML = formatted || '<div class="contact-detail-item">No contact information available.</div>';
    }

    const linkedin = contacts.find(c => c.category === "linkedin")?.value;
    if (linkedin) {
      const linkedInButton = document.getElementById("linkedin-link");
      if (linkedInButton) linkedInButton.href = linkedin;
    }
  } catch (error) {
    console.error("Failed to load contact info:", error);

    const fallback = `
      <div class="contact-detail-item">
        <div class="contact-detail-copy">
          <span class="contact-detail-value">Contact information unavailable.</span>
        </div>
      </div>
    `;

    const landingList = document.getElementById("landing-contact-list");
    if (landingList) landingList.innerHTML = fallback;
  }
}

async function loadNextOpportunity() {
  const data = await fetchJson("/analytics/opportunity-insights-dashboard");

  renderTimeline("opportunity-career-timeline", data.trajectory.timeline);
  setObservedPanel(
    "opportunity-trajectory-title",
    "opportunity-trajectory-copy",
    "opportunity-trajectory-derivation",
    data.trajectory.observed_title,
    data.trajectory.observed_copy,
    data.trajectory.derivation
  );

  renderOpportunityTreemap("opportunity-fit-treemap", data.fit_profile.segments);
  setObservedPanel(
    "opportunity-fit-title",
    "opportunity-fit-copy",
    "opportunity-fit-derivation",
    data.fit_profile.observed_title,
    data.fit_profile.observed_copy,
    data.fit_profile.derivation
  );

  renderRolePriorities("opportunity-role-priorities", data.role_priorities.roles);
  setObservedPanel(
    "opportunity-role-title",
    "opportunity-role-copy",
    "opportunity-role-derivation",
    data.role_priorities.observed_title,
    data.role_priorities.observed_copy,
    data.role_priorities.derivation
  );

  bindInsightHelpPopovers();
}

function setObservedPanel(titleId, copyId, derivationId, title, copy, derivation) {
  const titleEl = document.getElementById(titleId);
  const copyEl = document.getElementById(copyId);
  const derivationEl = document.getElementById(derivationId);

  if (titleEl) titleEl.textContent = title || "Observed Pattern";

  if (copyEl) {
    if (Array.isArray(copy)) {
      copyEl.innerHTML = `
        <ul>
          ${copy.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      `;
    } else if (typeof copy === "string") {
      copyEl.innerHTML = `<p>${escapeHtml(copy)}</p>`;
    } else {
      copyEl.innerHTML = "";
    }
  }

  if (derivationEl) {
    derivationEl.textContent = derivation || "";
  }
}

function bindValueDistributionToggles(distributionViews) {
  const buttons = document.querySelectorAll("[data-distribution-dimension]");
  if (!buttons.length) return;

  const renderDimension = dimension => {
    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.distributionDimension === dimension);
    });

    const view = distributionViews?.[dimension];
    if (!view) return;

    renderDistributionBar("value-distribution-chart", view);
    renderDistributionLegend("value-distribution-legend", view.segments);
    const context = document.getElementById("value-distribution-context");
    if (context) {
      context.textContent = `Based on ${view.total_records} factual system-improvement records.`;
    }

    setObservedPanel(
      "value-distribution-observed-title",
      "value-distribution-observed-copy",
      "value-distribution-derivation",
      view.observed_title,
      view.observed_copy,
      view.derivation
    );
  };

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      renderDimension(btn.dataset.distributionDimension);
    });
  });

  renderDimension("solution_type");
}

function renderDistributionBar(containerId, view) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const paletteMap = {
    solution_type: ["#0a6ed1", "#267fda", "#438fe3", "#61a0eb", "#7fb1f2", "#9cc2f7", "#b8d4fb", "#d9ecff"],
    problem_type: ["#0a6ed1", "#267fda", "#438fe3", "#61a0eb", "#7fb1f2", "#9cc2f7", "#c5ddfb"],
    system_layer: ["#0a6ed1", "#2f85df", "#66abef", "#9acefb", "#d8edff"]
  };

  const palette = paletteMap[view.dimension] || paletteMap.solution_type;
  const segments = view.segments || [];

  container.innerHTML = `
    <div class="distribution-bar-track">
      ${segments.map((segment, index) => `
        <button
          type="button"
          class="distribution-bar-segment"
          style="width:${Math.max(segment.share, 3)}%; background:${palette[index % palette.length]};"
          aria-label="${escapeHtml(segment.label)}"
        ></button>
      `).join("")}
    </div>
    <div class="distribution-hover-hint">Hover each segment for category, share, and definition.</div>
  `;

  container.querySelectorAll(".distribution-bar-segment").forEach((node, index) => {
    const segment = segments[index];
    const definition =
      DISTRIBUTION_DEFINITIONS?.[view.dimension]?.[segment.key] ||
      "This category is derived from the structured system-improvement model.";

    attachFloatingTooltip(
      node,
      `
        <span class="insights-hover-tooltip-title">${escapeHtml(segment.label)}</span>
        <span class="insights-hover-tooltip-body">${segment.count} records</span>
        <span class="insights-hover-tooltip-body">${segment.share}% of selected view</span>
        <span class="insights-hover-tooltip-definition">${escapeHtml(definition)}</span>
      `
    );
  });
}

function renderDistributionLegend(containerId, segments) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
}

function renderValueDelivery(payload) {
  const list = document.getElementById("value-delivery-insight-list");
  const grid = document.getElementById("value-delivery-grid");
  const derivation = document.getElementById("value-delivery-derivation");
  const feedbackTrigger = document.getElementById("value-delivery-feedback-trigger");

  if (!list || !grid) return;

  list.innerHTML = (payload.insights || []).map(item => `
    <li>
      <span class="insight-pattern-index">${item.index}</span>
      <span>${escapeHtml(item.statement)}</span>
    </li>
  `).join("");

  if (derivation) {
    derivation.textContent = payload.derivation || "";
  }

  const approaches = payload.approaches || [];

  valueDeliveryFeedbackGroups = approaches.map(card => ({
    key: feedbackGroupKey(card.label),
    index: card.index,
    label: card.label,
    count: card.count,
    items: card.feedback_examples || []
  }));

  if (feedbackTrigger) {
    const hasFeedback = valueDeliveryFeedbackGroups.some(group => group.items.length);

    feedbackTrigger.disabled = !hasFeedback;
    feedbackTrigger.classList.toggle("is-disabled", !hasFeedback);
    feedbackTrigger.onclick = () => {
      if (!hasFeedback) return;
      openFeedbackEvidenceModal(valueDeliveryFeedbackGroups);
    };
  }

  grid.innerHTML = approaches.map(card => `
    <article class="composition-card">
      <div class="composition-card-header-row">
        <div class="composition-card-heading-main">
          <div class="composition-card-index">${card.index}</div>
          <div class="composition-card-heading">
            <h4>${escapeHtml(card.label)}</h4>
            <div class="composition-card-meta">${card.count} linked system improvements</div>
          </div>
        </div>
      </div>

      <div class="composition-skill-stack">
        ${(card.skills || []).map((skill, skillIndex) => `
          <div class="composition-skill-row ${skillIndex === 0 ? "is-primary" : skillIndex === 1 ? "is-secondary" : "is-supporting"}">
            <div class="composition-skill-label">${escapeHtml(skill.skill_name)}</div>
            <div class="composition-skill-bar">
              <span style="width:${Math.max(skill.normalized, skillIndex === 0 ? 22 : 12)}%"></span>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function openFeedbackEvidenceModal(groups, activeKey = null) {
  const modal = document.getElementById("feedback-detail-modal");
  const title = document.getElementById("feedback-detail-modal-title");
  const body = document.getElementById("feedback-detail-modal-body");
  if (!modal || !title || !body) return;

  const safeGroups = (groups || []).map(group => ({
    key: group.key,
    index: group.index,
    label: group.label,
    count: group.count,
    items: group.items || []
  }));

  const activeGroup =
    safeGroups.find(group => group.key === activeKey) ||
    safeGroups.find(group => group.items.length > 0) ||
    safeGroups[0];

  title.textContent = "Feedback Evidence";

  if (!activeGroup) {
    body.innerHTML = `
      <div class="detail-empty-state">
        <h4>No feedback evidence available</h4>
        <p>No curated feedback examples are available right now.</p>
      </div>
    `;
    modal.classList.remove("hidden");
    return;
  }

  body.innerHTML = `
    <div class="feedback-evidence-modal">
      <div class="feedback-evidence-intro">
        <div class="detail-eyebrow">Curated Feedback by Approach</div>
        <p class="detail-note">Review curated feedback evidence for each delivery approach.</p>
      </div>

      <div class="feedback-approach-toggle-row">
        ${safeGroups.map(group => `
          <button
            type="button"
            class="feedback-approach-toggle ${group.key === activeGroup.key ? "is-active" : ""}"
            data-feedback-key="${group.key}"
          >
            <span class="composition-card-index">${group.index}</span>
            <span class="feedback-approach-toggle-copy">
              <span class="feedback-approach-toggle-label">${escapeHtml(group.label)}</span>
            </span>
          </button>
        `).join("")}
      </div>

      <div class="feedback-evidence-active">
        <div class="feedback-evidence-active-header">
          <div class="feedback-evidence-active-main">
            <span class="composition-card-index">${activeGroup.index}</span>
            <div>
              <h4>${escapeHtml(activeGroup.label)}</h4>
            </div>
          </div>
        </div>

        ${activeGroup.items.length ? `
          <div class="detail-card-list">
            ${activeGroup.items.slice(0, 4).map(entry => `
              <div class="feedback-quote-card">
                <div class="feedback-source-pill">${escapeHtml(titleCase((entry.source_type || "source").replaceAll("_", " ")))}</div>
                <p>${escapeHtml(entry.quote || "")}</p>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="detail-empty-state">
            <h4>No curated feedback available</h4>
            <p>No curated feedback examples are available for this approach.</p>
          </div>
        `}
      </div>
    </div>
  `;

  body.scrollTop = 0;

  body.querySelectorAll(".feedback-approach-toggle").forEach(button => {
    button.addEventListener("click", () => {
      openFeedbackEvidenceModal(safeGroups, button.dataset.feedbackKey);
    });
  });

  modal.classList.remove("hidden");
}

function bindInsightHelpPopovers() {
  const triggers = document.querySelectorAll(".insight-help-button");
  if (!triggers.length) return;

  const closeAll = (exceptId = null) => {
    document.querySelectorAll(".insight-help-button").forEach(btn => {
      const popoverId = btn.getAttribute("aria-controls");
      const popover = popoverId ? document.getElementById(popoverId) : null;
      const isTarget = popoverId === exceptId;

      btn.classList.toggle("is-active", isTarget);
      btn.setAttribute("aria-expanded", isTarget ? "true" : "false");

      if (popover) {
        popover.classList.toggle("is-visible", isTarget);
        popover.setAttribute("aria-hidden", isTarget ? "false" : "true");
      }
    });
  };

  const positionPopover = (button, popover) => {
	  if (!button || !popover) return;
	
	  const isMobile = window.innerWidth <= 680;
	  popover.classList.remove("is-docked-mobile");
	
	  if (isMobile) {
	    popover.classList.add("is-docked-mobile");
	    popover.style.left = "";
	    popover.style.top = "";
	    return;
	  }
	
	  const buttonRect = button.getBoundingClientRect();
	  const popoverRect = popover.getBoundingClientRect();
	  const gap = 10;
	  const viewportPadding = 12;
	
	  let left = buttonRect.left + (buttonRect.width / 2) - (popoverRect.width / 2);
	  let top = buttonRect.bottom + gap;
	
	  if (left < viewportPadding) {
	    left = viewportPadding;
	  }
	
	  if (left + popoverRect.width > window.innerWidth - viewportPadding) {
	    left = window.innerWidth - popoverRect.width - viewportPadding;
	  }
	
	  if (top + popoverRect.height > window.innerHeight - viewportPadding) {
	    top = buttonRect.top - popoverRect.height - gap;
	  }
	
	  if (top < viewportPadding) {
	    top = viewportPadding;
	  }
	
	  popover.style.left = `${left}px`;
	  popover.style.top = `${top}px`;
	};

  triggers.forEach(btn => {
    if (btn.dataset.helpPopoverBound === "true") return;

    btn.dataset.helpPopoverBound = "true";

    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      const popoverId = btn.getAttribute("aria-controls");
      const popover = popoverId ? document.getElementById(popoverId) : null;
      if (!popover) return;

      const isOpen = btn.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        closeAll();
        return;
      }

      closeAll(popoverId);

      requestAnimationFrame(() => {
        positionPopover(btn, popover);
      });
    });
  });

  if (document.body.dataset.insightHelpResizeBound !== "true") {
    document.body.dataset.insightHelpResizeBound = "true";

    window.addEventListener("resize", () => {
      document.querySelectorAll(".insight-help-button[aria-expanded='true']").forEach(btn => {
        const popoverId = btn.getAttribute("aria-controls");
        const popover = popoverId ? document.getElementById(popoverId) : null;
        if (popover) positionPopover(btn, popover);
      });
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".insight-help")) {
        closeAll();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeAll();
      }
    });
  }
}

function renderValueRealization(payload) {
  const container = document.getElementById("value-realization-heatmap");
  if (!container) return;

  const rows = payload.approach_labels || [];
  const cols = payload.impact_labels || [];
  const cells = payload.cells || [];
  const maxScore = payload.max_score || 1;

  const cellMap = new Map(
    cells.map(cell => [`${cell.approach_key}__${cell.impact_key}`, cell])
  );

  const rowMaxScores = new Map(
    rows.map(row => {
      const rowScores = cols.map(col => {
        const cell = cellMap.get(`${row.key}__${col.key}`);
        return Number(cell?.score || 0);
      });
      return [row.key, Math.max(...rowScores, 0)];
    })
  );

  const intensityFor = score => {
    if (score <= 0) return "#f3f7fc";
    const ratio = score / maxScore;
    if (ratio >= 0.88) return "rgba(10,110,209,1)";
    if (ratio >= 0.72) return "rgba(10,110,209,0.88)";
    if (ratio >= 0.56) return "rgba(47,133,223,0.78)";
    if (ratio >= 0.40) return "rgba(91,166,240,0.64)";
    if (ratio >= 0.24) return "rgba(124,185,245,0.5)";
    return "rgba(188,220,251,0.44)";
  };

  const borderFor = score => {
    if (score <= 0) return "rgba(10,110,209,0.10)";
    const ratio = score / maxScore;
    if (ratio >= 0.88) return "rgba(8,84,160,0.9)";
    if (ratio >= 0.72) return "rgba(10,110,209,0.72)";
    if (ratio >= 0.56) return "rgba(47,133,223,0.56)";
    if (ratio >= 0.40) return "rgba(91,166,240,0.46)";
    if (ratio >= 0.24) return "rgba(124,185,245,0.38)";
    return "rgba(188,220,251,0.34)";
  };

  container.innerHTML = `
    <div class="value-heatmap-grid" style="grid-template-columns: 170px repeat(${cols.length}, minmax(0, 1fr));">
      <div class="value-heatmap-corner">Approach</div>
      ${cols.map(col => `<div class="value-heatmap-axis value-heatmap-axis--column">${escapeHtml(col.label)}</div>`).join("")}
      ${rows.map(row => `
        <div class="value-heatmap-axis value-heatmap-axis--row${rowMaxScores.get(row.key) > 0 ? " value-heatmap-axis--row-has-dominant" : ""}">
          ${escapeHtml(row.label)}
        </div>
        ${cols.map(col => {
          const cell = cellMap.get(`${row.key}__${col.key}`) || {
            score: 0,
            factual_count: 0,
            project_inferred: 0,
            feedback_inferred: 0
          };

          const score = Number(cell.score || 0);
          const isDominant = rowMaxScores.get(row.key) > 0 && score === rowMaxScores.get(row.key);

          return `
            <button
              type="button"
              class="value-heatmap-cell${isDominant ? " is-row-dominant" : ""}"
              data-heatmap-row="${escapeHtml(row.label)}"
              data-heatmap-col="${escapeHtml(col.label)}"
              data-heatmap-factual="${cell.factual_count}"
              data-heatmap-project="${cell.project_inferred}"
              data-heatmap-feedback="${cell.feedback_inferred}"
              data-heatmap-score="${cell.score}"
              data-heatmap-dominant="${isDominant ? "true" : "false"}"
              style="background:${intensityFor(score)}; border-color:${borderFor(score)};"
            ></button>
          `;
        }).join("")}
      `).join("")}
    </div>
  `;

  container.querySelectorAll(".value-heatmap-cell").forEach(cell => {
    const dominantLine = cell.dataset.heatmapDominant === "true"
      ? `<span class="insights-hover-tooltip-body">Primary outcome for this approach</span>`
      : "";

    attachFloatingTooltip(
      cell,
      `
        <span class="insights-hover-tooltip-title">${escapeHtml(cell.dataset.heatmapRow)}: ${escapeHtml(cell.dataset.heatmapCol)}</span>
        ${dominantLine}
        <span class="insights-hover-tooltip-body">Factual core: ${cell.dataset.heatmapFactual}</span>
        <span class="insights-hover-tooltip-body">Project inference: ${cell.dataset.heatmapProject}</span>
        <span class="insights-hover-tooltip-body">Feedback reinforcement: ${cell.dataset.heatmapFeedback}</span>
        <span class="insights-hover-tooltip-body">Weighted score: ${cell.dataset.heatmapScore}</span>
      `
    );
  });

  setObservedPanel(
    "value-realization-observed-title",
    "value-realization-observed-copy",
    "value-realization-derivation",
    payload.observed_title,
    payload.observed_copy,
    payload.derivation
  );
}

function renderOpportunityTreemap(containerId, segments) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const sourceItems = Array.isArray(segments) ? [...segments] : [];
  if (!sourceItems.length) {
    container.innerHTML = `<div class="detail-empty-state"><p>No opportunity fit data available.</p></div>`;
    return;
  }

  const activeDimension = opportunityTreemapState.activeDimension;
  const grouped = groupOpportunityTreemapSegmentsByDimension(sourceItems);

  const availableDimensionKeys = grouped.map(group => group.dimensionKey);
  if (activeDimension && !availableDimensionKeys.includes(activeDimension)) {
    opportunityTreemapState.activeDimension = null;
  }

  const isDrilldown = !!opportunityTreemapState.activeDimension;
  const nodes = isDrilldown
    ? buildOpportunityTreemapValueNodes(grouped, opportunityTreemapState.activeDimension)
    : buildOpportunityTreemapDimensionNodes(grouped);

  const activeDimensionNode = grouped.find(
    group => group.dimensionKey === opportunityTreemapState.activeDimension
  );

  const headerText = isDrilldown
    ? `Higher Alignment ●●●●● Lower Alignment | Viewing ${activeDimensionNode?.dimensionLabel || "Selected Dimension"}`
    : `Higher Alignment ●●●●● Lower Alignment | Click a segment to explore`;

  container.innerHTML = `
    <div class="opportunity-treemap-shell">
      <div class="opportunity-treemap-header">
        <div class="opportunity-treemap-scale">${headerText}</div>
      </div>

      ${isDrilldown ? `
        <div class="opportunity-treemap-breadcrumb">
          <button type="button" class="opportunity-treemap-back-btn" id="${containerId}-back-btn">
            ← Back to Dimensions
          </button>
        </div>
      ` : ""}

      <div class="opportunity-treemap-canvas" id="${containerId}-canvas"></div>
    </div>
  `;

  const backButton = document.getElementById(`${containerId}-back-btn`);
  backButton?.addEventListener("click", () => {
    opportunityTreemapState.activeDimension = null;
    hideFloatingInsightsTooltip();
    renderOpportunityTreemap(containerId, sourceItems);
  });

  const canvas = document.getElementById(`${containerId}-canvas`);
  if (!canvas) return;

  const rects = computeOpportunityTreemapRects(nodes, 0, 0, 1000, 1000, 10);
  const weights = nodes.map(node => Number(node.weight || 0));
  const maxWeight = Math.max(...weights, 1);
  const minWeight = Math.min(...weights, maxWeight);

  canvas.innerHTML = rects.map(({ node, x, y, width, height }) => {
    const fill = opportunityTreemapFillFor(node.weight, minWeight, maxWeight);
    const border = opportunityTreemapBorderFor(node.weight, minWeight, maxWeight);
    const labelClass =
      width < 180 || height < 130
        ? "opportunity-treemap-tile-label is-compact"
        : "opportunity-treemap-tile-label";

    return `
      <button
        type="button"
        class="opportunity-treemap-tile"
        style="
          left:${x / 10}%;
          top:${y / 10}%;
          width:${width / 10}%;
          height:${height / 10}%;
          --tile-fill:${fill};
          --tile-border:${border};
        "
        data-node-id="${escapeHtml(node.id)}"
        aria-label="${escapeHtml(node.label)}"
      >
        <span class="${labelClass}">${escapeHtml(node.label)}</span>
      </button>
    `;
  }).join("");

  canvas.querySelectorAll(".opportunity-treemap-tile").forEach(tile => {
    const node = nodes.find(item => item.id === tile.dataset.nodeId);
    if (!node) return;

    attachTileBoundedTooltip(tile, () => buildOpportunityTreemapTooltip(node, isDrilldown));

    if (!isDrilldown) {
      tile.addEventListener("click", () => {
        opportunityTreemapState.activeDimension = node.dimensionKey;
        hideFloatingInsightsTooltip();
        renderOpportunityTreemap(containerId, sourceItems);
      });
    }
  });
}

function groupOpportunityTreemapSegmentsByDimension(segments) {
  const map = new Map();

  segments.forEach(segment => {
    const dimensionKey = String(segment.dimension || "").trim();
    const dimensionLabel = titleCase(dimensionKey.replaceAll("_", " "));
    const combinedWeight = Number(segment.combined_weight || 0);

    if (!map.has(dimensionKey)) {
      map.set(dimensionKey, {
        dimensionKey,
        dimensionLabel,
        items: [],
        totalWeight: 0,
        averageWeight: 0
      });
    }

    const entry = map.get(dimensionKey);
    entry.items.push({
      ...segment,
      combined_weight: combinedWeight
    });
    entry.totalWeight += combinedWeight;
  });

  return Array.from(map.values())
    .map(entry => ({
      ...entry,
      averageWeight: entry.items.length ? entry.totalWeight / entry.items.length : 0
    }))
    .sort((a, b) => b.averageWeight - a.averageWeight);
}

function buildOpportunityTreemapDimensionNodes(grouped) {
  return grouped.map(group => {
    const topValues = [...group.items]
      .sort((a, b) => (b.combined_weight || 0) - (a.combined_weight || 0))
      .slice(0, 3)
      .map(item => item.label);

    return {
      id: `dimension-${group.dimensionKey}`,
      level: "dimension",
      label: group.dimensionLabel,
      dimensionKey: group.dimensionKey,
      weight: group.averageWeight,
      valueCount: group.items.length,
      topValues
    };
  });
}

function buildOpportunityTreemapValueNodes(grouped, activeDimension) {
  const group = grouped.find(item => item.dimensionKey === activeDimension);
  if (!group) return [];

  return [...group.items]
    .sort((a, b) => (b.combined_weight || 0) - (a.combined_weight || 0))
    .map(item => ({
      id: `value-${item.preference_id}`,
      level: "value",
      label: item.label,
      dimensionKey: group.dimensionKey,
      dimensionLabel: group.dimensionLabel,
      categoryLabel: item.category_label || item.category || "",
      priority: capitalize(item.priority || ""),
      dimensionWeight: Number(item.dimension_weight || 0),
      valueWeight: Number(item.value_weight || 0),
      weight: Number(item.combined_weight || 0)
    }));
}

function buildOpportunityTreemapTooltip(node, isDrilldown) {
  if (!isDrilldown) {
    return `
      <span class="insights-hover-tooltip-title">${escapeHtml(node.label)}</span>
      <span class="insights-hover-tooltip-body">${node.valueCount} weighted preference values shape this dimension.</span>
      <span class="insights-hover-tooltip-body">Top aligned values: ${escapeHtml(node.topValues.join(", "))}</span>
      <span class="insights-hover-tooltip-body">Average alignment strength: ${node.weight.toFixed(2)}</span>
    `;
  }

  return `
    <span class="insights-hover-tooltip-title">${escapeHtml(node.label)}</span>
    <span class="insights-hover-tooltip-body">${escapeHtml(titleCase(String(node.categoryLabel).replaceAll("_", " ")))} within ${escapeHtml(node.dimensionLabel)}</span>
    <span class="insights-hover-tooltip-body">Priority: ${escapeHtml(node.priority)}</span>
    <span class="insights-hover-tooltip-body">Dimension weight: ${node.dimensionWeight.toFixed(2)}</span>
    <span class="insights-hover-tooltip-body">Value weight: ${node.valueWeight.toFixed(2)}</span>
    <span class="insights-hover-tooltip-body">Combined alignment: ${node.weight.toFixed(2)}</span>
  `;
}

function computeOpportunityTreemapRects(items, x, y, width, height, gap = 10) {
  if (!items.length) return [];
  if (items.length === 1) {
    return [{ node: items[0], x, y, width, height }];
  }

  const total = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const split = splitOpportunityTreemapItems(items);

  const groupA = split.groupA;
  const groupB = split.groupB;

  const weightA = groupA.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const shareA = total > 0 ? weightA / total : 0.5;

  const horizontal = width >= height;

  if (horizontal) {
    const usableWidth = Math.max(width - gap, 0);
    const widthA = usableWidth * shareA;
    const widthB = usableWidth - widthA;

    return [
      ...computeOpportunityTreemapRects(groupA, x, y, widthA, height, gap),
      ...computeOpportunityTreemapRects(groupB, x + widthA + gap, y, widthB, height, gap)
    ];
  }

  const usableHeight = Math.max(height - gap, 0);
  const heightA = usableHeight * shareA;
  const heightB = usableHeight - heightA;

  return [
    ...computeOpportunityTreemapRects(groupA, x, y, width, heightA, gap),
    ...computeOpportunityTreemapRects(groupB, x, y + heightA + gap, width, heightB, gap)
  ];
}

function splitOpportunityTreemapItems(items) {
  const sorted = [...items].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const total = sorted.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  let running = 0;
  let splitIndex = 1;
  let bestDelta = Infinity;

  for (let i = 1; i < sorted.length; i += 1) {
    running += Number(sorted[i - 1].weight || 0);
    const delta = Math.abs((total / 2) - running);

    if (delta < bestDelta) {
      bestDelta = delta;
      splitIndex = i;
    }
  }

  return {
    groupA: sorted.slice(0, splitIndex),
    groupB: sorted.slice(splitIndex)
  };
}

function opportunityTreemapRatioFor(value, minWeight, maxWeight) {
  if (maxWeight === minWeight) return 1;
  return (Number(value || 0) - minWeight) / (maxWeight - minWeight);
}

function opportunityTreemapFillFor(value, minWeight, maxWeight) {
  const ratio = opportunityTreemapRatioFor(value, minWeight, maxWeight);

  if (ratio >= 0.88) return "#0a6ed1";
  if (ratio >= 0.72) return "#2f85df";
  if (ratio >= 0.56) return "#4b93df";
  if (ratio >= 0.40) return "#76afe8";
  if (ratio >= 0.24) return "#9fcaf2";
  return "#c2def8";
}

function opportunityTreemapBorderFor(value, minWeight, maxWeight) {
  const ratio = opportunityTreemapRatioFor(value, minWeight, maxWeight);

  if (ratio >= 0.88) return "#0854a0";
  if (ratio >= 0.72) return "#1f6fc2";
  if (ratio >= 0.56) return "#4b93df";
  if (ratio >= 0.40) return "#76afe8";
  if (ratio >= 0.24) return "#9fcaf2";
  return "#c2def8";
}

function renderRolePriorities(containerId, roles) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = (roles || []).map(role => `
    <div class="role-priority-row">
      <div class="role-priority-label">${escapeHtml(role.label)}</div>
      <div class="role-priority-bar">
        <span style="width:${Math.max(role.normalized, 12)}%"></span>
      </div>
      <div class="role-priority-meta">${escapeHtml(capitalize(role.priority || ""))}</div>
    </div>
  `).join("");
}

function renderOpportunityEvidenceRedesign(projects) {
  const container = document.getElementById("opportunity-evidence-list");
  if (!container) return;

  const preferredProjectIds = [1001, 1002, 1003, 1004];
  const selected = preferredProjectIds
    .map(projectId => projects.find(project => project.project_id === projectId))
    .filter(Boolean);

  if (!selected.length) {
    container.innerHTML = `<div class="opportunity-evidence-item">No supporting evidence available.</div>`;
    return;
  }

  container.innerHTML = selected.map(project => `
    <div class="opportunity-evidence-item">
      <div class="detail-eyebrow">${escapeHtml(project.domain || "Project")}</div>
      <h4>${escapeHtml(project.name || "Untitled project")}</h4>
      <p>${escapeHtml(truncateText(project.value || "", 170))}</p>
    </div>
  `).join("");
}

function renderChipList(elementId, items, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const cleaned = uniqueItems(items || []);
  el.innerHTML = "";

  if (!cleaned.length) {
    el.innerHTML = `<span class="opportunity-chip">No data available</span>`;
    return;
  }

  cleaned.forEach(item => {
    const chip = document.createElement("span");
    chip.className = `opportunity-chip${options.emphasis ? " emphasis" : ""}`;
    chip.textContent = item;
    el.appendChild(chip);
  });
}

function renderOpportunityEvidence(projects) {
  const container = document.getElementById("opportunity-evidence-list");
  if (!container) return;

  container.innerHTML = "";

  if (!projects || !projects.length) {
    container.innerHTML = `<div class="opportunity-evidence-item">No supporting evidence available.</div>`;
    return;
  }

  const ranked = [...projects]
    .filter(project => /\d|%|\$|>|~/.test(project.value || ""))
    .slice(0, 4);

  const evidenceProjects = ranked.length ? ranked : projects.slice(0, 4);

  evidenceProjects.forEach(project => {
    const item = document.createElement("article");
    item.className = "opportunity-evidence-item";
    item.innerHTML = `
      <div class="opportunity-evidence-domain">${escapeHtml(project.domain || "Project Signal")}</div>
      <h4>${escapeHtml(project.name || "Untitled project")}</h4>
      <p>${escapeHtml(truncateText(project.value || "No supporting description available.", 185))}</p>
    `;
    container.appendChild(item);
  });
}

function renderRolePreferenceGroups(preferences) {
  const container = document.getElementById("role-preferences-groups");
  if (!container) return;

  container.innerHTML = "";

  if (!preferences || preferences.length === 0) {
    container.textContent = "No role preferences available.";
    return;
  }

  const groupedView = [
    {
      title: "Role Archetypes",
      note: "Titles and level",
      items: preferences.filter(item =>
        item.category === "role_type" || item.category === "career_level"
      )
    },
    {
      title: "Environment",
      note: "Work mode and location",
      items: preferences.filter(item =>
        item.category === "work_mode" ||
        item.category === "preferred_onsite_location" ||
        item.category === "travel_percent_max" ||
        item.category === "travel_tolerance"
      )
    },
    {
      title: "Domain Alignment",
      note: "Core focus areas",
      items: preferences.filter(item =>
        item.category === "domain" ||
        item.category === "platform_focus" ||
        item.category === "industry"
      )
    },
    {
      title: "Operating Model",
      note: "Impact and leadership",
      items: preferences.filter(item =>
        item.category === "impact_focus" ||
        item.category === "problem_space" ||
        item.category === "people_leadership" ||
        item.category === "employment_type"
      )
    }
  ];

  groupedView.forEach(group => {
    const sortedItems = [...group.items].sort((a, b) => {
      const priorityWeight = { high: 1, medium: 2, low: 3 };
      const priorityDiff =
        (priorityWeight[a.priority] || 9) - (priorityWeight[b.priority] || 9);

      if (priorityDiff !== 0) return priorityDiff;
      return (a.value || "").length - (b.value || "").length;
    });

    if (!sortedItems.length) return;

    const block = document.createElement("div");
    block.className = "preference-group";
    block.innerHTML = `
      <div class="preference-group-header">
        <h4>${escapeHtml(group.title)}</h4>
        <div class="preference-group-note">${escapeHtml(group.note)}</div>
      </div>
      <div class="preference-badges">
        ${sortedItems.map(item => `
          <span class="preference-badge ${escapeHtml(item.priority || "")}">
            <span class="preference-badge-label">${escapeHtml(item.value || "")}</span>
            <span class="preference-badge-priority">${escapeHtml(item.priority || "")}</span>
          </span>
        `).join("")}
      </div>
    `;

    container.appendChild(block);
  });
}

function uniqueItems(items) {
  return Array.from(
    new Set(
      (items || [])
        .filter(Boolean)
        .map(item => String(item).trim())
        .filter(Boolean)
    )
  );
}

function renderList(elementId, items) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = "";

  if (!items || items.length === 0) {
    el.innerHTML = "<li>No data available.</li>";
    return;
  }

  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function formatSqlResults(result) {
  const columns = result.columns || [];
  const rows = result.rows || [];

  if (!columns.length) {
    return "Query executed successfully.\nNo tabular results returned.";
  }

  const stringRows = rows.map(row =>
    row.map(value => (value === null ? "NULL" : String(value)))
  );

  const widths = columns.map((col, i) => {
    const rowWidths = stringRows.map(row => (row[i] || "").length);
    return Math.max(col.length, ...rowWidths, 0);
  });

  const header = columns.map((col, i) => col.padEnd(widths[i])).join(" | ");
  const separator = widths.map(width => "-".repeat(width)).join("-+-");
  const body = stringRows.map(row =>
    row.map((value, i) => (value || "").padEnd(widths[i])).join(" | ")
  );

  return [header, separator, ...body, "", `Rows: ${rows.length}`].join("\n");
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let detail = `${response.status} - ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.detail) detail = errorData.detail;
    } catch (_) {
      // no-op
    }

    throw new Error(detail);
  }

  return response.json();
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
