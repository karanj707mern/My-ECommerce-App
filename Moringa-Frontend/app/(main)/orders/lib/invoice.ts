/**
 * Production-ready invoice HTML generator with A4 print styles.
 *
 * Generates a self-contained HTML document optimized for "Save as PDF"
 * via the browser print dialog. Uses explicit A4 dimensions, print-safe
 * layout, and safe HTML escaping.
 */

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
}

export interface InvoiceAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  sellerName: string;
  orderTitle: string;
  recipient: InvoiceAddress;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  handlingAmount: number;
  taxAmount: number;
  total: number;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 18;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - PAGE_MARGIN_MM * 2;

export function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInvoiceHtml(invoice: InvoiceData): string {
  const {
    invoiceNumber,
    orderNumber,
    issuedAt,
    sellerName,
    orderTitle,
    recipient,
    items,
    subtotal,
    discountAmount,
    shippingAmount,
    handlingAmount,
    taxAmount,
    total,
  } = invoice;

  const safeSellerName = escapeHtml(sellerName || "Moringa Store");
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeIssuedAt = escapeHtml(issuedAt);
  const safeOrderTitle = escapeHtml(orderTitle);
  const safeRecipientName = escapeHtml(recipient.name);
  const safeAddressLine1 = escapeHtml(recipient.line1);
  const safeAddressLine2 = escapeHtml(recipient.line2 || "");
  const safeCity = escapeHtml(recipient.city);
  const safeState = escapeHtml(recipient.state);
  const safePostalCode = escapeHtml(recipient.postalCode);
  const safeCountry = escapeHtml(recipient.country);
  const safePhoneNumber = escapeHtml(recipient.phoneNumber || "");

  const itemsHtml = items
    .map((item) => {
      const safeItemName = escapeHtml(item.name);
      const itemTotal = item.quantity * item.unitPrice;
      const imageMarkup = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${safeItemName}" />`
        : "";
      return `
        <tr>
          <td>
            <div class="item">
              ${imageMarkup}
              <span>${safeItemName}</span>
            </div>
          </td>
          <td class="qty">${item.quantity}</td>
          <td class="amount">${formatRupees(itemTotal)}</td>
        </tr>`;
    })
    .join("");

  const addressLine2Block = safeAddressLine2
    ? `<p>${safeAddressLine2}</p>`
    : "";
  const phoneBlock = safePhoneNumber ? `<p>${safePhoneNumber}</p>` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeInvoiceNumber} — ${safeSellerName}</title>
    <style>
      @page {
        size: A4 ${A4_WIDTH_MM}mm ${A4_HEIGHT_MM}mm;
        margin: ${PAGE_MARGIN_MM}mm ${PAGE_MARGIN_MM}mm ${PAGE_MARGIN_MM}mm ${PAGE_MARGIN_MM}mm;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #1f2937;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.55;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .invoice-root {
        width: ${CONTENT_WIDTH_MM}mm;
        min-height: ${A4_HEIGHT_MM - PAGE_MARGIN_MM * 2}mm;
        margin: 0 auto;
        padding: 18mm 0;
      }

      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18mm;
        padding-bottom: 14mm;
        border-bottom: 1.5px solid #e5e7eb;
      }

      .invoice-header .brand h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #065f46;
      }

      .invoice-header .brand p {
        margin: 4px 0 0;
        color: #6b7280;
        font-size: 12px;
      }

      .invoice-meta {
        text-align: right;
      }

      .invoice-meta h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }

      .invoice-meta p {
        margin: 3px 0 0;
        color: #6b7280;
        font-size: 12px;
      }

      .invoice-section {
        margin-top: 14mm;
      }

      .invoice-section h3 {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
      }

      .invoice-section p {
        margin: 2px 0;
        color: #374151;
      }

      .invoice-addresses {
        display: flex;
        gap: 14mm;
        margin-top: 14mm;
      }

      .invoice-addresses .address-block {
        flex: 1;
      }

      .invoice-addresses .address-block h3 {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
      }

      .invoice-addresses .address-block p {
        margin: 2px 0;
        color: #374151;
      }

      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14mm;
      }

      .invoice-table thead th {
        text-align: left;
        padding: 7px 0;
        border-bottom: 1.5px solid #e5e7eb;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #6b7280;
      }

      .invoice-table thead th:last-child,
      .invoice-table thead th:nth-child(2) {
        text-align: right;
      }

      .invoice-table tbody td {
        padding: 9px 0;
        border-bottom: 1px solid #f3f4f6;
        vertical-align: top;
      }

      .invoice-table tbody td:last-child,
      .invoice-table tbody td:nth-child(2) {
        text-align: right;
      }

      .item {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .item img {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        object-fit: cover;
        border: 1px solid #e5e7eb;
      }

      .item span {
        color: #111827;
        font-weight: 500;
      }

      .qty {
        color: #6b7280;
        font-variant-numeric: tabular-nums;
      }

      .amount {
        color: #111827;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .invoice-totals {
        margin-top: 12mm;
        display: flex;
        justify-content: flex-end;
      }

      .invoice-totals table {
        width: 180px;
        border-collapse: collapse;
      }

      .invoice-totals td {
        padding: 5px 0;
        text-align: right;
        color: #4b5563;
        font-size: 13px;
      }

      .invoice-totals td.label {
        text-align: left;
        color: #6b7280;
      }

      .invoice-totals tr.total td {
        padding-top: 8px;
        border-top: 1.5px solid #e5e7eb;
        color: #065f46;
        font-weight: 700;
        font-size: 15px;
      }

      .invoice-footer {
        margin-top: 18mm;
        padding-top: 10mm;
        border-top: 1.5px solid #e5e7eb;
        text-align: center;
        color: #9ca3af;
        font-size: 11px;
      }

      .print-hint {
        display: block;
      }

      @media print {
        html, body {
          background: #fff;
        }

        .print-hint {
          display: none !important;
        }

        .invoice-root {
          width: 100%;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="invoice-root">
      <div class="print-hint" style="margin-bottom: 12px; text-align: right;">
        <button type="button" onclick="window.print()" style="background:#065f46;color:#fff;border:0;border-radius:999px;padding:10px 16px;font-weight:700;cursor:pointer;">
          Save as PDF
        </button>
      </div>

      <div class="invoice-header">
        <div class="brand">
          <h1>${safeSellerName}</h1>
          <p>Invoice</p>
        </div>
        <div class="invoice-meta">
          <h2>${safeInvoiceNumber}</h2>
          <p>Order ${safeOrderNumber}</p>
          <p>Issued ${safeIssuedAt}</p>
        </div>
      </div>

      <div class="invoice-section">
        <h3>Order</h3>
        <p><strong>${safeOrderTitle}</strong></p>
      </div>

      <div class="invoice-addresses">
        <div class="address-block">
          <h3>Bill To</h3>
          <p><strong>${safeRecipientName}</strong></p>
          <p>${safeAddressLine1}</p>
          ${addressLine2Block}
          <p>${[safeCity, safeState, safePostalCode].filter(Boolean).join(", ")}</p>
          <p>${safeCountry}</p>
          ${phoneBlock}
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 55%;">Product</th>
            <th style="width: 15%; text-align: right;">Qty</th>
            <th style="width: 30%; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="invoice-totals">
        <table>
          <tbody>
            <tr>
              <td class="label">Subtotal</td>
              <td>${formatRupees(subtotal)}</td>
            </tr>
            <tr>
              <td class="label">Discount</td>
              <td>−${formatRupees(discountAmount)}</td>
            </tr>
            <tr>
              <td class="label">Shipping</td>
              <td>${formatRupees(shippingAmount)}</td>
            </tr>
            <tr>
              <td class="label">Handling</td>
              <td>${formatRupees(handlingAmount)}</td>
            </tr>
            <tr>
              <td class="label">Tax</td>
              <td>${formatRupees(taxAmount)}</td>
            </tr>
            <tr class="total">
              <td class="label">Total</td>
              <td>${formatRupees(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="invoice-footer">
        <p>Thank you for shopping with ${safeSellerName}.</p>
        <p style="margin-top:4px;">For support, contact us through the website.</p>
      </div>
    </div>

    <script>
      window.addEventListener("load", function() {
        setTimeout(function() {
          window.print();
        }, 250);
      });
    </script>
  </body>
</html>`;
}
