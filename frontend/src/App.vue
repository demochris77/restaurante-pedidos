<template>
  <div id="app" class="app-container">
    <!-- Vista Pública del Menú -->
    <MenuView v-if="isPublicMenu" />

    <!-- Aplicación Principal -->
    <template v-else>
      <!-- Si no hay usuario logueado, mostrar login -->
      <LoginForm v-if="!usuarioStore.usuario" />

      <!-- Si hay usuario logueado, mostrar según rol -->
      <template v-else>
        <!-- Navbar superior -->
        <nav class="navbar">
          <div class="navbar-content">
            <div class="navbar-left">
              <h1 class="logo">🍽️ Restaurante POS</h1>
              <span class="rol-badge" :class="`rol-${usuarioStore.usuario.rol}`">
                {{ obtenerNombreRol(usuarioStore.usuario.rol) }}
              </span>
            </div>
            <div class="navbar-right">
              <span class="usuario-nombre">{{ usuarioStore.usuario.nombre }}</span>
              <button @click="logout" class="btn btn-logout">Cerrar sesión</button>
            </div>
          </div>
        </nav>

        <!-- Contenido según rol -->
        <div class="main-content">
          <MeseroPanel v-if="usuarioStore.usuario.rol === 'mesero'" />
          <CocineroPanel v-if="usuarioStore.usuario.rol === 'cocinero'" />
          <CajaPanel v-if="usuarioStore.usuario.rol === 'facturero'" />
          <AdminPanel v-if="usuarioStore.usuario.rol === 'admin'" />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUsuarioStore } from './stores/usuarioStore';
import LoginForm from './components/LoginForm.vue';
import MeseroPanel from './components/MeseroPanel.vue';
import CocineroPanel from './components/CocineroPanel.vue';
import CajaPanel from './components/CajaPanel.vue';
import AdminPanel from './components/AdminPanel.vue';
import MenuView from './components/MenuView.vue';

const isPublicMenu = ref(false);

// Agrega botón para mostrar/ocultar en el navbar


const usuarioStore = useUsuarioStore();

// Cargar usuario guardado al montar
onMounted(() => {
  usuarioStore.cargarUsuarioGuardado();
  // Detectar si estamos en la ruta pública del menú
  if (window.location.pathname === '/menu') {
    isPublicMenu.value = true;
  }
});

const logout = () => {
  usuarioStore.logout();
};

const obtenerNombreRol = (rol) => {
  const roles = {
    mesero: '👨‍💼 Mesero',
    cocinero: '👨‍🍳 Cocinero',
    facturero: '💰 Facturero',
    admin: '👨‍💻 Administrador'
  };
  return roles[rol] || rol;
};
</script>

<style >
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-bg);
}

.navbar {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 20px;
  width: 100%;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
}

.rol-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rol-mesero {
  background: rgba(59, 130, 246, 0.3);
}

.rol-cocinero {
  background: rgba(249, 115, 22, 0.3);
}

.rol-facturero {
  background: rgba(16, 185, 129, 0.3);
}

.rol-admin {
  background: rgba(139, 92, 246, 0.3);
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.usuario-nombre {
  font-weight: 600;
  font-size: 14px;
}

.btn-logout {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
}
body, #app, .main-content, .cocinero-panel, .card, .panel-content, .section, .pedido-card, .items-list, .item-line, input, button, label, span {
  user-select: auto !important;
  pointer-events: auto !important;
}
/* Responsivo */
@media (max-width: 768px) {
  .navbar-content {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .navbar-left {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .navbar-right {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .logo {
    font-size: 18px;
  }

  .main-content {
    padding: 10px;
  }
}
</style>
