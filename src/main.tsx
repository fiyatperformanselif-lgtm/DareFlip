import { Capacitor } from "@capacitor/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Native platforms bundle dist locally; production web caches the same offline shell.
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  !Capacitor.isNativePlatform()
) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
