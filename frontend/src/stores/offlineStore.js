import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useOfflineStore = defineStore('offline', () => {
    const isOnline = ref(navigator.onLine);
    const pedidosPendientes = ref([]);
    const pagosPendientes = ref([]);

    // Detectar cambios de conexión
    window.addEventListener('online', () => {
        isOnline.value = true;
        console.log('✅ Conexión restaurada');
        sincronizarPendientes();
    });

    window.addEventListener('offline', () => {
        isOnline.value = false;
        console.log('⚠️ Sin conexión');
    });

    const agregarPedidoPendiente = (pedido) => {
        pedidosPendientes.value.push({
            ...pedido,
            timestamp: new Date().toISOString(),
            sincronizado: false
        });
        localStorage.setItem('pedidosPendientes', JSON.stringify(pedidosPendientes.value));
    };

    const agregarPagoPendiente = (pago) => {
        pagosPendientes.value.push({
            ...pago,
            timestamp: new Date().toISOString(),
            sincronizado: false
        });
        localStorage.setItem('pagosPendientes', JSON.stringify(pagosPendientes.value));
    };

    const cargarPendientes = () => {
        const pedidos = localStorage.getItem('pedidosPendientes');
        const pagos = localStorage.getItem('pagosPendientes');

        if (pedidos) pedidosPendientes.value = JSON.parse(pedidos);
        if (pagos) pagosPendientes.value = JSON.parse(pagos);
    };

    const sincronizarPendientes = async () => {
        console.log('🔄 Sincronizando datos pendientes...');

        // Sincronizar pedidos
        for (const pedido of pedidosPendientes.value) {
            if (!pedido.sincronizado) {
                try {
                    // Aquí iría la llamada API para sincronizar
                    pedido.sincronizado = true;
                    console.log('✅ Pedido sincronizado');
                } catch (err) {
                    console.error('Error sincronizando pedido:', err);
                }
            }
        }

        // Sincronizar pagos
        for (const pago of pagosPendientes.value) {
            if (!pago.sincronizado) {
                try {
                    // Aquí iría la llamada API para sincronizar
                    pago.sincronizado = true;
                    console.log('✅ Pago sincronizado');
                } catch (err) {
                    console.error('Error sincronizando pago:', err);
                }
            }
        }

        // Guardar cambios
        localStorage.setItem('pedidosPendientes', JSON.stringify(pedidosPendientes.value));
        localStorage.setItem('pagosPendientes', JSON.stringify(pagosPendientes.value));
    };

    return {
        isOnline,
        pedidosPendientes,
        pagosPendientes,
        agregarPedidoPendiente,
        agregarPagoPendiente,
        cargarPendientes,
        sincronizarPendientes
    };
});
