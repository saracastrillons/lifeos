import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { on } from "../lib/bus";

// Carga un endpoint y se re-sincroniza automáticamente cuando cualquier parte de la app escribe datos.
export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () => api.get(path).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message)),
    [path]
  );
  useEffect(() => { load(); }, [load]);
  useEffect(() => on("changed", load), [load]);
  useEffect(() => {
    if (!error) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [error, load]);
  return { data, error, reload: load };
}
