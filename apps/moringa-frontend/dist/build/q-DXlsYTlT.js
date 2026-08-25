import{_ as m}from"./q-BD-hIznX.js";import{y as g,L as b}from"./q-DbZgC2Xw.js";const U=g(b(()=>m(()=>import("./q-CKJc28B2.js"),[]),"s_UbGDTznEtgw")),V=g(b(()=>m(()=>import("./q-ujf4YvFo.js"),[]),"s_lUpoGoFMyBw")),h=210,p=297,n=18,B=h-n*2;function i(a){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2}).format(a)}function t(a){return String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function W(a){const{invoiceNumber:f,orderNumber:u,issuedAt:v,sellerName:x,orderTitle:y,recipient:e,items:$,subtotal:w,discountAmount:_,shippingAmount:T,handlingAmount:A,taxAmount:N,total:k}=a,r=t(x||"Moringa Store"),s=t(f),I=t(u),z=t(v),M=t(y),S=t(e.name),E=t(e.line1),d=t(e.line2||""),H=t(e.city),O=t(e.state),P=t(e.postalCode),D=t(e.country),l=t(e.phoneNumber||""),L=$.map(o=>{const c=t(o.name),q=o.quantity*o.unitPrice;return`
        <tr>
          <td>
            <div class="item">
              ${o.imageUrl?`<img src="${t(o.imageUrl)}" alt="${c}" />`:""}
              <span>${c}</span>
            </div>
          </td>
          <td class="qty">${o.quantity}</td>
          <td class="amount">${i(q)}</td>
        </tr>`}).join(""),j=d?`<p>${d}</p>`:"",R=l?`<p>${l}</p>`:"";return`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${s} — ${r}</title>
    <style>
      @page {
        size: A4 ${h}mm ${p}mm;
        margin: ${n}mm ${n}mm ${n}mm ${n}mm;
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
        width: ${B}mm;
        min-height: ${p-n*2}mm;
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
          <h1>${r}</h1>
          <p>Invoice</p>
        </div>
        <div class="invoice-meta">
          <h2>${s}</h2>
          <p>Order ${I}</p>
          <p>Issued ${z}</p>
        </div>
      </div>

      <div class="invoice-section">
        <h3>Order</h3>
        <p><strong>${M}</strong></p>
      </div>

      <div class="invoice-addresses">
        <div class="address-block">
          <h3>Bill To</h3>
          <p><strong>${S}</strong></p>
          <p>${E}</p>
          ${j}
          <p>${[H,O,P].filter(Boolean).join(", ")}</p>
          <p>${D}</p>
          ${R}
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
          ${L}
        </tbody>
      </table>

      <div class="invoice-totals">
        <table>
          <tbody>
            <tr>
              <td class="label">Subtotal</td>
              <td>${i(w)}</td>
            </tr>
            <tr>
              <td class="label">Discount</td>
              <td>−${i(_)}</td>
            </tr>
            <tr>
              <td class="label">Shipping</td>
              <td>${i(T)}</td>
            </tr>
            <tr>
              <td class="label">Handling</td>
              <td>${i(A)}</td>
            </tr>
            <tr>
              <td class="label">Tax</td>
              <td>${i(N)}</td>
            </tr>
            <tr class="total">
              <td class="label">Total</td>
              <td>${i(k)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="invoice-footer">
        <p>Thank you for shopping with ${r}.</p>
        <p style="margin-top:4px;">For support, contact us through the website.</p>
      </div>
    </div>

    <script>
      window.addEventListener("load", function() {
        setTimeout(function() {
          window.print();
        }, 250);
      });
    <\/script>
  </body>
</html>`}export{U as O,V as S,W as b};
