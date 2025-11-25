import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "@/components/Layout";

function buildFileUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  return `${apiBase}${path}`;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  agentId: string;
  customerId?: string | null;
  customerSnapshotJson?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyGst?: string | null;
  companyMobile?: string | null;
  companyEmail?: string | null;

  customerAddress?: string | null;
  customerGst?: string | null;
  customerMobile?: string | null;
  customerEmail?: string | null;

  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  shipping: number;
  total: number;
  currency: string;
  status: string;
  notes?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankHolderName?: string | null;
  ifscCode?: string | null;
  accountType?: string | null;
  upiId?: string | null;

  termsAndConditions?: string | null;
  paymentTerms?: string | null;

  companyLogoUrl?: string | null;
  companyStampUrl?: string | null;
  invoicePdfUrl?: string | null;
  createdAt: string;
}

interface InvoiceItem {
  id: number;
  productId?: number | null;
  name: string;
  sku?: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  tax: number;
  lineTotal: number;
}

interface InvoiceAudit {
  id: number;
  action: string;
  actorId: string;
  details?: string | null;
  createdAt: string;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [audit, setAudit] = useState<InvoiceAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${apiBase}/invoices/${id}`);
        setInvoice(res.data.invoice);
        setItems(res.data.items || []);
        setAudit(res.data.audit || []);
      } catch (e: any) {
        console.error("Failed to load invoice", e);
        setError("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, apiBase]);

  const handleMarkPaid = async () => {
    if (!invoice) return;
    try {
      await axios.post(`${apiBase}/invoices/${invoice.id}/pay`, null, {
        params: { actorId: "admin" },
      });
      router.reload();
    } catch (e) {
      console.error("Failed to mark paid", e);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm("Delete this invoice?")) return;
    try {
      await axios.delete(`${apiBase}/invoices/${invoice.id}`, {
        params: { actorId: "admin" },
      });
      router.push("/invoices");
    } catch (e) {
      console.error("Failed to delete invoice", e);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {loading && <p className="text-gray-600">Loading invoice...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {invoice && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Invoice {invoice.invoiceNo}
                </h1>
                <p className="text-sm text-gray-600">
                  Status: {invoice.status} • Created {" "}
                  {new Date(invoice.createdAt).toLocaleString()}
                </p>
              </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow text-sm space-y-1">
                <h2 className="mb-2 text-sm font-semibold text-gray-800">Bank / UPI</h2>
                {invoice.bankHolderName && <p className="text-gray-700">Account Holder: {invoice.bankHolderName}</p>}
                {invoice.bankAccountNumber && <p className="text-gray-700">Account Number: {invoice.bankAccountNumber}</p>}
                {invoice.ifscCode && <p className="text-gray-700">IFSC: {invoice.ifscCode}</p>}
                {invoice.accountType && <p className="text-gray-700">Account Type: {invoice.accountType}</p>}
                {invoice.bankName && <p className="text-gray-700">Bank: {invoice.bankName}</p>}
                {invoice.upiId && <p className="text-gray-700">UPI ID: {invoice.upiId}</p>}
              </div>
              <div className="rounded-lg bg-white p-4 shadow text-sm space-y-1">
                <h2 className="mb-2 text-sm font-semibold text-gray-800">Terms &amp; Conditions</h2>
                <p className="whitespace-pre-wrap text-gray-700">
                  {invoice.termsAndConditions || invoice.notes || "-"}
                </p>
              </div>
            </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
                {invoice.status !== "PAID" && (
                  <button
                    type="button"
                    onClick={handleMarkPaid}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                {invoice.companyName && (
                  <p className="text-xs text-gray-600">Billed by {invoice.companyName}</p>
                )}
                {invoice.customerEmail && (
                  <p className="text-xs text-gray-500">Customer email: {invoice.customerEmail}</p>
                )}
              </div>
              {invoice.invoicePdfUrl && (() => {
                const pdfUrl = buildFileUrl(invoice.invoicePdfUrl);
                if (!pdfUrl) return null;
                return (
                <div className="flex items-center gap-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    View PDF
                  </a>
                  <a
                    href={pdfUrl}
                    download
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Download PDF
                  </a>
                </div>
              );})()}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow space-y-3 text-xs">
                <div>
                  <h2 className="mb-1 text-sm font-semibold text-gray-800">Billed By</h2>
                  <p className="font-medium text-gray-900">{invoice.companyName || "-"}</p>
                  {invoice.companyAddress && <p className="text-gray-600">{invoice.companyAddress}</p>}
                  {invoice.companyGst && <p className="text-gray-600">GSTIN: {invoice.companyGst}</p>}
                  {invoice.companyMobile && <p className="text-gray-600">Mobile: {invoice.companyMobile}</p>}
                  {invoice.companyEmail && <p className="text-gray-600">Email: {invoice.companyEmail}</p>}
                </div>
                <div>
                  <h2 className="mb-1 text-sm font-semibold text-gray-800">Billed To</h2>
                  <pre className="whitespace-pre-wrap text-gray-700">
                    {invoice.customerSnapshotJson || "-"}
                  </pre>
                  {invoice.customerAddress && <p className="text-gray-600">{invoice.customerAddress}</p>}
                  {invoice.customerGst && <p className="text-gray-600">GSTIN: {invoice.customerGst}</p>}
                  {invoice.customerMobile && <p className="text-gray-600">Mobile: {invoice.customerMobile}</p>}
                  {invoice.customerEmail && <p className="text-gray-600">Email: {invoice.customerEmail}</p>}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium">₹{invoice.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">₹{invoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">₹{invoice.shipping.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="font-semibold text-gray-900">
                    ₹{invoice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">Items</h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No items</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Product
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Price
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {items.map((i) => (
                        <tr key={i.id}>
                          <td className="px-3 py-2">{i.name}</td>
                          <td className="px-3 py-2">{i.quantity}</td>
                          <td className="px-3 py-2">₹{i.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2">₹{i.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {audit.length > 0 && (
              <div className="rounded-lg bg-white p-4 shadow">
                <h2 className="mb-3 text-sm font-semibold text-gray-800">
                  Audit Trail
                </h2>
                <ul className="space-y-1 text-xs text-gray-700">
                  {audit.map((a) => (
                    <li key={a.id}>
                      <span className="font-semibold">{a.action}</span> by {a.actorId} on {" "}
                      {new Date(a.createdAt).toLocaleString()} - {a.details}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
