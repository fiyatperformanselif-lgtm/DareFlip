import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const scriptRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const values = process.argv.slice(2);
const option = (name, fallback) => {
  const index = values.indexOf(name);
  if (index < 0) return fallback;
  if (!values[index + 1] || values[index + 1].startsWith("--"))
    throw new Error(`${name} needs a value.`);
  return values[index + 1];
};
const root = path.resolve(option("--root", scriptRoot));
const env = { ...loadEnv("production", root, ""), ...process.env };
for (const name of ["NODE_ENV", "VITE_USER_NODE_ENV"]) {
  if (env[name] !== undefined && env[name] !== "production")
    throw new Error(
      `${name} must be production for a store build; refusing a contradictory environment.`,
    );
}
const profile = option("--profile", env.DAREFLIP_RELEASE_PROFILE);
if (!["ad-free", "production-ads"].includes(profile))
  throw new Error(
    "Choose DAREFLIP_RELEASE_PROFILE=ad-free or production-ads explicitly; no release mode is selected by default.",
  );
const enabled = profile === "production-ads" ? "true" : "false";
if (env.VITE_ADS_ENABLED !== enabled)
  throw new Error(
    `VITE_ADS_ENABLED must be explicitly ${enabled} for ${profile}.`,
  );
if (env.VITE_ADMOB_TESTING !== "false")
  throw new Error(
    "A store build requires VITE_ADMOB_TESTING=false explicitly.",
  );
if (profile === "production-ads") {
  if (
    !/^ca-app-pub-\d{16}~\d{10}$/.test(env.ADMOB_IOS_APP_ID || "") ||
    env.ADMOB_IOS_APP_ID.startsWith("ca-app-pub-3940256099942544~")
  )
    throw new Error(
      "Supply a publisher-owned ADMOB_IOS_APP_ID for production advertising.",
    );
  for (const kind of ["BANNER", "INTERSTITIAL", "REWARDED"]) {
    const name = `VITE_ADMOB_IOS_${kind}`;
    if (
      !/^ca-app-pub-\d{16}\/\d{10}$/.test(env[name] || "") ||
      env[name].startsWith("ca-app-pub-3940256099942544/")
    )
      throw new Error(
        `Supply a publisher-owned ${name} for production advertising.`,
      );
  }
}
const releaseEnv = {
  ...env,
  DAREFLIP_RELEASE_PROFILE: profile,
  NODE_ENV: "production",
  VITE_USER_NODE_ENV: "production",
};
const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    env: releaseEnv,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// Publisher/legal/content/platform checks must succeed before compiling any payload.
run("node", [
  "scripts/check-release.mjs",
  "--platform",
  "ios",
  "--profile",
  profile,
]);
run("npm", ["run", "build"]);
run("npx", ["--no-install", "cap", "sync", "ios"]);
run("python3", [
  path.join(scriptRoot, "scripts/ios-ad-profile.py"),
  "--profile",
  profile,
  "--plist",
  path.join(root, "ios/App/App/Info.plist"),
]);
const spm = readFileSync(
  path.join(root, "ios/App/CapApp-SPM/Package.swift"),
  "utf8",
);
const plugins = JSON.parse(
  readFileSync(path.join(root, "ios/App/App/capacitor.config.json"), "utf8"),
);
if (
  profile === "ad-free" &&
  (/CapacitorCommunityAdmob|GoogleMobileAds|GoogleUserMessagingPlatform/.test(
    spm,
  ) ||
    (plugins.packageClassList || []).some((name) => /AdMob/i.test(name)))
)
  throw new Error(
    "Ad-free native sync unexpectedly retained an advertising dependency.",
  );
// Recheck the produced graph/plist, not only the source configuration intent.
run("node", [
  "scripts/check-release.mjs",
  "--platform",
  "ios",
  "--profile",
  profile,
  "--stage",
  "native",
]);
console.log(
  `iOS ${profile} store payload prepared. No archive, signature, upload, review submission, or public release is performed by this command.`,
);
