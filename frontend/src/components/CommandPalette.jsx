import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, Plus } from "lucide-react";

// Búsqueda difusa: las letras deben aparecer en orden; puntúa más los aciertos consecutivos y al inicio.
function fuzzy(text, q) {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const s = q.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!s) return 1;
  let ti = 0, score = 0, streak = 0;
  for (const ch of s) {
    const at = t.indexOf(ch, ti);
    if (at < 0) return 0;
    streak = at === ti ? streak + 1 : 0;
    score += 1 + streak * 2 + (at === 0 ? 3 : 0);
    ti = at + 1;
  }
  return score;
}

export default function CommandPalette({ open, onClose, items, onCreateTask }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const list = useMemo(() => {
    if (q.startsWith("+")) {
      const title = q.slice(1).trim();
      return title ? [{ label: `Crear tarea «${title}»`, group: "Crear", icon: Plus, run: () => onCreateTask(title) }] : [];
    }
    return items.map((x) => ({ ...x, s: fuzzy(x.label, q) })).filter((x) => x.s > 0).sort((a, b) => (q ? b.s - a.s : 0));
  }, [items, q, onCreateTask]);
  useEffect(() => { if (open) { setQ(""); setI(0); setTimeout(() => ref.current?.focus(), 50); } }, [open]);
  useEffect(() => setI(0), [q]);

  const key = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((v) => Math.min(v + 1, list.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && list[i]) { list[i].run(); onClose(); }
    if (e.key === "Escape") onClose();
  };

  let lastGroup = null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-start bg-black/60 p-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ y: -16, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="glass mx-auto w-full max-w-xl rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Paleta de comandos">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search size={18} className="text-neon-cyan" />
              <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key}
                placeholder="Busca o escribe «+ tarea» para crear…" className="w-full bg-transparent outline-none placeholder:text-white/30" />
              <span className="kbd">Esc</span>
            </div>
            <ul className="max-h-[22rem] overflow-y-auto p-2">
              {list.map((x, n) => {
                const header = !q && x.group !== lastGroup ? x.group : null;
                lastGroup = x.group;
                const I = x.icon;
                return (
                  <li key={x.label}>
                    {header && <div className="eyebrow px-4 pb-1 pt-3">{header}</div>}
                    <button onMouseMove={() => setI(n)} onClick={() => { x.run(); onClose(); }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition ${n === i ? "bg-white/10" : ""}`}>
                      {I && <I size={16} className={n === i ? "text-neon-cyan" : "text-white/40"} />}
                      <span className="flex-1">{x.label}</span>
                      {x.kbd && <span className="kbd">{x.kbd}</span>}
                      {n === i && <CornerDownLeft size={14} className="text-white/40" />}
                    </button>
                  </li>
                );
              })}
              {!list.length && <li className="px-4 py-6 text-center text-sm text-white/40">{q.startsWith("+") ? "Escribe el título de la tarea" : `Sin resultados para «${q}»`}</li>}
            </ul>
            <div className="flex gap-4 border-t border-white/10 px-5 py-2.5 text-[11px] text-white/35">
              <span><span className="kbd">↑↓</span> navegar</span><span><span className="kbd">↵</span> ejecutar</span><span><span className="kbd">+</span> crear tarea</span><span><span className="kbd">?</span> atajos</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
