import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Eye, Download, Pencil, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";

function buildFileUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.candorwatertech.com/api/v1";
  // Backend runs under context-path /api/v1, and invoicePdfUrl is a relative
  // path like /uploads/invoices/xxx.pdf, so the actual URL must be
  // https://api.candorwatertech.com/api/v1/uploads/...
  return `${apiBase}${path}`;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  agentId: string;
  agentName?: string | null;
  customerId?: string | null;
  customerSnapshotJson?: string | null;
  invoicePdfUrl?: string | null;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  shipping: number;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.candorwatertech.com/api/v1";

  async function loadInvoices() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBase}/invoices`, {
        params: {
          page: 0,
          size: 100,
        },
      });
      const page = res.data;
      setInvoices(page.content || []);
    } catch (e: any) {
      console.error("Failed to load invoices", e);
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(inv: Invoice) {
    const confirmed = window.confirm(
      `Delete invoice ${inv.invoiceNo}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${apiBase}/invoices/${inv.id}`, {
        params: { actorId: "ADMIN_WEB" },
      });
      await loadInvoices();
    } catch (e) {
      console.error("Failed to delete invoice", e);
      alert("Failed to delete invoice");
    }
  }

  const filtered = invoices.filter((inv, index) => {
    if (!search.trim()) return true;
    const srNo = String(index + 1);
    const snapshot = inv.customerSnapshotJson
      ? JSON.parse(inv.customerSnapshotJson)
      : null;
    const customerName = snapshot?.name || "";
    const employee = inv.agentId || "";
    const haystack = `${srNo} ${inv.invoiceNo} ${customerName} ${employee}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <Layout>
      <div className="space-y-6 bg-slate-950 -m-6 p-6 min-h-screen text-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-3xl font-semibold text-sky-300">
            Invoice Management
          </h1>
          <Link
            href="/invoices/pdf"
            className="inline-flex items-center rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-fuchsia-700"
          >
            + Create PDF Invoice
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl bg-slate-900/80 p-4 shadow border border-slate-700">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by employee or customer name..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadInvoices()}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/90 p-4 shadow border border-slate-700">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Invoices List</h2>
              {loading && (
                <span className="text-xs text-slate-400">Loading...</span>
              )}
            </div>

            {error && (
              <p className="mb-3 text-sm text-red-400">{error}</p>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-sm text-slate-400">
                No invoices found.
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
                      <th className="px-4 py-3 text-left">SR NO</th>
                      <th className="px-4 py-3 text-left">INVOICE NO</th>
                      <th className="px-4 py-3 text-left">CUSTOMER NAME</th>
                      <th className="px-4 py-3 text-left">MOBILE NO</th>
                      <th className="px-4 py-3 text-left">EMPLOYEE (SALES PERSON)</th>
                      <th className="px-4 py-3 text-right">TOTAL AMOUNT</th>
                      <th className="px-4 py-3 text-left">DATE</th>
                      <th className="px-4 py-3 text-center">PDF</th>
                      <th className="px-4 py-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, index) => {
                      const snapshot = inv.customerSnapshotJson
                        ? JSON.parse(inv.customerSnapshotJson)
                        : null;
                      const customerName = snapshot?.name || "-";
                      const customerMobile = snapshot?.phone || "-";
                      const employee = inv.agentName || inv.agentId || "-";
                      const created = new Date(inv.createdAt).toLocaleDateString();

                      return (
                        <tr
                          key={inv.id}
                          className="border-t border-slate-700 bg-slate-900/60 hover:bg-slate-800/80"
                        >
                          <td className="px-4 py-3 text-slate-200">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="text-sky-300 hover:text-sky-400 font-semibold"
                            >
                              {inv.invoiceNo}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {customerName}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {customerMobile}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {employee}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                            Rs.{inv.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-200">{created}</td>
                          <td className="px-4 py-3 text-center">
                            {inv.invoicePdfUrl ? (
                              (() => {
                                const pdfUrl = buildFileUrl(inv.invoicePdfUrl);
                                if (!pdfUrl) {
                                  return (
                                    <span className="text-xs text-slate-500">
                                      No PDF
                                    </span>
                                  );
                                }
                                return (
                                  <div className="inline-flex items-center gap-3 text-slate-200">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewUrl(pdfUrl || null)
                                      }
                                      className="text-sky-300 hover:text-sky-400"
                                      title="View PDF"
                                    >
                                      <Eye className="h-5 w-5" />
                                    </button>
                                    <a
                                      href={pdfUrl}
                                      download
                                      className="text-emerald-400 hover:text-emerald-500"
                                      title="Download PDF"
                                    >
                                      <Download className="h-5 w-5" />
                                    </a>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-xs text-slate-500">
                                No PDF
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-4">
                              <Link
                                href={`/invoices/pdf?id=${inv.id}`}
                                className="text-sky-300 hover:text-sky-400"
                                title="Edit invoice"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(inv)}
                                className="text-rose-400 hover:text-rose-500"
                                title="Delete invoice"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-[95vw] max-w-6xl h-[90vh] overflow-hidden rounded-xl bg-slate-900 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2 bg-slate-950 text-white">
              <h2 className="text-sm font-semibold">Invoice PDF Preview</h2>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="rounded-full px-2 text-lg leading-none hover:bg-white/10"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="h-[calc(100%-40px)] bg-slate-900">
              <iframe
                src={previewUrl}
                className="h-full w-full"
                title="Invoice PDF"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
