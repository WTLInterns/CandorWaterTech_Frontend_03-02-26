import Layout from "@/components/Layout";
import api from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeCode?: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8089/api/v1";

function getImageSrc(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
}

interface PunchRecord {
  id: string;
  agentId: string;
  agentName: string;
  date: string; // yyyy-MM-dd
  status: string;
  workType?: string;
  punchInTime?: string;
  punchOutTime?: string;
  imageUrl?: string;
  reason?: string;
  address?: string;
  punchOutImageUrl?: string;
  punchOutAddress?: string;
}

function formatMonthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function toMonthParam(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // yyyy-MM
}

export default function AttendancePunchPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentSearch, setAgentSearch] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [punchImage, setPunchImage] = useState<File | null>(null);
  const [punchingIn, setPunchingIn] = useState(false);
  const [punchingOut, setPunchingOut] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents-all"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data;
    },
  });

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    const q = agentSearch.trim().toLowerCase();
    if (!q) return [];
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, agentSearch]);

  const monthParam = toMonthParam(monthDate);

  const { data: records, refetch: refetchRecords, isLoading } = useQuery<PunchRecord[]>({
    queryKey: ["attendance-punch-records", { agentId: selectedAgent?.id, month: monthParam }],
    enabled: !!selectedAgent,
    queryFn: async () => {
      if (!selectedAgent) return [];
      const res = await api.get("/attendance/field/records", {
        params: { agentId: selectedAgent.id, month: monthParam },
      });
      return res.data;
    },
  });

  async function handlePunchIn() {
    if (!selectedAgent) {
      toast.error("Select an employee first");
      return;
    }
    if (!punchImage) {
      toast.error("Please select an image for punch in");
      return;
    }
    try {
      setPunchingIn(true);
      const fd = new FormData();
      fd.append("agentId", selectedAgent.id);
      fd.append("agentName", selectedAgent.name);
      fd.append("workType", "FIELD");
      if (reason) {
        fd.append("reason", reason);
      }
      fd.append("image", punchImage);

      await api.post("/attendance/field/punch-in", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Punch in recorded");
      setPunchImage(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      await refetchRecords();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to punch in";
      toast.error(msg);
    } finally {
      setPunchingIn(false);
    }
  }

  async function handlePunchOut() {
    if (!selectedAgent) {
      toast.error("Select an employee first");
      return;
    }
    try {
      setPunchingOut(true);
      await api.post("/attendance/field/punch-out", {
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        reason: reason || null,
      });
      toast.success("Punch out recorded");
      await refetchRecords();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to punch out";
      toast.error(msg);
    } finally {
      setPunchingOut(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPunchImage(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }

  function changeMonth(delta: number) {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Attendance Punch</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Punch in / out with automatic time and compulsory image for punch in. Month filter is applied
              per employee.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-lg font-semibold text-slate-100 shadow hover:bg-slate-800"
          >
            {formOpen ? "−" : "+"}
          </button>
        </div>

        {formOpen && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <div>
              <h2 className="text-sm font-semibold text-sky-400 mb-3">Select Employee</h2>
              <div className="relative mb-3">
                <input
                  value={selectedAgent ? selectedAgent.name : agentSearch}
                  onChange={(e) => {
                    setSelectedAgent(null);
                    setAgentSearch(e.target.value);
                  }}
                  placeholder="Enter employee name"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {filteredAgents.length > 0 && !selectedAgent && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs shadow-lg max-h-64 overflow-y-auto">
                    {filteredAgents.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAgent(a);
                          setAgentSearch("");
                        }}
                        className="block w-full px-3 py-2 text-left text-slate-100 hover:bg-slate-800"
                      >
                        {a.employeeCode != null ? `${a.employeeCode} - ${a.name}` : a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 items-start">
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 mb-2">Punch In (image required)</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:text-slate-100 hover:file:bg-slate-700"
                  />
                  {previewUrl && (
                    <div className="mt-2">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-24 w-24 rounded-md object-cover border border-slate-700"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handlePunchIn}
                    disabled={punchingIn}
                    className="mt-3 inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {punchingIn ? "Punching in..." : "Punch In Now"}
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-300 mb-2">Punch Out</h3>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Punch out uses the current server time. Image is not required.
                  </p>
                  <button
                    type="button"
                    onClick={handlePunchOut}
                    disabled={punchingOut}
                    className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {punchingOut ? "Punching out..." : "Punch Out Now"}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-semibold text-slate-300 mb-1">Reason (optional)</h3>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select reason</option>
                  <option value="Late">Late</option>
                  <option value="Half-day">Half-day</option>
                  <option value="Site visit">Site visit</option>
                  <option value="On duty">On duty</option>
                  <option value="Work from home">Work from home</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Selected reason will appear in the attendance records for this day.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-sky-400 mb-3">Month Filter</h2>
              <div className="flex items-center justify-between text-xs mb-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 hover:bg-slate-800"
                >
                  Previous
                </button>
                <span className="font-medium text-slate-100">{formatMonthLabel(monthDate)}</span>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Records are shown for the selected employee and month.
              </p>
            </div>
          </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-sky-400">
              Attendance Records {selectedAgent ? `for ${selectedAgent.name}` : ""}
            </h2>
            {isLoading && <span className="text-[11px] text-slate-400">Loading...</span>}
          </div>

          {!selectedAgent && (
            <p className="text-[11px] text-slate-400">Select an employee above to view records.</p>
          )}

          {selectedAgent && (records?.length ?? 0) === 0 && !isLoading && (
            <p className="text-[11px] text-slate-400">No records for this month.</p>
          )}

          {selectedAgent && (records?.length ?? 0) > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="min-w-full text-xs text-slate-100">
                <thead className="bg-slate-900/80 text-left text-[11px] font-semibold text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Punch In</th>
                    <th className="px-3 py-2">Punch Out</th>
                    <th className="px-3 py-2">Work Type</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Images</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records!.map((r) => {
                    const d = new Date(r.date);
                    const dayName = d.toLocaleString(undefined, { weekday: "short" });
                    const formatted = d.toLocaleDateString();
                    return (
                      <tr key={r.id} className="hover:bg-slate-900/70">
                        <td className="px-3 py-2 whitespace-nowrap">{formatted}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-300">{dayName}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              r.status === "Present"
                                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/60"
                                : "bg-slate-700/40 text-slate-200 border border-slate-600/60"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-emerald-200">
                          {r.punchInTime || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-rose-200">
                          {r.punchOutTime || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-200">
                          {r.workType || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-200 max-w-[160px] truncate" title={r.reason || ""}>
                          {r.reason || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-200 max-w-[220px] truncate" title={`${r.address || "-"}${r.punchOutAddress ? ` | Out: ${r.punchOutAddress}` : ""}`}>
                          <div className="flex flex-col gap-0.5">
                            <span>In: {r.address || "-"}</span>
                            <span>Out: {r.punchOutAddress || "-"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {r.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setImageModalUrl(r.imageUrl!)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-800"
                              >
                                <img
                                  src={getImageSrc(r.imageUrl)}
                                  alt="Punch in"
                                  className="h-6 w-6 rounded object-cover"
                                />
                                <span>In</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500">No in image</span>
                            )}
                            {r.punchOutImageUrl ? (
                              <button
                                type="button"
                                onClick={() => setImageModalUrl(r.punchOutImageUrl!)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-800"
                              >
                                <img
                                  src={getImageSrc(r.punchOutImageUrl)}
                                  alt="Punch out"
                                  className="h-6 w-6 rounded object-cover"
                                />
                                <span>Out</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500">No out image</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {imageModalUrl && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900/95 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">Attendance Image</h3>
                <button
                  type="button"
                  onClick={() => setImageModalUrl(null)}
                  className="px-2 py-1 text-xs rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                <img
                  src={getImageSrc(imageModalUrl)}
                  alt="Attendance full size"
                  className="w-full max-h-[70vh] object-contain rounded-lg border border-slate-800 bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
