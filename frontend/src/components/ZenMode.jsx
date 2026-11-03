import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minimize2, Square, Volume2, VolumeX } from "lucide-react";
import FocusRing from "./FocusRing";
import { timer, useTimer, clock } from "../lib/timer";
import { startNoise, stopNoise } from "../lib/noise";

const QUOTES = [
  "La concentración es decir no a mil cosas buenas.",
  "Una cosa a la vez. Esta cosa, ahora.",
  "El trabajo profundo es el superpoder del siglo XXI.",
  "Respira. El resto puede esperar.",
];

// Modo zen: pantalla completa, sin distracciones, con un aura que respira a ritmo 4-4.
export default function ZenMode() {
  const t = useTimer();
  const [sound, setSound] = useState(false);
  const [q] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  useEffect(() => {
    if (!t.zen) return;
    const k = (e) => { if (e.key === "Escape") timer.zen(false); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [t.zen]);
  useEffect(() => { if (!t.running && sound) { setSound(false); } }, [t.running, sound]);
  const toggleSound = () => { sound ? stopNoise() : startNoise(); setSound(!sound); };

  return (
    <AnimatePresence>
      {t.zen && t.running && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-[#03040a]/95 backdrop-blur-2xl"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute h-[60vmin] w-[60vmin] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,.35), rgba(34,211,238,.12) 50%, transparent 70%)" }}
            animate={{ scale: [0.85, 1.15, 0.85] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <div className="relative flex flex-col items-center gap-8 text-center">
            <div className="eyebrow">{t.task ? `Trabajando en · ${t.task}` : "Modo zen"}</div>
            <FocusRing size={Math.min(340, innerWidth - 40)} stroke={6} value={t.progress}>
              <div>
                <div className="font-mono text-7xl font-light tabular tracking-tight">{clock(t.left)}</div>
                <motion.div className="mt-2 text-xs text-white/40" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 8, repeat: Infinity }}>
                  inhala · exhala
                </motion.div>
              </div>
            </FocusRing>
            <p className="max-w-sm text-sm italic text-white/45">“{q}”</p>
            <div className="flex gap-3">
              <button className="ghost flex items-center gap-2 !px-4 !py-2 !text-sm" onClick={toggleSound} aria-pressed={sound}>
                {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Ruido marrón
              </button>
              <button className="ghost flex items-center gap-2 !px-4 !py-2 !text-sm" onClick={() => timer.zen(false)}><Minimize2 size={16} /> Salir <span className="kbd">Esc</span></button>
              <button className="btn flex items-center gap-2" onClick={() => timer.finish()}><Square size={14} /> Terminar</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
