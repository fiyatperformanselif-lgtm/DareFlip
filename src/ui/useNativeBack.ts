import { useEffect } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
/** Keep Android's hardware back button aligned with the in-game navigation. */
export function useNativeBack(onBack: () => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const subscription = NativeApp.addListener("backButton", onBack);
    return () => {
      void subscription.then((handle) => handle.remove());
    };
  }, [onBack]);
}
export function exitNativeApp() {
  void NativeApp.exitApp();
}
