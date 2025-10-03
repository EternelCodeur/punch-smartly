import { useEffect, useRef, useCallback } from 'react';

const useAutoRefresh = (callback: () => Promise<void> | void, intervalTime = 60000) => {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Mettre à jour la référence du callback si elle change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Fonction pour exécuter le rafraîchissement
  const executeRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      await callbackRef.current();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement automatique:', error);
    }
  }, []);

  // Démarrer/arrêter le rafraîchissement automatique
  useEffect(() => {
    isMountedRef.current = true;
    
    // Exécuter immédiatement au montage
    executeRefresh();
    
    // Configurer l'intervalle
    intervalRef.current = setInterval(executeRefresh, intervalTime);
    
    // Nettoyer à la destruction
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [executeRefresh, intervalTime]);

  // Fonction pour forcer un rafraîchissement manuel
  const forceRefresh = useCallback(() => {
    return executeRefresh();
  }, [executeRefresh]);

  return { forceRefresh };
};

export default useAutoRefresh;
