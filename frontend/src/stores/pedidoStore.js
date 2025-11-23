import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';

export const usePedidoStore = defineStore('pedido', () => {
    const pedidos = ref([]);
    const menu = ref([]);
    const mesas = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const cargarMenu = async () => {
        loading.value = true;
        try {
            const response = await api.getMenu();
            menu.value = response.data;
        } catch (err) {
            error.value = 'Error cargando menú';
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    const cargarMesas = async () => {
        loading.value = true;
        try {
            const response = await api.getMesas();
            mesas.value = response.data;
        } catch (err) {
            error.value = 'Error cargando mesas';
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    const cargarPedidosActivos = async () => {
        loading.value = true;
        try {
            const response = await api.getPedidosActivos();
            pedidos.value = response.data;
        } catch (err) {
            error.value = 'Error cargando pedidos';
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    const crearPedido = async (mesa_numero, usuario_mesero_id, items, notas = '') => {
        loading.value = true;
        try {
            const response = await api.crearPedido(mesa_numero, usuario_mesero_id, items, notas);
            await cargarPedidosActivos();
            return response.data;
        } catch (err) {
            error.value = 'Error creando pedido';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const actualizarEstadoPedido = async (id, estado) => {
        try {
            await api.actualizarEstadoPedido(id, estado);
            await cargarPedidosActivos();
        } catch (err) {
            error.value = 'Error actualizando pedido';
            throw err;
        }
    };

    const actualizarEstadoItem = async (id, estado) => {
        try {
            await api.actualizarEstadoItem(id, estado);
            await cargarPedidosActivos();
        } catch (err) {
            error.value = 'Error actualizando item';
            throw err;
        }
    };

    const pedidosPorEstado = computed(() => {
        const estados = {
            nuevo: [],
            en_cocina: [],
            listo: [],
            servido: [],
            listo_pagar: [],
            en_caja: [],
            pagado: []
        };

        pedidos.value.forEach(p => {
            if (estados[p.estado]) {
                estados[p.estado].push(p);
            }
        });

        return estados;
    });

    return {
        pedidos,
        menu,
        mesas,
        loading,
        error,
        cargarMenu,
        cargarMesas,
        cargarPedidosActivos,
        crearPedido,
        actualizarEstadoPedido,
        actualizarEstadoItem,
        pedidosPorEstado
    };
});
