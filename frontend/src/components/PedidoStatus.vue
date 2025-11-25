<template>
  <div class="pedido-status-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando estado del pedido...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="icon">❌</div>
      <h3>No pudimos encontrar tu pedido</h3>
      <p>{{ error }}</p>
      <button @click="cargarPedido" class="btn btn-primary">Intentar de nuevo</button>
    </div>

    <div v-else-if="pedido" class="status-content">
      <div class="header">
        <h1>🍽️ Estado de tu Pedido</h1>
        <div class="mesa-badge">Mesa {{ pedido.mesa_numero }}</div>
      </div>

      <!-- Estado General -->
      <div class="status-card">
        <div class="status-icon">
          <span v-if="pedido.estado === 'nuevo'">📝</span>
          <span v-else-if="pedido.estado === 'en_cocina'">👨‍🍳</span>
          <span v-else-if="pedido.estado === 'listo'">✅</span>
          <span v-else-if="pedido.estado === 'servido'">🍽️</span>
          <span v-else-if="pedido.estado === 'pagado'">💰</span>
        </div>
        <div class="status-text">
          <h2>{{ getEstadoTexto(pedido.estado) }}</h2>
          <p>{{ getEstadoDescripcion(pedido.estado) }}</p>
        </div>
      </div>

      <!-- Barra de Progreso -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: porcentajeProgreso + '%' }"></div>
        </div>
        <div class="progress-labels">
          <span>Recibido</span>
          <span>Preparando</span>
          <span>Listo</span>
        </div>
      </div>

      <!-- Lista de Items -->
      <div class="items-section">
        <h3>Tu Orden</h3>
        <div class="items-list">
          <div v-for="item in pedido.items" :key="item.id" class="item-row" :class="{ 'item-ready': item.estado === 'listo' }">
            <div class="item-info">
              <span class="qty">{{ item.cantidad }}x</span>
              <span class="name">{{ item.nombre }}</span>
            </div>
            <div class="item-status">
              <span v-if="item.estado === 'listo'" class="badge-ready">Listo</span>
              <span v-else class="badge-prep">Preparando</span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-note">
        <p>¡Gracias por tu visita! Si necesitas ayuda, llama a un mesero.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';
import socket from '../socket';

const route = useRoute();
const pedidoId = route.params.id;

const pedido = ref(null);
const loading = ref(true);
const error = ref(null);

const cargarPedido = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.getPedido(pedidoId);
    pedido.value = response.data;
  } catch (err) {
    error.value = 'El pedido no existe o ya fue cerrado.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const porcentajeProgreso = computed(() => {
  if (!pedido.value) return 0;
  const estados = ['nuevo', 'en_cocina', 'listo', 'servido', 'pagado'];
  const index = estados.indexOf(pedido.value.estado);
  
  if (pedido.value.estado === 'en_cocina') {
      // Calcular basado en items listos
      const total = pedido.value.items.length;
      const listos = pedido.value.items.filter(i => i.estado === 'listo').length;
      const base = 25; // Inicio de "en cocina"
      const avance = (listos / total) * 50; // Max 50% extra
      return base + avance;
  }
  
  const porcentajes = {
      nuevo: 10,
      en_cocina: 25,
      listo: 75,
      servido: 90,
      pagado: 100
  };
  return porcentajes[pedido.value.estado] || 0;
});

const getEstadoTexto = (estado) => {
  const textos = {
    nuevo: 'Pedido Recibido',
    en_cocina: 'En Preparación',
    listo: '¡Pedido Listo!',
    servido: 'Disfruta tu Comida',
    pagado: 'Gracias por tu Visita',
    listo_pagar: 'Listo para Pagar',
    en_caja: 'En Caja'
  };
  return textos[estado] || estado;
};

const getEstadoDescripcion = (estado) => {
  const desc = {
    nuevo: 'Hemos recibido tu orden y pronto comenzaremos a prepararla.',
    en_cocina: 'Nuestros chefs están preparando tus platos con cuidado.',
    listo: 'Tu orden está lista para ser servida.',
    servido: 'Esperamos que disfrutes tus alimentos.',
    pagado: 'El pago ha sido procesado exitosamente.',
    listo_pagar: 'Un mesero se acercará pronto para el pago.',
    en_caja: 'Procesando tu pago en caja.'
  };
  return desc[estado] || '';
};

const setupRealTime = () => {
    if (!socket.connected) socket.connect();

    socket.on('pedido_actualizado', ({ id, estado }) => {
        if (pedido.value && pedido.value.id === id) {
            pedido.value.estado = estado;
        }
    });

    socket.on('item_actualizado', ({ id, pedido_id, estado }) => {
        if (pedido.value && pedido.value.id === pedido_id) {
            const item = pedido.value.items.find(i => i.id === id);
            if (item) {
                item.estado = estado;
            }
        }
    });
};

onMounted(() => {
  cargarPedido();
  setupRealTime();
});

onUnmounted(() => {
    socket.off('pedido_actualizado');
    socket.off('item_actualizado');
});
</script>

<style scoped>
.pedido-status-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: #f9fafb;
  font-family: 'Inter', sans-serif;
}

.loading, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 24px;
  margin-bottom: 8px;
  color: #111827;
}

.mesa-badge {
  display: inline-block;
  background: #e0e7ff;
  color: #4338ca;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.status-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.status-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.status-text h2 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #111827;
}

.status-text p {
  color: #6b7280;
  font-size: 14px;
}

.progress-section {
  margin-bottom: 32px;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #10b981);
  transition: width 0.5s ease-out;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.items-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.items-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 12px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qty {
  font-weight: 700;
  color: #6b7280;
}

.name {
  font-weight: 500;
  color: #111827;
}

.badge-ready {
  background: #d1fae5;
  color: #065f46;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-prep {
  background: #fef3c7;
  color: #92400e;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.footer-note {
  text-align: center;
  margin-top: 40px;
  color: #9ca3af;
  font-size: 12px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
</style>
