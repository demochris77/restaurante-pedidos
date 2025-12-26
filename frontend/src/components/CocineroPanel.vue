<template>
  <div class="cocinero-panel">
    <div class="panel-header">
      <h2>👨‍🍳 {{ $t('kitchen.title') }}</h2>
      <div class="header-info">
        <span class="badge" :class="{ 'badge-alert': pedidosNuevos.length > 0 }">
          🆕 {{ pedidosNuevos.length }} {{ $t('kitchen.new_orders') }}
        </span>
        <span class="badge">🍳 {{ mesasEnCocina.length }} {{ $t('kitchen.cooking') }}</span>
        <button @click="actualizarPedidos" class="btn btn-secondary" :disabled="loading">
          🔄
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <template v-else>
        <!-- Pedidos Nuevos -->
        <div class="section">
          <h3>🆕 {{ $t('kitchen.new_orders') }}</h3>
          <div v-if="pedidosNuevos.length === 0" class="empty-state">
            {{ $t('kitchen.empty_new') }}
          </div>
          <div v-else class="pedidos-columns">
            <div v-for="pedido in pedidosNuevos" :key="pedido.id" class="pedido-card">
              <div class="card-header">
                <span class="mesa-num">🪑 {{ $t('common.table') }} {{ pedido.mesa_numero }}</span>
                <span class="mesero-info">👤 {{ pedido.mesero || $t('common.unassigned') }}</span>
                <button
                  @click="iniciarPedido(pedido.id)"
                  class="btn btn-warning btn-small">
                  {{ $t('kitchen.start') }}
                </button>
              </div>
              <div class="items-list">
                <div v-for="item in pedido.items" :key="item.id" class="item-line">
                  <span class="qty">{{ item.cantidad }}x</span>
                  <span class="name">{{ item.nombre }}</span>
                  <!-- ✅ Mostrar notas del item si existen -->
                  <div v-if="item.notas" class="item-nota">
                    📝 {{ item.notas }}
                  </div>
                </div>
              </div>
              <div v-if="pedido.notas" class="notas">📝 {{ pedido.notas }}</div>
            </div>
          </div>
        </div>

        <!-- Pedidos en Preparación (Agrupados por Mesa) -->
        <div class="section">
          <h3>🍳 {{ $t('kitchen.cooking') }}</h3>
          <div v-if="mesasEnCocina.length === 0" class="empty-state">
            {{ $t('kitchen.empty_cooking') }}
          </div>
          <div v-else class="mesas-grid">
            <!-- ✅ NUEVO: Vista colapsable por mesa -->
            <div 
              v-for="mesa in mesasEnCocina" 
              :key="mesa.mesa_numero"
              :class="['mesa-card', { 'mesa-expanded': mesa.expandida }]"
            >
              <div 
                class="mesa-card-header" 
                @click="toggleMesa(mesa.mesa_numero)"
              >
                <div class="mesa-info">
                  <span class="mesa-num">🪑 {{ $t('common.table') }} {{ mesa.mesa_numero }}</span>
                  <span class="items-count">{{ mesa.totalItems }} items</span>
                </div>
                <div class="mesa-estado">
                  <!-- Mostrar tiempo del item más antiguo -->
                  <span class="tiempo-badge">{{ getTiempoMasAntiguo(mesa.items) }}</span>
                  <span class="expand-icon">{{ mesa.expandida ? '▼' : '▶' }}</span>
                </div>
              </div>

              <!-- Contenido expandido -->
              <div v-if="mesa.expandida" class="mesa-card-body">
                <!-- Botón de cerrar -->
                <button @click.stop="toggleMesa(mesa.mesa_numero)" class="btn-close-mesa">
                  ✕ {{ $t('common.close') || 'Cerrar' }}
                </button>

                <!-- Items individuales -->
                <div class="items-list-individual">
                  <div 
                    v-for="item in mesa.items" 
                    :key="item.id"
                    :class="['individual-item', `estado-${item.estado || 'pendiente'}`]"
                  >
                    <div class="item-info-row">
                      <span class="item-nombre">{{ item.nombre }}</span>
                      <div class="item-estado-badge">
                        <span v-if="!item.estado || item.estado === 'pendiente'">⚪ {{ $t('kitchen.item_pending') }}</span>
                        <span v-else-if="item.estado === 'en_preparacion'" class="timer">
                          🟡 {{ getTiempoTranscurrido(item.started_at) }}
                        </span>
                        <span v-else-if="item.estado === 'listo'">🟢 {{ $t('kitchen.item_ready') }}</span>
                        <span v-else-if="item.estado === 'servido'">✅ {{ $t('kitchen.item_served') }}</span>
                      </div>
                    </div>
                    
                    <!-- ✅ NUEVO: Mostrar notas del item durante preparación -->
                    <div v-if="item.notas" class="item-nota-preparacion">
                      📝 {{ item.notas }}
                    </div>
                    
                    <div class="item-actions">
                      <button
                        v-if="!item.estado || item.estado === 'pendiente'"
                        @click="iniciarItem(item.id)"
                        class="btn-item btn-start"
                      >
                        {{ $t('kitchen.start') }}
                      </button>
                      <button
                        v-else-if="item.estado === 'en_preparacion'"
                        @click="completarItem(item.id)"
                        class="btn-item btn-complete"
                      >
                        {{ $t('kitchen.complete') }}
                      </button>
                      <span v-else-if="item.estado === 'listo'" class="waiting-text">
                        {{ $t('kitchen.wait_waiter') }}
                      </span>
                      <span v-else-if="item.estado === 'servido'" class="served-text">
                        ✓ {{ $t('kitchen.item_served') }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Barra de progreso -->
                <div class="progreso-bar">
                  <div class="progreso-fill" :style="{ width: porcentajeMesa(mesa) + '%' }"></div>
                  <span class="progreso-text">{{ porcentajeMesa(mesa) }}%</span>
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
import api from '../api';
import socket from '../socket';

const { notificaciones, cerrarNotificacion } = useNotificaciones('cocinero');

const pedidoStore = usePedidoStore();
const loading = ref(false);
const now = ref(Date.now());
const mesasExpandidas = ref(new Set()); // Track which tables are expanded

const pedidosNuevos = computed(() => pedidoStore.pedidosPorEstado.nuevo || []);

// ✅ NUEVO: Agrupar pedidos en cocina por mesa
const mesasEnCocina = computed(() => {
  const enCocina = pedidoStore.pedidosPorEstado.en_cocina || [];
  const listos = pedidoStore.pedidosPorEstado.listo || [];
  const pedidos = [...enCocina, ...listos];
  
  // Agrupar items por mesa
  const mesasMap = {};
  
  pedidos.forEach(pedido => {
    const mesa_numero = pedido.mesa_numero;
    
    if (!mesasMap[mesa_numero]) {
      mesasMap[mesa_numero] = {
        mesa_numero,
        items: [],
        expandida: mesasExpandidas.value.has(mesa_numero),
        totalItems: 0
      };
    }
    
    // Agregar todos los items del pedido a la mesa
    if (pedido.items) {
      pedido.items.forEach(item => {
        mesasMap[mesa_numero].items.push({
          ...item,
          pedido_id: pedido.id,
          mesero: pedido.mesero
        });
      });
      mesasMap[mesa_numero].totalItems += pedido.items.length;
    }
  });
  
  return Object.values(mesasMap).sort((a, b) => a.mesa_numero - b.mesa_numero);
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

const iniciarItem = async (itemId) => {
  try {
    await api.iniciarItem(itemId);
  } catch (err) {
    console.error('Error iniciando item:', err);
    alert('Error al iniciar item');
  }
};

const completarItem = async (itemId) => {
  try {
    await api.completarItem(itemId);
  } catch (err) {
    console.error('Error completando item:', err);
    alert('Error al completar item');
  }
};

// ✅ NUEVO: Toggle expand/collapse de mesa
const toggleMesa = (mesaNumero) => {
  if (mesasExpandidas.value.has(mesaNumero)) {
    mesasExpandidas.value.delete(mesaNumero);
  } else {
    mesasExpandidas.value.add(mesaNumero);
  }
  // Force reactivity
  mesasExpandidas.value = new Set(mesasExpandidas.value);
};

// Calcular tiempo transcurrido desde que se inició
const getTiempoTranscurrido = (startedAt) => {
  if (!startedAt) return '0min';
  const start = new Date(startedAt).getTime();
  const diffMinutes = Math.floor((now.value - start) / 60000);
  return `${diffMinutes}min`;
};

// ✅ NUEVO: Obtener tiempo del item más antiguo en preparación
const getTiempoMasAntiguo = (items) => {
  const itemsEnPreparacion = items.filter(i => i.estado === 'en_preparacion' && i.started_at);
  if (itemsEnPreparacion.length === 0) return '—';
  
  const masAntiguo = itemsEnPreparacion.reduce((oldest, item) => {
    const itemTime = new Date(item.started_at).getTime();
    const oldestTime = new Date(oldest.started_at).getTime();
    return itemTime < oldestTime ? item : oldest;
  });
  
  return getTiempoTranscurrido(masAntiguo.started_at);
};

// Calcular porcentaje de progreso de la mesa
const porcentajeMesa = (mesa) => {
  const totalItems = mesa.items.length;
  const itemsCompletados = mesa.items.filter(item => 
    item.estado === 'listo' || item.estado === 'servido'
  ).length;
  
  return totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;
};

onMounted(() => {
  actualizarPedidos();
  
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
  const timerInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  
  onUnmounted(() => {
    socket.off('nuevo_pedido');
    socket.off('pedido_actualizado');
    socket.off('item_started');
    socket.off('item_ready');
    socket.off('item_served');
    clearInterval(timerInterval);
  });
});
</script>

<style src="../assets/styles/CocineroPanel.css" scoped></style>
