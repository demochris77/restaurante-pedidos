// Simple backend translations for push notifications
const translations = {
    es: {
        new_order: '🆕 Nuevo Pedido',
        new_order_body: (mesa, count) => `Mesa ${mesa}: ${count} item(s) para preparar`,
        item_ready: '✅ Plato Listo',
        item_ready_body: (mesa, nombre) => `Mesa ${mesa}: ${nombre} está listo`,
        bill_requested: '💳 Solicitud de Cuenta',
        bill_requested_body: (mesa) => `Mesa ${mesa} solicitó la cuenta`,
        payment_ready: '💰 Listo para Pagar',
        payment_ready_body: (mesa, total) => `Mesa ${mesa}: $${total} listo para facturar`,
        order_cancelled: '❌ Pedido Cancelado',
        order_cancelled_body: (mesa) => `Mesa ${mesa} canceló el pedido`
    },
    en: {
        new_order: '🆕 New Order',
        new_order_body: (mesa, count) => `Table ${mesa}: ${count} item(s) to prepare`,
        item_ready: '✅ Dish Ready',
        item_ready_body: (mesa, nombre) => `Table ${mesa}: ${nombre} is ready`,
        bill_requested: '💳 Bill Requested',
        bill_requested_body: (mesa) => `Table ${mesa} requested the bill`,
        payment_ready: '💰 Ready to Pay',
        payment_ready_body: (mesa, total) => `Table ${mesa}: $${total} ready to bill`,
        order_cancelled: '❌ Order Cancelled',
        order_cancelled_body: (mesa) => `Table ${mesa} cancelled the order`
    }
};

/**
 * Get translated text for push notifications
 * @param {string} key - Translation key
 * @param {string} lang - Language code (es, en)
 * @param  {...any} params - Parameters for template
 * @returns {string}
 */
export function t(key, lang = 'es', ...params) {
    const langData = translations[lang] || translations.es;
    const value = langData[key];

    if (typeof value === 'function') {
        return value(...params);
    }

    return value || key;
}

export default translations;
