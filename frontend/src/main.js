import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

import './style.css'

const app = createApp(App)

app.use(createPinia())
app.mount('#app')

// ============= REGISTRAR SERVICE WORKER =============
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registrado:', registration);

                // Verificar actualizaciones cada 1 hora
                setInterval(() => {
                    registration.update();
                }, 3600000);
            })
            .catch((err) => {
                console.error('❌ Error registrando Service Worker:', err);
            });
    });
}
// Pedir permisos de notificación
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
        console.log('Permisos de notificación:', permission);
    });
}


// ============= DETECTAR ESTADO DE CONEXIÓN =============
window.addEventListener('online', () => {
    console.log('📡 Conexión restaurada');
    // Aquí puedes sincronizar datos pendientes
    window.dispatchEvent(new Event('connection-restored'));
});

window.addEventListener('offline', () => {
    console.log('⚠️ Sin conexión - modo offline activado');
    window.dispatchEvent(new Event('connection-lost'));
});

// Verificar estado inicial
console.log('Estado de conexión:', navigator.onLine ? 'Online' : 'Offline');
