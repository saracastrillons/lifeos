import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { api } from "../api/client";
import { celebrate, toast } from "../lib/bus";

// Marca/desmarca un hábito. Si con eso completas todos los de hoy, lanza confeti.
export async function toggleHabit(data, habit, dayIndex, e) {
  const day = data.days[dayIndex];
  const isToday = dayIndex === data.days.length - 1;
  const wasDone = habit.flags[dayIndex];
  const rect = e?.currentTarget?.getBoundingClientRect();
  try {
    await api.post(`/habits/${habit.id}/toggle?day=${day.date}`);
  } catch (err) {
    return toast(err.message, "error");
  }
  if (isToday && !wasDone) {
    const rest = data.habits.filter((h) => h.id !== habit.id).every((h) => h.flags[dayIndex]);
    if (rest) {
      celebrate({ x: rect ? rect.x + rect.width / 2 : undefined, y: rect ? rect.y : undefined, n: 180 });
      toast("¡Día perfecto! Todos los hábitos completados", "xp");
    } else toast(`+10 XP · ${habit.name}`, "xp");
  }
}

export default function HabitGrid({ data }) {
  const today = data.days.length - 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: "0 6px" }}>
        <thead>
          <tr>
            <th />
            {data.days.map((d, i) => (
              <th key={d.date} className={`px-1 font-mono text-[10px] font-normal uppercase ${i === today ? "text-neon-cyan" : "text-white/35"}`}>
                {d.label}
                <div className="text-[9px] opacity-70">{+d.date.slice(8)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.habits.map((h) => (
            <tr key={h.id}>
              <td className="whitespace-nowrap pr-4 text-sm text-white/80">
                <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: h.color }} />{h.name}
              </td>
              {h.flags.map((f, i) => (
                <td key={i} className="text-center">
                  <motion.button
                    whileTap={{ scale: 0.7 }} whileHover={{ scale: 1.2 }}
                    aria-label={`${h.name} ${data.days[i].label} ${f ? "hecho" : "pendiente"}`} aria-pressed={f}
                    onClick={(e) => toggleHabit(data, h, i, e)}
                    className="relative grid h-6 w-6 place-items-center rounded-lg transition-colors"
                    style={f ? { background: h.color, boxShadow: `0 0 14px ${h.color}99` }
                      : { border: `1px solid ${i === today ? h.color + "88" : "rgba(255,255,255,.14)"}`, background: i === today ? h.color + "14" : undefined }}>
                    {f && <Check size={13} strokeWidth={3} color="#05060d" />}
                  </motion.button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
