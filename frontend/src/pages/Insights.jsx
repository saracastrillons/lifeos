import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FlaskConical, Brain, Moon, Target, Gauge } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Area,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from "recharts";
import GlassCard, { rise, stagger } from "../components/GlassCard";
import FocusRing from "../components/FocusRing";
import Status from "../components/Status";
import { AnimatedNumber } from "../components/FX";
import { useApi } from "../hooks/useData";
import { api } from "../api/client";

const tip = { contentStyle: { background: "#0b0d1a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff", fontSize: 12 }, cursor: { fill: "rgba(255,255,255,.05)" } };
const tick = { fill: "rgba(255,255,255,.5)", fontSize: 11 };
const PALETTE = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15"];

// Color divergente para correlaciones: rosa (negativa) ← gris → cian (positiva)
const corrColor = (v) => v >= 0 ? `rgba(34,211,238,${0.08 + Math.abs(v) * 0.85})` : `rgba(244,114,182,${0.08 + Math.abs(v) * 0.85})`;

function Simulator({ ins }) {
  const habits = ins.lifts.map((l) => l.habit);
  const [sleep, setSleep] = useState(ins.baseline.sleep);
  const [on, setOn] = useState(() => new Set(Object.entries(ins.baseline.habits).filter(([, v]) => v).map(([k]) => k)));
  const [res, setRes] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    const n = ++seq.current;
    const t = setTimeout(() => {
      api.post("/simulate", { sleep, habits: [...on] }, { silent: true }).then((r) => n === seq.current && setRes(r));
    }, 120);
    return () => clearTimeout(t);
  }, [sleep, on]);

  const flip = (h) => setOn((s) => { const n = new Set(s); n.has(h) ? n.delete(h) : n.add(h); return n; });
  const preset = (kind) => {
    if (kind === "best") { setSleep(8); setOn(new Set(habits)); }
    if (kind === "worst") { setSleep(5); setOn(new Set()); }
    if (kind === "now") { setSleep(ins.baseline.sleep); setOn(new Set(Object.entries(ins.baseline.habits).filter(([, v]) => v).map(([k]) => k))); }
  };

  return (
    <GlassCard title="Simulador «¿y si…?»" eyebrow="Random Forest en vivo" className="lg:col-span-12"
      action={<div className="flex gap-2">{[["now", "Mi semana"], ["best", "Día ideal"], ["worst", "Día malo"]].map(([k, l]) => <button key={k} className="ghost" onClick={() => preset(k)}>{l}</button>)}</div>}>
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <p className="text-sm text-white/55">Cambia tus variables y el modelo predice tu productividad al instante, con su intervalo de confianza (percentiles 10–90 de los {200} árboles).</p>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-white/70"><Moon size={15} className="text-neon-pink" /> Horas de sueño</span>
              <span className="font-mono text-lg">{sleep.toFixed(1)} h</span>
            </div>
            <input type="range" min="4" max="10" step="0.1" value={sleep} onChange={(e) => setSleep(+e.target.value)} aria-label="Horas de sueño simuladas" />
          </div>
          <div>
            <div className="mb-2 text-sm text-white/70">Hábitos que harías ese día</div>
            <div className="flex flex-wrap gap-2">
              {habits.map((h, i) => (
                <motion.button key={h} whileTap={{ scale: 0.92 }} onClick={() => flip(h)} aria-pressed={on.has(h)}
                  className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition"
                  style={on.has(h) ? { borderColor: PALETTE[i % 6], background: PALETTE[i % 6] + "22", boxShadow: `0 0 18px -4px ${PALETTE[i % 6]}` } : { borderColor: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.55)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: on.has(h) ? PALETTE[i % 6] : "rgba(255,255,255,.25)" }} />{h}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <FocusRing value={res?.prediction ?? 0} size={210} label="Productividad">
            <div>
              <div className="text-5xl font-semibold tabular"><AnimatedNumber value={res?.prediction} /></div>
              <div className="font-mono text-[11px] text-white/45">{res ? `${Math.round(res.low)}–${Math.round(res.high)}` : "…"} · IC 80%</div>
            </div>
          </FocusRing>
          <AnimatePresence mode="wait">
            {res && (
              <motion.div key={Math.sign(res.vs_avg)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`mt-2 rounded-full px-3 py-1 font-mono text-xs ${res.vs_avg >= 0 ? "bg-emerald-400/10 text-neon-lime" : "bg-pink-400/10 text-neon-pink"}`}>
                {res.vs_avg >= 0 ? "+" : ""}{res.vs_avg} vs. tu media · HRV estimado {res.hrv}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}

function CorrelationMatrix({ corr }) {
  const [hl, setHl] = useState(null);
  const n = corr.labels.length;
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[420px] gap-[3px]" style={{ gridTemplateColumns: `110px repeat(${n}, minmax(0,1fr))` }} onMouseLeave={() => setHl(null)}>
          <div />
          {corr.labels.map((l, j) => <div key={l} className={`truncate pb-1 text-center text-[10px] ${hl?.[1] === j ? "text-white" : "text-white/40"}`} title={l}>{l.split(" ")[0]}</div>)}
          {corr.values.map((rowv, i) => [
            <div key={`l${i}`} className={`truncate pr-2 text-right text-[11px] leading-7 ${hl?.[0] === i ? "text-white" : "text-white/50"}`}>{corr.labels[i]}</div>,
            ...rowv.map((v, j) => (
              <motion.div key={`${i}-${j}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (i + j) * 0.02 }}
                onMouseEnter={() => setHl([i, j])}
                className="grid h-7 place-items-center rounded-md font-mono text-[10px] transition"
                style={{ background: corrColor(v), color: Math.abs(v) > 0.45 ? "#05060d" : "rgba(255,255,255,.6)", outline: hl && (hl[0] === i || hl[1] === j) ? "1px solid rgba(255,255,255,.25)" : "none" }}>
                {i === j ? "" : v.toFixed(2).replace("0.", ".")}
              </motion.div>
            )),
          ])}
        </div>
      </div>
      <p className="mt-3 h-4 text-xs text-white/50">
        {hl && hl[0] !== hl[1]
          ? <>«{corr.labels[hl[0]]}» y «{corr.labels[hl[1]]}»: r = <b className="text-white">{corr.values[hl[0]][hl[1]]}</b></>
          : "Coeficiente de Pearson entre cada par de variables. Pasa el cursor por una celda."}
      </p>
    </div>
  );
}

export default function Insights() {
  const { data: d, error } = useApi("/insights");
  if (!d) return <Status error={error} />;
  if (!d.ready) return <GlassCard>Necesitas al menos {d.needed} días de datos para descubrir patrones (llevas {d.days}).</GlassCard>;
  const best = Math.max(...d.weekdays.map((w) => w.score));
  const m = d.metrics;
  const gain = Math.round(100 * (1 - m.mae / m.baseline_mae));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={rise} className="ring-anim glass flex items-start gap-4 rounded-3xl p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-400/15"><Sparkles className="text-neon-violet" /></div>
        <div>
          <p className="text-lg font-medium text-grad-anim md:text-xl">{d.headline}</p>
          <p className="mt-1 text-sm text-white/60">Tu mejor día suele ser el <b className="text-white/80">{d.best_day}</b>. Correlación sueño ↔ productividad: <b className="text-white/80">{d.sleep_corr}</b>. Promedio general: <b className="text-white/80">{d.avg_score}/100</b>.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[
          [Gauge, "R² (validación cruzada)", m.r2.toFixed(2), `${m.folds}-fold sobre ${m.n_days} días`, "#22d3ee"],
          [Target, "Error medio (MAE)", `±${m.mae}`, `Línea base: ±${m.baseline_mae}`, "#a78bfa"],
          [Brain, "Mejora vs. adivinar", `${gain}%`, "Menos error que predecir la media", "#34d399"],
          [FlaskConical, "Variables", m.n_features, "Sueño, HRV y cada hábito", "#f472b6"],
        ].map(([I, l, v, s, c]) => (
          <GlassCard key={l} className="!p-4">
            <I size={18} color={c} />
            <div className="mt-3 font-mono text-2xl font-semibold">{v}</div>
            <div className="text-xs text-white/60">{l}</div>
            <div className="mt-1 text-[11px] text-white/35">{s}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Simulator ins={d} />

        <GlassCard title="Qué hábitos elevan tu productividad" eyebrow="Puntos extra cuando lo haces" className="lg:col-span-7">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.lifts} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="habit" width={160} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip {...tip} formatter={(v, _, p) => [`${v > 0 ? "+" : ""}${v} puntos · r=${p.payload.corr} · lo cumples el ${p.payload.rate}%`, "Efecto"]} />
              <Bar dataKey="lift" radius={8} label={{ position: "right", fill: "rgba(255,255,255,.6)", fontSize: 11, formatter: (v) => (v > 0 ? `+${v}` : v) }}>
                {d.lifts.map((_, i) => <Cell key={i} fill={PALETTE[i % 6]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard title="Proyección para mañana" eyebrow="Basada en tus últimos 7 días" className="lg:col-span-5">
          <div className="flex flex-col items-center gap-3">
            <FocusRing value={d.prediction} label="Productividad" />
            <p className="text-center text-xs text-white/50">Error típico ±{m.mae} puntos medido en días que el modelo no vio durante el entrenamiento.</p>
          </div>
        </GlassCard>

        <GlassCard title="Tendencia" eyebrow="Diario vs. media móvil 7 días" className="lg:col-span-12">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={d.trend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a78bfa" stopOpacity=".35" /><stop offset="1" stopColor="#a78bfa" stopOpacity="0" /></linearGradient>
              </defs>
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={6} />
              <YAxis domain={[20, 100]} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip {...tip} cursor={{ stroke: "rgba(255,255,255,.2)" }} />
              <ReferenceLine y={d.avg_score} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />
              <Area dataKey="score" name="Diario" stroke="rgba(167,139,250,.6)" strokeWidth={1} fill="url(#tr)" />
              <Line dataKey="avg" name="Media 7d" stroke="#22d3ee" strokeWidth={2.5} dot={false} style={{ filter: "drop-shadow(0 0 6px #22d3ee)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard title="Matriz de correlación" eyebrow="Pearson · pandas" className="lg:col-span-7">
          <CorrelationMatrix corr={d.correlation} />
        </GlassCard>

        <GlassCard title="Sueño vs. productividad" eyebrow={`r = ${d.sleep_corr}`} className="lg:col-span-5">
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ left: -20, right: 8, top: 8 }}>
              <XAxis type="number" dataKey="sleep" name="Sueño" unit="h" domain={[4, 10]} tick={tick} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="score" name="Productividad" domain={[20, 100]} tick={tick} axisLine={false} tickLine={false} />
              <ZAxis range={[28, 28]} />
              <Tooltip {...tip} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={d.scatter} fill="#f472b6" fillOpacity={0.55} />
            </ScatterChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard title="Productividad por día de la semana" className="lg:col-span-7">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.weekdays}>
              <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip {...tip} formatter={(v) => [`${v}/100`, "Promedio"]} />
              <Bar dataKey="score" radius={8}>{d.weekdays.map((w, i) => <Cell key={i} fill={w.score === best ? "#22d3ee" : "rgba(167,139,250,.45)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard title="Qué pesa más en el modelo" eyebrow="Feature importance" className="lg:col-span-5">
          <div className="space-y-3">
            {d.importance.slice(0, 7).map((f, i) => (
              <div key={f.feature}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-white/70">{f.feature}</span><span className="font-mono text-white/50">{f.weight}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min((f.weight / d.importance[0].weight) * 100, 100)}%` }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.9 }} style={{ background: "linear-gradient(90deg,#22d3ee,#f472b6)" }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
