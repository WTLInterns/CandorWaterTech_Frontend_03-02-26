import Layout from "@/components/Layout";
import api from "@/lib/apiClient";
import { downloadBlob } from "@/lib/downloadFile";
import { useEffect, useMemo, useState } from "react";

type Agent = {
  id: number;
  name: string;
  employeeCode: number | null;
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function MovementReportPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState<string>("");
  const [date, setDate] = useState<string>(toISODate(new Date()));
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.get<Agent[]>("/agents");
      setAgents(res.data);
      if (!agentId && res.data.length > 0) {
        setAgentId(String(res.data[0].id));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agentLabel = useMemo(() => {
    const a = agents.find((x) => String(x.id) === agentId);
    return a ? `${a.name} (ID: ${a.id})` : agentId;
  }, [agents, agentId]);

  async function download(kind: "pdf" | "excel") {
    if (!agentId || !date) return;
    setDownloading(kind);
    try {
      const path = kind === "pdf" ? "/reports/location/pdf" : "/reports/location/excel";
      const ext = kind === "pdf" ? "pdf" : "xlsx";
      const res = await api.get(path, {
        params: { agentId, date },
        responseType: "blob",
      });

      const filename = `location-report-${agentId}-${date}.${ext}`;
      downloadBlob(res.data as Blob, filename);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Movement Report</h1>
          <p className="text-sm text-slate-500">
            Download a daily movement report in PDF or Excel format.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Agent</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (ID: {a.id})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Selected: {agentLabel}</p>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => download("pdf")}
                disabled={!agentId || !date || downloading !== null}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {downloading === "pdf" ? "Downloading…" : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => download("excel")}
                disabled={!agentId || !date || downloading !== null}
                className="flex-1 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {downloading === "excel" ? "Downloading…" : "Download Excel"}
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Downloads from:
            <div className="font-mono">GET /api/v1/reports/location/pdf</div>
            <div className="font-mono">GET /api/v1/reports/location/excel</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
