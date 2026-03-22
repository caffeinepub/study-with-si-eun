import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flame, RotateCcw, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FocusAnimationOverlay } from "./components/FocusAnimationOverlay";

// ─── Types ───────────────────────────────────────────────────────────────────

type TimerMode = "idle" | "running" | "paused" | "break";

type Context =
  | "app_open"
  | "session_start"
  | "session_pause"
  | "session_quit"
  | "session_complete"
  | "break_start"
  | "break_end"
  | "multi_session"
  | "return_user"
  | "late_night"
  | "morning"
  | "silence";

interface Memory {
  totalSessions: number;
  todaySessions: number;
  todayDate: string;
  lastVisit: string;
  streak: number;
}

interface DialogueState {
  text: string;
  visible: boolean;
  typing: boolean;
}

// ─── Response Engine ─────────────────────────────────────────────────────────

const responses: Record<Context, string[]> = {
  app_open: ["...still here.", "You came back.", "Sit down.", ".", "..."],
  session_start: ["Start.", "Focus.", ".", "..."],
  session_pause: ["...", "You stopped.", "..."],
  session_quit: ["Already?", "You stopped.", "...fine.", "..."],
  session_complete: ["Good.", "...", "One down.", "Not bad."],
  break_start: ["Rest.", "...", "5 minutes."],
  break_end: ["Back to it.", "Focus.", "..."],
  multi_session: ["You're still here.", "...", "Good."],
  return_user: ["You came back.", "...still here.", "Sit."],
  late_night: ["...still awake.", "Late.", "..."],
  morning: ["Early.", "...", "Good morning."],
  silence: [""],
};

function pickResponse(ctx: Context): string {
  if (Math.random() < 0.4) return "";
  const pool = responses[ctx];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getTimeContext(): Context | null {
  const h = new Date().getHours();
  if (h >= 2 && h < 5) return "late_night";
  if (h >= 5 && h < 8) return "morning";
  return null;
}

// ─── Memory ──────────────────────────────────────────────────────────────────

const MEMORY_KEY = "sieun_memory";

function loadMemory(): Memory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) return JSON.parse(raw) as Memory;
  } catch {}
  return {
    totalSessions: 0,
    todaySessions: 0,
    todayDate: "",
    lastVisit: "",
    streak: 0,
  };
}

function saveMemory(m: Memory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(m));
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function processMemoryOnLoad(mem: Memory): { updated: Memory; ctx: Context } {
  const today = getToday();
  const now = new Date().toISOString();
  let updated = { ...mem };
  let ctx: Context = "app_open";

  if (mem.todayDate !== today) {
    updated.todaySessions = 0;
    updated.todayDate = today;
  }

  if (mem.lastVisit) {
    const lastDate = mem.lastVisit.slice(0, 10);
    if (lastDate !== getYesterday() && lastDate !== today) {
      updated.streak = 0;
    }
    const diff = Date.now() - new Date(mem.lastVisit).getTime();
    if (diff > 24 * 60 * 60 * 1000) {
      ctx = "return_user";
    }
  }

  updated.lastVisit = now;
  saveMemory(updated);

  const timeCtx = getTimeContext();
  if (timeCtx && ctx === "app_open") ctx = timeCtx;

  return { updated, ctx };
}

// ─── Circular Timer Ring ─────────────────────────────────────────────────────

function CircularTimer({
  progress,
  timeStr,
  mode,
  isRunning,
}: {
  progress: number;
  timeStr: string;
  mode: TimerMode;
  isRunning: boolean;
}) {
  const R = 110;
  const STROKE = 6;
  const SIZE = (R + STROKE) * 2;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - progress);
  const isBreak = mode === "break";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <title>Timer progress ring</title>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="oklch(0.19 0.007 255)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={isBreak ? "oklch(0.72 0.14 200)" : "oklch(0.72 0.19 52)"}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 1s linear",
            filter: isBreak
              ? "drop-shadow(0 0 8px oklch(0.72 0.14 200 / 0.7))"
              : "drop-shadow(0 0 8px oklch(0.72 0.19 52 / 0.7))",
          }}
          className={isRunning ? "animate-pulse-ring" : ""}
        />
      </svg>

      <div className="flex flex-col items-center justify-center z-10">
        <span
          className="font-mono font-bold tracking-wider"
          style={{ fontSize: "3.75rem", color: "oklch(0.93 0.004 260)" }}
        >
          {timeStr}
        </span>
        <span
          className="text-xs font-medium tracking-[0.2em] uppercase mt-1"
          style={{
            color: isBreak ? "oklch(0.72 0.14 200)" : "oklch(0.72 0.19 52)",
          }}
        >
          {isBreak ? "BREAK" : "FOCUS SESSION"}
        </span>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({
  open,
  onClose,
  focusMins,
  breakMins,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  focusMins: number;
  breakMins: number;
  onSave: (focus: number, brk: number) => void;
}) {
  const [f, setF] = useState(focusMins.toString());
  const [b, setB] = useState(breakMins.toString());

  useEffect(() => {
    if (open) {
      setF(focusMins.toString());
      setB(breakMins.toString());
    }
  }, [open, focusMins, breakMins]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="border-border"
        style={{ background: "oklch(0.13 0.005 255)", maxWidth: 360 }}
        data-ocid="settings.dialog"
      >
        <DialogHeader>
          <DialogTitle
            style={{ color: "oklch(0.93 0.004 260)" }}
            className="text-sm font-medium tracking-widest uppercase"
          >
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label
              style={{ color: "oklch(0.62 0.008 260)" }}
              className="text-xs tracking-widest uppercase"
            >
              Focus Duration
            </Label>
            <Select value={f} onValueChange={setF}>
              <SelectTrigger
                className="border-border bg-transparent text-foreground"
                data-ocid="settings.focus.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.16 0.006 255)" }}>
                {[15, 20, 25, 30, 45, 60].map((v) => (
                  <SelectItem
                    key={v}
                    value={v.toString()}
                    style={{ color: "oklch(0.93 0.004 260)" }}
                  >
                    {v} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              style={{ color: "oklch(0.62 0.008 260)" }}
              className="text-xs tracking-widests uppercase"
            >
              Break Duration
            </Label>
            <Select value={b} onValueChange={setB}>
              <SelectTrigger
                className="border-border bg-transparent text-foreground"
                data-ocid="settings.break.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "oklch(0.16 0.006 255)" }}>
                {[5, 10, 15].map((v) => (
                  <SelectItem
                    key={v}
                    value={v.toString()}
                    style={{ color: "oklch(0.93 0.004 260)" }}
                  >
                    {v} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            style={{
              background: "oklch(0.72 0.19 52)",
              color: "oklch(0.09 0.003 250)",
              fontWeight: 500,
              letterSpacing: "0.1em",
            }}
            onClick={() => {
              onSave(Number.parseInt(f), Number.parseInt(b));
              onClose();
            }}
            data-ocid="settings.save_button"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [focusMins, setFocusMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [mode, setMode] = useState<TimerMode>("idle");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [memory, setMemory] = useState<Memory>(loadMemory);
  const [dialogue, setDialogue] = useState<DialogueState>({
    text: "",
    visible: false,
    typing: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceLockRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef<TimerMode>("idle");
  const memoryRef = useRef<Memory>(memory);
  const focusMinsRef = useRef(25);
  const breakMinsRef = useRef(5);

  modeRef.current = mode;
  memoryRef.current = memory;
  focusMinsRef.current = focusMins;
  breakMinsRef.current = breakMins;

  // ── Typewriter ──────────────────────────────────────────────────────────────

  const triggerDialogue = useCallback((text: string) => {
    if (!text) return;
    if (typewriterRef.current) clearTimeout(typewriterRef.current);

    setDialogue({ text: "...", visible: true, typing: true });

    const delay = 1000 + Math.random() * 2000;
    typewriterRef.current = setTimeout(() => {
      setDialogue({ text: "", visible: true, typing: false });
      let i = 0;
      const reveal = () => {
        i++;
        setDialogue({ text: text.slice(0, i), visible: true, typing: false });
        if (i < text.length) {
          typewriterRef.current = setTimeout(reveal, 30);
        } else {
          typewriterRef.current = setTimeout(() => {
            setDialogue((prev) => ({ ...prev, visible: false }));
          }, 6000);
        }
      };
      reveal();
    }, delay);
  }, []);

  const triggerContext = useCallback(
    (ctx: Context, forcedText?: string) => {
      const text = forcedText !== undefined ? forcedText : pickResponse(ctx);
      triggerDialogue(text);
    },
    [triggerDialogue],
  );

  // ── On mount ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const mem = loadMemory();
    const { updated, ctx } = processMemoryOnLoad(mem);
    setMemory(updated);
    const text = pickResponse(ctx);
    const finalText = text || responses[ctx][0];
    setTimeout(() => triggerDialogue(finalText), 800);
  }, [triggerDialogue]);

  // ── Timer tick ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode === "running" || mode === "break") {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode]);

  // ── Session complete ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (timeLeft !== 0) return;
    const currentMode = modeRef.current;
    const mem = memoryRef.current;
    const fMins = focusMinsRef.current;
    const bMins = breakMinsRef.current;

    if (currentMode === "running") {
      const updated: Memory = {
        ...mem,
        totalSessions: mem.totalSessions + 1,
        todaySessions: mem.todaySessions + 1,
        streak:
          mem.lastVisit.slice(0, 10) === getYesterday() ||
          mem.lastVisit.slice(0, 10) === getToday()
            ? mem.streak + 1
            : 1,
        todayDate: getToday(),
        lastVisit: new Date().toISOString(),
      };
      setMemory(updated);
      saveMemory(updated);

      const ctx =
        updated.todaySessions >= 3 ? "multi_session" : "session_complete";
      triggerContext(ctx);

      setMode("break");
      setTimeLeft(bMins * 60);
      setTotalDuration(bMins * 60);
      setTimeout(() => triggerContext("break_start"), 3500);
    } else if (currentMode === "break") {
      setMode("idle");
      setTimeLeft(fMins * 60);
      setTotalDuration(fMins * 60);
      triggerContext("break_end");
    }
  }, [timeLeft, triggerContext]);

  // ── Controls ─────────────────────────────────────────────────────────────────

  const handleStart = () => {
    if (mode === "idle" || mode === "paused") {
      setMode("running");
      if (mode === "idle") {
        silenceLockRef.current = false;
        triggerContext("session_start");
      }
    }
  };

  const handlePause = () => {
    if (mode === "running") {
      setMode("paused");
      if (!silenceLockRef.current) {
        silenceLockRef.current = true;
        triggerContext("session_pause");
      }
    }
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const wasRunning = mode === "running" || mode === "paused";
    setMode("idle");
    setTimeLeft(focusMins * 60);
    setTotalDuration(focusMins * 60);
    silenceLockRef.current = false;
    if (wasRunning) triggerContext("session_quit");
  };

  const handleSaveSettings = (focus: number, brk: number) => {
    setFocusMins(focus);
    setBreakMins(brk);
    if (mode === "idle") {
      setTimeLeft(focus * 60);
      setTotalDuration(focus * 60);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const progress = totalDuration > 0 ? timeLeft / totalDuration : 1;
  const mins = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");
  const timeStr = `${mins}:${secs}`;
  const isRunning = mode === "running" || mode === "break";
  const isFocus = mode === "running" || mode === "idle" || mode === "paused";
  const characterImage =
    mode === "break"
      ? "/assets/uploads/8b45e0a1e9a42950603d1d3a859e3354-1-1.jpg"
      : "/assets/uploads/e5840103642d689cf0b1b7daa1e348d0-1.jpg";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.09 0.003 250)" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b"
        style={{
          borderColor: "oklch(0.19 0.007 255 / 0.6)",
          background: "oklch(0.09 0.003 250 / 0.85)",
          backdropFilter: "blur(12px)",
        }}
        data-ocid="app.section"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full animate-blink"
            style={{ background: "oklch(0.72 0.18 155)" }}
          />
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: "oklch(0.72 0.18 155)" }}
          >
            Active now
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div
              className="text-sm font-medium"
              style={{ color: "oklch(0.93 0.004 260)" }}
            >
              Yeon Si-eun
            </div>
            <div className="text-xs" style={{ color: "oklch(0.42 0.006 260)" }}>
              studying
            </div>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              background: "oklch(0.19 0.007 255)",
              color: "oklch(0.72 0.19 52)",
            }}
          >
            Y
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 pb-16">
        {/* ── Character Panel ── */}
        <div
          className="relative w-full max-w-sm mx-auto mt-8"
          style={{ height: 340 }}
        >
          {/* Cinematic vignette */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 90% at 50% 50%, transparent 40%, oklch(0.09 0.003 250 / 0.5) 70%, oklch(0.09 0.003 250 / 0.92) 100%)",
            }}
          />

          {/* Focus session life animations — layered above image, below vignette */}
          {isFocus && (
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
              <FocusAnimationOverlay />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.img
              key={characterImage}
              src={characterImage}
              alt={
                mode === "break"
                  ? "Yeon Si-eun relaxing"
                  : "Yeon Si-eun studying"
              }
              className={`${mode === "break" ? "animate-breathe" : ""} object-contain w-full h-full`}
              style={{ objectPosition: "center bottom" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </AnimatePresence>
        </div>

        {/* ── Dialogue ── */}
        <div className="h-10 flex items-center justify-center mt-4 mb-6">
          <AnimatePresence mode="wait">
            {dialogue.visible && (
              <motion.div
                key={dialogue.typing ? "typing" : dialogue.text}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="text-center"
                data-ocid="app.panel"
              >
                {dialogue.typing ? (
                  <span
                    className="text-sm tracking-[0.12em]"
                    style={{ color: "oklch(0.42 0.006 260)" }}
                  >
                    ...
                  </span>
                ) : (
                  <span
                    className="text-sm font-light tracking-[0.08em]"
                    style={{ color: "oklch(0.85 0.004 260)" }}
                  >
                    {dialogue.text}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Timer ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center"
          data-ocid="timer.section"
        >
          <div
            className="relative rounded-full p-6 flex items-center justify-center"
            style={{
              background: "oklch(0.13 0.005 255)",
              boxShadow:
                mode === "running"
                  ? "0 0 40px oklch(0.72 0.19 52 / 0.2), 0 0 80px oklch(0.72 0.19 52 / 0.08)"
                  : mode === "break"
                    ? "0 0 40px oklch(0.72 0.14 200 / 0.2), 0 0 80px oklch(0.72 0.14 200 / 0.08)"
                    : "none",
            }}
          >
            <CircularTimer
              progress={progress}
              timeStr={timeStr}
              mode={mode}
              isRunning={isRunning}
            />
          </div>

          {/* ── Controls ── */}
          <div className="flex items-center gap-3 mt-8" data-ocid="timer.panel">
            {mode === "running" ? (
              <button
                type="button"
                onClick={handlePause}
                className="px-8 py-3 text-sm font-medium tracking-[0.15em] uppercase border rounded transition-all duration-200 hover:opacity-80"
                style={{
                  borderColor: "oklch(0.72 0.19 52)",
                  color: "oklch(0.72 0.19 52)",
                  background: "transparent",
                }}
                data-ocid="timer.primary_button"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={mode === "break"}
                className="px-8 py-3 text-sm font-medium tracking-[0.15em] uppercase rounded transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: "oklch(0.72 0.19 52)",
                  color: "oklch(0.09 0.003 250)",
                }}
                data-ocid="timer.primary_button"
              >
                {mode === "paused" ? "Resume" : "Start"}
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="p-3 rounded border transition-all duration-200 hover:opacity-80"
              style={{
                borderColor: "oklch(0.19 0.007 255)",
                color: "oklch(0.42 0.006 260)",
                background: "transparent",
              }}
              title="Reset"
              data-ocid="timer.secondary_button"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-3 rounded border transition-all duration-200 hover:opacity-80"
              style={{
                borderColor: "oklch(0.19 0.007 255)",
                color: "oklch(0.42 0.006 260)",
                background: "transparent",
              }}
              title="Settings"
              data-ocid="settings.open_modal_button"
            >
              <Settings size={16} />
            </button>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-5 px-6 border-t flex items-center justify-between"
        style={{
          borderColor: "oklch(0.19 0.007 255 / 0.6)",
          background: "oklch(0.11 0.004 255 / 0.5)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame size={14} style={{ color: "oklch(0.72 0.19 52)" }} />
            <span
              className="text-xs"
              style={{ color: "oklch(0.62 0.008 260)" }}
            >
              <span style={{ color: "oklch(0.93 0.004 260)" }}>
                {memory.streak}
              </span>{" "}
              day streak
            </span>
          </div>
          <div
            className="w-px h-3"
            style={{ background: "oklch(0.19 0.007 255)" }}
          />
          <span className="text-xs" style={{ color: "oklch(0.62 0.008 260)" }}>
            <span style={{ color: "oklch(0.93 0.004 260)" }}>
              {memory.totalSessions}
            </span>{" "}
            sessions
          </span>
          {memory.todaySessions > 0 && (
            <>
              <div
                className="w-px h-3"
                style={{ background: "oklch(0.19 0.007 255)" }}
              />
              <span
                className="text-xs"
                style={{ color: "oklch(0.62 0.008 260)" }}
              >
                <span style={{ color: "oklch(0.93 0.004 260)" }}>
                  {memory.todaySessions}
                </span>{" "}
                today
              </span>
            </>
          )}
        </div>

        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs"
          style={{ color: "oklch(0.32 0.005 260)" }}
        >
          Built with ♥ caffeine.ai
        </a>
      </footer>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        focusMins={focusMins}
        breakMins={breakMins}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
