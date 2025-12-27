import { ref, onMounted, onUnmounted } from 'vue';
import api from '../api';
import socket from '../socket';

export function useNotificaciones(rol) {
    const notificaciones = ref([]);
    // The `ultimaVerificacion` ref was removed in the provided diff, but not explicitly.
    // Assuming it's intended to be removed as it's not used in the new logic.
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
            // Limitar historial para no llenar localStorage indefinidamente
            if (cerradas.length > 200) cerradas.shift();
            localStorage.setItem(`notificaciones_cerradas_${rol}`, JSON.stringify(cerradas));
        }
    };

    // Reproducir sonido
    const reproducirSonido = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // ✅ Fix: Intentar reanudar si está suspendido (política de autoplay)
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(() => { });
            }

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
        const cerradas = getNotificacionesCerradas();
        if (cerradas.includes(id)) return;

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

        reproducirSonido();

        try {
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        } catch (err) {
            // Ignorar error de vibración
        }

        try {
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        } catch (err) {
            // Ignorar error de vibración
        }

        // ✅ MODIFICADO: Ya no mostramos notificación nativa aquí para evitar duplicidad
        // con las Push Notifications del Service Worker.
        /* 
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🍽️ Restaurante POS', {
                body: titulo,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
        */
    };

    // Cerrar notificación manualmente
    const cerrarNotificacion = (notifId) => {
        notificaciones.value = notificaciones.value.filter(n => n.id !== notifId);
        marcarComoCerrada(notifId);
    };

    // Verificar nuevas notificaciones (fallback si socket falla)
    const verificarNotificaciones = async () => {
        try {
            if (rol === 'cocinero') {
                const pedidosResponse = await api.getPedidosActivos();
                const pedidosNuevos = pedidosResponse.data.filter(p => p.estado === 'nuevo');

                if (pedidosNuevos.length > 0) {
                    pedidosNuevos.forEach(pedido => {
                        mostrarNotificacion(
                            `pedido-${pedido.id}-nuevo`,
                            `🆕 Mesa ${pedido.mesa_numero}: Nuevo pedido (${pedido.items_count} items)`,
                            'nuevo'
                        );
                    });
                }
            }
            else if (rol === 'mesero') {
                const pedidosResponse = await api.getPedidosActivos();
                const pedidosListos = pedidosResponse.data.filter(p => p.estado === 'listo');

                if (pedidosListos.length > 0) {
                    pedidosListos.forEach(pedido => {
                        mostrarNotificacion(
                            `pedido-${pedido.id}-listo`,
                            `✅ Mesa ${pedido.mesa_numero}: ¡Pedido LISTO! 🎉`,
                            'listo'
                        );
                    });
                }
            }
            else if (rol === 'facturero') {
                const pedidosResponse = await api.getPedidosActivos();
                const pedidosListosPagar = pedidosResponse.data.filter(p => p.estado === 'listo_pagar');

                if (pedidosListosPagar.length > 0) {
                    pedidosListosPagar.forEach(pedido => {
                        mostrarNotificacion(
                            `pedido-${pedido.id}-pago`,
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

    onMounted(() => {
        // ✅ REMOVIDO: Permission request ahora se hace en main.js solo para usuarios logueados
        // if ('Notification' in window && Notification.permission === 'default') {
        //     Notification.requestPermission();
        // }

        if (!socket.connected) socket.connect();

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
            // Obtener usuario actual del localStorage (o store si prefieres)
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

            // ✅ AGREGAR ESTO: Listener para solicitud de cuenta
            socket.on('solicitar_cuenta', (data) => {
                // Verificar si la solicitud es para este mesero
                if (usuario.id && String(data.mesero_id) === String(usuario.id)) {
                    mostrarNotificacion(
                        `cuenta-${data.pedido_id}`, // ID único
                        `💳 Mesa ${data.mesa_numero}: Solicitan la cuenta`, // Mensaje
                        'info'
                    );
                }
            });

            // Notificación cuando un item está listo
            socket.on('item_ready', (data) => {
                console.log('🔔 Item listo recibido:', data);

                // ✅ FILTRO: Solo notificar si el usuario es el mesero asignado Y NO es item directo
                if (usuario.id && data.mesero_id === usuario.id && !data.es_directo) {
                    mostrarNotificacion(
                        `item_listo_${data.item_id}`,
                        `✅ ${data.item_nombre} listo (Mesa ${data.mesa_numero})`,
                        'success'
                    );
                }
            });

            socket.on('pedido_actualizado', ({ id, estado }) => {
                if (estado === 'listo') {
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

        // ✅ OPTIMIZED: Intervalo de respaldo cada 60s (antes 30s) - reduce bandwidth 50%
        intervalo = setInterval(verificarNotificaciones, 60000);

        console.log(`✅ Notificaciones activadas para: ${rol}`);
    });

    onUnmounted(() => {
        socket.off('nuevo_pedido');
        socket.off('pedido_actualizado');
        socket.off('item_completed'); // New listener to turn off
        socket.off('solicitar_cuenta'); // ✅ AGREGAR ESTO
        if (intervalo) clearInterval(intervalo);
    });

    return {
        notificaciones,
        verificarNotificaciones,
        mostrarNotificacion,
        cerrarNotificacion
    };
}
