'use client';

import { useEffect, useRef } from 'react';
import type { CaminoPointDetail } from '@/app/api/caminos/caminos';
import { cn } from '@/lib/utils';

interface Props {
  points: CaminoPointDetail[];
  className?: string;
}

type MapLibreMap = import('maplibre-gl').Map;

export function CaminoRouteMap({ points, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const coords = points
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => [p.lng!, p.lat!] as [number, number]);

  useEffect(() => {
    if (!containerRef.current || coords.length < 2 || mapRef.current) return;

    let map: MapLibreMap;

    async function initMap() {
      const maplibregl = (await import('maplibre-gl')).default;

      if (!containerRef.current) return;

      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const bounds: [number, number, number, number] = [
        Math.min(...lngs),
        Math.min(...lats),
        Math.max(...lngs),
        Math.max(...lats),
      ];

      map = new maplibregl.Map({
        container: containerRef.current,
        // style: 'https://tiles.openfreemap.org/styles/bright',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        bounds,
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
        interactive: true, // shows action legend
      });

      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Sprite image fallback
      map.on('styleimagemissing', (e: { id: string }) => {
        map.addImage(e.id, new ImageData(1, 1));
      });

      map.on('load', () => {
        // Route line
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {},
          },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'miter', 'line-cap': 'butt' },
          paint: { 'line-color': '#e85d04', 'line-width': 3 },
        });

        // Waypoint dots
        map.addSource('waypoints', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: coords.map((c) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: c },
              properties: {},
            })),
          },
        });
        map.addLayer({
          id: 'waypoint-dots',
          type: 'circle',
          source: 'waypoints',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              1,
              8,
              2,
              12,
              5,
              16,
              5,
            ],
            'circle-color': '#fff',
            'circle-stroke-color': '#e85d04',
            'circle-stroke-width': 1,
          },
        });

        // Start marker (green)
        new maplibregl.Marker({ color: '#16a34a' }).setLngLat(coords[0]).addTo(map);

        // End marker (red)
        new maplibregl.Marker({ color: '#dc2626' })
          .setLngLat(coords[coords.length - 1])
          .addTo(map);
      });
    }

    initMap();

    return () => {
      map?.remove();
      mapRef.current = null;
    };
    // coords is derived from SSR data and doesn't change after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (coords.length < 2) return null;

  return (
    <div
      className={cn(
        'mb-6 h-64 w-full overflow-hidden rounded-lg border border-border',
        className,
      )}
      ref={containerRef}
      aria-label="Routenkarte"
      role="img"
    />
  );
}
