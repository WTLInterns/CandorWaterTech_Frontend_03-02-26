import Layout from "@/components/Layout";
import axios from "axios";
import { useMemo, useState } from "react";

type ReportType = "SALES" | "ATTENDANCE" | "ORDERS";

interface SalesRow {
  invoiceId: string;
  invoiceNo: string;
  agentId: string;
  agentName: string | null;
  customerName: string | null;
  productName: string | null;
  total: number;
  status: string;
  invoiceDate: string; // yyyy-MM-dd
}

interface AttendanceRow {
  agentId: string;
  agentName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalDurationMinutes: number | null;
  status: string;
}

interface OrdersRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  createdDate: string;
}

const SPRING_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("SALES");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [rows, setRows] = useState<Array<SalesRow | AttendanceRow | OrdersRow>>(
    [],
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  async function handleGenerate() {
    if (!from || !to) {
      setError("Please select both From and To dates.");
      return;
    }
    setError(null);
    setLoading(true);
    setPage(0);
    try {
      let url = "";
      let body: any = { fromDate: from, toDate: to };
      if (reportType === "SALES") {
        url = `${SPRING_API_BASE}/reports/sales`;
      } else if (reportType === "ATTENDANCE") {
        url = `${SPRING_API_BASE}/reports/attendance`;
      } else {
        url = `${SPRING_API_BASE}/reports/orders`;
      }
      const res = await axios.post(url, body);
      setRows(res.data || []);
    } catch (e: any) {
      console.error("Failed to load report", e);
      setError("Failed to load report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "excel") {
    if (!from || !to) {
      setError("Please select both From and To dates.");
      return;
    }
    setError(null);
    try {
      const res = await axios.post(
        `${SPRING_API_BASE}/reports/export/${format}`,
        {
          type: reportType,
          fromDate: from,
          toDate: to,
        },
        { responseType: "blob" },
      );

      const blob = new Blob([res.data], {
        type:
          format === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName =
        reportType === "SALES"
          ? "sales-report"
          : reportType === "ATTENDANCE"
          ? "attendance-report"
          : "orders-report";
      a.download = `${baseName}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Export failed", e);
      setError("Export failed. Please try again.");
    }
  }

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(term));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Filter activity and export performance reports for your teams.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 text-xs sm:text-sm">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SALES">Sales Performance</option>
              <option value="ATTENDANCE">Attendance &amp; Visits</option>
              <option value="ORDERS">Orders / Pipeline</option>
            </select>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 pr-9 py-1.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
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
              <span className="text-slate-400">to</span>
              <div className="relative">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 pr-9 py-1.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
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
            <button
              onClick={handleGenerate}
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs sm:text-sm text-slate-100 hover:bg-slate-800"
            >
              Generate
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={!rows.length}
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs sm:text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExport("excel")}
              disabled={!rows.length}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs sm:text-sm text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Excel
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search in results..."
            className="w-full sm:w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
          {rows.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-950/40 px-3 py-2 text-xs sm:text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4 text-xs sm:text-sm text-slate-300 min-h-[260px]">
          {loading ? (
            <div className="text-sm text-slate-400">Loading report...</div>
          ) : pagedRows.length === 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-400">
                No data to show. Select a date range and click Generate.
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="mb-2 font-medium">Coming next:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Sales performance by product and agent with charts.</li>
                  <li>Attendance and visit compliance heatmaps.</li>
                  <li>Advanced filters for pipeline and orders.</li>
                </ul>
              </div>
            </div>
          ) : (
            <ReportsTable reportType={reportType} rows={pagedRows} />
          )}
        </div>
      </div>
    </Layout>
  );
}

function ReportsTable({
  reportType,
  rows,
}: {
  reportType: ReportType;
  rows: Array<SalesRow | AttendanceRow | OrdersRow>;
}) {
  if (reportType === "SALES") {
    const data = rows as SalesRow[];
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
        <table className="min-w-full text-xs sm:text-sm text-slate-100">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Invoice No</th>
              <th className="px-3 py-2 text-left">Agent</th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((r) => (
              <tr key={r.invoiceId + r.productName} className="hover:bg-slate-900">
                <td className="px-3 py-2 whitespace-nowrap">{r.invoiceNo}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.agentName || r.agentId}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.customerName || "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.productName || "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  ₹{r.total.toFixed(2)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.invoiceDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (reportType === "ATTENDANCE") {
    const data = rows as AttendanceRow[];
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
        <table className="min-w-full text-xs sm:text-sm text-slate-100">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Agent</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Check-in</th>
              <th className="px-3 py-2 text-left">Check-out</th>
              <th className="px-3 py-2 text-right">Duration (min)</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((r, idx) => (
              <tr key={r.agentId + r.date + idx} className="hover:bg-slate-900">
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.agentName || r.agentId}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.checkInTime || "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.checkOutTime || "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  {r.totalDurationMinutes ?? "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const data = rows as OrdersRow[];
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
      <table className="min-w-full text-xs sm:text-sm text-slate-100">
        <thead className="bg-slate-900 text-slate-300">
          <tr>
            <th className="px-3 py-2 text-left">Order No</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.map((r) => (
            <tr key={r.orderId} className="hover:bg-slate-900">
              <td className="px-3 py-2 whitespace-nowrap">{r.orderNumber}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.customerName}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">
                ₹{r.amount.toFixed(2)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.createdDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
