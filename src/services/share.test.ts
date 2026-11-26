import { afterEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ value: true }));
const filesystem = vi.hoisted(() => ({
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
}));
const sheet = vi.hoisted(() => ({ share: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.value },
}));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: filesystem,
}));
vi.mock("@capacitor/share", () => ({ Share: sheet }));
import { shareCardImage, shareLabels } from "./share";

const image = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
  type: "image/png",
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  native.value = true;
});

describe("private share metadata", () => {
  it("localizes known Turkish card labels and omits arbitrary personal metadata", () => {
    expect(
      shareLabels({
        text: "Sample",
        type: "truth",
        language: "tr-TR",
        category: "party",
        difficulty: "bold",
        player: "Private player",
      }),
    ).toEqual({ type: "DOĞRULUK", metadata: "PARTİ  ·  CESUR", dare: false });
    expect(
      shareLabels({
        text: "Sample",
        type: "dare",
        category: "couples",
        difficulty: "easy",
      }),
    ).toEqual({ type: "DARE", metadata: "COUPLES  ·  EASY", dare: true });
    expect(
      shareLabels({
        text: "Sample",
        type: "Private player",
        title: "Private answer",
        category: "Private gender",
        difficulty: "Private answer",
      }),
    ).toEqual({ type: "DAREFLIP", metadata: "", dare: false });
    expect(
      shareLabels({
        text: "Sample",
        type: "DARE",
        category: "__proto__",
        difficulty: "constructor",
      }),
    ).toEqual({ type: "DARE", metadata: "", dare: true });
  });
});
describe("native share lifecycle", () => {
  it("shares only the generated cache image and deletes that exact file after success", async () => {
    filesystem.writeFile.mockResolvedValue({ uri: "file:///cache/export.png" });
    filesystem.deleteFile.mockResolvedValue(undefined);
    sheet.share.mockResolvedValue({});
    expect(await shareCardImage(image)).toBe("shared");
    const written = filesystem.writeFile.mock.calls[0][0];
    expect(written.path).toMatch(/^dareflip-share-\d+-\d+\.png$/);
    expect(written.directory).toBe("CACHE");
    expect(written.data).toBe("iVBORw0KGgo=");
    expect(sheet.share).toHaveBeenCalledWith({
      title: "DareFlip",
      files: ["file:///cache/export.png"],
      dialogTitle: "Share your DareFlip card",
    });
    expect(filesystem.deleteFile).toHaveBeenCalledWith({
      path: written.path,
      directory: "CACHE",
    });
  });
  it("treats a cancelled native sheet as cancellation and still removes the temporary image", async () => {
    filesystem.writeFile.mockResolvedValue({
      uri: "file:///cache/cancelled.png",
    });
    filesystem.deleteFile.mockResolvedValue(undefined);
    sheet.share.mockRejectedValue(new Error("cancelled"));
    expect(await shareCardImage(image)).toBe("cancelled");
    expect(filesystem.deleteFile).toHaveBeenCalledOnce();
  });
  it("keeps a successful share successful when cache cleanup is unavailable", async () => {
    filesystem.writeFile.mockResolvedValue({ uri: "file:///cache/export.png" });
    filesystem.deleteFile.mockRejectedValue(new Error("cache unavailable"));
    sheet.share.mockResolvedValue({});
    expect(await shareCardImage(image)).toBe("shared");
  });
  it("uses distinct paths for overlapping shares so one cleanup cannot delete the other export", async () => {
    filesystem.writeFile.mockImplementation(async ({ path }) => ({
      uri: `file:///cache/${path}`,
    }));
    filesystem.deleteFile.mockResolvedValue(undefined);
    sheet.share.mockResolvedValue({});
    await Promise.all([shareCardImage(image), shareCardImage(image)]);
    const paths = filesystem.writeFile.mock.calls.map(([value]) => value.path);
    expect(new Set(paths).size).toBe(2);
    expect(
      filesystem.deleteFile.mock.calls.map(([value]) => value.path).sort(),
    ).toEqual([...paths].sort());
  });
  it("propagates file creation failures instead of opening a broken share sheet", async () => {
    filesystem.writeFile.mockRejectedValue(new Error("storage unavailable"));
    await expect(shareCardImage(image)).rejects.toThrow("storage unavailable");
    expect(sheet.share).not.toHaveBeenCalled();
  });
});
describe("browser share cancellation", () => {
  it("does not download or retry when a user cancels the browser share sheet", async () => {
    native.value = false;
    const share = vi.fn().mockRejectedValue(new Error("AbortError"));
    vi.stubGlobal("navigator", { canShare: () => true, share });
    expect(await shareCardImage(image)).toBe("cancelled");
    expect(share).toHaveBeenCalledOnce();
    expect(filesystem.writeFile).not.toHaveBeenCalled();
  });
});
