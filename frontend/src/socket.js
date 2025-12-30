import { io } from "socket.io-client";

// Determinar URL del backend dinámicamente (igual que en api.js)
const getSocketUrl = () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31;

    if (isLocal) {
        // ✅ Usar path relativo (o vacío) para conectar al mismo origen (proxy vite)
        console.log('🔌 Socket Local: Usando Proxy Vite');
        return '';
    } else {
        return import.meta.env.VITE_SOCKET_URL;
    }
};

const socket = io(getSocketUrl(), {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    // ✅ IMPORTANTE: Permitir ambos transports (polling primero para Render)
    transports: ['polling', 'websocket'],
    // ✅ Upgrade a WebSocket si está disponible
    upgrade: true,
    // Timeout más largo para conexiones lentas
    timeout: 20000
});

// ✅ Logging para debugging
socket.on('connect', () => {
    console.log('✅ Socket conectado:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('❌ Socket desconectado:', reason);
});

socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión socket:', error.message);
});

export default socket;
