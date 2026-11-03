import { motion } from "framer-motion";
import { Flame, Timer, CheckCircle2, Sparkles, Check, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import GlassCard, { rise, stagger } from "../components/GlassCard";
import FocusRing from "../components/FocusRing";
import HabitGrid from "../components/HabitGrid";
import BiometricChart from "../components/BiometricChart";
import Heatmap from "../components/Heatmap";
import CheckinCard from "../components/CheckinCard";
import Status from "../components/Status";
import { AnimatedNumber, Sparkline } from "../components/FX";
import { useApi } from "../hooks/useData";
import { api } from "../api/client";
import { toast } from "../lib/bus";

export const fmt = (m) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, "0")}m`;

function Stat({ icon: I, label, value, sub, color, spark, delta, children }) {
  return (
    <GlassCard className="!p-4">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: color + "1f", boxShadow: `0 0 24px ${color}40` }}>
          <I size={19} color={color} />
        </div>
        {delta != null && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${delta >= 0 ? "bg-emerald-400/10 text-neon-lime" : "bg-pink-400/10 text-neon-pink"}`}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
      <div className="mt-3 text-xs text-white/50">{label}</div>
      <div className="text-2xl font-semibold tabular">{value}</div>
      <div className="mt-2 flex h-[34px] items-end">{spark ? <Sparkline data={spark} color={color} /> : children}</div>
      <div className="mt-1 text-[11px] text-white/35">{sub}</div>
    </GlassCard>
  );
}

export default function Dashboard({ go }) {
  const { data: d, error } = useApi("/dashboard");
  const { data: heat } = useApi("/heatmap?days=182");
  if (!d) return <Status error={error} />;
  const pending = d.tasks.filter((t) => !t.done);
  const doneCount = d.tasks.length - pending.length;
  const toggleTask = (t) => api.patch(`/tasks/${t.id}`, { done: !t.done }).then(() => !t.done && toast(`+25 XP · ${t.title}`, "xp"));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.button variants={rise} onClick={() => go("insights")}
        className="ring-anim glass group flex w-full items-center gap-4 rounded-3xl p-4 text-left">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-400/15">
          <Sparkles className="text-neon-violet" size={19} />
        </div>
        <div className="flex-1">
          <div className="eyebrow">Insight del modelo</div>
          <p className="text-sm text-white/85 md:text-base">{d.insight.headline}</p>
        </div>
        <ArrowRight size={18} className="text-white/40 transition group-hover:translate-x-1 group-hover:text-white" />
      </motion.button>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat icon={Flame} label="Racha" value={<><AnimatedNumber value={d.streak} /> días</>} sub="≥50% de hábitos al día" color="#fb923c" spark={d.sparks.habits} />
        <Stat icon={Timer} label="Trabajo profundo hoy" value={<AnimatedNumber value={d.focus.deep_minutes} format={fmt} />} sub="Últimos 14 días" color="#22d3ee" spark={d.sparks.deep} />
        <Stat icon={CheckCircle2} label="Tareas" value={<><AnimatedNumber value={doneCount} />/{d.tasks.length}</>} sub="Completadas" color="#34d399">
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-neon-lime" initial={{ width: 0 }} animate={{ width: `${(100 * doneCount) / (d.tasks.length || 1)}%` }} style={{ boxShadow: "0 0 10px #34d399" }} /></div>
        </Stat>
        <Stat icon={Sparkles} label="Productividad semanal" value={<AnimatedNumber value={d.week.avg} decimals={1} />} sub={`Mañana: ${d.insight.prediction ?? "–"} según el modelo`} color="#a78bfa" spark={d.sparks.productivity} delta={d.week.delta} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard title="Enfoque" eyebrow="Ahora" className="lg:col-span-4">
          <div className="flex items-center gap-5">
            <FocusRing value={d.focus.score} size={170} />
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-white/40">Estado de flujo</dt><dd className="text-lg font-medium text-neon-cyan">{d.focus.flow}</dd></div>
              <div><dt className="text-xs text-white/40">Hábitos hoy</dt><dd className="text-lg font-medium tabular">{d.habits_today.done}/{d.habits_today.total}</dd></div>
              <div><button className="ghost" onClick={() => go("productivity")}>Iniciar sesión →</button></div>
            </dl>
          </div>
        </GlassCard>

        <GlassCard title="Hábitos · esta semana" eyebrow="Toca para marcar" className="lg:col-span-8">
          <HabitGrid data={d.grid} />
        </GlassCard>

        <GlassCard title="Mapa de productividad · 6 meses" eyebrow="Historial" className="lg:col-span-8">
          {heat ? <Heatmap data={heat} /> : <div className="skeleton h-32" />}
        </GlassCard>

        <CheckinCard key={d.checkin ? "done" : "todo"} checkin={d.checkin} />

        <GlassCard title="Biométricos · 14 días" eyebrow="HRV y sueño" className="lg:col-span-8"
          action={<div className="flex gap-3 text-xs text-white/50"><span className="text-neon-cyan">● HRV</span><span className="text-neon-pink">● Sueño</span></div>}>
          <BiometricChart data={d.biometrics} />
        </GlassCard>

        <div className="space-y-5 lg:col-span-4">
          <GlassCard title="Objetivos" action={<button className="ghost" onClick={() => go("goals")}>Ver todos</button>}>
            <div className="space-y-3">
              {d.goals.map((g, i) => (
                <div key={g.id}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-white/70">{g.title}</span><span className="font-mono text-white/50">{Math.round(g.progress)}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${g.progress}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 1, ease: [0.16, 1, 0.3, 1] }} style={{ background: "linear-gradient(90deg,#22d3ee,#a78bfa)" }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard title="Tareas pendientes" action={<span className="font-mono text-xs text-white/40">{pending.length}</span>}>
            <ul className="space-y-1">
              {pending.slice(0, 5).map((t) => (
                <motion.li key={t.id} layout>
                  <button onClick={() => toggleTask(t)} className="group flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left text-sm text-white/80 hover:text-white">
                    <span className="grid h-5 w-5 place-items-center rounded-md border border-white/20 transition group-hover:border-neon-cyan">
                      <Check size={12} className="opacity-0 transition group-hover:opacity-60" />
                    </span>{t.title}
                  </button>
                </motion.li>
              ))}
              {!pending.length && <li className="text-sm text-white/40">Todo al día. ✨</li>}
            </ul>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
