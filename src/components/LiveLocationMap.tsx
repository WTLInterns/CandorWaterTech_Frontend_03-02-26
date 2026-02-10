"use client";

import { useMemo } from "react";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { useState } from "react";

interface Location {
  id: number;
  agentId: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: string | null;
  timestamp: string;
}

interface Agent {
  id: number;
  name: string;
  employeeCode: number | null;
}

interface Props {
  locations: Location[];
  agents: Agent[];
}

const containerStyle = {
  width: "100%",
  height: "320px",
};

export default function LiveLocationMap({ locations, agents }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const validLocations = locations.filter(
    (l) => l.latitude !== null && l.longitude !== null,
  );

  const center = useMemo(() => {
    if (validLocations.length === 0) {
      return { lat: 19.076, lng: 72.8777 };
    }
    const latSum = validLocations.reduce((sum, l) => sum + (l.latitude ?? 0), 0);
    const lngSum = validLocations.reduce((sum, l) => sum + (l.longitude ?? 0), 0);
    return {
      lat: latSum / validLocations.length,
      lng: lngSum / validLocations.length,
    };
  }, [validLocations]);

  const selected = validLocations.find((l) => l.id === selectedId) ?? null;
  const selectedAgent =
    selected &&
    agents.find(
      (a) => a.id === selected.agentId,
    );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={13}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {validLocations.map((loc) => {
        const agent = agents.find(
          (a) => a.id === loc.agentId,
        );
        return (
          <MarkerF
            key={loc.id}
            position={{
              lat: loc.latitude as number,
              lng: loc.longitude as number,
            }}
            label={agent?.name ?? String(loc.agentId)}
            onClick={() => setSelectedId(loc.id)}
          />
        );
      })}
      {selected && (
        <InfoWindowF
          position={{
            lat: selected.latitude as number,
            lng: selected.longitude as number,
          }}
          onCloseClick={() => setSelectedId(null)}
        >
          <div className="space-y-1 text-xs">
            <div className="font-semibold">
              {selectedAgent?.name ?? "Agent"} (ID: {selected.agentId})
            </div>
            <div>Status: {selected.status ?? "-"}</div>
            <div>
              Lat/Lng: {selected.latitude?.toFixed(5)},
              {" "}
              {selected.longitude?.toFixed(5)}
            </div>
            <div>Accuracy: {selected.accuracy ?? "-"} m</div>
            <div>
              Last Update: {new Date(selected.timestamp).toLocaleString()}
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
