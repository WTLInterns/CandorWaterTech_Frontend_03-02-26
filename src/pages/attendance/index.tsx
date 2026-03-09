import Layout from "@/components/Layout";
import { useMemo, useState, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import api from "@/lib/apiClient";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeCode?: number;
}

type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Half Day"
  | "Paid Leave"
  | "Week Off";

interface MarkEntry {
  date: string; // yyyy-mm-dd
  status: AttendanceStatus;
}

interface AttendanceDay {
  date: string; // yyyy-mm-dd
  status: AttendanceStatus;
}

type Mode = "mark" | "view";

function getMonthDays(activeDate: Date) {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay(); // 0=Sun
  const firstCell = new Date(year, month, 1 - ((startDay + 6) % 7)); // start from Monday

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("mark");

  const queryClient = useQueryClient();

  // shared calendar month state
  const [monthDate, setMonthDate] = useState(() => new Date());

  // --- Mark Attendance state ---
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Agent | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Record<string, AttendanceStatus>>({});
  const [statusPickerFor, setStatusPickerFor] = useState<string | null>(null);
  const [punchImage, setPunchImage] = useState<File | null>(null);
  const [punchReason, setPunchReason] = useState("");
  const [punchInLoading, setPunchInLoading] = useState(false);
  const [punchOutLoading, setPunchOutLoading] = useState(false);

  // --- View Attendance state ---
  const [viewEmployeeName, setViewEmployeeName] = useState("");
  const [viewEmployeeFixed, setViewEmployeeFixed] = useState<{
    id: string;
    name: string;
    employeeCode?: number;
  } | null>(null);
  const [checkModalOpen, setCheckModalOpen] = useState(false);

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

  const viewFilteredAgents = useMemo(() => {
    if (!agents) return [];
    if (!viewEmployeeName.trim()) return [];
    const q = viewEmployeeName.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, viewEmployeeName]);

  const markMutation = useMutation({
    mutationFn: async (entries: MarkEntry[]) => {
      if (!selectedEmployee) throw new Error("No employee selected");
      await api.post("/attendance/mark", {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        entries,
      });
    },
    onSuccess: () => {
      toast.success("Attendance submitted successfully");
      // Refresh View Attendance data so newly marked days appear immediately
      queryClient.invalidateQueries({ queryKey: ["attendance-view"] });
      setSelectedEntries({});
      setStatusPickerFor(null);
    },
    onError: () => {
      toast.error("Failed to submit attendance");
    },
  });

  const {
    data: viewData,
    isFetching: isViewLoading,
  } = useQuery<AttendanceDay[]>({
    queryKey: [
      "attendance-view",
      { name: viewEmployeeFixed?.name, month: monthDate.getFullYear(), m: monthDate.getMonth() },
    ],
    enabled: !!viewEmployeeFixed,
    queryFn: async () => {
      if (!viewEmployeeFixed) return [];
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const fromDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const toDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const res = await api.get("/attendance", {
        params: {
          employeeId: viewEmployeeFixed.id,
          employeeName: viewEmployeeFixed.name,
          fromDate,
          toDate,
        },
      });
      return res.data;
    },
  });

  const viewMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    (viewData || []).forEach((d) => {
      map[d.date] = d.status as AttendanceStatus;
    });
    return map;
  }, [viewData]);

  function exportToCsv(
    rows: AttendanceDay[],
    filename: string,
    employeeContext?: { employeeName: string; employeeCode?: number }
  ) {
    if (!rows || rows.length === 0) {
      toast.error("No attendance data to export");
      return;
    }
    const header = "EmployeeCode,EmployeeName,Date,Status";
    const code = employeeContext?.employeeCode ?? "";
    const name = employeeContext?.employeeName ?? "";
    const body = rows
      .map((r) => `${code},${name},${r.date},${r.status}`)
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Excel file download started");
  }

  function handleDateClick(d: Date) {
    if (mode !== "mark") return;
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    const key = formatIsoDate(d);
    setStatusPickerFor(key);
  }

  function applyStatus(dateKey: string, status: AttendanceStatus) {
    setSelectedEntries((prev) => ({ ...prev, [dateKey]: status }));
    setStatusPickerFor(null);
  }

  function clearAllSelected() {
    setSelectedEntries({});
  }

  async function handlePunchInDirect() {
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    if (!punchImage) {
      toast.error("Select an image for Punch In");
      return;
    }
    try {
      setPunchInLoading(true);
      const fd = new FormData();
      fd.append("agentId", selectedEmployee.id);
      fd.append("agentName", selectedEmployee.name);
      fd.append("workType", "FIELD");
      if (punchReason) {
        fd.append("reason", punchReason);
      }
      fd.append("image", punchImage);

      await api.post("/attendance/field/punch-in", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Punch In recorded");
      setPunchImage(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to punch in";
      toast.error(msg);
    } finally {
      setPunchInLoading(false);
    }
  }

  async function handlePunchOutDirect() {
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    try {
      setPunchOutLoading(true);
      await api.post("/attendance/field/punch-out", {
        agentId: selectedEmployee.id,
        agentName: selectedEmployee.name,
        reason: punchReason || null,
      });
      toast.success("Punch Out recorded");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to punch out";
      toast.error(msg);
    } finally {
      setPunchOutLoading(false);
    }
  }

  function handlePunchImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPunchImage(file);
  }

  function submitAttendance() {
    const entries: MarkEntry[] = Object.entries(selectedEntries).map(([date, status]) => ({
      date,
      status,
    }));
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    if (entries.length === 0) {
      toast.error("Select at least one date");
      return;
    }
    markMutation.mutate(entries);
  }

  function renderStatusBadge(status?: AttendanceStatus) {
    if (!status) return null;
    let color = "bg-emerald-600";
    if (status === "Absent") color = "bg-red-600";
    else if (status === "Half Day") color = "bg-amber-500";
    else if (status === "Paid Leave") color = "bg-blue-600";
    else if (status === "Week Off") color = "bg-slate-600";

    return (
      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] text-white ${color}`}>
        {status}
      </span>
    );
  }

  function CalendarGrid({
    activeDate,
    entries,
    viewEntries,
    onDayClick,
    onMonthChange,
  }: {
    activeDate: Date;
    entries?: Record<string, AttendanceStatus>;
    viewEntries?: Record<string, AttendanceStatus>;
    onDayClick?: (d: Date) => void;
    onMonthChange?: (deltaMonths: number) => void;
  }) {
    const monthIndex = activeDate.getMonth();
    const daysLocal = useMemo(() => getMonthDays(activeDate), [activeDate]);

    return (
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center justify-between text-xs text-slate-200">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMonthChange ? () => onMonthChange(-12) : undefined}
              className="h-6 w-6 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              «
            </button>
            <button
              type="button"
              onClick={onMonthChange ? () => onMonthChange(-1) : undefined}
              className="h-6 w-6 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              ‹
            </button>
          </div>
          <div className="font-medium">
            {activeDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMonthChange ? () => onMonthChange(1) : undefined}
              className="h-6 w-6 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              ›
            </button>
            <button
              type="button"
              onClick={onMonthChange ? () => onMonthChange(12) : undefined}
              className="h-6 w-6 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800"
            >
              »
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-7 text-[11px] text-slate-400">
          <div className="text-center">MON</div>
          <div className="text-center">TUE</div>
          <div className="text-center">WED</div>
          <div className="text-center">THU</div>
          <div className="text-center">FRI</div>
          <div className="text-center">SAT</div>
          <div className="text-center">SUN</div>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-xs">
          {daysLocal.map((d) => {
            const inMonth = d.getMonth() === monthIndex;
            const key = formatIsoDate(d);
            const status = entries?.[key] ?? viewEntries?.[key];
            const isToday = formatIsoDate(d) === formatIsoDate(new Date());

            return (
              <button
                key={key}
                type="button"
                onClick={onDayClick ? () => onDayClick(d) : undefined}
                className={`flex h-16 flex-col items-center justify-start rounded-md border px-1 pt-1 text-[11px] transition
                  ${inMonth ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-900 bg-slate-950 text-slate-600"}
                  ${onDayClick ? "hover:border-indigo-500 hover:bg-slate-900/80" : ""}
                `}
              >
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : ""}`}>
                  {d.getDate()}
                </span>
                {renderStatusBadge(status)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const statusOptions: AttendanceStatus[] = [
    "Present",
    "Absent",
    "Half Day",
    "Paid Leave",
    "Week Off",
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <span>Attendance</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Mark and review attendance for your field staff.
            </p>
          </div>
          <div className="inline-flex rounded-md bg-slate-900/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("mark")}
              className={`px-3 py-1.5 rounded-md font-medium ${
                mode === "mark" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Mark Attendance
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className={`ml-1 px-3 py-1.5 rounded-md font-medium ${
                mode === "view" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              View Attendance
            </button>
          </div>
        </div>

        {mode === "mark" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <div>
                <h2 className="text-sm font-semibold text-sky-400 flex items-center gap-2 mb-3">
                  <span>Mark Attendance</span>
                </h2>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-slate-300">Employee Name</label>
                  <div className="relative">
                    <input
                      value={selectedEmployee ? selectedEmployee.name : employeeSearch}
                      onChange={(e) => {
                        setSelectedEmployee(null);
                        setEmployeeSearch(e.target.value);
                      }}
                      placeholder="Enter employee name"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {filteredAgents.length > 0 && !selectedEmployee && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs shadow-lg">
                        {filteredAgents.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(a);
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
                </div>

                <CalendarGrid
                  activeDate={monthDate}
                  entries={selectedEntries}
                  onDayClick={handleDateClick}
                  onMonthChange={(delta) => {
                    setMonthDate((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
                    );
                  }}
                />
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-2">
                    <span>Selected Dates</span>
                    {Object.keys(selectedEntries).length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllSelected}
                        className="text-[11px] text-rose-400 hover:text-rose-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <p className="mb-2 text-[11px] text-slate-400">
                    Total Selected: {Object.keys(selectedEntries).length}
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(selectedEntries).length === 0 && (
                      <p className="text-[11px] text-slate-500">No dates selected</p>
                    )}
                    {Object.entries(selectedEntries).map(([date, status]) => (
                      <div
                        key={date}
                        className="flex items-center justify-between rounded-md bg-slate-800/70 px-3 py-2 text-[11px] text-slate-100"
                      >
                        <div>
                          <div className="font-medium">{date}</div>
                          <div className="text-slate-300">{status}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntries((prev) => {
                              const copy = { ...prev };
                              delete copy[date];
                              return copy;
                            });
                          }}
                          className="text-slate-300 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitAttendance}
                  disabled={markMutation.isPending}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
                >
                  {markMutation.isPending ? "Submitting..." : "Submit Attendance"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === "view" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <input
                    value={viewEmployeeName}
                    onChange={(e) => {
                      setViewEmployeeName(e.target.value);
                      setViewEmployeeFixed(null);
                    }}
                    placeholder="Enter Employee Full Name"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {viewFilteredAgents.length > 0 && !viewEmployeeFixed && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs shadow-lg max-h-64 overflow-y-auto">
                      {viewFilteredAgents.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setViewEmployeeFixed({ id: a.id, name: a.name, employeeCode: a.employeeCode });
                            setViewEmployeeName(a.name);
                          }}
                          className="block w-full px-3 py-2 text-left text-slate-100 hover:bg-slate-800"
                        >
                          {a.employeeCode != null ? `${a.employeeCode} - ${a.name}` : a.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-none gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!viewEmployeeFixed) {
                        toast.error("Select an employee from the list");
                        return;
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow hover:bg-blue-500"
                  >
                    View Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!viewEmployeeFixed) {
                        toast.error("Select an employee from the list");
                        return;
                      }
                      setCheckModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow hover:bg-indigo-500"
                  >
                    Check Today Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!viewData || !viewData.length) {
                        toast.error("No data for download. Select employee and month first.");
                        return;
                      }
                      if (!viewEmployeeFixed) {
                        toast.error("Select an employee from the list");
                        return;
                      }
                      exportToCsv(viewData, "attendance-all.csv", {
                        employeeName: viewEmployeeFixed.name,
                        employeeCode: viewEmployeeFixed.employeeCode,
                      });
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow hover:bg-green-500"
                  >
                    Download All
                  </button>
                </div>
              </div>
            </div>

            {viewEmployeeFixed && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <div>
                    <h2 className="text-sm font-semibold text-sky-400">
                      Attendance for {viewEmployeeFixed.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!viewData || !viewData.length) {
                        toast.error("No data to export for this period");
                        return;
                      }
                      exportToCsv(viewData, "attendance-month.csv", {
                        employeeName: viewEmployeeFixed.name,
                        employeeCode: viewEmployeeFixed.employeeCode,
                      });
                    }}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                  >
                    Export to Excel
                  </button>
                </div>

                {isViewLoading && (
                  <p className="text-[11px] text-slate-400">Loading attendance...</p>
                )}

                <CalendarGrid 
                  activeDate={monthDate} 
                  viewEntries={viewMap} 
                  onMonthChange={(delta) => {
                    setMonthDate((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
                    );
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {statusPickerFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl text-xs">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">{statusPickerFor}</h3>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStatus(statusPickerFor, s)}
                  className="flex w-full items-center justify-between rounded-md bg-slate-800/80 px-3 py-2 text-left text-slate-100 hover:bg-slate-700"
                >
                  <span>{s}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-slate-800 pt-3 space-y-2">
              <div className="text-[11px] font-semibold text-slate-200">Time Management</div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300">Attendance Image (for Punch In)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePunchImageChange}
                    className="block w-full text-[11px] text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-[11px] file:text-slate-100 hover:file:bg-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300">Reason (optional)</label>
                  <select
                    value={punchReason}
                    onChange={(e) => setPunchReason(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select reason</option>
                    <option value="Late">Late</option>
                    <option value="Half-day">Half-day</option>
                    <option value="Site visit">Site visit</option>
                    <option value="On duty">On duty</option>
                    <option value="Work from home">Work from home</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePunchInDirect}
                    disabled={punchInLoading}
                    className="flex-1 rounded-md bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {punchInLoading ? "Punching..." : "Punch In"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePunchOutDirect}
                    disabled={punchOutLoading}
                    className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {punchOutLoading ? "Punching..." : "Punch Out"}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusPickerFor(null)}
              className="mt-3 w-full rounded-md border border-slate-600 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {checkModalOpen && viewEmployeeFixed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-5xl rounded-xl border border-slate-800 bg-slate-900/95 p-4 sm:p-5 shadow-xl text-xs sm:text-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-100">Check Attendance</h3>
              <button
                type="button"
                onClick={() => setCheckModalOpen(false)}
                className="px-2 py-1 text-[11px] rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-[1.4fr,2fr]">
              <div>
                <CalendarGrid 
                  activeDate={monthDate} 
                  viewEntries={viewMap} 
                  onMonthChange={(delta) => {
                    setMonthDate((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
                    );
                  }}
                />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-slate-100">Attendance Records</div>
                    <div className="text-[11px] text-slate-400">{viewEmployeeFixed.name}</div>
                  </div>
                  <span className="text-[11px] text-slate-400">{(viewData || []).length} days</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="min-w-full text-[11px] text-slate-100">
                    <thead className="bg-slate-900/80 text-left font-semibold text-slate-300">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(viewData || []).map((d) => (
                        <tr key={d.date} className="hover:bg-slate-900/70">
                          <td className="px-3 py-2 whitespace-nowrap">{d.date}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{d.status}</td>
                        </tr>
                      ))}
                      {(viewData || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-4 text-center text-[11px] text-slate-400"
                          >
                            No attendance records for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
