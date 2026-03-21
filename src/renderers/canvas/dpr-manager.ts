/**
 * DprManager — manages devicePixelRatio (DPR) scaling for the canvas.
 *
 * On HiDPI/Retina displays, the physical pixel density is higher than CSS pixels.
 * Without DPR scaling, canvas graphics look blurry.
 *
 * Usage:
 *   const dpr = new DprManager(canvas, container);
 *   dpr.sync();  // call after resize or on init
 *   // Then use dpr.logicalWidth / dpr.logicalHeight for layout
 *   // Canvas context is pre-scaled — draw in CSS pixels, renders crisp
 */
export class DprManager {
  private _dpr: number = 1;
  private _logicalWidth:  number = 0;
  private _logicalHeight: number = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement
  ) {}

  get dpr(): number           { return this._dpr; }
  get logicalWidth(): number  { return this._logicalWidth; }
  get logicalHeight(): number { return this._logicalHeight; }

  /**
   * Syncs canvas buffer size to container size × DPR.
   * Scales the context transform so callers draw in CSS pixels.
   * Call this on init and on every resize.
   *
   * @returns true if dimensions changed (caller should re-render), false if unchanged
   */
  sync(): boolean {
    const dpr = window.devicePixelRatio || 1;
    const w   = this.container.clientWidth;
    const h   = this.container.clientHeight;

    if (
      this._dpr === dpr &&
      this._logicalWidth  === w &&
      this._logicalHeight === h
    ) {
      return false;
    }

    this._dpr           = dpr;
    this._logicalWidth  = w;
    this._logicalHeight = h;

    // Set the backing buffer size
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);

    // Scale the context transform so all draws use CSS pixel coordinates
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return true;
  }

  /**
   * Converts a canvas physical pixel coordinate to logical (CSS) coordinate.
   */
  toLogical(physicalX: number, physicalY: number): { x: number; y: number } {
    return {
      x: physicalX / this._dpr,
      y: physicalY / this._dpr,
    };
  }
}
