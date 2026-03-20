/**
 * Canvas Text Measurer — Web platform implementation of ITextMeasurer.
 *
 * Uses an offscreen CanvasRenderingContext2D to measure text widths.
 * This is the web-specific implementation; Flutter will use TextPainter.
 */

import { ITextMeasurer } from '../interfaces/i-text-measurer';

export class CanvasTextMeasurer implements ITextMeasurer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  measureWidth(
    text: string,
    fontSize: number,
    fontWeight: number,
    fontStyle: string,
    fontFamily: string
  ): number {
    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    return this.ctx.measureText(text).width;
  }
}
