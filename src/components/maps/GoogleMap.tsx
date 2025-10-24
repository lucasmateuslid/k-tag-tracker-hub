import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markerTitle?: string;
  apiKey: string;
}

export function GoogleMap({ latitude, longitude, zoom = 15, markerTitle, apiKey }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!apiKey || scriptLoaded.current) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded.current = true;
      initMap();
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey]);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: zoom,
    });

    markerRef.current = new window.google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: googleMapRef.current,
      title: markerTitle || 'Localização',
    });
  };

  useEffect(() => {
    if (!googleMapRef.current) return;

    googleMapRef.current.setCenter({ lat: latitude, lng: longitude });
    
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  if (!apiKey) {
    return (
      <div className="w-full h-[400px] rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Configure a API Key do Google Maps nas configurações</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-[400px] rounded-lg overflow-hidden shadow-card" />;
}
