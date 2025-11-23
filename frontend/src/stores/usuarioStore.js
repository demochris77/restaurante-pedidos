import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';

export const useUsuarioStore = defineStore('usuario', () => {
    const usuario = ref(null);
    const error = ref(null);
    const loading = ref(false);

    const login = async (email, rol) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.login(email, rol);
            usuario.value = response.data;
            localStorage.setItem('usuario', JSON.stringify(response.data));
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
