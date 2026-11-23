/**
 * Utility to generate and download client-facing invoice PDFs
 */

export interface OrderInvoiceData {
    id: string;
    invoiceNumber?: string | null;
    invoiceDate?: Date | string | null;
    createdAt: Date | string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    email?: string | null;
    paymentMethod?: string | null;
    status: string;
    isPaid?: boolean;
    paidAmount?: number | null;
    remainingAmount?: number | null;
    shippingFees?: number;
    discount?: number;
    total: number;
    items: Array<{
        id?: string;
        quantity: number;
        price: number;
        serialNumber?: string | null;
        book?: { title?: string; isbn?: string | null } | null;
        pack?: { name?: string } | null;
        extraProduct?: { name?: string } | null;
        digitalProduct?: { title?: string } | null;
        title?: string;
        name?: string;
    }>;
}

const DEFAULT_TEKNO_LOGO = "/logo.png";

export function generateInvoiceHtml(order: OrderInvoiceData, locale: string = 'fr', customPhone?: string, customLogo?: string): string {
    const isAr = locale === 'ar';
    const isEn = locale === 'en';
    const phone = customPhone || "";
    const logoSrc = customLogo || DEFAULT_TEKNO_LOGO;

    const invoiceNum = order.invoiceNumber || `FAC-${order.id.slice(0, 8).toUpperCase()}`;
    const orderDate = new Date(order.invoiceDate || order.createdAt).toLocaleDateString(
        isAr ? 'ar-MA' : isEn ? 'en-US' : 'fr-FR',
        { year: 'numeric', month: 'long', day: 'numeric' }
    );

    const paid = Number(order.paidAmount) || (order.isPaid ? Number(order.total) : 0);
    const remaining = order.remainingAmount !== null && order.remainingAmount !== undefined
        ? Number(order.remainingAmount)
        : (order.isPaid ? 0 : Math.max(0, Number(order.total) - paid));

    const subtotal = order.items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity)), 0);
    const shipping = Number(order.shippingFees || 0);
    const discount = Number(order.discount || 0);
    const total = Number(order.total || (subtotal + shipping - discount));

    const dict = {
        fr: {
            title: "FACTURE & BON DE GARANTIE",
            orderRef: "Commande N°",
            invoiceDate: "Date de facturation :",
            seller: "Émetteur :",
            customer: "Facturé à :",
            items: "Articles commandés",
            item: "Désignation",
            qty: "Quantité",
            unitPrice: "Prix unitaire",
            totalLine: "Total",
            subtotal: "Sous-total articles :",
            shipping: "Frais de livraison :",
            free: "Gratuite",
            discount: "Remise :",
            totalToPay: "TOTAL DE LA COMMANDE :",
            amountPaid: "Acompte / Montant payé :",
            remainingBalance: "RESTE À PAYER (LIVRAISON) :",
            paidStatus: "Facture soldée",
            unpaidStatus: "Paiement à la livraison (COD)",
            footer1: "Tekno Store — High-Tech, Smartphones, PC, Mac & Accessoires au Maroc.",
            footer2: `Pour toute question : Contact.tekno.ma@gmail.com | ${phone}`,
            printBtn: "Imprimer / Enregistrer en PDF",
            closeBtn: "Fermer"
        },
        ar: {
            title: "فاتورة الشراء",
            orderRef: "رقم الطلب :",
            invoiceDate: "تاريخ الفاتورة :",
            seller: "البائع :",
            customer: "فاتورة إلى :",
            items: "الكتب والمنتجات",
            item: "الوصف",
            qty: "الكمية",
            unitPrice: "سعر الوحدة",
            totalLine: "المجموع",
            subtotal: "المجموع الفرعي :",
            shipping: "التوصيل :",
            free: "مجاني",
            discount: "الخصم :",
            totalToPay: "المجموع الإجمالي :",
            amountPaid: "العربون / المدفوع :",
            remainingBalance: "المبلغ المتبقي (عند الاستلام) :",
            paidStatus: "مدفوعة بالكامل",
            unpaidStatus: "الدفع عند الاستلام (COD)",
            footer1: "Tekno Store — متجر مستلزمات الحيوانات الأليفة بالمغرب.",
            footer2: `لأي استفسار : Contact.tekno.ma@gmail.com | ${phone}`,
            printBtn: "طباعة / حفظ بصيغة PDF",
            closeBtn: "إغلاق"
        },
        en: {
            title: "INVOICE & WARRANTY CERTIFICATE",
            orderRef: "Order #",
            invoiceDate: "Invoice Date:",
            seller: "Sold by:",
            customer: "Billed to:",
            items: "Tech Hardware & Devices",
            item: "Item Description & IMEI",
            qty: "Qty",
            unitPrice: "Unit Price",
            totalLine: "Total",
            subtotal: "Items Subtotal:",
            shipping: "Shipping:",
            free: "Free",
            discount: "Discount:",
            totalToPay: "ORDER TOTAL:",
            amountPaid: "Amount Paid / Advance:",
            remainingBalance: "REMAINING BALANCE (COD):",
            paidStatus: "Paid in Full",
            unpaidStatus: "Cash on Delivery (COD)",
            footer1: "Tekno Store — High-Tech, Smartphones, PC, Mac & Accessories in Morocco.",
            footer2: `Support: Contact.tekno.ma@gmail.com | ${phone}`,
            printBtn: "Print / Save as PDF",
            closeBtn: "Close"
        }
    };
    const labels = dict[locale as 'fr' | 'ar' | 'en'] || dict.fr;

    const itemsRows = order.items.map((it) => {
        const title = it.book?.title || it.pack?.name || it.extraProduct?.name || it.digitalProduct?.title || it.title || it.name || 'Produit High-Tech';
        const serial = it.serialNumber || it.book?.isbn;
        const lineTotal = Number(it.price) * Number(it.quantity);
        return `
            <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: ${isAr ? 'right' : 'left'};">
                    <strong style="color: #0f172a; font-size: 13px;">${escapeHtml(title)}</strong>
                    ${serial ? `<div style="margin-top: 3px; font-size: 11px; color: #0284c7; font-weight: 700; font-family: monospace;">🛡️ N° Série / IMEI : ${escapeHtml(serial)} &bull; Garantie constructeur 12M</div>` : ''}
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 13px;">
                    ${it.quantity}
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: ${isAr ? 'left' : 'right'}; color: #334155; font-size: 13px;">
                    ${Number(it.price).toFixed(2)} DH
                </td>
                <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: ${isAr ? 'left' : 'right'}; font-weight: bold; color: #0f172a; font-size: 13px;">
                    ${lineTotal.toFixed(2)} DH
                </td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="${locale}" dir="${isAr ? 'rtl' : 'ltr'}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${labels.title} - ${invoiceNum}</title>
            <style>
                @page {
                    size: A4;
                    margin: 12mm 15mm;
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                body {
                    background-color: #f8fafc;
                    color: #0f172a;
                    padding: 24px;
                    font-size: 13px;
                }
                .invoice-container {
                    max-width: 820px;
                    margin: 0 auto;
                    background: #ffffff;
                    padding: 36px 40px;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                    border: 1px solid #e2e8f0;
                }
                .action-bar {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-bottom: 24px;
                }
                .btn {
                    padding: 10px 18px;
                    font-size: 13px;
                    font-weight: 700;
                    border-radius: 8px;
                    cursor: pointer;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .btn-print {
                    background: #2563eb;
                    color: #ffffff;
                }
                .btn-print:hover {
                    background: #1d4ed8;
                }
                .btn-close {
                    background: #e2e8f0;
                    color: #334155;
                }
                .header-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                .company-title {
                    font-size: 24px;
                    font-weight: 900;
                    color: #0f172a;
                    letter-spacing: -0.5px;
                }
                .company-sub {
                    font-size: 12px;
                    color: #64748b;
                    margin-top: 4px;
                }
                .invoice-tag {
                    text-align: ${isAr ? 'left' : 'right'};
                }
                .invoice-badge {
                    display: inline-block;
                    background: #0f172a;
                    color: #ffffff;
                    padding: 6px 14px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }
                .parties-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 28px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .parties-table td {
                    padding: 16px 20px;
                    vertical-align: top;
                    width: 50%;
                }
                .section-header {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 0.8px;
                    margin-bottom: 6px;
                }
                .party-name {
                    font-size: 15px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 4px;
                }
                .party-info {
                    font-size: 12px;
                    color: #475569;
                    line-height: 1.5;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                }
                .items-table th {
                    background: #0f172a;
                    color: #ffffff;
                    padding: 10px 14px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .summary-table {
                    width: 340px;
                    margin-${isAr ? 'right' : 'left'}: auto;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                }
                .summary-table td {
                    padding: 7px 10px;
                    font-size: 13px;
                }
                .summary-total {
                    border-top: 2px solid #0f172a;
                    font-weight: 900;
                    font-size: 15px;
                    color: #0f172a;
                    padding-top: 10px !important;
                }
                .summary-paid {
                    color: #059669;
                    font-weight: 700;
                }
                .summary-remaining {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    color: #991b1b;
                    font-weight: 900;
                    font-size: 14px;
                }
                .footer-box {
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                    text-align: center;
                    font-size: 11px;
                    color: #64748b;
                    line-height: 1.6;
                }
                @media print {
                    body {
                        background: #ffffff !important;
                        padding: 0 !important;
                    }
                    .action-bar {
                        display: none !important;
                    }
                    .invoice-container {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="action-bar">
                    <button class="btn btn-close" onclick="window.close()">${labels.closeBtn}</button>
                    <button class="btn btn-print" onclick="window.print()">🖨️ ${labels.printBtn}</button>
                </div>

                <table class="header-table">
                    <tr>
                        <td style="vertical-align: middle;">
                            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
                                <img src="${logoSrc}" alt="Tekno Store Logo" style="height: 44px; width: auto; object-fit: contain; display: inline-block; vertical-align: middle;" />
                                <div style="display: inline-block; vertical-align: middle;">
                                    <div class="company-title" style="margin: 0; line-height: 1.1;">Tekno Store BOOKS</div>
                                    <div class="company-sub" style="margin-top: 2px;">Librairie & Édition • Maroc</div>
                                </div>
                            </div>
                            <div class="company-sub">Contact.tekno.ma@gmail.com | ${escapeHtml(phone)}</div>
                        </td>
                        <td class="invoice-tag" style="vertical-align: middle;">
                            <div class="invoice-badge">${labels.title}</div>
                            <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 6px;">#${invoiceNum}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${labels.invoiceDate} ${orderDate}</div>
                        </td>
                    </tr>
                </table>

                <table class="parties-table">
                    <tr>
                        <td style="border-${isAr ? 'left' : 'right'}: 1px solid #e2e8f0;">
                            <div class="section-header">${labels.seller}</div>
                            <div class="party-name">Tekno Store SARL</div>
                            <div class="party-info">Casablanca, Maroc</div>
                            <div class="party-info">ICE : 002589632000045</div>
                            <div class="party-info">Web : https://tekno.ma</div>
                        </td>
                        <td>
                            <div class="section-header">${labels.customer}</div>
                            <div class="party-name">${escapeHtml(order.fullName)}</div>
                            <div class="party-info">📞 ${escapeHtml(order.phone)}</div>
                            <div class="party-info">📍 ${escapeHtml(order.address)}, ${escapeHtml(order.city)}</div>
                            ${order.email ? `<div class="party-info">✉️ ${escapeHtml(order.email)}</div>` : ''}
                        </td>
                    </tr>
                </table>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="text-align: ${isAr ? 'right' : 'left'};">${labels.item}</th>
                            <th style="text-align: center; width: 70px;">${labels.qty}</th>
                            <th style="text-align: ${isAr ? 'left' : 'right'}; width: 110px;">${labels.unitPrice}</th>
                            <th style="text-align: ${isAr ? 'left' : 'right'}; width: 120px;">${labels.totalLine}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <table class="summary-table">
                    <tr>
                        <td style="color: #64748b;">${labels.subtotal}</td>
                        <td style="text-align: ${isAr ? 'left' : 'right'}; font-weight: 600;">${subtotal.toFixed(2)} DH</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;">${labels.shipping}</td>
                        <td style="text-align: ${isAr ? 'left' : 'right'}; font-weight: 600; color: ${shipping === 0 ? '#059669' : '#0f172a'};">
                            ${shipping === 0 ? labels.free : `${shipping.toFixed(2)} DH`}
                        </td>
                    </tr>
                    ${discount > 0 ? `
                        <tr>
                            <td style="color: #dc2626;">${labels.discount}</td>
                            <td style="text-align: ${isAr ? 'left' : 'right'}; font-weight: 700; color: #dc2626;">-${discount.toFixed(2)} DH</td>
                        </tr>
                    ` : ''}
                    <tr class="summary-total">
                        <td>${labels.totalToPay}</td>
                        <td style="text-align: ${isAr ? 'left' : 'right'}; font-size: 16px;">${total.toFixed(2)} DH</td>
                    </tr>
                    <tr>
                        <td class="summary-paid">${labels.amountPaid}</td>
                        <td style="text-align: ${isAr ? 'left' : 'right'};" class="summary-paid">${paid.toFixed(2)} DH</td>
                    </tr>
                    <tr class="summary-remaining">
                        <td style="padding: 10px;"><strong>${labels.remainingBalance}</strong></td>
                        <td style="text-align: ${isAr ? 'left' : 'right'}; padding: 10px; font-size: 15px;"><strong>${remaining.toFixed(2)} DH</strong></td>
                    </tr>
                </table>

                <div class="footer-box">
                    <p><strong>${labels.footer1}</strong></p>
                    <p>${labels.footer2}</p>
                    <p style="margin-top: 4px; font-size: 10px; color: #94a3b8;">${order.isPaid ? labels.paidStatus : labels.unpaidStatus} • Commande #${order.id.slice(0, 8).toUpperCase()}</p>
                </div>
            </div>

            <script>
                // Auto trigger print if requested
                window.addEventListener('load', () => {
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('print') === '1' || params.get('print') === 'true') {
                        setTimeout(() => window.print(), 300);
                    }
                });
            </script>
        </body>
        </html>
    `;
}

function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Triggers PDF print dialog on client side
 */
export function downloadOrderInvoicePdf(order: OrderInvoiceData, locale: string = 'fr') {
    const html = generateInvoiceHtml(order, locale);
    const printWindow = window.open('', '_blank', 'width=880,height=920');
    if (!printWindow) {
        // Fallback: direct to API route if popup blocked
        window.open(`/api/orders/${order.id}/invoice?print=1`, '_blank');
        return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 400);
}
