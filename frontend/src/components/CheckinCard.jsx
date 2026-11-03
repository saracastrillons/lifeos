import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Zap, CheckCircle2, Pencil } from "lucide-react";
import GlassCard from "./GlassCard";
import { api } from "../api/client";
import { celebrate, toast } from "../lib/bus";

const MOODS = [[30, "😫"], [50, "😕"], [65, "🙂"], [80, "😄"], [95, "🚀"]];

// Check-in diario: alimenta al modelo de ML con datos reales cada día.
export default function CheckinCard({ checkin }) {
  const [edit, setEdit] = useState(!checkin);
  const [sleep, setSleep] = useState(checkin?.sleep ?? 7);
  const [prod, setProd] = useState(checkin?.productivity ?? 65);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    setBusy(true);
    const r = e.currentTarget.getBoundingClientRect();
    try {
      await api.post("/checkin", { sleep, productivity: prod });
      celebrate({ x: r.x + r.width / 2, y: r.y, n: 90 });
      toast("Check-in guardado · el modelo se reentrena con tus datos", "xp");
      setEdit(false);
    } catch (err) { toast(err.message, "error"); }
    setBusy(false);
  };

  return (
    <GlassCard title="Check-in de hoy" eyebrow="Diario" className="lg:col-span-4"
      action={!edit && <button className="ghost flex items-center gap-1" onClick={() => setEdit(true)}><Pencil size={12} /> Editar</button>}>
      <AnimatePresence mode="wait">
        {edit ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/70"><Moon size={15} className="text-neon-pink" /> Horas de sueño</span>
                <span className="font-mono text-lg tabular">{sleep.toFixed(1)}h</span>
              </div>
              <input type="range" min="3" max="11" step="0.5" value={sleep} onChange={(e) => setSleep(+e.target.value)} aria-label="Horas de sueño" />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-white/70"><Zap size={15} className="text-neon-amber" /> ¿Qué tan productivo fue tu día?</div>
              <div className="flex justify-between gap-2">
                {MOODS.map(([v, e]) => (
                  <motion.button key={v} whileTap={{ scale: 0.85 }} onClick={() => setProd(v)} aria-label={`Productividad ${v}`} aria-pressed={prod === v}
                    className={`grid h-12 flex-1 place-items-center rounded-2xl text-2xl transition ${prod === v ? "bg-white/15 ring-1 ring-neon-cyan" : "bg-white/[.04] grayscale-[60%] hover:grayscale-0"}`}>{e}</motion.button>
                ))}
              </div>
            </div>
            <button className="btn w-full" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar check-in"}</button>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4">
            <CheckCircle2 size={40} className="text-neon-lime" style={{ filter: "drop-shadow(0 0 10px #34d399)" }} />
            <div className="grid flex-1 grid-cols-3 gap-2 text-center">
              {[["Sueño", `${checkin?.sleep ?? sleep}h`], ["Product.", Math.round(checkin?.productivity ?? prod)], ["HRV", checkin?.hrv ? Math.round(checkin.hrv) : "–"]].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-white/[.04] py-2"><div className="font-mono text-lg">{v}</div><div className="text-[10px] text-white/40">{l}</div></div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
