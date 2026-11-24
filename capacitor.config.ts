import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.dareflip.app",
  appName: "DareFlip",
  webDir: "dist",
  backgroundColor: "#140c26",
  ios: { contentInset: "never", preferredContentMode: "mobile" },
  android: { backgroundColor: "#140c26" },
};
export default config;
