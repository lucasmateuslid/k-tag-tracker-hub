import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Use seu token público do Mapbox aqui
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markerTitle?: string;
}

export function MapComponent({ latitude, longitude, zoom = 15, markerTitle }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    marker.current = new mapboxgl.Marker({ color: 'hsl(217, 91%, 60%)' })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<div style="color: #000; font-weight: 600;">${markerTitle || 'Localização'}</div>`
        )
      )
      .addTo(map.current);

    return () => {
      marker.current?.remove();
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;

    map.current.flyTo({
      center: [longitude, latitude],
      zoom: zoom,
      essential: true
    });

    marker.current.setLngLat([longitude, latitude]);
  }, [latitude, longitude, zoom]);

  return (
    <div ref={mapContainer} className="w-full h-[400px] rounded-lg overflow-hidden shadow-card" />
  );
}
