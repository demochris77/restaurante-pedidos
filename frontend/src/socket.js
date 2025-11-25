import { io } from "socket.io-client";

// Determinar URL del backend dinámicamente (igual que en api.js)
const getSocketUrl = () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31);

    if (isLocal) {
        return `http://${hostname}:3000`;
    } else {
        return import.meta.env.VITE_API_URL || 'https://restaurante-pedidos-backend.onrender.com';
    }
};

const socket = io(getSocketUrl(), {
    autoConnect: false,
    reconnection: true,
});

export default socket;
