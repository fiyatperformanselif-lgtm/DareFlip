import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validatePublisher } from "../src/config/publisher-schema.ts";

const readJson = (root, relative) =>
  JSON.parse(readFileSync(path.join(root, relative), "utf8"));
const languages = [
  "en",
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
export function contentInventory(root) {
  const files = [
    "src/content/cards.json",
    "src/content/archive-v1.json",
    "src/content/archive-v2-flirty.json",
  ];
  const inventory = files.map((file) => ({
    file,
    cards: readJson(root, file),
  }));
  const keys = new Set();
  const canonical = new Map();
  const fields = [
    "id",
    "category",
    "difficulty",
    "type",
    "language",
    "text",
    "pack",
    "sensitive",
  ];
  for (const { file, cards } of inventory) {
    if (!Array.isArray(cards))
      throw new Error(`${file}: content must be an array.`);
    for (const card of cards) {
      if (
        !card ||
        typeof card !== "object" ||
        Object.keys(card).length !== fields.length ||
        !fields.every((field) => Object.hasOwn(card, field)) ||
        typeof card.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(card.id) ||
        !["couples", "party", "flirty", "deep", "crazy"].includes(
          card.category,
        ) ||
        !["easy", "medium", "bold"].includes(card.difficulty) ||
        !["truth", "dare"].includes(card.type) ||
        !languages.includes(card.language) ||
        !["core", "afterglow"].includes(card.pack) ||
        typeof card.sensitive !== "boolean" ||
        (card.category === "flirty" && !card.sensitive) ||
        typeof card.text !== "string" ||
        !card.text.trim() ||
        card.text.length > 1000
      )
        throw new Error(`${file}: invalid card schema.`);
      const key = `${card.id}:${card.language}`;
      if (keys.has(key))
        throw new Error(`${file}: duplicate localized ID ${key}.`);
      keys.add(key);
      if (card.language === "en") canonical.set(card.id, card);
    }
  }
  for (const { file, cards } of inventory)
    for (const card of cards) {
      const original = canonical.get(card.id);
      if (
        !original ||
        ["category", "difficulty", "type", "pack", "sensitive"].some(
          (field) => original[field] !== card[field],
        )
      )
        throw new Error(
          `${file}: translation metadata or English original missing for ${card.id}.`,
        );
    }
  if (!inventory[0].cards.some((card) => card.language === "en"))
    throw new Error("The active English catalog is empty.");
  return {
    inventory,
    sha256: createHash("sha256")
      .update(JSON.stringify(inventory))
      .digest("hex"),
  };
}

/** Source validates the intended build; native inspects its actual generated output. */
export function checkRelease({
  root,
  env,
  platform = "ios",
  profile,
  stage = "source",
}) {
  const issues = [];
  const warnings = [];
  const add = (message) => issues.push(message);
  if (
    (env.NODE_ENV && env.NODE_ENV !== "production") ||
    (env.VITE_USER_NODE_ENV && env.VITE_USER_NODE_ENV !== "production")
  )
    add(
      "Store compilation requires production NODE_ENV; development mode would silently select test ad inventory.",
    );
  if (platform !== "ios")
    add(
      "This store preparation currently validates iOS only; Android is not certified by an iOS check.",
    );
  if (!["ad-free", "production-ads"].includes(profile))
    add("Choose --profile ad-free or production-ads explicitly.");
  if (!["source", "native"].includes(stage))
    add("Choose --stage source or native.");
  const adsEnabled = profile === "production-ads";
  if (env.VITE_ADS_ENABLED !== String(adsEnabled))
    add(
      `Set VITE_ADS_ENABLED=${adsEnabled} explicitly for the selected profile.`,
    );
  if (env.VITE_ADMOB_TESTING !== "false")
    add("Set VITE_ADMOB_TESTING=false explicitly for a store build.");
  if (adsEnabled) {
    if (
      !/^ca-app-pub-\d{16}~\d{10}$/.test(env.ADMOB_IOS_APP_ID || "") ||
      env.ADMOB_IOS_APP_ID?.startsWith("ca-app-pub-3940256099942544~")
    )
      add("ADMOB_IOS_APP_ID: supply the publisher-owned iOS application ID.");
    for (const kind of ["BANNER", "INTERSTITIAL", "REWARDED"]) {
      const name = `VITE_ADMOB_IOS_${kind}`;
      if (
        !/^ca-app-pub-\d{16}\/\d{10}$/.test(env[name] || "") ||
        env[name]?.startsWith("ca-app-pub-3940256099942544/")
      )
        add(`${name}: supply a publisher-owned production unit ID.`);
    }
  }
  try {
    validatePublisher(
      readJson(root, "src/config/publisher.json"),
    ).issues.forEach(add);
  } catch {
    add(
      "Complete src/config/publisher.json with the actual public publisher details.",
    );
  }
  try {
    const { inventory, sha256 } = contentInventory(root);
    const active = inventory[0].cards;
    const originals = active.filter((card) => card.language === "en");
    const review = readJson(root, "src/config/store-review.json");
    if (review.status !== "reviewed" || review.inventorySha256 !== sha256)
      add(
        "Public-store content assessment is pending or stale for the active and archived inventory; resolve the content choice before store preparation.",
      );
    const listing = readJson(root, "src/config/store-listing.json");
    const available = adsEnabled
      ? originals.length
      : originals.filter((card) => card.pack === "core").length;
    if (
      listing.advertisedCardCount !== null &&
      (!Number.isSafeInteger(listing.advertisedCardCount) ||
        listing.advertisedCardCount < 0 ||
        listing.advertisedCardCount > available)
    )
      add(
        `Store card-count claim exceeds the ${available} cards available to a new user in this edition.`,
      );
    if (
      !Array.isArray(listing.completeCardLanguages) ||
      !listing.completeCardLanguages.length
    )
      add(
        "Declare actual completed card languages in src/config/store-listing.json.",
      );
    else if (
      new Set(listing.completeCardLanguages).size !==
        listing.completeCardLanguages.length ||
      listing.completeCardLanguages.some(
        (language) => !languages.includes(language),
      )
    )
      add(
        "Store completed-language claims contain invalid or repeated language codes.",
      );
    else
      for (const language of listing.completeCardLanguages) {
        const translated = new Set(
          active
            .filter((card) => card.language === language)
            .map((card) => card.id),
        );
        if (originals.some((card) => !translated.has(card.id)))
          add(
            `Store language claim ${language}: incomplete active card translations.`,
          );
      }
    if (originals.length < 5000)
      warnings.push(
        `Roadmap only: ${originals.length}/5000 English card IDs; do not advertise 5,000 originals.`,
      );
    warnings.push(
      "Other incomplete card/UI languages must remain disclosed; a roadmap language count is not an Apple release minimum.",
    );
    if (typeof review.note !== "string" || !review.note.trim())
      add(
        "Record the scope and limits of the content assessment; it is not Apple approval.",
      );
  } catch {
    add(
      "Content inventory/review/listing configuration is missing or invalid.",
    );
  }

  if (stage === "native" && platform === "ios") {
    try {
      const config = readJson(root, "ios/App/App/capacitor.config.json");
      const spm = readFileSync(
        path.join(root, "ios/App/CapApp-SPM/Package.swift"),
        "utf8",
      );
      const result = spawnSync(
        "python3",
        [
          "-c",
          "import json,plistlib,sys; print(json.dumps(plistlib.load(open(sys.argv[1], 'rb'))))",
          path.join(root, "ios/App/App/Info.plist"),
        ],
        { encoding: "utf8" },
      );
      if (result.status !== 0) throw new Error("Invalid plist");
      const plist = JSON.parse(result.stdout);
      const nativeAdPlugin = (config.packageClassList || []).some((name) =>
        /AdMob/i.test(name),
      );
      const nativeAdDependency =
        /CapacitorCommunityAdmob|GoogleMobileAds|GoogleUserMessagingPlatform/.test(
          spm,
        );
      if (!adsEnabled) {
        if (
          nativeAdPlugin ||
          nativeAdDependency ||
          Object.keys(plist).some(
            (key) =>
              key.startsWith("GAD") ||
              ["NSUserTrackingUsageDescription", "SKAdNetworkItems"].includes(
                key,
              ),
          )
        )
          add(
            "Ad-free native output still contains an advertising plugin, dependency or advertising/tracking plist declaration.",
          );
      } else {
        if (!nativeAdPlugin || !nativeAdDependency)
          add(
            "Production-ad native output is missing its advertising plugin/dependency.",
          );
        if (
          plist.GADApplicationIdentifier !== env.ADMOB_IOS_APP_ID ||
          plist.GADDelayAppMeasurementInit !== true
        )
          add(
            "Generated iOS AdMob application ID or delayed-measurement setting does not match the intended production configuration.",
          );
      }
    } catch {
      add(
        "Native output is missing or invalid; run the explicit release preparation before native-stage verification.",
      );
    }
  }
  return { issues: [...new Set(issues)], warnings: [...new Set(warnings)] };
}
