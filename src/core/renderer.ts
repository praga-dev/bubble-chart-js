import { Configuration } from "../models/public/configuration";
import { getWrappedLines } from "../features/text-wrapper";
import {
  createTooltipElement,
  handleMouseMove,
  onBubbleClickEventHandler,
} from "../features/tooltip";
import { validateConfig } from "../utils/validation";
import { createCanvas } from "../canvas";
import { getChartData } from "../services/render-service";
import { getFontSize, isFontAvailable } from "../utils/helper";
import { DataItemInfo } from "../models/internal/data-item-info";

export function renderChart(config: Configuration) {
  if (!validateConfig(config)) return;

  // Create & setup canvas
  let canvas = createCanvas(config);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Invalid context");
    return;
  }

  const { width, height } = setupHiDPICanvas(canvas, ctx);
  const sortedData = getChartData(config, width, height);

  function draw() {
    if (!canvas || !ctx) {
      console.warn("canvas or ctx is not valid");
      return;
    }

    setupHiDPICanvas(canvas, ctx);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sortedData.forEach((item) => {
      const {
        x,
        y,
        radius,
        bubbleColor,
        borderColor,
        borderThickness,
        opacity,
        fontColor,
        fontFamily,
        fontSize,
        fontStyle,
        fontWeight,
        textAlign,
        textTransform,
        textBaseline,
      } = getDefaultValues(item, config);

      // Set opacity for the bubble only
      // if(opacity){
      //   ctx.save(); // Save canvas state
      //   ctx.globalAlpha = opacity;
      // }

      // Draw bubble
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = bubbleColor;
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderThickness;
      ctx.stroke();

      // Text styling
      const ctxFont = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

      ctx.fillStyle = fontColor;
      ctx.font = ctxFont;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;

      // Transform text (uppercase, lowercase, capitalize)
      let labelText = item.label || "";
      if (textTransform === "uppercase") labelText = labelText.toUpperCase();
      else if (textTransform === "lowercase")
        labelText = labelText.toLowerCase();
      else if (textTransform === "capitalize")
        labelText = labelText.replace(/\b\w/g, (c) => c.toUpperCase());

      // ctx.restore(); // Restore previous state (removes opacity effect)

      // Handle text wrapping if enabled
      if (config.textWrap) {
        const padding = 5;
        const maxWidth = radius * 1.5 - padding * 2;
        const lineHeight = fontSize * 1.4;

        const lines = getWrappedLines(
          ctx,
          item.label,
          maxWidth,
          config.maxLines,
          radius,
          fontSize,
          fontWeight,
          fontStyle,
          fontFamily
        );
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
          const drawX = Math.round(x);
          const drawY = Math.round(startY + index * lineHeight);
          ctx.fillText(line, drawX, drawY);
        }
        );
      } else {
        ctx.fillText(item.label, Math.round(x), Math.round(y));
      }
    });
  }

  function setupHiDPICanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Always reset transform first
    ctx.scale(dpr, dpr);

    return { width: rect.width, height: rect.height, dpr };
  }

  /**
   * Returns an object with default values for bubble properties.
   * If a property is provided, it retains its original value.
   */
  function getDefaultValues(item: DataItemInfo, config: Configuration) {
    // Determine Bubble Color
    // 1. Try item's specific bubbleColor
    // 2. Try picking from colorPalette if available based on index/order
    // 3. Fallback to defaultBubbleColor
    let finalBubbleColor = config.defaultBubbleColor ?? "#3498db";
    if (item.bubbleColor) {
      finalBubbleColor = item.bubbleColor;
    } else if (config.colorPalette && config.colorPalette.length > 0) {
      // Use the index of the item in the sortedData array to pick a color
      const index = sortedData.findIndex(d => d.label === item.label && d.value === item.value);
      const colorIndex = index >= 0 ? index : 0;
      finalBubbleColor = config.colorPalette[colorIndex % config.colorPalette.length];
    }

    return {
      // Bubble properties
      x: item.x,
      y: item.y,
      radius: Math.max(item.radius || 0, config.minRadius || 10), // Ensure a minimum valid radius
      bubbleColor: finalBubbleColor,
      borderColor: item.borderColor ?? "black",
      borderThickness: Math.max(item.borderThickness ?? 0.25, 0), // Ensure non-negative thickness
      opacity:
        item.opacity !== undefined ? Math.max(0, Math.min(1, item.opacity)) : 1, // Clamp opacity between 0 and 1

      // Font properties
      fontStyle: item.fontStyle || "normal",
      fontWeight:
        typeof item.fontWeight === "number" &&
          item.fontWeight >= 100 &&
          item.fontWeight <= 900
          ? item.fontWeight
          : 400, // Clamp within 100-900
      textAlign: item.textAlign ?? "center",
      textTransform: item.textTransform ?? "none",
      fontColor: item.fontColor ?? config.defaultFontColor ?? "#000",
      textBaseline: item.textBaseline ?? "middle",

      // Font size logic: Ensures it is valid & readable
      fontSize: Math.max(
        getFontSize(
          item.radius || config.minRadius || 10, // Ensure radius is valid
          config.fontSize ?? 14, // Use config fontSize if available
          item.fontWeight ?? 400
        ),
        8 // Enforce a readable minimum font size
      ),

      // Font family with robust fallback
      fontFamily:
        item.fontFamily &&
          typeof item.fontFamily === "string" &&
          item.fontFamily !== "Arial"
          ? `${item.fontFamily}, Arial, sans-serif`
          : `${config.defaultFontFamily ?? "Arial"}, sans-serif`,
    };
  }

  // Robust approach that handles resizing:
  function resizeCanvas() {
    const canvasContainer = document.getElementById(config.canvasContainerId);
    if (canvasContainer && canvas) {
      canvas.width = canvasContainer.offsetWidth;
      canvas.height = canvasContainer.offsetHeight;
      draw(); // Call your drawing function
    }
  }

  const handleMouseMoveEvent = (event: MouseEvent) => {
    if (animationFrameId) return; // Prevent excessive calls
    animationFrameId = requestAnimationFrame(() => {
      handleMouseMove(event, sortedData, canvas as HTMLCanvasElement, tooltip, config);
      animationFrameId = null; // Reset after execution
    });
  };

  const handleClickEvent = (event: MouseEvent) => {
    if (clickFrameId) return; // Prevent multiple executions in a frame
    clickFrameId = requestAnimationFrame(() => {
      onBubbleClickEventHandler(event, sortedData, canvas as HTMLCanvasElement, config);
      clickFrameId = null; // Reset after execution
    });
  };

  let resizeObserver: ResizeObserver | null = null;
  if (config.isResizeCanvasOnWindowSizeChange) {
    const container = document.getElementById(config.canvasContainerId);
    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        // Debounce or directly call
        requestAnimationFrame(() => resizeCanvas());
      });
      resizeObserver.observe(container);
    } else {
      // Fallback
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
    }
  }

  // Initial draw
  draw();

  let tooltip: any;

  if (config.showToolTip) {
    tooltip = createTooltipElement(config);
  }
  
  let animationFrameId: number | null = null;
  canvas.addEventListener("mousemove", handleMouseMoveEvent);

  let clickFrameId: number | null = null; // Track animation frame
  if (config.onBubbleClick) {
    canvas.addEventListener("click", handleClickEvent);
  }

  // Define control methods
  const destroy = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
    if (config.isResizeCanvasOnWindowSizeChange) {
      window.removeEventListener("resize", resizeCanvas);
    }
    if (canvas) {
      canvas.removeEventListener("mousemove", handleMouseMoveEvent);
      canvas.removeEventListener("click", handleClickEvent);
      
      // Remove canvas from DOM
      const parent = canvas.parentElement;
      if (parent) {
        parent.removeChild(canvas);
      }
    }
    
    if (tooltip && tooltip.parentElement) {
      tooltip.parentElement.removeChild(tooltip);
    }
    
    // Nullify references
    canvas = null;
    tooltip = null;
  };

  const update = (newData: any[]) => {
    // We update the config with new data, and re-render the chart by
    // essentially destroying the old one and rendering a new one over it,
    // although a purely canvas-clearing update is slightly more performant.
    // Given the architecture, recreating it ensures all states are clean.
    destroy();
    config.data = newData;
    return renderChart(config);
  };

  return {
    destroy,
    update,
    // Add additional instance methods here later, like exportPNG
  };
}
