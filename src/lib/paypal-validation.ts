export interface PaypalOrder {
    id: string
    status: string
    links?: { rel: string; href: string }[]
    purchase_units?: {
        reference_id?: string
        custom_id?: string
        amount: { currency_code: string; value: string }
        payments?: { captures?: {
            id: string
            status: string
            amount: { currency_code: string; value: string }
        }[] }
    }[]
}

export function usdCents(amount: { currency_code: string; value: string }) {
    if (amount.currency_code !== 'USD' || !/^\d+\.\d{2}$/.test(amount.value)) {
        throw new Error('Devise ou montant PayPal invalide')
    }
    const cents = Math.round(Number(amount.value) * 100)
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Montant PayPal invalide')
    return cents
}

export function validatePaypalOrder(remote: PaypalOrder, payment: {
    id: string; orderId: string; paypalOrderId: string | null; amountUsd: number
}, requireCapture = false) {
    const units = remote.purchase_units
    if (remote.id !== payment.paypalOrderId || units?.length !== 1) {
        throw new Error('Paiement PayPal non associé à cette commande')
    }
    const unit = units[0]
    if (unit.reference_id !== payment.orderId || unit.custom_id !== payment.id || usdCents(unit.amount) !== payment.amountUsd) {
        throw new Error('Référence ou montant PayPal incorrect')
    }
    if (!requireCapture) return
    const captures = unit.payments?.captures
    if (remote.status !== 'COMPLETED' || captures?.length !== 1 || captures[0].status !== 'COMPLETED' ||
        !captures[0].id || usdCents(captures[0].amount) !== payment.amountUsd) {
        throw new Error('Paiement PayPal non encaissé intégralement')
    }
    return captures[0].id
}
