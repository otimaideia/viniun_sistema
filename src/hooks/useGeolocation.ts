import { useCallback, useState } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useGeolocation() {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPosition = useCallback(async (): Promise<GeoPosition | null> => {
    if (!navigator.geolocation) {
      console.warn('[Geo] Geolocation API não disponível');
      return null;
    }

    setIsRequesting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (err: any) {
      console.warn('[Geo] Erro ao obter localização:', err?.message || err);
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  return { requestPosition, isRequesting };
}
