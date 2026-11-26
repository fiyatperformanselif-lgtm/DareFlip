import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { checkRelease, contentInventory } from "./release-checks.mjs";

// Fixtures validate mechanics only; no fixture identity or review is deployed.
const publisher = {
  name: "Publisher Fixture",
  supportEmail: "help@fixture-publisher.dev",
  websiteUrl: "https://fixture-publisher.dev/",
  privacyUrl: "https://fixture-publisher.dev/privacy",
  supportUrl: "https://fixture-publisher.dev/support",
};
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "dareflip-release-check-"));
  const put = (file, value) => {
    const name = path.join(root, file);
    mkdirSync(path.dirname(name), { recursive: true });
    writeFileSync(
      name,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };
  const cards = ["one", "two"].flatMap((id, index) =>
    ["en", "tr"].map((language) => ({
      id,
      category: "party",
      difficulty: "easy",
      type: "truth",
      language,
      text: "An ordinary fixture prompt for testing.",
      pack: index ? "afterglow" : "core",
      sensitive: false,
    })),
  );
  put("src/content/cards.json", cards);
  put("src/content/archive-v1.json", []);
  put("src/content/archive-v2-flirty.json", []);
  put("src/config/publisher.json", publisher);
  put("src/config/store-listing.json", {
    advertisedCardCount: null,
    completeCardLanguages: ["en", "tr"],
  });
  const review = () =>
    put("src/config/store-review.json", {
      status: "reviewed",
      inventorySha256: contentInventory(root).sha256,
      note: "Synthetic test assessment; not an actual publisher decision.",
    });
  review();
  const env = { VITE_ADS_ENABLED: "false", VITE_ADMOB_TESTING: "false" };
  return {
    root,
    put,
    review,
    env,
    cards,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
function run(name, callback) {
  test(name, () => {
    const f = fixture();
    try {
      callback(f);
    } finally {
      f.close();
    }
  });
}
run("iOS ad-free needs no ad IDs or unrelated Android configuration", (f) => {
  const result = checkRelease({
    ...f,
    profile: "ad-free",
    env: { ...f.env, VITE_ADMOB_ANDROID_BANNER: "invalid" },
  });
  assert.deepEqual(result.issues, []);
  assert.ok(result.warnings.some((w) => w.includes("5000")));
});
run(
  "production iOS configuration is validated without rejecting the old source test plist",
  (f) => {
    f.put("ios/App/App/Info.plist", "source placeholder before transformation");
    const env = {
      ...f.env,
      VITE_ADS_ENABLED: "true",
      ADMOB_IOS_APP_ID: "ca-app-pub-1111111111111111~1111111111",
      VITE_ADMOB_IOS_BANNER: "ca-app-pub-1111111111111111/1111111111",
      VITE_ADMOB_IOS_INTERSTITIAL: "ca-app-pub-1111111111111111/2222222222",
      VITE_ADMOB_IOS_REWARDED: "ca-app-pub-1111111111111111/3333333333",
    };
    assert.deepEqual(
      checkRelease({ ...f, profile: "production-ads", env }).issues,
      [],
    );
  },
);
run(
  "production rejects sample IDs and ad-free rejects conflicting flags",
  (f) => {
    const result = checkRelease({
      ...f,
      profile: "production-ads",
      env: {
        ...f.env,
        VITE_ADS_ENABLED: "true",
        ADMOB_IOS_APP_ID: "ca-app-pub-3940256099942544~1458002511",
      },
    });
    assert.ok(result.issues.some((w) => w.includes("ADMOB_IOS_APP_ID")));
    assert.ok(
      checkRelease({
        ...f,
        profile: "ad-free",
        env: { ...f.env, VITE_ADS_ENABLED: "true" },
      }).issues.length,
    );
  },
);
run(
  "unknown profiles/stages/platforms and development inventory cannot pass",
  (f) => {
    for (const options of [
      { profile: "unknown" },
      { profile: "ad-free", stage: "unknown" },
      { profile: "ad-free", platform: "android" },
      { profile: "ad-free", env: { ...f.env, VITE_ADMOB_TESTING: "true" } },
    ])
      assert.ok(checkRelease({ ...f, ...options }).issues.length);
  },
);
run("actual publisher information is required", (f) => {
  f.put("src/config/publisher.json", {
    ...publisher,
    supportEmail: "help@example.com",
  });
  assert.ok(
    checkRelease({ ...f, profile: "ad-free" }).issues.some((w) =>
      w.includes("supportEmail"),
    ),
  );
});
run(
  "pending or changed active/archived content invalidates the assessment",
  (f) => {
    f.put("src/config/store-review.json", {
      status: "pending",
      inventorySha256: contentInventory(f.root).sha256,
      note: "Pending",
    });
    assert.ok(
      checkRelease({ ...f, profile: "ad-free" }).issues.some((w) =>
        w.includes("content assessment"),
      ),
    );
    f.review();
    f.put("src/content/archive-v1.json", [
      { ...f.cards[0], id: "new-archived-record" },
    ]);
    assert.ok(
      checkRelease({ ...f, profile: "ad-free" }).issues.some((w) =>
        w.includes("stale"),
      ),
    );
  },
);
run("unfinished roadmap is a warning while false store claims block", (f) => {
  f.put("src/config/store-listing.json", {
    advertisedCardCount: 5000,
    completeCardLanguages: ["en", "tr", "de"],
  });
  const result = checkRelease({ ...f, profile: "ad-free" });
  assert.ok(result.issues.some((w) => w.includes("card-count")));
  assert.ok(result.issues.some((w) => w.includes("de")));
  f.put("src/config/store-listing.json", {
    advertisedCardCount: 2,
    completeCardLanguages: ["en", "tr"],
  });
  assert.ok(
    checkRelease({ ...f, profile: "ad-free" }).issues.some((w) =>
      w.includes("available"),
    ),
  );
});
run(
  "native-stage ad-free output requires the SDK and tracking declarations to be absent",
  (f) => {
    f.put("ios/App/App/capacitor.config.json", {
      packageClassList: ["AppPlugin", "HapticsPlugin"],
    });
    f.put("ios/App/CapApp-SPM/Package.swift", "core plugins only");
    f.put(
      "ios/App/App/Info.plist",
      '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>DareFlip</string></dict></plist>',
    );
    assert.deepEqual(
      checkRelease({ ...f, profile: "ad-free", stage: "native" }).issues,
      [],
    );
    f.put("ios/App/CapApp-SPM/Package.swift", "CapacitorCommunityAdmob");
    assert.ok(
      checkRelease({ ...f, profile: "ad-free", stage: "native" }).issues.some(
        (w) => w.includes("advertising"),
      ),
    );
  },
);
run("native-stage rejects missing output", (f) => {
  assert.ok(
    checkRelease({ ...f, profile: "ad-free", stage: "native" }).issues.some(
      (w) => w.includes("Native output"),
    ),
  );
});
run("CLI rejects unknown flags instead of silently skipping checks", (f) => {
  const cli = fileURLToPath(new URL("./check-release.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [cli, "--ignore-content", "--profile", "ad-free"],
    { cwd: f.root, encoding: "utf8", env: { ...process.env, ...f.env } },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown option/);
});

run(
  "empty or malformed inventories cannot obtain a passing assessment",
  (f) => {
    for (const invalid of [
      [],
      [{ id: "incomplete" }],
      [...f.cards, f.cards[0]],
    ]) {
      f.put("src/content/cards.json", invalid);
      assert.ok(checkRelease({ ...f, profile: "ad-free" }).issues.length);
    }
  },
);
run("invalid completed-language claims and blank review notes fail", (f) => {
  f.put("src/config/store-listing.json", {
    advertisedCardCount: null,
    completeCardLanguages: ["nonsense"],
  });
  assert.ok(
    checkRelease({ ...f, profile: "ad-free" }).issues.some((issue) =>
      issue.includes("language"),
    ),
  );
  f.put("src/config/store-listing.json", {
    advertisedCardCount: null,
    completeCardLanguages: ["en", "tr"],
  });
  f.put("src/config/store-review.json", {
    status: "reviewed",
    inventorySha256: contentInventory(f.root).sha256,
    note: "   ",
  });
  assert.ok(
    checkRelease({ ...f, profile: "ad-free" }).issues.some((issue) =>
      issue.includes("scope"),
    ),
  );
});
run(
  "development environment overrides cannot silently select test ads in a store build",
  (f) => {
    for (const override of [
      { NODE_ENV: "development" },
      { VITE_USER_NODE_ENV: "development" },
    ]) {
      assert.ok(
        checkRelease({
          ...f,
          profile: "ad-free",
          env: { ...f.env, ...override },
        }).issues.some((issue) => issue.includes("NODE_ENV")),
      );
    }
  },
);
