/**
 * Chart Orchestrator — Layer 2: Wires the core engine to the platform renderer.
 *
 * This is the coordination layer. It:
 * 1. Validates configuration
 * 2. Creates the platform renderer and text measurer
 * 3. Runs the layout engine to compute positions
 * 4. Draws bubbles using the renderer
 * 5. Sets up interaction handlers (tooltip, click, resize)
 * 6. Manages lifecycle (create, update, destroy)
 *
 * This layer IS platform-specific (it instantiates web implementations),
 * but it keeps the control flow clean and separate from both the
 * core algorithm and the low-level rendering.
 */

import { Configuration } from '../models/public/configuration';
import { PositionedNode, ResolvedBubbleStyle } from '../core/types';
import { computeLayout } from '../core/layout-engine';
import { computeFontSize } from '../core/font-sizer';
import { getWrappedLines } from '../core/text-wrapper';
import { CanvasRenderer } from '../platform/canvas-renderer';
import { CanvasTextMeasurer } from '../platform/canvas-text-measurer';
import {
  createTooltipElement,
  getTooltipContent,
  updateTooltipPosition,
  hideTooltip,
} from '../platform/dom-tooltip';
import {
  getMousePosition,
  findHoveredNode,
  createResizeHandler,
  createRAFThrottle,
} from '../platform/dom-interactions';
import { createCanvas } from '../canvas';
import { validateConfig } from '../utils/validation';

export interface ChartInstance {
  destroy: () => void;
  update: (newData: any[]) => ChartInstance | undefined;
}

export function orchestrateChart(config: Configuration): ChartInstance | undefined {
  if (!validateConfig(config)) return undefined;

  // --- Create platform implementations ---
  const canvasElement = createCanvas(config);
  if (!canvasElement) return undefined;

  const renderer = new CanvasRenderer(canvasElement);
  const textMeasurer = new CanvasTextMeasurer(renderer.getContext());

  // --- Setup and compute layout ---
  const { width, height } = renderer.setup();
  let positionedNodes = computeLayout(config.data, width, height);

  // --- Draw function ---
  function draw() {
    renderer.setup();
    renderer.clear();

    positionedNodes.forEach((node) => {
      const style = resolveStyle(node, positionedNodes, config);

      // Draw bubble
      renderer.drawCircle(
        node.x,
        node.y,
        Math.max(node.radius || 0, config.minRadius || 10),
        style.bubbleColor,
        style.borderColor,
        style.borderThickness,
        style.opacity
      );

      // Prepare label text
      let labelText = node.label || '';
      if (style.textTransform === 'uppercase') labelText = labelText.toUpperCase();
      else if (style.textTransform === 'lowercase') labelText = labelText.toLowerCase();
      else if (style.textTransform === 'capitalize')
        labelText = labelText.replace(/\b\w/g, (c) => c.toUpperCase());

      const effectiveRadius = Math.max(node.radius || 0, config.minRadius || 10);
      const textStyle = {
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        fontColor: style.fontColor,
        textAlign: style.textAlign,
        textBaseline: style.textBaseline,
      };

      // Handle text wrapping
      if (config.textWrap) {
        const padding = 5;
        const maxWidth = effectiveRadius * 1.5 - padding * 2;
        const lineHeight = style.fontSize * 1.4;

        const lines = getWrappedLines(
          textMeasurer,
          node.label,
          maxWidth,
          config.maxLines,
          effectiveRadius,
          style.fontSize,
          style.fontWeight,
          style.fontStyle,
          style.fontFamily
        );

        const startY = node.y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
          renderer.drawText(
            line,
            node.x,
            startY + index * lineHeight,
            textStyle
          );
        });
      } else {
        renderer.drawText(labelText, node.x, node.y, textStyle);
      }
    });
  }

  // --- Resize handling ---
  let resizeHandler: { destroy: () => void } | null = null;
  if (config.isResizeCanvasOnWindowSizeChange) {
    const container = document.getElementById(config.canvasContainerId);
    if (container) {
      resizeHandler = createResizeHandler(container, () => {
        const canvas = renderer.getCanvas();
        if (container && canvas) {
          canvas.width = container.offsetWidth;
          canvas.height = container.offsetHeight;
          draw();
        }
      });
    }
  }

  // --- Initial draw ---
  draw();

  // --- Tooltip ---
  let tooltip: HTMLDivElement | null = null;
  if (config.showToolTip) {
    tooltip = createTooltipElement(config);
  }

  // --- Mouse interaction ---
  const canvas = renderer.getCanvas();

  const moveThrottle = createRAFThrottle((event: MouseEvent) => {
    const { mouseX, mouseY } = getMousePosition(event, canvas);
    const hovered = findHoveredNode(mouseX, mouseY, positionedNodes);

    if (hovered) {
      const hoverCursor = config?.cursorType || 'pointer';
      canvas.style.cursor = hoverCursor;
      if (tooltip) {
        const content = getTooltipContent(hovered, config);
        updateTooltipPosition(event, tooltip, canvas, content);
      }
    } else {
      canvas.style.cursor = 'default';
      hideTooltip(tooltip);
    }
  });
  canvas.addEventListener('mousemove', moveThrottle.handle);

  const clickThrottle = createRAFThrottle((event: MouseEvent) => {
    const { mouseX, mouseY } = getMousePosition(event, canvas);
    const clicked = findHoveredNode(mouseX, mouseY, positionedNodes);
    if (clicked && config.onBubbleClick) {
      config.onBubbleClick(clicked, event);
    }
  });
  if (config.onBubbleClick) {
    canvas.addEventListener('click', clickThrottle.handle);
  }

  // --- Lifecycle methods ---
  const destroy = () => {
    resizeHandler?.destroy();
    moveThrottle.cancel();
    clickThrottle.cancel();
    canvas.removeEventListener('mousemove', moveThrottle.handle);
    canvas.removeEventListener('click', clickThrottle.handle);
    renderer.destroy();

    if (tooltip?.parentElement) {
      tooltip.parentElement.removeChild(tooltip);
    }
    tooltip = null;
  };

  const update = (newData: any[]): ChartInstance | undefined => {
    destroy();
    config.data = newData;
    return orchestrateChart(config);
  };

  return { destroy, update };
}

/**
 * Resolves the final rendering style for a single bubble,
 * applying fallbacks from config and color palette.
 */
function resolveStyle(
  node: PositionedNode,
  allNodes: PositionedNode[],
  config: Configuration
): ResolvedBubbleStyle {
  // Determine bubble color with palette fallback
  let bubbleColor = config.defaultBubbleColor ?? '#3498db';
  if (node.bubbleColor) {
    bubbleColor = node.bubbleColor;
  } else if (config.colorPalette && config.colorPalette.length > 0) {
    const index = allNodes.findIndex(
      (d) => d.label === node.label && d.value === node.value
    );
    const colorIndex = index >= 0 ? index : 0;
    bubbleColor = config.colorPalette[colorIndex % config.colorPalette.length];
  }

  const effectiveRadius = Math.max(node.radius || 0, config.minRadius || 10);

  return {
    bubbleColor,
    borderColor: node.borderColor ?? 'black',
    borderThickness: Math.max(node.borderThickness ?? 0.25, 0),
    opacity:
      node.opacity !== undefined
        ? Math.max(0, Math.min(1, node.opacity))
        : 1,
    fontStyle: node.fontStyle || 'normal',
    fontWeight:
      typeof node.fontWeight === 'number' &&
      node.fontWeight >= 100 &&
      node.fontWeight <= 900
        ? node.fontWeight
        : 400,
    textAlign: node.textAlign ?? 'center',
    textTransform: node.textTransform ?? 'none',
    fontColor: node.fontColor ?? config.defaultFontColor ?? '#000',
    textBaseline: node.textBaseline ?? 'middle',
    fontSize: Math.max(
      computeFontSize(
        effectiveRadius,
        config.fontSize ?? 14,
        node.fontWeight ?? 400
      ),
      8
    ),
    fontFamily:
      node.fontFamily &&
      typeof node.fontFamily === 'string' &&
      node.fontFamily !== 'Arial'
        ? `${node.fontFamily}, Arial, sans-serif`
        : `${config.defaultFontFamily ?? 'Arial'}, sans-serif`,
  };
}
