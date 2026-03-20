import { Configuration } from './configuration';
import { initializeChartService } from '../../services/chart-service';
import { ChartInstance } from '../../orchestration/chart-orchestrator';

export class BubbleChart {
  configuration!: Configuration;
  private instance: ChartInstance | undefined;

  constructor(config: Partial<Configuration>) {
    const initResult = initializeChartService(config);
    if (!initResult) return;

    this.configuration = initResult.config;
    this.instance = initResult.instance;
  }

  /**
   * Destroys the chart by removing canvas elements and event listeners.
   */
  destroy(): void {
    if (this.instance) {
      this.instance.destroy();
    }
  }

  /**
   * Updates the chart with new data.
   */
  update(newData: any[]): void {
    if (this.instance) {
      this.instance = this.instance.update(newData);
    }
  }
}
