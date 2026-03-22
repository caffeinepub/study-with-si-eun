import { motion, useAnimation, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ── Eye Blink Overlay ─────────────────────────────────────────────────────────

function EyeBlinkOverlay() {
  const controls = useAnimation();

  useEffect(() => {
    let cancelled = false;

    const scheduleBlink = () => {
      if (cancelled) return;
      const delay = 2500 + Math.random() * 3000;
      setTimeout(async () => {
        if (cancelled) return;
        await controls.start({
          opacity: [0, 0.55, 0],
          transition: {
            duration: 0.13,
            times: [0, 0.45, 1],
            ease: "easeInOut",
          },
        });
        if (Math.random() < 0.2 && !cancelled) {
          await new Promise((r) => setTimeout(r, 80));
          await controls.start({
            opacity: [0, 0.45, 0],
            transition: {
              duration: 0.11,
              times: [0, 0.4, 1],
              ease: "easeInOut",
            },
          });
        }
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => {
      cancelled = true;
    };
  }, [controls]);

  return (
    <motion.div
      animate={controls}
      initial={{ opacity: 0 }}
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: "18%",
        height: "9%",
        background:
          "linear-gradient(to bottom, transparent 0%, oklch(0.05 0.003 250 / 0.9) 40%, oklch(0.05 0.003 250 / 0.9) 60%, transparent 100%)",
      }}
    />
  );
}

// ── Writing Motion Overlay ────────────────────────────────────────────────────

function WritingMotionOverlay({ active }: { active: boolean }) {
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 40, damping: 10 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const nudge = () => {
      if (cancelled) return;
      // More energetic when active (right after page turn), subtle otherwise
      const range = active ? 6 : 3;
      const amount = (Math.random() - 0.5) * range;
      x.set(amount);
      const next = active
        ? 300 + Math.random() * 500
        : 600 + Math.random() * 900;
      timerRef.current = setTimeout(nudge, next);
    };

    nudge();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [x, active]);

  return (
    <motion.div
      style={{
        x: springX,
        position: "absolute",
        bottom: "12%",
        left: "20%",
        right: "20%",
        height: "18%",
        background: active
          ? "radial-gradient(ellipse 80% 60% at 50% 70%, oklch(0.72 0.19 52 / 0.07) 0%, transparent 80%)"
          : "radial-gradient(ellipse 80% 60% at 50% 70%, oklch(0.72 0.19 52 / 0.04) 0%, transparent 80%)",
        pointerEvents: "none",
        borderRadius: "50%",
        transition: "background 1s ease",
      }}
    />
  );
}

// ── Page Turn Overlay ─────────────────────────────────────────────────────────
// Fires every 5 minutes, then signals writing-active state for ~60s afterward

function PageTurnOverlay({ onTurned }: { onTurned: () => void }) {
  const controls = useAnimation();
  const hasStarted = useRef(false);
  const onTurnedRef = useRef(onTurned);
  onTurnedRef.current = onTurned;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount; refs used for stable access
  useEffect(() => {
    let cancelled = false;

    const doTurn = async () => {
      if (cancelled) return;
      await controls.start({
        x: ["60%", "-20%"],
        opacity: [0, 0.85, 0.85, 0],
        scaleX: [0.3, 1, 1, 0.3],
        transition: {
          duration: 0.55,
          ease: [0.4, 0, 0.2, 1],
          times: [0, 0.15, 0.7, 1],
        },
      });
      controls.set({ x: 0, opacity: 0, scaleX: 1 });
      if (!cancelled) onTurnedRef.current();
    };

    // First turn after 5 minutes, then every 5 minutes
    const schedule = () => {
      const id = setTimeout(
        async () => {
          if (cancelled) return;
          await doTurn();
          if (!cancelled) schedule();
        },
        5 * 60 * 1000,
      ); // 5 minutes
      return id;
    };

    const id = schedule();
    hasStarted.current = true;

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  return (
    <motion.div
      animate={controls}
      initial={{ opacity: 0 }}
      className="absolute pointer-events-none"
      style={{
        bottom: "10%",
        right: "15%",
        width: "32%",
        height: "24%",
        background:
          "linear-gradient(105deg, transparent 0%, oklch(0.95 0.004 60 / 0.22) 30%, oklch(0.90 0.006 50 / 0.35) 55%, oklch(0.95 0.004 60 / 0.1) 75%, transparent 100%)",
        borderRadius: "2px 8px 4px 2px",
        transformOrigin: "right center",
      }}
    />
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function FocusAnimationOverlay() {
  // writingActive = true for ~60s after each page turn
  const [writingActive, setWritingActive] = useState(false);
  const writingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePageTurned = () => {
    setWritingActive(true);
    if (writingTimerRef.current) clearTimeout(writingTimerRef.current);
    writingTimerRef.current = setTimeout(() => {
      setWritingActive(false);
    }, 60 * 1000); // writing burst lasts 60s after each page turn
  };

  useEffect(() => {
    return () => {
      if (writingTimerRef.current) clearTimeout(writingTimerRef.current);
    };
  }, []);

  return (
    <>
      <EyeBlinkOverlay />
      <WritingMotionOverlay active={writingActive} />
      <PageTurnOverlay onTurned={handlePageTurned} />
    </>
  );
}
