import { useEffect, useRef } from "react";

export type MapHandle = {
  map: google.maps.Map;
};

type Props = {
  className?: string;
  onMapReady: (handle: MapHandle) => void;
  defaultCenter?: google.maps.LatLngLiteral;
  defaultZoom?: number;
};

export default function GoogleMapImperative({
  className,
  onMapReady,
  defaultCenter,
  defaultZoom,
}: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!divRef.current) return;
    if (mapRef.current) return;
    if (typeof window === "undefined") return;
    if (!window.google?.maps) return;

    const map = new google.maps.Map(divRef.current, {
      center: defaultCenter ?? { lat: 19.076, lng: 72.8777 },
      zoom: defaultZoom ?? 6,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    mapRef.current = map;
    onMapReady({ map });
  }, [onMapReady, defaultCenter, defaultZoom]);

  return <div ref={divRef} className={className ?? "h-[520px] w-full"} />;
}
