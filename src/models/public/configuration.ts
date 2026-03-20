import { InteractionOptions } from "./config/interaction-options";
import { TooltipOptions } from "./config/tooltip-options";
import { DataItem } from "./data-item";

export interface Configuration extends InteractionOptions {
  data: DataItem[];

  // canvas
  canvasContainerId: string;

  /**
   * Background color of the canvas.
   *
   * @description Supports only HEX values (without `#`).
   * @default "transparent"
   */
  canvasBackgroundColor?: string;

  /**
   * Border color of the canvas.
   *
   * @description Supports only HEX values (without `#`).
   * @default "transparent"
   */
  canvasBorderColor?: string;

  // bubble
  minRadius: number;
  maxLines: number | "auto";
  textWrap: boolean;
  defaultBubbleColor: string;
  
  /**
   * An array of color strings to automatically apply to bubbles without a specific `bubbleColor`.
   */
  colorPalette?: string[];

  // font
  fontSize: number;
  defaultFontColor: string;
  defaultFontFamily: string;

  isResizeCanvasOnWindowSizeChange: boolean;
  tooltipOptions?: TooltipOptions;
}
