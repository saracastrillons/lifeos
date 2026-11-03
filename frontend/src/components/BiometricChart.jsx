import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function BiometricChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity=".45" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f472b6" stopOpacity=".35" />
            <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="h" hide domain={["dataMin - 10", "dataMax + 8"]} />
        <YAxis yAxisId="s" orientation="right" hide domain={[3, 10]} />
        <Tooltip
          contentStyle={{ background: "#0b0d1a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#fff" }}
          cursor={{ stroke: "rgba(255,255,255,.2)" }}
        />
        <Area yAxisId="h" dataKey="hrv" name="HRV" stroke="#22d3ee" strokeWidth={2.5} fill="url(#gh)" />
        <Area yAxisId="s" dataKey="sleep" name="Sueño (h)" stroke="#f472b6" strokeWidth={2.5} fill="url(#gs)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
