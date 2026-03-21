import { SimulationSnapshot } from '../models/internal/simulation-state';
import { DataItem } from '../models/public/data-item';
import { UnsubscribeFn } from '../models/public/configuration';

export interface EventMap {
  'simulation:tick':    SimulationSnapshot;
  'simulation:settled': SimulationSnapshot;
  'bubble:click':       { item: DataItem; event: PointerEvent };
  'bubble:hover':       DataItem | null;
}

export type EventName = keyof EventMap;
export type EventHandler<K extends EventName> = (payload: EventMap[K]) => void;

export class EventBus {
  private readonly handlers = new Map<EventName, Set<EventHandler<EventName>>>();
  private destroyed = false;

  on<K extends EventName>(event: K, handler: EventHandler<K>): UnsubscribeFn {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as EventHandler<EventName>);

    return () => {
      // Silently no-op if already cleared
      if (this.destroyed) return;
      set.delete(handler as EventHandler<EventName>);
    };
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    if (this.destroyed) return;
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      (handler as EventHandler<K>)(payload);
    }
  }

  clear(): void {
    this.destroyed = true;
    this.handlers.clear();
  }
}
