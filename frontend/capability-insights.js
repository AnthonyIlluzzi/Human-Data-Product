(() => {
  const VIEW_PROFILE = "profile";
  const VIEW_DISTRIBUTION = "distribution";

  const QUADRANTS = [
    { key: "all", label: "All Skills" },
    { key: "expertise", label: "Expertise" },
    { key: "applied", label: "Applied Experience" },
    { key: "confidence", label: "High Confidence" }
  ];

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
    bindInventoryModalEvents();
    bindCapabilityEvents();
    renderChart();
    updateOrientationOverlay();

    if (!resizeHandlerBound) {
      const handleViewportChange = debounce(() => {
        updateOrientationOverlay();
        if (activeGraphDiv && window.Plotly) {
          try {
            Plotly.Plots.resize(activeGraphDiv);
          } catch (_) {
            renderChart();
          }
        } else {
          renderChart();
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

    if (!document.getElementById("capability-insights-tab")?.classList.contains("active")) return;
    if (!window.Plotly) return;
    if (!els.chart) return;

    requestAnimationFrame(() => {
      if (activeGraphDiv) {
        try {
          Plotly.Plots.resize(activeGraphDiv);
        } catch (_) {
          renderChart();
        }
      } else {
        renderChart();
      }

      if (isChartHelpOpen) {
        requestAnimationFrame(() => setChartHelpOpen(true));
      }

      if (isScoringHelpOpen) {
        requestAnimationFrame(() => setScoringHelpOpen(true));
      }
    });
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
          jitteredDepth: boundedJitter(depth, 1, 4, index, "x"),
          jitteredExperience: boundedJitter(experience, 0, 3, index, "y")
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
    if (key === "moderate") return "#b4cae8";
    return "#d7dee8";
  }

  function getHighlightedTierColor(key) {
    if (key === "high") return "#0757a9";
    if (key === "moderate") return "#8db1de";
    return "#c6d0dc";
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

    if (activeQuadrant === "expertise") return items.filter((item) => item.depth >= 4);
    if (activeQuadrant === "applied") return items.filter((item) => item.experience >= 2);
    if (activeQuadrant === "confidence") return items.filter((item) => item.confidence >= 90);
    return items;
  }

  function getPlotHeight() {
    if (activeDomain) {
      if (window.innerWidth <= 720) return 460;
      if (window.innerWidth <= 920) return 520;
      return 720;
    }

    const rows = domains.length;
    const base = rows * 78 + 120;

    if (window.innerWidth <= 720) return Math.max(460, rows * 54 + 110);
    return Math.max(520, base);
  }

  function getOrientationShouldShow() {
    if (!els.tab?.classList.contains("active")) return false;
    if (window.innerWidth > 920) return false;
    return window.innerHeight > window.innerWidth;
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
        "Hover for detail. On touch devices, tap once to inspect each skill point.";
    } else if (topLevelView === VIEW_PROFILE) {
      els.chartTitle.textContent = "Capability Profile by Domain";
      els.chartInstruction.textContent =
        "Hover for detail. On touch devices, tap once to inspect and tap again to open the domain skill matrix.";
    } else {
      els.chartTitle.textContent = "Domain Distribution";
      els.chartInstruction.textContent =
        "This view shows the relative size of each domain in the capability dataset. Click any bar to open the domain skill matrix.";
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
        title: "How to read this chart",
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
            <strong>Focus View filters</strong>
            <p>Use the controls to isolate expertise-heavy, applied, or high-confidence skills.</p>
          </div>
        `
      };
    }

    if (topLevelView === VIEW_PROFILE) {
      return {
        title: "How to read this chart",
        body: `
          <div class="chart-help-section">
            <strong>What this view shows</strong>
            <p>Each bar represents a domain. Segments show the share of skills in that domain by depth tier.</p>
          </div>

          <div class="chart-help-section">
            <strong><span class="help-dot low"></span> Foundational</strong>
            <p>Awareness and foundational capability.</p>
          </div>

          <div class="chart-help-section">
            <strong><span class="help-dot moderate"></span> Applied</strong>
            <p>Demonstrated working capability used in real contexts.</p>
          </div>

          <div class="chart-help-section">
            <strong><span class="help-dot high"></span> Expertise</strong>
            <p>Core strength used to shape systems, architecture, or outcomes.</p>
          </div>
        `
      };
    }

    return {
      title: "How to read this chart",
      body: `
        <div class="chart-help-section">
          <strong>What this view shows</strong>
          <p>This chart compares the number of skills represented in each domain.</p>
        </div>

        <div class="chart-help-section">
          <strong>How to use it</strong>
          <p>Click any domain bar to open the skill matrix and inspect the underlying capability records.</p>
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
      const low = items.filter((item) => item.profileTierKey === "low").length;
      const moderate = items.filter((item) => item.profileTierKey === "moderate").length;
      const high = items.filter((item) => item.profileTierKey === "high").length;
      const total = items.length || 1;

      return {
        ...domain,
        lowCount: low,
        moderateCount: moderate,
        highCount: high,
        lowPct: (low / total) * 100,
        moderatePct: (moderate / total) * 100,
        highPct: (high / total) * 100
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

    if (point?.pointType === "profile-domain") {
      const domain = point.payload;
      return `
        <div class="chart-tooltip-title">${escapeHtml(domain.domain)}</div>
        <div class="chart-tooltip-domain">${domain.skill_count} skills in domain</div>
        <div class="chart-tooltip-meta">
          <div>Expertise: <strong>${Math.round(domain.highPct)}%</strong></div>
          <div>Applied: <strong>${Math.round(domain.moderatePct)}%</strong></div>
          <div>Foundational: <strong>${Math.round(domain.lowPct)}%</strong></div>
        </div>
        <div class="chart-tooltip-evidence">${escapeHtml(domain.summary || "Click to inspect the underlying skill matrix.")}</div>
      `;
    }

    if (point?.pointType === "distribution-domain") {
      const domain = point.payload;
      return `
        <div class="chart-tooltip-title">${escapeHtml(domain.domain)}</div>
        <div class="chart-tooltip-domain">${domain.skill_count} skills</div>
        <div class="chart-tooltip-meta">
          <div>Expertise skills: <strong>${domain.expertise_count}</strong></div>
          <div>Applied skills: <strong>${domain.applied_count}</strong></div>
          <div>Average confidence: <strong>${domain.avg_confidence}</strong></div>
        </div>
        <div class="chart-tooltip-evidence">${escapeHtml(domain.summary || "Click to inspect the underlying skill matrix.")}</div>
      `;
    }

    return "";
  }

  function positionTooltip(clientX, clientY) {
    if (!els.chartTooltip) return;

    const tooltipRect = els.chartTooltip.getBoundingClientRect();
    const chartRect = els.chart?.getBoundingClientRect();

    if (!chartRect) return;

    const isMobile = window.innerWidth <= 720;
    const docked = isMobile || isTouchLikeDevice();

    els.chartTooltip.classList.toggle("is-docked", docked && !isMobile);
    els.chartTooltip.classList.toggle("is-docked-mobile", isMobile);
    els.chartTooltip.classList.toggle("is-mobile-fixed", isMobile);

    if (isMobile) {
      els.chartTooltip.style.left = "12px";
      els.chartTooltip.style.top = "auto";
      els.chartTooltip.style.bottom = "12px";
      return;
    }

    els.chartTooltip.style.bottom = "auto";

    let left;
    let top;

    if (docked) {
      left = chartRect.left + 16;
      top = chartRect.bottom - tooltipRect.height - 16;
    } else {
      left = clientX + 14;
      top = clientY + 14;

      if (left + tooltipRect.width > window.innerWidth - 12) {
        left = clientX - tooltipRect.width - 14;
      }

      if (top + tooltipRect.height > window.innerHeight - 12) {
        top = clientY - tooltipRect.height - 14;
      }

      left = clamp(left, 12, window.innerWidth - tooltipRect.width - 12);
      top = clamp(top, 12, window.innerHeight - tooltipRect.height - 12);
    }

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

    const commonCustomData = rows.map((row) => ({
      pointType: "profile-domain",
      payload: row
    }));

    const traces = [
      {
        type: "bar",
        orientation: "h",
        name: "Foundational",
        marker: { color: getTierColor("low") },
        x: rows.map((row) => row.lowPct),
        y,
        customdata: commonCustomData,
        hovertemplate: "<extra></extra>"
      },
      {
        type: "bar",
        orientation: "h",
        name: "Applied",
        marker: { color: getTierColor("moderate") },
        x: rows.map((row) => row.moderatePct),
        y,
        customdata: commonCustomData,
        hovertemplate: "<extra></extra>"
      },
      {
        type: "bar",
        orientation: "h",
        name: "Expertise",
        marker: { color: getTierColor("high") },
        x: rows.map((row) => row.highPct),
        y,
        customdata: commonCustomData,
        hovertemplate: "<extra></extra>"
      }
    ];

    const layout = {
      barmode: "stack",
      height: getPlotHeight(),
      margin: { t: 12, r: 18, b: 40, l: 170 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      xaxis: {
        range: [0, 100],
        ticksuffix: "%",
        gridcolor: "rgba(19,37,63,0.08)",
        zeroline: false,
        title: {
          text: "Share of Skills Within Domain (%)",
          standoff: 8
        }
      },
      yaxis: {
        autorange: "reversed",
        tickfont: { size: 13 },
        automargin: true
      }
    };

    Plotly.newPlot(els.chart, traces, layout, {
      displayModeBar: false,
      responsive: true
    }).then((graphDiv) => {
      activeGraphDiv = graphDiv;
      bindTopLevelChartEvents(graphDiv, "profile");
    });
  }

  function renderDomainChart() {
    const rows = [...domains];
    const trace = {
      type: "bar",
      orientation: "h",
      x: rows.map((row) => row.skill_count),
      y: rows.map((row) => row.domain),
      marker: {
        color: rows.map(() => rgba("#0a6ed1", 0.92)),
        line: {
          color: rows.map(() => rgba("#0a6ed1", 1)),
          width: 1
        }
      },
      customdata: rows.map((row) => ({
        pointType: "distribution-domain",
        payload: row
      })),
      hovertemplate: "<extra></extra>"
    };

    const layout = {
      height: getPlotHeight(),
      margin: { t: 12, r: 18, b: 40, l: 170 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      xaxis: {
        title: { text: "Number of Skills" },
        gridcolor: "rgba(19,37,63,0.08)",
        zeroline: false
      },
      yaxis: {
        autorange: "reversed",
        tickfont: { size: 13 },
        automargin: true
      }
    };

    Plotly.newPlot(els.chart, [trace], layout, {
      displayModeBar: false,
      responsive: true
    }).then((graphDiv) => {
      activeGraphDiv = graphDiv;
      bindTopLevelChartEvents(graphDiv, "distribution");
    });
  }

  function renderSkillChart() {
    const domain = getDomainById(activeDomain);
    const items = getSkillsForDomain(activeDomain);

    const markerSizes = items.map((item) => (selectedPointKey === item.id ? 18 : 14));
    const markerColors = items.map((item) => {
      const color = getTierColor(item.profileTierKey);
      return selectedPointKey === item.id ? getHighlightedTierColor(item.profileTierKey) : color;
    });

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
      marker: {
        size: markerSizes,
        color: markerColors,
        opacity: 0.95,
        line: {
          width: 1.5,
          color: items.map((item) => rgba(getTierColor(item.profileTierKey), 0.22))
        }
      },
      hovertemplate: "<extra></extra>"
    };

    const layout = {
      height: getPlotHeight(),
      margin: { t: 16, r: 22, b: 60, l: 60 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      hovermode: "closest",
      showlegend: false,
      xaxis: {
        range: [0.75, 4.25],
        tickvals: [1, 2, 3, 4],
        ticktext: ["1", "2", "3", "4"],
        title: {
          text: "Depth",
          standoff: 10
        },
        zeroline: false,
        gridcolor: "rgba(19,37,63,0.08)"
      },
      yaxis: {
        range: [-0.15, 3.15],
        tickvals: [0, 1, 2, 3],
        ticktext: ["0", "1", "2", "3"],
        title: {
          text: "Experience",
          standoff: 10
        },
        zeroline: false,
        gridcolor: "rgba(19,37,63,0.08)"
      },
      annotations: getQuadrantAnnotations(domain)
    };

    Plotly.newPlot(els.chart, [trace], layout, {
      displayModeBar: false,
      responsive: true
    }).then((graphDiv) => {
      activeGraphDiv = graphDiv;
      bindSkillChartEvents(graphDiv);
    });
  }

  function getQuadrantAnnotations(domain) {
    const title = domain ? domain.domain : "Domain";
    return [
      {
        x: 1.15,
        y: 3.02,
        xref: "x",
        yref: "y",
        text: "Conceptual Strength",
        showarrow: false,
        font: { size: 11, color: "#6a7a90" },
        xanchor: "left",
        yanchor: "bottom"
      },
      {
        x: 4.02,
        y: 3.02,
        xref: "x",
        yref: "y",
        text: "High-Ownership Capability",
        showarrow: false,
        font: { size: 11, color: "#6a7a90" },
        xanchor: "right",
        yanchor: "bottom"
      },
      {
        x: 4.02,
        y: -0.08,
        xref: "x",
        yref: "y",
        text: `${escapeHtml(title)} skill distribution`,
        showarrow: false,
        font: { size: 11, color: "#6a7a90" },
        xanchor: "right",
        yanchor: "top"
      }
    ];
  }

  /* =========================
     CHART EVENTS
  ========================= */

  function bindTopLevelChartEvents(graphDiv, mode) {
    graphDiv.on("plotly_hover", (eventData) => {
      if (!eventData?.points?.length) return;
      const point = eventData.points[0];
      const custom = point.customdata;
      const event = eventData.event || {};
      showTooltip(custom, event.clientX ?? window.innerWidth / 2, event.clientY ?? 120);

      if (!isTouchLikeDevice()) {
        applyDomainBarEmphasis(point);
      }
    });

    graphDiv.on("plotly_unhover", () => {
      if (!isTouchLikeDevice()) {
        hideTooltip();
        clearDomainBarEmphasis();
      }
    });

    graphDiv.on("plotly_click", (eventData) => {
      if (!eventData?.points?.length) return;
      const point = eventData.points[0];
      const custom = point.customdata;
      const event = eventData.event || {};
      const domainId = Number(custom?.payload?.domain_id);
      const pointKey = `${mode}-${domainId}`;

      if (isTouchLikeDevice()) {
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
      const point = eventData.points[0];
      const event = eventData.event || {};
      showTooltip(point.customdata, event.clientX ?? window.innerWidth / 2, event.clientY ?? 120);
    });

    graphDiv.on("plotly_unhover", () => {
      if (!isTouchLikeDevice()) {
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
