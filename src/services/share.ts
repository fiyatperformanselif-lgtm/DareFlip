import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fitText, graphemes, textDirection } from "./share-layout";
import type { FittedText } from "./share-layout";

export interface ShareCard {
  title?: string;
  text: string;
  type: string;
  language?: string;
  category?: string;
  difficulty?: string;
  /** Legacy caller compatibility only. Personal player data is never rendered. */
  player?: string;
}
export const SHARE_IMAGE = { width: 1080, height: 1350 } as const;
export const SHARE_PROMPT_BOX = {
  x: 144,
  y: 420,
  width: 792,
  height: 585,
} as const;
const fontFamily = '"Avenir Next", "Segoe UI", "Noto Sans", Arial, sans-serif';
const ink = "#592345";
const categories: Record<string, [string, string]> = {
  couples: ["COUPLES", "ÇİFTLER"],
  party: ["PARTY", "PARTİ"],
  flirty: ["FLIRTY 18+", "FLÖRT 18+"],
  deep: ["DEEP TALK", "DERİN SOHBET"],
  crazy: ["CRAZY FUN", "ÇILGIN EĞLENCE"],
  random: ["RANDOM", "RASTGELE"],
};
const difficulties: Record<string, [string, string]> = {
  easy: ["EASY", "KOLAY"],
  medium: ["MEDIUM", "ORTA"],
  bold: ["BOLD", "CESUR"],
};

export function shareLabels(card: ShareCard): {
  type: string;
  metadata: string;
  dare: boolean;
} {
  const tr = card.language?.toLowerCase().split(/[-_]/)[0] === "tr";
  const kind = card.type.toLowerCase();
  const dare = kind === "dare";
  const type =
    kind === "truth"
      ? tr
        ? "DOĞRULUK"
        : "TRUTH"
      : dare
        ? tr
          ? "CESARET"
          : "DARE"
        : "DAREFLIP";
  // Only known labels are exported. Arbitrary extra properties/title/player stay private.
  const label = (
    values: Record<string, [string, string]>,
    value: string | undefined,
  ) =>
    value && Object.hasOwn(values, value.toLowerCase())
      ? values[value.toLowerCase()][tr ? 1 : 0]
      : undefined;
  const metadata = [
    label(categories, card.category),
    label(difficulties, card.difficulty),
  ]
    .filter(Boolean)
    .join("  ·  ");
  return { type, metadata, dare };
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function spark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.18, -size * 0.18, size, 0);
  ctx.quadraticCurveTo(size * 0.18, size * 0.18, 0, size);
  ctx.quadraticCurveTo(-size * 0.18, size * 0.18, -size, 0);
  ctx.quadraticCurveTo(-size * 0.18, -size * 0.18, 0, -size);
  ctx.fill();
  ctx.restore();
}
function glyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dare: boolean,
  color: string,
  filled = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.beginPath();
  if (dare) {
    ctx.moveTo(7, -29);
    ctx.lineTo(-23, 6);
    ctx.lineTo(-3, 6);
    ctx.lineTo(-9, 30);
    ctx.lineTo(24, -8);
    ctx.lineTo(3, -8);
    ctx.closePath();
  } else {
    ctx.moveTo(0, 27);
    ctx.bezierCurveTo(-8, 20, -29, 5, -29, -10);
    ctx.bezierCurveTo(-29, -28, -8, -31, 0, -17);
    ctx.bezierCurveTo(8, -31, 29, -28, 29, -10);
    ctx.bezierCurveTo(29, 5, 8, 20, 0, 27);
    ctx.closePath();
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  if (filled) ctx.fill();
  else ctx.stroke();
  ctx.restore();
}
function tracked(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  spacing: number,
) {
  ctx.textAlign = "left";
  for (const point of graphemes(value)) {
    ctx.fillText(point, x, y);
    x += ctx.measureText(point).width + spacing;
  }
}
function brandMark(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(118, 111);
  ctx.rotate(-0.18);
  ctx.fillStyle = "#6b3c83";
  ctx.strokeStyle = "#b98aca";
  ctx.lineWidth = 1.5;
  rounded(ctx, -35, -39, 58, 77, 13);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(0.31);
  const color = ctx.createLinearGradient(-18, -35, 38, 42);
  color.addColorStop(0, "#ff5cb5");
  color.addColorStop(1, "#ffad76");
  ctx.fillStyle = color;
  rounded(ctx, -22, -31, 56, 75, 13);
  ctx.fill();
  glyph(ctx, 5, 5, 35, true, "#fff6fb", true);
  ctx.restore();
  spark(ctx, 159, 145, 7, "#ffddad");
}

/** Exposed for real-canvas regression checks; uses the exact metrics used by export. */
export function layoutShareText(
  ctx: CanvasRenderingContext2D,
  text: string,
): FittedText {
  ctx.direction = textDirection(text);
  ctx.textAlign = "center";
  const layout = fitText(text, SHARE_PROMPT_BOX, (line, size) => {
    ctx.font = `800 ${size}px ${fontFamily}`;
    const value = ctx.measureText(line);
    const left = value.actualBoundingBoxLeft ?? value.width / 2;
    const right = value.actualBoundingBoxRight ?? value.width / 2;
    return {
      width: Math.max(value.width, left + right),
      ascent: value.actualBoundingBoxAscent,
      descent: value.actualBoundingBoxDescent,
      centerOffset: (left - right) / 2,
    };
  });
  ctx.font = `800 ${layout.fontSize}px ${fontFamily}`;
  return layout;
}

/** Offline, vector-only artwork. Only the card prompt and whitelisted labels enter the PNG. */
export async function createCardImage(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_IMAGE.width;
  canvas.height = SHARE_IMAGE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable.");
  const labels = shareLabels(card);
  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#20112f");
  background.addColorStop(0.56, "#130c22");
  background.addColorStop(1, "#211027");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);
  const glow = ctx.createRadialGradient(1050, 350, 5, 1050, 350, 850);
  glow.addColorStop(0, "#8c315b55");
  glow.addColorStop(1, "#8c315b00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1350);
  const lowerGlow = ctx.createRadialGradient(0, 1310, 0, 0, 1310, 700);
  lowerGlow.addColorStop(0, "#b9554b38");
  lowerGlow.addColorStop(1, "#b9554b00");
  ctx.fillStyle = lowerGlow;
  ctx.fillRect(0, 0, 1080, 1350);

  brandMark(ctx);
  ctx.fillStyle = "#fff5fc";
  ctx.font = `800 59px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("DareFlip", 185, 133);
  spark(ctx, 958, 114, 23, "#ffb685");
  spark(ctx, 1004, 165, 7, "#e38cc5");

  // Offset decks and soft physical shadows provide depth without external artwork.
  ctx.save();
  ctx.translate(540, 695);
  ctx.rotate(-0.045);
  ctx.fillStyle = "#64304f";
  ctx.strokeStyle = "#ff9fbc80";
  ctx.lineWidth = 2;
  rounded(ctx, -452, -449, 904, 913, 57);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(540, 700);
  ctx.rotate(0.035);
  ctx.fillStyle = "#42243e";
  ctx.strokeStyle = "#e795b370";
  rounded(ctx, -450, -452, 900, 906, 57);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = "#08050f90";
  ctx.shadowBlur = 65;
  ctx.shadowOffsetY = 24;
  const face = ctx.createLinearGradient(80, 240, 975, 1146);
  face.addColorStop(0, labels.dare ? "#ffddbc" : "#ffd6eb");
  face.addColorStop(1, labels.dare ? "#ff9f7e" : "#ec86b7");
  ctx.fillStyle = face;
  rounded(ctx, 80, 240, 920, 906, 57);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#fff8";
  ctx.lineWidth = 2;
  rounded(ctx, 101, 261, 878, 864, 40);
  ctx.stroke();

  ctx.fillStyle = "#ffffff35";
  rounded(ctx, 141, 300, 64, 64, 22);
  ctx.fill();
  glyph(ctx, 173, 332, 35, labels.dare, ink);
  ctx.fillStyle = ink;
  ctx.font = `800 29px ${fontFamily}`;
  tracked(ctx, labels.type, 229, 342, 2.8);
  spark(ctx, 919, 330, 11, ink + "90");
  ctx.strokeStyle = "#59234528";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(144, 386);
  ctx.lineTo(936, 386);
  ctx.stroke();
  glyph(ctx, 808, 472, 176, labels.dare, "#5923450b", true);

  const layout = layoutShareText(ctx, card.text);
  ctx.font = `800 ${layout.fontSize}px ${fontFamily}`;
  ctx.fillStyle = ink;
  for (const line of layout.lines) {
    if (line.text)
      ctx.fillText(
        line.text,
        540 + line.centerOffset,
        SHARE_PROMPT_BOX.y + line.baseline,
      );
  }
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.strokeStyle = "#59234528";
  ctx.beginPath();
  ctx.moveTo(144, 1045);
  ctx.lineTo(936, 1045);
  ctx.stroke();
  ctx.fillStyle = "#592345cb";
  ctx.font = `700 21px ${fontFamily}`;
  tracked(ctx, labels.metadata || "DAREFLIP", 146, 1094, 1.6);
  spark(ctx, 918, 1086, 9, "#592345a0");

  ctx.fillStyle = "#f7eaf5";
  ctx.font = `700 29px ${fontFamily}`;
  ctx.fillText("Flip a card.", 83, 1253);
  const firstWidth = ctx.measureText("Flip a card. ").width;
  ctx.fillStyle = "#f5a9ce";
  ctx.fillText("Reveal a secret.", 83 + firstWidth, 1253);
  ctx.strokeStyle = "#ff9d7b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(85, 1198);
  ctx.lineTo(137, 1198);
  ctx.stroke();
  spark(ctx, 959, 1242, 16, "#ffb582");

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      "image/png",
    ),
  );
}

let shareSequence = 0;
/** Share-sheet/cancellation lifecycle is separate from artwork for native mock coverage. */
export async function shareCardImage(
  blob: Blob,
  title = "DareFlip",
): Promise<"shared" | "downloaded" | "cancelled"> {
  if (Capacitor.isNativePlatform()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    const path = `dareflip-share-${Date.now()}-${shareSequence++}.png`;
    const file = await Filesystem.writeFile({
      path,
      directory: Directory.Cache,
      data: btoa(binary),
    });
    try {
      await Share.share({
        title,
        files: [file.uri],
        dialogTitle: "Share your DareFlip card",
      });
      return "shared";
    } catch {
      return "cancelled";
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(
        () => undefined,
      );
    }
  }
  const file = new File([blob], "dareflip-card.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
export async function shareCard(
  card: ShareCard,
): Promise<"shared" | "downloaded" | "cancelled"> {
  return shareCardImage(await createCardImage(card), card.title || "DareFlip");
}
