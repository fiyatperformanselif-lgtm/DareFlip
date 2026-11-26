import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("share typography fits current and archived cards and multilingual stress text without clipped ink", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const servicePath = "/src/services/share.ts";
    const contentPath = "/src/content/index.ts";
    const { layoutShareText, SHARE_PROMPT_BOX } = await import(servicePath);
    const { persistedCards } = await import(contentPath);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const samples: { id: string; text: string }[] = [
      ...persistedCards,
      { id: "explicit-lines", text: "First line\n\nSecond line\nLast line" },
      {
        id: "cjk",
        text: "日本語の文字列。漢字とひらがな、カタカナを正しく折り返します。".repeat(
          5,
        ),
      },
      { id: "emoji", text: "👩🏽‍💻 👨‍👩‍👧‍👦 🇹🇷 e\u0301 ".repeat(16) },
      {
        id: "rtl",
        text: "مرحبًا بالعالم. هذه فقرة لاختبار اتجاه الكتابة والحدود الطباعية. ".repeat(
          6,
        ),
      },
    ];
    const failures: unknown[] = [];
    let explicitLines: string[] = [];
    for (const sample of samples) {
      const fitted = layoutShareText(ctx, sample.text);
      if (sample.id === "explicit-lines")
        explicitLines = fitted.lines.map((line: { text: string }) => line.text);
      for (const line of fitted.lines) {
        const metrics = ctx.measureText(line.text);
        const left =
          SHARE_PROMPT_BOX.width / 2 +
          line.centerOffset -
          metrics.actualBoundingBoxLeft;
        const right =
          SHARE_PROMPT_BOX.width / 2 +
          line.centerOffset +
          metrics.actualBoundingBoxRight;
        if (
          left < -0.1 ||
          right > SHARE_PROMPT_BOX.width + 0.1 ||
          line.baseline - metrics.actualBoundingBoxAscent < -0.1 ||
          line.baseline + metrics.actualBoundingBoxDescent >
            SHARE_PROMPT_BOX.height + 0.1
        )
          failures.push({
            id: sample.id,
            fontSize: fitted.fontSize,
            left,
            right,
            baseline: line.baseline,
          });
      }
      const restored = fitted.lines
        .map((line: { text: string }) => line.text)
        .join("")
        .replace(/\s/gu, "");
      if (restored !== sample.text.replace(/\s/gu, ""))
        failures.push({ id: sample.id, error: "Text lost during wrapping" });
    }
    return { count: samples.length, failures, explicitLines };
  });
  expect(result.count).toBeGreaterThanOrEqual(742);
  expect(result.failures).toEqual([]);
  expect(result.explicitLines).toEqual([
    "First line",
    "",
    "Second line",
    "Last line",
  ]);
});

test("premium export is a real offline 1080×1350 PNG and ignores all personal fields", async ({
  page,
  context,
}, testInfo) => {
  const origin = new URL(testInfo.project.use.baseURL as string).origin;
  const external: string[] = [];
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  const modules = await page.evaluateHandle(async () => {
    const servicePath = "/src/services/share.ts";
    const contentPath = "/src/content/index.ts";
    return {
      share: await import(servicePath),
      content: await import(contentPath),
    };
  });
  await context.setOffline(true);
  const images = await modules.evaluate(async ({ share, content }) => {
    const original = content.cards.find(
      (card: { id: string; language: string }) =>
        card.id === "party-easy-truth-01-v2" && card.language === "en",
    );
    const translated = content.cards.find(
      (card: { id: string; language: string }) =>
        card.id === original.id && card.language === "tr",
    );
    const longest = content.cards
      .filter((card: { language: string }) => card.language === "en")
      .sort(
        (a: { text: string }, b: { text: string }) =>
          b.text.length - a.text.length,
      )[0];
    const samples = [
      { name: "en", card: original },
      { name: "tr", card: translated },
      {
        name: "qa03-long",
        card: {
          ...longest,
          text: [longest.text, longest.text, longest.text].join("\n\n"),
        },
      },
      {
        name: "cjk",
        card: {
          text: "日本語の文字列。漢字とひらがな、カタカナを正しく折り返します。".repeat(
            3,
          ),
          type: "truth",
          language: "ja",
        },
      },
      {
        name: "emoji",
        card: {
          text: "👩🏽‍💻 👨‍👩‍👧‍👦 🇹🇷 e\u0301 ".repeat(10),
          type: "dare",
          language: "en",
        },
      },
      {
        name: "rtl",
        card: {
          text: "مرحبًا بالعالم. هذه فقرة لاختبار اتجاه الكتابة والحدود الطباعية. ".repeat(
            4,
          ),
          type: "truth",
          language: "ar",
        },
      },
    ];
    const rendered = [];
    let originalPixels: Uint8ClampedArray | undefined;
    for (const sample of samples) {
      const blob = await share.createCardImage(sample.card);
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      if (sample.name === "en") originalPixels = pixels;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      rendered.push({
        name: sample.name,
        type: blob.type,
        width: canvas.width,
        height: canvas.height,
        base64: btoa(binary),
        opaque: [...pixels].every(
          (value, index) => index % 4 !== 3 || value === 255,
        ),
      });
    }
    const privateBlob = await share.createCardImage({
      ...original,
      title: "PRIVATE TITLE",
      player: "PRIVATE PLAYER",
      gender: "PRIVATE GENDER",
      answers: "PRIVATE ANSWERS",
    });
    const bitmap = await createImageBitmap(privateBlob);
    const privateCanvas = document.createElement("canvas");
    privateCanvas.width = bitmap.width;
    privateCanvas.height = bitmap.height;
    const ctx = privateCanvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const privatePixels = ctx.getImageData(
      0,
      0,
      privateCanvas.width,
      privateCanvas.height,
    ).data;
    return {
      rendered,
      privateFieldsIgnored: privatePixels.every(
        (value, index) => value === originalPixels![index],
      ),
    };
  });
  expect(images.privateFieldsIgnored).toBe(true);
  expect(external).toEqual([]);
  const directory = path.join("artifacts", "admob", "premium-2026-11-27");
  await mkdir(directory, { recursive: true });
  for (const image of images.rendered) {
    expect(image.type).toBe("image/png");
    expect(image.width).toBe(1080);
    expect(image.height).toBe(1350);
    expect(image.opaque).toBe(true);
    const png = Buffer.from(image.base64, "base64");
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1350);
    const filename = path.join(
      directory,
      `share-${testInfo.project.name || "preview"}-${image.name}.png`,
    );
    await writeFile(filename, png);
    await testInfo.attach(`Share export ${image.name}`, {
      path: filename,
      contentType: "image/png",
    });
  }
  await context.setOffline(false);
});
