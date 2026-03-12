// import Layout from "@/components/Layout";
// import api from "@/lib/apiClient";
// import GoogleMapImperative, { MapHandle } from "@/components/GoogleMapImperative";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useJsApiLoader } from "@react-google-maps/api";

// type Agent = {
//   id: number;
//   name: string;
//   employeeCode: number | null;
// };

// type HistoryPoint = {
//   id: number;
//   agentId: number;
//   latitude: number | null;
//   longitude: number | null;
//   accuracy: number | null;
//   address: string | null;
//   timestamp: string;
// };

// function toISODate(d: Date) {
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// export default function AgentRoutePage() {
//   const [agents, setAgents] = useState<Agent[]>([]);
//   const [agentId, setAgentId] = useState<string>("");
//   const [date, setDate] = useState<string>(toISODate(new Date()));
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const { isLoaded } = useJsApiLoader({
//     googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
//   });

//   const mapRef = useRef<google.maps.Map | null>(null);
//   const polylineRef = useRef<google.maps.Polyline | null>(null);

//   const onMapReady = useCallback((handle: MapHandle) => {
//     mapRef.current = handle.map;
//   }, []);

//   useEffect(() => {
//     (async () => {
//       const res = await api.get<Agent[]>("/agents");
//       setAgents(res.data);
//       if (!agentId && res.data.length > 0) {
//         setAgentId(String(res.data[0].id));
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const selectedAgent = useMemo(
//     () => agents.find((a) => String(a.id) === agentId) ?? null,
//     [agents, agentId]
//   );

//   async function loadRoute() {
//     if (!agentId || !date) return;
//     if (!mapRef.current) return;

//     setLoading(true);
//     setError(null);
//     try {
//       const res = await api.get<HistoryPoint[]>("/location/day-route", {
//         params: { agentId, date },
//       });

//       const pts = res.data
//         .filter((p) => p.latitude != null && p.longitude != null)
//         .map((p) => ({ lat: p.latitude as number, lng: p.longitude as number }));

//       if (polylineRef.current) {
//         polylineRef.current.setMap(null);
//         polylineRef.current = null;
//       }

//       if (pts.length === 0) {
//         setError("No route points found for the selected agent/date.");
//         return;
//       }

//       const polyline = new google.maps.Polyline({
//         path: pts,
//         map: mapRef.current,
//         strokeColor: "#0284c7",
//         strokeOpacity: 0.9,
//         strokeWeight: 4,
//       });
//       polylineRef.current = polyline;

//       const bounds = new google.maps.LatLngBounds();
//       for (const p of pts) bounds.extend(p);
//       mapRef.current.fitBounds(bounds);

//       // Optional: drop start/end markers
//       new google.maps.Marker({
//         map: mapRef.current,
//         position: pts[0],
//         label: "S",
//       });
//       new google.maps.Marker({
//         map: mapRef.current,
//         position: pts[pts.length - 1],
//         label: "E",
//       });
//     } catch (e: any) {
//       setError(e?.message ?? "Failed to load route");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <Layout>
//       <div className="space-y-4">
//         <div>
//           <h1 className="text-2xl font-semibold">Agent Route History</h1>
//           <p className="text-sm text-slate-500">
//             Load an agent’s full-day route and display it as a polyline.
//           </p>
//         </div>

//         <div className="rounded-lg border border-slate-200 bg-white p-4">
//           <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
//             <div>
//               <label className="block text-xs text-slate-500 mb-1">Agent</label>
//               <select
//                 value={agentId}
//                 onChange={(e) => setAgentId(e.target.value)}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
//               >
//                 {agents.map((a) => (
//                   <option key={a.id} value={a.id}>
//                     {a.name} (ID: {a.id})
//                   </option>
//                 ))}
//               </select>
//               {selectedAgent?.employeeCode ? (
//                 <p className="mt-1 text-[11px] text-slate-500">
//                   Employee Code: {selectedAgent.employeeCode}
//                 </p>
//               ) : null}
//             </div>

//             <div>
//               <label className="block text-xs text-slate-500 mb-1">Date</label>
//               <input
//                 type="date"
//                 value={date}
//                 onChange={(e) => setDate(e.target.value)}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
//               />
//             </div>

//             <div>
//               <button
//                 type="button"
//                 onClick={loadRoute}
//                 disabled={!isLoaded || loading || !agentId || !date}
//                 className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
//               >
//                 {loading ? "Loading…" : "Load Route"}
//               </button>
//             </div>
//           </div>

//           {error ? (
//             <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
//               {error}
//             </div>
//           ) : null}
//         </div>

//         <div className="rounded-lg border border-slate-200 bg-white p-3">
//           {!isLoaded ? (
//             <div className="text-sm text-slate-500">Loading map…</div>
//           ) : (
//             <GoogleMapImperative className="h-[520px] w-full" onMapReady={onMapReady} defaultZoom={6} />
//           )}
//         </div>
//       </div>
//     </Layout>
//   );
// }

export default function AgentRoutePage() {
  return <div />;
}
