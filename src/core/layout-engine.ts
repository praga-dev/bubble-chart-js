/**
 * Layout Engine — The heart of the bubble chart.
 *
 * 100% platform-agnostic. Zero DOM/Canvas/UI dependencies.
 * This module computes bubble positions and radii using a force-directed
 * physics simulation. The same algorithm must be ported to Dart for
 * the Flutter package.
 *
 * Input:  DataItem[] + dimensions + PhysicsConfig
 * Output: PositionedNode[] (x, y, radius for each bubble)
 */

import { DataItem } from '../models/public/data-item';
import { PositionedNode, PhysicsConfig } from './types';
import physicsDefaults from '../../spec/physics.json';

const CANVAS_PADDING = 5;

/**
 * Computes the layout of all bubbles — positions, radii, and collision resolution.
 *
 * @param data - Array of data items to visualize
 * @param width - Available width in pixels
 * @param height - Available height in pixels
 * @param physicsOverrides - Optional overrides for physics simulation constants
 * @returns Array of positioned nodes with computed x, y, radius
 */
export function computeLayout(
  data: DataItem[],
  width: number,
  height: number,
  physicsOverrides?: Partial<PhysicsConfig>
): PositionedNode[] {
  const physics: PhysicsConfig = {
    forceStrength: physicsDefaults.forceStrength,
    iterations: physicsDefaults.iterations,
    damping: physicsDefaults.damping,
    boundaryForce: physicsDefaults.boundaryForce,
    centerForce: physicsDefaults.centerForce,
    centerAttraction: physicsDefaults.centerAttraction,
    centerDamping: physicsDefaults.centerDamping,
    centerRadiusBuffer: physicsDefaults.centerRadiusBuffer,
    ...physicsOverrides,
  };

  // Calculate available space considering padding
  const maxPossibleRadius = Math.min(
    (width - CANVAS_PADDING * 2) / 2,
    (height - CANVAS_PADDING * 2) / 2
  );

  const centerX = width / 2;
  const centerY = height / 2;

  // Sort by value descending, map to positioned nodes
  const nodes: PositionedNode[] = [...data]
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      ...item,
      radius: 0,
      x: 0,
      y: 0,
      fixed: false,
    }));

  if (nodes.length === 0) return nodes;

  const maxValue = nodes[0].value;

  // --- Phase 1: Compute radii ---
  const internalMaxRadius = Math.min(
    maxPossibleRadius * 0.5,
    Math.min(width, height) * 0.2
  );

  const internalMinRadius = Math.max(
    internalMaxRadius * 0.3,
    Math.min(width, height) * 0.05
  );

  nodes.forEach((item) => {
    const valueRatio = maxValue > 0 ? item.value / maxValue : 1;
    item.radius =
      internalMinRadius + valueRatio * (internalMaxRadius - internalMinRadius);

    item.radius = Math.max(
      0,
      Math.min(
        item.radius,
        (width - CANVAS_PADDING * 2) / 2,
        (height - CANVAS_PADDING * 2) / 2
      )
    );
  });

  // --- Phase 2: Initial positioning ---
  nodes.forEach((item, index) => {
    if (index === 0) {
      item.x = centerX;
      item.y = centerY;
      item.fixed = true;
    } else {
      const baseDist = nodes[0].radius + item.radius + 3;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));

      const maxX = width - CANVAS_PADDING - item.radius;
      const maxY = height - CANVAS_PADDING - item.radius;

      item.x = Math.min(
        maxX,
        Math.max(
          CANVAS_PADDING + item.radius,
          centerX + Math.cos(goldenAngle * index) * baseDist
        )
      );
      item.y = Math.min(
        maxY,
        Math.max(
          CANVAS_PADDING + item.radius,
          centerY + Math.sin(goldenAngle * index) * baseDist
        )
      );

      item.fixed = false;
    }
  });

  // --- Phase 3: Physics simulation ---
  runPhysicsSimulation(nodes, physics, width, height, centerX, centerY, maxValue);

  // --- Phase 4: Final boundary clamping ---
  clampToBounds(nodes, width, height);

  return nodes;
}

/**
 * Runs the force-directed physics simulation to resolve overlaps and
 * attract bubbles toward the center.
 */
function runPhysicsSimulation(
  nodes: PositionedNode[],
  physics: PhysicsConfig,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  maxValue: number
): void {
  for (let i = 0; i < physics.iterations; i++) {
    // Apply forces to each non-center node
    nodes.forEach((current, index) => {
      if (index === 0) {
        // Center bubble: soft spring to center
        const dx = centerX - current.x;
        const dy = centerY - current.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          current.x += dx * physics.centerDamping;
          current.y += dy * physics.centerDamping;
        }
        return;
      }

      let dxTotal = 0;
      let dyTotal = 0;

      // 1. Boundary constraints
      const boundaryPadding = current.radius + CANVAS_PADDING;
      if (current.x < boundaryPadding) {
        dxTotal += (boundaryPadding - current.x) * physics.boundaryForce;
      } else if (current.x > width - boundaryPadding) {
        dxTotal +=
          (width - boundaryPadding - current.x) * physics.boundaryForce;
      }

      // 2. Bubble repulsion
      nodes.forEach((other) => {
        if (current === other) return;

        const dx = current.x - other.x;
        const dy = current.y - other.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = current.radius + other.radius;

        if (distance < minDistance * 1.5) {
          const repulsionForce =
            physics.forceStrength * (minDistance / Math.max(distance, 0.1));
          dxTotal += (dx / distance) * repulsionForce;
          dyTotal += (dy / distance) * repulsionForce;
        }

        // Center attraction (value-based)
        const dxCenter = centerX - current.x;
        const dyCenter = centerY - current.y;
        const centerDistance = Math.hypot(dxCenter, dyCenter);
        const attractionStrength = 0.02 * (current.value / maxValue);

        current.x += (dxCenter / centerDistance) * attractionStrength;
        current.y += (dyCenter / centerDistance) * attractionStrength;
      });

      // 3. Strong center attraction with value-based weighting
      const dxCenter = centerX - current.x;
      const dyCenter = centerY - current.y;
      const centerDist = Math.hypot(dxCenter, dyCenter);
      const minCenterDist =
        nodes[0].radius + current.radius + physics.centerRadiusBuffer;

      const attractionStrength =
        physics.centerAttraction *
        (1 - current.value / maxValue) *
        (1 - Math.min(1, centerDist / minCenterDist));

      current.x += dxCenter * attractionStrength;
      current.y += dyCenter * attractionStrength;

      // Apply accumulated forces with damping
      current.x += dxTotal * (1 - physics.damping);
      current.y += dyTotal * (1 - physics.damping);
    });

    // Collision resolution pass
    resolveCollisions(nodes, physics);
  }
}

/**
 * Resolves overlapping bubbles using mass-weighted separation.
 */
function resolveCollisions(
  nodes: PositionedNode[],
  physics: PhysicsConfig
): void {
  nodes.forEach((current, i) => {
    nodes.forEach((other, j) => {
      if (i >= j) return;

      // Special handling for center bubble collisions
      if (i === 0 || j === 0) {
        const centerBubble = i === 0 ? current : other;
        const normalBubble = i === 0 ? other : current;

        const dx = normalBubble.x - centerBubble.x;
        const dy = normalBubble.y - centerBubble.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = centerBubble.radius + normalBubble.radius + 2;

        if (distance < minDistance) {
          const overlap = minDistance - distance;
          const angle = Math.atan2(dy, dx);

          normalBubble.x += Math.cos(angle) * overlap * 0.7;
          normalBubble.y += Math.sin(angle) * overlap * 0.7;
        }
        return;
      }

      const dx = current.x - other.x;
      const dy = current.y - other.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = current.radius + other.radius - 5;

      if (distance < minDistance) {
        const overlap =
          (minDistance - distance) * (0.3 + physics.forceStrength * 5);
        const angle = Math.atan2(dy, dx);

        const totalRadius = current.radius + other.radius;
        const massRatio = totalRadius > 0 ? other.radius / totalRadius : 0.5;
        if (!current.fixed) {
          current.x += Math.cos(angle) * overlap * massRatio;
          current.y += Math.sin(angle) * overlap * massRatio;
        }
        if (!other.fixed) {
          other.x -= Math.cos(angle) * overlap * (1 - massRatio);
          other.y -= Math.sin(angle) * overlap * (1 - massRatio);
        }
      }
    });
  });
}

/**
 * Clamps all nodes to stay within canvas boundaries.
 */
function clampToBounds(
  nodes: PositionedNode[],
  width: number,
  height: number
): void {
  nodes.forEach((bubble) => {
    const clampedX = Math.max(
      CANVAS_PADDING + bubble.radius,
      Math.min(width - CANVAS_PADDING - bubble.radius, bubble.x)
    );

    const clampedY = Math.max(
      CANVAS_PADDING + bubble.radius,
      Math.min(height - CANVAS_PADDING - bubble.radius, bubble.y)
    );

    if (
      !bubble.fixed ||
      Math.hypot(bubble.x - clampedX, bubble.y - clampedY) > 2
    ) {
      bubble.x = clampedX;
      bubble.y = clampedY;
    }
  });
}
