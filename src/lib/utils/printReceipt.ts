export interface ReceiptData {
    orderId: string;
    customerName: string;
    customerPhone: string;
    customerCity: string;
    items: {
        title?: string;
        name?: string;
        quantity: number;
        price: number;
    }[];
    subtotal: number;
    shippingFees: number;
    discount: number;
    total: number;
    shippingCompany?: string;
}

export function printReceipt(data: ReceiptData) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = data.items.map(item => `
        <div class="item">
            <span class="item-name">${item.title || item.name || 'Article'}</span>
        </div>
        <div class="item-details">
            <span class="item-qty">${item.quantity} x ${item.price.toFixed(2)}</span>
            <span class="item-price">${(item.price * item.quantity).toFixed(2)} DH</span>
        </div>
    `).join('');

    const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Ticket #${data.orderId.substring(0, 8)}</title>
            <style>
                @page { margin: 0; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 80mm; /* Standard thermal printer width */
                    margin: 0 auto;
                    padding: 5mm;
                    font-size: 12px;
                    color: #000;
                    box-sizing: border-box;
                }
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .header h1 {
                    font-size: 24px;
                    margin: 0 0 5px 0;
                    font-weight: bold;
                    letter-spacing: 2px;
                }
                .header p {
                    margin: 2px 0;
                    font-size: 11px;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 10px 0;
                }
                .item {
                    font-weight: bold;
                    margin-top: 5px;
                }
                .item-details {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                    font-size: 11px;
                }
                .summary {
                    margin-top: 15px;
                }
                .summary-line {
                    display: flex;
                    justify-content: space-between;
                    margin: 3px 0;
                }
                .total-line {
                    display: flex;
                    justify-content: space-between;
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                    padding: 5px 0;
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                }
                .customer-info {
                    margin-top: 15px;
                    font-size: 11px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 11px;
                    padding-bottom: 10mm; /* Extra space for cutting */
                }
                /* Hide QR script placeholder */
                .qr-container {
                    text-align: center;
                    margin: 15px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Tekno Store</h1>
                <p>La passion de lire</p>
                <div class="divider"></div>
                <p>Ticket de caisse</p>
                <p>${new Date().toLocaleString('fr-FR')}</p>
                <p>Cmd: #${data.orderId.substring(0, 8).toUpperCase()}</p>
            </div>

            <div class="items">
                ${itemsHtml}
            </div>

            <div class="summary">
                <div class="divider"></div>
                <div class="summary-line">
                    <span>Sous-total</span>
                    <span>${data.subtotal.toFixed(2)} DH</span>
                </div>
                <div class="summary-line">
                    <span>Livraison</span>
                    <span>${data.shippingFees.toFixed(2)} DH</span>
                </div>
                ${data.discount > 0 ? `
                <div class="summary-line">
                    <span>Remise</span>
                    <span>-${data.discount.toFixed(2)} DH</span>
                </div>
                ` : ''}

                <div class="total-line">
                    <span>TOTAL</span>
                    <span>${data.total.toFixed(2)} DH</span>
                </div>
            </div>

            <div class="customer-info">
                <p><strong>Client:</strong> ${data.customerName}</p>
                <p><strong>Tél:</strong> ${data.customerPhone}</p>
                <p><strong>Ville:</strong> ${data.customerCity}</p>
            </div>

            <!-- QR Code -->
            <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://tekno.ma/order/' + data.orderId)}" alt="QR Code" />
            </div>

            <div class="footer">
                <p>Merci de votre visite !</p>
                <p>tekno.ma</p>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

export interface ZReportData {
    sessionId: string;
    openedAt: string;
    closedAt: string;
    startingFloat: number;
    expectedCash: number;
    actualCash: number;
    difference: number;
    userName?: string;
}

export function printZReport(data: ZReportData) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Clôture de Caisse #${data.sessionId.substring(0, 8)}</title>
            <style>
                @page { margin: 0; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 5mm;
                    font-size: 12px;
                    color: #000;
                    box-sizing: border-box;
                }
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .header h1 {
                    font-size: 20px;
                    margin: 0 0 5px 0;
                    font-weight: bold;
                }
                .header p {
                    margin: 2px 0;
                    font-size: 11px;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 10px 0;
                }
                .line {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }
                .bold { font-weight: bold; }
                .large { font-size: 14px; }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 11px;
                    padding-bottom: 10mm;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RAPPORT Z</h1>
                <p>Clôture de caisse</p>
                <div class="divider"></div>
                <p>Date : ${new Date().toLocaleString('fr-FR')}</p>
                <p>Session #${data.sessionId.substring(0, 8).toUpperCase()}</p>
            </div>

            <div class="details">
                <div class="line">
                    <span>Ouverture :</span>
                    <span>${new Date(data.openedAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div class="line">
                    <span>Clôture :</span>
                    <span>${new Date(data.closedAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                ${data.userName ? `<div class="line"><span>Caissier :</span><span>${data.userName}</span></div>` : ''}

                <div class="divider"></div>

                <div class="line">
                    <span>Fonds de tiroir initial:</span>
                    <span>${data.startingFloat.toFixed(2)} DH</span>
                </div>
                <div class="line">
                    <span>Ventes espèces:</span>
                    <span>${(data.expectedCash - data.startingFloat).toFixed(2)} DH</span>
                </div>

                <div class="divider"></div>

                <div class="line bold large">
                    <span>Cash Attendu:</span>
                    <span>${data.expectedCash.toFixed(2)} DH</span>
                </div>
                <div class="line bold large">
                    <span>Cash Compté:</span>
                    <span>${data.actualCash.toFixed(2)} DH</span>
                </div>

                <div class="divider"></div>

                <div class="line bold ${data.difference < 0 ? 'large' : ''}">
                    <span>Ecart (Déficit/Excédent):</span>
                    <span>${data.difference > 0 ? '+' : ''}${data.difference.toFixed(2)} DH</span>
                </div>
            </div>

            <div class="footer">
                <p>Document interne</p>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}
