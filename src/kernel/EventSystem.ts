/**
 * devOS Kernel - Event System
 * Provides inter-process communication (IPC) and system-wide event bus.
 */

export type EventHandler = (data: unknown) => void;

export interface KernelEvent {
  type: string;
  source: string;
  timestamp: number;
  data: unknown;
}

export class EventSystem {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private eventLog: KernelEvent[] = [];
  private maxLogSize: number = 1000;

  constructor() {
    this.listeners = new Map();
    this.eventLog = [];
  }

  on(eventType: string, handler: EventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  emit(eventType: string, source: string, data: unknown = null): void {
    const event: KernelEvent = {
      type: eventType,
      source,
      timestamp: Date.now(),
      data,
    };

    this.logEvent(event);

    const handlers = this.listeners.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event.data);
        } catch (error) {
          console.error(`[EventSystem] Error in handler for "${eventType}":`, error);
        }
      }
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.listeners.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventSystem] Error in wildcard handler:`, error);
        }
      }
    }
  }

  once(eventType: string, handler: EventHandler): void {
    const wrappedHandler: EventHandler = (data: unknown) => {
      this.off(eventType, wrappedHandler);
      handler(data);
    };
    this.on(eventType, wrappedHandler);
  }

  private logEvent(event: KernelEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }

  getEventLog(): KernelEvent[] {
    return [...this.eventLog];
  }

  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  destroy(): void {
    this.listeners.clear();
    this.eventLog = [];
  }
}
