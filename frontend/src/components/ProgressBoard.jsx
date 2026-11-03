import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, CalendarClock, Clock, Trophy } from "lucide-react";
import GlassCard, { rise, stagger } from "./GlassCard";
import Status from "./Status";
import { useApi } from "../hooks/useData";
import { api } from "../api/client";
import { celebrate, toast } from "../lib/bus";

const CAT_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15"];
const catColor = (c) => CAT_COLORS[[...c].reduce((a, ch) => a + ch.charCodeAt(0), 0) % CAT_COLORS.length];

function Item({ it, path, withHours }) {
  const [p, setP] = useState(it.progress);
  const color = catColor(it.category);
  const save = async (e) => {
    if (p === it.progress) return;
    const r = e.currentTarget.getBoundingClientRect();
    await api.patch(`${path}/${it.id}`, { progress: p });
    if (p === 100 && it.progress < 100) {
      celebrate({ x: r.x + r.width / 2, y: r.y, n: 200 });
      toast(`¡Completado! «${it.title}»`, "xp");
    }
  };
  const days = it.target_date ? Math.ceil((new Date(it.target_date + "T00:00") - new Date()) / 864e5) : null;
  const done = p >= 100;
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">{done && <Trophy size={15} className="text-yellow-300" />}{it.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full px-2 py-0.5" style={{ color, background: color + "1a" }}>{it.category}</span>
            {days != null && (
              <span className={`flex items-center gap-1 ${days < 14 ? "text-neon-amber" : "text-white/40"}`}>
                <CalendarClock size={12} /> {days >= 0 ? `${days} días restantes` : `vencido hace ${-days} días`}
              </span>
            )}
            {withHours && <span className="flex items-center gap-1 text-white/40"><Clock size={12} /> {it.hours} h</span>}
          </div>
        </div>
        <button aria-label="Eliminar" className="text-white/30 hover:text-neon-pink" onClick={() => api.del(`${path}/${it.id}`)}>
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-5 flex items-end justify-between">
        <span className="text-4xl font-semibold tabular">{Math.round(p)}<span className="text-lg text-white/40">%</span></span>
        {withHours && <button className="ghost" onClick={() => api.patch(`${path}/${it.id}`, { hours: it.hours + 1 }).then(() => toast(`+1 h en «${it.title}»`))}>+1 h estudiada</button>}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full" style={{ background: done ? "linear-gradient(90deg,#34d399,#facc15)" : "linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6)", boxShadow: "0 0 14px #a78bfa" }}
          initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <input className="mt-4" type="range" min="0" max="100" value={p} aria-label={`Progreso de ${it.title}`} onChange={(e) => setP(+e.target.value)} onPointerUp={save} onKeyUp={save} />
    </GlassCard>
  );
}

export default function ProgressBoard({ path, placeholder, withHours }) {
  const { data, error } = useApi(path);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("");
  const [date, setDate] = useState("");
  if (!data) return <Status error={error} layout="block" />;
  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post(path, { title, category: cat || "General", ...(date && !withHours ? { target_date: date } : {}) });
    toast(`«${title}» añadido`);
    setTitle(""); setCat(""); setDate("");
  };
  const avg = data.length ? Math.round(data.reduce((a, x) => a + x.progress, 0) / data.length) : 0;
  const hours = data.reduce((a, x) => a + (x.hours || 0), 0);
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <div className="grid grid-cols-3 gap-5">
        {[["Activos", data.filter((x) => x.progress < 100).length], ["Progreso medio", `${avg}%`], withHours ? ["Horas totales", hours] : ["Completados", data.filter((x) => x.progress >= 100).length]].map(([l, v]) => (
          <GlassCard key={l} className="!p-4"><div className="text-xs text-white/45">{l}</div><div className="mt-1 font-mono text-2xl">{v}</div></GlassCard>
        ))}
      </div>
      <motion.form variants={rise} onSubmit={add} className="glass flex flex-wrap gap-3 rounded-3xl p-4">
        <input className="field min-w-[220px] flex-1" placeholder={placeholder} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field w-40" placeholder="Categoría" value={cat} onChange={(e) => setCat(e.target.value)} />
        {!withHours && <input className="field w-44" type="date" aria-label="Fecha objetivo" value={date} onChange={(e) => setDate(e.target.value)} />}
        <button className="btn flex items-center gap-1"><Plus size={16} /> Añadir</button>
      </motion.form>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.map((it) => <Item key={it.id} it={it} path={path} withHours={withHours} />)}
      </div>
    </motion.div>
  );
}
