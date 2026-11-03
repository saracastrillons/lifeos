import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Flame, Target, GraduationCap, Timer, Sparkles, Hexagon, Zap } from "lucide-react";
import { useApi } from "../hooks/useData";
import { useTimer, timer, clock } from "../lib/timer";
import { toast, celebrate } from "../lib/bus";

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "habits", label: "Hábitos", icon: Flame },
  { id: "goals", label: "Objetivos", icon: Target },
  { id: "learning", label: "Aprendizaje", icon: GraduationCap },
  { id: "productivity", label: "Productividad", icon: Timer },
  { id: "insights", label: "Insights", icon: Sparkles },
];

function LevelCard() {
  const { data } = useApi("/stats");
  const last = useRef(null);
  useEffect(() => {
    if (!data) return;
    if (last.current && data.level.level > last.current) {
      celebrate({ n: 260 });
      toast(`¡Subiste a nivel ${data.level.level}!`, "xp");
    }
    last.current = data.level.level;
  }, [data]);
  if (!data) return <div className="skeleton h-[92px] !rounded-2xl" />;
  const { level, xp, progress, next } = data.level;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl font-mono text-sm font-semibold text-[#05060d]"
            style={{ background: "linear-gradient(135deg,#22d3ee,#a78bfa)", boxShadow: "0 0 16px #a78bfa88" }}>{level}</div>
          <div>
            <div className="text-xs font-medium">Nivel {level}</div>
            <div className="font-mono text-[10px] text-white/40">{xp.toLocaleString("es")} XP</div>
          </div>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs text-neon-amber"><Flame size={13} />{data.streak}</div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }}
          style={{ background: "linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6)" }} />
      </div>
      <div className="mt-1 text-[10px] text-white/35">{next} XP para el nivel {level + 1}</div>
    </div>
  );
}

function MiniTimer({ setView }) {
  const t = useTimer();
  if (!t.running) return null;
  return (
    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => timer.zen(true)}
      className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-left">
      <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-60" /><span className="h-2.5 w-2.5 rounded-full bg-neon-cyan" /></span>
      <div className="flex-1">
        <div className="text-[10px] text-white/50">Sesión en curso</div>
        <div className="font-mono text-lg leading-tight">{clock(t.left)}</div>
      </div>
      <Zap size={16} className="text-neon-cyan" />
    </motion.button>
  );
}

export default function Sidebar({ view, setView }) {
  return (
    <>
      <aside className="glass fixed bottom-4 left-4 top-4 z-20 hidden w-60 flex-col rounded-3xl p-4 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <motion.div whileHover={{ rotate: 180 }} transition={{ type: "spring", stiffness: 200 }}>
            <Hexagon className="text-neon-cyan" style={{ filter: "drop-shadow(0 0 8px #22d3ee)" }} />
          </motion.div>
          <span className="text-xl font-semibold tracking-tight text-grad">LifeOS</span>
          <span className="ml-auto rounded-md border border-white/10 px-1.5 font-mono text-[9px] text-white/40">v2</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }, i) => (
            <button key={id} onClick={() => setView(id)}
              className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${view === id ? "text-white" : "text-white/50 hover:text-white/85"}`}>
              {view === id && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[.07]"
                  style={{ boxShadow: "0 0 24px -6px #22d3ee" }} transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <Icon size={18} className={`relative transition ${view === id ? "text-neon-cyan" : "group-hover:scale-110"}`} />
              <span className="relative">{label}</span>
              <span className="kbd relative ml-auto opacity-0 transition group-hover:opacity-100">{i + 1}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <MiniTimer setView={setView} />
          <LevelCard />
        </div>
      </aside>
      <nav className="glass fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-2xl p-2 md:hidden">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-label={label} onClick={() => setView(id)}
            className={`rounded-xl p-2.5 transition ${view === id ? "bg-white/10 text-neon-cyan" : "text-white/50"}`}>
            <Icon size={20} />
          </button>
        ))}
      </nav>
    </>
  );
}
