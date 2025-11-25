import { ref, onMounted, onUnmounted } from 'vue';
import api from '../api';
import socket from '../socket';

export function useNotificaciones(rol) {
    const notificaciones = ref([]);
    const ultimaVerificacion = ref(Date.now());
    let intervalo = null;

    // Cargar notificaciones cerradas del localStorage
    const getNotificacionesCerradas = () => {
        const cerradas = localStorage.getItem(`notificaciones_cerradas_${rol}`);
        return cerradas ? JSON.parse(cerradas) : [];
    };

    // Guardar ID de notificación cerrada
    const marcarComoCerrada = (id) => {
        const cerradas = getNotificacionesCerradas();
        if (!cerradas.includes(id)) {
            cerradas.push(id);
            // Limitar historial para no llenar localStorage indefinidamente (opcional, ej: ultimos 100)
            if (cerradas.length > 200) cerradas.shift();
            localStorage.setItem(`notificaciones_cerradas_${rol}`, JSON.stringify(cerradas));
        }
    };

    // Reproducir sonido
    const reproducirSonido = () => {
        try {
            // Crear sonido simple beep
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (err) {
            console.warn('No se pudo reproducir sonido:', err);
        }
    };

    // Mostrar notificación
    const mostrarNotificacion = (id, titulo, tipo = 'info') => {
        // 1. Verificar si ya fue cerrada anteriormente (persistencia)
        const cerradas = getNotificacionesCerradas();
        if (cerradas.includes(id)) return;

        // 2. Verificar si ya está visible actualmente
        const existe = notificaciones.value.some(n => n.id === id);
        if (existe) return;

        const notif = {
            id,
            titulo,
            tipo,
            timestamp: new Date()
        };

        notificaciones.value.push(notif);
        console.log(`🔔 ${tipo.toUpperCase()}: ${titulo}`);

        // Reproducir sonido solo cuando aparece por primera vez
        reproducirSonido();

        // Vibrar (si es móvil)
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Notificación del sistema
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🍽️ Restaurante POS', {
                body: titulo,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }

        // YA NO desaparece automáticamente
    };

    // Cerrar notificación manualmente
    const cerrarNotificacion = (notifId) => {
        // Remover de la lista visible
        notificaciones.value = notificaciones.value.filter(n => n.id !== notifId);
        // Marcar como cerrada permanentemente
        marcarComoCerrada(notifId);
    };

    // Verificar nuevas notificaciones cada 3 segundos
    const verificarNotificaciones = async () => {
        try {
            if (rol === 'cocinero') {
                // Cocinero: Verificar si hay pedidos NUEVOS
                const pedidosResponse = await api.getPedidosActivos();
                const pedidosNuevos = pedidosResponse.data.filter(p => p.estado === 'nuevo');

                if (pedidosNuevos.length > 0) {
                    pedidosNuevos.forEach(pedido => {
                        mostrarNotificacion(
                            `pedido-${pedido.id}-nuevo`, // ID determinista
                            `🆕 Mesa ${pedido.mesa_numero}: Nuevo pedido (${pedido.items_count} items)`,
                            'nuevo'
                        );
                    });
                }
            }
            else if (rol === 'mesero') {
                // Mesero: Verificar si hay pedidos LISTOS
                const pedidosResponse = await api.getPedidosActivos();
                const pedidosListos = pedidosResponse.data.filter(p => p.estado === 'listo');

                if (pedidosListos.length > 0) {
                    pedidosListos.forEach(pedido => {
                        mostrarNotificacion(
                            `pedido-${pedido.id}-listo`, // ID determinista
                            `✅ Mesa ${pedido.mesa_numero}: ¡Pedido LISTO! 🎉`,
                            'listo'
                        );
                    });
                }
            }
            else if (rol === 'facturero') {
                // Facturero: Verificar si hay pedidos LISTOS PARA PAGAR
                const pedidosResponse = await api.getPedidosActivos();
                const pedidosListosPagar = pedidosResponse.data.filter(p => p.estado === 'listo_pagar');

                if (pedidosListosPagar.length > 0) {
                    pedidosListosPagar.forEach(pedido => {
                        mostrarNotificacion(
                            `pedido-${pedido.id}-pago`, // ID determinista
                            `💰 Mesa ${pedido.mesa_numero}: Listo para pagar ($${pedido.total})`,
                            'pago'
                        );
                    });
                }
            }
        } catch (err) {
            console.error('Error verificando notificaciones:', err);
        }
    };

    // Iniciar verificaciones
    onMounted(() => {
        // Pedir permisos de notificación del sistema
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if (!socket.connected) socket.connect();

        // Listeners según rol
        if (rol === 'cocinero') {
            socket.on('nuevo_pedido', (pedido) => {
                mostrarNotificacion(
                    `pedido-${pedido.id}-nuevo`,
                    `🆕 Mesa ${pedido.mesa_numero}: Nuevo pedido (${pedido.items_count} items)`,
                    'nuevo'
                );
            });
        }
        else if (rol === 'mesero') {
            socket.on('pedido_actualizado', ({ id, estado }) => {
                if (estado === 'listo') {
                    // Necesitamos saber la mesa, pero el evento solo trae ID y estado.
                    // Podríamos hacer un fetch rápido o confiar en que el store ya se actualizó
                    // Por simplicidad, mostramos mensaje genérico o hacemos fetch
                    api.getPedido(id).then(res => {
                        const p = res.data;
                        mostrarNotificacion(
                            `pedido-${id}-listo`,
                            `✅ Mesa ${p.mesa_numero}: ¡Pedido LISTO! 🎉`,
                            'listo'
                        );
                    });
                }
            });
        }
        else if (rol === 'facturero') {
            socket.on('pedido_actualizado', ({ id, estado }) => {
                if (estado === 'listo_pagar') {
                    api.getPedido(id).then(res => {
                        const p = res.data;
                        mostrarNotificacion(
                            `pedido-${id}-pago`,
                            `💰 Mesa ${p.mesa_numero}: Listo para pagar ($${p.total})`,
                            'pago'
                        );
                    });
                }
            });
        }

        console.log(`✅ Notificaciones activadas para: ${rol}`);
    });

    onUnmounted(() => {
        socket.off('nuevo_pedido');
        socket.off('pedido_actualizado');
    });

    return {
        notificaciones,
        verificarNotificaciones,
        mostrarNotificacion,
        cerrarNotificacion
    };
}
