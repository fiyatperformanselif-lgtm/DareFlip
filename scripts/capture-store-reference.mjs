import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const availableScenes = ["discover", "players", "selection", "truth", "saved"];
const fictionalPlayers = [
  { name: "Alex", gender: "female" },
  { name: "Sam", gender: "male" },
];

const help = `Capture actual DareFlip browser UI at explicit output dimensions.
These are Chromium browser references, NOT native iOS or TestFlight captures.
No screenshots are taken unless --capture is explicitly supplied.

Usage:
  node scripts/capture-store-reference.mjs \\
    --label <slot-label> --pixel-width <pixels> --pixel-height <pixels> \\
    --dpr <1|2|3> [--base-url http://127.0.0.1:5191/] \\
    [--out-dir <empty-directory>] [--scenes discover,players,selection,truth,saved] \\
    [--chromium /usr/bin/chromium] [--capture]

Obtain the exact slot dimensions from App Store Connect before capturing.
The script uses an unmodified browser screenshot at the requested DPR; it never
stretches, resizes, paints over, or generates application screens.
Start the local app separately. External-origin requests are blocked.
Use a new/empty output directory; existing captures are never overwritten.`;

function integer(value, name) {
  if (!/^\d+$/.test(value || ""))
    throw new Error(`${name} must be an integer.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 10000)
    throw new Error(`${name} must be between 1 and 10000.`);
  return number;
}

export function parseCaptureOptions(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      label: { type: "string" },
      "pixel-width": { type: "string" },
      "pixel-height": { type: "string" },
      dpr: { type: "string" },
      "base-url": { type: "string" },
      "out-dir": { type: "string" },
      scenes: { type: "string" },
      chromium: { type: "string" },
      capture: { type: "boolean" },
      help: { type: "boolean" },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return { help: true };
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(values.label || ""))
    throw new Error(
      "Supply a short lowercase --label for the intended device reference.",
    );
  const pixelWidth = integer(values["pixel-width"], "--pixel-width");
  const pixelHeight = integer(values["pixel-height"], "--pixel-height");
  const dpr = integer(values.dpr, "--dpr");
  if (![1, 2, 3].includes(dpr)) throw new Error("--dpr must be 1, 2, or 3.");
  if (pixelWidth % dpr || pixelHeight % dpr)
    throw new Error("Both pixel dimensions must divide exactly by --dpr.");
  const viewport = { width: pixelWidth / dpr, height: pixelHeight / dpr };
  if (viewport.width < 320 || viewport.height < 320)
    throw new Error("The CSS viewport must be at least 320 × 320.");
  const base = new URL(values["base-url"] || "http://127.0.0.1:5191/");
  if (
    base.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  )
    throw new Error(
      "--base-url must be a local HTTP app root without credentials.",
    );
  const scenes = values.scenes ? values.scenes.split(",") : availableScenes;
  if (
    scenes.length < 3 ||
    scenes.length > 5 ||
    new Set(scenes).size !== scenes.length ||
    scenes.some((scene) => !availableScenes.includes(scene))
  )
    throw new Error(
      `Choose 3–5 distinct scenes from ${availableScenes.join(", ")}.`,
    );
  return {
    label: values.label,
    pixelWidth,
    pixelHeight,
    dpr,
    viewport,
    baseURL: base.href,
    origin: base.origin,
    scenes: availableScenes.filter((scene) => scenes.includes(scene)),
    outDir: path.resolve(
      values["out-dir"] ||
        path.join(root, "artifacts/admob/store-reference", values.label),
    ),
    executablePath:
      values.chromium ||
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    capture: values.capture === true,
  };
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

export async function captureStoreReference(options) {
  const { chromium } = await import("playwright");
  try {
    if ((await readdir(options.outDir)).length)
      throw new Error(
        "Output directory is not empty; choose a fresh directory.",
      );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const catalog = JSON.parse(
    await readFile(path.join(root, "src/content/cards.json"), "utf8"),
  );
  const approvedCards = catalog.filter(
    (card) =>
      card.language === "en" &&
      card.category === "party" &&
      card.difficulty === "easy" &&
      card.type === "truth" &&
      card.pack === "core" &&
      card.sensitive === false,
  );
  if (!approvedCards.length)
    throw new Error("No approved public Party/Easy truths.");
  await mkdir(options.outDir, { recursive: true });
  const metadata = {
    schema: "dareflip-browser-reference/v1",
    status: "in-progress",
    captureKind: "actual-working-app-browser-reference",
    nativeIosCapture: false,
    slotLabel: options.label,
    requestedPixels: { width: options.pixelWidth, height: options.pixelHeight },
    cssViewport: options.viewport,
    deviceScaleFactor: options.dpr,
    locale: "en-US",
    fictionalPlayers,
    sourceHead: git(["rev-parse", "HEAD"]),
    latestSourceCommit: git(["log", "-1", "--format=%H", "--", "src"]),
    trackedSourceDirty: git(["status", "--porcelain", "--", "src"]) !== "",
    startedAt: new Date().toISOString(),
    images: [],
    limitations: [
      "Rendered in Linux Chromium, not an iOS device, iOS simulator, or TestFlight.",
      "No iOS status bar, hardware cutout, Dynamic Island, native keyboard or ad SDK behavior is represented.",
      "No resizing, compositing, generated UI, hidden game modes or edited card text.",
      "Slot dimensions must be confirmed separately; this script does not certify App Store acceptance.",
    ],
  };
  const manifest = path.join(options.outDir, "capture-manifest.json");
  const saveManifest = () =>
    writeFile(manifest, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await saveManifest();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: options.executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    metadata.browser = browser.version();
    const context = await browser.newContext({
      viewport: options.viewport,
      deviceScaleFactor: options.dpr,
      isMobile: true,
      hasTouch: true,
      locale: "en-US",
      colorScheme: "dark",
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    const external = [];
    const errors = [];
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        url.origin === options.origin ||
        ["data:", "blob:"].includes(url.protocol)
      )
        return route.continue();
      external.push(url.origin);
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    const capture = async (scene) => {
      if (!options.scenes.includes(scene)) return;
      await page.locator(".toast").waitFor({ state: "hidden" });
      await page.evaluate(async () => {
        await globalThis.document.fonts.ready;
        globalThis.document.activeElement?.blur();
      });
      const file = `${String(availableScenes.indexOf(scene) + 1).padStart(2, "0")}-${scene}-browser-reference.png`;
      await page.screenshot({
        path: path.join(options.outDir, file),
        fullPage: false,
        scale: "device",
        animations: "disabled",
        caret: "hide",
        omitBackground: false,
      });
      const bytes = await readFile(path.join(options.outDir, file));
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (width !== options.pixelWidth || height !== options.pixelHeight)
        throw new Error(
          `Unexpected PNG size for ${scene}: ${width} × ${height}.`,
        );
      metadata.images.push({
        scene,
        file,
        width,
        height,
        pngColorType: bytes[25],
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
      await saveManifest();
    };
    await page.goto(options.baseURL, { waitUntil: "networkidle" });
    await page.locator(".splash").waitFor({ state: "hidden" });
    if ((await page.locator("html").getAttribute("lang")) !== "en")
      throw new Error("The capture must show the actual English interface.");
    await capture("discover");
    await page.locator(".mode-party").click();
    for (const [index, player] of fictionalPlayers.entries()) {
      await page
        .getByRole("textbox", { name: `Player name ${index + 1}`, exact: true })
        .fill(player.name);
      await page
        .getByRole("combobox", { name: `Gender ${index + 1}`, exact: true })
        .selectOption(player.gender);
    }
    await page.locator("main").evaluate((element) => {
      element.scrollTop = 0;
    });
    await capture("players");
    await page
      .getByRole("button", { name: "Start the game", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Spin the bottle", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector(".game-stage")
          ?.getAttribute("data-phase") === "choosing",
    );
    await capture("selection");
    await page.getByRole("button", { name: "Truth", exact: true }).click();
    const text = await page.getByTestId("card-prompt").innerText();
    const card = approvedCards.find((item) => item.text === text);
    if (!card)
      throw new Error(
        "The app did not draw an approved actual Party/Easy card.",
      );
    metadata.revealedCard = card;
    await capture("truth");
    await page.getByRole("button", { name: "Save card", exact: true }).click();
    await page
      .getByRole("button", { name: "Take a break", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Back", exact: true })
      .click();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Saved", exact: true })
      .click();
    await page.locator(".saved-card").waitFor({ state: "visible" });
    await capture("saved");
    if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
    if (external.length)
      throw new Error(
        `External requests blocked: ${[...new Set(external)].join(", ")}`,
      );
    metadata.status = "complete";
    metadata.completedAt = new Date().toISOString();
    metadata.externalOriginsRequested = [];
    await saveManifest();
    return metadata;
  } catch (error) {
    metadata.status = "failed";
    metadata.error = error.message;
    await saveManifest();
    throw error;
  } finally {
    await browser?.close();
  }
}

async function main() {
  const options = parseCaptureOptions();
  if (options.help) return console.log(help);
  if (!options.capture) {
    console.log(JSON.stringify({ mode: "plan-only", ...options }, null, 2));
    console.log(
      "No browser or server started and no captures written. Add --capture after slot dimensions are confirmed.",
    );
    return;
  }
  const metadata = await captureStoreReference(options);
  console.log(
    `Captured ${metadata.images.length} browser references at ${options.pixelWidth} × ${options.pixelHeight}: ${options.outDir}`,
  );
  console.log(
    "These are not native iOS screenshots; see capture-manifest.json.",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
