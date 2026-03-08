<template>
  <div class="cocinero-panel">
    <div class="panel-header">
      <div class="header-left">
        <div class="icon-wrapper">
          <ChefHat :size="32" class="text-primary" />
        </div>
        <h2>{{ $t('kitchen.title') }}</h2>
      </div>
      
      <div class="header-actions">
        <!-- Badges -->
        <div class="stats-group">
          <div class="stat-badge" :class="{ 'active': pedidosNuevos.length > 0 }">
            <span class="stat-label">
              <Bell :size="16" /> {{ $t('kitchen.new_orders') }}
            </span>
            <span class="stat-value">{{ pedidosNuevos.length }}</span>
          </div>
          
          <div class="stat-badge info">
            <span class="stat-label">
              <Flame :size="16" /> {{ $t('kitchen.cooking') }}
            </span>
            <span class="stat-value">{{ mesasEnCocina.length }}</span>
          </div>
        </div>

        <button @click="actualizarPedidos" class="btn-refresh" :disabled="loading" :class="{ 'spinning': loading }">
          <RefreshCw :size="20" />
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="loading && !pedidosNuevos.length && !mesasEnCocina.length" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('common.loading') }}</p>
      </div>

      <template v-else>
        <!-- Pedidos Nuevos -->
        <div class="section new-orders-section">
          <div class="section-header">
            <h3>
              <BellRing :size="24" class="text-warning" />
              {{ $t('kitchen.new_orders') }}
            </h3>
          </div>
          
          <div v-if="pedidosNuevos.length === 0" class="empty-state">
            <Inbox :size="48" />
            <p>{{ $t('kitchen.empty_new') }}</p>
          </div>
          
          <div v-else class="pedidos-grid">
            <div v-for="pedido in pedidosNuevos" :key="pedido.id" class="pedido-card new-order">
              <div class="card-header">
                <div class="header-info">
                  <span class="table-badge">
                    <Hash :size="14" /> {{ $t('common.table') }} {{ pedido.mesa_numero }}
                  </span>
                  <span class="waiter-info">
                    <User :size="14" /> {{ pedido.mesero || $t('common.unassigned') }}
                  </span>
                </div>
                <div class="header-actions-col">
                  <button
                    @click="iniciarPedido(pedido.id)"
                    class="btn-receive-order">
                    {{ $t('kitchen.receive') }} <Inbox :size="16" />
                  </button>
                  <button
                    @click="iniciarTodoPedido(pedido)"
                    class="btn-start-order success">
                    {{ $t('kitchen.start_all') }} <Play :size="16" />
                  </button>
                </div>
              </div>
              
              <div class="items-list">
                <div v-for="grupo in agruparItems(pedido.items, 'nuevo-' + pedido.id)" :key="grupo.nombre" class="item-group-wrapper">
                  <div 
                    class="item-row group-header" 
                    :class="{ 'has-expand': grupo.items.length > 1 || grupo.tieneNotas }"
                    @click="grupo.items.length > 1 || grupo.tieneNotas ? toggleGrupo('nuevo-' + pedido.id, grupo.nombre) : null"
                  >
                    <div class="qty-badge">{{ grupo.cantidad }}x</div>
                    <div class="item-details">
                      <span class="item-name">{{ grupo.nombre }}</span>
                      <div v-if="!estaGrupoExpandido('nuevo-' + pedido.id, grupo.nombre) && grupo.tieneNotas" class="item-note-preview">
                        <FileText :size="12" /> {{ $t('kitchen.has_notes') || 'Ver notas' }}
                      </div>
                    </div>
                    <ChevronDown v-if="grupo.items.length > 1 || grupo.tieneNotas" :size="16" class="expand-icon" :class="{ 'rotated': estaGrupoExpandido('nuevo-' + pedido.id, grupo.nombre) }" />
                  </div>
                  
                  <div v-if="estaGrupoExpandido('nuevo-' + pedido.id, grupo.nombre)" class="sub-items-list">
                    <div v-for="(subItem, sIdx) in grupo.items" :key="subItem.id || sIdx" class="sub-item-row">
                      <div class="sub-item-bullet"></div>
                      <div class="sub-item-content">
                        <div v-if="subItem.notas" class="item-note">
                          <FileText :size="12" /> {{ subItem.notas }}
                        </div>
                        <div v-else class="item-note-empty">
                          {{ $t('kitchen.no_notes') || 'Sin notas' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-if="pedido.notas" class="order-note">
                <strong>{{ $t('customer.notes') }}:</strong> {{ pedido.notas }}
              </div>
            </div>
          </div>
        </div>

        <!-- Pedidos en Preparación (Agrupados por Mesa) -->
        <div class="section cooking-section">
          <div class="section-header">
            <h3>
              <UtensilsCrossed :size="24" class="text-primary" />
              {{ $t('kitchen.cooking') }}
            </h3>
          </div>
          
          <div v-if="mesasEnCocina.length === 0" class="empty-state">
            <CookingPot :size="48" />
            <p>{{ $t('kitchen.empty_cooking') }}</p>
          </div>
          
          <div v-else class="mesas-grid">
            <div 
              v-for="mesa in mesasEnCocina" 
              :key="mesa.mesa_numero"
              :class="['mesa-card', { 'expanded': mesa.expandida }]"
            >
              <div 
                class="mesa-header" 
                @click="toggleMesa(mesa.mesa_numero)"
              >
                <div class="mesa-main-info">
                  <div class="mesa-badge">
                    <span class="label">{{ $t('common.table') }}</span>
                    <span class="number">{{ mesa.mesa_numero }}</span>
                  </div>
                  <div class="mesa-meta">
                    <span class="meta-item">
                       <User :size="14" /> {{ mesa.mesero || 'Sin mesero' }}
                    </span>
                    <span class="meta-item">
                      <Layers :size="14" /> {{ mesa.totalItems }} items
                    </span>
                    <span class="meta-item time-badge warning">
                      <Clock :size="14" /> {{ getTiempoMasAntiguo(mesa.items) }}
                    </span>
                  </div>
                </div>
                
                <div class="progress-preview">
                   <div class="mini-progress">
                      <div class="bar" :style="{ width: porcentajeMesa(mesa) + '%' }"></div>
                   </div>
                   <span class="percent">{{ porcentajeMesa(mesa) }}%</span>
                   <ChevronDown :size="20" class="arrow-icon" />
                </div>
              </div>

              <!-- Quick Actions for Table -->
              <div v-if="mesa.expandida" class="mesa-quick-actions">
                 <button 
                    v-if="tieneItemsPendientes(mesa)"
                    @click.stop="iniciarMesa(mesa)"
                    class="btn-quick-action start"
                 >
                    <Play :size="16" /> {{ $t('kitchen.start_all') }}
                 </button>
                 <button 
                    v-if="tieneItemsEnPreparacion(mesa)"
                    @click.stop="completarMesa(mesa)"
                    class="btn-quick-action complete"
                 >
                    <CheckCircle2 :size="16" /> {{ $t('kitchen.complete_all') }}
                 </button>
              </div>

              <!-- Contenido expandido -->
              <div v-if="mesa.expandida" class="mesa-body">
                <div class="mesa-items-container">
                  <div v-for="grupo in agruparItems(mesa.items, 'mesa-' + mesa.mesa_numero)" :key="grupo.nombre" class="kitchen-group-wrapper">
                    <div 
                      class="kitchen-item-group-header" 
                      :class="{ 'expanded': estaGrupoExpandido('mesa-' + mesa.mesa_numero, grupo.nombre) }"
                      @click="toggleGrupo('mesa-' + mesa.mesa_numero, grupo.nombre)"
                    >
                      <div class="group-main-info">
                        <span class="item-qty">{{ grupo.cantidad }}x</span>
                        <span class="item-title">{{ grupo.nombre }}</span>
                        <div v-if="!estaGrupoExpandido('mesa-' + mesa.mesa_numero, grupo.nombre) && grupo.tieneNotas" class="group-note-indicator">
                          <FileText :size="12" />
                        </div>
                      </div>
                      <div class="group-actions-preview">
                        <div class="group-status-summary">
                          <!-- Show small status dots or similar? For now just chevron -->
                        </div>
                        <ChevronDown :size="18" class="expand-icon" :class="{ 'rotated': estaGrupoExpandido('mesa-' + mesa.mesa_numero, grupo.nombre) }" />
                      </div>
                    </div>

                    <div v-if="estaGrupoExpandido('mesa-' + mesa.mesa_numero, grupo.nombre)" class="group-details">
                      <div 
                        v-for="item in grupo.items" 
                        :key="item.id"
                        :class="['kitchen-item', item.estado || 'pendiente']"
                      >
                        <div class="item-content">
                          <div class="item-header-row">
                            <span class="item-qty">{{ item.cantidad }}x</span>
                            <span class="item-title">{{ item.nombre }}</span>
                            
                            <div class="item-status-pill" :class="item.estado || 'pendiente'">
                              <template v-if="!item.estado || item.estado === 'pendiente'">
                                 <CircleDashed :size="12" /> {{ $t('kitchen.item_pending') }}
                              </template>
                              <template v-else-if="item.estado === 'en_preparacion'">
                                 <Timer :size="12" /> {{ getTiempoTranscurrido(item.started_at) }}
                              </template>
                              <template v-else-if="item.estado === 'listo'">
                                 <CheckCircle2 :size="12" /> {{ $t('kitchen.item_ready') }}
                              </template>
                              <template v-else-if="item.estado === 'servido'">
                                 <CheckCheck :size="12" /> {{ $t('kitchen.item_served') }}
                              </template>
                            </div>
                          </div>
                          
                          <div v-if="item.notas" class="item-note-highlight">
                            <FileText :size="14" /> {{ item.notas }}
                          </div>
                        </div>
                        
                        <div class="item-actions">
                          <button
                            v-if="!item.estado || item.estado === 'pendiente'"
                            @click.stop="iniciarItem(item.id)"
                            class="btn-action start"
                          >
                            {{ $t('kitchen.start') }}
                          </button>
                          
                          <button
                            v-else-if="item.estado === 'en_preparacion'"
                            @click.stop="completarItem(item.id)"
                            class="btn-action complete"
                          >
                            {{ $t('kitchen.complete') }}
                          </button>
                          
                          <div v-else-if="item.estado === 'listo'" class="status-text ready">
                            {{ $t('kitchen.wait_waiter') }}
                          </div>
                          
                          <div v-else-if="item.estado === 'servido'" class="status-text served">
                            <CheckCheck :size="16" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="mesa-footer">
                   <button @click.stop="toggleMesa(mesa.mesa_numero)" class="btn-secondary small">
                    <ChevronUp :size="16" /> {{ $t('common.close') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Confirmation Modal for Batch Actions -->
  <div v-if="mostrarConfirmacionBatch" class="modal-overlay" @click.self="mostrarConfirmacionBatch = false">
    <div class="modal-content small-modal">
      <div class="modal-header-clean">
        <h3>{{ confirmacionBatchTitulo }}</h3>
        <button @click="mostrarConfirmacionBatch = false" class="btn-close-clean"><X :size="20" /></button>
      </div>
      
      <div class="modal-body-clean">
        <p class="confirm-message">{{ confirmacionBatchMensaje }}</p>
        
        <div class="modal-actions-row">
          <button @click="mostrarConfirmacionBatch = false" class="btn-secondary-action large">
            {{ $t('common.cancel') }}
          </button>
          <button @click="confirmarAccionBatch" class="btn-primary-action large success">
            {{ $t('common.yes') }} <CheckCircle2 :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useNotificaciones } from '../composables/useNotificaciones';
import { useI18n } from 'vue-i18n';
import api from '../api';
import socket from '../socket';
import { 
  ChefHat, RefreshCw, Bell, Flame, BellRing, Inbox, Hash, User, 
  Play, FileText, UtensilsCrossed, CookingPot, Layers, Clock, 
  ChevronDown, ChevronUp, CircleDashed, Timer, CheckCircle2, CheckCheck, X
} from 'lucide-vue-next';

const { t } = useI18n();
const { notificaciones, cerrarNotificacion } = useNotificaciones('cocinero');

const pedidoStore = usePedidoStore();
const loading = ref(false);
const now = ref(Date.now());
const mesasExpandidas = ref(new Set()); // Track which tables are expanded
const gruposExpandidos = ref(new Set()); // Track which grouped items are expanded (key: scopeId + '-' + nombre)

const toggleGrupo = (scopeId, itemNombre) => {
  const key = `${scopeId}-${itemNombre}`;
  if (gruposExpandidos.value.has(key)) {
    gruposExpandidos.value.delete(key);
  } else {
    gruposExpandidos.value.add(key);
  }
  gruposExpandidos.value = new Set(gruposExpandidos.value);
};

const estaGrupoExpandido = (scopeId, itemNombre) => {
  return gruposExpandidos.value.has(`${scopeId}-${itemNombre}`);
};

const agruparItems = (items, scopeId) => {
  if (!items) return [];
  const grupos = {};
  items.forEach(item => {
    const key = item.nombre;
    if (!grupos[key]) {
      grupos[key] = {
        nombre: item.nombre,
        cantidad: 0,
        items: [],
        tieneNotas: false
      };
    }
    grupos[key].cantidad += item.cantidad || 1;
    grupos[key].items.push(item);
    if (item.notas) grupos[key].tieneNotas = true;
  });
  
  return Object.values(grupos);
};

// Batch confirmation modal
const mostrarConfirmacionBatch = ref(false);
const confirmacionBatchTitulo = ref('');
const confirmacionBatchMensaje = ref('');
const accionBatchPendiente = ref(null);

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
        totalItems: 0,
        mesero: pedido.mesero // Capture waiter name from first order
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

const iniciarTodoPedido = async (pedido) => {
  if (!pedido.items || pedido.items.length === 0) return;

  // Filter items that are already processed
  const itemsPendientes = pedido.items.filter(i => !['listo', 'servido', 'cancelado', 'en_preparacion'].includes(i.estado));
  
  if (itemsPendientes.length === 0) {
    // If all items are already in progress or done, just ensure order is in kitchen
    try {
        if (pedido.estado === 'nuevo') {
            await pedidoStore.actualizarEstadoPedido(pedido.id, 'en_cocina');
        }
    } catch (e) {
        console.error(e);
    }
    return;
  }

  const itemIds = itemsPendientes.map(i => i.id);
  loading.value = true;
  
  try {
    // 1. Mover el pedido a "en_cocina"
    await pedidoStore.actualizarEstadoPedido(pedido.id, 'en_cocina');
    
    // 2. Iniciar todos los items (Server batch)
    await api.iniciarItemsBatch(itemIds);
    
    setTimeout(() => {
        pedidoStore.cargarPedidosActivos();
    }, 500);
    
  } catch (err) {
    console.error('Error starting all:', err);
    alert('Error al iniciar todo el pedido');
  } finally {
    loading.value = false;
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

const completadoBatch = ref(false);

const completarItem = async (itemId) => {
  try {
    await api.completarItem(itemId);
  } catch (err) {
    console.error('Error completando item:', err);
    alert('Error al completar item');
  }
};

// ✅ NUEVO: Batch Actions
const tieneItemsPendientes = (mesa) => {
  return mesa.items.some(i => !i.estado || i.estado === 'pendiente');
};

const tieneItemsEnPreparacion = (mesa) => {
  return mesa.items.some(i => i.estado === 'en_preparacion');
};

const iniciarMesa = async (mesa) => {
  console.log('🔘 iniciarMesa clicked for mesa:', mesa);
  
  const itemsPendientes = mesa.items
    .filter(i => !i.estado || i.estado === 'pendiente');
    
  if (itemsPendientes.length === 0) {
    console.warn('⚠️ No hay items pendientes para iniciar');
    return;
  }

  // Show custom confirmation modal
  confirmacionBatchTitulo.value = t('kitchen.start_all');
  confirmacionBatchMensaje.value = t('kitchen.confirm_start_all', { count: itemsPendientes.length, table: mesa.mesa_numero });
  accionBatchPendiente.value = async () => {
    const itemIds = itemsPendientes.map(i => i.id);
    loading.value = true;
    
    try {
      console.log('🚀 Calling api.iniciarItemsBatch with:', itemIds);
      const response = await api.iniciarItemsBatch(itemIds);
      console.log('✅ Batch start success, response:', response);
      setTimeout(() => {
          pedidoStore.cargarPedidosActivos();
      }, 500);
    } catch (err) {
      console.error('❌ Error batch start:', err);
      alert('Error al iniciar algunos items');
    } finally {
      loading.value = false;
    }
  };
  mostrarConfirmacionBatch.value = true;
};

const completarMesa = async (mesa) => {
   console.log('🔘 completarMesa clicked for mesa:', mesa);
   
   const itemsEnPrep = mesa.items
    .filter(i => i.estado === 'en_preparacion');

   if (itemsEnPrep.length === 0) {
     console.warn('⚠️ No hay items en preparación para completar');
     return;
   }

   // Show custom confirmation modal
   confirmacionBatchTitulo.value = t('kitchen.complete_all');
   confirmacionBatchMensaje.value = t('kitchen.confirm_complete_all', { count: itemsEnPrep.length, table: mesa.mesa_numero });
   accionBatchPendiente.value = async () => {
     const itemIds = itemsEnPrep.map(i => i.id);
     loading.value = true;
     
     try {
       console.log('🚀 Calling api.completarItemsBatch with:', itemIds);
       const response = await api.completarItemsBatch(itemIds);
       console.log('✅ Batch complete success, response:', response);
       setTimeout(() => {
          pedidoStore.cargarPedidosActivos();
       }, 500);
     } catch (err) {
       console.error('❌ Error batch complete:', err);
       alert('Error al completar algunos items');
     } finally {
       loading.value = false;
     }
   };
   mostrarConfirmacionBatch.value = true;
};

const confirmarAccionBatch = async () => {
  mostrarConfirmacionBatch.value = false;
  if (accionBatchPendiente.value) {
    await accionBatchPendiente.value();
    accionBatchPendiente.value = null;
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
