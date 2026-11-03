import { useEffect, useRef, useState } from "react";
import { motion, animate } from "framer-motion";

export default function FocusRing({ value = 0, size = 190, stroke = 10, label = "Enfoque", children }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const a = animate(prev.current, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    prev.current = value;
    return () => a.stop();
  }, [value]);
  const id = `fr-${size}`;
  const pct = Math.max(0, Math.min(value, 100)) / 100;
  const angle = pct * 2 * Math.PI;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset=".5" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        {/* Marcas de graduación */}
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * 2 * Math.PI, r1 = r + stroke / 2 + 4, r2 = r1 + (i % 5 ? 2 : 5);
          return <line key={i} x1={size / 2 + r1 * Math.cos(a)} y1={size / 2 + r1 * Math.sin(a)} x2={size / 2 + r2 * Math.cos(a)} y2={size / 2 + r2 * Math.sin(a)}
            stroke={i / 60 <= pct ? "rgba(167,139,250,.6)" : "rgba(255,255,255,.1)"} strokeWidth="1" />;
        })}
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.07)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: "drop-shadow(0 0 8px #a78bfa)" }}
        />
        {pct > 0.01 && (
          <motion.circle r={stroke / 2 + 1} fill="#fff" initial={false}
            animate={{ cx: size / 2 + r * Math.cos(angle), cy: size / 2 + r * Math.sin(angle) }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} style={{ filter: "drop-shadow(0 0 6px #fff)" }} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children || (
          <div>
            <div className="text-4xl font-semibold tabular">
              {n}<span className="text-lg text-white/50">%</span>
            </div>
            <div className="text-xs text-white/50">{label}</div>
          </div>
        )}
      </div>
    </div>
  );
}
