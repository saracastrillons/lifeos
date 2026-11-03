import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Bot, Timer, Download, RotateCcw, Maximize2, Keyboard, CheckCircle2, Circle } from "lucide-react";
import Sidebar, { NAV } from "./components/Sidebar";
import ParticlesBg from "./components/ParticlesBg";
import CommandPalette from "./components/CommandPalette";
import AIChat from "./components/AIChat";
import BootScreen from "./components/BootScreen";
import ZenMode from "./components/ZenMode";
import { Toaster, Confetti } from "./components/FX";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Goals from "./pages/Goals";
import Learning from "./pages/Learning";
import Productivity from "./pages/Productivity";
import Insights from "./pages/Insights";
import { api } from "./api/client";
import { useApi } from "./hooks/useData";
import { toast, downloadJSON } from "./lib/bus";
import { timer, useTimerWatcher } from "./lib/timer";

const PAGES = { dashboard: Dashboard, habits: Habits, goals: Goals, learning: Learning, productivity: Productivity, insights: Insights };
const SUBTITLE = {
  habits: "Constancia diaria, visualizada.",
  goals: "Lo que estás construyendo a largo plazo.",
  learning: "Tu curva de aprendizaje, medida en horas.",
  productivity: "Trabajo profundo sin distracciones.",
  insights: "Lo que el Machine Learning descubrió sobre ti.",
};
const SHORTCUTS = [["Ctrl K", "Paleta de comandos"], ["1 – 6", "Cambiar de sección"], ["F", "Iniciar sesión de enfoque"], ["C", "Abrir chat con la IA"], ["?", "Mostrar atajos"], ["Esc", "Cerrar ventanas"]];

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "Buenas noches" : h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

function readBooted() {
  try { return sessionStorage.getItem("lifeos-booted") === "1"; } catch { return false; }
}

function Shortcuts({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className="glass w-full max-w-sm rounded-3xl p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Atajos de teclado">
            <div className="mb-4 flex items-center gap-2 font-medium"><Keyboard size={18} className="text-neon-cyan" /> Atajos de teclado</div>
            <ul className="space-y-2.5">
              {SHORTCUTS.map(([k, l]) => <li key={k} className="flex items-center justify-between text-sm text-white/70">{l}<span className="kbd">{k}</span></li>)}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [booted, setBooted] = useState(readBooted);
  const [view, setView] = useState("dashboard");
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [chat, setChat] = useState(false);
  const [now, setNow] = useState(new Date());
  const { data: habits } = useApi("/habits?days=1");
  useTimerWatcher();

  const finishBoot = useCallback(() => {
    setBooted(true);
    try { sessionStorage.setItem("lifeos-booted", "1"); } catch { /* modo privado */ }
  }, []);

  const go = useCallback((v) => { setView(v); scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const startFocus = useCallback(() => { go("productivity"); timer.start(); timer.zen(true); }, [go]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const k = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); return; }
      if (e.key === "Escape") { setHelp(false); setChat(false); }
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.ctrlKey || e.metaKey || e.altKey;
      if (typing) return;
      if (e.key === "?") setHelp((h) => !h);
      if (e.key.toLowerCase() === "c") setChat((c) => !c);
      if (e.key.toLowerCase() === "f") startFocus();
      const n = +e.key;
      if (n >= 1 && n <= NAV.length) go(NAV[n - 1].id);
    };
    addEventListener("keydown", k);
    return () => { clearInterval(t); removeEventListener("keydown", k); };
  }, [go, startFocus]);

  const items = useMemo(() => [
    ...NAV.map((n, i) => ({ label: `Ir a ${n.label}`, group: "Navegar", icon: n.icon, kbd: String(i + 1), run: () => go(n.id) })),
    ...(habits?.habits ?? []).map((h) => ({
      label: `${h.flags[0] ? "Desmarcar" : "Marcar"} hábito: ${h.name}`, group: "Hábitos de hoy", icon: h.flags[0] ? CheckCircle2 : Circle,
      run: () => api.post(`/habits/${h.id}/toggle`).then(() => toast(h.flags[0] ? `«${h.name}» desmarcado` : `+10 XP · ${h.name}`, h.flags[0] ? "ok" : "xp")),
    })),
    { label: "Iniciar sesión de enfoque", group: "Acciones", icon: Timer, kbd: "F", run: startFocus },
    { label: "Entrar en modo zen", group: "Acciones", icon: Maximize2, run: () => { go("productivity"); timer.zen(true); } },
    { label: "Abrir chat con LifeOS AI", group: "Acciones", icon: Bot, kbd: "C", run: () => setChat(true) },
    { label: "Ver atajos de teclado", group: "Acciones", icon: Keyboard, kbd: "?", run: () => setHelp(true) },
    { label: "Exportar mis datos (JSON)", group: "Datos", icon: Download, run: () => api.get("/export").then((d) => { downloadJSON(d, `lifeos-${d.exported_at}.json`); toast("Datos exportados"); }) },
    { label: "Restablecer datos de demostración", group: "Datos", icon: RotateCcw, run: () => confirm("Esto borrará tus datos y regenerará la demo. ¿Continuar?") && api.post("/demo/reset").then(() => toast("Demo restablecida")) },
  ], [go, startFocus, habits]);

  const createTask = useCallback((title) => api.post("/tasks", { title, priority: "media" }).then(() => toast(`Tarea «${title}» creada`)), []);

  const Page = PAGES[view];
  const title = NAV.find((n) => n.id === view).label;

  return (
    <div className="min-h-screen md:pl-72">
      <div className="aurora" aria-hidden><span /><span /><span /></div>
      <ParticlesBg />
      <AnimatePresence>{!booted && <BootScreen onDone={finishBoot} />}</AnimatePresence>
      <Sidebar view={view} setView={go} />
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-10 md:pr-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow mb-1 capitalize">
              {now.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })} · <span className="tabular">{now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.h1 key={view} initial={{ opacity: 0, y: 8, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6 }}
                className="text-3xl font-semibold tracking-tight md:text-4xl">
                {view === "dashboard" ? <span className="text-grad-anim">{greeting()}</span> : title}
              </motion.h1>
            </AnimatePresence>
            <p className="mt-1 text-sm text-white/45">{view === "dashboard" ? "Este es el estado de tu sistema hoy." : SUBTITLE[view]}</p>
          </div>
          <button onClick={() => setPalette(true)} className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-white/60 transition hover:text-white">
            <Command size={16} /> Buscar o ejecutar
            <span className="kbd">Ctrl K</span>
          </button>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {booted && <Page go={go} />}
          </motion.div>
        </AnimatePresence>
        <footer className="mt-10 text-center font-mono text-[10px] uppercase tracking-widest text-white/25">
          LifeOS · FastAPI · scikit-learn · React — pulsa <span className="kbd">?</span> para ver atajos
        </footer>
      </main>
      <CommandPalette open={palette} onClose={() => setPalette(false)} items={items} onCreateTask={createTask} />
      <Shortcuts open={help} onClose={() => setHelp(false)} />
      <AIChat open={chat} setOpen={setChat} />
      <ZenMode />
      <Toaster />
      <Confetti />
    </div>
  );
}
