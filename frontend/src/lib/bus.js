// Bus de eventos mínimo para comunicar componentes desacoplados (datos, toasts, confeti).
const target = new EventTarget();

export const emit = (type, detail) => target.dispatchEvent(new CustomEvent(type, { detail }));

export function on(type, fn) {
  const h = (e) => fn(e.detail);
  target.addEventListener(type, h);
  return () => target.removeEventListener(type, h);
}

export const toast = (text, kind = "ok") => emit("toast", { text, kind, id: Math.random() });

export const celebrate = (opts) => emit("confetti", opts);

export function downloadJSON(data, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
