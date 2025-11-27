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
                <span class="mesero-info">👤 {{ pedido.mesero || 'Sin asignar' }}</span>
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
              <div v-if="pedido.notas" class="notas">📝 {{ pedido.notas }}</div>
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
                <span class="mesero-info">👤 {{ pedido.mesero || 'Sin asignar' }}</span>
              </div>
              
              <!-- Items individuales (ahora cada uno es un registro separado) -->
              <div class="items-list-individual">
                <div 
                  v-for="(item, index) in pedido.items" 
                  :key="item.id"
                  :class="['individual-item', `estado-${item.estado || 'pendiente'}`]"
                >
                  <div class="item-info-row">
                    <span class="item-nombre">{{ item.nombre }}</span>
                    <div class="item-estado-badge">
                      <span v-if="!item.estado || item.estado === 'pendiente'">⚪ Pendiente</span>
                      <span v-else-if="item.estado === 'en_preparacion'" class="timer">
                        🟡 {{ getTiempoTranscurrido(item.started_at) }}
                      </span>
                      <span v-else-if="item.estado === 'listo'">🟢 Listo</span>
                      <span v-else-if="item.estado === 'servido'">✅ Servido</span>
                    </div>
                  </div>
                  
                  <div class="item-actions">
                    <button
                      v-if="!item.estado || item.estado === 'pendiente'"
                      @click="iniciarItem(item.id)"
                      class="btn-item btn-start"
                    >
                      Iniciar
                    </button>
                    <button
                      v-else-if="item.estado === 'en_preparacion'"
                      @click="completarItem(item.id)"
                      class="btn-item btn-complete"
                    >
                      Completar
                    </button>
                    <span v-else-if="item.estado === 'listo'" class="waiting-text">
                      Esperando mesero...
                    </span>
                    <span v-else-if="item.estado === 'servido'" class="served-text">
                      ✓ Servido
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="progreso-bar">
                <div class="progreso-fill" :style="{ width: porcentajePedido(pedido) + '%' }"></div>
                <span class="progreso-text">{{ porcentajePedido(pedido) }}%</span>
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
import api from '../api';
import socket from '../socket';

const { notificaciones, cerrarNotificacion } = useNotificaciones('cocinero');

const pedidoStore = usePedidoStore();
const loading = ref(false);
const now = ref(Date.now()); // Reactive time reference
let autoRefreshInterval = null;
let timerInterval = null;

const pedidosNuevos = computed(() => pedidoStore.pedidosPorEstado.nuevo || []);
const pedidosEnCocina = computed(() => {
    // Mostrar pedidos en_cocina Y listo (hasta que el mesero los marque como servidos)
    const enCocina = pedidoStore.pedidosPorEstado.en_cocina || [];
    const listos = pedidoStore.pedidosPorEstado.listo || [];
    return [...enCocina, ...listos];
});

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

// Ya no necesitamos agrupar - cada item es un registro individual

// Iniciar preparación de un item individual
const iniciarItem = async (itemId) => {
  try {
    await api.iniciarItem(itemId);
    await actualizarPedidos();
  } catch (err) {
    console.error('Error iniciando item:', err);
    alert('Error al iniciar item');
  }
};

// Completar preparación de un item individual
const completarItem = async (itemId) => {
  try {
    await api.completarItem(itemId);
    await actualizarPedidos();
  } catch (err) {
    console.error('Error completando item:', err);
    alert('Error al completar item');
  }
};

// Calcular tiempo transcurrido desde que se inició (usa now.value para reactividad)
const getTiempoTranscurrido = (startedAt) => {
  if (!startedAt) return '0min';
  const start = new Date(startedAt).getTime();
  const diffMinutes = Math.floor((now.value - start) / 60000);
  return `${diffMinutes}min`;
};

// Calcular porcentaje de progreso del pedido
const porcentajePedido = (pedido) => {
  const totalItems = pedido.items.length;
  const itemsCompletados = pedido.items.filter(item => 
    item.estado === 'listo' || item.estado === 'servido'
  ).length;
  
  return totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;
};

onMounted(() => {
  actualizarPedidos();
  
  // Socket listeners para actualizaciones en tiempo real
  if (!socket.connected) socket.connect();
  
  socket.on('nuevo_pedido', () => {
      console.log('🆕 Nuevo pedido recibido en cocina');
      pedidoStore.cargarPedidosActivos();
  });
  
  socket.on('pedido_actualizado', () => {
      console.log('📝 Pedido actualizado en cocina');
      pedidoStore.cargarPedidosActivos();
  });
  
  socket.on('item_started', () => {
      console.log('▶️ Item iniciado');
      pedidoStore.cargarPedidosActivos();
  });
  
  socket.on('item_ready', () => {
      console.log('✅ Item completado');
      pedidoStore.cargarPedidosActivos();
  });
  
  socket.on('item_served', () => {
      console.log('🍽️ Item servido');
      pedidoStore.cargarPedidosActivos();
  });
  
  // Actualizar 'now' cada segundo para timers en tiempo real
  timerInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000); // Cada segundo para actualización fluida
});

onUnmounted(() => {
  socket.off('nuevo_pedido');
  socket.off('pedido_actualizado');
  socket.off('item_started');
  socket.off('item_ready');
  socket.off('item_served');
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<style src="../assets/styles/CocineroPanel.css" scoped></style>
