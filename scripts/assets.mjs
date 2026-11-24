import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const svg = await readFile("public/icon.svg");
await mkdir("assets", { recursive: true });
for (const size of [192, 512])
  await sharp(svg).resize(size, size).png().toFile(`public/icon-${size}.png`);
await sharp(svg).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(svg).resize(1024, 1024).png().toFile("assets/icon-only.png");
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="#151022"/><image href="data:image/svg+xml;base64,${svg.toString("base64")}" x="1110" y="1000" width="512" height="512"/><text x="1366" y="1630" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="118" fill="white">DareFlip</text><text x="1366" y="1720" text-anchor="middle" font-family="sans-serif" font-size="40" fill="#c5b8d7">Flip a card. Reveal a secret.</text></svg>`;
await writeFile("assets/splash.svg", splash);
await sharp(Buffer.from(splash)).png().toFile("assets/splash.png");
console.log("Brand assets generated.");
