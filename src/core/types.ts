/**
 * Core types shared between the core engine and platform layers.
 * These types are platform-agnostic and must remain free of DOM/UI dependencies.
 */

import { DataItem } from '../models/public/data-item';

/**
 * Represents a bubble after layout computation with resolved position and radius.
 */
export interface PositionedNode extends DataItem {
  /** Computed X coordinate (center of bubble) */
  x: number;
  /** Computed Y coordinate (center of bubble) */
  y: number;
  /** Computed radius based on value-to-size mapping */
  radius: number;
  /** Whether this node's position is fixed (e.g., center bubble) */
  fixed: boolean;
}

/**
 * Physics simulation configuration.
 * Loaded from spec/physics.json — must stay in sync across platforms.
 */
export interface PhysicsConfig {
  /** Repulsion force strength between bubbles */
  forceStrength: number;
  /** Number of simulation iterations */
  iterations: number;
  /** Velocity damping factor (0-1) */
  damping: number;
  /** Force applied when bubbles hit canvas boundaries */
  boundaryForce: number;
  /** Attraction force toward center */
  centerForce: number;
  /** Strength of center attraction for non-center bubbles */
  centerAttraction: number;
  /** Damping for center bubble repositioning */
  centerDamping: number;
  /** Buffer distance around center bubble */
  centerRadiusBuffer: number;
}

/**
 * Dimensions of the rendering surface.
 */
export interface SurfaceDimensions {
  width: number;
  height: number;
}

/**
 * Style properties resolved for rendering a single bubble.
 */
export interface ResolvedBubbleStyle {
  bubbleColor: string;
  borderColor: string;
  borderThickness: number;
  opacity: number;
  fontColor: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  fontWeight: number;
  textAlign: string;
  textTransform: string;
  textBaseline: string;
}
