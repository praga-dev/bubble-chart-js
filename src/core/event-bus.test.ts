import { EventBus, EventMap } from './event-bus';
import { SimulationSnapshot } from '../models/internal/simulation-state';
import { DataItem } from '../models/public/data-item';

function makeSnapshot(): SimulationSnapshot {
  return {
    alpha:     0.5,
    settled:   false,
    tickCount: 10,
    bubbles:   [],
  };
}

function makeDataItem(): DataItem {
  return { id: 'a', label: 'Alpha', value: 100 };
}

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on() and emit()', () => {
    it('on() registers a handler that fires when emit() is called', () => {
      const handler = jest.fn();
      bus.on('simulation:tick', handler);
      const payload = makeSnapshot();
      bus.emit('simulation:tick', payload);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('handler receives the exact payload passed to emit()', () => {
      let received: SimulationSnapshot | undefined;
      bus.on('simulation:tick', snap => { received = snap; });
      const payload = makeSnapshot();
      bus.emit('simulation:tick', payload);
      expect(received).toBe(payload);
    });

    it('emit() with no registered handlers does not throw', () => {
      expect(() => {
        bus.emit('simulation:tick', makeSnapshot());
      }).not.toThrow();
    });

    it('emit() with no handlers for that specific event does not throw', () => {
      bus.on('bubble:hover', jest.fn());
      expect(() => {
        bus.emit('simulation:tick', makeSnapshot());
      }).not.toThrow();
    });
  });

  describe('multiple handlers', () => {
    it('all handlers for the same event fire when emit() is called', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      const h3 = jest.fn();
      bus.on('simulation:tick', h1);
      bus.on('simulation:tick', h2);
      bus.on('simulation:tick', h3);
      bus.emit('simulation:tick', makeSnapshot());
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
      expect(h3).toHaveBeenCalledTimes(1);
    });

    it('all handlers receive the same payload', () => {
      const payloads: SimulationSnapshot[] = [];
      bus.on('simulation:tick', snap => payloads.push(snap));
      bus.on('simulation:tick', snap => payloads.push(snap));
      const payload = makeSnapshot();
      bus.emit('simulation:tick', payload);
      expect(payloads).toHaveLength(2);
      expect(payloads[0]).toBe(payload);
      expect(payloads[1]).toBe(payload);
    });
  });

  describe('different events do not cross-fire', () => {
    it('tick handler does not fire on settled event', () => {
      const tickHandler = jest.fn();
      bus.on('simulation:tick', tickHandler);
      bus.emit('simulation:settled', makeSnapshot());
      expect(tickHandler).not.toHaveBeenCalled();
    });

    it('settled handler does not fire on tick event', () => {
      const settledHandler = jest.fn();
      bus.on('simulation:settled', settledHandler);
      bus.emit('simulation:tick', makeSnapshot());
      expect(settledHandler).not.toHaveBeenCalled();
    });

    it('bubble:hover handler does not fire on bubble:click event', () => {
      const hoverHandler = jest.fn();
      bus.on('bubble:hover', hoverHandler);
      bus.emit('bubble:click', {
        item:  makeDataItem(),
        event: {} as PointerEvent,
      } as EventMap['bubble:click']);
      expect(hoverHandler).not.toHaveBeenCalled();
    });
  });

  describe('UnsubscribeFn', () => {
    it('calling the returned UnsubscribeFn removes the handler', () => {
      const handler = jest.fn();
      const unsub = bus.on('simulation:tick', handler);
      unsub();
      bus.emit('simulation:tick', makeSnapshot());
      expect(handler).not.toHaveBeenCalled();
    });

    it('unsubscribing one handler does not affect other handlers on the same event', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      const unsub1 = bus.on('simulation:tick', h1);
      bus.on('simulation:tick', h2);
      unsub1();
      bus.emit('simulation:tick', makeSnapshot());
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('calling UnsubscribeFn multiple times does not throw', () => {
      const unsub = bus.on('simulation:tick', jest.fn());
      expect(() => {
        unsub();
        unsub();
        unsub();
      }).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('clear() removes all handlers', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      bus.on('simulation:tick',    h1);
      bus.on('simulation:settled', h2);
      bus.clear();
      bus.emit('simulation:tick',    makeSnapshot());
      bus.emit('simulation:settled', makeSnapshot());
      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });

    it('emit() after clear() is a no-op and does not throw', () => {
      bus.on('simulation:tick', jest.fn());
      bus.clear();
      expect(() => {
        bus.emit('simulation:tick', makeSnapshot());
      }).not.toThrow();
    });

    it('UnsubscribeFn returned before clear() is a no-op after clear() — does not throw', () => {
      const handler = jest.fn();
      const unsub = bus.on('simulation:tick', handler);
      bus.clear();
      expect(() => unsub()).not.toThrow();
    });

    it('UnsubscribeFn called after clear() does not re-add the handler', () => {
      const handler = jest.fn();
      const unsub = bus.on('simulation:tick', handler);
      bus.clear();
      unsub();  // no-op
      // Even if we tried to emit after this, it would be a no-op
      bus.emit('simulation:tick', makeSnapshot());
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
