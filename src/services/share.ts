import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

interface ShareCard {
  title?: string;
  text: string;
  type: string;
  player?: string;
}
export async function createCardImage(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable.");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#321151");
  gradient.addColorStop(1, "#110b25");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = "#ff61bc";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(60, 60, 960, 1230, 48);
  ctx.stroke();
  ctx.fillStyle = "#ff83c8";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("DAREFLIP", 110, 160);
  ctx.fillStyle = "#ffad67";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(card.type.toUpperCase(), 110, 240);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 54px sans-serif";
  // Character wrapping also supports languages without spaces (Japanese/Chinese).
  const lines: string[] = [];
  let line = "";
  for (const char of Array.from(card.text)) {
    if (ctx.measureText(line + char).width > 850 && line) {
      lines.push(line.trim());
      line = char;
    } else line += char;
  }
  if (line) lines.push(line.trim());
  const size = Math.min(54, 650 / Math.max(lines.length, 1));
  ctx.font = `bold ${size}px sans-serif`;
  const rtl = /[\u0600-\u06ff]/.test(card.text);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  lines.forEach((text, index) =>
    ctx.fillText(text, rtl ? 960 : 110, 410 + index * (size + 22), 850),
  );
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "#c5b4d4";
  ctx.font = "28px sans-serif";
  ctx.fillText("Flip a card. Reveal a secret.", 110, 1190);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      "image/png",
    ),
  );
}
export async function shareCard(
  card: ShareCard,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await createCardImage(card);
  const title = card.title || "DareFlip";
  if (Capacitor.isNativePlatform()) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const file = await Filesystem.writeFile({
      path: "dareflip-share.png",
      directory: Directory.Cache,
      data: base64,
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
      await Filesystem.deleteFile({
        path: "dareflip-share.png",
        directory: Directory.Cache,
      }).catch(() => undefined);
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
