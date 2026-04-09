(() => {
  const VIEW_PROFILE = "profile";
  const VIEW_DISTRIBUTION = "distribution";

  const QUADRANTS = [
    { key: "all", label: "Full Matrix" },
    { key: "expertise", label: "Expertise" },
    { key: "emerging", label: "Emerging" },
    { key: "foundational", label: "Foundational" },
    { key: "passive", label: "Passive" }
  ];

  const MATRIX_POINT_COLOR = "#6fa3e6";
  const MATRIX_SELECTED_COLOR = "#0a6ed1";

  const QUADRANT_RANGES = {
    all: { x: [0.5, 4.28], y: [-0.08, 3.15] },
    expertise: { x: [2.72, 4.12], y: [1.72, 3.08] },
    emerging: { x: [2.72, 4.12], y: [-0.02, 1.18] },
    foundational: { x: [0.88, 2.18], y: [-0.02, 1.18] },
    passive: { x: [0.88, 2.18], y: [1.72, 3.08] }
  };

  let skills = [];
  let domains = [];
  let topLevelView = VIEW_PROFILE;
  let activeDomain = null;
  let activeQuadrant = "all";
  let activeGraphDiv = null;
  let selectedPointKey = null;
  let isChartHelpOpen = false;
  let isScoringHelpOpen = false;
  let inventoryModalTriggerEl = null;
  let capabilityApiBase = "";
  let initialized = false;
  let resizeHandlerBound = false;
  let postRenderResizeTimeout = null;
  let currentPlotHeight = 720;

  const els = {};
  const touchState = {
    lastTapKey: null,
    lastTapAt: 0
  };

  /* =========================
     PUBLIC API
  ========================= */

window.initCapabilityInsights = async function initCapabilityInsights(apiBase) {
  capabilityApiBase = apiBase;

  cacheElements();

  const response = await fetch(`${capabilityApiBase}/analytics/capability-insights-dashboard`);
  if (!response.ok) {
    throw new Error(`Capability Insights failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  skills = normalizeSkills(Array.isArray(payload.skills) ? payload.skills : []);
  domains = buildDomainCollection(skills);

  buildExplorer();
  buildChartViewToggle();
  buildQuadrantControls();
  buildChartToolbar();
  buildInventoryTable();
  setScoringHelpContent();
  setInventoryRecency();
  bindInventoryModalEvents();
  bindCapabilityEvents();
  updateOrientationOverlay();

  const tabIsActive = document.getElementById("capability-insights-tab")?.classList.contains("active");
  if (tabIsActive) {
    window.refreshCapabilityInsights();
  }
  
  if (!resizeHandlerBound) {
    const handleViewportChange = debounce(() => {
      updateOrientationOverlay();

      const tabStillActive = document.getElementById("capability-insights-tab")?.classList.contains("active");

      if (tabStillActive) {
        window.refreshCapabilityInsights();
      }

      if (isChartHelpOpen) {
        requestAnimationFrame(() => setChartHelpOpen(true));
      }

      if (isScoringHelpOpen) {
        requestAnimationFrame(() => setScoringHelpOpen(true));
      }
    }, 120);

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    document.addEventListener("click", dismissTooltipFromOutsideInteraction);
    document.addEventListener("keydown", handleGlobalKeydown);
    resizeHandlerBound = true;
  }

  initialized = true;
};

window.refreshCapabilityInsights = function refreshCapabilityInsights() {
  cacheElements();
  updateOrientationOverlay();

  const insightsPanelActive = document.getElementById("insights-panel")?.classList.contains("active");
  const tabActive = document.getElementById("capability-insights-tab")?.classList.contains("active");

  if (!insightsPanelActive || !tabActive) return;
  if (!window.Plotly) return;
  if (!els.chart) return;

  const chartCard = els.chart.closest(".capability-chart-card");

  const renderWhenReady = (attempt = 0) => {
    const chartRect = els.chart.getBoundingClientRect();
    const cardRect = chartCard?.getBoundingClientRect();

    const ready =
      !!cardRect &&
      cardRect.width > 0 &&
      cardRect.height > 0 &&
      chartRect.width > 0 &&
      getComputedStyle(els.chart).display !== "none" &&
      getComputedStyle(chartCard).display !== "none";

    if (ready) {
      window.clearTimeout(postRenderResizeTimeout);
      renderChart();

      postRenderResizeTimeout = window.setTimeout(() => {
        if (activeGraphDiv && window.Plotly) {
          window.Plotly.Plots.resize(activeGraphDiv);
        }
      }, 120);

      if (isChartHelpOpen) {
        requestAnimationFrame(() => setChartHelpOpen(true));
      }

      if (isScoringHelpOpen) {
        requestAnimationFrame(() => setScoringHelpOpen(true));
      }

      return;
    }

    if (attempt < 14) {
      window.setTimeout(() => renderWhenReady(attempt + 1), 50);
    }
  };

  renderWhenReady();
};

  /* =========================
     ELEMENT CACHE
  ========================= */

  function cacheElements() {
    els.tab = document.getElementById("capability-insights-tab");
    els.chart = document.getElementById("capability-chart");
    els.chartTitle = document.getElementById("capability-chart-title");
    els.chartInstruction = document.getElementById("capability-chart-instruction");
    els.chartTooltip = document.getElementById("capability-chart-tooltip");
    els.chartBackButton = document.getElementById("capability-chart-back-button");
    els.chartHelpButton = document.getElementById("capability-chart-help-button");
    els.chartHelpPopover = document.getElementById("capability-chart-help-popover");
    els.chartHelpTitle = document.getElementById("capability-chart-help-title");
    els.chartHelpBody = document.getElementById("capability-chart-help-body");
    els.chartViewToggleWrap = document.getElementById("capability-chart-view-toggle-wrap");
    els.chartViewToggle = document.getElementById("capability-chart-view-toggle");
    els.quadrantControlsWrap = document.getElementById("capability-quadrant-controls-wrap");
    els.quadrantControls = document.getElementById("capability-quadrant-controls");
    els.explorer = document.getElementById("capability-explorer");
    els.inventoryModalOpen = document.getElementById("capability-inventory-modal-open");
    els.inventoryModal = document.getElementById("capability-inventory-modal");
    els.inventoryModalBackdrop = document.getElementById("capability-inventory-modal-backdrop");
    els.inventoryModalClose = document.getElementById("capability-inventory-modal-close");
    els.inventoryTableBody = document.getElementById("capability-inventory-table-body");
    els.inventoryRecency = document.getElementById("capability-inventory-recency");
    els.scoringHelpButton = document.getElementById("capability-scoring-help-button");
    els.scoringHelpPopover = document.getElementById("capability-scoring-help-popover");
    els.orientationOverlay = document.getElementById("capability-orientation-overlay");
  }

  /* =========================
     NORMALIZATION
  ========================= */

  function normalizeSkills(rawSkills) {
    return rawSkills
      .map((skill, index) => {
        const domain = skill.domain || "Unassigned";
        const depth = Number(skill.depth ?? 0);
        const experience = Number(skill.experience ?? 0);
        const confidence = Number(skill.confidence ?? 0);
        const domainSortOrder = Number(skill.domain_sort_order ?? skill.sort_order ?? 999);
        const displayOrder = Number(skill.display_order ?? 999);

        return {
          ...skill,
          id: String(skill.skill_id ?? `${domain}-${skill.skill_name}-${index}`),
          domain,
          domain_id: Number(skill.domain_id),
          domain_sort_order: domainSortOrder,
          display_order: displayOrder,
          skill_name: skill.skill_name || "Unnamed Skill",
          depth,
          experience,
          confidence,
          notes: skill.notes || "No supporting notes provided.",
          depthLabel: depthLabel(depth),
          experienceLabel: experienceLabel(experience),
          profileTierKey: getProfileTierKey(depth),
          jitteredDepth: depth,
          jitteredExperience: experience
        };
      })
      .sort((a, b) => {
        if (a.domain_sort_order !== b.domain_sort_order) return a.domain_sort_order - b.domain_sort_order;
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        return a.skill_name.localeCompare(b.skill_name);
      });
  }

  function buildDomainCollection(skillRows) {
    const map = new Map();

    skillRows.forEach((skill) => {
      if (!map.has(skill.domain_id)) {
        map.set(skill.domain_id, {
          domain_id: skill.domain_id,
          domain: skill.domain,
          sort_order: skill.domain_sort_order,
          summary: skill.domain_summary || "",
          skills: []
        });
      }

      map.get(skill.domain_id).skills.push(skill);
    });

    return Array.from(map.values())
      .map((domain) => {
        const items = domain.skills;
        const expertiseCount = items.filter((item) => item.depth >= 4).length;
        const appliedCount = items.filter((item) => item.experience >= 2).length;
        const avgConfidence = items.length
          ? Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length)
          : 0;

        return {
          ...domain,
          skill_count: items.length,
          expertise_count: expertiseCount,
          applied_count: appliedCount,
          avg_confidence: avgConfidence
        };
      })
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.domain.localeCompare(b.domain);
      });
  }

  /* =========================
     LABELS / HELPERS
  ========================= */

  function depthLabel(depth) {
    if (depth >= 4) return "Expertise";
    if (depth === 3) return "Applied";
    if (depth === 2) return "Foundational";
    if (depth === 1) return "Awareness";
    return "Unscored";
  }

  function experienceLabel(experience) {
    if (experience >= 3) return "Owned";
    if (experience === 2) return "Applied";
    if (experience === 1) return "Exposure";
    return "Awareness";
  }

  function boundedJitter(value, min, max, index, axis) {
    const seed = ((index + 1) * (axis === "x" ? 97 : 131)) % 1000;
    const normalized = (Math.sin(seed) + Math.cos(seed / 2)) * 0.5;
    const jitter = normalized * 0.18;
    const next = value + jitter;
    return Math.max(min + 0.04, Math.min(max - 0.04, next));
  }

    function spreadSkillPoints(items, quadrantKey = "all") {
    const grouped = new Map();

    items.forEach((item) => {
      const key = `${item.depth}|${item.experience}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    const range = QUADRANT_RANGES[quadrantKey] || QUADRANT_RANGES.all;
    const spreadItems = [];

    grouped.forEach((groupItems) => {
      const count = groupItems.length;

      if (count === 1) {
        spreadItems.push({
          ...groupItems[0],
          jitteredDepth: clamp(groupItems[0].depth, range.x[0] + 0.03, range.x[1] - 0.03),
          jitteredExperience: clamp(groupItems[0].experience, range.y[0] + 0.03, range.y[1] - 0.03)
        });
        return;
      }

      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);

      const xStep = count <= 4 ? 0.09 : 0.12;
      const yStep = count <= 4 ? 0.09 : 0.12;

      const xOffsetBase = ((columns - 1) * xStep) / 2;
      const yOffsetBase = ((rows - 1) * yStep) / 2;

      groupItems.forEach((item, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);

        const nextDepth = clamp(
          item.depth + (col * xStep) - xOffsetBase,
          range.x[0] + 0.04,
          range.x[1] - 0.04
        );

        const nextExperience = clamp(
          item.experience + (row * yStep) - yOffsetBase,
          range.y[0] + 0.04,
          range.y[1] - 0.04
        );

        spreadItems.push({
          ...item,
          jitteredDepth: nextDepth,
          jitteredExperience: nextExperience
        });
      });
    });

    return spreadItems;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isTouchLikeDevice() {
    return (
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      navigator.maxTouchPoints > 0 ||
      "ontouchstart" in window
    );
  }

  function getProfileTierKey(depth) {
    if (depth >= 4) return "high";
    if (depth === 3) return "moderate";
    return "low";
  }

  function getTierLabel(key) {
    if (key === "high") return "Expertise";
    if (key === "moderate") return "Applied";
    return "Foundational";
  }

  function getTierColor(key) {
    if (key === "high") return "#0a6ed1";
    if (key === "moderate") return "#c6dcfb";
    return "#e3eaf3";
  }

  function getHighlightedTierColor() {
    return "#0854a0";
  }

  function requiresTouchDoubleTap() {
    return isTouchLikeDevice() && window.innerWidth <= 920;
  }

  function rgba(hex, alpha) {
    const value = hex.replace("#", "");
    const bigint = parseInt(value, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const bigint = parseInt(value, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  function getDomainById(domainId) {
    return domains.find((domain) => Number(domain.domain_id) === Number(domainId)) || null;
  }

  function getSkillsForDomain(domainId) {
    const items = skills.filter((item) => Number(item.domain_id) === Number(domainId));

    if (activeQuadrant === "expertise") {
      return items.filter((item) => item.depth >= 3 && item.experience >= 2);
    }

    if (activeQuadrant === "emerging") {
      return items.filter((item) => item.depth >= 3 && item.experience <= 1);
    }

    if (activeQuadrant === "foundational") {
      return items.filter((item) => item.depth <= 2 && item.experience <= 1);
    }

    if (activeQuadrant === "passive") {
      return items.filter((item) => item.depth <= 2 && item.experience >= 2);
    }

    return items;
  }

function getPlotHeight() {
  const isMobile = window.innerWidth <= 720;
  const isTablet = window.innerWidth <= 1100 && !isMobile;

  if (isMobile) {
    return activeDomain ? 460 : 440;
  }

  if (isTablet) {
    return activeDomain ? 560 : 540;
  }

  const workspace = els.chart?.closest(".capability-workspace");
  const controlPanel = workspace?.querySelector(".capability-control-panel");
  const chartCard = els.chart?.closest(".capability-chart-card");
  const toolbar = chartCard?.querySelector(".chart-toolbar");

  if (controlPanel && chartCard && toolbar) {
    const chartCardStyle = getComputedStyle(chartCard);
    const paddingTop = parseFloat(chartCardStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(chartCardStyle.paddingBottom) || 0;

    const availableHeight =
      controlPanel.offsetHeight -
      toolbar.offsetHeight -
      paddingTop -
      paddingBottom -
      8;

    if (Number.isFinite(availableHeight) && availableHeight > 620) {
      return Math.round(availableHeight);
    }
  }

  const workspaceRect = workspace?.getBoundingClientRect();
  if (workspaceRect) {
    const viewportHeight = window.innerHeight;
    const bottomMargin = 24;
    const availableViewportHeight = viewportHeight - workspaceRect.top - bottomMargin;

    if (Number.isFinite(availableViewportHeight) && availableViewportHeight > 720) {
      return Math.round(availableViewportHeight - 40);
    }
  }

  return 720;
}
function stabilizeActivePlot() {
  if (!window.Plotly || !activeGraphDiv) return;

  const resizePlot = () => {
    if (!activeGraphDiv || !document.body.contains(activeGraphDiv)) return;
    window.Plotly.Plots.resize(activeGraphDiv);
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizePlot();
    });
  });

  window.clearTimeout(postRenderResizeTimeout);
  postRenderResizeTimeout = window.setTimeout(() => {
    resizePlot();
  }, 120);
}

  /* =========================
     TOOLBAR / TOGGLES
  ========================= */

  function buildChartToolbar() {
    if (!els.chartBackButton) return;

    const isDomainView = !!activeDomain;

    els.chartBackButton.classList.toggle("is-visible", isDomainView);

    if (els.chartViewToggleWrap) {
      els.chartViewToggleWrap.classList.toggle("is-hidden", isDomainView);
    }

    if (els.quadrantControlsWrap) {
      els.quadrantControlsWrap.classList.toggle("is-hidden", !isDomainView);
    }

    if (!els.chartTitle || !els.chartInstruction) return;

    if (isDomainView) {
      const domain = getDomainById(activeDomain);
      els.chartTitle.textContent = domain
        ? `${domain.domain} · Skill Matrix`
        : "Skill Matrix";
      els.chartInstruction.textContent =
        "Hover or tap any point to inspect the skill. Use Focus View to isolate quadrants.";
    } else if (topLevelView === VIEW_PROFILE) {
      els.chartTitle.textContent = "Capability Profile by Domain";
      els.chartInstruction.textContent =
        "Hover for detail. On touch devices, tap once to inspect and tap again to view the matrix.";
    } else {
      els.chartTitle.textContent = "Domain Distribution";
      els.chartInstruction.textContent =
        "Hover for detail. On touch devices, tap once to inspect and tap again to view the matrix.";
    }

    updateChartHelpContent();
  }

  function buildChartViewToggle() {
    if (!els.chartViewToggle) return;

    els.chartViewToggle.innerHTML = "";

    const buttons = [
      { key: VIEW_PROFILE, label: "Capability Profile" },
      { key: VIEW_DISTRIBUTION, label: "Domain Distribution" },
      { key: "quick-scan", label: "Quick Scan" }
    ];

    buttons.forEach((button) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "chart-view-btn";
      element.textContent = button.label;

      if (button.key === topLevelView && button.key !== "quick-scan") {
        element.classList.add("active");
      }

      element.addEventListener("click", () => {
        if (button.key === "quick-scan") {
          openInventoryModal();
          return;
        }

        topLevelView = button.key;
        activeDomain = null;
        selectedPointKey = null;
        hideTooltip();
        clearSelectedPoint();
        buildChartToolbar();
        buildChartViewToggle();
        buildExplorer();
        renderChart();
      });

      els.chartViewToggle.appendChild(element);
    });
  }

  function buildQuadrantControls() {
    if (!els.quadrantControls) return;

    els.quadrantControls.innerHTML = "";

    QUADRANTS.forEach((quadrant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quadrant-btn";
      button.textContent = quadrant.label;

      if (quadrant.key === activeQuadrant) {
        button.classList.add("active");
      }

      button.addEventListener("click", () => {
        activeQuadrant = quadrant.key;
        selectedPointKey = null;
        hideTooltip();
        buildQuadrantControls();
        renderChart();
      });

      els.quadrantControls.appendChild(button);
    });
  }

  /* =========================
     EXPLORER
  ========================= */

  function buildExplorer() {
    if (!els.explorer) return;

    els.explorer.innerHTML = domains
      .map((domain) => {
        const isActive = Number(activeDomain) === Number(domain.domain_id);

        return `
          <div class="explorer-domain">
            <button
              class="explorer-domain-header ${isActive ? "active" : ""}"
              type="button"
              data-domain-id="${domain.domain_id}"
            >
              <div class="explorer-domain-title-wrap">
                <div class="explorer-domain-text">
                  <p class="explorer-domain-title">${escapeHtml(domain.domain)}</p>
                  <p class="explorer-domain-meta">${domain.skill_count} skills</p>
                </div>
              </div>

              <div class="explorer-domain-actions">
                <span class="domain-toggle-indicator ${isActive ? "active" : ""}">
                  ${isActive ? "OPEN" : "VIEW"}
                </span>
              </div>
            </button>
          </div>
        `;
      })
      .join("");

    els.explorer.querySelectorAll(".explorer-domain-header").forEach((button) => {
      button.addEventListener("click", () => {
        const domainId = Number(button.getAttribute("data-domain-id"));
        openDomain(domainId);
      });
    });
  }

  function openDomain(domainId) {
    activeDomain = Number(domainId);
    activeQuadrant = "all";
    selectedPointKey = null;
    hideTooltip();
    buildChartToolbar();
    buildQuadrantControls();
    buildExplorer();
    renderChart();
    scrollChartCardToTop();
  }

  function returnToDomainOverview() {
    activeDomain = null;
    activeQuadrant = "all";
    selectedPointKey = null;
    hideTooltip();
    buildChartToolbar();
    buildQuadrantControls();
    buildChartViewToggle();
    buildExplorer();
    renderChart();
  }

  function scrollChartCardToTop() {
    const chartCard = els.chart?.closest(".capability-chart-card");
    if (!chartCard) return;
    chartCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* =========================
     HELP POPOVERS
  ========================= */

  function getChartHelpContent() {
  if (activeDomain) {
    return {
      title: "How to read the skill matrix",
      body: `
        <div class="chart-help-section">
          <strong>What this view shows</strong>
          <p>Each point is a skill within the selected domain.</p>
        </div>

        <div class="chart-help-section">
          <strong>X-axis: Depth (1–4)</strong>
          <p>How deeply the capability is understood and used.</p>
        </div>

        <div class="chart-help-section">
          <strong>Y-axis: Experience (0–3)</strong>
          <p>How much real-world application and ownership is evidenced.</p>
        </div>

        <div class="chart-help-section">
          <strong>How to use it</strong>
          <p>Top-right = strongest ownership.<br>Bottom-left = foundational awareness.<br>Hover to inspect. On touch devices, tap to inspect.</p>
        </div>

        <div class="chart-help-section">
          <strong>Tip</strong>
          <p>Use Focus View to isolate quadrants and inspect strengths.</p>
        </div>
      `
    };
  }

  if (topLevelView === VIEW_PROFILE) {
    return {
      title: "How to read the capability profile",
      body: `
        <div class="chart-help-section">
          <strong>What this view shows</strong>
          <p>Each bar is one domain and always totals 100%.</p>
        </div>

        <div class="chart-help-section">
          <strong>Skill Depth Segments</strong>
          <ul>
            <li><span class="help-dot low"></span> Foundational → supporting skills</li>
            <li><span class="help-dot moderate"></span> Moderate → growing applied capability</li>
            <li><span class="help-dot high"></span> Expertise → deepest concentration</li>
          </ul>
        </div>

        <div class="chart-help-section">
          <strong>How to use it</strong>
          <p>Use this view to understand capability shape. Hover to inspect. On touch devices, tap once to inspect and tap again to open the domain skill matrix.</p>
        </div>
      `
    };
  }

  return {
    title: "How to read the domain distribution",
    body: `
      <div class="chart-help-section">
        <strong>What you’re seeing</strong>
        <p>Each bar represents a domain. Longer bar = greater overall breadth.</p>
      </div>

      <div class="chart-help-section">
        <strong>Skill depth segments</strong>
        <ul>
          <li><span class="help-dot low"></span> Foundational → awareness</li>
          <li><span class="help-dot moderate"></span> Moderate → applied/conceptual</li>
          <li><span class="help-dot high"></span> Expertise → expert-level capability</li>
        </ul>
      </div>

      <div class="chart-help-section">
        <strong>How to use it</strong>
        <p>Use this view to understand absolute breadth by domain. Hover to inspect. On touch devices, tap once to inspect and tap again to open the domain skill matrix.</p>
      </div>
    `
  };
}

  function updateChartHelpContent() {
    if (!els.chartHelpTitle || !els.chartHelpBody) return;
    const content = getChartHelpContent();
    els.chartHelpTitle.textContent = content.title;
    els.chartHelpBody.innerHTML = content.body;
  }

  function getChartHelpPopoverPosition() {
    if (!els.chartHelpButton) return { top: 84, left: 12 };

    const rect = els.chartHelpButton.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 40);
    const left = clamp(rect.left + rect.width / 2 - popoverWidth / 2, 12, window.innerWidth - popoverWidth - 12);
    const top = rect.bottom + 10;

    return { top, left };
  }

  function setChartHelpOpen(shouldOpen) {
    if (!els.chartHelpPopover || !els.chartHelpButton) return;

    isChartHelpOpen = shouldOpen;
    els.chartHelpButton.classList.toggle("is-active", shouldOpen);
    els.chartHelpButton.setAttribute("aria-expanded", String(shouldOpen));
    els.chartHelpPopover.classList.toggle("is-visible", shouldOpen);
    els.chartHelpPopover.setAttribute("aria-hidden", String(!shouldOpen));

    const mobileDocked = window.innerWidth <= 720;
    els.chartHelpPopover.classList.toggle("is-docked-mobile", shouldOpen && mobileDocked);

    if (shouldOpen) {
      const pos = getChartHelpPopoverPosition();
      els.chartHelpPopover.style.top = `${mobileDocked ? 78 : pos.top}px`;
      els.chartHelpPopover.style.left = `${mobileDocked ? 10 : pos.left}px`;
    }
  }

  function toggleChartHelp() {
    setChartHelpOpen(!isChartHelpOpen);
  }

  function getScoringHelpPopoverPosition() {
    if (!els.scoringHelpButton) return { top: 84, left: 12 };

    const rect = els.scoringHelpButton.getBoundingClientRect();
    const width = Math.min(window.innerWidth <= 920 ? 620 : 560, window.innerWidth - 40);
    const left = clamp(rect.left, 12, window.innerWidth - width - 12);
    const top = rect.bottom + 8;

    return { top, left };
  }

  function setScoringHelpOpen(shouldOpen) {
    if (!els.scoringHelpPopover || !els.scoringHelpButton) return;

    isScoringHelpOpen = shouldOpen;
    els.scoringHelpButton.classList.toggle("is-active", shouldOpen);
    els.scoringHelpButton.setAttribute("aria-expanded", String(shouldOpen));
    els.scoringHelpPopover.classList.toggle("is-visible", shouldOpen);
    els.scoringHelpPopover.setAttribute("aria-hidden", String(!shouldOpen));

    const mobileDocked = window.innerWidth <= 720;
    els.scoringHelpPopover.classList.toggle("is-docked-mobile", shouldOpen && mobileDocked);

    if (shouldOpen) {
      const pos = getScoringHelpPopoverPosition();
      els.scoringHelpPopover.style.top = `${mobileDocked ? 78 : pos.top}px`;
      els.scoringHelpPopover.style.left = `${mobileDocked ? 10 : pos.left}px`;
    }
  }

  function toggleScoringHelp() {
    setScoringHelpOpen(!isScoringHelpOpen);
  }

  /* =========================
     INVENTORY MODAL
  ========================= */

  function buildInventoryTable() {
    if (!els.inventoryTableBody) return;

    const sorted = [...skills].sort((a, b) => {
      if (a.domain_sort_order !== b.domain_sort_order) return a.domain_sort_order - b.domain_sort_order;
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.skill_name.localeCompare(b.skill_name);
    });

    els.inventoryTableBody.innerHTML = sorted
      .map((item) => {
        return `
          <tr>
            <td class="inventory-domain-cell">${escapeHtml(item.domain)}</td>
            <td class="inventory-skill-cell">${escapeHtml(item.skill_name)}</td>
            <td><span class="inventory-metric-pill">${item.depth}</span></td>
            <td><span class="inventory-metric-pill">${item.experience}</span></td>
            <td><span class="inventory-metric-pill">${item.confidence}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  function setScoringHelpContent() {
    if (!els.scoringHelpPopover) return;

    els.scoringHelpPopover.innerHTML = `
      <p class="chart-help-title">How scoring works</p>

      <div class="chart-help-body scoring-help-body">
        <div class="chart-help-section">
          <strong>Depth</strong> reflects level of understanding (1–4):
        </div>

        <div class="chart-help-section">
          <ul>
            <li><span class="help-number">1</span> - <strong>Awareness:</strong> understands concepts and terminology</li>
            <li><span class="help-number">2</span> - <strong>Conceptual:</strong> understands how it works and where it applies</li>
            <li><span class="help-number">3</span> - <strong>Applied:</strong> has used in real work or design contexts</li>
            <li><span class="help-number">4</span> - <strong>Expert:</strong> core strength used to shape systems or outcomes</li>
          </ul>
        </div>

        <div class="chart-help-section">
          <strong>Experience</strong> reflects real-world application (0–3):
        </div>

        <div class="chart-help-section">
          <ul>
            <li><span class="help-number">0</span> - <strong>None:</strong> no applied experience</li>
            <li><span class="help-number">1</span> - <strong>Exposure:</strong> limited hands-on use or learning</li>
            <li><span class="help-number">2</span> - <strong>Applied:</strong> used in real work with meaningful contribution</li>
            <li><span class="help-number">3</span> - <strong>Owned:</strong> repeated ownership and decision responsibility</li>
          </ul>
        </div>

        <div class="chart-help-section scoring-help-footer">
          Scores are derived from resume evidence, portfolio artifacts, and supported inference where direct evidence is limited.
        </div>

        <div class="chart-help-section scoring-help-footer">
          <strong>Depth and experience are intentionally separated</strong> to distinguish conceptual strength from applied ownership.
        </div>
      </div>
    `;
  }
  
  function setInventoryRecency() {
    if (!els.inventoryRecency) return;

    const now = new Date();
    const monthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    els.inventoryRecency.textContent = `Data Snapshot: ${monthYear}`;
  }
  
  function openInventoryModal() {
    if (!els.inventoryModal) return;
    inventoryModalTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    els.inventoryModal.classList.add("is-visible");
    els.inventoryModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeInventoryModal() {
    if (!els.inventoryModal) return;
    els.inventoryModal.classList.remove("is-visible");
    els.inventoryModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (inventoryModalTriggerEl?.focus) {
      inventoryModalTriggerEl.focus();
    }
  }

  function bindInventoryModalEvents() {
    if (els.inventoryModalOpen) {
      els.inventoryModalOpen.addEventListener("click", openInventoryModal);
    }

    if (els.inventoryModalClose) {
      els.inventoryModalClose.addEventListener("click", closeInventoryModal);
    }

    if (els.inventoryModalBackdrop) {
      els.inventoryModalBackdrop.addEventListener("click", closeInventoryModal);
    }
  }

  /* =========================
     TOOLTIP
  ========================= */

  function getDomainSummaries() {
    return domains.map((domain) => {
      const items = skills.filter((item) => Number(item.domain_id) === Number(domain.domain_id));
      const lowItems = items.filter((item) => item.profileTierKey === "low");
      const moderateItems = items.filter((item) => item.profileTierKey === "moderate");
      const highItems = items.filter((item) => item.profileTierKey === "high");
      const total = items.length || 1;

      const avgConfidenceFor = (rows) => {
        if (!rows.length) return 0;
        return Math.round(rows.reduce((sum, item) => sum + item.confidence, 0) / rows.length);
      };

      return {
        ...domain,
        lowCount: lowItems.length,
        moderateCount: moderateItems.length,
        highCount: highItems.length,
        lowPct: (lowItems.length / total) * 100,
        moderatePct: (moderateItems.length / total) * 100,
        highPct: (highItems.length / total) * 100,
        lowAvgConfidence: avgConfidenceFor(lowItems),
        moderateAvgConfidence: avgConfidenceFor(moderateItems),
        highAvgConfidence: avgConfidenceFor(highItems)
      };
    });
  }

  function getProfileDomainSummaries() {
    return getDomainSummaries();
  }

  function buildTooltipHtml(point) {
    if (point?.pointType === "skill") {
      const skill = point.payload;
      return `
        <div class="chart-tooltip-title">${escapeHtml(skill.skill_name)}</div>
        <div class="chart-tooltip-domain">${escapeHtml(skill.domain)}</div>
        <div class="chart-tooltip-meta">
          <div>Depth: <strong>${skill.depth}</strong> (${escapeHtml(skill.depthLabel)})</div>
          <div>Experience: <strong>${skill.experience}</strong> (${escapeHtml(skill.experienceLabel)})</div>
          <div>Confidence: <strong>${skill.confidence}</strong></div>
        </div>
        <div class="chart-tooltip-evidence">Evidence: ${escapeHtml(skill.notes)}</div>
      `;
    }

    if (point?.pointType === "profile-segment") {
      const segment = point.payload;
      return `
        <div class="chart-tooltip-title">${escapeHtml(segment.domain)}</div>
        <div class="chart-tooltip-domain">${segment.skill_count} skills in Domain</div>
        <div class="chart-tooltip-meta">
          <div>Segment: <strong>${escapeHtml(segment.segmentLabel)}</strong></div>
          <div>${escapeHtml(segment.segmentLabel)} Skills: <strong>${Math.round(segment.segmentPct)}%</strong></div>
          <div>Average Confidence: <strong>${segment.avg_confidence}</strong></div>
        </div>
        <div class="chart-tooltip-evidence">${escapeHtml(segment.summary || "Capability concentration within this domain.")}</div>
      `;
    }

    if (point?.pointType === "distribution-segment") {
      const segment = point.payload;
      return `
        <div class="chart-tooltip-title">${escapeHtml(segment.domain)}</div>
        <div class="chart-tooltip-domain">${segment.skill_count} skills in Domain</div>
        <div class="chart-tooltip-meta">
          <div>Segment: <strong>${escapeHtml(segment.segmentLabel)}</strong></div>
          <div>${escapeHtml(segment.segmentLabel)} Skills: <strong>${segment.segmentCount}</strong></div>
          <div>Average Confidence: <strong>${segment.avg_confidence}</strong></div>
        </div>
        <div class="chart-tooltip-evidence">${escapeHtml(segment.summary || "Capability distribution across this domain.")}</div>
      `;
    }

    return "";
  }
  
  function positionTooltip(clientX, clientY) {
    if (!els.chartTooltip) return;

    const chartCard = els.chart?.closest(".capability-chart-card");
    const chartRect = els.chart?.getBoundingClientRect();
    const cardRect = chartCard?.getBoundingClientRect();

    if (!chartRect || !cardRect) return;

    const tooltipRect = els.chartTooltip.getBoundingClientRect();
    const gap = 14;
    const padding = 12;
    const desktopMinTop = 86;

    els.chartTooltip.classList.remove("is-docked", "is-docked-mobile", "is-mobile-fixed");
    els.chartTooltip.style.bottom = "auto";

    if (window.innerWidth <= 720) {
      const mobileTop = Math.max(
        desktopMinTop,
        chartRect.bottom - cardRect.top - tooltipRect.height - padding
      );

      els.chartTooltip.style.left = "12px";
      els.chartTooltip.style.top = `${mobileTop}px`;
      return;
    }

    const useDockedMode = requiresTouchDoubleTap();

    if (useDockedMode) {
      const dockedTop = Math.max(
        desktopMinTop,
        chartRect.bottom - cardRect.top - tooltipRect.height - padding
      );

      els.chartTooltip.classList.add("is-docked");
      els.chartTooltip.style.left = "12px";
      els.chartTooltip.style.top = `${dockedTop}px`;
      return;
    }

    let left = clientX - cardRect.left + gap;
    let top = clientY - cardRect.top + gap;

    const minLeft = padding;
    const maxLeft = Math.max(minLeft, cardRect.width - tooltipRect.width - padding);
    const minTop = desktopMinTop;
    const maxTop = Math.max(minTop, chartRect.bottom - cardRect.top - tooltipRect.height - padding);

    if (left > maxLeft) {
      left = clientX - cardRect.left - tooltipRect.width - gap;
    }

    if (top > maxTop) {
      top = clientY - cardRect.top - tooltipRect.height - gap;
    }

    left = Math.max(minLeft, Math.min(left, maxLeft));
    top = Math.max(minTop, Math.min(top, maxTop));

    els.chartTooltip.style.left = `${left}px`;
    els.chartTooltip.style.top = `${top}px`;
  }

  function showTooltip(point, clientX, clientY) {
    if (!els.chartTooltip) return;
    const html = buildTooltipHtml(point);
    if (!html) return;

    els.chartTooltip.innerHTML = html;
    els.chartTooltip.classList.add("is-visible");
    positionTooltip(clientX, clientY);
  }

  function hideTooltip() {
    if (!els.chartTooltip) return;
    els.chartTooltip.classList.remove("is-visible");
    els.chartTooltip.innerHTML = "";
  }

  function applySelectedPoint(pointKey) {
    selectedPointKey = pointKey;
  }

  function clearSelectedPoint() {
    selectedPointKey = null;
  }

  function dismissTooltipFromOutsideInteraction(event) {
    const target = event.target;

    if (
      els.chartTooltip?.contains(target) ||
      els.chartHelpPopover?.contains(target) ||
      els.chartHelpButton?.contains(target) ||
      els.scoringHelpPopover?.contains(target) ||
      els.scoringHelpButton?.contains(target) ||
      els.inventoryModal?.contains(target)
    ) {
      return;
    }

    hideTooltip();

    if (isChartHelpOpen) {
      setChartHelpOpen(false);
    }

    if (isScoringHelpOpen) {
      setScoringHelpOpen(false);
    }
  }

  function handleGlobalKeydown(event) {
    if (event.key === "Escape") {
      hideTooltip();
      setChartHelpOpen(false);
      setScoringHelpOpen(false);

      if (els.inventoryModal?.classList.contains("is-visible")) {
        closeInventoryModal();
      }
    }
  }

  function getTraceTierKey(traceName) {
    if (traceName === "Expertise") return "high";
    if (traceName === "Applied") return "moderate";
    return "low";
  }

  /* =========================
     CHART RENDERING
  ========================= */

  function renderChart() {
    if (!els.chart) return;
    if (!window.Plotly) {
      els.chart.innerHTML = "<p>Plotly is required for Capability Insights.</p>";
      return;
    }

    buildChartToolbar();

    currentPlotHeight = getPlotHeight();
    els.chart.style.height = `${currentPlotHeight}px`;

    if (activeGraphDiv) {
      window.Plotly.purge(els.chart);
      activeGraphDiv = null;
    }

    if (activeDomain) {
      renderSkillChart();
      return;
    }

    if (topLevelView === VIEW_PROFILE) {
      renderProfileChart();
      return;
    }

    renderDomainChart();
  }
  
  function renderProfileChart() {
    const rows = getProfileDomainSummaries();
    const y = rows.map((row) => row.domain);

    const traces = [
      {
        type: "bar",
        orientation: "h",
        name: "Foundational",
        marker: {
          color: getTierColor("low"),
          line: { width: 1, color: "#ffffff" }
        },
        x: rows.map((row) => row.lowPct),
        y,
        customdata: rows.map((row) => ({
          pointType: "profile-segment",
          payload: {
            ...row,
            segmentKey: "low",
            segmentLabel: "Foundational",
            segmentPct: row.lowPct
          }
        })),
        hoverinfo: "none"
      },
      {
        type: "bar",
        orientation: "h",
        name: "Moderate",
        marker: {
          color: getTierColor("moderate"),
          line: { width: 1, color: "#ffffff" }
        },
        x: rows.map((row) => row.moderatePct),
        y,
        customdata: rows.map((row) => ({
          pointType: "profile-segment",
          payload: {
            ...row,
            segmentKey: "moderate",
            segmentLabel: "Moderate",
            segmentPct: row.moderatePct
          }
        })),
        hoverinfo: "none"
      },
      {
        type: "bar",
        orientation: "h",
        name: "Expertise",
        marker: {
          color: getTierColor("high"),
          line: { width: 1, color: "#ffffff" }
        },
        x: rows.map((row) => row.highPct),
        y,
        customdata: rows.map((row) => ({
          pointType: "profile-segment",
          payload: {
            ...row,
            segmentKey: "high",
            segmentLabel: "Expertise",
            segmentPct: row.highPct
          }
        })),
        hoverinfo: "none"
      }
    ];

    const layout = {
      barmode: "stack",
      height: currentPlotHeight,
      margin: { t: 12, r: 18, b: 40, l: 170 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      hovermode: "closest",
      spikedistance: -1,
      xaxis: {
        range: [0, 100],
        ticksuffix: "%",
        gridcolor: "rgba(19,37,63,0.08)",
        zeroline: false,
        showspikes: false,
        title: {
          text: "Share of Skills Within Domain (%)",
          standoff: 8
        }
      },
      yaxis: {
        autorange: "reversed",
        tickfont: { size: 13 },
        automargin: true,
        showspikes: false
      }
    };

    Plotly.newPlot(els.chart, traces, layout, {
      displayModeBar: false,
      responsive: true
    }).then((graphDiv) => {
      activeGraphDiv = graphDiv;
      bindTopLevelChartEvents(graphDiv, "profile");
      stabilizeActivePlot();
    });
  }

  function renderDomainChart() {
    const rows = getDomainSummaries();

    const traces = [
      {
        type: "bar",
        orientation: "h",
        name: "Foundational",
        x: rows.map((row) => row.lowCount),
        y: rows.map((row) => row.domain),
        customdata: rows.map((row) => ({
          pointType: "distribution-segment",
          payload: {
            ...row,
            segmentKey: "low",
            segmentLabel: "Foundational",
            segmentCount: row.lowCount,
            segmentAvgConfidence: row.lowAvgConfidence
          }
        })),
        hoverinfo: "none",
        marker: {
          color: getTierColor("low"),
          line: { width: 1, color: "#ffffff" }
        }
      },
      {
        type: "bar",
        orientation: "h",
        name: "Moderate",
        x: rows.map((row) => row.moderateCount),
        y: rows.map((row) => row.domain),
        customdata: rows.map((row) => ({
          pointType: "distribution-segment",
          payload: {
            ...row,
            segmentKey: "moderate",
            segmentLabel: "Moderate",
            segmentCount: row.moderateCount,
            segmentAvgConfidence: row.moderateAvgConfidence
          }
        })),
        hoverinfo: "none",
        marker: {
          color: getTierColor("moderate"),
          line: { width: 1, color: "#ffffff" }
        }
      },
      {
        type: "bar",
        orientation: "h",
        name: "Expertise",
        x: rows.map((row) => row.highCount),
        y: rows.map((row) => row.domain),
        customdata: rows.map((row) => ({
          pointType: "distribution-segment",
          payload: {
            ...row,
            segmentKey: "high",
            segmentLabel: "Expertise",
            segmentCount: row.highCount,
            segmentAvgConfidence: row.highAvgConfidence
          }
        })),
        hoverinfo: "none",
        marker: {
          color: getTierColor("high"),
          line: { width: 1, color: "#ffffff" }
        }
      }
    ];

    const layout = {
      barmode: "stack",
      height: currentPlotHeight,
      margin: { t: 18, r: 18, b: 34, l: 170 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      hovermode: "closest",
      spikedistance: -1,
      xaxis: {
        title: { text: "Number of Skills" },
        gridcolor: "rgba(19,37,63,0.08)",
        zeroline: false,
        showspikes: false
      },
      yaxis: {
        autorange: "reversed",
        tickfont: { size: 13 },
        automargin: true,
        showspikes: false
      },
      annotations: [
        {
          xref: "paper",
          yref: "paper",
          x: 0,
          y: 1.08,
          text: "<b>Foundational</b> = depth 1–2&nbsp;&nbsp;&nbsp;<b>Applied</b> = depth 3&nbsp;&nbsp;&nbsp;<b>Expertise</b> = depth 4",
          showarrow: false,
          xanchor: "left",
          yanchor: "bottom",
          font: { size: 12, color: "#5f7289" }
        }
      ]
    };

    Plotly.newPlot(els.chart, traces, layout, {
      displayModeBar: false,
      responsive: true
    }).then((graphDiv) => {
      activeGraphDiv = graphDiv;
      bindTopLevelChartEvents(graphDiv, "distribution");
      stabilizeActivePlot();
    });
  }

  function renderSkillChart() {
    const domain = getDomainById(activeDomain);
    const activeRange = QUADRANT_RANGES[activeQuadrant] || QUADRANT_RANGES.all;
    const items = spreadSkillPoints(getSkillsForDomain(activeDomain), activeQuadrant);
    const showQuadrantScaffold = activeQuadrant === "all";

    const trace = {
      type: "scatter",
      mode: "markers",
      x: items.map((item) => item.jitteredDepth),
      y: items.map((item) => item.jitteredExperience),
      text: items.map((item) => item.skill_name),
      customdata: items.map((item) => ({
        pointType: "skill",
        payload: item
      })),
      hoverinfo: "none",
      marker: {
        size: items.map((item) => (selectedPointKey === item.id ? 18 : 14)),
        color: items.map((item) => (selectedPointKey === item.id ? MATRIX_SELECTED_COLOR : MATRIX_POINT_COLOR)),
        opacity: 0.92,
        line: {
          width: items.map((item) => (selectedPointKey === item.id ? 6 : 1.2)),
          color: items.map((item) => (selectedPointKey === item.id ? "rgba(10, 110, 209, 0.20)" : "#ffffff"))
        }
      }
    };

    const layout = {
      height: currentPlotHeight,
      margin: { t: 12, r: 22, b: 58, l: 60 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      hovermode: "closest",
      hoverdistance: 30,
      spikedistance: -1,
      clickmode: "event+select",
      showlegend: false,
      xaxis: {
        range: activeRange.x,
        tickvals: [1, 2, 3, 4],
        ticktext: ["1", "2", "3", "4"],
        title: {
          text: "Depth of Understanding",
          standoff: 10
        },
        showspikes: false,
        zeroline: false,
        gridcolor: "rgba(19,37,63,0.08)"
      },
      yaxis: {
        range: activeRange.y,
        tickvals: [0, 1, 2, 3],
        ticktext: ["0", "1", "2", "3"],
        title: {
          text: "Practical Experience",
          standoff: 10
        },
        showspikes: false,
        zeroline: false,
        gridcolor: "rgba(19,37,63,0.08)"
      },
      shapes: showQuadrantScaffold ? [
        {
          type: "rect",
          xref: "x",
          yref: "y",
          x0: 0.5, x1: 2.5,
          y0: 1.5, y1: 3.15,
          fillcolor: "rgba(95,114,137,0.035)",
          line: { width: 0 },
          layer: "below"
        },
        {
          type: "rect",
          xref: "x",
          yref: "y",
          x0: 2.5, x1: 4.28,
          y0: 1.5, y1: 3.15,
          fillcolor: "rgba(95,114,137,0.035)",
          line: { width: 0 },
          layer: "below"
        },
        {
          type: "rect",
          xref: "x",
          yref: "y",
          x0: 0.5, x1: 2.5,
          y0: -0.08, y1: 1.5,
          fillcolor: "rgba(95,114,137,0.02)",
          line: { width: 0 },
          layer: "below"
        },
        {
          type: "rect",
          xref: "x",
          yref: "y",
          x0: 2.5, x1: 4.28,
          y0: -0.08, y1: 1.5,
          fillcolor: "rgba(95,114,137,0.02)",
          line: { width: 0 },
          layer: "below"
        },
        {
          type: "line",
          xref: "x",
          yref: "y",
          x0: 2.5, x1: 2.5,
          y0: -0.08, y1: 3.15,
          line: { color: "#d2dbe7", width: 2 }
        },
        {
          type: "line",
          xref: "x",
          yref: "y",
          x0: 0.5, x1: 4.28,
          y0: 1.5, y1: 1.5,
          line: { color: "#d2dbe7", width: 2 }
        }
      ] : [],
      annotations: getQuadrantAnnotations(domain, showQuadrantScaffold)
    };

    Plotly.newPlot(els.chart, [trace], layout, {
      displayModeBar: false,
      responsive: true
    }).then((graphDiv) => {
      activeGraphDiv = graphDiv;
      bindSkillChartEvents(graphDiv);
      stabilizeActivePlot();
    });
  }
  
  function getQuadrantAnnotations(domain, showQuadrants = true) {
    if (!showQuadrants) return [];

    return [
      {
        x: 1.5,
        y: 2.3,
        xref: "x",
        yref: "y",
        text: "<b>Passive</b>",
        showarrow: false,
        xanchor: "center",
        yanchor: "middle",
        font: { size: 18, color: "rgba(95,114,137,0.32)" }
      },
      {
        x: 3.39,
        y: 2.3,
        xref: "x",
        yref: "y",
        text: "<b>Expertise</b>",
        showarrow: false,
        xanchor: "center",
        yanchor: "middle",
        font: { size: 18, color: "rgba(95,114,137,0.32)" }
      },
      {
        x: 1.5,
        y: 0.7,
        xref: "x",
        yref: "y",
        text: "<b>Foundational</b>",
        showarrow: false,
        xanchor: "center",
        yanchor: "middle",
        font: { size: 18, color: "rgba(95,114,137,0.32)" }
      },
      {
        x: 3.39,
        y: 0.7,
        xref: "x",
        yref: "y",
        text: "<b>Emerging</b>",
        showarrow: false,
        xanchor: "center",
        yanchor: "middle",
        font: { size: 18, color: "rgba(95,114,137,0.32)" }
      }
    ];
  }
  
  /* =========================
     CHART EVENTS
  ========================= */

  function bindTopLevelChartEvents(graphDiv, mode) {
    graphDiv.on("plotly_hover", (eventData) => {
      if (!eventData?.points?.length) return;
      if (requiresTouchDoubleTap()) return;

      const point = eventData.points[0];
      const custom = point.customdata;
      const event = eventData.event || {};
      showTooltip(custom, event.clientX ?? window.innerWidth / 2, event.clientY ?? 120);
    });

    graphDiv.on("plotly_unhover", () => {
      if (!requiresTouchDoubleTap()) {
        hideTooltip();
      }
    });

    graphDiv.on("plotly_click", (eventData) => {
      if (!eventData?.points?.length) return;

      const point = eventData.points[0];
      const custom = point.customdata;
      const event = eventData.event || {};
      const domainId = Number(custom?.payload?.domain_id);
      const pointKey = `${mode}-${domainId}`;

      if (requiresTouchDoubleTap()) {
        showTooltip(custom, event.clientX ?? window.innerWidth / 2, event.clientY ?? 120);

        const now = Date.now();
        const isRepeat = touchState.lastTapKey === pointKey && now - touchState.lastTapAt < 1200;

        touchState.lastTapKey = pointKey;
        touchState.lastTapAt = now;
        applySelectedPoint(pointKey);

        if (isRepeat) {
          openDomain(domainId);
        }
        return;
      }

      openDomain(domainId);
    });
  }
  
  function bindSkillChartEvents(graphDiv) {
    graphDiv.on("plotly_hover", (eventData) => {
      if (!eventData?.points?.length) return;
      if (requiresTouchDoubleTap()) return;

      const point = eventData.points[0];
      const event = eventData.event || {};
      showTooltip(point.customdata, event.clientX ?? window.innerWidth / 2, event.clientY ?? 120);
    });

    graphDiv.on("plotly_unhover", () => {
      if (!requiresTouchDoubleTap()) {
        hideTooltip();
      }
    });

    graphDiv.on("plotly_click", (eventData) => {
      if (!eventData?.points?.length) return;

      const point = eventData.points[0];
      const event = eventData.event || {};
      const skill = point.customdata?.payload;
      if (!skill) return;

      applySelectedPoint(skill.id);
      showTooltip(point.customdata, event.clientX ?? window.innerWidth / 2, event.clientY ?? 120);
      renderSkillChart();
    });
  }

  function buildDomainBarHighlightUpdate() {
    return null;
  }

  function applyDomainBarEmphasis() {
    return;
  }

  function clearDomainBarEmphasis() {
    return;
  }

  function applyDomainBarSelection() {
    return;
  }

  function clearDomainBarSelection() {
    return;
  }

  function rebuildActiveDomainBarPoint() {
    return;
  }

  /* =========================
     EVENTS
  ========================= */

  function bindCapabilityEvents() {
    if (!initialized && els.chartBackButton) {
      els.chartBackButton.addEventListener("click", () => {
        returnToDomainOverview();
      });
    }

    if (!initialized && els.chartHelpButton) {
      els.chartHelpButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleChartHelp();
      });
    }

    if (!initialized && els.chartHelpPopover) {
      els.chartHelpPopover.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    if (!initialized && els.scoringHelpButton) {
      els.scoringHelpButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleScoringHelp();
      });
    }

    if (!initialized && els.scoringHelpPopover) {
      els.scoringHelpPopover.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }
  }

  /* =========================
     ORIENTATION OVERLAY
  ========================= */

  function updateOrientationOverlay() {
    if (!els.orientationOverlay) return;

    const shouldShow = getOrientationShouldShow();
    els.orientationOverlay.classList.toggle("is-visible", shouldShow);
    els.orientationOverlay.setAttribute("aria-hidden", String(!shouldShow));
  }

  /* =========================
     UTILS
  ========================= */

  function debounce(fn, wait) {
    let timeoutId = null;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), wait);
    };
  }
})();
