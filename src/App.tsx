import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  Globe2,
  Heart,
  HelpCircle,
  LockKeyhole,
  MessageCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Users,
  Volume2,
  Vibrate,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { lookupCard, persistedCards } from "./content";
import {
  dailyCard,
  drawCard,
  eligibleCards,
  pickPlayer,
} from "./domain/engine";
import type { Card, Difficulty, Kind, Mode } from "./domain/types";
import { saveState } from "./domain/storage";
import { GENDERS, hasCompleteGenders } from "./domain/players";
import type { Gender } from "./domain/players";
import {
  detectLanguage,
  languages,
  localeInfo,
  t,
  translationAttrs,
} from "./i18n";
import type { Key, Locale } from "./i18n";
import { initialState, isPrivateSessionReady, loadAppState } from "./state";
import type { Session, State } from "./state";
import { ads, advertisingEnabled } from "./services/ads";
import { feedback } from "./services/feedback";
import { shareCard } from "./services/share";
import {
  useNativeBack,
  useAppInactive,
  exitNativeApp,
} from "./ui/useNativeBack";
import { publisher, publisherReady } from "./config/publisher";
import { LegalText } from "./ui/LegalText";
import { GameView } from "./ui/GameView";
import { TranslatedText } from "./ui/TranslatedText";

type Tab = "play" | "favorites" | "packs" | "settings";
type Overlay =
  | "daily"
  | "pause"
  | "privacy"
  | "terms"
  | "support"
  | "consent"
  | "reset"
  | null;
const modes: { id: Mode; icon: LucideIcon; label: string }[] = [
  { id: "couples", icon: Heart, label: "01" },
  { id: "party", icon: Users, label: "02" },
  { id: "flirty", icon: Flame, label: "03" },
  { id: "deep", icon: MessageCircle, label: "04" },
  { id: "crazy", icon: Zap, label: "05" },
  { id: "random", icon: Shuffle, label: "06" },
];
interface DraftPlayer {
  name: string;
  gender: Gender | null;
}
const blankPlayers = (): DraftPlayer[] => [
  { name: "", gender: null },
  { name: "", gender: null },
];
const makeSession = (
  players: string[],
  genders: Gender[],
  mode: Mode,
  difficulty: Difficulty,
): Session => ({
  players,
  genders,
  mode,
  difficulty,
  seen: [],
  player: pickPlayer(players)!,
  card: null,
  rounds: 0,
  ...(mode === "flirty" ? { privateAcknowledged: true as const } : {}),
});

export default function App() {
  const [state, setState] = useState<State>(() => loadAppState());
  const [tab, setTab] = useState<Tab>("play");
  const [screen, setScreen] = useState<"home" | "setup" | "game">("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [chosen, setChosen] = useState<Mode>("couples");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [players, setPlayers] = useState<DraftPlayer[]>(blankPlayers);
  const [resuming, setResuming] = useState(false);
  const [partnerChecks, setPartnerChecks] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const [error, setError] = useState<Key | "">("");
  const [toast, setToast] = useState<{
    key: Key;
    values?: Record<string, string | number>;
  } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(24);
  const [exhausted, setExhausted] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);
  const [adStatus, setAdStatus] = useState("");
  useEffect(
    () =>
      ads.onBannerSize((height) =>
        document.documentElement.style.setProperty(
          "--ad-height",
          `${height}px`,
        ),
      ),
    [],
  );
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinFrame = useRef<number | null>(null);
  const spinGeneration = useRef(0);
  const spinBusy = useRef(false);
  const drawBusy = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGame = screen === "game" && state.session !== null;
  const session = state.session;
  const privateReady = isPrivateSessionReady(session);
  const privateBlocked = isGame && session?.mode === "flirty" && !privateReady;
  const cardId = session?.card?.id;
  const focusedDestination = useRef("");
  const cancelTurn = useCallback(() => {
    spinGeneration.current += 1;
    if (spinTimer.current) clearTimeout(spinTimer.current);
    if (spinFrame.current !== null) cancelAnimationFrame(spinFrame.current);
    spinTimer.current = null;
    spinFrame.current = null;
    spinBusy.current = false;
    drawBusy.current = false;
    setSpinning(false);
  }, []);
  useAppInactive(cancelTurn);
  useEffect(() => {
    if (overlay || spinning) return;
    const destination = `${screen}/${tab}/${cardId ?? ""}`;
    // Closing a dialog restores its trigger; only navigation or a new card
    // should move focus to the main content.
    if (focusedDestination.current === destination) return;
    const target = document.querySelector<HTMLElement>(
      isGame && cardId ? ".card-prompt" : ".main h1",
    );
    if (!target) return;
    focusedDestination.current = destination;
    const delay =
      isGame &&
      cardId &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 550
        : 0;
    const timer = setTimeout(() => {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }, delay);
    return () => clearTimeout(timer);
  }, [screen, tab, isGame, cardId, overlay, spinning]);
  useNativeBack(() => {
    cancelTurn();
    if (overlay) setOverlay(null);
    else if (isGame) setOverlay("pause");
    else if (screen === "setup") setScreen("home");
    else if (tab !== "play") setTab("play");
    else exitNativeApp();
  });
  const tr = (key: Key, vars?: Record<string, string | number>) =>
    t(state.locale, key, vars);
  const notify = (key: Key, values?: Record<string, string | number>) => {
    setToast({ key, values });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };
  const feel = (kind: "tap" | "flip" | "success" = "tap") => {
    void feedback(kind, { sound: state.sound, haptics: state.haptics });
  };
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 850);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const saved = saveState(state);
    const timer = setTimeout(() => setStorageProblem(!saved), 0);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => {
    const info = localeInfo(state.locale);
    document.documentElement.lang = state.locale;
    document.documentElement.dir = info.dir;
  }, [state.locale]);
  useEffect(() => {
    const sensitive =
      (isGame &&
        (session?.mode === "flirty" ||
          session?.mode === "random" ||
          !!session?.card?.sensitive)) ||
      (screen === "setup" && (chosen === "flirty" || chosen === "random")) ||
      (tab === "favorites" &&
        persistedCards.some(
          (c) => c.sensitive && state.favorites.includes(c.id),
        ));
    void ads
      .updatePlacement({
        menu: !isGame && screen !== "setup" && overlay === null,
        sensitive: !!sensitive,
        naturalBreak: overlay === "pause",
      })
      .then(() => {
        if (overlay === "pause" && session)
          void ads.maybeInterstitial({
            cardsPlayed: session.rounds,
            mode: session.mode,
            sensitive: !!sensitive,
            naturalBreak: true,
          });
      });
  }, [isGame, screen, chosen, tab, overlay, session, state.favorites]);
  useEffect(
    () => () => {
      spinGeneration.current += 1;
      if (spinTimer.current) clearTimeout(spinTimer.current);
      if (spinFrame.current !== null) cancelAnimationFrame(spinFrame.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!overlay) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".modal");
    const background = [
      ...document.querySelectorAll<HTMLElement>(".topbar,.main,.bottom-nav"),
    ];
    background.forEach((el) => {
      el.inert = true;
    });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOverlay(null);
      }
      if (event.key === "Tab" && dialog) {
        const focusable = [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ].filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      background.forEach((el) => {
        el.inert = false;
      });
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [overlay]);
  const update = (patch: Partial<State>) =>
    setState((s) => ({ ...s, ...patch }));
  const goTab = (next: Tab) => {
    cancelTurn();
    feel();
    setTab(next);
    setScreen("home");
    setError("");
  };
  const selectMode = (mode: Mode) => {
    cancelTurn();
    feel();
    setChosen(mode);
    setDifficulty(session?.difficulty ?? "easy");
    setPlayers(
      session && (mode !== "flirty" || session.players.length === 2)
        ? session.players.map((name, index) => ({
            name,
            gender: session.genders[index],
          }))
        : blankPlayers(),
    );
    setResuming(false);
    setPartnerChecks([false, false]);
    setScreen("setup");
    setError("");
  };
  const resumeGame = () => {
    if (!session) return;
    cancelTurn();
    feel();
    setError("");
    setExhausted(null);
    if (
      (session.mode === "flirty" && session.players.length !== 2) ||
      (hasCompleteGenders(session.genders) &&
        (session.mode !== "flirty" || isPrivateSessionReady(session)))
    ) {
      setScreen("game");
      return;
    }
    setChosen(session.mode);
    setDifficulty(session.difficulty);
    setPlayers(
      session.players.map((name, index) => ({
        name,
        gender: session.genders[index],
      })),
    );
    setPartnerChecks([false, false]);
    setResuming(true);
    setScreen("setup");
  };
  const begin = () => {
    cancelTurn();
    const names = players.map((player) => player.name.trim());
    if (names.length < 2 || names.some((n) => !n)) {
      setError("setup.minPlayers");
      return;
    }
    if (chosen === "flirty" && names.length !== 2) {
      setError("setup.privatePlayersRequired");
      return;
    }
    if (
      new Set(names.map((n) => n.toLocaleLowerCase())).size !== names.length
    ) {
      setError("setup.uniqueNames");
      return;
    }
    const genders = players.map((player) => player.gender);
    if (!hasCompleteGenders(genders)) {
      setError("setup.genderRequired");
      const missing = genders.findIndex((gender) => gender === null);
      document.getElementById(`player-gender-${missing}`)?.focus();
      return;
    }
    if (chosen === "flirty" && !partnerChecks.every(Boolean)) {
      setError("setup.partnerConsentRequired");
      return;
    }
    feel("success");
    update({
      session:
        resuming && session
          ? {
              ...session,
              genders,
              ...(chosen === "flirty"
                ? { privateAcknowledged: true as const }
                : {}),
            }
          : makeSession(names, genders, chosen, difficulty),
      ageConfirmed: state.ageConfirmed || chosen === "flirty",
    });
    setScreen("game");
    setResuming(false);
    setExhausted(null);
  };
  const nextTurn = () => {
    if (!session || spinBusy.current || overlay) return;
    const sourceSession = session;
    const winner = pickPlayer(session.players, session.player)!;
    const targetIndex = session.players.indexOf(winner);
    const targetAngle =
      (360 - (360 / session.players.length) * targetIndex) % 360;
    const generation = ++spinGeneration.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    spinBusy.current = true;
    feel();
    setSpinning(true);
    setExhausted(null);
    const settle = () => {
      if (generation !== spinGeneration.current) return;
      spinTimer.current = null;
      spinFrame.current = null;
      spinBusy.current = false;
      drawBusy.current = false;
      setState((s) =>
        s.session === sourceSession
          ? {
              ...s,
              session: {
                ...s.session,
                player: winner,
                card: null,
              },
            }
          : s,
      );
      setSpinning(false);
      feel("success");
    };
    // A mounted, initially visible frame gives the bottle a real start pose.
    // The saved card is retained until settle, so interruption preserves resume.
    spinFrame.current = requestAnimationFrame(() => {
      if (generation !== spinGeneration.current) return;
      spinFrame.current = requestAnimationFrame(() => {
        if (generation !== spinGeneration.current) return;
        setSpinAngle(
          (angle) => angle + 1440 + ((targetAngle - (angle % 360) + 360) % 360),
        );
        if (reducedMotion) settle();
        else spinTimer.current = setTimeout(settle, 1120);
      });
    });
  };
  const draw = (type: "truth" | "dare") => {
    if (!session || session.card || spinBusy.current || drawBusy.current)
      return;
    if (session.mode === "flirty" && !isPrivateSessionReady(session)) return;
    const result = drawCard({
      mode: session.mode,
      difficulty: session.difficulty,
      type,
      language: state.locale,
      seen: session.seen,
      privateSession: isPrivateSessionReady(session),
      unlockedPacks: state.unlocked ? ["core", "afterglow"] : ["core"],
    });
    if (!result.card) {
      setExhausted(type);
      return;
    }
    drawBusy.current = true;
    feel("flip");
    update({
      session: {
        ...session,
        card: result.card,
        seen: [...session.seen, result.card.id],
        rounds: session.rounds + 1,
      },
    });
    setExhausted(null);
  };
  const pool = (type: Kind) =>
    session
      ? eligibleCards({
          mode: session.mode,
          difficulty: session.difficulty,
          type,
          language: state.locale,
          seen: session.seen,
          privateSession: privateReady,
          unlockedPacks: state.unlocked ? ["core", "afterglow"] : ["core"],
        })
      : [];
  const remaining = {
    truth: pool("truth").filter((card) => !session?.seen.includes(card.id))
      .length,
    dare: pool("dare").filter((card) => !session?.seen.includes(card.id))
      .length,
  };
  const changeDifficulty = (value: Difficulty) => {
    if (!session || value === session.difficulty) return;
    cancelTurn();
    update({ session: { ...session, difficulty: value, card: null } });
    setDifficulty(value);
    setExhausted(null);
    setOverlay(null);
    feel();
    notify("game.difficultyChanged");
  };
  const restartDeck = () => {
    if (!session) return;
    const resetIds = new Set(
      [...pool("truth"), ...pool("dare")].map((card) => card.id),
    );
    update({
      session: {
        ...session,
        seen: session.seen.filter((id) => !resetIds.has(id)),
      },
    });
    setExhausted(null);
    feel();
  };
  const resolveCard = (id: string) => lookupCard(id, state.locale);
  const toggleFavorite = (id: string) => {
    feel();
    const saved = state.favorites.includes(id);
    update({
      favorites: saved
        ? state.favorites.filter((x) => x !== id)
        : [...state.favorites, id],
    });
    notify(saved ? "game.unsaved" : "game.saved");
  };
  const share = async (card: Card) => {
    try {
      const result = await shareCard({
        text: card.text,
        type: card.type,
        language: card.language,
        category: card.category,
        difficulty: card.difficulty,
        title: "DareFlip",
      });
      if (result === "downloaded") notify("game.download");
    } catch {
      notify("game.shareUnavailable");
    }
  };
  const daily = dailyCard(state.locale);
  const pause = () => {
    cancelTurn();
    feel();
    setOverlay("pause");
  };
  const enableAds = async () => {
    setBusy(true);
    try {
      const status = await ads.enableAds({ attOptIn: false });
      setAdStatus(status);
      notify(
        status === "web"
          ? "consent.noAdsWeb"
          : status === "available"
            ? "common.done"
            : "consent.unavailable",
      );
    } catch {
      notify("consent.unavailable");
    } finally {
      setBusy(false);
    }
  };
  const claimPack = async () => {
    setBusy(true);
    try {
      const rewarded = await ads.rewarded();
      if (rewarded) {
        update({ unlocked: true });
        notify("packs.rewarded");
      } else notify("packs.unavailable");
    } catch {
      notify("packs.unavailable");
    } finally {
      setBusy(false);
    }
  };
  const fallback = (card: Card) =>
    state.locale !== card.language ? (
      <p
        className="fallback"
        {...translationAttrs(state.locale, "settings.contentFallback")}
      >
        <Globe2 size={13} />
        {tr("settings.contentFallback")}
      </p>
    ) : null;
  const cardActions = (card: Card) => (
    <div className="card-actions">
      <button
        className={
          state.favorites.includes(card.id)
            ? "icon-button saved"
            : "icon-button"
        }
        aria-label={tr(
          state.favorites.includes(card.id)
            ? "game.unfavorite"
            : "game.favorite",
        )}
        onClick={() => toggleFavorite(card.id)}
      >
        <Heart
          size={21}
          fill={state.favorites.includes(card.id) ? "currentColor" : "none"}
        />
      </button>
      <button
        className="icon-button"
        aria-label={tr("game.share")}
        onClick={() => void share(card)}
      >
        <Share2 size={20} />
      </button>
    </div>
  );
  const headerTitle =
    screen === "setup"
      ? tr(`mode.${chosen}`)
      : isGame
        ? tr(`mode.${session!.mode}`)
        : "DareFlip";
  return (
    <div
      className={`app ${isGame ? "game-active" : ""} ${adStatus === "available" ? "ads-enabled" : ""}`}
    >
      {!ready && (
        <div className="splash" aria-label="DareFlip">
          <img src="/icon.svg" alt="" />
          <strong>
            DareFlip<span>✦</span>
          </strong>
          <p {...translationAttrs(state.locale, "brand.slogan")}>
            {tr("brand.slogan")}
          </p>
        </div>
      )}
      <header className="topbar">
        <div className="brand-wrap">
          {screen !== "home" ? (
            <button
              className="icon-button back"
              aria-label={tr("common.back")}
              onClick={() => {
                if (isGame) pause();
                else setScreen("home");
              }}
            >
              <ChevronLeft />
            </button>
          ) : (
            <img className="brand-icon" src="/icon.svg" alt="" />
          )}
          <span className="wordmark">
            {headerTitle}
            {screen === "home" && <span className="brand-star">✦</span>}
          </span>
        </div>
        <div className="top-actions">
          {isGame ? (
            <button
              className="icon-button"
              aria-label={tr("game.pause")}
              onClick={pause}
            >
              <Pause size={20} />
            </button>
          ) : (
            <>
              <span className="offline-dot" title={tr("home.offline")}></span>
              <button
                className="language-button"
                onClick={() => goTab("settings")}
                aria-label={`${state.locale.toUpperCase()} · ${tr("settings.language")}`}
              >
                <Globe2 size={16} />
                <span>{state.locale.toUpperCase()}</span>
              </button>
              <button
                className="avatar"
                aria-label={tr("nav.settings")}
                onClick={() => goTab("settings")}
              >
                <Sparkles size={18} />
              </button>
            </>
          )}
        </div>
      </header>
      {storageProblem && (
        <div
          className="storage-notice"
          role="status"
          {...translationAttrs(state.locale, "common.storageUnavailable")}
        >
          <ShieldCheck size={16} />
          {tr("common.storageUnavailable")}
        </div>
      )}
      <main className={`main ${isGame ? "game-main" : ""}`}>
        {screen === "home" && tab === "play" && (
          <div className="home-grid page-enter">
            <section className="welcome">
              <p
                className="eyebrow"
                {...translationAttrs(state.locale, "home.eyebrow")}
              >
                <span /> {tr("home.eyebrow")}
              </p>
              <h1>
                {tr("home.title")
                  .split("\n")
                  .map((line, i) => (
                    <span key={line} className={i === 1 ? "gradient-text" : ""}>
                      {line}
                    </span>
                  ))}
              </h1>
              <p
                className="subtitle"
                {...translationAttrs(state.locale, "home.subtitle")}
              >
                {tr("home.subtitle")}
              </p>
            </section>
            <section className="hero-banner" aria-label={tr("brand.slogan")}>
              <div className="hero-copy">
                <div
                  className="pill"
                  {...translationAttrs(state.locale, "home.heroLabel")}
                >
                  <Sparkles size={12} />
                  {tr("home.heroLabel")}
                </div>
                <h2>
                  {tr("home.heroLine1Start")}{" "}
                  <em
                    {...translationAttrs(
                      state.locale,
                      "home.heroLine1Emphasis",
                    )}
                  >
                    {tr("home.heroLine1Emphasis")}
                  </em>
                  <br />
                  {tr("home.heroLine2Start")}{" "}
                  <em
                    {...translationAttrs(
                      state.locale,
                      "home.heroLine2Emphasis",
                    )}
                  >
                    {tr("home.heroLine2Emphasis")}
                  </em>
                </h2>
                <p {...translationAttrs(state.locale, "brand.slogan")}>
                  {tr("brand.slogan")}
                </p>
                <button
                  className="hero-play"
                  onClick={() => selectMode("party")}
                  {...translationAttrs(state.locale, "home.play")}
                >
                  {tr("home.play")}
                  <ArrowRight size={18} />
                </button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <span className="art-star star-one">✦</span>
                <span className="art-star star-two">✦</span>
                <div className="art-card truth-art">
                  <span {...translationAttrs(state.locale, "game.truth")}>
                    {tr("game.truth")}
                  </span>
                  <Heart fill="currentColor" />
                  <small
                    {...translationAttrs(state.locale, "home.heroTruthHint")}
                  >
                    {tr("home.heroTruthHint")}
                  </small>
                </div>
                <div className="art-card dare-art">
                  <span {...translationAttrs(state.locale, "game.dare")}>
                    {tr("game.dare")}
                  </span>
                  <Zap fill="currentColor" />
                  <small
                    {...translationAttrs(state.locale, "home.heroDareHint")}
                  >
                    {tr("home.heroDareHint")}
                  </small>
                </div>
                <span className="mini-spark">✧</span>
              </div>
            </section>
            <section className="mode-section">
              <div className="section-heading">
                <h2 {...translationAttrs(state.locale, "home.chooseMode")}>
                  {tr("home.chooseMode")}
                  <span>✦</span>
                </h2>
                <span
                  className="mode-total"
                  {...translationAttrs(state.locale, "home.modeCount")}
                >
                  {tr("home.modeCount", { number: "06" })}
                </span>
              </div>
              <div className="mode-grid">
                {modes.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    className={`mode-tile mode-${id}`}
                    onClick={() => selectMode(id)}
                  >
                    <div className="mode-art">
                      <div className="mode-symbol">
                        <Icon
                          size={31}
                          strokeWidth={1.65}
                          fill={
                            id === "couples" || id === "flirty"
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </div>
                      <span className="tile-number" aria-hidden="true">
                        {label}
                      </span>
                      <span className="tile-spark" aria-hidden="true">
                        ✦
                      </span>
                    </div>
                    <div className="mode-info">
                      <h3 {...translationAttrs(state.locale, `mode.${id}`)}>
                        {tr(`mode.${id}`)}
                      </h3>
                      <p
                        {...translationAttrs(
                          state.locale,
                          `mode.${id}.description`,
                        )}
                      >
                        {tr(`mode.${id}.description`)}
                      </p>
                    </div>
                    <ArrowRight className="tile-arrow" size={17} />
                  </button>
                ))}
              </div>
            </section>
            <aside className="home-aside">
              {session && (
                <button className="resume-banner" onClick={resumeGame}>
                  <div className="resume-icon">
                    <Play size={20} fill="currentColor" />
                  </div>
                  <span>
                    <strong {...translationAttrs(state.locale, "home.resume")}>
                      {tr("home.resume")}
                    </strong>
                    <small
                      {...translationAttrs(
                        state.locale,
                        `mode.${session.mode}`,
                      )}
                    >
                      {tr(`mode.${session.mode}`)} · {session.players.length}{" "}
                      {tr("setup.players").toLocaleLowerCase()}
                    </small>
                  </span>
                  <ChevronRight size={19} />
                </button>
              )}
              <button
                className="daily-tile"
                onClick={() => {
                  feel("flip");
                  setOverlay("daily");
                }}
              >
                <div className="daily-top">
                  <span className="daily-icon">
                    <Sparkles size={18} />
                  </span>
                  <span {...translationAttrs(state.locale, "home.daily")}>
                    {tr("home.daily")}
                  </span>
                  <span
                    className="daily-tag"
                    {...translationAttrs(state.locale, "home.dailyTag")}
                  >
                    {tr("home.dailyTag")}
                  </span>
                </div>
                <p lang={daily?.language} dir="auto">
                  {daily?.text}
                </p>
                {daily && fallback(daily)}
                <div className="daily-bottom">
                  <span {...translationAttrs(state.locale, "home.dailyHint")}>
                    {tr("home.dailyHint")}
                  </span>
                  <ArrowRight size={19} />
                </div>
              </button>
              <div className="comfort">
                <ShieldCheck size={19} />
                <p {...translationAttrs(state.locale, "setup.rule")}>
                  {tr("setup.rule")}
                </p>
              </div>
              <p
                className="offline-caption"
                {...translationAttrs(state.locale, "home.offline")}
              >
                <span className="offline-dot" />
                {tr("home.offline")}
              </p>
            </aside>
          </div>
        )}
        {screen === "setup" && (
          <section className="setup-screen page-enter">
            <div className={`setup-mode mode-${chosen}`}>
              <span className="mode-symbol">
                {(() => {
                  const Icon = modes.find((m) => m.id === chosen)!.icon;
                  return <Icon size={34} />;
                })()}
              </span>
              <div>
                <span
                  className="eyebrow"
                  {...translationAttrs(state.locale, `mode.${chosen}`)}
                >
                  {tr(`mode.${chosen}`)}
                </span>
                <p
                  {...translationAttrs(
                    state.locale,
                    `mode.${chosen}.description`,
                  )}
                >
                  {tr(`mode.${chosen}.description`)}
                </p>
              </div>
            </div>
            <h1 {...translationAttrs(state.locale, "setup.title")}>
              {tr("setup.title")}
            </h1>
            <p
              className="subtitle"
              {...translationAttrs(
                state.locale,
                resuming && !hasCompleteGenders(session?.genders ?? [])
                  ? "setup.completeGenders"
                  : chosen === "flirty"
                    ? "setup.privateSubtitle"
                    : "setup.subtitle",
              )}
            >
              {tr(
                resuming && !hasCompleteGenders(session?.genders ?? [])
                  ? "setup.completeGenders"
                  : chosen === "flirty"
                    ? "setup.privateSubtitle"
                    : "setup.subtitle",
              )}
            </p>
            {chosen === "flirty" && (
              <p
                className="private-guidance"
                id="private-setup-guide"
                {...translationAttrs(state.locale, "setup.privateHowTo")}
              >
                <TranslatedText
                  locale={state.locale}
                  translationKey="setup.privateHowTo"
                />
              </p>
            )}
            <div className="player-heading">
              <h2 {...translationAttrs(state.locale, "setup.players")}>
                {tr("setup.players")}
              </h2>
              <span>
                {players.length}/{chosen === "flirty" ? 2 : 20}
              </span>
            </div>
            <div className="players">
              {players.map((player, i) => (
                <div className="player-entry" key={i}>
                  <div className="player-input">
                    <span className="player-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <input
                      aria-label={`${tr("setup.playerName")} ${i + 1}`}
                      placeholder={tr("setup.playerPlaceholder", {
                        number: i + 1,
                      })}
                      value={player.name}
                      readOnly={resuming}
                      maxLength={24}
                      onChange={(e) => {
                        setPlayers((p) =>
                          p.map((entry, j) =>
                            j === i
                              ? { ...entry, name: e.target.value }
                              : entry,
                          ),
                        );
                        if (chosen === "flirty")
                          setPartnerChecks([false, false]);
                      }}
                    />
                    {!resuming && players.length > 2 && (
                      <button
                        className="icon-button"
                        aria-label={`${tr("setup.remove")} ${i + 1}`}
                        onClick={() =>
                          setPlayers((p) => p.filter((_, j) => j !== i))
                        }
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>
                  <label
                    className="player-gender"
                    htmlFor={`player-gender-${i}`}
                  >
                    <span {...translationAttrs(state.locale, "setup.gender")}>
                      {tr("setup.gender")}
                    </span>
                    <select
                      id={`player-gender-${i}`}
                      aria-label={`${tr("setup.gender")} ${i + 1}`}
                      aria-invalid={
                        error === tr("setup.genderRequired") &&
                        player.gender === null
                      }
                      value={player.gender ?? ""}
                      required
                      onChange={(event) =>
                        setPlayers((entries) =>
                          entries.map((entry, index) =>
                            index === i
                              ? {
                                  ...entry,
                                  gender: event.target.value as Gender,
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option
                        value=""
                        disabled
                        {...translationAttrs(
                          state.locale,
                          "setup.genderPlaceholder",
                        )}
                      >
                        {tr("setup.genderPlaceholder")}
                      </option>
                      {GENDERS.map((gender) => (
                        <option
                          value={gender}
                          key={gender}
                          {...translationAttrs(
                            state.locale,
                            `gender.${gender}`,
                          )}
                        >
                          {tr(`gender.${gender}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>
            {!resuming && chosen !== "flirty" && (
              <button
                className="add-player"
                disabled={players.length >= 20}
                onClick={() => {
                  feel();
                  setPlayers((p) => [...p, { name: "", gender: null }]);
                }}
                {...translationAttrs(state.locale, "setup.add")}
              >
                <Plus size={17} />
                {tr("setup.add")}
              </button>
            )}
            <h2
              className="energy-heading"
              {...translationAttrs(state.locale, "setup.difficulty")}
            >
              {tr("setup.difficulty")}
            </h2>
            <div className="difficulty">
              {(["easy", "medium", "bold"] as const).map((d, i) => (
                <button
                  aria-pressed={difficulty === d}
                  disabled={resuming}
                  className={difficulty === d ? "selected" : ""}
                  onClick={() => {
                    feel();
                    setDifficulty(d);
                  }}
                  key={d}
                  {...translationAttrs(state.locale, `setup.${d}`)}
                >
                  <span>{["✧", "✦", "ϟ"][i]}</span>
                  {tr(`setup.${d}`)}
                </button>
              ))}
            </div>
            {chosen === "flirty" && (
              <div
                className="partner-checks"
                role="group"
                aria-label={tr("mode.flirty")}
                aria-describedby="private-setup-guide"
              >
                {([0, 1] as const).map((index) => (
                  <label className="age-check" key={index}>
                    <input
                      type="checkbox"
                      checked={partnerChecks[index]}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setPartnerChecks((checks) =>
                          index === 0
                            ? [checked, checks[1]]
                            : [checks[0], checked],
                        );
                      }}
                    />
                    <span
                      {...translationAttrs(
                        state.locale,
                        "setup.partnerConfirm",
                      )}
                    >
                      <TranslatedText
                        locale={state.locale}
                        translationKey="setup.partnerConfirm"
                        values={{
                          name:
                            players[index]?.name.trim() ||
                            tr("setup.playerPlaceholder", {
                              number: index + 1,
                            }),
                        }}
                      />
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="comfort">
              <ShieldCheck size={20} />
              <p
                {...translationAttrs(
                  state.locale,
                  chosen === "flirty" ? "setup.privateRule" : "setup.rule",
                )}
              >
                {tr(chosen === "flirty" ? "setup.privateRule" : "setup.rule")}
              </p>
            </div>
            {error && (
              <p
                role="alert"
                className="error"
                {...translationAttrs(state.locale, error)}
              >
                <TranslatedText locale={state.locale} translationKey={error} />
              </p>
            )}
            <button
              className="primary wide"
              onClick={begin}
              {...translationAttrs(
                state.locale,
                resuming ? "game.resume" : "setup.start",
              )}
            >
              {tr(resuming ? "game.resume" : "setup.start")}
              <ArrowRight size={19} />
            </button>
          </section>
        )}
        {isGame && session && (
          <GameView
            locale={state.locale}
            session={session}
            spinning={spinning}
            spinAngle={spinAngle}
            exhausted={exhausted}
            privateReady={privateReady}
            privateBlocked={!!privateBlocked}
            remaining={remaining}
            onSpin={nextTurn}
            onDraw={draw}
            onSkip={() => {
              nextTurn();
              notify("game.skipNotice");
            }}
            onDifficulty={changeDifficulty}
            onRestart={restartDeck}
            onNewPrivate={() => selectMode("flirty")}
            renderActions={cardActions}
            renderFallback={fallback}
          />
        )}
        {screen === "home" && tab === "favorites" && (
          <section className="collection page-enter">
            <p
              className="eyebrow"
              {...translationAttrs(state.locale, "nav.favorites")}
            >
              <Heart size={14} /> {tr("nav.favorites")}
            </p>
            <h1 {...translationAttrs(state.locale, "favorites.title")}>
              {tr("favorites.title")}
            </h1>
            <p
              className="subtitle"
              {...translationAttrs(state.locale, "favorites.subtitle")}
            >
              {tr("favorites.subtitle")}
            </p>
            {state.favorites.length === 0 ? (
              <div className="empty-state">
                <div className="empty-cards">
                  <Heart size={44} />
                </div>
                <h2 {...translationAttrs(state.locale, "favorites.empty")}>
                  {tr("favorites.empty")}
                </h2>
                <p {...translationAttrs(state.locale, "favorites.emptyHint")}>
                  {tr("favorites.emptyHint")}
                </p>
                <button
                  className="primary"
                  onClick={() => goTab("play")}
                  {...translationAttrs(state.locale, "favorites.play")}
                >
                  {tr("favorites.play")}
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="saved-grid">
                {state.favorites.map((id) => {
                  const card = resolveCard(id);
                  return card ? (
                    <article
                      className={`saved-card ${card.type}-card`}
                      key={id}
                    >
                      <span className="eyebrow">
                        {tr(`game.${card.type}`)} ·{" "}
                        {tr(`mode.${card.category}`)}
                      </span>
                      <p lang={card.language} dir="auto">
                        {card.text}
                      </p>
                      {fallback(card)}
                      {cardActions(card)}
                    </article>
                  ) : null;
                })}
              </div>
            )}
          </section>
        )}
        {screen === "home" && tab === "packs" && (
          <section className="packs-screen page-enter">
            <p
              className="eyebrow"
              {...translationAttrs(state.locale, "nav.packs")}
            >
              <Gift size={14} />
              {tr("nav.packs")}
            </p>
            <h1 {...translationAttrs(state.locale, "packs.title")}>
              {tr("packs.title")}
            </h1>
            <p
              className="subtitle"
              {...translationAttrs(state.locale, "packs.subtitle")}
            >
              {tr("packs.subtitle")}
            </p>
            <div className="pack-grid">
              <article className="pack-card core-pack">
                <div className="pack-art">
                  <img src="/icon.svg" alt="" />
                  <span {...translationAttrs(state.locale, "packs.coreArt")}>
                    {tr("packs.coreArt")}
                  </span>
                </div>
                <div className="pack-body">
                  <div
                    className="pill"
                    {...translationAttrs(state.locale, "packs.included")}
                  >
                    <Check size={13} />
                    {tr("packs.included")}
                  </div>
                  <h2 {...translationAttrs(state.locale, "packs.core")}>
                    {tr("packs.core")}
                  </h2>
                  <p
                    {...translationAttrs(state.locale, "packs.coreDescription")}
                  >
                    {tr("packs.coreDescription")}
                  </p>
                  <button
                    className="secondary wide"
                    onClick={() => goTab("play")}
                    {...translationAttrs(state.locale, "home.play")}
                  >
                    {tr("home.play")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </article>
              {(advertisingEnabled || state.unlocked) && (
                <article className="pack-card afterglow-pack">
                  <div className="pack-art">
                    <span className="afterglow-orb">✦</span>
                    <span
                      {...translationAttrs(state.locale, "packs.afterglow")}
                    >
                      {tr("packs.afterglow")}
                    </span>
                  </div>
                  <div className="pack-body">
                    <div
                      className="pill"
                      {...translationAttrs(
                        state.locale,
                        state.unlocked ? "packs.unlocked" : "common.optional",
                      )}
                    >
                      {state.unlocked ? (
                        <Check size={13} />
                      ) : (
                        <LockKeyhole size={13} />
                      )}{" "}
                      {tr(
                        state.unlocked ? "packs.unlocked" : "common.optional",
                      )}
                    </div>
                    <h2 {...translationAttrs(state.locale, "packs.afterglow")}>
                      {tr("packs.afterglow")}
                    </h2>
                    <p
                      {...translationAttrs(
                        state.locale,
                        "packs.afterglowDescription",
                      )}
                    >
                      {tr("packs.afterglowDescription")}
                    </p>
                    <button
                      className="primary wide"
                      disabled={busy}
                      onClick={() =>
                        state.unlocked ? goTab("play") : void claimPack()
                      }
                    >
                      {state.unlocked
                        ? tr("home.play")
                        : busy
                          ? tr("packs.loading")
                          : tr("packs.unlock")}
                      {!state.unlocked && <Play size={16} />}
                    </button>
                    <p
                      className="fine-print"
                      {...translationAttrs(
                        state.locale,
                        advertisingEnabled
                          ? "packs.rewardExplain"
                          : "packs.adFree",
                      )}
                    >
                      {tr(
                        advertisingEnabled
                          ? "packs.rewardExplain"
                          : "packs.adFree",
                      )}
                    </p>
                  </div>
                </article>
              )}
            </div>
            <div className="comfort">
              <ShieldCheck size={20} />
              <p
                {...translationAttrs(
                  state.locale,
                  !advertisingEnabled
                    ? "packs.adFree"
                    : Capacitor.isNativePlatform()
                      ? "packs.rewardExplain"
                      : "consent.noAdsWeb",
                )}
              >
                {tr(
                  !advertisingEnabled
                    ? "packs.adFree"
                    : Capacitor.isNativePlatform()
                      ? "packs.rewardExplain"
                      : "consent.noAdsWeb",
                )}
              </p>
            </div>
            {advertisingEnabled && (
              <button
                className="text-link"
                onClick={() => setOverlay("consent")}
                {...translationAttrs(state.locale, "settings.adPrivacy")}
              >
                {tr("settings.adPrivacy")}
                <ChevronRight size={15} />
              </button>
            )}
          </section>
        )}
        {screen === "home" && tab === "settings" && (
          <section className="settings-screen page-enter">
            <p
              className="eyebrow"
              {...translationAttrs(state.locale, "nav.settings")}
            >
              <Settings2 size={14} />
              {tr("nav.settings")}
            </p>
            <h1 {...translationAttrs(state.locale, "settings.title")}>
              {tr("settings.title")}
            </h1>
            <div className="settings-group">
              <label className="settings-row language-row">
                <span {...translationAttrs(state.locale, "settings.language")}>
                  <Globe2 size={20} />
                  {tr("settings.language")}
                </span>
                <select
                  aria-label={tr("settings.language")}
                  value={state.locale}
                  onChange={(e) => {
                    update({ locale: e.target.value as Locale });
                    feel();
                  }}
                >
                  {languages.map((l) => (
                    <option value={l.code} key={l.code}>
                      {l.nativeName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="settings-row subtle-row"
                onClick={() => update({ locale: detectLanguage() })}
                {...translationAttrs(state.locale, "settings.deviceLanguage")}
              >
                {tr("settings.deviceLanguage")}
                <ChevronRight size={16} />
              </button>
              <div className="translation-note">
                <Globe2 size={15} />
                <div>
                  {!localeInfo(state.locale).uiComplete && (
                    <p
                      {...translationAttrs(state.locale, "settings.partialUi")}
                    >
                      {tr("settings.partialUi")}
                    </p>
                  )}
                  {localeInfo(state.locale).contentStatus !== "available" && (
                    <p
                      {...translationAttrs(
                        state.locale,
                        localeInfo(state.locale).contentStatus === "partial"
                          ? "settings.partialCards"
                          : "settings.englishCards",
                      )}
                    >
                      {tr(
                        localeInfo(state.locale).contentStatus === "partial"
                          ? "settings.partialCards"
                          : "settings.englishCards",
                      )}
                    </p>
                  )}
                  <p
                    {...translationAttrs(
                      state.locale,
                      "settings.translationStatus",
                    )}
                  >
                    {tr("settings.translationStatus")}:{" "}
                    {localeInfo(state.locale).uiComplete
                      ? tr("settings.completeUi")
                      : tr("common.partial")}
                  </p>
                </div>
              </div>
            </div>
            <div className="settings-group">
              {(
                [
                  { key: "sound", icon: Volume2 },
                  { key: "haptics", icon: Vibrate },
                ] as const
              ).map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  className="settings-row"
                  role="switch"
                  aria-checked={state[key]}
                  onClick={() => {
                    update({ [key]: !state[key] });
                    feel();
                  }}
                >
                  <span {...translationAttrs(state.locale, `settings.${key}`)}>
                    <Icon size={20} />
                    {tr(`settings.${key}`)}
                  </span>
                  <span className={`toggle ${state[key] ? "on" : ""}`}>
                    <span />
                  </span>
                </button>
              ))}
            </div>
            <div className="settings-group">
              {(
                [
                  { key: "privacy", icon: ShieldCheck },
                  { key: "terms", icon: Bookmark },
                  { key: "support", icon: HelpCircle },
                  { key: "consent", icon: Settings2 },
                ] as const
              )
                .filter(({ key }) => advertisingEnabled || key !== "consent")
                .map(({ key, icon: Icon }) => (
                  <button
                    className="settings-row"
                    key={key}
                    onClick={() => setOverlay(key)}
                  >
                    <span
                      {...translationAttrs(
                        state.locale,
                        key === "consent"
                          ? "settings.adPrivacy"
                          : `settings.${key}`,
                      )}
                    >
                      <Icon size={20} />
                      {tr(
                        key === "consent"
                          ? "settings.adPrivacy"
                          : `settings.${key}`,
                      )}
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
            </div>
            <div className="local-note">
              <ShieldCheck size={20} />
              <p {...translationAttrs(state.locale, "settings.offline")}>
                {tr("settings.offline")}
                <br />
                <span
                  {...translationAttrs(
                    state.locale,
                    "settings.localDataNotice",
                  )}
                >
                  {tr("settings.localDataNotice")}
                </span>
              </p>
            </div>
            <button
              className="danger-text"
              onClick={() => setOverlay("reset")}
              {...translationAttrs(state.locale, "settings.reset")}
            >
              {tr("settings.reset")}
            </button>
            <div className="settings-footer">
              <img src="/icon.svg" alt="" />
              <strong>DareFlip</strong>
              <span {...translationAttrs(state.locale, "settings.version")}>
                {tr("settings.version", { version: "0.1.0" })}
              </span>
              <small {...translationAttrs(state.locale, "brand.slogan")}>
                {tr("brand.slogan")}
              </small>
            </div>
          </section>
        )}
      </main>
      {!isGame && screen !== "setup" && (
        <nav className="bottom-nav" aria-label={tr("nav.main")}>
          {(
            [
              { id: "play", icon: Play },
              { id: "favorites", icon: Heart },
              { id: "packs", icon: Gift },
              { id: "settings", icon: Settings2 },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => goTab(id)}
            >
              <span>
                <Icon
                  size={21}
                  fill={id === "play" && tab === id ? "currentColor" : "none"}
                />
              </span>
              <small {...translationAttrs(state.locale, `nav.${id}`)}>
                {tr(`nav.${id}`)}
              </small>
              {tab === id && <i />}
            </button>
          ))}
        </nav>
      )}
      {overlay && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOverlay(null);
          }}
        >
          <section
            className={`modal ${overlay === "privacy" || overlay === "terms" ? "legal-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button
              className="icon-button close-modal"
              aria-label={tr("common.close")}
              onClick={() => setOverlay(null)}
            >
              <X size={21} />
            </button>
            {overlay === "daily" && daily && (
              <>
                <span className="modal-symbol">
                  <Sparkles size={27} />
                </span>
                <p
                  className="eyebrow"
                  {...translationAttrs(state.locale, "home.daily")}
                >
                  {tr("home.daily")}
                </p>
                <h2
                  id="dialog-title"
                  {...translationAttrs(state.locale, "home.dailyHint")}
                >
                  {tr("home.dailyHint")}
                </h2>
                <p className="daily-prompt" lang={daily.language} dir="auto">
                  {daily.text}
                </p>
                {fallback(daily)}
                {cardActions(daily)}
              </>
            )}
            {overlay === "pause" && (
              <>
                <span className="modal-symbol">
                  <Pause size={27} />
                </span>
                <h2
                  id="dialog-title"
                  {...translationAttrs(state.locale, "game.pause")}
                >
                  {tr("game.pause")}
                </h2>
                <p {...translationAttrs(state.locale, "setup.rule")}>
                  {tr("setup.rule")}
                </p>
                <button
                  className="primary wide"
                  onClick={() => setOverlay(null)}
                  {...translationAttrs(state.locale, "game.resume")}
                >
                  {tr("game.resume")}
                  <Play size={18} />
                </button>
                {session && (
                  <div className="pause-difficulty">
                    <p
                      {...translationAttrs(
                        state.locale,
                        "game.changeDifficulty",
                      )}
                    >
                      {tr("game.changeDifficulty")}
                    </p>
                    <div
                      className="difficulty-picker"
                      role="group"
                      aria-label={tr("game.changeDifficulty")}
                    >
                      {(["easy", "medium", "bold"] as const).map((value) => (
                        <button
                          key={value}
                          aria-pressed={session.difficulty === value}
                          disabled={session.difficulty === value}
                          onClick={() => changeDifficulty(value)}
                          {...translationAttrs(state.locale, `setup.${value}`)}
                        >
                          {tr(`setup.${value}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  className="secondary wide"
                  onClick={() => {
                    setScreen("home");
                    setTab("play");
                    setOverlay(null);
                  }}
                  {...translationAttrs(state.locale, "common.back")}
                >
                  {tr("common.back")}
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="danger-text"
                  onClick={() => {
                    update({ session: null });
                    setScreen("home");
                    setTab("play");
                    setOverlay(null);
                  }}
                  {...translationAttrs(state.locale, "game.end")}
                >
                  {tr("game.end")}
                </button>
              </>
            )}
            {(overlay === "privacy" || overlay === "terms") && (
              <>
                <h2
                  id="dialog-title"
                  {...translationAttrs(
                    state.locale,
                    overlay === "privacy"
                      ? "legal.privacyTitle"
                      : "legal.termsTitle",
                  )}
                >
                  {tr(
                    overlay === "privacy"
                      ? "legal.privacyTitle"
                      : "legal.termsTitle",
                  )}
                </h2>
                <p className="legal-language">
                  {state.locale === "tr" ? "Türkçe" : "English"}
                  {!publisherReady && ` · ${tr("legal.publisherPending")}`}
                </p>
                <LegalText
                  page={overlay}
                  language={state.locale === "tr" ? "tr" : "en"}
                  publisher={publisher}
                  adsEnabled={advertisingEnabled}
                />
                {overlay === "privacy" && publisher.privacyUrl && (
                  <a
                    className="secondary wide support-link"
                    href={publisher.privacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...translationAttrs(state.locale, "legal.publicPrivacy")}
                  >
                    {tr("legal.publicPrivacy")}
                  </a>
                )}
              </>
            )}
            {overlay === "support" && (
              <>
                <span className="modal-symbol">
                  <HelpCircle size={28} />
                </span>
                <h2
                  id="dialog-title"
                  {...translationAttrs(state.locale, "legal.supportTitle")}
                >
                  {tr("legal.supportTitle")}
                </h2>
                <p {...translationAttrs(state.locale, "legal.rules")}>
                  {tr("legal.rules")}
                </p>
                <p {...translationAttrs(state.locale, "legal.supportBody")}>
                  {tr("legal.supportBody")}
                </p>
                {publisher.name && (
                  <p className="publisher-name">{publisher.name}</p>
                )}
                {publisher.supportEmail ? (
                  <a
                    className="secondary wide support-link"
                    href={`mailto:${encodeURIComponent(publisher.supportEmail).replaceAll("%40", "@")}`}
                    {...translationAttrs(state.locale, "legal.emailSupport")}
                  >
                    {tr("legal.emailSupport")}
                    <span>{publisher.supportEmail}</span>
                  </a>
                ) : (
                  <p
                    className="translation-note"
                    {...translationAttrs(
                      state.locale,
                      "legal.supportUnavailable",
                    )}
                  >
                    {tr("legal.supportUnavailable")}
                  </p>
                )}
                {publisher.supportUrl && (
                  <a
                    className="secondary wide support-link"
                    href={publisher.supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...translationAttrs(state.locale, "legal.supportWebsite")}
                  >
                    {tr("legal.supportWebsite")}
                  </a>
                )}
                <button
                  className="secondary wide"
                  onClick={() => setOverlay("privacy")}
                  {...translationAttrs(state.locale, "settings.privacy")}
                >
                  {tr("settings.privacy")}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
            {overlay === "consent" && (
              <>
                <span className="modal-symbol">
                  <ShieldCheck size={28} />
                </span>
                <h2
                  id="dialog-title"
                  {...translationAttrs(state.locale, "consent.title")}
                >
                  {tr("consent.title")}
                </h2>
                {!advertisingEnabled ? (
                  <p {...translationAttrs(state.locale, "packs.adFree")}>
                    {tr("packs.adFree")}
                  </p>
                ) : (
                  <>
                    <p {...translationAttrs(state.locale, "consent.body")}>
                      {tr("consent.body")}
                    </p>
                    {!Capacitor.isNativePlatform() && (
                      <p
                        className="fine-print"
                        {...translationAttrs(state.locale, "consent.noAdsWeb")}
                      >
                        {tr("consent.noAdsWeb")}
                      </p>
                    )}
                    <button
                      className="primary wide"
                      disabled={busy}
                      onClick={() => void enableAds()}
                      {...translationAttrs(state.locale, "consent.open")}
                    >
                      {tr("consent.open")}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="secondary wide"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await ads.privacyOptions();
                          setAdStatus("off");
                          notify("common.done");
                        } catch {
                          notify("consent.unavailable");
                        }
                      }}
                      {...translationAttrs(state.locale, "settings.adPrivacy")}
                    >
                      {tr("settings.adPrivacy")}
                    </button>
                    <button
                      className="text-link"
                      onClick={async () => {
                        await ads.disableAds();
                        setAdStatus("off");
                        notify("common.done");
                      }}
                      {...translationAttrs(state.locale, "common.off")}
                    >
                      {tr("common.off")}
                    </button>
                    {adStatus && (
                      <p
                        className="fine-print"
                        role="status"
                        {...translationAttrs(
                          state.locale,
                          adStatus === "web"
                            ? "consent.noAdsWeb"
                            : adStatus === "available"
                              ? "common.on"
                              : "common.off",
                        )}
                      >
                        {tr(
                          adStatus === "web"
                            ? "consent.noAdsWeb"
                            : adStatus === "available"
                              ? "common.on"
                              : "common.off",
                        )}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {overlay === "reset" && (
              <>
                <span className="modal-symbol">
                  <RotateCcw size={28} />
                </span>
                <h2
                  id="dialog-title"
                  {...translationAttrs(state.locale, "settings.reset")}
                >
                  {tr("settings.reset")}
                </h2>
                <p {...translationAttrs(state.locale, "settings.resetConfirm")}>
                  {tr("settings.resetConfirm")}
                </p>
                <button
                  className="primary wide"
                  onClick={() => {
                    void ads.disableAds();
                    setState(initialState());
                    setOverlay(null);
                    setScreen("home");
                    setTab("play");
                    notify("settings.resetDone");
                  }}
                  {...translationAttrs(state.locale, "common.confirm")}
                >
                  {tr("common.confirm")}
                </button>
                <button
                  className="secondary wide"
                  onClick={() => setOverlay(null)}
                  {...translationAttrs(state.locale, "common.cancel")}
                >
                  {tr("common.cancel")}
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${isGame ? "toast-game" : ""}`}
          role="status"
          {...translationAttrs(state.locale, toast.key)}
        >
          <Check size={17} />
          <TranslatedText
            locale={state.locale}
            translationKey={toast.key}
            values={toast.values}
          />
        </div>
      )}
    </div>
  );
}
