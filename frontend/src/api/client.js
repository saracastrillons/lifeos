import { emit } from "../lib/bus";

const BASE = "/api";

async function req(path, opt = {}) {
  const r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opt });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : `Error ${r.status}`);
  }
  return r.json();
}

// Toda escritura notifica al resto de la app para que los datos se refresquen solos.
async function write(path, opt, silent) {
  const out = await req(path, opt);
  if (!silent) emit("changed", path);
  return out;
}

export const api = {
  get: (p) => req(p),
  post: (p, b, { silent } = {}) => write(p, { method: "POST", body: JSON.stringify(b || {}) }, silent),
  patch: (p, b) => write(p, { method: "PATCH", body: JSON.stringify(b || {}) }),
  del: (p) => write(p, { method: "DELETE" }),
};
