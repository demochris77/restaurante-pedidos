import { ref, onMounted, onUnmounted } from 'vue';
import api from '../api';

export function useNotificaciones(rol) {
    const notificaciones = ref([]);
    const ultimaVerificacion = ref(Date.now());
    let intervalo = null;

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
    const mostrarNotificacion = (titulo, tipo = 'info') => {
        // Verificar si ya existe una notificación similar
        const existe = notificaciones.value.some(n => n.titulo === titulo);
        if (existe) return;

        const notif = {
            id: Date.now(),
            titulo,
            tipo,
            timestamp: new Date()
        };

        notificaciones.value.push(notif);
        console.log(`🔔 ${tipo.toUpperCase()}: ${titulo}`);

        // Reproducir sonido
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

        // Desaparecer en 5 segundos
        setTimeout(() => {
            notificaciones.value = notificaciones.value.filter(n => n.id !== notif.id);
        }, 5000);
    };

    // Cerrar notificación manualmente
    const cerrarNotificacion = (notifId) => {
        notificaciones.value = notificaciones.value.filter(n => n.id !== notifId);
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

        // Verificar cada 3 segundos
        intervalo = setInterval(verificarNotificaciones, 3000);

        // Verificar inmediatamente
        verificarNotificaciones();

        console.log(`✅ Notificaciones activadas para: ${rol}`);
    });

    onUnmounted(() => {
        if (intervalo) {
            clearInterval(intervalo);
            console.log(`❌ Notificaciones desactivadas para: ${rol}`);
        }
    });

    return {
        notificaciones,
        verificarNotificaciones,
        mostrarNotificacion,
        cerrarNotificacion
    };
}
