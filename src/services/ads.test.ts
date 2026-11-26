import { describe, expect, it, vi } from "vitest";
import { AdmobConsentStatus } from "@capacitor-community/admob";
import {
  AdsManager,
  interstitialEligible,
  selectAdConfig,
  TEST_AD_UNITS,
} from "./ads";

function setup(canRequestAds = true, platform = "android", enabled = true) {
  const plugin = {
    requestConsentInfo: vi.fn().mockResolvedValue({
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
    enabled,
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
    ).toEqual({ testing: true, units: TEST_AD_UNITS.ios, enabled: true });
  });
  it("supports an explicit test build without silently supplying IDs in release", () => {
    expect(
      selectAdConfig("android", false, { VITE_ADMOB_TESTING: "true" }),
    ).toEqual({ testing: true, units: TEST_AD_UNITS.android, enabled: true });
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

describe("explicit ad-free configuration", () => {
  it("leaves the existing beta/default behavior enabled unless explicitly disabled", () => {
    expect(selectAdConfig("ios", true, {}).enabled).toBe(true);
    expect(
      selectAdConfig("android", false, { VITE_ADMOB_TESTING: "true" }),
    ).toEqual({ enabled: true, testing: true, units: TEST_AD_UNITS.android });
    const existing = setup();
    expect(existing.ads.enabled).toBe(true);
  });

  it("honors the disabled flag in development, test builds and production", () => {
    for (const platform of ["ios", "android", "web"]) {
      for (const development of [false, true]) {
        for (const testing of [undefined, "false", "true"]) {
          expect(
            selectAdConfig(platform, development, {
              VITE_ADS_ENABLED: "false",
              VITE_ADMOB_TESTING: testing,
            }).enabled,
          ).toBe(false);
        }
      }
    }
    const disabledProduction = selectAdConfig("ios", false, {
      VITE_ADS_ENABLED: "false",
    });
    expect(disabledProduction.testing).toBe(false);
    expect(disabledProduction.units).toEqual({
      banner: "",
      interstitial: "",
      rewarded: "",
    });
  });

  it("does not call any plugin method on any platform despite every available UI action", async () => {
    for (const platform of ["ios", "android", "web"]) {
      // The plugin would grant consent, ATT and a positive reward if called.
      const { ads, plugin, advance } = setup(true, platform, false);
      const listener = vi.fn();
      const unsubscribe = ads.onBannerSize(listener);
      await ads.updatePlacement({ menu: true, sensitive: false });
      expect(await ads.enableAds({ attOptIn: true })).toBe("off");
      expect(await ads.privacyOptions()).toBe("off");
      advance(240_000);
      await ads.updatePlacement({
        menu: false,
        sensitive: false,
        naturalBreak: true,
      });
      expect(await ads.maybeInterstitial(context)).toBe(false);
      expect(await ads.rewarded()).toBe(false);
      await ads.disableAds();
      await ads.updatePlacement({ menu: true, sensitive: false });
      expect(await ads.enableAds()).toBe("off");
      expect(await ads.rewarded()).toBe(false);
      expect(ads.enabled).toBe(false);
      expect(ads.state).toBe("off");
      for (const method of Object.values(plugin))
        expect(method).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls.every(([height]) => height === 0)).toBe(true);
      unsubscribe();
    }
  });

  it("applies the actual build flag to the exported native manager without SDK calls", async () => {
    const { plugin } = setup(true, "ios");
    vi.resetModules();
    vi.stubEnv("VITE_ADS_ENABLED", "false");
    vi.doMock("@capacitor/core", async () => {
      const core =
        await vi.importActual<typeof import("@capacitor/core")>(
          "@capacitor/core",
        );
      return {
        ...core,
        Capacitor: { ...core.Capacitor, getPlatform: () => "ios" },
      };
    });
    vi.doMock("@capacitor-community/admob", async () => {
      const admob = await vi.importActual<
        typeof import("@capacitor-community/admob")
      >("@capacitor-community/admob");
      return { ...admob, AdMob: plugin };
    });
    try {
      const configured = await import("./ads");
      expect(configured.advertisingEnabled).toBe(false);
      expect(configured.ads.enabled).toBe(false);
      expect(await configured.ads.enableAds({ attOptIn: true })).toBe("off");
      expect(await configured.ads.privacyOptions()).toBe("off");
      await configured.ads.updatePlacement({ menu: true, sensitive: false });
      expect(await configured.ads.maybeInterstitial(context)).toBe(false);
      expect(await configured.ads.rewarded()).toBe(false);
      await configured.ads.disableAds();
      for (const method of Object.values(plugin))
        expect(method).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("@capacitor/core");
      vi.doUnmock("@capacitor-community/admob");
      vi.unstubAllEnvs();
      vi.resetModules();
    }
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
  it("keeps Off authoritative when a refresh is waiting for native banner removal", async () => {
    const { ads, plugin } = setup();
    await ads.enableAds();
    await ads.updatePlacement({ menu: true, sensitive: false });
    let finishRemoval!: () => void;
    plugin.removeBanner.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRemoval = resolve;
        }),
    );
    const refreshing = ads.enableAds();
    expect(plugin.removeBanner).toHaveBeenCalledOnce();
    await ads.disableAds();
    expect(ads.state).toBe("off");
    finishRemoval();
    expect(await refreshing).toBe("off");
    expect(plugin.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    expect(plugin.showBanner).toHaveBeenCalledTimes(1);
    expect(await ads.rewarded()).toBe(false);
    // A future explicit opt-in remains possible after the cancelled operation.
    expect(await ads.enableAds()).toBe("available");
    expect(plugin.requestConsentInfo).toHaveBeenCalledTimes(2);
  });

  for (const outcome of ["allowed", "failed"] as const) {
    it(`does not override Off when an earlier consent request later ${outcome === "allowed" ? "allows ads" : "fails"}`, async () => {
      const { ads, plugin } = setup();
      let finish!: () => void;
      plugin.requestConsentInfo.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finish =
              outcome === "allowed"
                ? () =>
                    resolve({
                      canRequestAds: true,
                      status: AdmobConsentStatus.NOT_REQUIRED,
                    })
                : () => reject(new Error("consent request failed"));
          }),
      );
      const enabling = ads.enableAds();
      await Promise.resolve();
      expect(plugin.requestConsentInfo).toHaveBeenCalledOnce();
      await ads.disableAds();
      finish();
      expect(await enabling).toBe("off");
      expect(ads.state).toBe("off");
      expect(plugin.initialize).not.toHaveBeenCalled();
      expect(plugin.showBanner).not.toHaveBeenCalled();
      expect(await ads.rewarded()).toBe(false);
    });
  }

  it("does not prepare an interstitial for a stale context after entering a sensitive screen or leaving a break", async () => {
    for (const placement of [
      { menu: false, sensitive: true, naturalBreak: true },
      { menu: false, sensitive: false, naturalBreak: false },
    ]) {
      const { ads, plugin, advance } = setup();
      await ads.enableAds();
      advance(120_000);
      await ads.updatePlacement(placement);
      expect(await ads.maybeInterstitial(context)).toBe(false);
      expect(plugin.prepareInterstitial).not.toHaveBeenCalled();
      expect(plugin.showInterstitial).not.toHaveBeenCalled();
    }
  });

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

describe("cancelled privacy prompts", () => {
  it("does not open privacy options after Off while native cleanup was pending", async () => {
    const { ads, plugin } = setup();
    await ads.enableAds();
    await ads.updatePlacement({ menu: true, sensitive: false });
    let finishRemoval!: () => void;
    plugin.removeBanner.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRemoval = resolve;
        }),
    );
    const opening = ads.privacyOptions();
    await ads.disableAds();
    finishRemoval();
    expect(await opening).toBe("off");
    expect(plugin.showPrivacyOptionsForm).not.toHaveBeenCalled();
    // A later explicit request should still open the user's privacy choices.
    expect(await ads.privacyOptions()).toBe("off");
    expect(plugin.showPrivacyOptionsForm).toHaveBeenCalledOnce();
  });

  it("does not open a consent form after Off while consent information was pending", async () => {
    const { ads, plugin } = setup();
    let finishConsent!: () => void;
    plugin.requestConsentInfo.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishConsent = () =>
            resolve({
              canRequestAds: false,
              status: AdmobConsentStatus.REQUIRED,
              isConsentFormAvailable: true,
            });
        }),
    );
    const enabling = ads.enableAds();
    await vi.waitFor(() =>
      expect(plugin.requestConsentInfo).toHaveBeenCalledOnce(),
    );
    await ads.disableAds();
    finishConsent();
    expect(await enabling).toBe("off");
    expect(plugin.showConsentForm).not.toHaveBeenCalled();
    expect(plugin.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(plugin.initialize).not.toHaveBeenCalled();
  });

  it("does not make a new consent request after Off while an already-open form was resolving", async () => {
    const { ads, plugin } = setup();
    plugin.requestConsentInfo.mockResolvedValueOnce({
      canRequestAds: false,
      status: AdmobConsentStatus.REQUIRED,
      isConsentFormAvailable: true,
    });
    let finishForm!: () => void;
    plugin.showConsentForm.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishForm = resolve;
        }),
    );
    const enabling = ads.enableAds();
    await vi.waitFor(() =>
      expect(plugin.showConsentForm).toHaveBeenCalledOnce(),
    );
    await ads.disableAds();
    finishForm();
    expect(await enabling).toBe("off");
    expect(plugin.showConsentForm).toHaveBeenCalledTimes(1);
    expect(plugin.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(plugin.initialize).not.toHaveBeenCalled();
  });

  it("does not request ATT after Off while tracking status was pending", async () => {
    const { ads, plugin } = setup(true, "ios");
    let finishStatus!: () => void;
    plugin.trackingAuthorizationStatus.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishStatus = () => resolve({ status: "notDetermined" });
        }),
    );
    const enabling = ads.enableAds({ attOptIn: true });
    await vi.waitFor(() =>
      expect(plugin.trackingAuthorizationStatus).toHaveBeenCalledOnce(),
    );
    await ads.disableAds();
    finishStatus();
    expect(await enabling).toBe("off");
    expect(plugin.requestTrackingAuthorization).not.toHaveBeenCalled();
    expect(plugin.initialize).not.toHaveBeenCalled();
  });
});
