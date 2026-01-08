import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import dynamic from "next/dynamic";
import { useJsApiLoader } from "@react-google-maps/api";

interface Location {
  id: string;
  agentId: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: string | null;
  timestamp: string;
}

interface Agent {
  id: string;
  name: string;
  employeeCode: number | null;
  email: string;
}

function getAgentKey(agent: Agent): string {
  return String(agent.employeeCode ?? agent.id);
}

const LiveLocationMap = dynamic(
  () => import("@/components/LiveLocationMap"),
  { ssr: false },
);

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", 
  });

  useEffect(() => {
    async function loadInitial() {
      const res = await api.get<Location[]>("/location/online");
      setLocations(res.data);

      const agentsRes = await api.get<Agent[]>("/agents");
      setAgents(agentsRes.data);
    }
    loadInitial();

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? "https://api.candorwatertech.com/api/v1/ws";
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe("/topic/locations", (message: IMessage) => {
          const loc: Location = JSON.parse(message.body) as Location;
          setLocations((prev: Location[]) => {
            const existingIndex = prev.findIndex((l: Location) => l.agentId === loc.agentId);
            if (existingIndex >= 0) {
              const copy = [...prev];
              copy[existingIndex] = loc;
              return copy;
            }
            return [...prev, loc];
          });
        });
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  // Always keep only the latest location per agent so the table and map
  // show a single, up-to-date row/marker per agent.
  const latestByAgent: Record<string, Location> = {};
  locations.forEach((loc) => {
    const key = loc.agentId;
    if (!key) return;
    const existing = latestByAgent[key];
    if (!existing) {
      latestByAgent[key] = loc;
      return;
    }
    if (new Date(loc.timestamp) > new Date(existing.timestamp)) {
      latestByAgent[key] = loc;
    }
  });
  const latestLocations = Object.values(latestByAgent);

  const visibleLocations = selectedAgentKey
    ? latestLocations.filter((loc) => loc.agentId === selectedAgentKey)
    : latestLocations;

  const filteredAgents = search
    ? agents.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase().trim()),
      )
    : [];

  const selectedAgent = selectedAgentKey
    ? agents.find((a) => getAgentKey(a) === selectedAgentKey) || null
    : null;

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Live Map (List View)</h1>
        <p className="text-slate-600 text-sm">
          This view shows the latest location reported for each agent. Realtime updates
          arrive via WebSocket and update this list automatically.
        </p>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by agent name..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {showSuggestions && filteredAgents.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
                {filteredAgents.map((agent) => (
                  <li
                    key={agent.id}
                    className="cursor-pointer px-3 py-2 hover:bg-slate-100"
                    onClick={() => {
                      const key = getAgentKey(agent);
                      setSelectedAgentKey(key);
                      setSearch(agent.name);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="font-medium text-slate-900">{agent.name}</span>
                    {agent.employeeCode && (
                      <span className="ml-2 text-xs text-slate-500">
                        ({agent.employeeCode})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {selectedAgent ? (
              <span className="rounded-full bg-slate-900/5 px-3 py-1 font-medium text-slate-800">
                Tracking: {selectedAgent.name}
              </span>
            ) : (
              <span className="rounded-full bg-slate-900/5 px-3 py-1">
                Tracking: All agents
              </span>
            )}
            {selectedAgent && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAgentKey(null);
                  setSearch("");
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 min-h-[320px]">
          {isLoaded ? (
            <LiveLocationMap locations={visibleLocations} agents={agents} />
          ) : (
            <div className="text-sm text-slate-500">Loading map…</div>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/60">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-800/80 text-left text-xs font-semibold text-slate-200">
              <tr>
                <th className="px-4 py-2">Agent ID</th>
                <th className="px-4 py-2">Agent Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Latitude</th>
                <th className="px-4 py-2">Longitude</th>
                <th className="px-4 py-2">Accuracy</th>
                <th className="px-4 py-2">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visibleLocations.map((loc: Location) => {
                const agent = agents.find(
                  (a: Agent) => getAgentKey(a) === loc.agentId,
                );
                return (
                  <tr key={loc.id} className="hover:bg-slate-800/60">
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-slate-100">
                      {loc.agentId}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-100">
                      {agent?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {loc.status ?? "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {loc.latitude ?? "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {loc.longitude ?? "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {loc.accuracy ?? "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(loc.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {visibleLocations.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                    No locations reported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
