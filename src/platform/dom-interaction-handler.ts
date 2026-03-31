import { IInteractionHandler, BubbleClickHandler, BubbleHoverHandler } from '../interfaces/i-interaction-handler';
import { BubbleState } from '../models/internal/bubble-state';
import { DataItem } from '../models/public/data-item';

export class DomInteractionHandler implements IInteractionHandler {
  private element: HTMLElement | SVGElement | null = null;
  private bubbles: ReadonlyArray<BubbleState> = [];
  private readonly clickHandlers  = new Set<BubbleClickHandler>();
  private readonly hoverHandlers  = new Set<BubbleHoverHandler>();
  private hoveredId: string | null = null;

  private readonly onPointerMove  = (e: PointerEvent) => this.handleMove(e);
  private readonly onPointerLeave = (e: PointerEvent) => this.handleLeave();
  private readonly onPointerUp    = (e: PointerEvent) => this.handleClick(e);

  mount(element: HTMLElement | SVGElement): void {
    this.element = element;
    element.addEventListener('pointermove',  this.onPointerMove  as EventListener);
    element.addEventListener('pointerleave', this.onPointerLeave as EventListener);
    element.addEventListener('pointerup',    this.onPointerUp    as EventListener);
    (element as HTMLElement).style.cursor = 'default';
  }

  updateBubbles(bubbles: ReadonlyArray<BubbleState>): void {
    this.bubbles = bubbles;
  }

  onClick(handler: BubbleClickHandler): () => void {
    this.clickHandlers.add(handler);
    return () => this.clickHandlers.delete(handler);
  }

  onHover(handler: BubbleHoverHandler): () => void {
    this.hoverHandlers.add(handler);
    return () => this.hoverHandlers.delete(handler);
  }

  dispose(): void {
    if (this.element) {
      this.element.removeEventListener('pointermove',  this.onPointerMove  as EventListener);
      this.element.removeEventListener('pointerleave', this.onPointerLeave as EventListener);
      this.element.removeEventListener('pointerup',    this.onPointerUp    as EventListener);
      this.element = null;
    }
    this.clickHandlers.clear();
    this.hoverHandlers.clear();
    this.bubbles = [];
    this.hoveredId = null;
  }

  private getRelativePosition(e: PointerEvent): { x: number; y: number } | null {
    if (!this.element) return null;
    const rect = this.element.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private hitTest(x: number, y: number): BubbleState | null {
    // Iterate in reverse so the topmost (last-rendered) bubble wins when stacked.
    // Skip fully-transparent bubbles — they are visually invisible and non-interactive.
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.opacity === 0) continue;
      const r = b.renderRadius * b.renderScale;
      if (Math.hypot(x - b.renderX, y - b.renderY) <= r) return b;
    }
    return null;
  }

  private handleMove(e: PointerEvent): void {
    const pos = this.getRelativePosition(e);
    if (!pos) return;

    const hit = this.hitTest(pos.x, pos.y);
    const newId = hit?.id ?? null;

    if (newId !== this.hoveredId) {
      this.hoveredId = newId;
      const item = hit ? this.bubbleToDataItem(hit) : null;
      for (const h of this.hoverHandlers) h(item);
      if (this.element) {
        (this.element as HTMLElement).style.cursor = hit ? 'pointer' : 'default';
      }
    }
  }

  private handleLeave(): void {
    if (this.hoveredId !== null) {
      this.hoveredId = null;
      for (const h of this.hoverHandlers) h(null);
      if (this.element) (this.element as HTMLElement).style.cursor = 'default';
    }
  }

  private handleClick(e: PointerEvent): void {
    const pos = this.getRelativePosition(e);
    if (!pos) return;
    const hit = this.hitTest(pos.x, pos.y);
    if (hit) {
      const item = this.bubbleToDataItem(hit);
      for (const h of this.clickHandlers) h(item, e);
    }
  }

  private bubbleToDataItem(b: BubbleState): DataItem {
    return { id: b.id, label: b.label, value: b.value, bubbleColor: b.color, icon: b.icon };
  }
}
