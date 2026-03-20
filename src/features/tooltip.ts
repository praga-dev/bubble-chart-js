import { DataItemInfo } from "../models/internal/data-item-info";
import { Configuration } from "../models/public/configuration";

let cursor: string = "default";

function appendTooltip(
  tooltip: HTMLDivElement,
  containerId: string
): HTMLDivElement | null {
  if (!containerId) return console.error("Invalid containerId."), null;

  const container = document.getElementById(
    containerId
  ) as HTMLDivElement | null;
  if (!container) return console.error("Container not found."), null;

  const parent = container.parentElement as HTMLDivElement | null;
  if (!parent) return console.error("Parent container not found."), null;

  return (
    (parent.querySelector("#bubbleChartTooltip") as HTMLDivElement) ||
    (parent.prepend(tooltip), tooltip)
  );
}

export function createTooltipElement(
  config: Configuration
): HTMLDivElement | null {
  const formattedToolTip =
    config.data[0].toolTipConfig?.tooltipFormattedData?.trim();
  if (formattedToolTip) {
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = formattedToolTip.trim();

    // Append to DOM
    const tooltip = tempContainer.firstElementChild as HTMLDivElement;

    // tooltip should be hidden on Initialization
    tooltip.style.display = "none";
    tooltip.style.visibility = "hidden";
    tooltip.style.opacity = "0";
    tooltip.style.position = "absolute";

    return appendTooltip(tooltip, config.canvasContainerId);
  }

  const tooltip = document.createElement("div");
  tooltip.id = "bubbleChartTooltip"; // TODO : get from constants
  tooltip.style.display = "none";

  const tooltipOptions = config?.tooltipOptions ?? {};

  // Helper functions (updated for new requirements)
  const getCssValue = (
    value: string | number | undefined,
    defaultValue: string
  ): string => {
    if (typeof value === "number") return `${value}px`; // Fallback for number inputs
    return value ?? defaultValue;
  };

  const getBorderValue = () => {
    if (!tooltipOptions.borderStyle) return "none";
    const width = getCssValue(tooltipOptions.borderWidth, "1px");
    const color = tooltipOptions.borderColor ?? "transparent";
    return `${width} ${tooltipOptions.borderStyle} ${color}`;
  };

  // Apply styles
  Object.assign(tooltip.style, {
    position: "absolute",
    padding: getCssValue(tooltipOptions.padding, "8px"),
    margin: getCssValue(tooltipOptions.margin, "0"),
    background: tooltipOptions.backgroundColor ?? "rgba(0, 0, 0, 0.85)",
    color: tooltipOptions.fontColor ?? "white",
    borderRadius: "4px",
    pointerEvents: tooltipOptions.pointerEvents ?? "none",
    fontFamily: tooltipOptions.fontFamily ?? "Arial, sans-serif",
    fontSize: getCssValue(tooltipOptions.fontSize, "14px"),
    fontWeight: String(tooltipOptions.fontWeight ?? "400"),
    fontStyle: tooltipOptions.fontStyle ?? "normal",
    textAlign: tooltipOptions.textAlign ?? "left",
    textDecoration: tooltipOptions.textDecoration ?? "none",
    textTransform: tooltipOptions.textTransform ?? "none",
    letterSpacing: getCssValue(tooltipOptions.letterSpacing, "normal"),
    border: getBorderValue(),
    boxShadow: tooltipOptions.boxShadow ?? "none",
    maxWidth: getCssValue(tooltipOptions.maxWidth, "200px"),
    minWidth: getCssValue(tooltipOptions.minWidth, "auto"),
    maxHeight: getCssValue(tooltipOptions.maxHeight, "none"),
    minHeight: getCssValue(tooltipOptions.minHeight, "auto"),
    zIndex: String(tooltipOptions.zIndex ?? 1000),
    transition: tooltipOptions.transition ?? "opacity 0.2s",
    transform: tooltipOptions.transform ?? "none",
    backdropFilter: tooltipOptions.backdropFilter ?? "none",

    // on Initialize it should be not visible
    opacity: String(tooltipOptions.opacity ?? 1),
    display: "none",
    visibility: "hidden",
  });

  // Append to DOM
  appendTooltip(tooltip, config.canvasContainerId);
  return tooltip;
}

export function onBubbleClickEventHandler( // TODO : move to interactions.ts
  event: MouseEvent,
  data: DataItemInfo[],
  canvas: HTMLCanvasElement,
  config: Configuration
) {
  const { mouseX, mouseY } = getMousePosition(event, canvas);
  const hoveredItem = findHoveredItem(mouseX, mouseY, data);

  if (hoveredItem === null || hoveredItem === undefined) return;

  if (config.onBubbleClick) {
    config.onBubbleClick(hoveredItem, event); // Call the click handler
  }
}

export function handleMouseMove(
  event: MouseEvent,
  data: DataItemInfo[],
  canvas: HTMLCanvasElement,
  tooltip: HTMLDivElement,
  config: Configuration
) {
  const { mouseX, mouseY } = getMousePosition(event, canvas);
  const hoveredItem = findHoveredItem(mouseX, mouseY, data);


  if (hoveredItem) {
    const hoverCursor = config?.cursorType || "pointer";
    canvas.style.cursor = hoverCursor;
    updateTooltip(event, hoveredItem, canvas, tooltip, config);
  } else {
    canvas.style.cursor = "default";
    if (tooltip) {
      tooltip.style.display = "none";
      tooltip.style.visibility = "hidden";
      tooltip.style.opacity = "0";
    }
  }
}

/**
 * Gets the mouse position relative to the canvas.
 */
function getMousePosition(event: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  return {
    mouseX: (event.clientX - rect.left) * dpr,
    mouseY: (event.clientY - rect.top) * dpr,
  };
}

/**
 * Finds the hovered item based on proximity to circles.
 */
function findHoveredItem(mouseX: number, mouseY: number, data: DataItemInfo[]) {
  return (
    data.find(
      (item) => Math.hypot(mouseX - item.x, mouseY - item.y) < item.radius
    ) || null
  );
}

/**
 * Updates the tooltip and cursor based on the hovered item.
 */
function updateTooltip(
  event: MouseEvent,
  hovered: DataItemInfo | null,
  canvas: HTMLCanvasElement,
  tooltip: HTMLDivElement,
  config: Configuration
) {
  if (hovered && hovered.value && canvas && tooltip) {
    canvas.style.cursor = cursor;
    tooltip.style.display = "block";
    tooltip.innerHTML = getToolTipData(hovered, config);

    // Get the correct position relative to the canvas
    const canvasRect = canvas.getBoundingClientRect();

    tooltip.style.left = `${event.clientX - canvasRect.left + 15}px`;
    tooltip.style.top = `${event.clientY - canvasRect.top + 15}px`;

    tooltip.style.zIndex = "999999";
    tooltip.style.visibility = "visible";
    tooltip.style.opacity = "1";
    tooltip.style.position = "absolute";
  }
}

function getToolTipData(data: DataItemInfo, config: Configuration): string {
  if (!data) return "";
  
  // 1. Use Formatter Function if provided
  if (config.tooltipOptions && typeof config.tooltipOptions.formatter === 'function') {
    return config.tooltipOptions.formatter(data);
  }

  // 2. Use toolTipConfig.tooltipFormattedData
  const toolTipText = data.toolTipConfig?.tooltipText?.trim();
  if (toolTipText) {
    return `<div>${toolTipText}</div>`;
  }

  // 3. Use default Label + Value
  const label = data.label?.trim();
  if (label) {
    return `<div>${label}<br>Value: ${data.value}</div>`;
  }

  // 4. Use Value only
  return `<div>${data.value}</div>`;
}
