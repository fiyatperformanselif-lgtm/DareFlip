import { useEffect, useLayoutEffect, useRef } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

function useLatestHandler(handler: () => void) {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  }, [handler]);
  return latest;
}

/** Keep Android's hardware back button aligned with the in-game navigation. */
export function useNativeBack(onBack: () => void) {
  const latest = useLatestHandler(onBack);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const subscription = NativeApp.addListener("backButton", () => {
      if (active) latest.current();
    }).catch(() => null);
    return () => {
      active = false;
      // Registration may resolve after cleanup (including React Strict Mode).
      void subscription
        .then((handle) => handle?.remove())
        .catch(() => undefined);
    };
  }, [latest]);
}

/** Cancel transient game interactions when the web view or native app is hidden. */
export function useAppInactive(onInactive: () => void) {
  const latest = useLatestHandler(onInactive);
  useEffect(() => {
    let active = true;
    let pageHidden = document.visibilityState === "hidden";
    let nativeInactive = false;
    let wasInactive = false;
    const notify = () => {
      if (!active) return;
      const inactive = pageHidden || nativeInactive;
      if (inactive && !wasInactive) latest.current();
      wasInactive = inactive;
    };
    const onVisibility = () => {
      pageHidden = document.visibilityState === "hidden";
      notify();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const subscription = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", ({ isActive }) => {
          nativeInactive = !isActive;
          notify();
        }).catch(() => null)
      : null;
    notify();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      void subscription
        ?.then((handle) => handle?.remove())
        .catch(() => undefined);
    };
  }, [latest]);
}

export function exitNativeApp() {
  void NativeApp.exitApp();
}
