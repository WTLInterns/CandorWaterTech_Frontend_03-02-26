import Layout from "@/components/Layout";
import api from "@/lib/apiClient";
import GoogleMapImperative, { MapHandle } from "@/components/GoogleMapImperative";
import { useLiveLocationSocket, LiveLocationMessage } from "@/lib/useLiveLocationSocket";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

type Agent = {
  id: number;
  name: string;
  employeeCode: number | null;
};

type MarkerRecord = {
  marker: google.maps.Marker;
  lastTimestamp?: string;
};

function animateMarker(
  marker: google.maps.Marker,
  to: google.maps.LatLngLiteral,
  durationMs = 900
) {
  const fromPos = marker.getPosition();
  const from = fromPos
    ? { lat: fromPos.lat(), lng: fromPos.lng() }
    : { lat: to.lat, lng: to.lng };

  const start = performance.now();

  function step(now: number) {
    const t = Math.min(1, (now - start) / durationMs);
    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;
    marker.setPosition({ lat, lng });
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export default function LiveTrackingPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | "all">("all");

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, MarkerRecord>>(new Map());

  const agentNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of agents) m.set(a.id, a.name);
    return m;
  }, [agents]);

  useEffect(() => {
    (async () => {
      const res = await api.get<Agent[]>("/agents");
      setAgents(res.data);
    })();
  }, []);

  const onMapReady = useCallback((handle: MapHandle) => {
    mapRef.current = handle.map;
  }, []);

  const handleLocation = useCallback(
    (msg: LiveLocationMessage) => {
      if (!mapRef.current) return;
      if (selectedAgentId !== "all" && msg.agentId !== selectedAgentId) return;
      if (msg.latitude == null || msg.longitude == null) return;

      const existing = markersRef.current.get(msg.agentId);
      const pos: google.maps.LatLngLiteral = {
        lat: msg.latitude,
        lng: msg.longitude,
      };

      const label = agentNameById.get(msg.agentId) ?? String(msg.agentId);

      if (!existing) {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: pos,
          title: label,
          label,
        });
        markersRef.current.set(msg.agentId, {
          marker,
          lastTimestamp: msg.timestamp,
        });
        return;
      }

      if (existing.lastTimestamp && msg.timestamp) {
        const prevTs = new Date(existing.lastTimestamp).getTime();
        const nextTs = new Date(msg.timestamp).getTime();
        if (Number.isFinite(prevTs) && Number.isFinite(nextTs) && nextTs < prevTs) {
          return;
        }
      }

      existing.lastTimestamp = msg.timestamp;
      existing.marker.setTitle(label);
      existing.marker.setLabel(label);
      animateMarker(existing.marker, pos);
    },
    [agentNameById, selectedAgentId]
  );

  const socketState = useLiveLocationSocket(handleLocation);

  useEffect(() => {
    // When filter changes, hide/show markers without rerendering the map.
    for (const [agentId, rec] of markersRef.current.entries()) {
      const visible = selectedAgentId === "all" || agentId === selectedAgentId;
      rec.marker.setVisible(visible);
    }
  }, [selectedAgentId]);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Live Tracking</h1>
            <p className="text-sm text-slate-500">
              WebSocket: {socketState.connected ? "Connected" : "Disconnected"}
              {socketState.lastError ? ` — ${socketState.lastError}` : ""}
            </p>
          </div>

          <div className="w-full sm:w-72">
            <label className="block text-xs text-slate-500 mb-1">Agent</label>
            <select
              value={String(selectedAgentId)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedAgentId(v === "all" ? "all" : Number(v));
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (ID: {a.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          {!isLoaded ? (
            <div className="text-sm text-slate-500">Loading map…</div>
          ) : (
            <GoogleMapImperative className="h-[520px] w-full" onMapReady={onMapReady} defaultZoom={6} />
          )}
        </div>
      </div>
    </Layout>
  );
}
