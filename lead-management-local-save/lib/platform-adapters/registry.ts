import type { PlatformAdapter } from "./types";
import { mockAdapter } from "./mock-adapter";

const adapters: Record<string, PlatformAdapter> = {
  MOCK: mockAdapter
};

export function getAdapter(key: string): PlatformAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`No platform adapter registered for key "${key}"`);
  return adapter;
}

export function listAdapters() {
  return Object.values(adapters).map((a) => ({ key: a.key, label: a.label }));
}
