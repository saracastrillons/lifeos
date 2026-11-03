import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hexagon } from "lucide-react";

const LINES = [
  ["kernel", "Iniciando LifeOS v2.0"],
  ["db", "Conectando con la base de datos"],
  ["pandas", "Cargando 180 días de historial"],
  ["sklearn", "Entrenando Random Forest · 5-fold CV"],
  ["ui", "Renderizando interfaz"],
];

// Secuencia de arranque cinematográfica. Se muestra una vez por sesión; cualquier tecla o clic la salta.
export default function BootScreen({ onDone }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= LINES.length) { const t = setTimeout(onDone, 450); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 350 : 260 + Math.random() * 180);
    return () => clearTimeout(t);
  }, [step, onDone]);
  useEffect(() => {
    const skip = () => onDone();
    addEventListener("keydown", skip); addEventListener("pointerdown", skip);
    return () => { removeEventListener("keydown", skip); removeEventListener("pointerdown", skip); };
  }, [onDone]);
  const pct = Math.min(100, Math.round((step / LINES.length) * 100));

  return (
    <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-[#05060d]"
      exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }} transition={{ duration: 0.5 }}>
      <div className="w-[min(440px,calc(100vw-3rem))]">
        <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }} className="mb-8 flex items-center justify-center gap-3">
          <div className="relative">
            <Hexagon size={44} className="text-neon-cyan" style={{ filter: "drop-shadow(0 0 16px #22d3ee)" }} />
            <motion.div className="absolute inset-0 rounded-full" animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }} style={{ boxShadow: "0 0 0 2px #22d3ee" }} />
          </div>
          <span className="text-4xl font-semibold tracking-tight text-grad">LifeOS</span>
        </motion.div>
        <div className="space-y-1.5 font-mono text-xs">
          {LINES.slice(0, step).map(([tag, text], i) => (
            <motion.div key={tag} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
              <span className="w-16 text-right text-white/30">[{tag}]</span>
              <span className="flex-1 text-white/70">{text}</span>
              <span className="text-neon-lime">{i < step - 1 || step === LINES.length ? "OK" : "…"}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }}
            style={{ background: "linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6)", boxShadow: "0 0 16px #a78bfa" }} />
        </div>
        <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-widest text-white/30">
          <span>Pulsa cualquier tecla para saltar</span><span>{pct}%</span>
        </div>
      </div>
    </motion.div>
  );
}
