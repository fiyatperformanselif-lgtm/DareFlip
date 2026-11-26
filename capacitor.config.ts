import type { CapacitorConfig } from "@capacitor/cli";
// Default/beta remains unchanged. Only an explicit ad-free build excludes native ads.
const adFree = process.env.VITE_ADS_ENABLED === "false";
const corePlugins = [
  "@capacitor/app",
  "@capacitor/filesystem",
  "@capacitor/haptics",
  "@capacitor/share",
];
const config: CapacitorConfig = {
  ...(adFree ? { includePlugins: corePlugins } : {}),
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
