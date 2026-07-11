'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from 'lucide-react';

export interface TourStep {
  /** CSS selector for the element to spotlight. Omit for a centred step. */
  target?: string;
  title: string;
  body: React.ReactNode;
}

interface OnboardingTourProps {
  steps: TourStep[];
  /** localStorage key — combined with the user id so each person sees it once. */
  tourKey: string;
  /** Accent colour; defaults to the tenant brand. */
  accent?: string;
  /** Signed-in user id, so dismissal is tracked per person (not per browser). */
  userId?: string;
  /** Account creation timestamp. When provided, the tour auto-shows ONLY for
   *  accounts newer than `newUserWindowDays` — i.e. strictly brand-new users. */
  accountCreatedAt?: string;
  newUserWindowDays?: number;
}

type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center';

const CARD_W = 340;
const GAP = 16;
const PAD = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** First visible element matching the selector (sidebar on desktop, tab bar on mobile). */
function findTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) return el;
  }
  return null;
}

function TourArrow({ placement, rect, accent }: { placement: Placement; rect: DOMRect; accent: string }) {
  const size = 28;
  const cx = rect.left + rect.width / 2 - size / 2;
  const cy = rect.top + rect.height / 2 - size / 2;
  let style: React.CSSProperties;
  let Icon = ArrowUp;
  let anim = 'rs-tour-bob-y-rev';

  if (placement === 'right') {
    Icon = ArrowLeft;
    anim = 'rs-tour-bob-x-rev';
    style = { top: cy, left: rect.right + 4 };
  } else if (placement === 'left') {
    Icon = ArrowRight;
    anim = 'rs-tour-bob-x';
    style = { top: cy, left: rect.left - size - 4 };
  } else if (placement === 'bottom') {
    Icon = ArrowUp;
    anim = 'rs-tour-bob-y-rev';
    style = { top: rect.bottom + 4, left: cx };
  } else {
    Icon = ArrowDown;
    anim = 'rs-tour-bob-y';
    style = { top: rect.top - size - 4, left: cx };
  }

  return (
    <div className={`rs-tour-arrow ${anim}`} style={{ ...style, color: accent }} aria-hidden="true">
      <Icon size={size} strokeWidth={3} />
    </div>
  );
}

export function OnboardingTour({
  steps,
  tourKey,
  accent,
  userId,
  accountCreatedAt,
  newUserWindowDays = 30,
}: OnboardingTourProps) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<Placement>('center');
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  const storageKey = userId ? `${tourKey}:${userId}` : tourKey;

  // Auto-show once, strictly for brand-new accounts. We require positive
  // evidence the account is recent (accountCreatedAt within the window); if no
  // creation date is supplied (e.g. the admin console) we fall back to a simple
  // once-per-browser gate. Either way, a prior dismissal suppresses it.
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = Boolean(window.localStorage.getItem(storageKey));
    } catch {
      /* ignore */
    }
    if (dismissed) return;

    if (accountCreatedAt) {
      const created = new Date(accountCreatedAt).getTime();
      if (Number.isNaN(created)) return;
      const ageDays = (Date.now() - created) / 86_400_000;
      if (ageDays > newUserWindowDays) return; // established user — never auto-show
    }
    setIndex(0);
    setActive(true);
  }, [storageKey, accountCreatedAt, newUserWindowDays]);

  // Manual replay (Support → Help → "Replay tutorial") works for everyone,
  // regardless of the new-user gate or a previous dismissal.
  useEffect(() => {
    const replay = () => {
      setIndex(0);
      setActive(true);
    };
    window.addEventListener('rs:replay-tour', replay);
    return () => window.removeEventListener('rs:replay-tour', replay);
  }, []);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setActive(false);
  }, [storageKey]);

  const step = steps[index];

  const compute = useCallback(() => {
    if (!step) return;
    const width = Math.min(CARD_W, window.innerWidth - 2 * PAD);
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      setPlacement('center');
      setCardStyle({ width, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let nextPlacement: Placement;
    let style: React.CSSProperties;
    if (r.left < vw * 0.4 && r.right + width + GAP < vw) {
      nextPlacement = 'right';
      style = { width, top: clamp(r.top, PAD, vh - 240), left: r.right + GAP };
    } else if (r.right > vw * 0.6 && r.left - width - GAP > 0) {
      nextPlacement = 'left';
      style = { width, top: clamp(r.top, PAD, vh - 240), left: r.left - width - GAP };
    } else if (vh - r.bottom > 240) {
      nextPlacement = 'bottom';
      style = { width, top: r.bottom + GAP, left: clamp(r.left, PAD, vw - width - PAD) };
    } else {
      nextPlacement = 'top';
      style = {
        width,
        top: Math.max(PAD, r.top - GAP),
        left: clamp(r.left, PAD, vw - width - PAD),
        transform: 'translateY(-100%)',
      };
    }
    setRect(r);
    setPlacement(nextPlacement);
    setCardStyle(style);
  }, [step]);

  useLayoutEffect(() => {
    if (!active) return;
    const el = findTarget(step?.target);
    el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    compute();
    const onMove = () => compute();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    const settle = window.setTimeout(compute, 360);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      window.clearTimeout(settle);
    };
  }, [active, index, step, compute]);

  if (!active || !step) return null;

  const accentColor = accent || 'var(--brand-primary, #0d9488)';
  const isLast = index === steps.length - 1;

  return (
    <div className="rs-tour" role="dialog" aria-modal="true" aria-label="Getting started tour">
      {rect ? (
        <div
          className="rs-tour-ring"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderColor: accentColor,
          }}
        />
      ) : (
        <div className="rs-tour-dim" />
      )}

      {rect ? <TourArrow placement={placement} rect={rect} accent={accentColor} /> : null}

      <div className="rs-tour-card" style={cardStyle}>
        <button type="button" className="rs-tour-close" onClick={finish} aria-label="Skip tour">
          <X size={16} />
        </button>
        <p className="rs-tour-kicker" style={{ color: accentColor }}>
          Step {index + 1} of {steps.length}
        </p>
        <h3 className="rs-tour-title">{step.title}</h3>
        <div className="rs-tour-body">{step.body}</div>
        <div className="rs-tour-dots" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className="rs-tour-dot"
              style={i === index ? { background: accentColor, transform: 'scale(1.25)' } : undefined}
            />
          ))}
        </div>
        <div className="rs-tour-actions">
          <button type="button" className="rs-tour-skip" onClick={finish}>
            Skip tour
          </button>
          <div className="rs-tour-nav">
            {index > 0 ? (
              <button type="button" className="rs-tour-btn-ghost" onClick={() => setIndex((i) => i - 1)}>
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="rs-tour-btn"
              style={{ background: accentColor }}
              onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
