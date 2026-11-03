import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, animate } from "framer-motion";
import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { on } from "../lib/bus";

const ICON = { ok: CheckCircle2, error: AlertTriangle, xp: Sparkles };
const TONE = { ok: "#34d399", error: "#f472b6", xp: "#a78bfa" };

export function Toaster() {
  const [list, setList] = useState([]);
  useEffect(() => on("toast", (t) => {
    setList((l) => [...l.slice(-3), t]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 3200);
  }), []);
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => {
          const I = ICON[t.kind] || CheckCircle2;
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }} className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm"
              style={{ boxShadow: `0 10px 40px -10px ${TONE[t.kind]}66` }}>
              <I size={18} color={TONE[t.kind]} className="shrink-0" />{t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Confeti hecho a mano con canvas: sin dependencias, física simple con gravedad y rotación.
export function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d");
    let parts = [], raf = 0;
    const colors = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15"];
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      parts = parts.filter((p) => p.life > 0);
      for (const p of parts) {
        p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.min(1, p.life / 40); ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    };
    const off = on("confetti", ({ x = innerWidth / 2, y = innerHeight / 2, n = 140 } = {}) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      c.width = innerWidth; c.height = innerHeight;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[i % colors.length], life: 90 + Math.random() * 60 });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    return () => { off(); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[80]" />;
}

export function AnimatedNumber({ value, decimals = 0, format }) {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const a = animate(prev.current, value ?? 0, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setN });
    prev.current = value ?? 0;
    return () => a.stop();
  }, [value]);
  if (value == null) return "–";
  return format ? format(n) : n.toFixed(decimals);
}

export function Sparkline({ data, color = "#22d3ee", height = 34 }) {
  const vals = (data || []).filter((v) => v != null);
  if (vals.length < 2) return null;
  const w = 120, min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const id = `sp${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="2.5" fill={color} />
    </svg>
  );
}

// Escribe texto carácter a carácter (para respuestas de la IA y el arranque).
export function useTypewriter(text, speed = 14, enabled = true) {
  const [out, setOut] = useState(enabled ? "" : text);
  useEffect(() => {
    if (!enabled) { setOut(text); return; }
    let i = 0;
    setOut("");
    const id = setInterval(() => { i += 2; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text, speed, enabled]);
  return out;
}
