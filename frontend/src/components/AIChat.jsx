import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { useTypewriter } from "./FX";

const CHIPS = ["¿Qué patrones ves?", "Dame un consejo", "¿Cómo será mañana?", "¿Cuál es mi mejor día?", "¿Qué tan preciso es el modelo?", "Mi racha"];

// **negrita** → <b>, sin inyectar HTML
const rich = (t) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") ? <b key={i} className="font-semibold text-white">{p.slice(2, -2)}</b> : p);

function Msg({ m, last }) {
  const typed = useTypewriter(m.t, 12, m.r === "ai" && last && m.fresh);
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.r === "me" ? "ml-auto rounded-br-md text-[#05060d]" : "rounded-bl-md bg-white/[.07] text-white/85"}`}
      style={m.r === "me" ? { background: "linear-gradient(90deg,#22d3ee,#a78bfa)" } : undefined}>
      {rich(typed)}
    </motion.div>
  );
}

export default function AIChat({ open, setOpen }) {
  const [msgs, setMsgs] = useState([{ r: "ai", t: "Hola, soy **LifeOS AI**. Analizo tus hábitos, sueño y enfoque con un modelo de Machine Learning. Pregúntame lo que quieras." }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const input = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open, busy]);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 200); }, [open]);

  const send = async (text) => {
    const t = (text ?? q).trim();
    if (!t || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { r: "me", t }]);
    try {
      const [r] = await Promise.all([api.post("/chat", { message: t }, { silent: true }), new Promise((ok) => setTimeout(ok, 500))]);
      setMsgs((m) => [...m, { r: "ai", t: r.reply, fresh: true }]);
    } catch {
      setMsgs((m) => [...m, { r: "ai", t: "No pude conectar con el backend. Verifica que esté en marcha.", fresh: true }]);
    }
    setBusy(false);
  };

  return (
    <>
      <motion.button aria-label={open ? "Cerrar chat IA" : "Abrir chat IA"} onClick={() => setOpen(!open)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        className="fixed bottom-20 right-5 z-30 grid h-14 w-14 place-items-center rounded-full md:bottom-6"
        style={{ background: "linear-gradient(135deg,#22d3ee,#a78bfa,#f472b6)", boxShadow: "0 0 32px #a78bfa99" }}>
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" style={{ animationDuration: "2.5s" }} />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? "x" : "bot"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
            {open ? <X color="#05060d" /> : <Bot color="#05060d" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }} style={{ transformOrigin: "bottom right" }}
            className="glass fixed bottom-36 right-5 z-30 flex h-[520px] max-h-[calc(100vh-11rem)] w-[min(400px,calc(100vw-2.5rem))] flex-col rounded-3xl md:bottom-24">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg,#22d3ee33,#a78bfa33)" }}><Sparkles size={17} className="text-neon-violet" /></div>
              <div className="flex-1">
                <div className="text-sm font-medium">LifeOS AI</div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/45"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime" /> Random Forest · datos locales</div>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.map((m, i) => <Msg key={i} m={m} last={i === msgs.length - 1} />)}
              {busy && (
                <div className="flex w-14 gap-1 rounded-2xl bg-white/[.07] px-3.5 py-3">
                  {[0, 1, 2].map((d) => <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-white/60" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.12 }} />)}
                </div>
              )}
              <div ref={end} />
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-2">
              {CHIPS.map((c) => <button key={c} className="ghost shrink-0" onClick={() => send(c)}>{c}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 p-3 pt-1">
              <input ref={input} className="field min-w-0 flex-1" placeholder="Escribe tu pregunta…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} />
              <button className="btn" aria-label="Enviar" disabled={busy}><Send size={16} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
