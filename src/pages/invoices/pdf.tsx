import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import jsQR from "jsqr";
import QRCode from "qrcode";
import axios from "axios";
import Layout from "@/components/Layout";

interface Product {
  id: number;
  name: string;
  sku?: string;
  price: number;
  description?: string;
}

interface Agent {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  department?: string;
}

interface ItemForm {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  shipping: number;
}

const SPRING_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export default function PdfInvoicePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyGst, setCompanyGst] = useState("");
  const [companyMobile, setCompanyMobile] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");
  const [companyStamp, setCompanyStamp] = useState<File | null>(null);
  const [companyStampPreview, setCompanyStampPreview] = useState<string>("");

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [uid, setUid] = useState("");
  const [notes, setNotes] = useState("");

  // Optional employee / personal details to mirror legacy CheckInvoice fields
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeDepartment, setEmployeeDepartment] = useState("");

  const [panCard, setPanCard] = useState("");
  const [aadharCard, setAadharCard] = useState("");
  const [qrAmount, setQrAmount] = useState<number | null>(null);

  const [terms, setTerms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState<string>("");

  const [items, setItems] = useState<ItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<ItemForm>({
    productId: undefined,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPct: 0,
    taxPct: 18,
    shipping: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // QR scan state
  const [showQr, setShowQr] = useState(false);
  const [qrStatus, setQrStatus] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load products & agents (same backend as other admin pages)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${SPRING_API_BASE}/products`);
        setProducts(res.data || []);
      } catch (e) {
        console.error("Failed to load products", e);
      }
    };
    const fetchAgents = async () => {
      try {
        const res = await axios.get(`${SPRING_API_BASE}/agents`);
        setAgents(res.data || []);
      } catch (e) {
        console.error("Failed to load agents", e);
      }
    };

    fetchProducts();
    fetchAgents();
  }, []);

  // If opened with ?id=... prefill from existing invoice
  useEffect(() => {
    if (!router.isReady) return;
    const editInvoiceId = router.query.id as string | undefined;
    if (!editInvoiceId) return;
    const loadInvoice = async () => {
      try {
        const res = await axios.get(`${SPRING_API_BASE}/invoices/${editInvoiceId}`);
        const inv = res.data.invoice;
        const invItems = res.data.items || [];
        setEditingInvoiceId(inv.id);

        setSelectedAgentId(inv.agentId || "");
        setCompanyName(inv.companyName || "");
        setCompanyAddress(inv.companyAddress || "");
        setCompanyGst(inv.companyGst || "");
        setCompanyMobile(inv.companyMobile || "");
        setCompanyEmail(inv.companyEmail || "");

        const snapshot = inv.customerSnapshotJson
          ? JSON.parse(inv.customerSnapshotJson)
          : null;
        setCustomerName(snapshot?.name || "");
        setCustomerMobile(snapshot?.phone || inv.customerMobile || "");
        setCustomerAddress(inv.customerAddress || "");
        setCustomerGst(inv.customerGst || "");
        setCustomerEmail(inv.customerEmail || "");

        setBankName(inv.bankName || "");
        setBankAccountNumber(inv.bankAccountNumber || "");
        setBankHolderName(inv.bankHolderName || "");
        setIfscCode(inv.ifscCode || "");
        setBankBranch(inv.bankBranch || "");
        setUpiId(inv.upiId || "");
        setUid(inv.upiId || "");

        setTerms(inv.termsAndConditions || "");
        setPaymentTerms(inv.paymentTerms || "");
        setNotes(inv.notes || "");

        if (inv.invoiceDate) {
          const d = new Date(inv.invoiceDate);
          if (!isNaN(d.getTime())) {
            setInvoiceDate(d.toISOString().slice(0, 10));
          }
        }
        if (inv.dueDate) {
          const d = new Date(inv.dueDate);
          if (!isNaN(d.getTime())) {
            setDueDate(d.toISOString().slice(0, 10));
          }
        }

        const mappedItems: ItemForm[] = invItems.map((i: any) => {
          const amount = (i.quantity || 0) * (i.unitPrice || 0);
          const discountAmt = Number(i.discount || 0);
          const taxAmt = Number(i.tax || 0);
          const discountPct = amount ? (discountAmt / amount) * 100 : 0;
          const taxable = amount - discountAmt;
          const taxPct = taxable ? (taxAmt / taxable) * 100 : 0;
          return {
            productId: i.productId ?? undefined,
            description: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPct,
            taxPct,
            shipping: 0,
          };
        });
        setItems(mappedItems);
      } catch (e) {
        console.error("Failed to load invoice for edit", e);
      }
    };
    loadInvoice();
  }, [router.isReady, router.query.id]);

  const subtotal = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );
  const totalDiscount = items.reduce((sum, it) => {
    const amount = it.quantity * it.unitPrice;
    return sum + (amount * it.discountPct) / 100;
  }, 0);
  const taxAmount = items.reduce((sum, it) => {
    const amount = it.quantity * it.unitPrice;
    const disc = (amount * it.discountPct) / 100;
    const taxable = amount - disc;
    return sum + (taxable * it.taxPct) / 100;
  }, 0);
  const shippingTotal = items.reduce((sum, it) => sum + it.shipping, 0);
  const total = items.reduce((sum, it) => {
    const amount = it.quantity * it.unitPrice;
    const disc = (amount * it.discountPct) / 100;
    const taxable = amount - disc;
    const tax = (taxable * it.taxPct) / 100;
    return sum + taxable + tax + it.shipping;
  }, 0);

  function handleProductChange(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setCurrentItem((prev) => ({
      ...prev,
      productId: p.id,
      description: p.name,
      unitPrice: p.price,
      quantity: prev.quantity || 1,
    }));
  }

  function handleAddItem() {
    if (!currentItem.description || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      setError("Please enter valid item description, quantity and price");
      return;
    }
    setItems((prev) => [...prev, currentItem]);
    setCurrentItem({
      productId: undefined,
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountPct: 0,
      taxPct: 18,
      shipping: 0,
    });
    setError(null);
  }

  function isValidVpa(vpa: string) {
    if (!vpa) return false;
    const re = /^[a-zA-Z0-9._-]{3,}@[a-zA-Z][a-zA-Z0-9._-]{1,}$/;
    return re.test(vpa.trim());
  }

  function detectBankFromUpi(vpa: string) {
    if (!vpa || !vpa.includes("@")) return "";
    const suffix = vpa.split("@")[1].toLowerCase();
    const map: Record<string, string> = {
      oksbi: "State Bank of India",
      sbi: "State Bank of India",
      okhdfc: "HDFC Bank",
      hdfc: "HDFC Bank",
      okicici: "ICICI Bank",
      icici: "ICICI Bank",
      okaxis: "Axis Bank",
      axis: "Axis Bank",
      okpnb: "Punjab National Bank",
      pnb: "Punjab National Bank",
      okkotak: "Kotak Mahindra Bank",
      kotak: "Kotak Mahindra Bank",
      okboi: "Bank of India",
      boi: "Bank of India",
      okcbi: "Central Bank of India",
      cbi: "Central Bank of India",
      okubi: "Union Bank of India",
      ubi: "Union Bank of India",
      okidfcb: "IDFC First Bank",
      idfc: "IDFC First Bank",
      okfederal: "Federal Bank",
      federal: "Federal Bank",
      oksbm: "State Bank of Mysore",
      sbm: "State Bank of Mysore",
      paytm: "Paytm Payments Bank",
      airtel: "Airtel Payments Bank",
      jio: "Jio Payments Bank",
      ybl: "Yes Bank",
    };
    return map[suffix] || "";
  }

  function applyUpiInfoFromQr(data: string) {
    try {
      let upi = data;
      let amountStr: string | null = null;

      if (data.startsWith("upi://")) {
        const url = new URL(data);
        upi = url.searchParams.get("pa") || data;
        amountStr = url.searchParams.get("am");
      }

      if (upi) {
        setUpiId(upi);
        const bank = detectBankFromUpi(upi);
        if (bank && !bankName) {
          setBankName(bank);
        }
        setUid(upi);
        setQrStatus(`Scanned UPI: ${upi}${bank ? ` • ${bank}` : ""}`);
      }

      if (amountStr) {
        const amt = parseFloat(amountStr);
        if (!isNaN(amt) && amt > 0) {
          setQrAmount(amt);
        }
      }
    } catch (e) {
      console.error("Failed to parse UPI QR data", e);
      setUpiId(data);
    }
  }

  // Convert number to words (Indian system) for display in preview
  function numberToWordsIndian(value: number): string {
    if (value === null || value === undefined) return "";
    const num = Number(value);
    if (isNaN(num)) return "";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const twoDigits = (n: number) => {
      if (n < 20) return ones[n];
      const t = Math.floor(n / 10);
      const o = n % 10;
      return tens[t] + (o ? " " + ones[o] : "");
    };

    const threeDigits = (n: number) => {
      const h = Math.floor(n / 100);
      const r = n % 100;
      let str = "";
      if (h) str += ones[h] + " Hundred";
      if (r) str += (str ? " " : "") + twoDigits(r);
      return str || "Zero";
    };

    const integer = Math.floor(num);
    const crore = Math.floor(integer / 10000000);
    const lakh = Math.floor((integer % 10000000) / 100000);
    const thousand = Math.floor((integer % 100000) / 1000);
    const hundred = integer % 1000;

    let words = "";
    if (crore) words += threeDigits(crore) + " Crore ";
    if (lakh) words += threeDigits(lakh) + " Lakh ";
    if (thousand) words += threeDigits(thousand) + " Thousand ";
    if (hundred) words += threeDigits(hundred);
    words = words.trim();
    if (!words) words = "Zero";

    const paise = Math.round((num - integer) * 100);
    if (paise) {
      const pWords = twoDigits(paise);
      return `${words} Rupees and ${pWords} Paise`;
    }
    return `${words} Rupees`;
  }

  // Build a professional invoice PDF using jsPDF (no html2canvas snapshot)
  async function generateProfessionalPdf(): Promise<Blob | null> {
    if (!companyName || !customerName || items.length === 0) {
      setError("Company, customer and at least one item are required");
      return null;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const purple: [number, number, number] = [107, 70, 193];
    const lightGray: [number, number, number] = [248, 248, 248];

    const invoiceNumber = `INV-${Date.now().toString().slice(-4)}`;

    // Pre-generate QR code image (if UPI / UID present) so it can be embedded in the PDF.
    // Use full UPI payment URL so that scanning opens UPI apps (PhonePe / GPay) instead of text search.
    let qrDataUrl: string | null = null;
    if (uid || upiId) {
      const payeeAddress = uid || upiId || "merchant@upi";
      const payeeName = encodeURIComponent(companyName || "Merchant");
      const amountNumber = Number(total || 0);
      const amountStr = amountNumber.toFixed(2);
      const qrValue = `upi://pay?pa=${payeeAddress}&pn=${payeeName}&am=${amountStr}&cu=INR&tn=Invoice%20${invoiceNumber}`;

      try {
        qrDataUrl = await QRCode.toDataURL(qrValue, {
          margin: 1,
          width: 220,
          errorCorrectionLevel: "M",
        });
      } catch (e) {
        console.warn("Failed to generate QR code for PDF", e);
      }
    }
    doc.setProperties({
      title: `Invoice ${invoiceNumber}`,
      subject: "Invoice Document",
      creator: "FieldForcePro",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    let y = margin;

    // Company logo at top-right
    if (companyLogoPreview) {
      try {
        const imgType = companyLogoPreview.startsWith("data:image/jpeg") ||
          companyLogoPreview.startsWith("data:image/jpg")
          ? "JPEG"
          : "PNG";
        const logoW = 30;
        const logoH = 16;
        const logoX = pageWidth - margin - logoW;
        const logoY = 12;
        doc.addImage(companyLogoPreview, imgType, logoX, logoY, logoW, logoH);
      } catch (e) {
        console.warn("Failed to render logo", e);
      }
    }

    // Header: INVOICE
    y = 20;
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("INVOICE", margin, y);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    y += 8;

    // Invoice meta (number, dates)
    doc.setFont("helvetica", "bold");
    doc.text("Invoice No #", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoiceNumber, margin + 25, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Invoice Date", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoiceDate || new Date().toISOString().slice(0, 10), margin + 25, y);
    y += 5;

    if (dueDate) {
      doc.setFont("helvetica", "bold");
      doc.text("Due Date", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(dueDate, margin + 25, y);
      y += 5;
    }

    y += 5;
    doc.setDrawColor(...purple);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Billed By / Billed To columns
    const leftColX = margin;
    const rightColX = margin + contentWidth / 2 + 5;
    let leftY = y;
    let rightY = y;

    // Billed By
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Billed By", leftColX, leftY);
    leftY += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(companyName || "Company Name", leftColX, leftY);
    leftY += 4;
    if (companyGst) {
      doc.setFont("helvetica", "bold");
      doc.text("GSTIN", leftColX, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(companyGst, leftColX + 18, leftY);
      leftY += 4;
    }
    if (companyEmail) {
      doc.setFont("helvetica", "bold");
      doc.text("Email", leftColX, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(companyEmail, leftColX + 18, leftY);
      leftY += 4;
    }

    // Billed To
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Billed To", rightColX, rightY);
    rightY += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (customerName) {
      doc.text(customerName, rightColX, rightY);
      rightY += 4;
    }
    if (customerMobile) {
      doc.setFont("helvetica", "bold");
      doc.text("Mobile", rightColX, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(customerMobile, rightColX + 18, rightY);
      rightY += 4;
    }
    if (panCard) {
      doc.setFont("helvetica", "bold");
      doc.text("PAN", rightColX, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(panCard, rightColX + 18, rightY);
      rightY += 4;
    }

    y = Math.max(leftY, rightY) + 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Product/Service table
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Product/Service Details & Calculations", margin, y);
    y += 6;

    const colW = [12, 38, 16, 26, 26, 20, 18, 24];
    const rowH = 10;
    const headerH = 10;
    const tableY = y;
    const tableHeight = headerH + items.length * rowH;

    // Vertical lines
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    let verticalX = margin;
    for (let i = 0; i < colW.length; i++) {
      doc.line(verticalX, tableY, verticalX, tableY + headerH + items.length * rowH);
      verticalX += colW[i];
    }
    doc.line(verticalX, tableY, verticalX, tableY + headerH + items.length * rowH);

    // Outer border
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.8);
    doc.rect(margin, tableY, contentWidth, headerH + items.length * rowH);

    // Header background
    doc.setFillColor(...purple);
    doc.rect(margin, tableY, contentWidth, headerH, "F");

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const currencySymbol = "Rs.";
    const headers = [
      "Sr.",
      "Product Name",
      "Qty",
      `${currencySymbol} Unit Price`,
      `${currencySymbol} Shipping`,
      "Disc%",
      "Tax%",
      `${currencySymbol} Total`,
    ];
    let headerX = margin;
    headers.forEach((h, i) => {
      const centerX = headerX + colW[i] / 2;
      doc.text(h, centerX, tableY + headerH / 2 + 2, { align: "center" });
      headerX += colW[i];
    });

    // Data rows
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let rowY = tableY + headerH;
    let grand = 0;

    items.forEach((it, idx) => {
      const amount = it.quantity * it.unitPrice;
      const discountAmt = (amount * it.discountPct) / 100;
      const taxable = amount - discountAmt;
      const taxAmt = (taxable * it.taxPct) / 100;
      const totalLine = taxable + taxAmt + it.shipping;
      grand += totalLine;

      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
      } else {
        doc.setFillColor(...lightGray);
      }
      doc.rect(margin, rowY, contentWidth, rowH, "F");

      const rowData = [
        String(idx + 1),
        it.description || "",
        String(it.quantity || 0),
        amount ? Number(it.unitPrice || 0).toFixed(2) : Number(it.unitPrice || 0).toFixed(2),
        Number(it.shipping || 0).toFixed(2),
        Number(it.discountPct || 0).toFixed(2),
        Number(it.taxPct || 0).toFixed(2),
        Number(totalLine).toFixed(2),
      ];

      let cellX = margin;
      const textY = rowY + rowH / 2 + 2;
      rowData.forEach((val, i) => {
        const centerX = cellX + colW[i] / 2;
        if (i === 1) {
          const maxW = colW[i] - 4;
          const lines = doc.splitTextToSize(String(val), maxW);
          const startY = textY - (lines.length - 1) * 1.75;
          lines.forEach((line: string, li: number) => {
            doc.text(line, centerX, startY + li * 3.5, { align: "center" });
          });
        } else {
          doc.text(String(val), centerX, textY, { align: "center" });
        }
        cellX += colW[i];
      });

      rowY += rowH;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(margin, rowY, margin + contentWidth, rowY);
    });

    // Bottom border
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.8);
    doc.line(margin, tableY + tableHeight, margin + contentWidth, tableY + tableHeight);

    y = tableY + tableHeight + 6;

    // Total in words
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const words = numberToWordsIndian(total || grand);
    doc.text(`Total (in words): ${words.toUpperCase()}`, margin, y);
    y += 6;

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    const totalLabel = "Total (INR)";
    const gVal = `Rs.${(total || grand).toFixed(2)}`;
    doc.text(totalLabel, margin, y);
    doc.text(gVal, margin + contentWidth, y, { align: "right" });
    y += 10;

    // Bank + UPI
    let bankY = y;
    let upiY = y;
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Bank Details", leftColX, bankY);
    doc.text("UPI - Scan to Pay", rightColX, upiY);
    bankY += 6;
    upiY += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (bankName) {
      doc.setFont("helvetica", "bold");
      doc.text("Account Name:", leftColX, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(bankName, leftColX + 30, bankY);
      bankY += 4;
    }
    if (bankAccountNumber) {
      doc.setFont("helvetica", "bold");
      doc.text("Account Number:", leftColX, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(bankAccountNumber, leftColX + 30, bankY);
      bankY += 4;
    }
    if (ifscCode) {
      doc.setFont("helvetica", "bold");
      doc.text("IFSC:", leftColX, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(ifscCode, leftColX + 30, bankY);
      bankY += 4;
    }
    if (bankHolderName) {
      doc.setFont("helvetica", "bold");
      doc.text("Account Holder:", leftColX, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(bankHolderName, leftColX + 30, bankY);
      bankY += 4;
    }

    if (uid || upiId) {
      doc.setFont("helvetica", "normal");
      doc.text(`UPI ID: ${uid || upiId}`, rightColX, upiY);
      upiY += 4;
    }

    // Draw QR image to the right side under "UPI - Scan to Pay" heading, if available
    if (qrDataUrl) {
      try {
        const qrSize = 45; // mm
        const qrX = rightColX;
        const qrY = upiY + 2;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
        upiY = qrY + qrSize + 2;
      } catch (e) {
        console.warn("Failed to render QR image in PDF", e);
      }
    }

    y = Math.max(bankY, upiY) + 10;

    // Terms & Conditions
    if (terms) {
      doc.setTextColor(...purple);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Terms and Conditions", margin, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(terms, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 4;
    }

    // Company stamp / signature at bottom-right
    if (companyStampPreview) {
      try {
        const imgType = companyStampPreview.startsWith("data:image/jpeg") ||
          companyStampPreview.startsWith("data:image/jpg")
          ? "JPEG"
          : "PNG";
        const stampW = 40;
        const stampH = 18;
        const stampX = pageWidth - margin - stampW;
        const stampY = pageHeight - margin - stampH - 10;
        doc.addImage(companyStampPreview, imgType, stampX, stampY, stampW, stampH);
      } catch (e) {
        console.warn("Failed to render stamp", e);
      }
    }

    const blob = doc.output("blob");
    return blob;
  }

  async function handleGenerateAndSave() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pdfBlob = await generateProfessionalPdf();
      if (!pdfBlob) {
        return;
      }

      // Build Spring Boot invoice payload (includes extra fields to mirror legacy page)
      const invoicePayload = {
        agentId: selectedAgentId || "ADMIN_WEB",
        createdBy: "admin",
        customerId: null,
        customerSnapshotJson: JSON.stringify({
          name: customerName,
          phone: customerMobile,
        }),

        companyName,
        companyAddress,
        companyGst,
        companyMobile,
        companyEmail,

        agentName: employeeName,
        agentPhone: employeePhone,
        agentEmail: employeeEmail,
        agentDepartment: employeeDepartment,

        panCard,
        aadhaarCard: aadharCard,

        customerAddress,
        customerGst,
        customerMobile,
        customerEmail,

        items: items.map((it) => {
          const amount = it.quantity * it.unitPrice;
          const discount = (amount * it.discountPct) / 100;
          const taxable = amount - discount;
          const tax = (taxable * it.taxPct) / 100;
          const lineTotal = taxable + tax + it.shipping;
          return {
            productId: it.productId ?? null,
            name: it.description,
            sku: null,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            discount,
            tax,
            lineTotal,
          };
        }),
        subtotal,
        totalDiscount,
        taxAmount,
        shipping: shippingTotal,
        total,
        currency: "INR",
        status: "DRAFT",

        bankName,
        bankAccountNumber,
        bankHolderName,
        ifscCode,
        bankBranch,
        accountType: "",
        upiId,
        uid,

        termsAndConditions: terms,
        paymentTerms,
        notes,

        companyLogoUrl: null,
        companyStampUrl: null,
        invoicePdfUrl: null,

        invoiceDate: invoiceDate
          ? new Date(invoiceDate).toISOString()
          : new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      let targetId = editingInvoiceId;

      if (editingInvoiceId) {
        const updateRes = await axios.put(
          `${SPRING_API_BASE}/invoices/${editingInvoiceId}`,
          invoicePayload
        );
        const updated = updateRes.data;
        targetId = updated?.id || editingInvoiceId;
      } else {
        const createRes = await axios.post(
          `${SPRING_API_BASE}/invoices`,
          invoicePayload
        );
        const created = createRes.data;
        if (!created || !created.id) {
          setError("Failed to create invoice in backend");
          return;
        }
        targetId = created.id;
        setEditingInvoiceId(created.id);
      }

      const form = new FormData();
      form.append("file", pdfBlob, "invoice.pdf");

      if (!targetId) {
        setError("Missing invoice id for PDF upload");
        return;
      }

      await axios.post(
        `${SPRING_API_BASE}/invoices/${targetId}/pdf`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setSuccess("Invoice saved and PDF uploaded successfully");
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewPdf() {
    try {
      setError(null);
      setSuccess(null);

      const blob = await generateProfessionalPdf();
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e: any) {
      console.error(e);
      setError("Failed to generate PDF preview");
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompanyLogo(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setCompanyLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleStampChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompanyStamp(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setCompanyStampPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleStartQrScan() {
    try {
      setShowQr(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        requestAnimationFrame(scanFrame);
      }
    } catch (e) {
      console.error("Camera error", e);
      setError("Camera access denied or not available");
    }
  }

  function stopQrScan() {
    setShowQr(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  function scanFrame() {
    if (!showQr || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imageData.data, imageData.width, imageData.height);
    if (qr && qr.data) {
      applyUpiInfoFromQr(qr.data);
      stopQrScan();
    } else {
      requestAnimationFrame(scanFrame);
    }
  }

  return (
    <Layout>
      {/* Full-screen modal overlay */}
      <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10">
        <div className="w-full max-w-5xl rounded-xl bg-slate-900 text-slate-100 shadow-xl border border-slate-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h1 className="text-2xl font-semibold text-slate-100">New PDF Invoice</h1>
            <button
              type="button"
              onClick={() => router.push("/invoices")}
              className="text-slate-300 hover:text-white text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-4 space-y-6">

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Billed By (Company)</h2>
            <div className="mb-2">
              <label className="block text-xs font-medium text-white-600 mb-1">
                Agent (optional)
              </label>
              <select
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100"
                value={selectedAgentId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedAgentId(id);
                  const ag: any = agents.find((a) => a.id === id);
                  if (ag) {
                    setEmployeeName(ag.name || "");
                    setEmployeePhone(ag.phone || ag.mobile || "");
                    setEmployeeEmail(ag.email || "");
                    setEmployeeDepartment(ag.department || "");
                    setPanCard(ag.pan || ag.panCard || panCard);
                    setAadharCard(ag.aadhaar || ag.aadhar || aadharCard);
                  }
                }}
              >
                <option value="">Select agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white-600 mb-1">
                Company Name
              </label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Enter company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-600 mb-1">
                Company Address
              </label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Street, City, State"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-white-600 mb-1">GSTIN</label>
                <input
                  className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                  placeholder="Company GSTIN"
                  value={companyGst}
                  onChange={(e) => setCompanyGst(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white-600 mb-1">Mobile</label>
                <input
                  className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                  placeholder="Company mobile number"
                  value={companyMobile}
                  onChange={(e) => setCompanyMobile(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white-600 mb-1">Email</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Company email address"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 text-xs text-white-600">
              <div>
                <label className="block mb-1 font-medium">Company Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full text-xs"
                />
                {companyLogoPreview && (
                  <img
                    src={companyLogoPreview}
                    alt="Company Logo Preview"
                    className="mt-2 h-16 w-auto rounded border"
                  />
                )}
              </div>
              <div>
                <label className="block mb-1 font-medium">Company Stamp / Signature</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleStampChange}
                  className="w-full text-xs"
                />
                {companyStampPreview && (
                  <img
                    src={companyStampPreview}
                    alt="Company Stamp Preview"
                    className="mt-2 h-16 w-auto rounded border"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Billed To (Customer)</h2>
            <div>
              <label className="block text-xs font-medium text-white-600 mb-1">Customer Name</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-white-600 mb-1">Mobile</label>
                <input
                  className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                  placeholder="Customer mobile number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                />
              </div>
              <input
                type="date"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-600 mb-1">Address</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Customer billing address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-white-600 mb-1">GSTIN</label>
                <input
                  className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                  placeholder="Customer GSTIN"
                  value={customerGst}
                  onChange={(e) => setCustomerGst(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white-600 mb-1">Email</label>
                <input
                  className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                  placeholder="Customer email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Agent & Personal Details (optional, to mirror legacy CheckInvoice) */}
        <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Agent & Personal Details (Optional)</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Agent Name</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Agent Name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Agent Phone</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Agent Phone"
                value={employeePhone}
                onChange={(e) => setEmployeePhone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Agent Email</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Agent Email"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Aadhaar Card</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Aadhaar Card"
                value={aadharCard}
                onChange={(e) => setAadharCard(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Items</h2>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-200 mb-1">Product</label>
              <select
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100"
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
              <label className="block text-xs font-medium text-slate-200 mb-1">Quantity</label>
              <input
                type="number"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Quantity"
                value={currentItem.quantity}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, quantity: Number(e.target.value || 1) }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Unit Price</label>
              <input
                type="number"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Unit Price"
                value={currentItem.unitPrice}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, unitPrice: Number(e.target.value || 0) }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Discount %</label>
              <input
                type="number"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Discount %"
                value={currentItem.discountPct}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, discountPct: Number(e.target.value || 0) }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Tax %</label>
              <input
                type="number"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Tax %"
                value={currentItem.taxPct}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, taxPct: Number(e.target.value || 0) }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Shipping</label>
              <input
                type="number"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Shipping"
                value={currentItem.shipping}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, shipping: Number(e.target.value || 0) }))
                }
              />
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          {items.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-200">
                      Item
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                      Rate
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {items.map((it, idx) => {
                    const amount = it.quantity * it.unitPrice;
                    const discount = (amount * it.discountPct) / 100;
                    const taxable = amount - discount;
                    const tax = (taxable * it.taxPct) / 100;
                    const lineTotal = taxable + tax + it.shipping;
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2">{it.description}</td>
                        <td className="px-3 py-2">{it.quantity}</td>
                        <td className="px-3 py-2">₹{it.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2">₹{lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex justify-end text-sm">
            <div className="space-y-1 text-right text-slate-100">
              <div className="flex justify-between gap-4">
                <span className="font-medium">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">Discount</span>
                <span>₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">Tax</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium">Shipping</span>
                <span>₹{shippingTotal.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-4 text-base font-semibold">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Bank / UPI</h2>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Account Holder Name</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Account Holder Name"
                value={bankHolderName}
                onChange={(e) => setBankHolderName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Account Number</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Account Number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">IFSC Code</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="IFSC Code"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Bank Name</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Bank Branch</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Bank Branch"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">UPI ID / UID</label>
              <div className="flex gap-2 items-center">
                <input
                  className="flex-1 rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                  placeholder="UPI ID / UID"
                  value={uid || upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setUid(e.target.value);
                  }}
                />
                <button
                  type="button"
                  onClick={handleStartQrScan}
                  className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Scan QR
                </button>
              </div>
            </div>
            {uid && !isValidVpa(uid) && (
              <p className="text-xs text-orange-600">
                UPI format looks invalid. Example: username@bank
              </p>
            )}
            {qrStatus && (
              <p className="text-xs text-blue-600 mt-1">{qrStatus}</p>
            )}
            {qrAmount !== null && (
              <p className="text-xs text-green-600">
                Amount from QR: ₹{qrAmount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Terms &amp; Conditions</h2>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Terms &amp; Conditions</label>
              <textarea
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Payment Terms</label>
              <input
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                placeholder="Payment Terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Notes</label>
              <textarea
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-300"
                rows={3}
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full rounded border border-slate-600 px-3 py-2 text-sm bg-slate-700 text-slate-100"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-800 p-4 shadow border border-slate-700 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-800">Form Preview (HTML)</h2>
          </div>
          <div
            id="pdf-invoice-preview"
            className="border border-dashed border-gray-300 bg-white p-4 text-xs text-gray-800 space-y-2"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-base font-semibold mb-1">{companyName || "Company Name"}</h3>
                {companyAddress && <p>{companyAddress}</p>}
                {companyGst && <p>GSTIN: {companyGst}</p>}
                {companyMobile && <p>Mobile: {companyMobile}</p>}
                {companyEmail && <p>Email: {companyEmail}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                {companyLogoPreview && (
                  <img
                    src={companyLogoPreview}
                    alt="Company Logo"
                    className="h-10 w-auto rounded border"
                  />
                )}
                {companyStampPreview && (
                  <img
                    src={companyStampPreview}
                    alt="Company Stamp"
                    className="h-10 w-auto rounded border"
                  />
                )}
              </div>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between text-xs">
              <div>
                <p className="font-semibold">Billed To</p>
                <p>{customerName || "Customer Name"}</p>
                {customerMobile && <p>Mobile: {customerMobile}</p>}
                {customerAddress && <p>{customerAddress}</p>}
                {customerGst && <p>GSTIN: {customerGst}</p>}
                {customerEmail && <p>Email: {customerEmail}</p>}
              </div>
              <div className="text-right">
                <p>Invoice Date: {invoiceDate}</p>
                {dueDate && <p>Due Date: {dueDate}</p>}
                {aadharCard && <p>Aadhaar: {aadharCard}</p>}
              </div>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between text-xs">
              <div>
                <p className="font-semibold mb-1">Bank Details</p>
                {bankName && <p>Bank: {bankName}</p>}
                {bankHolderName && <p>Account Holder: {bankHolderName}</p>}
                {bankAccountNumber && <p>Account No: {bankAccountNumber}</p>}
                {ifscCode && <p>IFSC: {ifscCode}</p>}
                {bankBranch && <p>Branch: {bankBranch}</p>}
                {(uid || upiId) && <p>UPI / UID: {uid || upiId}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold mb-1">Totals</p>
                <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
                <p>Discount: ₹{totalDiscount.toFixed(2)}</p>
                <p>Tax: ₹{taxAmount.toFixed(2)}</p>
                <p>Shipping: ₹{shippingTotal.toFixed(2)}</p>
                <p className="font-semibold">Total: ₹{total.toFixed(2)}</p>
              </div>
            </div>

            <hr className="my-2" />

            {/* Simple calculation breakdown like legacy page */}
            <div className="text-xs grid gap-2 md:grid-cols-2 mb-2">
              <div className="space-y-1">
                <p className="font-semibold">Calculation Breakdown</p>
                <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
                <p>Discount total: ₹{totalDiscount.toFixed(2)}</p>
                <p>Tax amount: ₹{taxAmount.toFixed(2)}</p>
                <p>Shipping: ₹{shippingTotal.toFixed(2)}</p>
                <p className="font-semibold">Grand Total: ₹{total.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                {employeeName && <p>Agent: {employeeName}</p>}
                {employeePhone && <p>Agent Mobile: {employeePhone}</p>}
                {employeeEmail && <p>Agent Email: {employeeEmail}</p>}
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-semibold">
                Amount in words: {numberToWordsIndian(total).toUpperCase()}
              </p>
              {terms && (
                <p>
                  <span className="font-semibold">Terms: </span>
                  {terms}
                </p>
              )}
              {paymentTerms && (
                <p>
                  <span className="font-semibold">Payment Terms: </span>
                  {paymentTerms}
                </p>
              )}
              {notes && (
                <p>
                  <span className="font-semibold">Notes: </span>
                  {notes}
                </p>
              )}
            </div>
          </div>

          {/* Real PDF preview (iframe) */}
          {previewUrl && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-800">PDF Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = previewUrl;
                      link.download = `invoice_${customerName || "preview"}.pdf`;
                      link.click();
                    }}
                    className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Download PDF
                  </button>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
              <div className="border rounded overflow-hidden bg-white">
                <iframe
                  src={previewUrl}
                  className="w-full h-96"
                  title="Invoice PDF Preview"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Preview PDF
          </button>
          <button
            type="button"
            onClick={handleGenerateAndSave}
            disabled={loading}
            className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Generate PDF & Save"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="rounded border border-slate-500 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        {showQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded bg-white p-4 shadow-lg space-y-3">
              <h2 className="text-sm font-semibold text-gray-800 mb-1">Scan UPI QR</h2>
              <video
                ref={videoRef}
                className="w-full rounded bg-black"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={stopQrScan}
                  className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

