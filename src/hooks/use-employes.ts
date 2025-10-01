import { useEffect, useState } from 'react';
import { listEmployes, Employe } from '@/lib/api';

export function useEmployes() {
  const [data, setData] = useState<Employe[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    let alive = true;
    setLoading(true);
    listEmployes()
      .then((emps) => { if (alive) { setData(emps); setError(null); } })
      .catch((e) => { if (alive) setError(e?.message || 'Erreur de chargement'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  };

  useEffect(() => {
    const cancel = reload();
    return cancel;
  }, []);

  return { data, loading, error, reload };
}
