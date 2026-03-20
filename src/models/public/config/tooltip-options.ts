export interface TooltipOptions {
  /**
   * CSS font-family property
   * @default "Arial, sans-serif"
   */
  fontFamily?: string;

  /**
   * Font style for tooltip text
   * @validValues "normal", "italic", "oblique"
   * @default "normal"
   */
  fontStyle?: "normal" | "italic" | "oblique";

  /**
   * Font weight (numeric scale)
   * @validValues 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
   * @default 400
   */
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

  /**
   * Font size in pixels
   * @default 14
   */
  fontSize?: number;

  /**
   * Text alignment within tooltip
   * @validValues "left", "center", "right"
   * @default "left"
   */
  textAlign?: "left" | "center" | "right";

  /**
   * Text decoration style
   * @validValues "none", "underline", "line-through", "overline"
   * @default "none"
   */
  textDecoration?: "none" | "underline" | "line-through" | "overline";

  /**
   * Text transformation style
   * @validValues "none", "uppercase", "lowercase", "capitalize"
   * @default "none"
   */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";

  /**
   * Letter spacing in pixels (0 = normal)
   * @default undefined (normal spacing)
   */
  letterSpacing?: number;

  /**
   * Text color in CSS format
   * @default "white"
   */
  fontColor?: string;

  /**
   * Background color in CSS format
   * @default "rgba(0, 0, 0, 0.85)"
   */
  backgroundColor?: string;

  /**
   * A function that formats the tooltip content. If provided, this overrides default rendering.
   * Return a string (can be HTML) to display inside the tooltip for the hovered item.
   */
  formatter?: (item: any) => string;

  /* 🖌 Styling */
  /**
   * Border color in CSS format
   * @default "transparent"
   */
  borderColor?: string;

  /**
   * Border style (requires borderWidth to be set)
   * @validValues "solid", "dashed", "dotted", "double", "none"
   * @default "none"
   */
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "none";

  /**
   * Border width (CSS value or number in pixels)
   * @example "2px", "0.5rem", 3
   */
  borderWidth?: string | number;

  /**
   * CSS padding value
   * @example "10px", "1em 2rem", "5% 10px"
   * @default "8px"
   */
  padding?: string | number;

  /**
   * CSS margin value
   * @example "10px auto", "2rem 1rem"
   * @default "0"
   */
  margin?: string | number;

  /**
   * CSS box-shadow property
   * @example "3px 3px 5px rgba(0,0,0,0.3)"
   * @default "none"
   */
  boxShadow?: string;

  /**
   * Opacity value (0 = fully transparent, 1 = fully opaque)
   * @minimum 0
   * @maximum 1
   * @default 1
   */
  opacity?: number;

  /* 📏 Size */
  /**
   * Maximum width in pixels
   * @default 200
   */
  maxWidth?: number;

  /**
   * Minimum width in pixels
   * @default undefined (auto)
   */
  minWidth?: number;

  /**
   * Maximum height in pixels
   * @default undefined (none)
   */
  maxHeight?: number;

  /**
   * Minimum height in pixels
   * @default undefined (auto)
   */
  minHeight?: number;

  /* 📌 Positioning */
  /**
   * Preferred position relative to target element
   * @validValues "top", "bottom", "left", "right"
   */
  position?: "top" | "bottom" | "left" | "right";

  /**
   * Horizontal offset in pixels
   * @default 0
   */
  offsetX?: number;

  /**
   * Vertical offset in pixels
   * @default 0
   */
  offsetY?: number;

  /**
   * CSS z-index property
   * @default 1000
   */
  zIndex?: number;

  /**
   * CSS pointer-events property
   * @validValues "auto", "none"
   * @default "none"
   */
  pointerEvents?: "auto" | "none";

  /* 🎨 Advanced */
  /**
   * Enable/disable animations
   * @default true
   */
  animation?: boolean;

  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;

  /**
   * CSS backdrop-filter property
   * @example "blur(5px)"
   * @default "none"
   */
  backdropFilter?: string;

  /**
   * CSS transition property
   * @default "opacity 0.2s"
   */
  transition?: string;

  /**
   * CSS transform property
   * @default "none"
   */
  transform?: string;
}
