import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const LEVELS = ["rgba(255,255,255,.05)", "#0c3a4a", "#0e6a80", "#1aa6c4", "#22d3ee", "#a5f3fc"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const level = (s) => (s == null ? 0 : s < 50 ? 1 : s < 60 ? 2 : s < 70 ? 3 : s < 80 ? 4 : 5);

// Mapa de calor estilo "contribuciones": cada celda es un día, el color es tu productividad.
export default function Heatmap({ data }) {
  const [hover, setHover] = useState(null);
  const weeks = useMemo(() => {
    const first = new Date(data[0].date + "T00:00");
    const pad = (first.getDay() + 6) % 7; // semanas empiezan en lunes
    const cells = [...Array(pad).fill(null), ...data];
    const out = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [data]);
  const scored = data.filter((d) => d.score != null);
  const great = scored.filter((d) => d.score >= 70).length;

  return (
    <div>
      <div className="relative overflow-x-auto pb-1">
        <div className="flex min-w-[460px] gap-[3px]" onMouseLeave={() => setHover(null)}>
          {weeks.map((w, wi) => {
            const firstDay = w.find(Boolean);
            const d = firstDay && new Date(firstDay.date + "T00:00");
            const showMonth = d && d.getDate() <= 7;
            return (
              <div key={wi} className="flex max-w-[24px] flex-1 flex-col gap-[3px]">
                <div className="h-4 overflow-visible whitespace-nowrap font-mono text-[9px] text-white/35">{showMonth ? MONTHS[d.getMonth()] : ""}</div>
                {w.map((c, di) => c ? (
                  <motion.button key={c.date} aria-label={`${c.date}: ${c.score ?? "sin datos"}`}
                    initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: wi * 0.012 + di * 0.01 }}
                    onMouseEnter={() => setHover(c)} onFocus={() => setHover(c)}
                    className="aspect-square w-full rounded-[4px] transition-transform hover:scale-150"
                    style={{ background: LEVELS[level(c.score)], boxShadow: level(c.score) >= 4 ? `0 0 6px ${LEVELS[level(c.score)]}88` : undefined }} />
                ) : <div key={`p${di}`} className="aspect-square w-full" />)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
        <div className="h-5 tabular">
          {hover ? (
            <span>
              <span className="text-white/80">{new Date(hover.date + "T00:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}</span>
              {" · "}{hover.score != null ? <>Productividad <b className="text-neon-cyan">{Math.round(hover.score)}</b></> : "Sin check-in"}
              {" · "}Hábitos {hover.habits}%{hover.sleep ? ` · ${hover.sleep} h de sueño` : ""}
            </span>
          ) : <span><b className="text-white/80">{great}</b> días por encima de 70 en los últimos {data.length} días</span>}
        </div>
        <div className="flex items-center gap-1.5">
          Menos {LEVELS.map((c) => <span key={c} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />)} Más
        </div>
      </div>
    </div>
  );
}
