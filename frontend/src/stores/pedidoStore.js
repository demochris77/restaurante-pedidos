import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';
import socket from '../socket'; // Importar socket
import { cacheGet, cacheSet } from '../utils/cache'; // ✅ NUEVO

export const usePedidoStore = defineStore('pedido', () => {
    const pedidos = ref([]);
    const menu = ref([]);
    const mesas = ref([]);
    const cart = ref([]); // ✅ NUEVO: Local cart for customers
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
            const response = await api.crearPedido({
                mesa_numero,
                usuario_mesero_id,
                items,
                notas
            });
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

    const actualizarEstadoPedido = async (id, estado, notas = null) => {
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
            // Update notes locally if provided
            if (notas !== null) {
                pedidos.value[pedidoIndex].notas = notas;
            }
        }

        try {
            await api.actualizarEstadoPedido(id, estado, notas);
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
    // ✅ NUEVO: Actualizar notas
    const actualizarNotasItem = async (itemId, notas) => {
        try {
            await api.actualizarNotasItem(itemId, notas);
        } catch (err) {
            console.error('Error updating notes:', err);
            throw err;
        }
    };

    const dividirItem = async (itemId) => {
        try {
            await api.dividirItem(itemId);
            // El socket actualizará la lisat
        } catch (err) {
            console.error('Error splitting item:', err);
            throw err;
        }
    };

    // ================= CLIENT CART (Customer) =================
    const addToCart = (item) => {
        // ✅ STOCK VALIDATION
        if (item.usa_inventario && !item.es_directo) {
            const stockDisponible = (item.stock_actual || 0) - (item.stock_reservado || 0);
            // Calculate quantity already in cart
            const inCart = cart.value
                .filter(i => i.id === item.id)
                .reduce((sum, i) => sum + i.quantity, 0);

            if (inCart + 1 > stockDisponible) {
                // Optional: returning false or throwing to let UI handle it
                // For now, we'll just return early and maybe the UI checks `canAdd`
                console.warn('Stock limit reached for customer');
                return false;
            }
        }

        // Try to find existing item with same ID and SAME NOTES (empty initially)
        const existing = cart.value.find(i => i.id === item.id && (!i.notas || i.notas === ''));

        if (existing) {
            existing.quantity++;
        } else {
            // Create unique internal ID for cart management
            const cartItemId = Date.now() + Math.random().toString(36).substr(2, 9);
            cart.value.push({
                ...item,
                cartItemId, // Unique ID for frontend 
                quantity: 1,
                notas: ''
            });
        }
        return true;
    };

    const removeFromCart = (cartItemId) => {
        const index = cart.value.findIndex(i => i.cartItemId === cartItemId);
        if (index !== -1) {
            cart.value.splice(index, 1);
        }
    };

    const updateCartQuantity = (cartItemId, change) => {
        const item = cart.value.find(i => i.cartItemId === cartItemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(cartItemId);
            }
        }
    };

    // ✅ NUEVO: Support for notes
    const updateCartNotes = (cartItemId, notas) => {
        const item = cart.value.find(i => i.cartItemId === cartItemId);
        if (item) {
            item.notas = notas;
        }
    };

    // ✅ NUEVO: Split item (Ungroup)
    const splitCartItem = (cartItemId) => {
        const item = cart.value.find(i => i.cartItemId === cartItemId);
        if (item && item.quantity > 1) {
            item.quantity--;

            // Add new separate item
            const newCartItemId = Date.now() + Math.random().toString(36).substr(2, 9);
            cart.value.push({
                ...item,
                cartItemId: newCartItemId,
                quantity: 1
                // Keeps same notes
            });
        }
    };

    const clearCart = () => {
        cart.value = [];
    };

    const cartTotal = computed(() => {
        return cart.value.reduce((total, item) => total + (item.precio * item.quantity), 0);
    });

    const cartItemCount = computed(() => {
        return cart.value.reduce((total, item) => total + item.quantity, 0);
    });

    // ✅ NUEVO: Computed categories for the menu
    const categorias = computed(() => {
        if (!menu.value || menu.value.length === 0) return [];
        const cats = new Set(menu.value.map(item => item.categoria).filter(Boolean));
        // Sort explicitly if needed, but set order is insertion order usually.
        // Let's rely on backend or default order for now.
        return Array.from(cats);
    });

    return {
        pedidos,
        menu,
        mesas,
        loading,
        error,
        categorias, // ✅ Export this
        cargarMenu,
        cargarMesas,
        cargarPedidosActivos,
        crearPedido,
        actualizarEstadoPedido,
        actualizarEstadoItem,
        actualizarNotasItem,
        dividirItem,
        pedidosPorEstado,
        iniciarRealTime,
        // Cart exports
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartNotes, // ✅ Export
        splitCartItem,   // ✅ Export
        clearCart,
        cartTotal,
        cartItemCount
    };
});
