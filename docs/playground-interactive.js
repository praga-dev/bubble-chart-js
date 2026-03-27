// playground-interactive.js

const PRESETS = {
  neon: {
    layout: {
      type: "physics",
      physics: { collisionPad: 8, centerStrength: 0.02 },
    },
    render: { mode: "canvas" },
    theme: { primary: "#72dcff", blur: 12, opacity: 0.65 },
    data: [
      { id: "101", label: "Growth", value: 84, bubbleColor: "#72dcff" },
      { id: "102", label: "Churn", value: 12, bubbleColor: "#dd8bfb" },
      { id: "103", label: "Acq", value: 45, bubbleColor: "#a6ffb5" },
    ],
  },
  cyber: {
    layout: { type: "static" },
    render: { mode: "canvas" },
    theme: { primary: "#dd8bfb", blur: 0, opacity: 0.8 },
    data: [
      { id: "1", label: "Sys", value: 60, bubbleColor: "#dd8bfb" },
      { id: "2", label: "Net", value: 40, bubbleColor: "#00d2ff" },
      { id: "3", label: "Sec", value: 80, bubbleColor: "#33ec7b" },
      { id: "4", label: "Ops", value: 30, bubbleColor: "#ff716c" },
    ],
  },
  ghost: {
    layout: {
      type: "physics",
      physics: { collisionPad: 12, centerStrength: 0.015 },
    },
    render: { mode: "svg" },
    theme: { primary: "#e1e4fa", blur: 20, opacity: 0.3 },
    data: [
      {
        id: "101",
        label: "Server 1",
        value: 50,
        bubbleColor: "rgba(255,255,255,0.8)",
      },
      {
        id: "102",
        label: "Server 2",
        value: 50,
        bubbleColor: "rgba(255,255,255,0.8)",
      },
      {
        id: "103",
        label: "Server 3",
        value: 50,
        bubbleColor: "rgba(255,255,255,0.8)",
      },
      {
        id: "104",
        label: "Server 4",
        value: 50,
        bubbleColor: "rgba(255,255,255,0.8)",
      },
    ],
  },
  dense: {
    layout: {
      type: "physics",
      physics: { collisionPad: 2, centerStrength: 0.05 },
    },
    render: { mode: "canvas" },
    theme: { primary: "#72dcff", blur: 0, opacity: 0.9 },
    data: Array.from({ length: 100 }).map((_, i) => ({
      id: String(i),
      label: `N${i}`,
      value: 10 + Math.random() * 40,
      bubbleColor: ["#72dcff", "#dd8bfb", "#a6ffb5", "#ff716c"][
        Math.floor(Math.random() * 4)
      ],
    })),
  },
};

// Flat playground state — single source of truth, assembled into initializeChart config on each rebuild
const state = {
  layoutType: "physics",
  collisionPad: 8,
  centerStrength: 0.02,
  renderMode: "canvas",
  opacity: 0.35,
  blur: 12,
  primaryColor: "#72dcff",
  data: JSON.parse(JSON.stringify(PRESETS.neon.data)),
};

let chartInstance = null;
let layerHookId = null;

// ── FPS tracking ────────────────────────────────────────────────────────────
let _lastFrameTime = 0;
let _fps = 0;
let _frameCount = 0;
let _fpsAccum = 0;

function tickFps(now) {
  if (_lastFrameTime > 0) {
    const delta = now - _lastFrameTime;
    _fpsAccum += delta;
    _frameCount++;
    if (_fpsAccum >= 500) {
      // update every 500 ms
      _fps = Math.round((_frameCount / _fpsAccum) * 1000);
      _fpsAccum = 0;
      _frameCount = 0;
    }
  }
  _lastFrameTime = now;
  requestAnimationFrame(tickFps);
}
requestAnimationFrame(tickFps);

// ── Status bar update loop ──────────────────────────────────────────────────
function updateStatusBar() {
  const statFps = document.getElementById("stat-fps");
  const statNodes = document.getElementById("stat-nodes");
  const statHeap = document.getElementById("stat-heap");

  if (statFps) statFps.textContent = _fps > 0 ? `${_fps}` : "—";
  if (statNodes)
    statNodes.textContent = chartInstance ? `${state.data.length} Active` : "—";

  if (statHeap && performance.memory) {
    const mb = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
    statHeap.textContent = `${mb} MB`;
  } else if (statHeap) {
    statHeap.textContent = "N/A";
  }
}
setInterval(updateStatusBar, 1000);

document.addEventListener("DOMContentLoaded", () => {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  const dataEditor = document.getElementById("data-editor");
  const btnUpdateChart = document.getElementById("btn-update-chart");
  const btnResetDemo = document.getElementById("btn-reset-demo");
  const tableBody = document.getElementById("data-table-body");
  const labelItemCount = document.getElementById("label-item-count");

  const btnStatic = document.getElementById("btn-layout-static");
  const btnPhysics = document.getElementById("btn-layout-physics");
  const inputSpacing = document.getElementById("input-node-spacing");
  const labelSpacing = document.getElementById("label-node-spacing");

  const btnAuto = document.getElementById("btn-engine-auto");
  const btnSvg = document.getElementById("btn-engine-svg");
  const btnCanvas = document.getElementById("btn-engine-canvas");

  const inputOpacity = document.getElementById("input-opacity");
  const labelOpacity = document.getElementById("label-opacity");
  const inputBlur = document.getElementById("input-blur");
  const inputPrimaryColor = document.getElementById("input-primary-color");

  const configJsonDisplay = document.getElementById("config-json-display");

  const btnCopyConfig = document.getElementById("btn-copy-config");
  const btnExport = document.getElementById("btn-export");
  const btnImplement = document.getElementById("btn-implement");
  const btnExportSidebar = document.getElementById("btn-export-sidebar");

  const btnRefreshChart = document.getElementById("btn-refresh-chart");
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");

  const badgeRendererType = document.getElementById("badge-renderer-type");
  const labelRendererType = document.getElementById("label-renderer-type");

  // Debug checkboxes
  const dbgGrid = document.getElementById("dbg-show-grid");
  const dbgVelocity = document.getElementById("dbg-show-velocity");
  const dbgCollision = document.getElementById("dbg-show-collision");
  const dbgIds = document.getElementById("dbg-show-ids");
  const dbgVelocityLabel = document.getElementById("dbg-velocity-label");

  // Velocity Vectors is only meaningful in physics mode — disable it otherwise
  function syncVelocityCheckbox() {
    const isPhysics = state.layoutType === "physics";
    if (dbgVelocity) {
      dbgVelocity.disabled = !isPhysics;
      dbgVelocity.style.opacity = isPhysics ? "1" : "0.3";
      dbgVelocity.style.cursor = isPhysics ? "pointer" : "not-allowed";
      if (!isPhysics) dbgVelocity.checked = false;
    }
    if (dbgVelocityLabel) {
      dbgVelocityLabel.style.opacity = isPhysics ? "" : "0.35";
    }
  }

  // ── Chart build/rebuild ───────────────────────────────────────────────────

  function buildChartConfig() {
    const cfg = {
      canvasContainerId: "playground-canvas",
      data: state.data,
      layout: { type: state.layoutType },
      render: {
        mode: state.renderMode,
        theme: state.blur > 0 ? "glass" : "flat",
        ...(state.blur > 0
          ? {
              glassOptions: { blurRadius: state.blur / 2, glowIntensity: 0.6 },
            }
          : {}),
      },
      bubbleAppearance: { opacity: state.opacity },
      defaultFontColor: "#e1e4fa",
      fontSize: 12,
      debug: {
        showGrid: !!(dbgGrid && dbgGrid.checked),
        showVelocityVectors: !!(dbgVelocity && dbgVelocity.checked),
        showCollisionPairs: !!(dbgCollision && dbgCollision.checked),
        showBubbleIds: !!(dbgIds && dbgIds.checked),
      },
    };
    if (state.layoutType === "physics") {
      cfg.layout.physics = {
        collisionPad: state.collisionPad,
        centerStrength: state.centerStrength,
      };
    }
    return cfg;
  }

  // Expose rebuildChart globally so the inline debug-checkbox handler in the HTML can call it
  window.rebuildChart = function rebuildChart() {
    syncVelocityCheckbox();

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
      layerHookId = null;
    }

    // Clear any leftover DOM from previous instance
    const container = document.getElementById("playground-canvas");
    if (!container) return;
    container.innerHTML = "";

    // Guard: if the container has no size yet (layout not complete), retry next frame
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      requestAnimationFrame(window.rebuildChart);
      return;
    }

    chartInstance = initializeChart(buildChartConfig());

    // Detect which renderer was chosen and update badges
    chartInstance.on &&
      chartInstance.on("simulation:tick", () => {
        // Update renderer badge on first tick (renderer is resolved by then)
      });

    // Determine active renderer label from the config we passed
    const resolvedMode =
      state.renderMode === "auto"
        ? state.data.length > 25
          ? "Canvas 2D"
          : "SVG"
        : state.renderMode === "canvas"
          ? "Canvas 2D"
          : "SVG";
    if (badgeRendererType) badgeRendererType.textContent = resolvedMode;
    if (labelRendererType) labelRendererType.textContent = resolvedMode;

    // Layer hook: apply primary-color glow/shadow on top of the built-in render
    layerHookId = chartInstance.addLayerHook({
      layer: "overlay",
      priority: 5,
      fn(ctx) {
        if (state.blur <= 0) return;

        if (ctx.type === "canvas" && ctx.canvas) {
          // Already handled by glass theme glassOptions — nothing extra needed
        } else if (ctx.type === "svg" && ctx.svg) {
          // Inject a radial glow filter definition once
          const svgEl = ctx.svg.ownerSVGElement;
          if (svgEl && !svgEl.querySelector("#pg-glow-filter")) {
            const defs = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "defs"
            );
            defs.innerHTML = `
              <filter id="pg-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="${state.blur / 3}" result="blur"/>
                <feFlood flood-color="${state.primaryColor}" flood-opacity="0.4" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>`;
            svgEl.insertBefore(defs, svgEl.firstChild);
          }
        }
      },
    });

    updateUI();
    updateStatusBar();
  };

  const rebuildChart = window.rebuildChart;

  // ── UI sync ───────────────────────────────────────────────────────────────

  function updateTable() {
    if (!tableBody) return;
    const rows = state.data
      .slice(0, 50)
      .map(
        (d) => `
      <tr>
        <td class="py-2 px-3 text-on-surface-variant">${d.id ?? ""}</td>
        <td class="py-2 px-3 font-semibold">${d.label || ""}</td>
        <td class="py-2 px-3">${Number(d.value).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">
          <div class="w-4 h-4 rounded-full mx-auto shadow-lg" style="background-color: ${d.bubbleColor ?? "#72dcff"}; box-shadow: 0 0 6px ${d.bubbleColor ?? "#72dcff"}60"></div>
        </td>
        <td class="py-2 px-3 text-right">
          <button class="text-on-surface-variant hover:text-primary transition-colors">
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
        </td>
      </tr>
    `
      )
      .join("");
    tableBody.innerHTML =
      rows +
      (state.data.length > 50
        ? `<tr><td colspan="5" class="py-3 text-center text-on-surface-variant/50 font-label text-xs">...and ${state.data.length - 50} more rows</td></tr>`
        : "");

    if (labelItemCount) {
      labelItemCount.textContent = `${state.data.length} item${state.data.length !== 1 ? "s" : ""} connected`;
    }
  }

  function updateConfigDisplay() {
    if (!configJsonDisplay) return;
    configJsonDisplay.textContent = JSON.stringify(
      {
        layout: {
          type: state.layoutType,
          ...(state.layoutType === "physics"
            ? { physics: { collisionPad: state.collisionPad } }
            : {}),
        },
        render: {
          mode: state.renderMode,
          theme: state.blur > 0 ? "glass" : "flat",
        },
        bubbleAppearance: { opacity: state.opacity },
        theme: { primary: state.primaryColor, blur: state.blur },
      },
      null,
      2
    );
  }

  function updateUI() {
    // Sync JSON editor (don't overwrite if user is actively editing)
    if (document.activeElement !== dataEditor && dataEditor) {
      dataEditor.value = JSON.stringify(state.data, null, 2);
    }

    updateTable();
    updateConfigDisplay();

    // Button active state helpers
    const activePrimary = ["bg-primary", "text-on-primary-fixed", "shadow-lg"];
    const activeSecondary = [
      "bg-secondary",
      "text-on-secondary-fixed",
      "shadow-lg",
    ];
    const inactive = ["text-on-surface-variant", "hover:text-on-surface"];

    // Layout buttons
    [btnStatic, btnPhysics].forEach((b) => {
      if (!b) return;
      b.classList.remove(...activePrimary, ...inactive);
      b.classList.add(...inactive);
    });
    const activeLayoutBtn =
      state.layoutType === "static" ? btnStatic : btnPhysics;
    if (activeLayoutBtn) {
      activeLayoutBtn.classList.remove(...inactive);
      activeLayoutBtn.classList.add(...activePrimary);
    }

    // Renderer buttons
    [btnAuto, btnSvg, btnCanvas].forEach((b) => {
      if (!b) return;
      b.classList.remove(...activePrimary, ...activeSecondary, ...inactive);
      b.classList.add(...inactive);
    });
    const rendererMap = { auto: btnAuto, svg: btnSvg, canvas: btnCanvas };
    const activeRendererBtn = rendererMap[state.renderMode];
    if (activeRendererBtn) {
      activeRendererBtn.classList.remove(...inactive);
      activeRendererBtn.classList.add(
        ...(state.renderMode === "canvas" ? activeSecondary : activePrimary)
      );
    }

    // Sliders & inputs
    if (inputSpacing && labelSpacing) {
      inputSpacing.value = state.collisionPad;
      labelSpacing.textContent = `${state.collisionPad}px`;
    }
    if (inputOpacity && labelOpacity) {
      inputOpacity.value = state.opacity;
      labelOpacity.textContent = state.opacity.toFixed(2);
    }
    if (inputBlur) {
      inputBlur.checked = state.blur > 0;
    }
    if (inputPrimaryColor) {
      inputPrimaryColor.value = state.primaryColor;
    }
  }

  // ── Export helpers ────────────────────────────────────────────────────────

  function getImplementCode() {
    const cfg = buildChartConfig();
    delete cfg.canvasContainerId;
    delete cfg.debug;
    return `const chart = initializeChart({\n  canvasContainerId: "your-container-id",\n${JSON.stringify(cfg, null, 2).slice(1, -1)}});`;
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  // Layout mode
  if (btnStatic)
    btnStatic.addEventListener("click", () => {
      state.layoutType = "static";
      rebuildChart();
    });
  if (btnPhysics)
    btnPhysics.addEventListener("click", () => {
      state.layoutType = "physics";
      rebuildChart();
    });

  // Renderer mode — requires full rebuild (renderer is resolved once at init)
  if (btnAuto)
    btnAuto.addEventListener("click", () => {
      state.renderMode = "auto";
      rebuildChart();
    });
  if (btnSvg)
    btnSvg.addEventListener("click", () => {
      state.renderMode = "svg";
      rebuildChart();
    });
  if (btnCanvas)
    btnCanvas.addEventListener("click", () => {
      state.renderMode = "canvas";
      rebuildChart();
    });

  // Node spacing (maps to collisionPad in physics layout)
  if (inputSpacing) {
    inputSpacing.addEventListener("input", (e) => {
      state.collisionPad = parseInt(e.target.value, 10);
      if (labelSpacing) labelSpacing.textContent = `${state.collisionPad}px`;
      rebuildChart();
    });
  }

  // Opacity
  if (inputOpacity) {
    inputOpacity.addEventListener("input", (e) => {
      state.opacity = parseFloat(e.target.value);
      if (labelOpacity) labelOpacity.textContent = state.opacity.toFixed(2);
      rebuildChart();
    });
  }

  // Blur toggle
  if (inputBlur) {
    inputBlur.addEventListener("change", (e) => {
      state.blur = e.target.checked ? 12 : 0;
      rebuildChart();
    });
  }

  // Primary color
  if (inputPrimaryColor) {
    inputPrimaryColor.addEventListener("input", (e) => {
      state.primaryColor = e.target.value;
      updateConfigDisplay();
    });
  }

  // JSON editor — real-time, safe parse
  if (dataEditor) {
    dataEditor.addEventListener("input", () => {
      try {
        const parsed = JSON.parse(dataEditor.value);
        if (Array.isArray(parsed)) {
          state.data = parsed;
          if (chartInstance) chartInstance.update(state.data);
          updateTable();
          updateConfigDisplay();
        }
      } catch {
        // Ignore parse errors while user is still typing
      }
    });
  }

  // "Update Live Chart" button
  if (btnUpdateChart) {
    btnUpdateChart.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(dataEditor.value);
        if (!Array.isArray(parsed)) throw new Error("Expected an array");
        state.data = parsed;
        if (chartInstance) chartInstance.update(state.data);
        updateTable();
        updateConfigDisplay();
        const orig = btnUpdateChart.innerHTML;
        btnUpdateChart.innerHTML =
          '<span class="material-symbols-outlined text-sm font-bold">check</span> Updated!';
        setTimeout(() => {
          btnUpdateChart.innerHTML = orig;
        }, 2000);
      } catch {
        alert(
          "Invalid JSON. Please ensure the editor contains a valid JSON array."
        );
      }
    });
  }

  // Reset to demo data
  if (btnResetDemo) {
    btnResetDemo.addEventListener("click", () => {
      state.data = JSON.parse(JSON.stringify(PRESETS.neon.data));
      if (chartInstance) chartInstance.update(state.data);
      updateTable();
      updateConfigDisplay();
      if (dataEditor && document.activeElement !== dataEditor) {
        dataEditor.value = JSON.stringify(state.data, null, 2);
      }
      const orig = btnResetDemo.innerHTML;
      btnResetDemo.innerHTML =
        '<span class="material-symbols-outlined text-sm">check</span> Reset';
      setTimeout(() => {
        btnResetDemo.innerHTML = orig;
      }, 2000);
    });
  }

  // Presets
  function applyPreset(presetName) {
    const p = PRESETS[presetName];
    if (!p) return;
    state.layoutType = p.layout.type;
    state.collisionPad = p.layout.physics?.collisionPad ?? 8;
    state.centerStrength = p.layout.physics?.centerStrength ?? 0.02;
    state.renderMode = p.render.mode;
    state.opacity = p.theme.opacity;
    state.blur = p.theme.blur;
    state.primaryColor = p.theme.primary;
    state.data = JSON.parse(JSON.stringify(p.data));
    rebuildChart();
    if (typeof activateDataSource === "function") activateDataSource();
  }

  ["neon", "cyber", "ghost", "dense"].forEach((presetName) => {
    const btn = document.getElementById(`btn-preset-${presetName}`);
    if (btn) btn.addEventListener("click", () => applyPreset(presetName));
  });

  // Copy config JSON
  if (btnCopyConfig) {
    btnCopyConfig.addEventListener("click", () => {
      navigator.clipboard
        .writeText(configJsonDisplay?.textContent ?? "")
        .catch(() => {});
    });
  }

  // Export — downloads config as JSON file
  function doExport() {
    const blob = new Blob([configJsonDisplay?.textContent ?? "{}"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bubble-chart-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (btnExport) btnExport.addEventListener("click", doExport);
  if (btnExportSidebar) btnExportSidebar.addEventListener("click", doExport);

  // Implement — copies ready-to-use initializeChart() code to clipboard
  if (btnImplement) {
    btnImplement.addEventListener("click", () => {
      const orig = btnImplement.innerHTML;
      navigator.clipboard
        .writeText(getImplementCode())
        .then(() => {
          btnImplement.innerHTML =
            '<span class="material-symbols-outlined text-sm">check</span> Copied!';
          setTimeout(() => {
            btnImplement.innerHTML = orig;
          }, 2000);
        })
        .catch(() => {});
    });
  }

  // Floating controls
  if (btnRefreshChart)
    btnRefreshChart.addEventListener("click", () => rebuildChart());

  let zoomLevel = 1;
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 2.0;

  function applyZoom() {
    const container = document.getElementById("playground-canvas");
    if (container) {
      container.style.transform = `scale(${zoomLevel})`;
      container.style.transformOrigin = "center center";
    }
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", () => {
      zoomLevel = Math.min(ZOOM_MAX, +(zoomLevel + ZOOM_STEP).toFixed(1));
      applyZoom();
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", () => {
      zoomLevel = Math.max(ZOOM_MIN, +(zoomLevel - ZOOM_STEP).toFixed(1));
      applyZoom();
    });
  }

  // Debug checkboxes — wire up rebuild (the HTML also wires these but guard here too)
  [dbgGrid, dbgVelocity, dbgCollision, dbgIds].forEach((el) => {
    if (el) el.addEventListener("change", () => rebuildChart());
  });

  // ── Initial render ────────────────────────────────────────────────────────
  // Defer one rAF so the browser finishes Tailwind layout before we read clientWidth/clientHeight
  requestAnimationFrame(() => rebuildChart());
});
