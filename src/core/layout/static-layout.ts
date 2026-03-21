import { BubbleState } from '../../models/internal/bubble-state';
import { ILayoutEngine } from '../../interfaces/i-layout-engine';

const PADDING = 5;

export class StaticLayout implements ILayoutEngine {
  initialize(bubbles: BubbleState[], width: number, height: number): void {
    if (bubbles.length === 0) return;
    this.computeRadii(bubbles, width, height);
    this.positionBubbles(bubbles, width, height);
  }

  tick(): boolean {
    return false; // static — always settled
  }

  update(bubbles: BubbleState[], width: number, height: number): void {
    this.initialize(bubbles, width, height);
  }

  dispose(): void { /* nothing */ }

  private computeRadii(bubbles: BubbleState[], width: number, height: number): void {
    const maxPossible = Math.min(width / 2, height / 2) - PADDING;
    const maxRadius = Math.min(Math.min(width, height) * 0.25, maxPossible);
    const minRadius = Math.max(maxRadius * 0.15, Math.min(width, height) * 0.03);

    const sorted = [...bubbles].sort((a, b) => b.value - a.value);
    const maxValue = sorted[0]?.value ?? 1;

    for (const b of bubbles) {
      const ratio = maxValue > 0 ? Math.sqrt(b.value / maxValue) : 0;
      b.radius = Math.max(minRadius, Math.min(maxRadius, minRadius + ratio * (maxRadius - minRadius)));
      b.vx = 0;
      b.vy = 0;
    }
  }

  private positionBubbles(bubbles: BubbleState[], width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const sorted = [...bubbles].sort((a, b) => b.value - a.value);

    // Place largest bubble at center
    sorted[0].x = cx;
    sorted[0].y = cy;

    // Golden angle spiral for the rest
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 1; i < sorted.length; i++) {
      const baseDist = sorted[0].radius + sorted[i].radius + 3;
      sorted[i].x = cx + Math.cos(goldenAngle * i) * baseDist;
      sorted[i].y = cy + Math.sin(goldenAngle * i) * baseDist;
    }

    // Force-directed settling: 500 iterations
    for (let iter = 0; iter < 500; iter++) {
      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i];
        if (i === 0) {
          // Center bubble: soft spring to center
          cur.x += (cx - cur.x) * 0.15;
          cur.y += (cy - cur.y) * 0.15;
          continue;
        }

        let dxTotal = 0;
        let dyTotal = 0;

        // Boundary constraints
        const bp = cur.radius + PADDING;
        if (cur.x < bp) dxTotal += (bp - cur.x) * 0.05;
        else if (cur.x > width - bp) dxTotal += (width - bp - cur.x) * 0.05;
        if (cur.y < bp) dyTotal += (bp - cur.y) * 0.05;
        else if (cur.y > height - bp) dyTotal += (height - bp - cur.y) * 0.05;

        // Repulsion from other bubbles
        for (let j = 0; j < sorted.length; j++) {
          if (i === j) continue;
          const other = sorted[j];
          const dx = cur.x - other.x;
          const dy = cur.y - other.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const minDist = cur.radius + other.radius;
          if (dist < minDist * 1.5) {
            const force = 0.008 * (minDist / dist);
            dxTotal += (dx / dist) * force;
            dyTotal += (dy / dist) * force;
          }
        }

        // Center attraction (value-weighted)
        const dxC = cx - cur.x;
        const dyC = cy - cur.y;
        const cDist = Math.hypot(dxC, dyC) || 0.001;
        const attraction = 0.012 * (cur.value / (sorted[0]?.value ?? 1));
        dxTotal += (dxC / cDist) * attraction;
        dyTotal += (dyC / cDist) * attraction;

        cur.x += dxTotal * 0.35;
        cur.y += dyTotal * 0.35;
      }

      // Collision resolution
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b2 = sorted[j];
          const dx = a.x - b2.x;
          const dy = a.y - b2.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const minDist = a.radius + b2.radius + 2;
          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            if (i === 0) {
              b2.x -= nx * overlap * 2;
              b2.y -= ny * overlap * 2;
            } else {
              a.x  += nx * overlap;
              a.y  += ny * overlap;
              b2.x -= nx * overlap;
              b2.y -= ny * overlap;
            }
          }
        }
      }
    }

    // Final boundary clamp
    for (const b of sorted) {
      b.x = Math.max(PADDING + b.radius, Math.min(width  - PADDING - b.radius, b.x));
      b.y = Math.max(PADDING + b.radius, Math.min(height - PADDING - b.radius, b.y));
    }
  }
}
