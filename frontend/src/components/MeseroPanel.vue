<template>
  <div class="mesero-panel">
    <div class="panel-header">
      <h2>📝 Tomar Pedido</h2>
      <div class="header-buttons">
        <button @click="abrirQRMesas" class="btn btn-secondary" style="margin-right: 8px;">
          🖨️ Mesas QRs
        </button>
        <button @click="mostrarQRMenu" class="btn btn-info" style="margin-right: 8px;">
          📱 QR Menú
        </button>
        <button @click="cargarDatos" class="btn btn-secondary" :disabled="loading">
          🔄 Actualizar
        </button>
      </div> 
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading">Cargando datos...</div>

      <template v-else>
        <!-- Notificaciones -->
            <div v-if="notificaciones.length > 0" class="notificaciones-container">
            <div v-for="notif in notificaciones" :key="notif.id" :class="['notificacion', `notif-${notif.tipo}`]">
                {{ notif.titulo }}
                <button @click="cerrarNotificacion(notif.id)" class="btn-cerrar-notif">✕</button>
            </div>
            </div>
 <!-- Selector de Mesa -->
        <div class="section">
          <h3>1️⃣ Selecciona la Mesa</h3>
          <div class="mesas-grid">
            <button
              v-for="mesa in pedidoStore.mesas"
              :key="mesa.numero"
              @click="mesaSeleccionada = mesa.numero"
              :class="['mesa-btn', { 'mesa-active': mesaSeleccionada === mesa.numero }]"
            >
              Mesa {{ mesa.numero }}
            </button>
          </div>
        </div>

        <!-- Selector de Items -->
        <div class="section" v-if="mesaSeleccionada">
          <h3>2️⃣ Selecciona Platos</h3>
          <div class="categorias-tabs">
            <button
              v-for="cat in categorias"
              :key="cat"
              @click="categoriaSeleccionada = cat"
              :class="['tab', { 'tab-active': categoriaSeleccionada === cat }]"
            >
              {{ cat }}
            </button>
          </div>

          <div class="items-grid">
            <div
              v-for="item in itemsPorCategoria"
              :key="item.id"
              :class="['item-card', { 
                'item-disabled': item.estado_inventario === 'no_disponible',
                'item-low-stock': item.estado_inventario === 'poco_stock'
              }]"
              @click="agregarItemAlPedido(item)"
            >
              <div class="item-nombre">{{ item.nombre }}</div>
              <div class="item-precio">${{ item.precio }}</div>
              <div class="item-tiempo">⏱️ {{ item.tiempo_preparacion_min }}min</div>
              
              <!-- Inventory Status -->
              <div v-if="item.usa_inventario && item.stock_actual !== null" class="item-stock">
                📦 Quedan: {{ item.stock_actual }} unidades
              </div>
              
              <div v-if="item.estado_inventario === 'no_disponible'" class="item-agotado">
                ❌ AGOTADO
              </div>
              <div v-else-if="item.estado_inventario === 'poco_stock'" class="item-warning">
                ⚠️ POCO STOCK
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen del Pedido -->
        <div class="section" v-if="pedidoEnProgreso.length > 0">
          <h3>3️⃣ Resumen del Pedido</h3>
          <div class="pedido-summary">
            <div class="summary-item" v-for="(item, idx) in pedidoEnProgreso" :key="idx">
              <div class="item-info">
                <span class="cantidad">{{ item.cantidad }}x</span>
                <span class="nombre">{{ item.nombre }}</span>
              </div>
              <div class="item-acciones">
                <span class="precio">${{ (item.cantidad * item.precio).toFixed(2) }}</span>
                <button @click="removerItem(idx)" class="btn-remove">✕</button>
              </div>
            </div>
          </div>

          <div class="pedido-total">
            <span>Total:</span>
            <span class="total-amount">${{ calcularTotal().toFixed(2) }}</span>
          </div>

          <textarea
            v-model="notasPedido"
            placeholder="Notas especiales (ej: Sin picante, sin tomate...)"
            class="notas-input"
          ></textarea>

          <button
            @click="enviarPedido"
            class="btn btn-primary btn-submit"
            :disabled="!mesaSeleccionada || pedidoEnProgreso.length === 0"
          >
            ✅ Enviar Pedido a Cocina
          </button>
        </div>

        <!-- Items Listos para Servir (Individual) -->
        <div class="section" v-if="misItemsListos.length > 0">
          <h3>🍽️ Items Listos para Servir <span class="badge-count">{{ misItemsListos.length }}</span></h3>
          <div class="items-listos-list">
            <div v-for="itemListo in misItemsListos" :key="itemListo.item_id" class="item-listo-card">
              <div class="item-listo-header">
                <span class="mesa-badge-listo">Mesa {{ itemListo.mesa_numero }}</span>
                <span class="tiempo-listo">
                  Listo hace {{ calcularTiempoDesde(itemListo.tiempoDesdeReady) }}
                </span>
              </div>
              <div class="item-listo-body">
                <div class="item-info">
                  <span class="item-nombre">{{ itemListo.nombre }}</span>
                  <span class="item-cantidad">x{{ itemListo.cantidad_lista }}</span>
                </div>
                <button @click="marcarItemComoServido(itemListo.item_id)" class="btn btn-servir-item">
                  ✅ Marcar como Servido
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pedidos Servidos - Listos para Cobrar -->
        <div class="section" v-if="misPedidosServidos.length > 0">
          <h3>💰 Pedidos Servidos - Listos para Cobrar</h3>
          <div class="pedidos-servidos-list">
            <div v-for="pedido in misPedidosServidos" :key="pedido.id" class="pedido-servido-item">
              <div class="pedido-servido-header">
                <span class="mesa-badge-servido">Mesa {{ pedido.mesa_numero }}</span>
                <span class="total-badge">${{ pedido.total }}</span>
              </div>
              <div class="pedido-servido-detalles">
                <div class="info">
                  <span>{{ pedido.items_count }} items</span>
                </div>
                <button @click="marcarListoPagar(pedido.id)" class="btn btn-pagar">
                  💳 Listo para Pagar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pedidos Activos -->
        <div class="section">
          <h3>📋 Tus Pedidos en Progreso</h3>
          <div v-if="misPedidos.length === 0" class="empty-state">
            No hay pedidos activos
          </div>
          <div v-else class="pedidos-list">
            <div v-for="pedido in misPedidos" :key="pedido.id" class="pedido-item">
              <div class="pedido-header">
                <span class="mesa-badge">Mesa {{ pedido.mesa_numero }}</span>
                <span :class="['estado-badge', `estado-${pedido.estado}`]">
                  {{ pedido.estado.replace('_', ' ').toUpperCase() }}
                </span>
              </div>
              <div class="pedido-detalles">
                <span>{{ pedido.items_count }} items</span>
                <span>${{ pedido.total }}</span>
              </div>
              <div class="pedido-acciones">
                <button 
                  v-if="pedido.estado !== 'listo_pagar'"
                  @click="abrirEditorPedido(pedido)" 
                  class="btn btn-primary btn-small"
                >
                  ✏️ Editar
                </button>
                <button 
                  v-if="['nuevo'].includes(pedido.estado)"
                  @click="cancelarPedido(pedido.id)"
                  class="btn btn-secondary btn-small"
                >
                  ❌ Cancelar
                </button>
                <button @click="mostrarQRCliente(pedido.id)" class="btn btn-secondary btn-small">
                  📱 QR
                </button>
              </div>
            </div>
          </div>
        </div>
  <div v-if="mostrarQR" class="qr-modal-overlay" @click.self="cerrarQR">
    <div class="qr-modal">
        <h3>📱 Escanea para ver el estado</h3>
        <GeneradorQR ref="qrComponent" :valor="urlParaQR" />
        <button @click="cerrarQR" class="btn btn-secondary" style="margin-top:16px;">Cerrar</button>
    </div>
  </div>

  <!-- Modal de Edición de Pedido -->
  <div v-if="mostrarEditorPedido" class="qr-modal-overlay" @click.self="cerrarEditorPedido">
    <div class="editor-pedido-modal">
      <div class="editor-header">
        <h3>✏️ Editar Pedido - Mesa {{ pedidoEditando?.mesa_numero }}</h3>
        <button @click="cerrarEditorPedido" class="btn-cerrar">✕</button>
      </div>

      <!-- Items actuales del pedido -->
      <div class="editor-seccion">
        <h4>Items del Pedido</h4>
        <div v-if="!pedidoEditando?.items?.length" class="empty-state">Sin items</div>
        <div v-else class="items-edicion-list">
          <div v-for="item in pedidoEditando.items" :key="item.id" class="item-edicion">
            <div class="item-edicion-info">
              <span class="item-nombre">{{ item.nombre }}</span>
              <span :class="['estado-badge-small', `estado-${item.estado}`]">{{ item.estado }}</span>
            </div>
            <div class="item-edicion-acciones">
              <span class="item-precio">${{ item.precio_unitario }}</span>
              <button 
                v-if="item.estado === 'pendiente' || item.estado === 'en_preparacion'"
                @click="eliminarItemDelPedido(item)" 
                class="btn-eliminar-item"
                :title="item.estado === 'en_preparacion' ? 'En preparación - se pedirá confirmación' : 'Eliminar item'"
              >
                🗑️
              </button>
              <span v-else class="item-no-editable">🔒</span>
            </div>
          </div>
        </div>
        <div class="editor-total">
          <strong>Total: ${{ pedidoEditando?.total || 0 }}</strong>
        </div>
      </div>

      <!-- Agregar nuevos items -->
      <div class="editor-seccion">
        <h4>➕ Agregar Items</h4>
        <div class="categorias-tabs mini">
          <button
            v-for="cat in categorias"
            :key="cat"
            @click="categoriaEdicion = cat"
            :class="['tab', { 'tab-active': categoriaEdicion === cat }]"
          >
            {{ cat }}
          </button>
        </div>
        <div class="items-agregar-grid">
          <div
            v-for="menuItem in itemsPorCategoriaEdicion"
            :key="menuItem.id"
            :class="['item-agregar', { 'item-disabled': menuItem.estado_inventario === 'no_disponible' }]"
            @click="agregarItemAEdicion(menuItem)"
          >
            <span class="nombre">{{ menuItem.nombre }}</span>
            <span class="precio">${{ menuItem.precio }}</span>
          </div>
        </div>

        <!-- Items pendientes de agregar -->
        <div v-if="itemsParaAgregar.length > 0" class="items-pendientes-agregar">
          <h5>Items a agregar:</h5>
          <div v-for="(item, idx) in itemsParaAgregar" :key="idx" class="item-pendiente">
            <span>{{ item.cantidad }}x {{ item.nombre }} - ${{ (item.cantidad * item.precio_unitario).toFixed(2) }}</span>
            <button @click="quitarItemPendiente(idx)" class="btn-quitar">✕</button>
          </div>
          <button @click="confirmarAgregarItems" class="btn btn-primary" style="width:100%; margin-top:8px;">
            ✅ Confirmar nuevos items
          </button>
        </div>
      </div>
    </div>
  </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useUsuarioStore } from '../stores/usuarioStore';
import { useNotificaciones } from '../composables/useNotificaciones';
import GeneradorQR from './GeneradorQR.vue';
import api from '../api';
import socket from '../socket';
import { useRouter } from 'vue-router'; // 1. Importar useRouter
const { notificaciones, cerrarNotificacion } = useNotificaciones('mesero');

const pedidoStore = usePedidoStore();
const usuarioStore = useUsuarioStore();

const mesaSeleccionada = ref(null);
const categoriaSeleccionada = ref('');
const pedidoEnProgreso = ref([]);
const notasPedido = ref('');
const loading = ref(false);
const qrComponent = ref(null);
const mostrarQR = ref(false);
const urlParaQR = ref('');
const now = ref(Date.now()); // Reactive time for "Listo hace..."
const router = useRouter(); // 2. Instanciar router

// Variables para edición de pedidos
const mostrarEditorPedido = ref(false);
const pedidoEditando = ref(null);
const itemsParaAgregar = ref([]);
const categoriaEdicion = ref('');

// Computed para items del menú en el editor
const itemsPorCategoriaEdicion = computed(() => {
  if (!categoriaEdicion.value) return [];
  return pedidoStore.menu.filter(item => item.categoria === categoriaEdicion.value);
});

const abrirQRMesas = () => {
  // Opción A: Si usas Vue Router con nombre
  const routeData = router.resolve({ name: 'mesas-qr' });
  window.open(routeData.href, '_blank');

  // Opción B: Url directa (Más simple y seguro si no recuerdas el name de la ruta)
  // const url = `${window.location.origin}/mesas-qr`; 
  // window.open(url, '_blank');
};
const mostrarQRCliente = (pedidoId) => {
  const baseUrl = window.location.origin;
  urlParaQR.value = `${baseUrl}/pedido/${pedidoId}/status`;
  mostrarQR.value = true;
};

const mostrarQRMenu = () => {
  const baseUrl = window.location.origin;
  urlParaQR.value = `${baseUrl}/menu`;
  mostrarQR.value = true;
};

const cerrarQR = () => {
    mostrarQR.value = false;
};

const descargarQR = () => {
  if (qrComponent.value && qrComponent.value.qrSrc) {
    const link = document.createElement('a');
    link.href = qrComponent.value.qrSrc;
    link.download = 'qr-pedido.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
const categorias = computed(() => {
  const cats = new Set(pedidoStore.menu.map(item => item.categoria));
  return Array.from(cats).sort();
});

const itemsPorCategoria = computed(() => {
  if (!categoriaSeleccionada.value) return [];
  return pedidoStore.menu.filter(item => item.categoria === categoriaSeleccionada.value);
});

const misPedidos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  return pedidoStore.pedidos.filter(p => String(p.usuario_mesero_id) === String(usuarioStore.usuario.id)  &&
    p.estado !== 'cancelado');
});

const misItemsListos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  
  const _tick = now.value; 
  
  const itemsListos = [];
  
  pedidoStore.pedidos.forEach(pedido => {
    if (String(pedido.usuario_mesero_id) !== String(usuarioStore.usuario.id)) return;
    if (!['nuevo', 'en_cocina', 'listo'].includes(pedido.estado)) return;
    if (!pedido.items) return;
    
    const itemsAgrupados = {};
    
    pedido.items.forEach(item => {
      if (item.estado === 'listo') {
        const key = `${pedido.id}-${item.menu_item_id}`;
        
        // Cálculo en tiempo real usando el reloj del cliente
        let minutosDinámicos = 0;
        if (item.completed_at) {
            const completedTime = new Date(item.completed_at).getTime();
            // Calculamos la diferencia con el reloj actual (_tick)
            minutosDinámicos = Math.floor((_tick - completedTime) / 60000);
        }

        if (!itemsAgrupados[key]) {
          itemsAgrupados[key] = {
            item_id: item.id,
            pedido_id: pedido.id,
            mesa_numero: pedido.mesa_numero,
            nombre: item.nombre,
            cantidad_lista: 0,
            completed_at: item.completed_at,
            // ✅ Usamos el cálculo dinámico en lugar del estático del backend
            tiempoDesdeReady: minutosDinámicos 
          };
        }
        itemsAgrupados[key].cantidad_lista += (item.cantidad || 1);
      }
    });
    
    Object.values(itemsAgrupados).forEach(item => itemsListos.push(item));
  });
  
  return itemsListos.sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
});




const misPedidosServidos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  return pedidoStore.pedidos.filter(
    p => String(p.usuario_mesero_id) === String(usuarioStore.usuario.id) && p.estado === 'servido'
  );
});

const cargarDatos = async () => {
  loading.value = true;
  try {
    console.log('🔄 Cargando datos MeseroPanel...');
    
    await pedidoStore.cargarMenu();
    await pedidoStore.cargarMesas();
    await pedidoStore.cargarPedidosActivos();
    
    if (categorias.value.length > 0) {
      categoriaSeleccionada.value = categorias.value;
    }
  } catch (err) {
    console.error('Error cargando datos:', err);
  } finally {
    loading.value = false;
  }
};

const agregarItemAlPedido = (item) => {
  // No permitir agregar items agotados
  if (item.estado_inventario === 'no_disponible') {
    alert('❌ Este item no está disponible en este momento');
    return;
  }
  
  const existe = pedidoEnProgreso.value.find(i => i.id === item.id);
  
  if (existe) {
    // Si usa inventario, verificar que no exceda el stock
    if (item.usa_inventario && item.stock_actual !== null) {
      if (existe.cantidad >= item.stock_actual) {
        alert(`⚠️ Solo quedan ${item.stock_actual} unidades disponibles`);
        return;
      }
    }
    existe.cantidad++;
  } else {
    pedidoEnProgreso.value.push({
      ...item,
      cantidad: 1,
      menu_item_id: item.id,
      precio_unitario: item.precio
    });
  }
};

const removerItem = (idx) => {
  const item = pedidoEnProgreso.value[idx];
  if (item.cantidad > 1) {
    item.cantidad--;
  } else {
    pedidoEnProgreso.value.splice(idx, 1);
  }
};

const calcularTotal = () => {
  return pedidoEnProgreso.value.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
};

const enviarPedido = async () => {
  try {
    await pedidoStore.crearPedido(
      mesaSeleccionada.value,
      usuarioStore.usuario.id,
      pedidoEnProgreso.value,
      notasPedido.value
    );
    
    // Limpiar estado local y localStorage
    pedidoEnProgreso.value = [];
    mesaSeleccionada.value = null;
    notasPedido.value = '';
    localStorage.removeItem('mesero_pedidoEnProgreso');
    localStorage.removeItem('mesero_mesaSeleccionada');
    localStorage.removeItem('mesero_notasPedido');
    
    alert('✅ Pedido enviado a cocina');
  } catch (err) {
    alert('❌ Error al enviar pedido');
  }
};

const marcarComoServido = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'servido');
    alert('✅ Pedido marcado como servido');
  } catch (err) {
    alert('❌ Error al marcar como servido');
  }
};
const cancelarPedido = async (pedidoId) => {
  const confirmado = confirm(
    '⚠️ ¿Seguro que quieres cancelar este pedido?\n' +
    'No se eliminarán los datos, pero dejará de estar activo.'
  );
  if (!confirmado) return;

  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'cancelado');
    await pedidoStore.cargarPedidosActivos();
    alert('✅ Pedido cancelado');
  } catch (err) {
    console.error(err);
    alert('❌ Error al cancelar pedido');
  }
};

// Marcar item individual como servido
// DESPUÉS (correcta)
const marcarItemComoServido = async (itemId) => {
  try {
    await api.servirItem(itemId);
    // ✅ Solo recarga pedidos, no todo
    await pedidoStore.cargarPedidosActivos();
  } catch (err) {
    console.error('Error marcando item como servido:', err);
    alert('❌ Error al marcar item como servido');
  }
};


// ✅ MODIFICADO: Usar el tiempo calculado por el backend
const calcularTiempoDesde = (minutos) => {
  // Si es null o undefined, no mostrar nada
  if (minutos === null || minutos === undefined) return '';
  
  if (minutos < 1) return 'Ahora';
  if (minutos === 1) return '1 min';
  if (minutos < 60) return `${minutos} min`;
  
  const hours = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${hours}h ${mins}min`;
};



const marcarListoPagar = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'listo_pagar');
    alert('✅ Pedido marcado como listo para pagar');
  } catch (err) {
    alert('❌ Error al marcar pedido');
  }
};

// ============= FUNCIONES DE EDICIÓN DE PEDIDOS =============

const abrirEditorPedido = async (pedido) => {
  try {
    // Cargar detalles completos del pedido
    const response = await api.getPedido(pedido.id);
    pedidoEditando.value = response.data;
    itemsParaAgregar.value = [];
    
    // Seleccionar primera categoría
    if (categorias.value.length > 0) {
      categoriaEdicion.value = categorias.value[0];
    }
    
    mostrarEditorPedido.value = true;
  } catch (err) {
    console.error('Error cargando pedido:', err);
    alert('❌ Error al cargar el pedido');
  }
};

const cerrarEditorPedido = () => {
  mostrarEditorPedido.value = false;
  pedidoEditando.value = null;
  itemsParaAgregar.value = [];
};

const agregarItemAEdicion = (menuItem) => {
  if (menuItem.estado_inventario === 'no_disponible') {
    alert('❌ Este item no está disponible');
    return;
  }
  
  const existe = itemsParaAgregar.value.find(i => i.menu_item_id === menuItem.id);
  
  if (existe) {
    existe.cantidad++;
  } else {
    itemsParaAgregar.value.push({
      menu_item_id: menuItem.id,
      nombre: menuItem.nombre,
      precio_unitario: menuItem.precio,
      cantidad: 1
    });
  }
};

const quitarItemPendiente = (idx) => {
  const item = itemsParaAgregar.value[idx];
  if (item.cantidad > 1) {
    item.cantidad--;
  } else {
    itemsParaAgregar.value.splice(idx, 1);
  }
};

const confirmarAgregarItems = async () => {
  if (itemsParaAgregar.value.length === 0) return;
  
  try {
    await api.agregarItemsAPedido(pedidoEditando.value.id, itemsParaAgregar.value);
    
    // Recargar pedido y datos
    await pedidoStore.cargarPedidosActivos();
    const response = await api.getPedido(pedidoEditando.value.id);
    pedidoEditando.value = response.data;
    itemsParaAgregar.value = [];
    
    alert('✅ Items agregados al pedido');
  } catch (err) {
    console.error('Error agregando items:', err);
    alert('❌ Error: ' + (err.response?.data?.error || 'No se pudieron agregar los items'));
  }
};

const eliminarItemDelPedido = async (item) => {
  const esEnPreparacion = item.estado === 'en_preparacion';
  
  if (esEnPreparacion) {
    const confirmado = confirm(
      `⚠️ "${item.nombre}" ya está en preparación.\n\n` +
      `Eliminarlo causará desperdicio de ingredientes.\n\n` +
      `¿Estás seguro de eliminarlo?`
    );
    if (!confirmado) return;
  }
  
  try {
    await api.eliminarItemDePedido(
      pedidoEditando.value.id, 
      item.id, 
      esEnPreparacion
    );
    
    // Recargar pedido y datos
    await pedidoStore.cargarPedidosActivos();
    const response = await api.getPedido(pedidoEditando.value.id);
    pedidoEditando.value = response.data;
    
    alert(`✅ "${item.nombre}" eliminado del pedido`);
  } catch (err) {
    console.error('Error eliminando item:', err);
    const errorMsg = err.response?.data?.error || 'No se pudo eliminar el item';
    alert('❌ ' + errorMsg);
  }
};

const calcularTiempoEspera = (createdAt) => {
  const creado = new Date(createdAt);
  const diffMs = now.value - creado;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Recién listo';
  if (diffMins === 1) return '1 min';
  return `${diffMins} mins`;
};

// Persistencia de datos local
watch(pedidoEnProgreso, (newVal) => {
  localStorage.setItem('mesero_pedidoEnProgreso', JSON.stringify(newVal));
}, { deep: true });

watch(mesaSeleccionada, (newVal) => {
  if (newVal) localStorage.setItem('mesero_mesaSeleccionada', JSON.stringify(newVal));
  else localStorage.removeItem('mesero_mesaSeleccionada');
});

watch(notasPedido, (newVal) => {
  localStorage.setItem('mesero_notasPedido', newVal);
});

const cargarEstadoLocal = () => {
  const pedidoGuardado = localStorage.getItem('mesero_pedidoEnProgreso');
  if (pedidoGuardado) {
    try {
      pedidoEnProgreso.value = JSON.parse(pedidoGuardado);
    } catch (e) {
      console.error('Error restaurando pedido:', e);
    }
  }

  const mesaGuardada = localStorage.getItem('mesero_mesaSeleccionada');
  if (mesaGuardada) {
    try {
      mesaSeleccionada.value = JSON.parse(mesaGuardada);
    } catch (e) {
      console.error('Error restaurando mesa:', e);
    }
  }

  const notasGuardadas = localStorage.getItem('mesero_notasPedido');
  if (notasGuardadas) {
    notasPedido.value = notasGuardadas;
  }
};

let timerInterval = null;

onMounted(() => {
  cargarDatos();
  cargarEstadoLocal();
  
  if (!socket.connected) socket.connect();

  // Listeners para actualizaciones en tiempo real
  socket.on('item_ready', (data) => {
      // Si el item es para este mesero, solo recargar pedidos (no menú ni mesas)
      if (String(data.mesero_id) === String(usuarioStore.usuario?.id)) {
          console.log('🔔 Item listo para mi mesa:', data.mesa_numero);
          pedidoStore.cargarPedidosActivos(); // Solo recargar pedidos, no todo
      }
  });

  socket.on('pedido_actualizado', ({ id, estado }) => {
      // Solo recargar si el pedido es de este mesero
      const esMiPedido = pedidoStore.pedidos.some(p => 
          p.id === id && String(p.usuario_mesero_id) === String(usuarioStore.usuario?.id)
      );
      
      if (esMiPedido) {
          console.log('📝 Mi pedido actualizado:', id, estado);
          pedidoStore.cargarPedidosActivos(); // Solo recargar pedidos
      }
  });

  socket.on('nuevo_pedido', (pedido) => {
      // Si es un pedido de este mesero, recargar
      if (String(pedido.usuario_mesero_id) === String(usuarioStore.usuario?.id)) {
          console.log('🆕 Mi nuevo pedido creado');
          pedidoStore.cargarPedidosActivos();
      }
  });

  socket.on('solicitar_cuenta', (pedido) => {
      // Si es un pedido de este mesero, recargar
      if (String(pedido.usuario_mesero_id) === String(usuarioStore.usuario?.id)) {
          console.log('💰 Mi pedido solicitado');
          pedidoStore.cargarPedidosActivos();
      }
  });

  // Actualizar 'now' cada segundo para timers en tiempo real
  timerInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000); // Cada segundo para actualización fluida
});

onUnmounted(() => {
    socket.off('item_ready');
    socket.off('item_completed');
    socket.off('pedido_actualizado');
    socket.off('nuevo_pedido');
    socket.off('solicitar_cuenta');
    if (timerInterval) clearInterval(timerInterval);
});
</script>

<style src="../assets/styles/MeseroPanel.css" scoped></style>
<style src="../assets/styles/MeseroEdicion.css" scoped></style>
