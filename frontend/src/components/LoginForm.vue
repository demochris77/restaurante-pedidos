<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>🍽️ Restaurante Sierra Nevada</h1>
        <p>Sistema de Gestión de Pedidos</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="tu@email.com"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="rol">Tu Rol</label>
          <select
            id="rol"
            v-model="rol"
            required
            :disabled="loading"
          >
            <option value="">-- Selecciona tu rol --</option>
            <option value="mesero">👨‍💼 Mesero</option>
            <option value="cocinero">👨‍🍳 Cocinero</option>
            <option value="facturero">💰 Facturero/Caja</option>
            <option value="admin">👨‍💻 Administrador</option>
          </select>
        </div>

        <button
          type="submit"
          class="btn btn-login"
          :disabled="loading || !email || !rol"
        >
          <span v-if="loading">Iniciando sesión...</span>
          <span v-else>Iniciar Sesión</span>
        </button>
      </form>

      <div v-if="error" class="error-message">
        <strong>❌ Error:</strong> {{ error }}
      </div>

      <div class="demo-info">
        <h3>👤 Usuarios de Demostración</h3>
        <div class="demo-users">
          <div class="demo-user">
            <strong>Mesero:</strong>
            <code>carlos@restaurant.com</code>
          </div>
          <div class="demo-user">
            <strong>Cocinero:</strong>
            <code>juan@restaurant.com</code>
          </div>
          <div class="demo-user">
            <strong>Facturero:</strong>
            <code>rosa@restaurant.com</code>
          </div>
          <div class="demo-user">
            <strong>Admin:</strong>
            <code>admin@restaurant.com</code>
          </div>
        </div>
        <p class="demo-note">
          💡 Puedes usar cualquier correo, se creará automáticamente
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUsuarioStore } from '../stores/usuarioStore';

const usuarioStore = useUsuarioStore();

const email = ref('');
const rol = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  error.value = '';
  loading.value = true;

  try {
    await usuarioStore.login(email.value, rol.value);
  } catch (err) {
    error.value = usuarioStore.error || 'Error al conectar con el servidor';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 28px;
  margin: 0 0 8px 0;
  color: var(--color-primary);
}

.login-header p {
  color: var(--color-text);
  font-size: 14px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 14px;
}

.form-group input,
.form-group select {
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--color-primary);
  outline: none;
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.btn-login {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #dc2626;
  font-size: 14px;
  animation: slideUp 0.3s ease-out;
}

.demo-info {
  background-color: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
}

.demo-info h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--color-primary);
}

.demo-users {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-user {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.demo-user strong {
  color: var(--color-text);
}

.demo-user code {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  font-family: 'Courier New', monospace;
  color: var(--color-primary);
  font-weight: 600;
}

.demo-note {
  font-size: 12px;
  color: #666;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

/* Responsivo */
@media (max-width: 480px) {
  .login-card {
    padding: 24px;
  }

  .login-header h1 {
    font-size: 22px;
  }

  .demo-info {
    padding: 12px;
  }

  .demo-user {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
