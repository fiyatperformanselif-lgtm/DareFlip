import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: process.env.DAREFLIP_BUNDLE_ID || "com.dareflip.app",
  appName: "DareFlip",
  webDir: "dist",
  backgroundColor: "#140c26",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    zoomEnabled: true,
  },
  android: { backgroundColor: "#140c26" },
};
export default config;
