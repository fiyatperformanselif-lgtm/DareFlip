import { Capacitor } from "@capacitor/core";
import { useEffect, useRef, useState } from "react";
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
import { dailyCard, drawCard, pickPlayer } from "./domain/engine";
import type { Card, Difficulty, Mode } from "./domain/types";
import { saveState } from "./domain/storage";
import { GENDERS, hasCompleteGenders } from "./domain/players";
import type { Gender } from "./domain/players";
import { detectLanguage, languages, localeInfo, t } from "./i18n";
import type { Key, Locale } from "./i18n";
import { initialState, loadAppState } from "./state";
import type { Session, State } from "./state";
import { ads } from "./services/ads";
import { feedback } from "./services/feedback";
import { shareCard } from "./services/share";
import { useNativeBack, exitNativeApp } from "./ui/useNativeBack";
import privacy from "../docs/PRIVACY_POLICY.md?raw";
import terms from "../docs/TERMS_OF_USE.md?raw";

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
  const [age, setAge] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(24);
  const [exhausted, setExhausted] = useState(false);
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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGame = screen === "game" && state.session !== null;
  const session = state.session;
  const cardId = session?.card?.id;
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(
      isGame && cardId ? ".card-prompt" : ".main h1",
    );
    if (target) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }, [screen, tab, isGame, cardId]);
  useNativeBack(() => {
    if (overlay) setOverlay(null);
    else if (isGame) setOverlay("pause");
    else if (screen === "setup") setScreen("home");
    else if (tab !== "play") setTab("play");
    else exitNativeApp();
  });
  const tr = (key: Key, vars?: Record<string, string | number>) =>
    t(state.locale, key, vars);
  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
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
      if (spinTimer.current) clearTimeout(spinTimer.current);
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
            'button:not(:disabled),input,select,[tabindex="0"]',
          ),
        ];
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
    feel();
    setTab(next);
    setScreen("home");
    setError("");
  };
  const selectMode = (mode: Mode) => {
    feel();
    setChosen(mode);
    setDifficulty(session?.difficulty ?? "easy");
    setPlayers(
      session
        ? session.players.map((name, index) => ({
            name,
            gender: session.genders[index],
          }))
        : blankPlayers(),
    );
    setResuming(false);
    setAge(state.ageConfirmed);
    setScreen("setup");
    setError("");
  };
  const resumeGame = () => {
    if (!session) return;
    feel();
    setError("");
    setExhausted(false);
    if (hasCompleteGenders(session.genders)) {
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
    setAge(state.ageConfirmed);
    setResuming(true);
    setScreen("setup");
  };
  const begin = () => {
    const names = players.map((player) => player.name.trim());
    if (names.length < 2 || names.some((n) => !n)) {
      setError(tr("setup.minPlayers"));
      return;
    }
    if (
      new Set(names.map((n) => n.toLocaleLowerCase())).size !== names.length
    ) {
      setError(tr("setup.uniqueNames"));
      return;
    }
    const genders = players.map((player) => player.gender);
    if (!hasCompleteGenders(genders)) {
      setError(tr("setup.genderRequired"));
      const missing = genders.findIndex((gender) => gender === null);
      document.getElementById(`player-gender-${missing}`)?.focus();
      return;
    }
    if ((chosen === "flirty" || chosen === "random") && !age) {
      setError(tr("setup.ageRequired"));
      return;
    }
    feel("success");
    update({
      session:
        resuming && session
          ? { ...session, genders }
          : makeSession(names, genders, chosen, difficulty),
      ageConfirmed: state.ageConfirmed || age,
    });
    setScreen("game");
    setResuming(false);
    setExhausted(false);
  };
  const nextTurn = () => {
    if (!session || spinning) return;
    feel();
    setSpinning(true);
    setExhausted(false);
    setSpinAngle((a) => a + 1440 + Math.floor(Math.random() * 360));
    // Interstitials are attempted only on an explicit break, never while drawing a card.
    spinTimer.current = setTimeout(() => {
      setState((s) =>
        s.session
          ? {
              ...s,
              session: {
                ...s.session,
                player: pickPlayer(s.session.players, s.session.player)!,
                card: null,
              },
            }
          : s,
      );
      setSpinning(false);
      feel("success");
    }, 1100);
  };
  const draw = (type: "truth" | "dare") => {
    if (!session || spinning) return;
    const result = drawCard({
      mode: session.mode,
      difficulty: session.difficulty,
      type,
      language: state.locale,
      seen: session.seen,
      unlockedPacks: state.unlocked ? ["core", "afterglow"] : ["core"],
    });
    if (!result.card) {
      setExhausted(true);
      return;
    }
    feel("flip");
    update({
      session: {
        ...session,
        card: result.card,
        seen: [...session.seen, result.card.id],
        rounds: session.rounds + 1,
      },
    });
    setExhausted(false);
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
    notify(tr(saved ? "game.unsaved" : "game.saved"));
  };
  const share = async (card: Card) => {
    try {
      const result = await shareCard({
        text: card.text,
        type: card.type,
        title: "DareFlip",
      });
      if (result === "downloaded") notify(tr("game.download"));
    } catch {
      notify(tr("game.shareUnavailable"));
    }
  };
  const daily = dailyCard(state.locale);
  const pause = () => {
    feel();
    setOverlay("pause");
  };
  const enableAds = async () => {
    setBusy(true);
    try {
      const status = await ads.enableAds({ attOptIn: false });
      setAdStatus(status);
      notify(
        tr(
          status === "web"
            ? "consent.noAdsWeb"
            : status === "available"
              ? "common.done"
              : "consent.unavailable",
        ),
      );
    } catch {
      notify(tr("consent.unavailable"));
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
        notify(tr("packs.rewarded"));
      } else notify(tr("packs.unavailable"));
    } catch {
      notify(tr("packs.unavailable"));
    } finally {
      setBusy(false);
    }
  };
  const fallback = (card: Card) =>
    state.locale !== card.language ? (
      <p className="fallback">
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
    <div className={`app ${adStatus === "available" ? "ads-enabled" : ""}`}>
      {!ready && (
        <div className="splash" aria-label="DareFlip">
          <img src="/icon.svg" alt="" />
          <strong>
            DareFlip<span>✦</span>
          </strong>
          <p>{tr("brand.slogan")}</p>
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
        <div className="storage-notice" role="status">
          <ShieldCheck size={16} />
          {tr("common.storageUnavailable")}
        </div>
      )}
      <main className={`main ${isGame ? "game-main" : ""}`}>
        {screen === "home" && tab === "play" && (
          <div className="home-grid page-enter">
            <section className="welcome">
              <p className="eyebrow">
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
              <p className="subtitle">{tr("home.subtitle")}</p>
            </section>
            <section className="hero-banner" aria-label={tr("brand.slogan")}>
              <div className="hero-copy">
                <div className="pill">
                  <Sparkles size={12} />
                  {tr("home.heroLabel")}
                </div>
                <h2>
                  {tr("home.heroLine1Start")}{" "}
                  <em>{tr("home.heroLine1Emphasis")}</em>
                  <br />
                  {tr("home.heroLine2Start")}{" "}
                  <em>{tr("home.heroLine2Emphasis")}</em>
                </h2>
                <p>{tr("brand.slogan")}</p>
                <button
                  className="hero-play"
                  onClick={() => selectMode("party")}
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
                  <span>{tr("game.truth")}</span>
                  <Heart fill="currentColor" />
                  <small>{tr("home.heroTruthHint")}</small>
                </div>
                <div className="art-card dare-art">
                  <span>{tr("game.dare")}</span>
                  <Zap fill="currentColor" />
                  <small>{tr("home.heroDareHint")}</small>
                </div>
                <span className="mini-spark">✧</span>
              </div>
            </section>
            <section className="mode-section">
              <div className="section-heading">
                <h2>
                  {tr("home.chooseMode")}
                  <span>✦</span>
                </h2>
                <span className="mode-total">
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
                      <h3>{tr(`mode.${id}`)}</h3>
                      <p>{tr(`mode.${id}.description`)}</p>
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
                    <strong>{tr("home.resume")}</strong>
                    <small>
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
                  <span>{tr("home.daily")}</span>
                  <span className="daily-tag">{tr("home.dailyTag")}</span>
                </div>
                <p lang={daily?.language} dir="auto">
                  {daily?.text}
                </p>
                {daily && fallback(daily)}
                <div className="daily-bottom">
                  <span>{tr("home.dailyHint")}</span>
                  <ArrowRight size={19} />
                </div>
              </button>
              <div className="comfort">
                <ShieldCheck size={19} />
                <p>{tr("setup.rule")}</p>
              </div>
              <p className="offline-caption">
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
                <span className="eyebrow">{tr(`mode.${chosen}`)}</span>
                <p>{tr(`mode.${chosen}.description`)}</p>
              </div>
            </div>
            <h1>{tr("setup.title")}</h1>
            <p className="subtitle">
              {tr(resuming ? "setup.completeGenders" : "setup.subtitle")}
            </p>
            <div className="player-heading">
              <h2>{tr("setup.players")}</h2>
              <span>{players.length}/20</span>
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
                      onChange={(e) =>
                        setPlayers((p) =>
                          p.map((entry, j) =>
                            j === i
                              ? { ...entry, name: e.target.value }
                              : entry,
                          ),
                        )
                      }
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
                    <span>{tr("setup.gender")}</span>
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
                      <option value="" disabled>
                        {tr("setup.genderPlaceholder")}
                      </option>
                      {GENDERS.map((gender) => (
                        <option value={gender} key={gender}>
                          {tr(`gender.${gender}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>
            {!resuming && (
              <button
                className="add-player"
                disabled={players.length >= 20}
                onClick={() => {
                  feel();
                  setPlayers((p) => [...p, { name: "", gender: null }]);
                }}
              >
                <Plus size={17} />
                {tr("setup.add")}
              </button>
            )}
            <h2 className="energy-heading">{tr("setup.difficulty")}</h2>
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
                >
                  <span>{["✧", "✦", "ϟ"][i]}</span>
                  {tr(`setup.${d}`)}
                </button>
              ))}
            </div>
            {(chosen === "flirty" || chosen === "random") && (
              <label className="age-check">
                <input
                  type="checkbox"
                  checked={age}
                  onChange={(e) => setAge(e.target.checked)}
                />
                <span>{tr("setup.ageConfirm")}</span>
              </label>
            )}
            <div className="comfort">
              <ShieldCheck size={20} />
              <p>{tr("setup.rule")}</p>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary wide" onClick={begin}>
              {tr(resuming ? "game.resume" : "setup.start")}
              <ArrowRight size={19} />
            </button>
          </section>
        )}
        {isGame && session && (
          <section className="game-screen page-enter">
            <div className="game-meta">
              <span className="pill">{tr(`setup.${session.difficulty}`)}</span>
              <span>{tr("game.cardCount", { number: session.rounds })}</span>
            </div>
            <div className="player-turn">
              <span className="eyebrow">{tr(`mode.${session.mode}`)}</span>
              <h1 aria-live="polite">
                {spinning
                  ? tr("game.spinning")
                  : tr("game.turn", { name: session.player })}
              </h1>
              {session.genders[session.players.indexOf(session.player)] && (
                <p className="turn-gender">
                  {tr(
                    `gender.${session.genders[session.players.indexOf(session.player)]!}`,
                  )}
                </p>
              )}
              <div className="player-dots">
                {session.players.map((p, i) => (
                  <span
                    className={p === session.player ? "active" : ""}
                    key={p}
                    title={p}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
            {!session.card ? (
              <>
                <button
                  className={`bottle-stage ${spinning ? "spinning" : ""}`}
                  onClick={nextTurn}
                  disabled={spinning}
                >
                  <div className="bottle-ring" />
                  <div
                    className="bottle"
                    aria-hidden="true"
                    style={{ transform: `rotate(${spinAngle}deg)` }}
                  >
                    <span className="bottle-cap" />
                    <span className="bottle-neck" />
                    <span className="bottle-body">
                      <span>
                        DF<span>✦</span>
                      </span>
                    </span>
                  </div>
                  <span className="bottle-spark" aria-hidden="true">
                    ✦
                  </span>
                  <span className="bottle-hint">
                    <RotateCcw size={13} />
                    {tr("game.spin")}
                  </span>
                </button>
                <h2 className="choose-label">{tr("game.choose")}</h2>
                <div className="choice-buttons">
                  <button
                    className="truth-choice"
                    disabled={spinning}
                    onClick={() => draw("truth")}
                  >
                    <Heart size={25} />
                    {tr("game.truth")}
                    <ArrowRight size={17} />
                  </button>
                  <span>{tr("common.or")}</span>
                  <button
                    className="dare-choice"
                    disabled={spinning}
                    onClick={() => draw("dare")}
                  >
                    <Zap size={25} />
                    {tr("game.dare")}
                    <ArrowRight size={17} />
                  </button>
                </div>
                {exhausted && (
                  <div className="exhausted" role="status">
                    <p>{tr("game.exhausted")}</p>
                    <p>{tr("game.exhaustedHint")}</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        update({ session: { ...session, seen: [] } });
                        setExhausted(false);
                      }}
                    >
                      {tr("game.restartDeck")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  className={`play-card ${session.card.type}-card`}
                  key={session.card.id}
                >
                  <div className="play-card-inner">
                    <div className="card-top">
                      <span>
                        <Sparkles size={14} /> DAREFLIP
                      </span>
                      <span>{tr(`game.${session.card.type}`)}</span>
                    </div>
                    <div className="card-glyph">
                      {session.card.type === "truth" ? (
                        <Heart size={42} />
                      ) : (
                        <Zap size={42} />
                      )}
                    </div>
                    <p
                      className="card-prompt"
                      data-testid="card-prompt"
                      lang={session.card.language}
                      dir="auto"
                    >
                      {session.card.text}
                    </p>
                    <div className="card-footer">
                      <span>
                        {tr(`setup.${session.card.difficulty}`)}
                        <span>✦</span>
                        {tr(`mode.${session.card.category}`)}
                      </span>
                      {cardActions(session.card)}
                    </div>
                  </div>
                </div>
                {fallback(session.card)}
                <button
                  className="primary wide next-button"
                  disabled={spinning}
                  onClick={nextTurn}
                >
                  {tr("game.next")}
                  <ArrowRight size={19} />
                </button>
                <button
                  className="skip-button"
                  disabled={spinning}
                  onClick={() => {
                    nextTurn();
                    notify(tr("game.skipNotice"));
                  }}
                >
                  {tr("game.skip")}
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <p className="game-rule">
              <ShieldCheck size={14} />
              {tr("setup.rule")}
            </p>
          </section>
        )}
        {screen === "home" && tab === "favorites" && (
          <section className="collection page-enter">
            <p className="eyebrow">
              <Heart size={14} /> {tr("nav.favorites")}
            </p>
            <h1>{tr("favorites.title")}</h1>
            <p className="subtitle">{tr("favorites.subtitle")}</p>
            {state.favorites.length === 0 ? (
              <div className="empty-state">
                <div className="empty-cards">
                  <Heart size={44} />
                </div>
                <h2>{tr("favorites.empty")}</h2>
                <p>{tr("favorites.emptyHint")}</p>
                <button className="primary" onClick={() => goTab("play")}>
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
            <p className="eyebrow">
              <Gift size={14} />
              {tr("nav.packs")}
            </p>
            <h1>{tr("packs.title")}</h1>
            <p className="subtitle">{tr("packs.subtitle")}</p>
            <div className="pack-grid">
              <article className="pack-card core-pack">
                <div className="pack-art">
                  <img src="/icon.svg" alt="" />
                  <span>{tr("packs.coreArt")}</span>
                </div>
                <div className="pack-body">
                  <div className="pill">
                    <Check size={13} />
                    {tr("packs.included")}
                  </div>
                  <h2>{tr("packs.core")}</h2>
                  <p>{tr("packs.coreDescription")}</p>
                  <button
                    className="secondary wide"
                    onClick={() => goTab("play")}
                  >
                    {tr("home.play")}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </article>
              <article className="pack-card afterglow-pack">
                <div className="pack-art">
                  <span className="afterglow-orb">✦</span>
                  <span>{tr("packs.afterglow")}</span>
                </div>
                <div className="pack-body">
                  <div className="pill">
                    {state.unlocked ? (
                      <Check size={13} />
                    ) : (
                      <LockKeyhole size={13} />
                    )}{" "}
                    {tr(state.unlocked ? "packs.unlocked" : "common.optional")}
                  </div>
                  <h2>{tr("packs.afterglow")}</h2>
                  <p>{tr("packs.afterglowDescription")}</p>
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
                  <p className="fine-print">{tr("packs.rewardExplain")}</p>
                </div>
              </article>
            </div>
            <div className="comfort">
              <ShieldCheck size={20} />
              <p>
                {tr(
                  Capacitor.isNativePlatform()
                    ? "packs.rewardExplain"
                    : "consent.noAdsWeb",
                )}
              </p>
            </div>
            <button className="text-link" onClick={() => setOverlay("consent")}>
              {tr("settings.adPrivacy")}
              <ChevronRight size={15} />
            </button>
          </section>
        )}
        {screen === "home" && tab === "settings" && (
          <section className="settings-screen page-enter">
            <p className="eyebrow">
              <Settings2 size={14} />
              {tr("nav.settings")}
            </p>
            <h1>{tr("settings.title")}</h1>
            <div className="settings-group">
              <label className="settings-row language-row">
                <span>
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
              >
                {tr("settings.deviceLanguage")}
                <ChevronRight size={16} />
              </button>
              <div className="translation-note">
                <Globe2 size={15} />
                <div>
                  {!localeInfo(state.locale).uiComplete && (
                    <p>{tr("settings.partialUi")}</p>
                  )}
                  {localeInfo(state.locale).contentStatus !== "available" && (
                    <p>
                      {tr(
                        localeInfo(state.locale).contentStatus === "partial"
                          ? "settings.partialCards"
                          : "settings.englishCards",
                      )}
                    </p>
                  )}
                  <p>
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
                  <span>
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
              ).map(({ key, icon: Icon }) => (
                <button
                  className="settings-row"
                  key={key}
                  onClick={() => setOverlay(key)}
                >
                  <span>
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
              <p>
                {tr("settings.offline")}
                <br />
                <span>{tr("settings.localDataNotice")}</span>
              </p>
            </div>
            <button className="danger-text" onClick={() => setOverlay("reset")}>
              {tr("settings.reset")}
            </button>
            <div className="settings-footer">
              <img src="/icon.svg" alt="" />
              <strong>DareFlip</strong>
              <span>{tr("settings.version", { version: "0.1.0" })}</span>
              <small>{tr("brand.slogan")}</small>
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
              <small>{tr(`nav.${id}`)}</small>
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
                <p className="eyebrow">{tr("home.daily")}</p>
                <h2 id="dialog-title">{tr("home.dailyHint")}</h2>
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
                <h2 id="dialog-title">{tr("game.pause")}</h2>
                <p>{tr("setup.rule")}</p>
                <button
                  className="primary wide"
                  onClick={() => setOverlay(null)}
                >
                  {tr("game.resume")}
                  <Play size={18} />
                </button>
                <button
                  className="secondary wide"
                  onClick={() => {
                    setScreen("home");
                    setTab("play");
                    setOverlay(null);
                  }}
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
                >
                  {tr("game.end")}
                </button>
              </>
            )}
            {(overlay === "privacy" || overlay === "terms") && (
              <>
                <h2 id="dialog-title">
                  {tr(
                    overlay === "privacy"
                      ? "legal.privacyTitle"
                      : "legal.termsTitle",
                  )}
                </h2>
                <p className="legal-language">{tr("legal.languageNotice")}</p>
                <div className="legal-text" lang="en" dir="ltr">
                  {(overlay === "privacy" ? privacy : terms)
                    .split("\n")
                    .map((line, i) =>
                      line.startsWith("#") ? (
                        <h3 key={i}>{line.replace(/^#+ /, "")}</h3>
                      ) : (
                        <p key={i}>{line}</p>
                      ),
                    )}
                </div>
              </>
            )}
            {overlay === "support" && (
              <>
                <span className="modal-symbol">
                  <HelpCircle size={28} />
                </span>
                <h2 id="dialog-title">{tr("legal.supportTitle")}</h2>
                <p>{tr("legal.rules")}</p>
                <p>{tr("legal.supportBody")}</p>
                <p className="translation-note">
                  {tr("legal.supportUnavailable")}
                </p>
                <button
                  className="secondary wide"
                  onClick={() => setOverlay("privacy")}
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
                <h2 id="dialog-title">{tr("consent.title")}</h2>
                <p>{tr("consent.body")}</p>
                {!Capacitor.isNativePlatform() && (
                  <p className="fine-print">{tr("consent.noAdsWeb")}</p>
                )}
                <button
                  className="primary wide"
                  disabled={busy}
                  onClick={() => void enableAds()}
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
                      notify(tr("common.done"));
                    } catch {
                      notify(tr("consent.unavailable"));
                    }
                  }}
                >
                  {tr("settings.adPrivacy")}
                </button>
                <button
                  className="text-link"
                  onClick={async () => {
                    await ads.disableAds();
                    setAdStatus("off");
                    notify(tr("common.done"));
                  }}
                >
                  {tr("common.off")}
                </button>
                {adStatus && (
                  <p className="fine-print" role="status">
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
            {overlay === "reset" && (
              <>
                <span className="modal-symbol">
                  <RotateCcw size={28} />
                </span>
                <h2 id="dialog-title">{tr("settings.reset")}</h2>
                <p>{tr("settings.resetConfirm")}</p>
                <button
                  className="primary wide"
                  onClick={() => {
                    void ads.disableAds();
                    setState(initialState());
                    setOverlay(null);
                    setScreen("home");
                    setTab("play");
                    notify(tr("settings.resetDone"));
                  }}
                >
                  {tr("common.confirm")}
                </button>
                <button
                  className="secondary wide"
                  onClick={() => setOverlay(null)}
                >
                  {tr("common.cancel")}
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
