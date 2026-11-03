import { motion } from "framer-motion";

export const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 20 } },
};
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

export default function GlassCard({ title, eyebrow, action, children, className = "" }) {
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <motion.section variants={rise} onMouseMove={move} className={`glass glow-border rounded-3xl p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h3 className="text-sm font-medium text-white/80">{title}</h3>
          </div>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}
