import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { existsSync } from "node:fs";
const root = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  VITE_ADS_ENABLED: "true",
  VITE_ADMOB_TESTING: "true",
};
for (const [command, args] of [
  [
    "python3",
    [
      "scripts/ios-ad-profile.py",
      "--profile",
      "beta",
      "--plist",
      "ios/App/App/Info.plist",
    ],
  ],
  ["npm", ["run", "build"]],
  ["npx", ["cap", "sync", "ios"]],
]) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (
  !existsSync(
    new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url),
  )
)
  throw new Error("iOS project is missing.");
console.log("\niOS beta web payload prepared with Google TEST ad units only.");
console.log(
  "No native archive, signature or TestFlight upload has been produced by this command.",
);
console.log(
  "Cloud upload: configure Codemagic signing and start ios-testflight; see docs/CODEMAGIC_TESTFLIGHT.md. Local Xcode is optional.",
);
