<template>
  <div class="login-container">
    <div class="glass-card">
      <div class="header-section">
        <div class="logo-circle">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="logo-img" />
          <UtensilsCrossed v-else :size="48" class="logo-icon" />
        </div>
        <h1>{{ nombreRestaurante }}</h1>
        <p class="subtitle">{{ subtituloRestaurante }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="username">{{ $t('login.username') }}</label>
          <div class="input-wrapper">
            <User :size="18" class="input-icon" />
            <input
              id="username"
              v-model="username"
              type="text"
              :placeholder="$t('login.username')"
              required
              :disabled="loading"
            />
          </div>
        </div>

        <div class="input-group">
          <label for="password">{{ $t('login.password') }}</label>
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
              :disabled="loading"
            />
          </div>
        </div>

        <button
          type="submit"
          class="btn-login"
          :disabled="loading || !username || !password"
          :class="{ 'loading': loading }"
        >
          <span v-if="loading" class="spinner"></span>
          <span v-else>{{ $t('login.login_btn') }}</span>
          <ArrowRight v-if="!loading" :size="20" />
        </button>
      </form>

      <transition name="fade">
        <div v-if="error" class="error-alert">
          <AlertCircle :size="18" />
          <span>{{ error }}</span>
        </div>
      </transition>
      
      <div class="footer-note">
        <p>{{ $t('login.authorized_only') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUsuarioStore } from '../stores/usuarioStore';
import { subscribeToPush } from '../utils/pushSubscription'; 
import api from '../api'; 
import { useI18n } from 'vue-i18n';
import { UtensilsCrossed, User, Lock, ArrowRight, AlertCircle } from 'lucide-vue-next';

const { t } = useI18n();
const usuarioStore = useUsuarioStore();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const nombreRestaurante = ref(import.meta.env.VITE_APP_TITLE || 'Restaurante');
const subtituloRestaurante = ref(import.meta.env.VITE_APP_DESCRIPTION || 'Sistema de Gestión');
const logoUrl = ref(null);

const cargarConfig = async () => {
  try {
    const res = await api.getConfig();
    if (res.data) {
      nombreRestaurante.value = res.data.nombre || nombreRestaurante.value;
      subtituloRestaurante.value = res.data.subtitulo || subtituloRestaurante.value;
      
      // Load Dynamic Logo
      if (res.data.icon_192_url) {
         logoUrl.value = res.data.icon_192_url;
      } else if (res.data.icon_512_url) {
         logoUrl.value = res.data.icon_512_url;
      } else if (res.data.apple_touch_icon_url) {
         logoUrl.value = res.data.apple_touch_icon_url;
      }

      // Apply Colors dynamically if needed for this component, 
      // though typically App.vue sets global vars.
      // We rely on var(--theme-color) being set by App.vue or defaulting.
      if (res.data.color_primario) {
        document.documentElement.style.setProperty('--theme-color', res.data.color_primario);
      }
    }  
  } catch (err) {
    console.error('Error cargando config:', err);
  }
};

cargarConfig();

const handleLogin = async () => {
  error.value = '';
  loading.value = true;

  try {
    const success = await usuarioStore.login(username.value, password.value);
    const success = await usuarioStore.login(username.value, password.value);
    // Login success logic handled in store (redirection, etc.) or parent
    if (success) {
       // Optional: additional success logic
    }
  } catch (err) {
    error.value = usuarioStore.error || t('common.error');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  /* Light Premium Gradient */
  background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
  /* Add subtle brand color tint if available via var */
  background-image: 
    radial-gradient(at 0% 0%, rgba(var(--theme-color-rgb, 249, 115, 22), 0.08) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(100, 116, 139, 0.05) 0px, transparent 50%);
  padding: 20px;
}

.glass-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.85); /* Frosty white */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5); /* Subtle white border */
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); /* Softer shadow for light mode */
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.header-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo-circle {
  width: 90px;
  height: 90px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); /* Softer shadow */
  margin-bottom: 8px;
  overflow: hidden;
  padding: 12px; /* Slight padding for logo breathing room */
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-icon {
  color: var(--theme-color, #f97316);
}

h1 {
  color: #1e293b; /* Dark Slate - High Contrast */
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  color: #64748b; /* Slate 500 */
  font-size: 1rem;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  color: #334155; /* Slate 700 - Readable label */
  font-size: 0.9rem;
  font-weight: 600;
  margin-left: 4px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  color: #94a3b8; /* Lighter slate for placeholder icon */
  pointer-events: none;
  transition: color 0.3s;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  background: #ffffff;
  border: 1px solid #e2e8f0; /* Light gray border */
  border-radius: 12px;
  color: #0f172a; /* Very dark text */
  font-size: 1rem;
  transition: all 0.3s;
}

.input-wrapper input::placeholder {
  color: #cbd5e1;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--theme-color, #f97316);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb, 249, 115, 22), 0.1);
}

.input-wrapper input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: var(--theme-color, #f97316);
}

.btn-login {
  margin-top: 12px;
  background: var(--theme-color, #f97316);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 10px 20px -5px rgba(var(--theme-color-rgb, 249, 115, 22), 0.3);
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 15px 25px -5px rgba(var(--theme-color-rgb, 249, 115, 22), 0.4);
}

.btn-login:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.error-alert {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.footer-note {
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
