import { motion } from "framer-motion";
import { ServerCrash } from "lucide-react";

export default function Status({ error, layout = "grid" }) {
  if (error)
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto mt-16 max-w-lg rounded-3xl p-8 text-center">
        <ServerCrash className="mx-auto mb-3 text-neon-pink" size={32} />
        <div className="text-lg font-medium">No se pudo conectar con el backend</div>
        <p className="mt-2 text-sm text-white/60">
          Inicia la API con <code className="font-mono text-neon-cyan">uvicorn app.main:app --reload</code> dentro de la carpeta
          backend. Reintentando automáticamente…
        </p>
      </motion.div>
    );
  // Esqueleto con brillo mientras carga
  return layout === "grid" ? (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-16" />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32" />)}</div>
      <div className="grid gap-5 lg:grid-cols-3"><div className="skeleton h-72" /><div className="skeleton h-72 lg:col-span-2" /></div>
    </div>
  ) : <div className="skeleton h-64" aria-busy="true" />;
}
