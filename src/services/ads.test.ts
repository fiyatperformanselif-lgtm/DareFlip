import { describe, expect, it, vi } from "vitest";
import { AdmobConsentStatus } from "@capacitor-community/admob";
import {
  AdsManager,
  interstitialEligible,
  selectAdConfig,
  TEST_AD_UNITS,
} from "./ads";

function setup(canRequestAds = true, platform = "android") {
  const plugin = {
    requestConsentInfo: vi
      .fn()
      .mockResolvedValue({
        canRequestAds,
        status: AdmobConsentStatus.NOT_REQUIRED,
      }),
    showConsentForm: vi.fn(),
    showPrivacyOptionsForm: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    getBannerSize: vi.fn().mockResolvedValue({ width: 320, height: 64 }),
    initialize: vi.fn().mockResolvedValue(undefined),
    showBanner: vi.fn().mockResolvedValue(undefined),
    removeBanner: vi.fn().mockResolvedValue(undefined),
    trackingAuthorizationStatus: vi
      .fn()
      .mockResolvedValue({ status: "notDetermined" }),
    requestTrackingAuthorization: vi.fn().mockResolvedValue(undefined),
    prepareInterstitial: vi.fn().mockResolvedValue(undefined),
    showInterstitial: vi.fn().mockResolvedValue(undefined),
    prepareRewardVideoAd: vi.fn().mockResolvedValue(undefined),
    showRewardVideoAd: vi.fn().mockResolvedValue({ amount: 1, type: "pack" }),
  };
  let now = 1_000_000;
  const ads = new AdsManager(
    plugin as unknown as ConstructorParameters<typeof AdsManager>[0],
    platform,
    TEST_AD_UNITS.android,
    true,
    () => now,
  );
  return {
    ads,
    plugin,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
const context = {
  cardsPlayed: 6,
  mode: "party",
  sensitive: false,
  naturalBreak: true,
};
describe("ad eligibility", () => {
  it("requires more than five cards, a 120 second gap and a natural break", () => {
    expect(interstitialEligible(context, 120_000, 0)).toBe(true);
    expect(
      interstitialEligible({ ...context, cardsPlayed: 5 }, 120_000, 0),
    ).toBe(false);
    expect(interstitialEligible(context, 119_999, 0)).toBe(false);
    expect(
      interstitialEligible({ ...context, naturalBreak: false }, 120_000, 0),
    ).toBe(false);
  });
  it("never serves sensitive content or Flirty", () => {
    expect(
      interstitialEligible({ ...context, sensitive: true }, 120_000, 0),
    ).toBe(false);
    expect(
      interstitialEligible({ ...context, mode: "flirty" }, 120_000, 0),
    ).toBe(false);
  });
});
describe("native consent gate", () => {
  it("does nothing before explicit permission, or on web", async () => {
    const { ads, plugin } = setup();
    await ads.updatePlacement({ menu: true, sensitive: false });
    expect(await ads.rewarded()).toBe(false);
    expect(plugin.initialize).not.toHaveBeenCalled();
    expect(plugin.showBanner).not.toHaveBeenCalled();
    const web = setup(true, "web");
    await web.ads.enableAds();
    expect(web.plugin.requestConsentInfo).not.toHaveBeenCalled();
  });
  it("does not initialize or request any ad when UMP cannot request ads", async () => {
    const { ads, plugin } = setup(false);
    expect(await ads.enableAds()).toBe("off");
    await ads.updatePlacement({ menu: true, sensitive: false });
    expect(plugin.initialize).not.toHaveBeenCalled();
    expect(plugin.showBanner).not.toHaveBeenCalled();
  });
  it("checks UMP again after showing a required form", async () => {
    const { ads, plugin } = setup();
    plugin.requestConsentInfo.mockResolvedValueOnce({
      canRequestAds: false,
      status: AdmobConsentStatus.REQUIRED,
      isConsentFormAvailable: true,
    });
    await ads.enableAds();
    expect(plugin.showConsentForm).toHaveBeenCalledOnce();
    expect(plugin.requestConsentInfo).toHaveBeenCalledTimes(2);
    expect(plugin.initialize).toHaveBeenCalledOnce();
  });
  it("keeps ATT optional and never asks without explanation opt-in", async () => {
    const { ads, plugin } = setup(true, "ios");
    await ads.enableAds();
    expect(plugin.requestTrackingAuthorization).not.toHaveBeenCalled();
    await ads.disableAds();
    await ads.enableAds({ attOptIn: true });
    expect(plugin.requestTrackingAuthorization).toHaveBeenCalledOnce();
  });
  it("only displays banners on a nonsensitive menu and removes them on play", async () => {
    const { ads, plugin } = setup();
    await ads.enableAds();
    await ads.updatePlacement({ menu: true, sensitive: true });
    expect(plugin.showBanner).not.toHaveBeenCalled();
    await ads.updatePlacement({ menu: true, sensitive: false });
    expect(plugin.showBanner).toHaveBeenCalledOnce();
    await ads.updatePlacement({ menu: false, sensitive: false });
    expect(plugin.removeBanner).toHaveBeenCalledOnce();
  });
  it("caps interstitials and treats network errors as a nonblocking no-ad result", async () => {
    const { ads, plugin, advance } = setup();
    await ads.enableAds();
    await ads.updatePlacement({
      menu: false,
      sensitive: false,
      naturalBreak: true,
    });
    expect(await ads.maybeInterstitial(context)).toBe(false);
    advance(120_000);
    expect(await ads.maybeInterstitial(context)).toBe(true);
    expect(await ads.maybeInterstitial(context)).toBe(false);
    advance(120_000);
    plugin.prepareInterstitial.mockRejectedValue(new Error("offline"));
    expect(await ads.maybeInterstitial(context)).toBe(false);
  });
  it("never grants a bonus on dismissal, missing reward, or no consent", async () => {
    const { ads, plugin } = setup();
    expect(await ads.rewarded()).toBe(false);
    await ads.enableAds();
    plugin.showRewardVideoAd.mockRejectedValueOnce(new Error("dismissed"));
    expect(await ads.rewarded()).toBe(false);
    plugin.showRewardVideoAd.mockResolvedValueOnce({ amount: 0, type: "pack" });
    expect(await ads.rewarded()).toBe(false);
    expect(await ads.rewarded()).toBe(true);
    await ads.disableAds();
    expect(await ads.rewarded()).toBe(false);
  });
  it("cancels an in-flight load if permission is withdrawn", async () => {
    const { ads, plugin, advance } = setup();
    await ads.enableAds();
    await ads.updatePlacement({
      menu: false,
      sensitive: false,
      naturalBreak: true,
    });
    advance(120_000);
    let resolve!: () => void;
    plugin.prepareInterstitial.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const pending = ads.maybeInterstitial(context);
    await ads.disableAds();
    resolve();
    expect(await pending).toBe(false);
    expect(plugin.showInterstitial).not.toHaveBeenCalled();
  });
});

describe("build ad configuration", () => {
  it("forces official sample inventory in development, even if real IDs are configured", () => {
    expect(
      selectAdConfig("ios", true, {
        VITE_ADMOB_TESTING: "false",
        VITE_ADMOB_IOS_BANNER: "real",
      }),
    ).toEqual({ testing: true, units: TEST_AD_UNITS.ios });
  });
  it("supports an explicit test build without silently supplying IDs in release", () => {
    expect(
      selectAdConfig("android", false, { VITE_ADMOB_TESTING: "true" }),
    ).toEqual({ testing: true, units: TEST_AD_UNITS.android });
    expect(selectAdConfig("android", false, {}).units).toEqual({
      banner: "",
      interstitial: "",
      rewarded: "",
    });
  });
  it("drops an interstitial if the player resumes before it loads", async () => {
    const { ads, plugin, advance } = setup();
    await ads.enableAds();
    await ads.updatePlacement({
      menu: false,
      sensitive: false,
      naturalBreak: true,
    });
    advance(120_000);
    let resolve!: () => void;
    plugin.prepareInterstitial.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const pending = ads.maybeInterstitial(context);
    await ads.updatePlacement({
      menu: false,
      sensitive: false,
      naturalBreak: false,
    });
    resolve();
    expect(await pending).toBe(false);
    expect(plugin.showInterstitial).not.toHaveBeenCalled();
  });
});

describe("native banner dimensions and reward revocation", () => {
  it("reports measured banner height and clears it when leaving a menu", async () => {
    const { ads } = setup();
    const listener = vi.fn();
    const off = ads.onBannerSize(listener);
    await ads.enableAds();
    await ads.updatePlacement({ menu: true, sensitive: false });
    expect(listener).toHaveBeenLastCalledWith(64);
    await ads.updatePlacement({ menu: false, sensitive: false });
    expect(listener).toHaveBeenLastCalledWith(0);
    off();
  });
  it("does not unlock if permission is revoked while a rewarded ad is showing", async () => {
    const { ads, plugin } = setup();
    await ads.enableAds();
    let resolve!: (reward: { type: string; amount: number }) => void;
    plugin.showRewardVideoAd.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = ads.rewarded();
    await Promise.resolve();
    await ads.disableAds();
    resolve({ type: "pack", amount: 1 });
    expect(await pending).toBe(false);
  });
});

describe("consent refresh", () => {
  it("revokes existing ad permission when a fresh UMP result denies requests", async () => {
    const { ads, plugin } = setup();
    await ads.enableAds();
    await ads.updatePlacement({ menu: true, sensitive: false });
    plugin.requestConsentInfo.mockResolvedValueOnce({
      canRequestAds: false,
      status: AdmobConsentStatus.REQUIRED,
    });
    expect(await ads.enableAds()).toBe("off");
    expect(plugin.removeBanner).toHaveBeenCalledOnce();
    await ads.updatePlacement({ menu: true, sensitive: false });
    expect(plugin.showBanner).toHaveBeenCalledOnce();
    expect(await ads.rewarded()).toBe(false);
  });
});
