const PROD_API_BASE = "https://human-data-product-api.onrender.com";

const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://127.0.0.1:8000"
  : PROD_API_BASE;

document.addEventListener("DOMContentLoaded", async () => {
  bindCatalogNavigation();
  bindSideNavigation();
  bindTabs();
  bindSqlWorkspace();
  bindApiWorkspace();
  bindOutputPorts();
  bindLandingModals();

  const loaders = [
    loadMetadata,
    loadOverview,
    loadInsights,
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
    document.getElementById("catalog-page").classList.add("hidden");
    document.getElementById("product-page").classList.remove("hidden");
  });

  document.getElementById("back-to-catalog-btn")?.addEventListener("click", () => {
    document.getElementById("product-page").classList.add("hidden");
    document.getElementById("catalog-page").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
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
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openWorkspacePanel(btn.dataset.panel);
    });
  });
}

function openWorkspacePanel(panelId, tabId = null) {
  if (!panelId) return;

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".workspace-panel").forEach(panel => panel.classList.remove("active"));

  document.getElementById(panelId)?.classList.add("active");

  const matchingNav = Array.from(document.querySelectorAll(".nav-btn"))
    .find(btn => btn.dataset.panel === panelId);

  if (matchingNav) matchingNav.classList.add("active");

  if (tabId) {
    activateTab(tabId);
  }
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activateTab(btn.dataset.tab);
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

function bindSqlWorkspace() {
  const editor = document.getElementById("sql-editor");
  const output = document.getElementById("sql-output");
  const defaultSql = `SELECT experience_id, company, role, start_date, end_date, domain
FROM experience
ORDER BY sort_order;`;

  if (editor) {
    editor.value = defaultSql;
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
    if (output) output.textContent = "Load a predefined query and submit.";
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

    const metaStatus = document.getElementById("meta-status");
	if (metaStatus) metaStatus.textContent = status;

    const metaRefresh = document.getElementById("meta-refresh");
    if (metaRefresh) metaRefresh.textContent = refresh;

    const metaType = document.getElementById("meta-type");
    if (metaType) metaType.textContent = type;

    const metaVersion = document.getElementById("meta-version");
    if (metaVersion) metaVersion.textContent = version;

    const metaOwner = document.getElementById("meta-owner");
    if (metaOwner) metaOwner.textContent = owner;

    function applyHealthStatus(elementId, value) {
      const el = document.getElementById(elementId);
      if (!el) return;

      el.textContent = value;

      const normalized = value.toLowerCase();
      if (
        normalized.includes("pass") ||
        normalized.includes("active") ||
        normalized.includes("operational")
      ) {
        el.classList.remove("muted");
      } else {
        el.classList.add("muted");
      }
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

async function loadInsights() {
  const grid = document.getElementById("insight-cards-grid");
  if (!grid) return;

  const insights = await fetchJson("/insights");
  grid.innerHTML = "";

  insights.forEach(insight => {
    const card = document.createElement("article");
    card.className = "insight-card";
    card.innerHTML = `
      <div class="insight-type">${escapeHtml(insight.type || "insight")}</div>
      <h3>${escapeHtml(insight.title || "")}</h3>
      <p><strong>${escapeHtml(insight.summary || "")}</strong></p>
      <p>${escapeHtml(insight.detail || "")}</p>
    `;
    grid.appendChild(card);
  });
}

async function loadVisualizations() {
  const [timeline, skillUtilization, projectsByExperience, feedbackThemes] = await Promise.all([
    fetchJson("/analytics/career-timeline"),
    fetchJson("/analytics/skill-utilization"),
    fetchJson("/analytics/projects-by-experience"),
    fetchJson("/analytics/feedback-themes")
  ]);

  renderTimeline("career-timeline-viz", timeline);
  renderSkillUtilization("skill-utilization-viz", skillUtilization.slice(0, 8));
  renderProjectsByExperience("projects-by-experience-viz", projectsByExperience);
  renderFeedbackThemes("feedback-themes-viz", "feedback-donut-legend", "feedback-drilldown", feedbackThemes);
}

function renderTimeline(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.textContent = "No timeline data available.";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `
      <div class="timeline-item-top">
        <span class="timeline-company">${escapeHtml(item.company)}</span>
        <span class="timeline-range">${formatMonthYear(item.start_date)} – ${formatMonthYear(item.end_date || "Present")}</span>
      </div>
      <h4>${escapeHtml(item.role)}</h4>
    `;
    container.appendChild(div);
  });
}

function renderSkillUtilization(containerId, items) {
  const container = document.getElementById(containerId);
  const drilldown = document.getElementById("skill-drilldown");
  if (!container || !drilldown) return;

  container.innerHTML = "";
  renderEmptyDetailState(
    drilldown,
    "Skill Drilldown",
    "Select a skill",
    "Click a bar to view the projects where that skill was applied."
  );

  if (!items || items.length === 0) {
    container.textContent = "No skill utilization data available.";
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
            <strong>${escapeHtml(item.skill_name)}</strong>
            <div class="viz-label-subtext">${escapeHtml(capitalize(item.category || "skill"))} • ${escapeHtml(capitalize(item.level || "applied"))}</div>
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
	  const data = await fetchJson(`/analytics/skill-projects/${item.skill_id}`);
	  const skill = data.skill || null;
	  const projects = data.projects || [];

	  renderProjectDrilldown(
		drilldown,
		{
		  eyebrow: "Skill Drilldown",
		  title: skill?.skill_name || item.skill_name,
		  meta: `${projects.length} linked project${projects.length === 1 ? "" : "s"}`,
		  chips: [
			capitalize(skill?.category || item.category || "skill"),
			capitalize(skill?.level || item.level || "applied")
		  ],
		  projects
		}
	  );
	} catch (error) {
	  renderEmptyDetailState(
		drilldown,
		"Skill Drilldown",
		"Unable to load projects",
		"There was a problem loading the selected skill detail."
	  );
	}
    });

    container.appendChild(button);
  });
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
    svg.querySelectorAll("[data-segment-index]").forEach(node => {
      const idx = Number(node.getAttribute("data-segment-index"));
      const segment = safeSegments[idx];

      node.setAttribute("title", `${segment.label}: ${segment.value}`);
      node.addEventListener("click", () => {
        onSelect?.(segment, idx);
      });
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
  try {
    const [targetOpportunity, rolePreferences, projects] = await Promise.all([
      fetchJson("/target-opportunity"),
      fetchJson("/role-preferences"),
      fetchJson("/projects")
    ]);

    const summaryEl = document.getElementById("target-opportunity-summary");
    if (summaryEl) {
      summaryEl.textContent = targetOpportunity.summary || "No summary available.";
    }

    const highlightSignals = uniqueItems([
      targetOpportunity.target_role_types?.[0],
      targetOpportunity.target_career_levels?.slice(0, 2).join(" / "),
      targetOpportunity.preferred_work_modes?.slice(0, 2).join(" / "),
      targetOpportunity.leadership_preference?.[0],
      targetOpportunity.travel_max ? `Travel ≤ ${targetOpportunity.travel_max}` : null
    ]);

    renderChipList("opportunity-highlight-chips", highlightSignals, { emphasis: true });

    renderChipList(
      "opportunity-role-shape",
      uniqueItems([
        ...(targetOpportunity.target_role_types || []).slice(0, 4),
        ...(targetOpportunity.target_career_levels || []).slice(0, 2)
      ])
    );

    renderChipList(
      "opportunity-work-context",
      uniqueItems([
        ...(targetOpportunity.preferred_work_modes || []).slice(0, 3),
        ...(targetOpportunity.preferred_locations || []).slice(0, 2),
        targetOpportunity.travel_max ? `Travel ≤ ${targetOpportunity.travel_max}` : null
      ])
    );

    renderChipList(
      "opportunity-problem-space",
      uniqueItems((targetOpportunity.focus_areas || []).slice(0, 6))
    );

    renderChipList(
      "opportunity-leadership-style",
      uniqueItems((targetOpportunity.leadership_preference || []).slice(0, 2))
    );

    const careerBrief = document.getElementById("target-career-level-brief");
    if (careerBrief) {
      careerBrief.textContent =
        (targetOpportunity.target_career_levels || []).slice(0, 2).join(" / ") || "Not specified";
    }

    const workModeBrief = document.getElementById("target-work-mode-brief");
    if (workModeBrief) {
      workModeBrief.textContent =
        (targetOpportunity.preferred_work_modes || []).slice(0, 2).join(" / ") || "Not specified";
    }

    const locationBrief = document.getElementById("target-location-brief");
    if (locationBrief) {
      locationBrief.textContent =
        (targetOpportunity.preferred_locations || []).slice(0, 2).join(" / ") || "Not specified";
    }

    const travelEl = document.getElementById("target-travel-max");
    if (travelEl) {
      travelEl.textContent = targetOpportunity.travel_max || "Not specified";
    }

    renderOpportunityEvidence(projects || []);
    renderRolePreferenceGroups(rolePreferences || []);
  } catch (error) {
    console.error("Failed to load next opportunity:", error);

    const summaryEl = document.getElementById("target-opportunity-summary");
    if (summaryEl) {
      summaryEl.textContent = "Unable to load target opportunity insight.";
    }

    const evidenceEl = document.getElementById("opportunity-evidence-list");
    if (evidenceEl) {
      evidenceEl.innerHTML = `<div class="opportunity-evidence-item">Supporting evidence unavailable.</div>`;
    }

    const prefEl = document.getElementById("role-preferences-groups");
    if (prefEl) {
      prefEl.textContent = "Role preferences unavailable.";
    }
  }
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
