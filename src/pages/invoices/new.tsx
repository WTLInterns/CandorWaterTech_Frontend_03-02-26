import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Layout from "@/components/Layout";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  description?: string;
}

interface InvoiceItemForm {
  productId?: number;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  tax: number;
  lineTotal: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<InvoiceItemForm>({
    name: "",
    sku: "",
    unitPrice: 0,
    quantity: 1,
    discount: 0,
    tax: 0,
    lineTotal: 0,
  });
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Company / billed-by
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyGst, setCompanyGst] = useState("");
  const [companyMobile, setCompanyMobile] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  // Billed-to extras
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Bank / UPI
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountType, setAccountType] = useState("");
  const [upiId, setUpiId] = useState("");

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${apiBase}/products`);
        setProducts(res.data || []);
      } catch (e) {
        console.error("Failed to load products", e);
      }
    };
    fetchProducts();
  }, [apiBase]);

  const recalcLine = (item: InvoiceItemForm): InvoiceItemForm => {
    const base = item.unitPrice * item.quantity;
    const discountAmt = (base * item.discount) / 100;
    const taxable = base - discountAmt;
    const taxAmt = (taxable * item.tax) / 100;
    const total = taxable + taxAmt;
    return { ...item, lineTotal: Number(total.toFixed(2)) };
  };

  const handleProductChange = (id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const updated = recalcLine({
      ...currentItem,
      productId: p.id,
      name: p.name,
      sku: p.sku,
      unitPrice: p.price,
      quantity: currentItem.quantity || 1,
    });
    setCurrentItem(updated);
  };

  const handleAddItem = () => {
    if (!currentItem.name || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      setError("Please select a product and enter valid quantity and price");
      return;
    }
    setItems((prev) => [...prev, recalcLine(currentItem)]);
    setCurrentItem({
      name: "",
      sku: "",
      unitPrice: 0,
      quantity: 1,
      discount: 0,
      tax: 0,
      lineTotal: 0,
    });
    setError(null);
  };

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totalDiscount = items.reduce(
    (sum, i) => sum + (i.unitPrice * i.quantity * i.discount) / 100,
    0
  );
  const taxAmount = items.reduce((sum, i) => {
    const base = i.unitPrice * i.quantity;
    const disc = (base * i.discount) / 100;
    const taxable = base - disc;
    return sum + (taxable * i.tax) / 100;
  }, 0);
  const shipping = 0;
  const total = items.reduce((sum, i) => sum + i.lineTotal, 0) + shipping;
  const handleNext = () => {
    if (!customerName || items.length === 0) {
      setError("Customer name and at least one item are required");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const agentId = "ADMIN"; // TODO: derive from auth/session
      const createdBy = "admin";
      const payload = {
        agentId,
        createdBy,
        customerId: null,
        customerSnapshotJson: JSON.stringify({
          name: customerName,
          phone: customerPhone,
        }),

        // Company / billed-by snapshot
        companyName: companyName || undefined,
        companyAddress: companyAddress || undefined,
        companyGst: companyGst || undefined,
        companyMobile: companyMobile || undefined,
        companyEmail: companyEmail || undefined,

        // Billed-to extras
        customerAddress: customerAddress || undefined,
        customerGst: customerGst || undefined,
        customerMobile: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discount: (i.unitPrice * i.quantity * i.discount) / 100,
          tax: (i.unitPrice * i.quantity * i.tax) / 100,
          lineTotal: i.lineTotal,
        })),
        subtotal,
        totalDiscount,
        taxAmount,
        shipping,
        total,
        currency: "INR",
        status: "DRAFT",
        notes,

        // Bank / UPI
        bankName: bankName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        bankHolderName: bankHolderName || undefined,
        ifscCode: ifscCode || undefined,
        accountType: accountType || undefined,
        upiId: upiId || undefined,

        // Terms
        termsAndConditions: notes || undefined,
        paymentTerms: undefined,

        // File URLs (admin may set later or via other flows)
        companyLogoUrl: undefined,
        companyStampUrl: undefined,
        invoicePdfUrl: undefined,

        invoiceDate: new Date().toISOString(),
        dueDate: null,
      };

      await axios.post(`${apiBase}/invoices`, payload);
      router.push("/invoices");
    } catch (e: any) {
      console.error("Failed to save invoice", e);
      setError(e.response?.data?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">New Invoice</h1>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`rounded-full px-3 py-1 ${
                step === 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              1. Details
            </span>
            <span className="text-gray-400">→</span>
            <span
              className={`rounded-full px-3 py-1 ${
                step === 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              2. Review
            </span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {step === 1 && (
          <>
            <div className="rounded-lg bg-white p-4 shadow space-y-4">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-800">Billed By (Company)</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Address</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">GSTIN</label>
                    <input
                      type="text"
                      value={companyGst}
                      onChange={(e) => setCompanyGst(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Mobile</label>
                    <input
                      type="text"
                      value={companyMobile}
                      onChange={(e) => setCompanyMobile(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-800">Billed To (Customer)</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Customer Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Address</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">GSTIN</label>
                    <input
                      type="text"
                      value={customerGst}
                      onChange={(e) => setCustomerGst(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">Add Products</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Product
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={currentItem.productId || ""}
                    onChange={(e) => handleProductChange(Number(e.target.value))}
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={currentItem.quantity}
                    onChange={(e) =>
                      setCurrentItem((prev) =>
                        recalcLine({
                          ...prev,
                          quantity: Number(e.target.value || 1),
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentItem.discount}
                    onChange={(e) =>
                      setCurrentItem((prev) =>
                        recalcLine({
                          ...prev,
                          discount: Number(e.target.value || 0),
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentItem.tax}
                    onChange={(e) =>
                      setCurrentItem((prev) =>
                        recalcLine({
                          ...prev,
                          tax: Number(e.target.value || 0),
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Line Total: <span className="font-semibold">₹{currentItem.lineTotal.toFixed(2)}</span>
                </p>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Item
                </button>
              </div>

              {items.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Price</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {items.map((i, idx) => (
                        <tr key={idx}>
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

            <div className="rounded-lg bg-white p-4 shadow space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium">₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-semibold text-gray-800">Total</span>
                <span className="font-semibold text-gray-900">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow space-y-4">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-800">Bank / UPI</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankHolderName}
                      onChange={(e) => setBankHolderName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Account Number</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">IFSC Code</label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Account Type</label>
                    <input
                      type="text"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-800">Terms &amp; Conditions</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/invoices")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Review Invoice
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="rounded-lg bg-white p-4 shadow space-y-4 text-sm">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">Customer</h2>
                <p className="text-gray-900 font-medium">{customerName || "-"}</p>
                <p className="text-gray-600 text-xs">{customerPhone || "-"}</p>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">Items</h2>
                {items.length === 0 ? (
                  <p className="text-gray-500">No items added.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Price</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Discount%</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Tax%</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {items.map((i, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{i.name}</td>
                            <td className="px-3 py-2">{i.quantity}</td>
                            <td className="px-3 py-2">₹{i.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2">{i.discount}%</td>
                            <td className="px-3 py-2">{i.tax}%</td>
                            <td className="px-3 py-2">₹{i.lineTotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">Totals</h2>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium">₹{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-semibold text-gray-900">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {notes && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 mb-1">Notes</h2>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Edit
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/invoices")}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
