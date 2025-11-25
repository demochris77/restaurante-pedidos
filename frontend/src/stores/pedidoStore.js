import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';
import socket from '../socket'; // Importar socket

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
            // No necesitamos recargar aquí si el socket funciona, pero por seguridad lo dejamos o lo quitamos
            // await cargarPedidosActivos(); 
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
            // await cargarPedidosActivos(); // Socket se encarga
        } catch (err) {
            error.value = 'Error actualizando pedido';
            throw err;
        }
    };

    const actualizarEstadoItem = async (id, estado) => {
        try {
            await api.actualizarEstadoItem(id, estado);
            // await cargarPedidosActivos(); // Socket se encarga
        } catch (err) {
            error.value = 'Error actualizando item';
            throw err;
        }
    };

    // ================= REAL-TIME =================
    const iniciarRealTime = () => {
        if (!socket.connected) {
            socket.connect();
        }

        socket.on('connect', () => {
            console.log('✅ Socket conectado');
            cargarPedidosActivos(); // Recargar pedidos al conectar para asegurar consistencia
        });

        socket.on('nuevo_pedido', (nuevoPedido) => {
            console.log('🔔 Nuevo pedido recibido:', nuevoPedido);
            pedidos.value.push(nuevoPedido);
        });

        socket.on('pedido_actualizado', ({ id, estado }) => {
            console.log('🔔 Pedido actualizado:', id, estado);
            const pedido = pedidos.value.find(p => p.id === id);
            if (pedido) {
                pedido.estado = estado;
            }
        });

        socket.on('item_actualizado', ({ id, pedido_id, estado }) => {
            console.log('🔔 Item actualizado:', id, estado);
            const pedido = pedidos.value.find(p => p.id === pedido_id);
            if (pedido && pedido.items) {
                const item = pedido.items.find(i => i.id === id);
                if (item) {
                    item.estado = estado;
                }
            }
        });

        socket.on('pedido_pagado', ({ pedido_id, estado }) => {
            console.log('🔔 Pedido pagado:', pedido_id);
            const pedido = pedidos.value.find(p => p.id === pedido_id);
            if (pedido) {
                pedido.estado = estado;
            }
        });
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
        pedidosPorEstado,
        iniciarRealTime // Exportar acción
    };
});
