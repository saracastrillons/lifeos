import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, Flame, Trophy } from "lucide-react";
import GlassCard, { rise, stagger } from "../components/GlassCard";
import HabitGrid from "../components/HabitGrid";
import Status from "../components/Status";
import { useApi } from "../hooks/useData";
import { api } from "../api/client";
import { toast } from "../lib/bus";

const COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15"];

export default function Habits() {
  const { data, error } = useApi("/habits?days=14");
  const { data: month } = useApi("/habits?days=35");
  const [name, setName] = useState("");
  const [color, setColor] = useState(null);
  if (!data) return <Status error={error} layout="block" />;
  const pick = color ?? COLORS[data.habits.length % COLORS.length];
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/habits", { name, color: pick });
    toast(`Hábito «${name}» creado`);
    setName(""); setColor(null);
  };
  const remove = async (h) => {
    if (!confirm(`¿Eliminar «${h.name}» y todo su historial?`)) return;
    await api.del(`/habits/${h.id}`);
    toast(`«${h.name}» eliminado`);
  };
  const best = data.habits.reduce((a, h) => (h.streak > (a?.streak ?? -1) ? h : a), null);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <GlassCard title="Matriz de hábitos · 14 días" eyebrow="Toca cualquier día para corregirlo">
        <HabitGrid data={data} />
      </GlassCard>

      <motion.form variants={rise} onSubmit={add} className="glass flex flex-wrap items-center gap-3 rounded-3xl p-4">
        <input className="field min-w-[200px] flex-1" placeholder="Nuevo hábito, por ejemplo: Beber 2 L de agua" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-1.5" role="radiogroup" aria-label="Color">
          {COLORS.map((c) => (
            <button type="button" key={c} role="radio" aria-checked={pick === c} aria-label={c} onClick={() => setColor(c)}
              className="h-7 w-7 rounded-full transition hover:scale-110"
              style={{ background: c, boxShadow: pick === c ? `0 0 0 2px #05060d, 0 0 0 4px ${c}, 0 0 14px ${c}` : "none" }} />
          ))}
        </div>
        <button className="btn flex items-center gap-1"><Plus size={16} /> Añadir</button>
      </motion.form>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.habits.map((h) => {
          const strip = month?.habits.find((m) => m.id === h.id)?.flags ?? [];
          return (
            <GlassCard key={h.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-3 rounded-full" style={{ background: h.color, boxShadow: `0 0 10px ${h.color}` }} />{h.name}
                  {best?.id === h.id && h.streak > 1 && <Trophy size={14} className="text-yellow-300" aria-label="Mejor racha" />}
                </div>
                <button aria-label={`Eliminar ${h.name}`} className="text-white/30 hover:text-neon-pink" onClick={() => remove(h)}><Trash2 size={16} /></button>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <motion.span animate={h.streak >= 3 ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}>
                    <Flame size={22} className="text-neon-amber" style={{ filter: h.streak >= 3 ? "drop-shadow(0 0 8px #fb923c)" : "none" }} />
                  </motion.span>
                  <span className="text-3xl font-semibold tabular">{h.streak}</span>
                  <span className="text-xs text-white/45">días seguidos</span>
                </div>
                <span className="font-mono text-sm text-white/60">{h.rate}%</span>
              </div>
              <div className="mt-4 grid grid-cols-[repeat(35,minmax(0,1fr))] gap-[2px]" aria-label="Últimos 35 días">
                {strip.map((f, i) => (
                  <span key={i} className="aspect-[1/2.2] rounded-[2px]" style={{ background: f ? h.color : "rgba(255,255,255,.06)", opacity: f ? 0.45 + (i / 35) * 0.55 : 1 }} />
                ))}
              </div>
              <div className="mt-1.5 text-[11px] text-white/35">Últimos 35 días · {h.rate}% de cumplimiento en 14 días</div>
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}
