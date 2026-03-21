import { DataItem } from './data-item';
import { RenderLayer, UnsubscribeFn } from './configuration';
import { SimulationSnapshot } from '../internal/simulation-state';
import { LayerHook } from '../../interfaces/i-renderer';
import { ChartOrchestrator } from '../../orchestration/chart-orchestrator';
import { EventName, EventHandler } from '../../core/event-bus';

export class BubbleChart {
  constructor(private readonly orchestrator: ChartOrchestrator) {}

  /**
   * Subscribe to a chart event. Returns an unsubscribe function.
   * Subscriptions survive chart.update() — cleared only by chart.destroy() or calling the returned fn.
   */
  on<K extends EventName>(event: K, handler: EventHandler<K>): UnsubscribeFn {
    return this.orchestrator.on(event, handler);
  }

  /**
   * Synchronous snapshot of the last physics tick.
   * One allocation per tick while physics runs, zero allocations after settlement.
   */
  get simulation(): Readonly<SimulationSnapshot> {
    return this.orchestrator.simulation;
  }

  /**
   * Re-render the chart with new data.
   * Renderer does NOT change — it was resolved at init.
   * If data.length crosses the 25 boundary in SVG mode, a warning is emitted.
   * To switch renderers: chart.destroy() + initializeChart() with new data.
   */
  update(newData: DataItem[]): void {
    this.orchestrator.update(newData);
  }

  /**
   * Destroys the chart: stops animation loop, removes DOM elements, clears all subscriptions.
   * Any UnsubscribeFn held by the developer becomes a no-op after this call.
   */
  destroy(): void {
    this.orchestrator.destroy();
  }

  /**
   * Register a developer layer hook.
   * @returns Stable hook ID — use to remove with removeLayerHook().
   */
  addLayerHook(hook: Omit<LayerHook, 'id'>): string {
    return this.orchestrator.addLayerHook(hook);
  }

  /** Remove a layer hook by its ID. Built-in IDs use "builtin:" prefix. */
  removeLayerHook(id: string): void {
    this.orchestrator.removeLayerHook(id);
  }

  /** Get all registered hooks, optionally filtered by layer. */
  getLayerHooks(layer?: RenderLayer): ReadonlyArray<LayerHook> {
    return this.orchestrator.getLayerHooks(layer);
  }
}
