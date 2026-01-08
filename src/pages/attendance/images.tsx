import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import api from "@/lib/apiClient";

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeCode?: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.candorwatertech.com/api/v1";

function getImageSrc(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
}

interface AttendanceImageDto {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  status: string;
  workType?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  punchInTime?: string;
  punchOutTime?: string;
  address?: string;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  punchOutImageUrl?: string;
  punchOutAddress?: string;
}

export default function AttendanceImagesPage() {
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [employeeImage, setEmployeeImage] = useState<AttendanceImageDto | null>(null);
  const [allImages, setAllImages] = useState<AttendanceImageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AttendanceImageDto | null>(null);

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents-all"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data;
    },
  });

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    if (!employeeSearch.trim()) return [];
    const q = employeeSearch.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, employeeSearch]);

  async function fetchEmployeeImage() {
    if (!selectedAgent || !date) return;
    setLoading(true);
    setError(null);
    setEmployeeImage(null);
    try {
      const res = await api.get("/attendance/field/images", {
        params: { agentId: selectedAgent.id, date },
      });
      setEmployeeImage(res.data as AttendanceImageDto);
    } catch (e: any) {
      setError("No image found for this agent and date");
      setEmployeeImage(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllImages() {
    if (!date) return;
    setLoading(true);
    setError(null);
    setAllImages([]);
    try {
      const res = await api.get("/attendance/field/images/all", {
        params: { date },
      });
      setAllImages((res.data as AttendanceImageDto[]) || []);
    } catch (e: any) {
      setError("Failed to load images for this date");
      setAllImages([]);
    } finally {
      setLoading(false);
    }
  }

  function renderLocation(lat?: number, lng?: number) {
    if (lat == null || lng == null) return <span className="text-slate-500">Not captured</span>;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-sky-400 hover:underline"
      >
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </a>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Check Attendance Images</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              View Work From Field attendance photos and locations captured by agents.
            </p>
          </div>
        </div>

        {/* Top card: select date */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Check Attendance Images</span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-col gap-1 w-full sm:w-56">
              <label className="text-xs font-medium text-slate-300">Select Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 pr-9 py-1.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-indigo-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search by employee card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Search by Employee</h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-300">Select Employee</label>
              <input
                value={selectedAgent ? selectedAgent.name : employeeSearch}
                onChange={(e) => {
                  setSelectedAgent(null);
                  setEmployeeSearch(e.target.value);
                }}
                placeholder="Search by name or ID..."
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {filteredAgents.length > 0 && !selectedAgent && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs shadow-lg max-h-64 overflow-y-auto">
                  {filteredAgents.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgent(a);
                        setEmployeeSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-slate-100 hover:bg-slate-800"
                    >
                      {a.employeeCode != null ? `${a.employeeCode} - ${a.name}` : a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap md:w-auto">
              <button
                onClick={fetchEmployeeImage}
                disabled={loading || !selectedAgent || !date}
                className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                Search Image
              </button>
              <button
                onClick={fetchAllImages}
                disabled={loading || !date}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-60"
              >
                View All Images
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-slate-400">Loading images…</div>
          )}
          {error && !loading && (
            <div className="text-sm text-red-400">{error}</div>
          )}
        </div>

        {employeeImage && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Selected agent image</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/3">
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-medium text-slate-300 mb-1">
                      Punch In image
                    </div>
                    {employeeImage.imageUrl ? (
                      <img
                        src={getImageSrc(employeeImage.imageUrl)}
                        alt={`${employeeImage.agentName} - In`}
                        className="w-full h-40 object-cover rounded-lg border border-slate-800 cursor-pointer bg-slate-950"
                        onClick={() => setSelectedImage(employeeImage)}
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-[11px] text-slate-500 rounded-lg border border-dashed border-slate-700 bg-slate-950">
                        No in image
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-300 mb-1">
                      Punch Out image
                    </div>
                    {employeeImage.punchOutImageUrl ? (
                      <img
                        src={getImageSrc(employeeImage.punchOutImageUrl)}
                        alt={`${employeeImage.agentName} - Out`}
                        className="w-full h-40 object-cover rounded-lg border border-slate-800 cursor-pointer bg-slate-950"
                        onClick={() => setSelectedImage(employeeImage)}
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-[11px] text-slate-500 rounded-lg border border-dashed border-slate-700 bg-slate-950">
                        No out image
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="md:w-2/3 space-y-2 text-xs sm:text-sm">
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Agent:</span>
                  <span className="font-medium text-slate-100">{employeeImage.agentName}</span>
                  <span className="text-slate-500 text-[11px]">({employeeImage.agentId})</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-slate-100">{employeeImage.date}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Punch In:</span>
                  <span className="text-slate-100">{employeeImage.punchInTime ?? "-"}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Punch Out:</span>
                  <span className="text-slate-100">{employeeImage.punchOutTime ?? "-"}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-100">
                    {employeeImage.status}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-slate-400">Work type:</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-900/60 text-[11px] text-sky-200">
                    {employeeImage.workType || "FIELD"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center">
                    <span className="text-slate-400">Address In:</span>
                    <span className="text-slate-100 text-xs truncate" title={employeeImage.address || ""}>
                      {employeeImage.address || "-"}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-slate-400">Address Out:</span>
                    <span className="text-slate-100 text-xs truncate" title={employeeImage.punchOutAddress || ""}>
                      {employeeImage.punchOutAddress || "-"}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-slate-400">Location In:</span>
                    {renderLocation(employeeImage.latitude, employeeImage.longitude)}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-slate-400">Location Out:</span>
                    {renderLocation(employeeImage.punchOutLatitude, employeeImage.punchOutLongitude)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {allImages.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                All images for {date}
              </h2>
              <span className="text-[11px] text-slate-400">{allImages.length} records</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allImages.map((img) => (
                <div
                  key={img.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden"
                >
                  <div className="w-full h-40 flex">
                    {img.imageUrl ? (
                      <img
                        src={getImageSrc(img.imageUrl)}
                        alt={`${img.agentName} - In`}
                        className="w-1/2 h-40 object-cover cursor-pointer border-r border-slate-800"
                        onClick={() => setSelectedImage(img)}
                      />
                    ) : (
                      <div className="w-1/2 h-40 flex items-center justify-center text-xs text-slate-500 border-r border-slate-800">
                        No in image
                      </div>
                    )}
                    {img.punchOutImageUrl ? (
                      <img
                        src={getImageSrc(img.punchOutImageUrl)}
                        alt={`${img.agentName} - Out`}
                        className="w-1/2 h-40 object-cover cursor-pointer"
                        onClick={() => setSelectedImage(img)}
                      />
                    ) : (
                      <div className="w-1/2 h-40 flex items-center justify-center text-xs text-slate-500">
                        No out image
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1 text-[11px] text-slate-200">
                    <div className="font-medium truncate">{img.agentName}</div>
                    <div className="text-slate-400 truncate">ID: {img.agentId}</div>
                    <div className="text-slate-400">Date: {img.date}</div>
                    <div className="text-slate-400">In: {img.punchInTime ?? "-"}</div>
                    <div className="text-slate-400">Out: {img.punchOutTime ?? "-"}</div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{img.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Type:</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px]">
                        {img.workType || "FIELD"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Loc in:</span>
                        {renderLocation(img.latitude, img.longitude)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Loc out:</span>
                        {renderLocation(img.punchOutLatitude, img.punchOutLongitude)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Addr in:</span>
                        <span className="truncate" title={img.address || ""}>{img.address || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Addr out:</span>
                        <span className="truncate" title={img.punchOutAddress || ""}>{img.punchOutAddress || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur">
            <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {selectedImage.agentName} - {selectedImage.date}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Work type: {selectedImage.workType || "FIELD"} • Status: {selectedImage.status}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-2 py-1 text-xs rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                <div className="md:col-span-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {selectedImage.imageUrl ? (
                        <img
                          src={getImageSrc(selectedImage.imageUrl)}
                          alt={`${selectedImage.agentName} - In`}
                          className="w-full max-h-[220px] object-contain rounded-lg border border-slate-800 bg-slate-950"
                        />
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
                          No in image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      {selectedImage.punchOutImageUrl ? (
                        <img
                          src={getImageSrc(selectedImage.punchOutImageUrl)}
                          alt={`${selectedImage.agentName} - Out`}
                          className="w-full max-h-[220px] object-contain rounded-lg border border-slate-800 bg-slate-950"
                        />
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
                          No out image
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2 text-xs text-slate-200">
                  <div>
                    <div className="text-slate-400">Agent</div>
                    <div className="font-medium">{selectedImage.agentName}</div>
                    <div className="text-[11px] text-slate-500">ID: {selectedImage.agentId}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Date</div>
                    <div>{selectedImage.date}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Punch In</div>
                    <div>{selectedImage.punchInTime ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Punch Out</div>
                    <div>{selectedImage.punchOutTime ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Status</div>
                    <div>{selectedImage.status}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Work type</div>
                    <div>{selectedImage.workType || "FIELD"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Location In</div>
                    <div>{renderLocation(selectedImage.latitude, selectedImage.longitude)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Location Out</div>
                    <div>{renderLocation(selectedImage.punchOutLatitude, selectedImage.punchOutLongitude)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Address In</div>
                    <div className="text-xs" title={selectedImage.address || ""}>{selectedImage.address || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Address Out</div>
                    <div className="text-xs" title={selectedImage.punchOutAddress || ""}>{selectedImage.punchOutAddress || "-"}</div>
                  </div>
                  {selectedImage.imageUrl && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      <a
                        href={getImageSrc(selectedImage.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-md bg-slate-800 text-[11px] text-slate-100 hover:bg-slate-700"
                      >
                        Open full size
                      </a>
                      {selectedImage.latitude != null && selectedImage.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedImage.latitude},${selectedImage.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-md bg-sky-700 text-[11px] text-white hover:bg-sky-600"
                        >
                          View on Google Maps
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
