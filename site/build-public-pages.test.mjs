import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import {
  buildPublicPages,
  parseAdMode,
  validatePublisher,
} from "../scripts/build-public-pages.mjs";

// These identities are fixtures only. No network request or deployment is made.
const fixture = {
  name: "Fixture & <Publisher> (TEST ONLY)",
  supportEmail: "test+support@publisher-fixture.dareflip.app",
  websiteUrl: "https://publisher-fixture.dareflip.app/",
  privacyUrl: "https://publisher-fixture.dareflip.app/policy",
  supportUrl: "https://publisher-fixture.dareflip.app/help",
};
const directory = await mkdtemp("/tmp/dareflip-public-pages-test-");
const script = fileURLToPath(
  new URL("../scripts/build-public-pages.mjs", import.meta.url),
);
after(() => rm(directory, { recursive: true, force: true }));
let counter = 0;
async function scenario(publisher = fixture) {
  const root = path.join(directory, String(counter++));
  await mkdir(root);
  const configPath = path.join(root, "publisher.json");
  await writeFile(configPath, JSON.stringify(publisher));
  return {
    root,
    configPath,
    outDir: path.join(root, "output"),
    updated: "2026-11-26",
  };
}
const html = (result, page) =>
  readFile(path.join(result.output, `${page}.html`), "utf8");

test("missing publisher fields fail before any public file is written", async () => {
  const options = await scenario({
    name: "",
    supportEmail: "",
    websiteUrl: "",
    privacyUrl: "",
    supportUrl: "",
  });
  await assert.rejects(
    () => buildPublicPages({ ...options, adsEnabled: "false" }),
    /Cannot build public pages/,
  );
  await assert.rejects(() => access(options.outDir));
});

test("URL credentials, reserved domains, HTTP and local addresses cannot become public links", () => {
  for (const privacyUrl of [
    "http://publisher-fixture.dareflip.app/policy",
    "https://example.com/privacy",
    "https://localhost/privacy",
    "https://127.0.0.1/privacy",
    "https://name:secret@publisher-fixture.dareflip.app/privacy",
    "https://publisher-fixture.dareflip.app/privacy#missing",
  ]) {
    assert.throws(
      () => validatePublisher({ ...fixture, privacyUrl }),
      /actual public HTTPS/,
    );
  }
  assert.throws(
    () =>
      validatePublisher({ ...fixture, supportEmail: "support@example.com" }),
    /public email/,
  );
});

test("advertising mode requires an explicit true or false", () => {
  for (const value of [undefined, "", "TRUE", "0", false])
    assert.throws(() => parseAdMode(value), /explicitly/);
  assert.equal(parseAdMode("false"), false);
  assert.equal(parseAdMode("true"), true);
});

test("generation emits four standalone pages with both policy languages and real configured canonicals", async () => {
  const result = await buildPublicPages({
    ...(await scenario()),
    adsEnabled: "false",
  });
  assert.deepEqual((await readdir(result.output)).sort(), [
    "build-manifest.json",
    "index.html",
    "privacy.html",
    "support.html",
    "terms.html",
  ]);
  for (const page of ["privacy", "support", "terms"]) {
    const text = await html(result, page);
    assert.ok(text.includes('id="en" lang="en"'));
    assert.ok(text.includes('id="tr" lang="tr"'));
    assert.ok(text.includes('name="viewport"'));
    assert.ok(text.includes('lang="tr"'));
    assert.ok(!text.includes("<script"));
    assert.ok(text.includes('rel="icon" href="data:image/svg+xml,'));
    assert.ok(!text.includes("{{"));
    assert.ok(!text.includes("[REQUIRED"));
  }
  assert.ok(
    (await html(result, "privacy")).includes(
      `rel="canonical" href="${fixture.privacyUrl}"`,
    ),
  );
  assert.ok(
    (await html(result, "support")).includes(
      `rel="canonical" href="${fixture.supportUrl}"`,
    ),
  );
  assert.equal(result.manifest.deploymentVerified, false);
});

test(
  "public HTML remains server-readable when the build uses a private umask",
  {
    skip: process.platform === "win32",
  },
  async () => {
    const options = await scenario();
    const moduleUrl = new URL(
      "../scripts/build-public-pages.mjs",
      import.meta.url,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `process.umask(0o077); const { buildPublicPages } = await import(${JSON.stringify(moduleUrl.href)}); await buildPublicPages(JSON.parse(process.argv[1]));`,
        JSON.stringify({ ...options, adsEnabled: "true" }),
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    for (const name of [
      "index.html",
      "privacy.html",
      "support.html",
      "terms.html",
    ])
      assert.equal(
        (await stat(path.join(options.outDir, name))).mode & 0o777,
        0o644,
      );
  },
);

test("publisher text is HTML-escaped and email cannot inject mailto headers", async () => {
  const result = await buildPublicPages({
    ...(await scenario()),
    adsEnabled: "false",
  });
  for (const page of ["index", "privacy", "support", "terms"]) {
    const text = await html(result, page);
    assert.ok(text.includes("Fixture &amp; &lt;Publisher&gt; (TEST ONLY)"));
    assert.ok(!text.includes("<Publisher>"));
    assert.ok(
      text.includes("mailto:test%2Bsupport@publisher-fixture.dareflip.app"),
    );
  }
});

test("ad-free pages state disabled advertising without conditional Google-processing copy", async () => {
  const result = await buildPublicPages({
    ...(await scenario()),
    adsEnabled: "false",
  });
  const text = await html(result, "privacy");
  assert.ok(text.includes("Advertising is disabled in this edition"));
  assert.ok(text.includes("Bu sürümde reklamlar kapalı"));
  assert.ok(!text.includes("Google"));
  assert.equal(result.manifest.adsEnabled, false);
});

test("ad-enabled pages disclose Google, UMP, nonpersonalized requests and optional rewards", async () => {
  const result = await buildPublicPages({
    ...(await scenario()),
    adsEnabled: "true",
  });
  const text = await html(result, "privacy");
  assert.ok(text.includes("Google AdMob"));
  assert.ok(text.includes("UMP"));
  assert.ok(text.includes("non-personalized"));
  assert.ok(text.includes("earned reward"));
  assert.ok(!text.includes("Advertising is disabled in this edition"));
  assert.equal(result.manifest.adsEnabled, true);
});

test("a terms URL is never inferred from the website address", async () => {
  const result = await buildPublicPages({
    ...(await scenario()),
    adsEnabled: "false",
  });
  assert.ok(!(await html(result, "terms")).includes('rel="canonical"'));
  assert.ok(
    !(await html(result, "index")).includes(`${fixture.websiteUrl}terms`),
  );
  assert.equal(
    result.manifest.pages.find((page) => page.file === "terms.html")
      .canonicalUrl,
    null,
  );
});

test("an actual optional terms URL is used verbatim and validated", async () => {
  const termsUrl = "https://publisher-fixture.dareflip.app/actual-terms";
  const result = await buildPublicPages({
    ...(await scenario({ ...fixture, termsUrl })),
    adsEnabled: "false",
  });
  assert.ok(
    (await html(result, "terms")).includes(
      `rel="canonical" href="${termsUrl}"`,
    ),
  );
  assert.throws(
    () =>
      validatePublisher({ ...fixture, termsUrl: "https://example.com/terms" }),
    /termsUrl/,
  );
});

test("a repeat build refreshes only the owned generated directory", async () => {
  const options = await scenario();
  await buildPublicPages({ ...options, adsEnabled: "false" });
  const result = await buildPublicPages({ ...options, adsEnabled: "true" });
  assert.equal(
    JSON.parse(
      await readFile(path.join(result.output, "build-manifest.json"), "utf8"),
    ).adsEnabled,
    true,
  );
  assert.ok((await html(result, "privacy")).includes("Google AdMob"));
});

test("unrelated output files are preserved instead of being overwritten or removed", async () => {
  const options = await scenario();
  await mkdir(options.outDir);
  await writeFile(path.join(options.outDir, "notes.txt"), "preserve me");
  await assert.rejects(
    () => buildPublicPages({ ...options, adsEnabled: "false" }),
    /preserved/,
  );
  assert.equal(
    await readFile(path.join(options.outDir, "notes.txt"), "utf8"),
    "preserve me",
  );
  assert.deepEqual(await readdir(options.outDir), ["notes.txt"]);
});

test("an owned manifest does not authorize deleting extra user files", async () => {
  const options = await scenario();
  await buildPublicPages({ ...options, adsEnabled: "false" });
  await writeFile(path.join(options.outDir, "my-notes.txt"), "still mine");
  await assert.rejects(
    () => buildPublicPages({ ...options, adsEnabled: "true" }),
    /preserved/,
  );
  assert.equal(
    await readFile(path.join(options.outDir, "my-notes.txt"), "utf8"),
    "still mine",
  );
});

test("an impossible policy date fails without emitting pages", async () => {
  const options = await scenario();
  await assert.rejects(
    () =>
      buildPublicPages({
        ...options,
        adsEnabled: "false",
        updated: "2026-02-30",
      }),
    /real date/,
  );
  await assert.rejects(() => access(options.outDir));
});

test("CLI builds the selected edition locally without claiming deployment", async () => {
  const options = await scenario();
  const result = spawnSync(
    process.execPath,
    [
      script,
      "--config",
      options.configPath,
      "--out-dir",
      options.outDir,
      "--updated",
      options.updated,
    ],
    { encoding: "utf8", env: { ...process.env, VITE_ADS_ENABLED: "false" } },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Built 4/);
  assert.match(result.stdout, /deployment have not been verified/);
  assert.equal(
    JSON.parse(
      await readFile(path.join(options.outDir, "build-manifest.json"), "utf8"),
    ).adsEnabled,
    false,
  );
});

test("CLI refuses a missing advertising mode without emitting pages", async () => {
  const options = await scenario();
  const env = { ...process.env };
  delete env.VITE_ADS_ENABLED;
  const result = spawnSync(
    process.execPath,
    [script, "--config", options.configPath, "--out-dir", options.outDir],
    { encoding: "utf8", env },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VITE_ADS_ENABLED explicitly/);
  await assert.rejects(() => access(options.outDir));
});
