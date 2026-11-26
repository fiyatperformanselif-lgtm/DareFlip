import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from "@capacitor-community/admob";

type AdPlugin = typeof AdMob;
export type AdState = "off" | "available" | "unavailable" | "web";
export interface AdContext {
  cardsPlayed: number;
  mode: string;
  sensitive: boolean;
  naturalBreak: boolean;
}
export interface AdUnits {
  banner: string;
  interstitial: string;
  rewarded: string;
}
export interface AdPlacement {
  menu: boolean;
  sensitive: boolean;
  naturalBreak?: boolean;
}
export const TEST_AD_UNITS: Record<"ios" | "android", AdUnits> = {
  ios: {
    banner: "ca-app-pub-3940256099942544/2934735716",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
    rewarded: "ca-app-pub-3940256099942544/1712485313",
  },
  android: {
    banner: "ca-app-pub-3940256099942544/6300978111",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
    rewarded: "ca-app-pub-3940256099942544/5224354917",
  },
};

export function interstitialEligible(
  context: AdContext,
  now: number,
  lastShown: number,
): boolean {
  return (
    context.cardsPlayed > 5 &&
    context.naturalBreak &&
    !context.sensitive &&
    context.mode !== "flirty" &&
    now - lastShown >= 120_000
  );
}

/** No ad SDK call is made when disabled, on web, before opt-in, or without UMP canRequestAds. */
export class AdsManager {
  state: AdState = "off";
  private permitted = false;
  private initialized = false;
  private busy = false;
  private generation = 0;
  private banner = false;
  private bannerListenerReady = false;
  private bannerHeight = 0;
  private bannerSizeListeners = new Set<(height: number) => void>();
  private placement: AdPlacement = {
    menu: false,
    sensitive: false,
    naturalBreak: false,
  };
  private lastShown: number;
  constructor(
    private plugin: AdPlugin,
    private platform: string,
    private units: AdUnits,
    private testing: boolean,
    private clock: () => number = Date.now,
    readonly enabled: boolean = true,
  ) {
    this.lastShown = clock();
  }
  onBannerSize(listener: (height: number) => void): () => void {
    this.bannerSizeListeners.add(listener);
    listener(this.bannerHeight);
    return () => {
      this.bannerSizeListeners.delete(listener);
    };
  }
  private publishBannerSize(height: number): void {
    this.bannerHeight =
      this.enabled && this.permitted && this.banner && Number.isFinite(height)
        ? Math.max(0, height)
        : 0;
    this.bannerSizeListeners.forEach((listener) => listener(this.bannerHeight));
  }
  private validUnits(): boolean {
    return Object.values(this.units).every((id) =>
      /^ca-app-pub-\d{16}\/\d{10}$/.test(id),
    );
  }
  async enableAds({
    attOptIn = false,
  }: { attOptIn?: boolean } = {}): Promise<AdState> {
    if (!this.enabled) return (this.state = "off");
    if (this.platform === "web") return (this.state = "web");
    if (this.busy) return this.state;
    if (!this.validUnits()) return (this.state = "unavailable");
    this.busy = true;
    const token = ++this.generation;
    try {
      await this.revokePermission();
      // A later Off/privacy action also cancels this attempt while native banner
      // cleanup is pending, before any fresh consent or advertising request.
      if (token !== this.generation) return this.state;
      let info = await this.plugin.requestConsentInfo();
      if (token !== this.generation) return this.state;
      if (
        info.status === AdmobConsentStatus.REQUIRED &&
        info.isConsentFormAvailable
      ) {
        await this.plugin.showConsentForm();
        if (token !== this.generation) return this.state;
        info = await this.plugin.requestConsentInfo();
      }
      if (token !== this.generation) return this.state;
      if (!info.canRequestAds) return (this.state = "off");
      // ATT is a separate optional permission. Declining it never prevents play.
      if (this.platform === "ios" && attOptIn) {
        const tracking = await this.plugin.trackingAuthorizationStatus();
        if (token !== this.generation) return this.state;
        if (tracking.status === "notDetermined")
          await this.plugin.requestTrackingAuthorization();
      }
      if (token !== this.generation) return this.state;
      if (!this.initialized) {
        await this.plugin.initialize({
          initializeForTesting: this.testing,
          maxAdContentRating: MaxAdContentRating.ParentalGuidance,
        });
        this.initialized = true;
      }
      if (token !== this.generation) return this.state;
      this.permitted = true;
      if (!this.bannerListenerReady) {
        await this.plugin.addListener(
          BannerAdPluginEvents.SizeChanged,
          (size) => this.publishBannerSize(size.height),
        );
        this.bannerListenerReady = true;
      }
      if (token !== this.generation) return this.state;
      this.state = "available";
      this.lastShown = this.clock();
      await this.updatePlacement(this.placement);
    } catch {
      if (token === this.generation) {
        this.permitted = false;
        this.state = "unavailable";
      }
    } finally {
      this.busy = false;
    }
    return this.state;
  }
  async disableAds(): Promise<void> {
    ++this.generation;
    await this.revokePermission();
  }
  private async revokePermission(): Promise<void> {
    this.permitted = false;
    this.state = "off";
    this.publishBannerSize(0);
    const hadBanner = this.banner;
    this.banner = false;
    if (hadBanner && this.enabled) {
      try {
        await this.plugin.removeBanner();
      } catch {
        /* An unavailable ad must never block play. */
      }
    }
  }
  async privacyOptions(): Promise<AdState> {
    if (!this.enabled) return (this.state = "off");
    if (this.platform === "web") return (this.state = "web");
    const token = ++this.generation;
    await this.revokePermission();
    if (token !== this.generation) return this.state;
    try {
      await this.plugin.showPrivacyOptionsForm();
    } catch {
      if (token === this.generation) this.state = "unavailable";
      return this.state;
    }
    // Remain opted out. User may enable ads again after changing consent.
    return this.state;
  }
  async updatePlacement(placement: AdPlacement): Promise<void> {
    this.placement = placement;
    if (!this.enabled) {
      this.banner = false;
      this.state = "off";
      this.publishBannerSize(0);
      return;
    }
    const shouldShow = this.permitted && placement.menu && !placement.sensitive;
    if (!shouldShow) {
      if (this.banner) {
        this.banner = false;
        this.publishBannerSize(0);
        try {
          await this.plugin.removeBanner();
        } catch {
          /* no-op */
        }
      }
      return;
    }
    if (this.banner) return;
    this.banner = true;
    const token = this.generation;
    try {
      await this.plugin.showBanner({
        adId: this.units.banner,
        isTesting: this.testing,
        npa: true,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
      });
      if (
        token !== this.generation ||
        !this.placement.menu ||
        this.placement.sensitive
      ) {
        this.banner = false;
        this.publishBannerSize(0);
        await this.plugin.removeBanner();
      } else this.publishBannerSize((await this.plugin.getBannerSize()).height);
    } catch {
      this.banner = false;
      this.publishBannerSize(0);
    }
  }
  async maybeInterstitial(context: AdContext): Promise<boolean> {
    if (
      !this.enabled ||
      !this.permitted ||
      this.busy ||
      this.placement.sensitive ||
      !this.placement.naturalBreak ||
      !interstitialEligible(context, this.clock(), this.lastShown)
    )
      return false;
    this.busy = true;
    const token = this.generation;
    try {
      await this.plugin.prepareInterstitial({
        adId: this.units.interstitial,
        isTesting: this.testing,
        npa: true,
      });
      if (
        !this.permitted ||
        token !== this.generation ||
        this.placement.sensitive ||
        !this.placement.naturalBreak
      )
        return false;
      this.lastShown = this.clock();
      await this.plugin.showInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      this.busy = false;
    }
  }
  async rewarded(): Promise<boolean> {
    if (
      !this.enabled ||
      !this.permitted ||
      this.busy ||
      this.placement.sensitive
    )
      return false;
    this.busy = true;
    const token = this.generation;
    try {
      await this.plugin.prepareRewardVideoAd({
        adId: this.units.rewarded,
        isTesting: this.testing,
        npa: true,
      });
      if (
        !this.permitted ||
        token !== this.generation ||
        this.placement.sensitive
      )
        return false;
      // Plugin 8.4 resolves only on an earned reward; dismissal/failure rejects.
      const reward = await this.plugin.showRewardVideoAd();
      return (
        this.permitted &&
        token === this.generation &&
        !this.placement.sensitive &&
        Number.isFinite(reward.amount) &&
        reward.amount > 0
      );
    } catch {
      return false;
    } finally {
      this.busy = false;
    }
  }
}
const platform = Capacitor.getPlatform();
export function selectAdConfig(
  platform: string,
  development: boolean,
  env: Record<string, string | undefined>,
): { units: AdUnits; testing: boolean; enabled: boolean } {
  const enabled = env.VITE_ADS_ENABLED !== "false";
  const testing = development || env.VITE_ADMOB_TESTING === "true";
  const suffix = platform === "ios" ? "IOS" : "ANDROID";
  const units = testing
    ? TEST_AD_UNITS[platform === "ios" ? "ios" : "android"]
    : {
        banner: env[`VITE_ADMOB_${suffix}_BANNER`] || "",
        interstitial: env[`VITE_ADMOB_${suffix}_INTERSTITIAL`] || "",
        rewarded: env[`VITE_ADMOB_${suffix}_REWARDED`] || "",
      };
  return { units, testing, enabled };
}
const config = selectAdConfig(platform, import.meta.env.DEV, import.meta.env);
/** Build-time ad-free switch; UI can omit ad controls without changing saved preferences. */
export const advertisingEnabled = config.enabled;
export const ads = new AdsManager(
  AdMob,
  platform,
  config.units,
  config.testing,
  undefined,
  config.enabled,
);
