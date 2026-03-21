import { BubbleState } from '../../models/internal/bubble-state';
import { ILayoutEngine } from '../../interfaces/i-layout-engine';
import { PhysicsLayoutConfig } from '../../models/public/configuration';
import { seededRandom } from '../simulation/seeded-random';
import { clamp } from '../../utils/helper';

const PADDING = 5;

export class PhysicsLayout implements ILayoutEngine {
  private bubbles: BubbleState[] = [];
  private width  = 0;
  private height = 0;
  private alpha  = 1.0;
  private cx = 0;
  private cy = 0;
  private readonly cfg: Required<Omit<PhysicsLayoutConfig, 'seed' | 'updateBehavior'>> & Pick<PhysicsLayoutConfig, 'seed' | 'updateBehavior'>;

  constructor(physicsConfig?: PhysicsLayoutConfig) {
    this.cfg = {
      seed:           physicsConfig?.seed,
      centerStrength: physicsConfig?.centerStrength ?? 0.012,
      collisionPad:   physicsConfig?.collisionPad   ?? 3,
      velocityDecay:  physicsConfig?.velocityDecay  ?? 0.82,
      wallStrength:   physicsConfig?.wallStrength   ?? 0.15,
      alphaDecay:     physicsConfig?.alphaDecay     ?? 0.0228,
      alphaMin:       physicsConfig?.alphaMin       ?? 0.001,
      maxVelocity:    physicsConfig?.maxVelocity    ?? 8,
      updateBehavior: physicsConfig?.updateBehavior ?? 'restart',
    };
  }

  initialize(bubbles: BubbleState[], width: number, height: number): void {
    this.bubbles = bubbles;
    this.width   = width;
    this.height  = height;
    this.cx = width  / 2;
    this.cy = height / 2;
    this.alpha   = 1.0;

    this.computeRadii();
    this.scatter();
  }

  tick(): boolean {
    if (this.alpha < this.cfg.alphaMin) return false;
    this.stepPhysics();
    this.alpha *= (1 - this.cfg.alphaDecay);
    return this.alpha >= this.cfg.alphaMin;
  }

  update(bubbles: BubbleState[], width: number, height: number): void {
    this.bubbles = bubbles;
    this.width   = width;
    this.height  = height;
    this.cx = width  / 2;
    this.cy = height / 2;
    this.computeRadii();
    // "restart": reset alpha, re-settle from current positions
    this.alpha = 1.0;
  }

  dispose(): void { /* nothing */ }

  private computeRadii(): void {
    const maxPossible = Math.min(this.width / 2, this.height / 2) - PADDING;
    const maxRadius = Math.min(Math.min(this.width, this.height) * 0.25, maxPossible);
    const minRadius = Math.max(maxRadius * 0.15, Math.min(this.width, this.height) * 0.03);
    const sorted = [...this.bubbles].sort((a, b) => b.value - a.value);
    const maxValue = sorted[0]?.value ?? 1;

    for (const b of this.bubbles) {
      const ratio = maxValue > 0 ? Math.sqrt(b.value / maxValue) : 0;
      b.radius = Math.max(minRadius, Math.min(maxRadius, minRadius + ratio * (maxRadius - minRadius)));
    }
  }

  private scatter(): void {
    // Use seeded PRNG for deterministic initial positions
    const rand = seededRandom(this.cfg.seed ?? Date.now());
    const sorted = [...this.bubbles].sort((a, b) => b.value - a.value);

    // Place largest at center
    if (sorted.length > 0) {
      sorted[0].x  = this.cx;
      sorted[0].y  = this.cy;
      sorted[0].vx = 0;
      sorted[0].vy = 0;
    }

    // Others: random positions around center
    for (let i = 1; i < sorted.length; i++) {
      const angle = rand() * Math.PI * 2;
      const dist  = sorted[0].radius + sorted[i].radius + 5 + rand() * 30;
      sorted[i].x  = clamp(this.cx + Math.cos(angle) * dist, PADDING + sorted[i].radius, this.width  - PADDING - sorted[i].radius);
      sorted[i].y  = clamp(this.cy + Math.sin(angle) * dist, PADDING + sorted[i].radius, this.height - PADDING - sorted[i].radius);
      sorted[i].vx = 0;
      sorted[i].vy = 0;
    }
  }

  private stepPhysics(): void {
    const { centerStrength, collisionPad, velocityDecay, wallStrength, maxVelocity } = this.cfg;
    const alpha = this.alpha;

    // 1. Center attraction
    for (const b of this.bubbles) {
      b.vx += (this.cx - b.x) * centerStrength * alpha;
      b.vy += (this.cy - b.y) * centerStrength * alpha;
    }

    // 2. Wall forces
    for (const b of this.bubbles) {
      const minX = PADDING + b.radius;
      const maxX = this.width  - PADDING - b.radius;
      const minY = PADDING + b.radius;
      const maxY = this.height - PADDING - b.radius;

      if (b.x < minX) b.vx += (minX - b.x) * wallStrength * alpha;
      else if (b.x > maxX) b.vx += (maxX - b.x) * wallStrength * alpha;
      if (b.y < minY) b.vy += (minY - b.y) * wallStrength * alpha;
      else if (b.y > maxY) b.vy += (maxY - b.y) * wallStrength * alpha;
    }

    // 3. Collision resolution (O(n²) — acceptable at ≤25 bubbles)
    for (let i = 0; i < this.bubbles.length; i++) {
      for (let j = i + 1; j < this.bubbles.length; j++) {
        const a  = this.bubbles[i];
        const b2 = this.bubbles[j];
        const dx = a.x - b2.x;
        const dy = a.y - b2.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = a.radius + b2.radius + collisionPad;

        if (dist < minDist) {
          const overlap = (minDist - dist) / dist * alpha;
          const nx = dx * overlap;
          const ny = dy * overlap;
          // Mass-weighted (by radius²)
          const massA = a.radius * a.radius;
          const massB = b2.radius * b2.radius;
          const total = massA + massB;
          const ratioA = massB / total;
          const ratioB = massA / total;
          a.vx  += nx * ratioA;
          a.vy  += ny * ratioA;
          b2.vx -= nx * ratioB;
          b2.vy -= ny * ratioB;
        }
      }
    }

    // 4. Velocity decay + cap + integrate
    for (const b of this.bubbles) {
      b.vx *= velocityDecay;
      b.vy *= velocityDecay;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > maxVelocity) {
        b.vx = (b.vx / speed) * maxVelocity;
        b.vy = (b.vy / speed) * maxVelocity;
      }
      b.x += b.vx;
      b.y += b.vy;
      // Boundary clamp
      b.x = clamp(b.x, PADDING + b.radius, this.width  - PADDING - b.radius);
      b.y = clamp(b.y, PADDING + b.radius, this.height - PADDING - b.radius);
    }
  }
}
