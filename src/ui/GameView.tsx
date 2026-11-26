import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Heart,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Card, Difficulty, Kind } from "../domain/types";
import type { Session } from "../state";
import { t, translationAttrs } from "../i18n";
import type { Locale } from "../i18n";
import { TranslatedText } from "./TranslatedText";

interface GameViewProps {
  locale: Locale;
  session: Session;
  spinning: boolean;
  spinAngle: number;
  exhausted: Kind | null;
  privateReady: boolean;
  privateBlocked: boolean;
  remaining: Record<Kind, number>;
  onSpin: () => void;
  onDraw: (kind: Kind) => void;
  onSkip: () => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onRestart: () => void;
  onNewPrivate: () => void;
  renderActions: (card: Card) => ReactNode;
  renderFallback: (card: Card) => ReactNode;
}

/** A stable selection stage lets the bottle animate even when leaving a card. */
export function GameView({
  locale,
  session,
  spinning,
  spinAngle,
  exhausted,
  privateReady,
  privateBlocked,
  remaining,
  onSpin,
  onDraw,
  onSkip,
  onDifficulty,
  onRestart,
  onNewPrivate,
  renderActions,
  renderFallback,
}: GameViewProps) {
  const tr = (
    key: Parameters<typeof t>[1],
    values?: Record<string, string | number>,
  ) => t(locale, key, values);
  const selected = session.players.indexOf(session.player);
  const gender = session.genders[selected];
  const showSelection = !session.card || spinning;
  const phase = spinning
    ? "spinning"
    : session.card
      ? "revealed"
      : exhausted
        ? "exhausted"
        : "choosing";
  const otherKind = exhausted === "truth" ? "dare" : "truth";
  const bodyRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<{
    id: string;
    canScroll: boolean;
    scrollable: boolean;
  }>({
    id: "",
    canScroll: false,
    scrollable: false,
  });
  useEffect(() => {
    const body = bodyRef.current;
    const id = session.card?.id;
    if (!body || !id || spinning) return;
    const measure = () =>
      setOverflow({
        id,
        scrollable: body.scrollHeight - body.clientHeight > 5,
        canScroll: body.scrollHeight - body.clientHeight - body.scrollTop > 5,
      });
    const frame = requestAnimationFrame(measure);
    const resize = new ResizeObserver(measure);
    resize.observe(body);
    body.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      body.removeEventListener("scroll", measure);
    };
  }, [session.card?.id, spinning]);
  const showScrollHint =
    !!session.card && overflow.id === session.card.id && overflow.canScroll;
  const isScrollable =
    !!session.card && overflow.id === session.card.id && overflow.scrollable;
  return (
    <section
      className={`game-screen page-enter ${spinning ? "is-spinning" : ""}`}
      data-phase={phase}
    >
      <div className="game-meta">
        <span
          className="pill"
          {...translationAttrs(locale, `setup.${session.difficulty}`)}
        >
          {tr(`setup.${session.difficulty}`)}
        </span>
        <span {...translationAttrs(locale, "game.cardCount")}>
          <TranslatedText
            locale={locale}
            translationKey="game.cardCount"
            values={{ number: session.rounds }}
          />
        </span>
      </div>
      <div className="game-stage" data-phase={phase}>
        <div className="player-turn">
          {privateBlocked && (
            <div className="private-notice" role="status">
              <ShieldCheck size={22} />
              <p {...translationAttrs(locale, "setup.legacyPrivateGroup")}>
                {tr("setup.legacyPrivateGroup")}
              </p>
              <button
                className="secondary wide"
                onClick={onNewPrivate}
                {...translationAttrs(locale, "setup.newPrivateGame")}
              >
                {tr("setup.newPrivateGame")}
              </button>
            </div>
          )}

          <span
            className="eyebrow"
            {...translationAttrs(locale, `mode.${session.mode}`)}
          >
            {tr(`mode.${session.mode}`)}
          </span>
          <h1
            aria-live="polite"
            aria-atomic="true"
            {...translationAttrs(
              locale,
              spinning ? "game.spinning" : "game.turn",
            )}
          >
            <TranslatedText
              locale={locale}
              translationKey={spinning ? "game.spinning" : "game.turn"}
              values={{ name: session.player }}
            />
          </h1>
          {gender && (
            <p
              className="turn-gender"
              {...translationAttrs(locale, `gender.${gender}`)}
            >
              {tr(`gender.${gender}`)}
            </p>
          )}
          {privateReady && (
            <p
              className="turn-partner"
              {...translationAttrs(locale, "game.partner")}
            >
              <TranslatedText
                locale={locale}
                translationKey="game.partner"
                values={{
                  name: session.players.find(
                    (name) => name !== session.player,
                  )!,
                }}
              />
            </p>
          )}
          <div className="player-dots" aria-hidden="true">
            {session.players.map((name, index) => (
              <span
                className={name === session.player ? "active" : ""}
                key={name}
                title={name}
              >
                {index + 1}
              </span>
            ))}
          </div>
          <p
            className="round-phase"
            {...translationAttrs(
              locale,
              spinning
                ? "game.phaseNext"
                : session.card
                  ? "game.phaseReveal"
                  : "game.phaseChoose",
            )}
          >
            {tr(
              spinning
                ? "game.phaseNext"
                : session.card
                  ? "game.phaseReveal"
                  : "game.phaseChoose",
            )}
          </p>
        </div>
        <div className="game-content">
          <div
            className={`selection-stage ${showSelection ? "" : "is-hidden"}`}
            aria-hidden={!showSelection}
            inert={!showSelection}
          >
            <button
              className={`bottle-stage ${spinning ? "spinning" : ""}`}
              onClick={onSpin}
              disabled={spinning || privateBlocked || !showSelection}
              aria-label={tr("game.spin")}
              {...translationAttrs(locale, "game.spin")}
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
                    <Zap size={19} fill="currentColor" />
                  </span>
                </span>
              </div>
              <span className="bottle-spark" aria-hidden="true">
                <Sparkles size={21} />
              </span>
              <span className="bottle-hint">
                <RotateCcw size={13} />
                {tr("game.spin")}
              </span>
            </button>
            <div
              className={`choice-panel ${spinning ? "is-waiting" : ""}`}
              aria-hidden={spinning}
              inert={spinning}
            >
              <h2
                className="choose-label"
                {...translationAttrs(locale, "game.choose")}
              >
                {tr("game.choose")}
              </h2>
              <div className="choice-buttons">
                <div className="choice-option">
                  <button
                    className="truth-choice"
                    disabled={spinning || privateBlocked || !showSelection}
                    onClick={() => onDraw("truth")}
                    aria-label={tr("game.truth")}
                    aria-description={tr("game.remainingCards", {
                      number: remaining.truth,
                      type: tr("game.truth"),
                    })}
                    {...translationAttrs(locale, "game.truth")}
                  >
                    <Heart size={25} />
                    <span className="choice-label">{tr("game.truth")}</span>
                    <ArrowRight size={17} />
                  </button>
                  <small className="choice-count" aria-hidden="true">
                    {remaining.truth}
                  </small>
                </div>
                <span {...translationAttrs(locale, "common.or")}>
                  {tr("common.or")}
                </span>
                <div className="choice-option">
                  <button
                    className="dare-choice"
                    disabled={spinning || privateBlocked || !showSelection}
                    onClick={() => onDraw("dare")}
                    aria-label={tr("game.dare")}
                    aria-description={tr("game.remainingCards", {
                      number: remaining.dare,
                      type: tr("game.dare"),
                    })}
                    {...translationAttrs(locale, "game.dare")}
                  >
                    <Zap size={25} />
                    <span className="choice-label">{tr("game.dare")}</span>
                    <ArrowRight size={17} />
                  </button>
                  <small className="choice-count" aria-hidden="true">
                    {remaining.dare}
                  </small>
                </div>
              </div>
              {exhausted && (
                <div className="exhausted" role="status">
                  <p {...translationAttrs(locale, "game.exhausted")}>
                    {tr("game.exhausted")}
                  </p>
                  <p {...translationAttrs(locale, "game.exhaustedType")}>
                    <TranslatedText
                      locale={locale}
                      translationKey="game.exhaustedType"
                      values={{ type: tr(`game.${exhausted}`) }}
                    />
                  </p>
                  <p {...translationAttrs(locale, "game.remainingCards")}>
                    <TranslatedText
                      locale={locale}
                      translationKey="game.remainingCards"
                      values={{
                        number: remaining[otherKind],
                        type: tr(`game.${otherKind}`),
                      }}
                    />
                  </p>
                  <p
                    className="difficulty-caption"
                    {...translationAttrs(locale, "game.changeDifficulty")}
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
                        onClick={() => onDifficulty(value)}
                        {...translationAttrs(locale, `setup.${value}`)}
                      >
                        {tr(`setup.${value}`)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    onClick={onRestart}
                    {...translationAttrs(locale, "game.restartDeck")}
                  >
                    <RotateCcw size={16} />
                    {tr("game.restartDeck")}
                  </button>
                </div>
              )}
            </div>
          </div>
          {session.card && !spinning && (
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
                    <span
                      {...translationAttrs(locale, `game.${session.card.type}`)}
                    >
                      {tr(`game.${session.card.type}`)}
                    </span>
                  </div>
                  <div className="card-body-wrap">
                    <div
                      className="card-body"
                      ref={bodyRef}
                      tabIndex={isScrollable ? 0 : undefined}
                      role={isScrollable ? "region" : undefined}
                      aria-label={
                        isScrollable ? tr("game.scrollToRead") : undefined
                      }
                    >
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
                    </div>

                    {showScrollHint && (
                      <span
                        className="card-scroll-hint"
                        aria-hidden="true"
                        {...translationAttrs(locale, "game.scrollToRead")}
                      >
                        <ChevronDown size={12} />
                        {tr("game.scrollToRead")}
                      </span>
                    )}
                  </div>
                  <div className="card-footer">
                    <span
                      {...translationAttrs(
                        locale,
                        `setup.${session.card.difficulty}`,
                      )}
                    >
                      {tr(`setup.${session.card.difficulty}`)}
                      <span>✦</span>
                      <span
                        {...translationAttrs(
                          locale,
                          `mode.${session.card.category}`,
                        )}
                      >
                        {tr(`mode.${session.card.category}`)}
                      </span>
                    </span>
                    {renderActions(session.card)}
                  </div>
                </div>
              </div>
              {renderFallback(session.card)}
            </>
          )}
        </div>
      </div>
      <div className="game-actions">
        {session.card && (
          <>
            <button
              className="primary wide next-button"
              disabled={spinning}
              onClick={onSpin}
              {...translationAttrs(locale, "game.next")}
            >
              {tr("game.next")}
              <ArrowRight size={19} />
            </button>
            <button
              className="skip-button"
              disabled={spinning}
              onClick={onSkip}
              {...translationAttrs(locale, "game.skip")}
            >
              {tr("game.skip")}
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      <p
        className="game-rule"
        {...translationAttrs(
          locale,
          session.mode === "flirty" ? "setup.privateRule" : "setup.rule",
        )}
      >
        <ShieldCheck size={14} />
        <TranslatedText
          locale={locale}
          translationKey={
            session.mode === "flirty" ? "setup.privateRule" : "setup.rule"
          }
        />
      </p>
    </section>
  );
}
