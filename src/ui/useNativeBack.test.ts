import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Effect = () => void | (() => void);
type Slot = {
  current?: unknown;
  deps?: unknown[];
  cleanup?: () => void;
};

// Exercise the real subscription effects without adding a DOM renderer dependency.
const lifecycle = vi.hoisted(() => {
  const slots: Slot[] = [];
  let cursor = 0;
  let pending: Array<() => void> = [];
  function effect(callback: Effect, deps: unknown[]) {
    const slot = (slots[cursor++] ??= {});
    if (
      !slot.deps ||
      deps.length !== slot.deps.length ||
      deps.some((value, index) => !Object.is(value, slot.deps![index]))
    ) {
      pending.push(() => {
        slot.cleanup?.();
        slot.cleanup = callback() || undefined;
        slot.deps = deps;
      });
    }
  }
  return {
    effect,
    ref(value: unknown) {
      return (slots[cursor++] ??= { current: value });
    },
    render(probe: () => void) {
      cursor = 0;
      pending = [];
      probe();
      pending.forEach((run) => run());
    },
    unmount() {
      slots.forEach((slot) => slot.cleanup?.());
      slots.length = 0;
    },
  };
});
const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
  addListener: vi.fn(),
  exitApp: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: lifecycle.ref,
  useEffect: lifecycle.effect,
  useLayoutEffect: lifecycle.effect,
}));
vi.mock("@capacitor/core", () => ({ Capacitor: native }));
vi.mock("@capacitor/app", () => ({ App: native }));

import { useAppInactive, useNativeBack } from "./useNativeBack";

type NativeEvent = { isActive: boolean };
let listeners: Map<string, (event: NativeEvent) => void>;
let visibility: "visible" | "hidden";
let webEvents: EventTarget;
let remove: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  listeners = new Map();
  visibility = "visible";
  webEvents = new EventTarget();
  remove = vi.fn().mockResolvedValue(undefined);
  native.isNativePlatform.mockReturnValue(true);
  native.addListener.mockImplementation((event, listener) => {
    listeners.set(event, listener);
    return Promise.resolve({ remove });
  });
  vi.stubGlobal("document", {
    get visibilityState() {
      return visibility;
    },
    addEventListener: webEvents.addEventListener.bind(webEvents),
    removeEventListener: webEvents.removeEventListener.bind(webEvents),
  });
});
afterEach(() => {
  lifecycle.unmount();
  vi.unstubAllGlobals();
});

describe("native back subscription lifecycle", () => {
  it("keeps one subscription while dispatching the latest committed handler", () => {
    const first = vi.fn();
    const latest = vi.fn();
    lifecycle.render(function BackProbe() {
      useNativeBack(first);
    });
    lifecycle.render(function BackProbe() {
      useNativeBack(latest);
    });
    listeners.get("backButton")!({ isActive: true });
    expect(native.addListener).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });

  it("ignores queued events after cleanup and removes a late-resolving handle", async () => {
    let resolve!: (handle: { remove: typeof remove }) => void;
    native.addListener.mockImplementation((event, listener) => {
      listeners.set(event, listener);
      return new Promise((done) => {
        resolve = done;
      });
    });
    const onBack = vi.fn();
    lifecycle.render(function BackProbe() {
      useNativeBack(onBack);
    });
    lifecycle.unmount();
    listeners.get("backButton")!({ isActive: true });
    resolve({ remove });
    await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
    expect(onBack).not.toHaveBeenCalled();
  });

  it("does not register a native back listener on the web", () => {
    native.isNativePlatform.mockReturnValue(false);
    lifecycle.render(function BackProbe() {
      useNativeBack(vi.fn());
    });
    expect(native.addListener).not.toHaveBeenCalled();
  });
});

describe("inactive app lifecycle", () => {
  function setVisibility(next: typeof visibility) {
    visibility = next;
    webEvents.dispatchEvent(new Event("visibilitychange"));
  }

  it("coalesces native and document hiding until both become active again", () => {
    const onInactive = vi.fn();
    lifecycle.render(function InactiveProbe() {
      useAppInactive(onInactive);
    });
    setVisibility("hidden");
    listeners.get("appStateChange")!({ isActive: false });
    setVisibility("visible");
    expect(onInactive).toHaveBeenCalledOnce();
    listeners.get("appStateChange")!({ isActive: true });
    listeners.get("appStateChange")!({ isActive: false });
    expect(onInactive).toHaveBeenCalledTimes(2);
  });

  it("uses the latest handler and removes native and document listeners", async () => {
    const oldHandler = vi.fn();
    const latestHandler = vi.fn();
    lifecycle.render(function InactiveProbe() {
      useAppInactive(oldHandler);
    });
    lifecycle.render(function InactiveProbe() {
      useAppInactive(latestHandler);
    });
    setVisibility("hidden");
    expect(latestHandler).toHaveBeenCalledOnce();
    expect(oldHandler).not.toHaveBeenCalled();
    expect(native.addListener).toHaveBeenCalledTimes(1);
    lifecycle.unmount();
    setVisibility("visible");
    setVisibility("hidden");
    listeners.get("appStateChange")!({ isActive: false });
    expect(latestHandler).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
  });

  it("cancels immediately when mounted hidden and supports web-only visibility", () => {
    native.isNativePlatform.mockReturnValue(false);
    visibility = "hidden";
    const onInactive = vi.fn();
    lifecycle.render(function InactiveProbe() {
      useAppInactive(onInactive);
    });
    expect(onInactive).toHaveBeenCalledOnce();
    expect(native.addListener).not.toHaveBeenCalled();
    setVisibility("visible");
    setVisibility("hidden");
    expect(onInactive).toHaveBeenCalledTimes(2);
  });

  it("still observes visibility when native listener registration fails", async () => {
    native.addListener.mockRejectedValue(
      new Error("Native listener unavailable"),
    );
    const onInactive = vi.fn();
    lifecycle.render(function InactiveProbe() {
      useAppInactive(onInactive);
    });
    setVisibility("hidden");
    expect(onInactive).toHaveBeenCalledOnce();
    lifecycle.unmount();
    await Promise.resolve();
  });
});
