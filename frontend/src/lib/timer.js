import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "../api/client";
import { celebrate, toast } from "./bus";
import { chime, stopNoise } from "./noise";

// Temporizador de enfoque global: sobrevive a la navegación y se basa en marcas de tiempo
// (no en contar ticks), así que es exacto aunque el navegador congele la pestaña.
let state = { minutes: 25, endAt: null, zen: false, task: null };
const subs = new Set();
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

export const timer = {
  setMinutes: (minutes) => !state.endAt && set({ minutes }),
  setTask: (task) => set({ task }),
  start: () => set({ endAt: Date.now() + state.minutes * 60000 }),
  zen: (zen) => set({ zen }),
  async finish(completed = false) {
    if (!state.endAt) return;
    const left = Math.max(0, state.endAt - Date.now());
    const mins = completed ? state.minutes : Math.floor((state.minutes * 60000 - left) / 60000);
    set({ endAt: null, zen: false });
    stopNoise();
    document.title = "LifeOS";
    if (mins < 1) return toast("Sesión cancelada (menos de 1 minuto)", "error");
    await api.post("/focus", { minutes: mins });
    if (completed) { chime(); celebrate({ n: 220 }); }
    toast(`Sesión guardada · +${mins} min de trabajo profundo · +${mins} XP`, "xp");
  },
};

export function useTimer() {
  const s = useSyncExternalStore(subscribe, () => state);
  const [, force] = useState(0);
  useEffect(() => {
    if (!s.endAt) return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [s.endAt]);
  const left = s.endAt ? Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)) : s.minutes * 60;
  return { ...s, running: !!s.endAt, left, progress: 100 * (1 - left / (s.minutes * 60)) };
}

// Vigilante global: termina la sesión al llegar a cero y muestra la cuenta atrás en la pestaña.
export function useTimerWatcher() {
  const t = useTimer();
  useEffect(() => {
    if (!t.running) return;
    const mm = String(Math.floor(t.left / 60)).padStart(2, "0"), ss = String(t.left % 60).padStart(2, "0");
    document.title = `${mm}:${ss} · Enfoque — LifeOS`;
    if (t.left <= 0) timer.finish(true);
  }, [t.running, t.left]);
}

export const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
