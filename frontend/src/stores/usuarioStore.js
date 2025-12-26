import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';
import { subscribeToPush } from '../utils/pushSubscription'; // ✅ NUEVO

export const useUsuarioStore = defineStore('usuario', () => {
    const usuario = ref(null);
    const error = ref(null);
    const loading = ref(false);

    const login = async (username, password) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.login(username, password);
            usuario.value = response.data;
            localStorage.setItem('usuario', JSON.stringify(response.data));

            // ✅ NUEVO: Subscribe to push notifications
            try {
                await subscribeToPush(response.data.usuario.id, response.data.usuario.rol);
                console.log('✅ Subscribed to push notifications');
            } catch (pushError) {
                console.warn('⚠️ Push subscription failed:', pushError);
                // No bloqueamos el login si falla el push
            }

            // ✅ NUEVO: Sync language preference with backend
            try {
                const userLanguage = localStorage.getItem('i18n_locale') || 'es';
                await api.updateUserLanguage(response.data.usuario.id, userLanguage);
                console.log(`✅ Language synced: ${userLanguage}`);
            } catch (langError) {
                console.warn('⚠️ Language sync failed:', langError);
            }

            return response.data;
        } catch (err) {
            error.value = err.response?.data?.error || 'Error al iniciar sesión';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const logout = () => {
        usuario.value = null;
        localStorage.removeItem('usuario');
    };

    const cargarUsuarioGuardado = () => {
        const guardado = localStorage.getItem('usuario');
        if (guardado) {
            usuario.value = JSON.parse(guardado);
        }
    };

    return {
        usuario,
        error,
        loading,
        login,
        logout,
        cargarUsuarioGuardado
    };
});
