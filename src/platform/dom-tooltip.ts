/**
 * DOM Tooltip Manager — Web platform tooltip handling.
 *
 * Manages tooltip DOM element creation, positioning, and content updates.
 * Extracted from features/tooltip.ts.
 */

import { PositionedNode } from '../core/types';
import { Configuration } from '../models/public/configuration';

/**
 * Appends a tooltip element to the chart container's parent.
 */
function appendTooltip(
  tooltip: HTMLDivElement,
  containerId: string
): HTMLDivElement | null {
  const id = `bubbleChartTooltip-${containerId}`;
  return (
    (document.body.querySelector(`#${id}`) as HTMLDivElement) ||
    (tooltip.id = id, document.body.appendChild(tooltip), tooltip)
  );
}

/**
 * Creates and styles a tooltip DOM element based on configuration.
 */
export function createTooltipElement(
  config: Configuration
): HTMLDivElement | null {
  const formattedToolTip =
    config.data[0]?.toolTipConfig?.tooltipFormattedData?.trim();
  if (formattedToolTip) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = formattedToolTip.trim();

    const tooltip = tempContainer.firstElementChild as HTMLDivElement;

    tooltip.style.display = 'none';
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';
    tooltip.style.position = 'absolute';

    return appendTooltip(tooltip, config.canvasContainerId);
  }

  const tooltip = document.createElement('div');
  tooltip.style.display = 'none';

  const tooltipOptions = config?.tooltipOptions ?? {};

  const getCssValue = (
    value: string | number | undefined,
    defaultValue: string
  ): string => {
    if (typeof value === 'number') return `${value}px`;
    return value ?? defaultValue;
  };

  const getBorderValue = () => {
    if (!tooltipOptions.borderStyle) return 'none';
    const width = getCssValue(tooltipOptions.borderWidth, '1px');
    const color = tooltipOptions.borderColor ?? 'transparent';
    return `${width} ${tooltipOptions.borderStyle} ${color}`;
  };

  Object.assign(tooltip.style, {
    position: 'absolute',
    padding: getCssValue(tooltipOptions.padding, '8px'),
    margin: getCssValue(tooltipOptions.margin, '0'),
    background: tooltipOptions.backgroundColor ?? 'rgba(0, 0, 0, 0.85)',
    color: tooltipOptions.fontColor ?? 'white',
    borderRadius: '4px',
    pointerEvents: tooltipOptions.pointerEvents ?? 'none',
    fontFamily: tooltipOptions.fontFamily ?? 'Arial, sans-serif',
    fontSize: getCssValue(tooltipOptions.fontSize, '14px'),
    fontWeight: String(tooltipOptions.fontWeight ?? '400'),
    fontStyle: tooltipOptions.fontStyle ?? 'normal',
    textAlign: tooltipOptions.textAlign ?? 'left',
    textDecoration: tooltipOptions.textDecoration ?? 'none',
    textTransform: tooltipOptions.textTransform ?? 'none',
    letterSpacing: getCssValue(tooltipOptions.letterSpacing, 'normal'),
    border: getBorderValue(),
    boxShadow: tooltipOptions.boxShadow ?? 'none',
    maxWidth: getCssValue(tooltipOptions.maxWidth, '200px'),
    minWidth: getCssValue(tooltipOptions.minWidth, 'auto'),
    maxHeight: getCssValue(tooltipOptions.maxHeight, 'none'),
    minHeight: getCssValue(tooltipOptions.minHeight, 'auto'),
    zIndex: String(tooltipOptions.zIndex ?? 1000),
    transition: tooltipOptions.transition ?? 'opacity 0.2s',
    transform: tooltipOptions.transform ?? 'none',
    backdropFilter: tooltipOptions.backdropFilter ?? 'none',
    opacity: String(tooltipOptions.opacity ?? 1),
    display: 'none',
    visibility: 'hidden',
  });

  appendTooltip(tooltip, config.canvasContainerId);
  return tooltip;
}

/**
 * Gets the tooltip content for a hovered bubble.
 */
export function getTooltipContent(
  data: PositionedNode,
  config: Configuration
): string {
  if (!data) return '';

  // 1. Use Formatter Function if provided
  if (config.tooltipOptions && typeof config.tooltipOptions.formatter === 'function') {
    return config.tooltipOptions.formatter(data);
  }

  // 2. Use toolTipConfig.tooltipText
  const toolTipText = data.toolTipConfig?.tooltipText?.trim();
  if (toolTipText) {
    return `<div>${toolTipText}</div>`;
  }

  // 3. Use default Label + Value
  const label = data.label?.trim();
  if (label) {
    return `<div>${label}<br>Value: ${data.value}</div>`;
  }

  // 4. Value only
  return `<div>${data.value}</div>`;
}

/**
 * Updates tooltip position and content.
 */
export function updateTooltipPosition(
  event: MouseEvent,
  tooltip: HTMLDivElement,
  canvas: HTMLCanvasElement,
  content: string
): void {
  if (!tooltip || !canvas) return;

  tooltip.style.display = 'block';
  tooltip.innerHTML = content;

  tooltip.style.left = `${event.pageX + 15}px`;
  tooltip.style.top = `${event.pageY + 15}px`;

  tooltip.style.zIndex = '999999';
  tooltip.style.visibility = 'visible';
  tooltip.style.opacity = '1';
  tooltip.style.position = 'absolute';
}

/**
 * Hides the tooltip.
 */
export function hideTooltip(tooltip: HTMLDivElement | null): void {
  if (tooltip) {
    tooltip.style.display = 'none';
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';
  }
}
