import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';
import socket from '../socket'; // Importar socket
import { cacheGet, cacheSet } from '../utils/cache'; // ✅ NUEVO

export const usePedidoStore = defineStore('pedido', () => {
    const pedidos = ref([]);
    const menu = ref([]);
    const mesas = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const cargarMenu = async () => {
        // ⚠️ CACHE DISABLED for real-time inventory
        // const cached = cacheGet('menu', 300000);
        // if (cached) {
        //     menu.value = cached;
        //     return;
        // }

        loading.value = true;
        try {
            const response = await api.getMenu();
            menu.value = response.data;
            // cacheSet('menu', response.data);
        } catch (err) {
            error.value = 'Error cargando menú';
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    const cargarMesas = async () => {
        // ✅ NUEVO: Check cache first (10 min TTL)
        const cached = cacheGet('mesas', 600000);
        if (cached) {
            mesas.value = cached;
            return;
        }

        loading.value = true;
        try {
            const response = await api.getMesas();
            mesas.value = response.data;
            // ✅ NUEVO: Cache the result
            cacheSet('mesas', response.data);
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
        // Optimistic Update: Actualizar localmente primero para velocidad
        const pedidoIndex = pedidos.value.findIndex(p => p.id === id);
        const pedidoOriginal = pedidoIndex !== -1 ? { ...pedidos.value[pedidoIndex] } : null;

        if (pedidoIndex !== -1) {
            if (estado === 'cancelado') {
                // Si es cancelado, quitarlo de la lista visualmente
                // Ojo: Si socket reenvía, podría volver, pero el filtro de MeseroPanel lo ocultará
                pedidos.value[pedidoIndex].estado = estado;
            } else {
                pedidos.value[pedidoIndex].estado = estado;
            }
        }

        try {
            await api.actualizarEstadoPedido(id, estado);
            // Ya no recargamos todo 'cargarPedidosActivos()'. El socket se encargará si hay cambios externos.
        } catch (err) {
            // Rollback en caso de error
            if (pedidoOriginal && pedidoIndex !== -1) {
                pedidos.value[pedidoIndex] = pedidoOriginal;
            }
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

        // ✅ NUEVO: Recargar menú cuando hay cambios de inventario
        socket.on('inventory_update', () => {
            console.log('📦 Inventario cambiado - Recargando menú...');
            cargarMenu();
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

    // ✅ NUEVO: Actualizar notas
    const actualizarNotasItem = async (itemId, notas) => {
        try {
            await api.items.updateNotes(itemId, notas);
        } catch (err) {
            console.error('Error updating notes:', err);
            throw err;
        }
    };

    // ✅ NUEVO: Dividir item
    const dividirItem = async (itemId) => {
        try {
            await api.items.split(itemId);
            // El socket actualizará la lisat
        } catch (err) {
            console.error('Error splitting item:', err);
            throw err;
        }
    };

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
        actualizarNotasItem,
        dividirItem,
        pedidosPorEstado,
        iniciarRealTime // Exportar acción
    };
});
