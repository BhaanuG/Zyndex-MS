/**
 * Zyndex / ScholarSphere Professional Tax Invoice & Billing Statement Generator
 * Generates isolated, GST-compliant, print-perfect documents with embedded Zyndex vector logo.
 */

const ZYNDEX_BOOK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
</svg>
`;

export function generateSingleInvoiceHtml(data) {
  const {
    id = 'PAY_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    orderId = 'order_' + Math.random().toString(36).substring(2, 12),
    date = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    planName = 'Student Plus',
    amount = '199.00',
    customerName = 'Valued Scholar',
    customerEmail = 'subscriber@scholarsphere.com',
    paymentMethod = 'UPI',
    status = 'SUCCESS'
  } = data;

  const numAmount = parseFloat(amount) || 0;
  const baseAmount = (numAmount / 1.18).toFixed(2);
  const gstAmount = (numAmount - parseFloat(baseAmount)).toFixed(2);
  const cgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);
  const sgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

  const formattedPlan = planName.toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Zyndex Tax Invoice - ${invoiceNumber}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 12mm 15mm; 
    }
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      color: #0f172a; 
      background: #ffffff; 
      padding: 24px; 
      line-height: 1.5; 
      font-size: 13px; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    .invoice-container { 
      max-width: 820px; 
      margin: 0 auto; 
      border: 1px solid #e2e8f0; 
      border-radius: 16px; 
      padding: 36px 42px; 
      background: #ffffff; 
    }
    .header-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      border-bottom: 2px solid #f1f5f9; 
      padding-bottom: 24px; 
      margin-bottom: 24px; 
    }
    .brand-section { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
    }
    .brand-text h1 { 
      font-size: 24px; 
      font-weight: 900; 
      letter-spacing: -0.5px; 
      color: #0f172a; 
      line-height: 1;
    }
    .brand-text p { 
      font-size: 10px; 
      font-weight: 800; 
      color: #ea580c; 
      text-transform: uppercase; 
      letter-spacing: 1.2px; 
      margin-top: 4px;
    }
    .seller-details { 
      font-size: 11.5px; 
      color: #64748b; 
      margin-top: 12px; 
      line-height: 1.6; 
    }
    .invoice-meta { 
      text-align: right; 
    }
    .status-badge { 
      display: inline-block; 
      padding: 6px 14px; 
      background: #ecfdf5; 
      color: #047857; 
      border: 1.5px solid #a7f3d0; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 800; 
      letter-spacing: 0.8px;
      text-transform: uppercase; 
      margin-bottom: 12px; 
    }
    .meta-label { 
      font-size: 11px; 
      color: #94a3b8; 
      font-family: inherit; 
    }
    .meta-value { 
      font-size: 15px; 
      font-weight: 900; 
      color: #0f172a; 
      font-family: monospace; 
      margin-top: 2px;
    }
    .meta-date { 
      font-size: 11.5px; 
      color: #64748b; 
      font-weight: 600; 
      margin-top: 4px; 
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 24px; 
      background: #f8fafc; 
      border: 1px solid #f1f5f9; 
      border-radius: 14px; 
      padding: 20px 24px; 
      margin-bottom: 28px; 
    }
    .info-col h4 { 
      font-size: 10px; 
      font-weight: 800; 
      text-transform: uppercase; 
      color: #94a3b8; 
      letter-spacing: 0.8px; 
      margin-bottom: 8px; 
    }
    .info-col p { 
      font-size: 12.5px; 
      color: #334155; 
      margin-bottom: 4px; 
    }
    .info-col p.customer-name { 
      font-size: 15px; 
      font-weight: 800; 
      color: #0f172a; 
    }
    .table-container { 
      margin-bottom: 24px; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      text-align: left; 
    }
    th { 
      padding: 12px 14px; 
      font-size: 10.5px; 
      font-weight: 800; 
      text-transform: uppercase; 
      color: #475569; 
      border-bottom: 2px solid #cbd5e1; 
      letter-spacing: 0.8px; 
    }
    td { 
      padding: 16px 14px; 
      border-bottom: 1px solid #f1f5f9; 
      font-size: 12.5px; 
    }
    .item-title { 
      font-weight: 800; 
      color: #0f172a; 
      font-size: 13.5px; 
    }
    .item-sub { 
      font-size: 11px; 
      color: #64748b; 
      margin-top: 4px; 
    }
    .totals-wrapper { 
      display: flex; 
      justify-content: flex-end; 
      margin-bottom: 28px; 
    }
    .totals-card { 
      width: 300px; 
    }
    .calc-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 0; 
      font-size: 12px; 
      color: #475569; 
    }
    .calc-row.grand { 
      border-top: 2.5px solid #0f172a; 
      margin-top: 10px; 
      padding-top: 10px; 
      font-size: 15px; 
      font-weight: 900; 
      color: #0f172a; 
    }
    .grand-amount { 
      color: #ea580c; 
      font-weight: 900; 
      font-family: monospace; 
      font-size: 18px; 
    }
    .footer-row { 
      border-top: 1px solid #f1f5f9; 
      padding-top: 22px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    .verified-box { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
    }
    .verified-icon { 
      color: #10b981; 
      font-weight: 900; 
      font-size: 18px; 
    }
    .verified-text strong { 
      font-size: 11.5px; 
      color: #334155; 
      display: block; 
    }
    .verified-text span { 
      font-size: 10.5px; 
      color: #94a3b8; 
    }
    .auth-stamp { 
      border: 1.5px dashed #cbd5e1; 
      border-radius: 12px; 
      padding: 10px 18px; 
      text-align: center; 
      background: #fafafa; 
    }
    .auth-stamp-title { 
      font-size: 9.5px; 
      font-weight: 900; 
      color: #ea580c; 
      text-transform: uppercase; 
      letter-spacing: 0.8px; 
    }
    .auth-stamp-code { 
      font-size: 9.5px; 
      font-family: monospace; 
      color: #64748b; 
      margin-top: 3px; 
    }
    @page { 
      size: A4 portrait; 
      margin: 8mm 12mm; 
    }
    @media print {
      html, body {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .invoice-container { 
        border: 1px solid #cbd5e1 !important; 
        border-radius: 12px !important;
        padding: 30px 36px !important; 
        max-width: 100% !important; 
        box-shadow: none !important;
      }
      .header-row, .info-grid, .totals-wrapper, .footer-row {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print / Save Action Bar (Hidden in Print / PDF output) -->
  <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 12px 20px; border-radius: 12px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px;">
      <span>📄 Tax Invoice: ${invoiceNumber}</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #ea580c; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        🖨️ Print / Save as PDF
      </button>
      <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
        Close
      </button>
    </div>
  </div>

  <div class="invoice-container">
    
    <!-- Top Header -->
    <div class="header-row">
      <div>
        <div class="brand-section">
          ${ZYNDEX_BOOK_SVG}
          <div class="brand-text">
            <h1>ZYNDEX</h1>
            <p>A SCHOLARSPHERE DIGITAL COMPANY</p>
          </div>
        </div>
        <div class="seller-details">
          ScholarSphere Digital Private Limited<br>
          Knowledge & Research Tech Park, Block B<br>
          Hyderabad, Telangana 500081, India<br>
          <strong>GSTIN:</strong> 36AAACS1234F1Z5 • <strong>CIN:</strong> U72900TG2026PTC198765
        </div>
      </div>
      
      <div class="invoice-meta">
        <div class="status-badge">${status === 'SUCCESS' || status === 'PAID' ? 'PAID / TAX INVOICE' : status}</div>
        <div class="meta-label">Invoice No:</div>
        <div class="meta-value">${invoiceNumber}</div>
        <div class="meta-date">Date: ${date}</div>
      </div>
    </div>

    <!-- Customer and Payment Details -->
    <div class="info-grid">
      <div class="info-col">
        <h4>BILLED TO</h4>
        <p class="customer-name">${customerName}</p>
        <p>${customerEmail}</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 3px;">Place of Supply: India (Domestic Digital Services)</p>
      </div>
      
      <div class="info-col" style="border-left: 1px solid #e2e8f0; padding-left: 20px;">
        <h4>PAYMENT DETAILS</h4>
        <p><strong>Method:</strong> ${paymentMethod}</p>
        <p style="font-family: monospace; font-size: 11px;"><strong>Ref ID:</strong> ${id}</p>
        <p style="font-family: monospace; font-size: 11px;"><strong>Order ID:</strong> ${orderId}</p>
      </div>
    </div>

    <!-- Line Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>DESCRIPTION / SUBSCRIPTION PLAN</th>
            <th style="text-align: center;">SAC CODE</th>
            <th style="text-align: center;">PERIOD</th>
            <th style="text-align: right;">AMOUNT (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-title">${formattedPlan} Subscription</div>
              <div class="item-sub">Unlimited digital library access, academic research documents, & PDF reading</div>
            </td>
            <td style="text-align: center; font-family: monospace; color: #64748b;">998431</td>
            <td style="text-align: center; color: #64748b; font-weight: 600;">30 Days</td>
            <td style="text-align: right; font-weight: 800; font-family: monospace; font-size: 13px;">₹${baseAmount}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals Calculation -->
    <div class="totals-wrapper">
      <div class="totals-card">
        <div class="calc-row">
          <span>Taxable Base Value</span>
          <span style="font-family: monospace;">₹${baseAmount}</span>
        </div>
        <div class="calc-row">
          <span>CGST (9%)</span>
          <span style="font-family: monospace;">₹${cgstAmount}</span>
        </div>
        <div class="calc-row">
          <span>SGST (9%)</span>
          <span style="font-family: monospace;">₹${sgstAmount}</span>
        </div>
        <div class="calc-row grand">
          <span>Total Paid</span>
          <span class="grand-amount">₹${numAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Footer Seal -->
    <div class="footer-row">
      <div class="verified-box">
        <div class="verified-icon">✔</div>
        <div class="verified-text">
          <strong>Digitally Generated & Verified Invoice</strong>
          <span>This is a computer-generated tax invoice and requires no physical signature.</span>
        </div>
      </div>
      
      <div class="auth-stamp">
        <div class="auth-stamp-title">ZYNDEX DIGITAL AUTH</div>
        <div class="auth-stamp-code">AUTH-STAMP-${new Date().getFullYear()}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
}

export function generateTotalStatementHtml(userData, payments = [], activeSub = null) {
  const customerName = userData?.name || 'Valued Scholar';
  const customerEmail = userData?.email || 'subscriber@scholarsphere.com';
  const statementId = `STMT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const statementDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const successfulPayments = payments.filter(p => p.status === 'SUCCESS');
  const totalPaidRupees = successfulPayments.reduce((sum, p) => sum + ((p.amount_paise || p.amountPaise || 0) / 100), 0);

  const rowsHtml = payments.map((pmt, idx) => {
    const pmtDate = new Date(pmt.created_at || pmt.createdAt || new Date()).toLocaleDateString('en-IN');
    const pmtId = pmt.gateway_payment_id || pmt.gatewayPaymentId || pmt.id || 'N/A';
    const amount = ((pmt.amount_paise || pmt.amountPaise || 0) / 100).toFixed(2);
    const plan = pmt.plan_id ? pmt.plan_id.replace(/_/g, ' ') : (activeSub?.planName || 'Student Plus');
    const statusClass = pmt.status === 'SUCCESS' ? 'status-success' : (pmt.status === 'FAILED' ? 'status-failed' : 'status-pending');

    return `
      <tr>
        <td style="color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td style="color: #475569;">${pmtDate}</td>
        <td style="font-family: monospace; font-size: 11px; font-weight: 600;">${pmtId}</td>
        <td><strong style="color: #0f172a;">${plan}</strong></td>
        <td style="color: #475569;">${pmt.payment_method || 'UPI / Gateway'}</td>
        <td><span class="status-tag ${statusClass}">${pmt.status}</span></td>
        <td style="text-align: right; font-weight: 800; font-family: monospace;">₹${amount}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Zyndex Billing Statement - ${statementId}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 12mm 15mm; 
    }
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      color: #0f172a; 
      background: #ffffff; 
      padding: 20px; 
      line-height: 1.45; 
      font-size: 13px; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    .statement-container { 
      max-width: 800px; 
      margin: 0 auto; 
      border: 1px solid #e2e8f0; 
      border-radius: 16px; 
      padding: 36px 40px; 
      background: #ffffff; 
    }
    .header-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      border-bottom: 2px solid #f1f5f9; 
      padding-bottom: 24px; 
      margin-bottom: 24px; 
    }
    .brand-section { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
    }
    .brand-text h1 { 
      font-size: 22px; 
      font-weight: 900; 
      letter-spacing: -0.5px; 
      color: #0f172a; 
      line-height: 1;
    }
    .brand-text p { 
      font-size: 9px; 
      font-weight: 800; 
      color: #ea580c; 
      text-transform: uppercase; 
      letter-spacing: 1.2px; 
      margin-top: 4px;
    }
    .seller-details { 
      font-size: 11px; 
      color: #64748b; 
      margin-top: 12px; 
      line-height: 1.6; 
    }
    .statement-meta { 
      text-align: right; 
    }
    .statement-badge { 
      display: inline-block; 
      padding: 5px 12px; 
      background: #eff6ff; 
      color: #1d4ed8; 
      border: 1px solid #bfdbfe; 
      border-radius: 8px; 
      font-size: 11px; 
      font-weight: 800; 
      text-transform: uppercase; 
      margin-bottom: 8px; 
    }
    .meta-label { 
      font-size: 11px; 
      color: #94a3b8; 
      font-family: monospace; 
    }
    .meta-value { 
      font-size: 14px; 
      font-weight: 900; 
      color: #0f172a; 
      font-family: monospace; 
    }
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 14px; 
      margin-bottom: 24px; 
    }
    .card { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      border-radius: 12px; 
      padding: 14px 18px; 
    }
    .card-label { 
      font-size: 10px; 
      font-weight: 800; 
      color: #64748b; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    .card-value { 
      font-size: 18px; 
      font-weight: 900; 
      color: #0f172a; 
      margin-top: 4px; 
    }
    .card-sub { 
      font-size: 10px; 
      color: #94a3b8; 
      margin-top: 2px; 
    }
    .user-box { 
      background: #f8fafc; 
      border: 1px solid #f1f5f9; 
      border-radius: 12px; 
      padding: 16px 20px; 
      margin-bottom: 24px; 
      display: flex; 
      justify-content: space-between; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      text-align: left; 
      margin-bottom: 24px; 
    }
    th { 
      padding: 10px 12px; 
      font-size: 10px; 
      font-weight: 800; 
      text-transform: uppercase; 
      color: #64748b; 
      border-bottom: 2px solid #cbd5e1; 
      letter-spacing: 0.8px; 
    }
    td { 
      padding: 12px 12px; 
      border-bottom: 1px solid #f1f5f9; 
      font-size: 12px; 
    }
    .status-tag { 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 10px; 
      font-weight: 800; 
      text-transform: uppercase; 
      display: inline-block; 
    }
    .status-success { 
      background: #ecfdf5; 
      color: #047857; 
      border: 1px solid #a7f3d0; 
    }
    .status-failed { 
      background: #fef2f2; 
      color: #b91c1c; 
      border: 1px solid #fecaca; 
    }
    .status-pending { 
      background: #f8fafc; 
      color: #64748b; 
      border: 1px solid #e2e8f0; 
    }
    .footer-row { 
      border-top: 1px solid #f1f5f9; 
      padding-top: 20px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    .footer-note { 
      font-size: 10px; 
      color: #94a3b8; 
      line-height: 1.5; 
    }
    @media print {
      body { 
        padding: 0; 
        background: transparent; 
      }
      .statement-container { 
        border: none; 
        padding: 0; 
        max-width: 100%; 
      }
    }
  </style>
</head>
<body>
  <div class="statement-container">
    
    <!-- Top Header -->
    <div class="header-row">
      <div>
        <div class="brand-section">
          ${ZYNDEX_BOOK_SVG}
          <div class="brand-text">
            <h1>ZYNDEX</h1>
            <p>A SCHOLARSPHERE DIGITAL COMPANY</p>
          </div>
        </div>
        <div class="seller-details">
          ScholarSphere Digital Private Limited<br>
          Knowledge & Research Tech Park, Block B, Hyderabad, Telangana 500081<br>
          <strong>GSTIN:</strong> 36AAACS1234F1Z5
        </div>
      </div>
      
      <div class="statement-meta">
        <div class="statement-badge">CONSOLIDATED STATEMENT</div>
        <div class="meta-label">Statement Ref:</div>
        <div class="meta-value">${statementId}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Issued: ${statementDate}</div>
      </div>
    </div>

    <!-- Account Details -->
    <div class="user-box">
      <div>
        <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">ACCOUNT HOLDER</div>
        <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${customerName}</div>
        <div style="font-size: 12px; color: #64748b;">${customerEmail}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">CURRENT ENTITLEMENT</div>
        <div style="font-size: 14px; font-weight: 800; color: #ea580c; margin-top: 2px;">${activeSub?.planName || activeSub?.plan_name || 'Active Subscriber'}</div>
        <div style="font-size: 11px; color: #10b981; font-weight: 800;">Status: ${activeSub?.status || 'ACTIVE'}</div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="summary-grid">
      <div class="card">
        <div class="card-label">Total Amount Paid</div>
        <div class="card-value" style="color: #ea580c;">₹${totalPaidRupees.toFixed(2)}</div>
        <div class="card-sub">Lifetime Net Invoiced</div>
      </div>
      <div class="card">
        <div class="card-label">Total Transactions</div>
        <div class="card-value">${payments.length}</div>
        <div class="card-sub">${successfulPayments.length} Completed Invoices</div>
      </div>
      <div class="card">
        <div class="card-label">Billing Interval</div>
        <div class="card-value" style="font-size: 15px; font-weight: 800;">${activeSub?.billingInterval || 'Monthly'}</div>
        <div class="card-sub">Auto-Renewal Active</div>
      </div>
    </div>

    <!-- Transaction Ledger -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>DATE</th>
          <th>TRANSACTION REF</th>
          <th>PLAN TIER</th>
          <th>METHOD</th>
          <th>STATUS</th>
          <th style="text-align: right;">AMOUNT (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No transaction records found.</td></tr>'}
      </tbody>
    </table>

    <!-- Statement Footer -->
    <div class="footer-row">
      <div class="footer-note">
        <strong>Zyndex Official Customer Billing Statement</strong><br>
        This statement summarizes all digital subscription payments on your account.
      </div>
      <div style="text-align: right; font-size: 11px; color: #64748b; font-weight: 600;">
        ScholarSphere Billing Division • Verified & Signed
      </div>
    </div>

  </div>
</body>
</html>`;
}

export function openPrintableDocument(htmlContent, windowTitle = 'Zyndex Document') {
  const printWindow = window.open('', '_blank', 'width=900,height=850');
  if (!printWindow) {
    alert('Please allow popups to view and print your document.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

export function downloadDocumentAsHtml(htmlContent, filename = 'zyndex-invoice.html') {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
