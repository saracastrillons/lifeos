import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Plus, Trash2, Check, Maximize2, Crosshair } from "lucide-react";
import GlassCard, { stagger } from "../components/GlassCard";
import FocusRing from "../components/FocusRing";
import Status from "../components/Status";
import { useApi } from "../hooks/useData";
import { api } from "../api/client";
import { toast, celebrate } from "../lib/bus";
import { timer, useTimer, clock } from "../lib/timer";

const PRESETS = [[25, "Pomodoro"], [50, "Profundo"], [90, "Ultra"]];
const PRI = { alta: "#f472b6", media: "#22d3ee", baja: "#34d399" };
const ORDER = { alta: 0, media: 1, baja: 2 };

export default function Productivity() {
  const { data, error } = useApi("/tasks");
  const t = useTimer();
  const [title, setTitle] = useState("");
  const [pri, setPri] = useState("media");
  const [filter, setFilter] = useState("todas");

  if (!data) return <Status error={error} layout="block" />;
  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post("/tasks", { title, priority: pri });
    setTitle("");
  };
  const complete = async (task, e) => {
    const r = e.currentTarget.getBoundingClientRect();
    await api.patch(`/tasks/${task.id}`, { done: !task.done });
    if (!task.done) {
      celebrate({ x: r.x, y: r.y, n: 40 });
      toast(`+25 XP · ${task.title}`, "xp");
    }
  };
  const list = data
    .filter((x) => filter === "todas" || (filter === "pendientes" ? !x.done : x.done))
    .sort((a, b) => a.done - b.done || ORDER[a.priority] - ORDER[b.priority]);
  const pending = data.filter((x) => !x.done).length;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-5 lg:grid-cols-5">
      <GlassCard title="Sesión de enfoque" eyebrow={t.running ? "En curso" : "Preparado"} className="lg:col-span-2"
        action={t.running && <button className="ghost flex items-center gap-1" onClick={() => timer.zen(true)}><Maximize2 size={12} /> Zen</button>}>
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="flex gap-2" role="radiogroup" aria-label="Duración">
            {PRESETS.map(([m, l]) => (
              <button key={m} role="radio" aria-checked={t.minutes === m} aria-pressed={t.minutes === m} disabled={t.running}
                onClick={() => timer.setMinutes(m)} className="ghost disabled:opacity-40">
                <span className="font-mono">{m}′</span> {l}
              </button>
            ))}
          </div>
          <FocusRing size={240} value={t.progress}>
            <div>
              <div className="font-mono text-5xl font-medium tabular">{clock(t.left)}</div>
              <div className="mt-1 text-xs text-white/50">{t.running ? "En flujo…" : "Listo para empezar"}</div>
            </div>
          </FocusRing>
          {t.task && (
            <div className="flex items-center gap-2 rounded-full bg-white/[.06] px-3 py-1 text-xs text-white/70">
              <Crosshair size={12} className="text-neon-cyan" /> {t.task}
              {!t.running && <button aria-label="Quitar tarea" className="text-white/40 hover:text-white" onClick={() => timer.setTask(null)}>×</button>}
            </div>
          )}
          <div className="flex gap-2">
            {t.running ? (
              <>
                <button className="btn flex items-center gap-2" onClick={() => timer.finish()}><Square size={15} /> Terminar y guardar</button>
                <button className="ghost flex items-center gap-1 !text-sm" onClick={() => timer.zen(true)}><Maximize2 size={14} /> Zen</button>
              </>
            ) : (
              <button className="btn flex items-center gap-2" onClick={() => { timer.start(); timer.zen(true); }}><Play size={15} /> Iniciar {t.minutes} min</button>
            )}
          </div>
          <p className="text-center text-[11px] text-white/35">Al iniciar entras en modo zen. El temporizador sigue aunque cambies de sección.</p>
        </div>
      </GlassCard>

      <GlassCard title="Tareas" eyebrow={`${pending} pendientes`} className="lg:col-span-3"
        action={<div className="flex gap-1">{["todas", "pendientes", "hechas"].map((f) => <button key={f} className="ghost capitalize" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>}>
        <form onSubmit={add} className="mb-4 flex gap-2">
          <input className="field min-w-0 flex-1" placeholder="Nueva tarea…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="field" value={pri} onChange={(e) => setPri(e.target.value)} aria-label="Prioridad">
            <option className="bg-[#0b0d1a]">alta</option><option className="bg-[#0b0d1a]">media</option><option className="bg-[#0b0d1a]">baja</option>
          </select>
          <button className="btn" aria-label="Añadir tarea"><Plus size={16} /></button>
        </form>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {list.map((x) => (
              <motion.li key={x.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }}
                className="group flex items-center gap-3 rounded-2xl bg-white/[.04] px-3 py-2.5 transition hover:bg-white/[.07]">
                <motion.button whileTap={{ scale: 0.8 }} aria-label={x.done ? "Marcar pendiente" : "Completar"} onClick={(e) => complete(x, e)}
                  className="grid h-5 w-5 place-items-center rounded-md border border-white/25" style={x.done ? { background: "#22d3ee", borderColor: "#22d3ee" } : undefined}>
                  {x.done && <Check size={13} color="#05060d" strokeWidth={3} />}
                </motion.button>
                <span className={`flex-1 text-sm transition ${x.done ? "text-white/30 line-through" : ""}`}>{x.title}</span>
                {!x.done && !t.running && (
                  <button className="ghost opacity-0 transition group-hover:opacity-100" onClick={() => { timer.setTask(x.title); toast(`Enfoque fijado en «${x.title}»`); }}>
                    <Crosshair size={12} className="inline" /> Enfocar
                  </button>
                )}
                <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ color: PRI[x.priority], background: PRI[x.priority] + "1a" }}>{x.priority}</span>
                <button aria-label="Eliminar" className="text-white/30 opacity-0 transition hover:text-neon-pink group-hover:opacity-100" onClick={() => api.del(`/tasks/${x.id}`)}><Trash2 size={15} /></button>
              </motion.li>
            ))}
          </AnimatePresence>
          {!list.length && <li className="py-6 text-center text-sm text-white/40">Nada por aquí. Escribe la primera tarea arriba.</li>}
        </ul>
      </GlassCard>
    </motion.div>
  );
}
