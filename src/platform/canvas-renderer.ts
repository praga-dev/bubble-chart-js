/**
 * Canvas Renderer — Web platform implementation of IRenderer.
 *
 * Wraps CanvasRenderingContext2D to provide the IRenderer interface.
 * Handles HiDPI canvas scaling, circle drawing, and text rendering.
 */

import { IRenderer } from '../interfaces/i-renderer';
import { ResolvedBubbleStyle } from '../core/types';

export class CanvasRenderer implements IRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  setup(): { width: number; height: number } {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    return { width: rect.width, height: rect.height };
  }

  getSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawCircle(
    x: number,
    y: number,
    radius: number,
    fillColor: string,
    strokeColor: string,
    strokeWidth: number,
    opacity?: number
  ): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    if (strokeWidth > 0) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
    }
  }

  drawText(
    text: string,
    x: number,
    y: number,
    style: Pick<
      ResolvedBubbleStyle,
      'fontSize' | 'fontFamily' | 'fontWeight' | 'fontStyle' | 'fontColor' | 'textAlign' | 'textBaseline'
    >
  ): void {
    const ctxFont = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;

    this.ctx.fillStyle = style.fontColor;
    this.ctx.font = ctxFont;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.textAlign = style.textAlign as CanvasTextAlign;
    this.ctx.textBaseline = style.textBaseline as CanvasTextBaseline;

    this.ctx.fillText(text, Math.round(x), Math.round(y));
  }

  destroy(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      parent.removeChild(this.canvas);
    }
  }
}
