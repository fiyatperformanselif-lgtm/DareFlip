import { readFileSync } from "node:fs";
import { loadEnv } from "vite";

// A deliberately failing preflight while this development edition has release blockers.
// This is a configuration/content guard, not a substitute for device, legal, or store review.
const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...process.env,
};
const issues = [];
if (env.VITE_ADMOB_TESTING !== "false")
  issues.push("Set VITE_ADMOB_TESTING=false explicitly for a store release.");
for (const platform of ["IOS", "ANDROID"]) {
  for (const kind of ["BANNER", "INTERSTITIAL", "REWARDED"]) {
    const name = `VITE_ADMOB_${platform}_${kind}`;
    if (
      !/^ca-app-pub-\d{16}\/\d{10}$/.test(env[name] || "") ||
      env[name]?.startsWith("ca-app-pub-3940256099942544/")
    ) {
      issues.push(`${name}: supply a publisher-owned production ad unit ID.`);
    }
  }
}
for (const path of [
  "ios/App/App/Info.plist",
  "android/app/src/main/AndroidManifest.xml",
]) {
  const text = readFileSync(path, "utf8");
  if (text.includes("ca-app-pub-3940256099942544~"))
    issues.push(
      `${path}: replace the Google sample application ID for release.`,
    );
}
for (const path of [
  "docs/PRIVACY_POLICY.md",
  "docs/TERMS_OF_USE.md",
  "docs/SUPPORT.md",
]) {
  if (readFileSync(path, "utf8").includes("[REQUIRED BEFORE PUBLICATION]"))
    issues.push(
      `${path}: publisher identity/contact and final legal review remain outstanding.`,
    );
}
const catalog = JSON.parse(readFileSync("src/content/cards.json", "utf8"));
const originals = catalog.filter((card) => card.language === "en");
if (originals.length < 5000)
  issues.push(
    `Original-card goal incomplete: ${originals.length}/5000. Do not claim 5,000 cards.`,
  );
const targetLanguages = [
  "tr",
  "de",
  "fr",
  "es",
  "pt",
  "it",
  "nl",
  "ru",
  "ar",
  "hi",
  "ja",
  "ko",
  "zh",
  "id",
  "pl",
  "sv",
  "no",
  "da",
  "el",
];
const missing = targetLanguages
  .map((language) => {
    const ids = new Set(
      catalog
        .filter((card) => card.language === language)
        .map((card) => card.id),
    );
    return {
      language,
      count: originals.filter((card) => ids.has(card.id)).length,
    };
  })
  .filter(({ count }) => count < originals.length);
if (missing.length)
  issues.push(
    `Card localization incomplete: ${missing.map(({ language, count }) => `${language} ${count}/${originals.length}`).join(", ")}.`,
  );
if (issues.length) {
  console.error(
    `Release preflight blocked (${issues.length} configuration/content findings):\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "Configuration/content preflight passed. Native device tests, signing, legal review, SDK privacy inspection, and store approval still require the publisher.",
  );
}
