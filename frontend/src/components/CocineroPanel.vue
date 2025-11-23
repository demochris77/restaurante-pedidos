<template>
  <div class="cocinero-panel">
    <div class="panel-header">
      <h2>👨‍🍳 Panel de Cocina</h2>
      <div class="header-info">
        <span class="badge" :class="{ 'badge-alert': pedidosNuevos.length > 0 }">
          🆕 {{ pedidosNuevos.length }} nuevos
        </span>
        <span class="badge">🍳 {{ pedidosEnCocina.length }} en preparación</span>
        <button @click="actualizarPedidos" class="btn btn-secondary" :disabled="loading">
          🔄
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading">Cargando pedidos...</div>

      <template v-else>
        <!-- Pedidos Nuevos -->
        <div class="section">
          <h3>🆕 Pedidos Nuevos</h3>
          <div v-if="pedidosNuevos.length === 0" class="empty-state">
            Sin pedidos nuevos
          </div>
          <div v-else class="pedidos-columns">
            <div v-for="pedido in pedidosNuevos" :key="pedido.id" class="pedido-card">
              <div class="card-header">
                <span class="mesa-num">🪑 Mesa {{ pedido.mesa_numero }}</span>
                <button
                  @click="iniciarPedido(pedido.id)"
                  class="btn btn-warning btn-small"
                >
                  Iniciar
                </button>
              </div>
              <div class="items-list">
                <div v-for="item in pedido.items" :key="item.id" class="item-line">
                  <span class="qty">{{ item.cantidad }}x</span>
                  <span class="name">{{ item.nombre }}</span>
                </div>
              </div>
              <div v-if="pedido.notas" class="notas">{{ pedido.notas }}</div>
            </div>
          </div>
        </div>

        <!-- Pedidos en Preparación -->
        <div class="section">
          <h3>🍳 En Preparación</h3>
          <div v-if="pedidosEnCocina.length === 0" class="empty-state">
            Sin pedidos en preparación
          </div>
          <div v-else class="pedidos-columns">
            <div v-for="pedido in pedidosEnCocina" :key="pedido.id" class="pedido-card pedido-cooking">
              <div class="card-header">
                <span class="mesa-num">🪑 Mesa {{ pedido.mesa_numero }}</span>
              </div>
              <div class="items-list">
                <div
                  v-for="item in pedido.items"
                  :key="item.id"
                  class="item-line"
                  :class="{ 'item-done': item.estado === 'listo' }"
                >
                  <input
                    type="checkbox"
                    :checked="item.estado === 'listo'"
                    @change="() => marcarItemListo(item.id, item.estado)"
                    class="item-checkbox"
                  />
                  <span class="qty">{{ item.cantidad }}x</span>
                  <span class="name">{{ item.nombre }}</span>
                </div>
              </div>
              <div class="progreso-bar">
                <div class="progreso-fill" :style="{ width: porcentajePedido(pedido) + '%' }"></div>
              </div>
              <button
                v-if="allItemsReady(pedido)"
                @click="completarPedido(pedido.id)"
                class="btn btn-success btn-full"
              >
                ✅ Completar Pedido
              </button>
            </div>
          </div>
        </div>

        <!-- Pedidos Listos -->
        <div class="section">
          <h3>✅ Listos para Servir</h3>
          <div v-if="pedidosListos.length === 0" class="empty-state">
            Sin pedidos listos
          </div>
          <div v-else class="pedidos-columns">
            <div v-for="pedido in pedidosListos" :key="pedido.id" class="pedido-card pedido-ready">
              <div class="card-header">
                <span class="mesa-num">🪑 Mesa {{ pedido.mesa_numero }}</span>
                <span class="badge-success">LISTO</span>
              </div>
              <div class="items-list">
                <div v-for="item in pedido.items" :key="item.id" class="item-line">
                  <span class="qty">{{ item.cantidad }}x</span>
                  <span class="name">{{ item.nombre }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <div class="notificaciones-container">
    <div v-for="notif in notificaciones" :key="notif.id" :class="['notificacion', `notif-${notif.tipo}`]">
      <span class="badge">{{ notif.tipo }}</span>
      <span>{{ notif.titulo }}</span>
      <button @click="cerrarNotificacion(notif.id)" class="btn-cerrar-notif">✕</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useNotificaciones } from '../composables/useNotificaciones';

const { notificaciones, cerrarNotificacion } = useNotificaciones('cocinero');

const pedidoStore = usePedidoStore();
const loading = ref(false);
let autoRefreshInterval = null;

const pedidosNuevos = computed(() => pedidoStore.pedidosPorEstado.nuevo);
const pedidosEnCocina = computed(() => pedidoStore.pedidosPorEstado.en_cocina);
const pedidosListos = computed(() => pedidoStore.pedidosPorEstado.listo);

const actualizarPedidos = async () => {
  loading.value = true;
  try {
    await pedidoStore.cargarPedidosActivos();
  } catch (err) {
    console.error('Error cargando pedidos:', err);
  } finally {
    loading.value = false;
  }
};

const iniciarPedido = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'en_cocina');
  } catch (err) {
    alert('Error iniciando pedido');
  }
};

const completarPedido = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'listo');
  } catch (err) {
    alert('Error completando pedido');
  }
};

const marcarItemListo = async (itemId, estadoActual) => {
  const nuevoEstado = estadoActual === 'listo' ? 'pendiente' : 'listo';
  try {
    await pedidoStore.actualizarEstadoItem(itemId, nuevoEstado);
  } catch (err) {
    console.error('Error marcando item:', err);
  }
};

const porcentajePedido = (pedido) => {
  const total = pedido.items.length;
  const listos = pedido.items.filter(i => i.estado === 'listo').length;
  return Math.round((listos / total) * 100);
};

const allItemsReady = (pedido) => {
  return pedido.items.every(i => i.estado === 'listo');
};

onMounted(() => {
  actualizarPedidos();
  // Auto-refresh cada 30 segundos
  autoRefreshInterval = setInterval(actualizarPedidos, 30000);
});

onUnmounted(() => {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
});
</script>

<style scoped>
.cocinero-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.badge-alert {
  background: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.pedidos-columns {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pedido-card {
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
  transition: all 0.3s;
}

.pedido-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pedido-cooking {
  border-left: 4px solid #f59e0b;
  background: #fef3c7;
}

.pedido-ready {
  border-left: 4px solid #10b981;
  background: #ecfdf5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

.mesa-num {
  font-weight: 700;
  font-size: 16px;
}

.badge-success {
  background: #10b981;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.items-list {
  margin-bottom: 12px;
}

.item-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin: 4px 0;
}

.item-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.item-done {
  opacity: 0.5;
  text-decoration: line-through;
}

.qty {
  font-weight: 700;
  color: #666;
  min-width: 30px;
}

.name {
  flex: 1;
  font-weight: 600;
}

.notas {
  background: #fef08a;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 12px;
  font-style: italic;
  color: #333;
}

.progreso-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progreso-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #10b981);
  transition: width 0.3s;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-warning {
  background: #f59e0b;
}

.btn-full {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.loading {
  text-align: center;
  padding: 40px;
}

@media (max-width: 768px) {
  .pedidos-columns {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    gap: 12px;
  }
}
.notificaciones-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 350px;
}

.notificacion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-left: 4px solid #999;
  animation: slideIn 0.3s ease-out;
  font-weight: 600;
}

.btn-cerrar-notif {
  background: none;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.btn-cerrar-notif:hover {
  opacity: 1;
}

.notif-nuevo {
  border-left-color: #ef4444;
  background: #fee2e2;
}

.notif-listo {
  border-left-color: #10b981;
  background: #ecfdf5;
}

.notif-pago {
  border-left-color: #f59e0b;
  background: #fef3c7;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .notificaciones-container {
    right: 10px;
    left: 10px;
    top: 70px;
  }
}

</style>
