<template>
  <div class="mesero-panel">
    <div class="panel-header">
      <h2>📝 {{ $t('waiter.title') }}</h2>
      <div class="header-buttons">
        <button @click="abrirQRMesas" class="btn btn-secondary" style="margin-right: 8px;">
          🖨️ {{ $t('waiter.tables_qr') }}
        </button>
        <button @click="mostrarQRMenu" class="btn btn-info" style="margin-right: 8px;">
          📱 {{ $t('waiter.menu_qr') }}
        </button>
        <button @click="cargarDatos" class="btn btn-secondary" :disabled="loading">
          {{ $t('waiter.update') }}
        </button>
      </div> 
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading">{{ $t('waiter.loading') }}</div>

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
          <h3>{{ $t('waiter.select_table') }}</h3>
          <div class="mesas-grid">
            <button
              v-for="mesa in pedidoStore.mesas"
              :key="mesa.numero"
              @click="toggleMesa(mesa.numero)"
              :class="['mesa-btn', { 'mesa-active': mesaSeleccionada === mesa.numero }]"
            >
              {{ $t('common.table') }} {{ mesa.numero }}
            </button>
          </div>
        </div>

        <!-- Selector de Items -->
        <div class="section" v-if="mesaSeleccionada">
          <h3>{{ $t('waiter.select_dishes') }}</h3>
          <div class="categorias-tabs">
            <button
              v-for="cat in categorias"
              :key="cat"
              @click="toggleCategoria(cat)"
              :class="['tab', { 'tab-active': categoriaSeleccionada === cat }]"
            >
              {{ cat }}
            </button>
          </div>

          <!-- ✅ NUEVO: Buscador de platos -->
          <div class="search-container">
            <input
              v-model="busqueda"
              type="text"
              :placeholder="$t('waiter.search_dishes')"
              class="search-input"
            />
            <button v-if="busqueda" @click="busqueda = ''" class="btn-clear-search">✕</button>
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
              <!-- ✅ NUEVO: Imagen del item -->
              <div v-if="item.image_url" class="item-image">
                <img :src="item.image_url" :alt="item.nombre" />
              </div>
              <div v-else class="item-image-placeholder">
                🍽️
              </div>
              
              <div class="item-nombre">{{ item.nombre }}</div>
              <div class="item-precio">${{ item.precio }}</div>
              <div class="item-tiempo">⏱️ {{ item.tiempo_preparacion_min }}{{ $t('common.min') }}</div>
              
              <!-- Inventory Status -->
              <div v-if="item.usa_inventario && item.stock_actual !== null" class="item-stock">
                📦 Quedan: {{ item.stock_actual }} unidades
              </div>
              
              <div v-if="item.estado_inventario === 'no_disponible'" class="item-agotado">
                ❌ {{ $t('editor.stock.out').toUpperCase() }}
              </div>
              <div v-else-if="item.estado_inventario === 'poco_stock'" class="item-warning">
                ⚠️ {{ $t('editor.stock.low').toUpperCase() }} STOCK
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen del Pedido -->
        <div class="section" v-if="pedidoEnProgreso.length > 0">
          <h3>{{ $t('waiter.order_summary') }}</h3>
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
              
              <!-- ✅ NUEVO: Notas por item (solo para items cocinables) -->
              <div v-if="!item.es_directo" class="item-notas-container">
                <textarea
                  v-model="item.notas"
                  :placeholder="$t('waiter.item_notes_placeholder') || 'Notas para cocina...'"
                  class="item-notas-input"
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="pedido-total">
            <span>{{ $t('waiter.total') }}</span>
            <span class="total-amount">${{ calcularTotal().toFixed(2) }}</span>
          </div>

          <textarea
            v-model="notasPedido"
            :placeholder="$t('waiter.notes_placeholder')"
            class="notas-input"
          ></textarea>

          <button
            @click="enviarPedido"
            class="btn btn-primary btn-submit"
            :disabled="!mesaSeleccionada || pedidoEnProgreso.length === 0 || enviandoPedido"
          >
            {{ enviandoPedido ? $t('common.saving') : $t('waiter.send_to_kitchen') }}
          </button>
        </div>

        <!-- Items Listos para Servir (Individual) -->
        <div class="section" v-if="misItemsListos.length > 0">
          <h3>{{ $t('waiter.items_ready') }} <span class="badge-count">{{ misItemsListos.length }}</span></h3>
          <div class="items-listos-list">
            <div v-for="itemListo in misItemsListos" :key="itemListo.item_id" class="item-listo-card">
              <div class="item-listo-header">
                <span class="mesa-badge-listo">{{ $t('common.table') }} {{ itemListo.mesa_numero }}</span>
                <span class="tiempo-listo">
                  {{ $t('waiter.ready_since') }} {{ calcularTiempoDesde(itemListo.tiempoDesdeReady) }}
                </span>
              </div>
              <div class="item-listo-body">
                <div class="item-info">
                  <span class="item-nombre">{{ itemListo.nombre }}</span>
                  <span class="item-cantidad">x{{ itemListo.cantidad_lista }}</span>
                </div>
                <button @click="marcarItemComoServido(itemListo.item_id)" class="btn btn-servir-item">
                  {{ $t('waiter.mark_served') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pedidos Servidos - Listos para Cobrar -->
        <div class="section" v-if="misPedidosServidos.length > 0">
          <h3>{{ $t('waiter.orders_served') }}</h3>
          <div class="pedidos-servidos-list">
            <div v-for="pedido in misPedidosServidos" :key="pedido.id" class="pedido-servido-item">
              <div class="pedido-servido-header">
                <span class="mesa-badge-servido">{{ $t('common.table') }} {{ pedido.mesa_numero }}</span>
                <span class="total-badge">${{ pedido.total }}</span>
              </div>
              <div class="pedido-servido-detalles">
                <div class="info">
                  <span>{{ pedido.items_count }} items</span>
                </div>
                <div class="btn-group">
                  <button @click="verCuenta(pedido.id)" class="btn btn-secondary btn-small">
                    👁️ {{ $t('waiter.view_bill') }}
                  </button>
                  <button @click="marcarListoPagar(pedido.id)" class="btn btn-pagar">
                    {{ $t('waiter.ready_to_pay') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pedidos Activos -->
        <div class="section">
          <h3>{{ $t('waiter.orders_in_progress') }}</h3>
          <div v-if="misPedidos.length === 0" class="empty-state">
            {{ $t('waiter.no_active_orders') }}
          </div>
          <div v-else class="pedidos-list">
            <div v-for="pedido in misPedidos" :key="pedido.id" class="pedido-item">
              <div class="pedido-header">
                <span class="mesa-badge">{{ $t('common.table') }} {{ pedido.mesa_numero }}</span>
                <span :class="['estado-badge', `estado-${pedido.estado}`]">
                  {{ $t('status.' + pedido.estado) }}
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
                  {{ $t('waiter.edit') }}
                </button>
                <button 
                  v-if="['nuevo', 'en_cocina'].includes(pedido.estado)"
                  @click="cancelarPedido(pedido.id)"
                  class="btn btn-secondary btn-small"
                >
                  {{ $t('waiter.cancel') }}
                </button>
                <button @click="mostrarQRCliente(pedido.id)" class="btn btn-secondary btn-small">
                  {{ $t('waiter.qr') }}
                </button>
              </div>
            </div>
          </div>
        </div>
  <div v-if="mostrarQR" class="qr-modal-overlay" @click.self="cerrarQR">
    <div class="qr-modal">
        <button class="close-btn" @click="cerrarQR">&times;</button>
        <h3>{{ tipoQR === 'menu' ? $t('waiter.menu_qr') : $t('waiter.scan_status') }}</h3>
        <GeneradorQR ref="qrComponent" :valor="urlParaQR" :size="300" :mostrarDescarga="false" />
        
        <div class="qr-actions" style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px; width: 100%;">
            <!-- Botones para QR de Pedido -->
            <template v-if="tipoQR === 'pedido'">
                <a :href="urlParaQR" target="_blank" class="btn btn-primary">
                    👁️ {{ $t('qr_view.view_qr') }}
                </a>
                <button @click="imprimirQR" class="btn btn-secondary">
                    🖨️ {{ $t('qr_view.print') }}
                </button>
            </template>

            <!-- Botones para QR de Menú -->
            <template v-if="tipoQR === 'menu'">
                <a :href="urlParaQR" target="_blank" class="btn btn-primary">
                    📄 {{ $t('editor.menu.view_menu') }}
                </a>
                 <button @click="imprimirQR" class="btn btn-secondary">
                    🖨️ {{ $t('qr_view.print') }}
                </button>
            </template>

            <button @click="cerrarQR" class="btn btn-text-danger" style="margin-top: 8px;">
                {{ $t('common.close') }}
            </button>
        </div>
    </div>
  </div>

  <!-- Modal de Edición de Pedido -->
  <div v-if="mostrarEditorPedido" class="qr-modal-overlay" @click.self="cerrarEditorPedido">
    <div class="editor-pedido-modal">
      <div class="editor-header">
        <h3>{{ $t('waiter.edit_order_title') }} {{ pedidoEditando?.mesa_numero }}</h3>
        <button @click="cerrarEditorPedido" class="btn-cerrar">✕</button>
      </div>

      <!-- Items actuales del pedido -->
      <div class="editor-seccion">
        <h4>{{ $t('waiter.order_items') }}</h4>
        <div v-if="!pedidoEditando?.items?.length" class="empty-state">{{ $t('waiter.no_active_orders') }}</div>
        <div v-else class="items-edicion-list">
          <div v-for="item in pedidoEditando.items" :key="item.id" class="item-edicion">
            <div class="item-edicion-info">
              <span class="item-nombre">{{ item.nombre }}</span>
              <span :class="['estado-badge-small', `estado-${item.estado}`]">{{ $t('status.' + item.estado) }}</span>
            </div>
            <div class="item-edicion-acciones">
              <span class="item-precio">${{ item.precio_unitario }}</span>
              <button 
                v-if="['pendiente','en_preparacion','listo','servido'].includes(item.estado)"
                @click="eliminarItemDelPedido(item)" 
                class="btn-eliminar-item"
                :title="getHintEliminar(item)"
              >
                🗑️
              </button>
              <span v-else class="item-no-editable">🔒</span>

            </div>
          </div>
        </div>
        <div class="editor-total">
          <strong>{{ $t('waiter.total') }} ${{ pedidoEditando?.total || 0 }}</strong>
        </div>
      </div>

      <!-- Agregar nuevos items -->
      <div class="editor-seccion">
        <h4>{{ $t('waiter.add_items') }}</h4>
        <div class="categorias-tabs mini">
          <button
            v-for="cat in categorias"
            :key="cat"
            @click="toggleCategoriaEdicion(cat)"
            :class="['tab', { 'tab-active': categoriaEdicion === cat }]"
          >
            {{ cat }}
          </button>
        </div>
        
        <!-- ✅ NUEVO: Buscador en edición -->
        <div class="search-container">
          <input
            v-model="busquedaEdicion"
            type="text"
            :placeholder="$t('waiter.search_dishes')"
            class="search-input"
          />
          <button v-if="busquedaEdicion" @click="busquedaEdicion = ''" class="btn-clear-search">✕</button>
        </div>
        
        <div class="items-agregar-grid">
          <div
            v-for="menuItem in itemsPorCategoriaEdicion"
            :key="menuItem.id"
            :class="['item-agregar', { 
              'item-disabled': menuItem.estado_inventario === 'no_disponible',
              'item-low-stock': menuItem.estado_inventario === 'poco_stock'
            }]"
            @click="agregarItemAEdicion(menuItem)"
          >
            <span class="nombre">{{ menuItem.nombre }}</span>
            <span class="precio">${{ menuItem.precio }}</span>
            
            <!-- ✅ NUEVO: Stock status -->
            <div v-if="menuItem.usa_inventario && menuItem.stock_actual !== null" class="item-stock-mini">
              📦 {{ menuItem.stock_actual }}
            </div>
            <div v-if="menuItem.estado_inventario === 'no_disponible'" class="item-agotado-mini">
              ❌ AGOTADO
            </div>
            <div v-else-if="menuItem.estado_inventario === 'poco_stock'" class="item-warning-mini">
              ⚠️ BAJO
            </div>
          </div>
        </div>

        <!-- Items pendientes de agregar -->
        <div v-if="itemsParaAgregar.length > 0" class="items-pendientes-agregar">
          <h5>{{ $t('waiter.items_to_add') }}</h5>
          <div v-for="(item, idx) in itemsParaAgregar" :key="idx" class="item-pendiente">
            <span>{{ item.cantidad }}x {{ item.nombre }} - ${{ (item.cantidad * item.precio_unitario).toFixed(2) }}</span>
            <button @click="quitarItemPendiente(idx)" class="btn-quitar">✕</button>
          </div>
          <button 
            @click="confirmarAgregarItems" 
            class="btn btn-primary" 
            style="width:100%; margin-top:8px;"
            :disabled="agregandoItems"
          >
            {{ agregandoItems ? $t('common.saving') : $t('waiter.confirm_new_items') }}
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
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { notificaciones, cerrarNotificacion } = useNotificaciones('mesero');

const pedidoStore = usePedidoStore();
const usuarioStore = useUsuarioStore();

const mesaSeleccionada = ref(null);
const categoriaSeleccionada = ref('');
const pedidoEnProgreso = ref([]);
const notasPedido = ref('');
const loading = ref(false);
const busqueda = ref(''); // ✅ NUEVO: Search query
const enviandoPedido = ref(false); // ✅ NUEVO: Loading state for sending order
const agregandoItems = ref(false); // ✅ NUEVO: Loading state for adding items
const qrComponent = ref(null);
const mostrarQR = ref(false);
const urlParaQR = ref('');
const now = ref(Date.now()); 
const router = useRouter(); 

// Variables para edición de pedidos
const mostrarEditorPedido = ref(false);
const pedidoEditando = ref(null);
const itemsParaAgregar = ref([]);
const categoriaEdicion = ref('');
const busquedaEdicion = ref(''); // ✅ NUEVO: Search en edición

// Computed para items del menú en el editor
const itemsPorCategoriaEdicion = computed(() => {
  // ✅ NUEVO: Don't show items if no category and no search
  if (!categoriaEdicion.value && !busquedaEdicion.value) {
    return [];
  }
  
  let items = pedidoStore.menu;
  
  // Filter by category
  if (categoriaEdicion.value) {
    items = items.filter(item => item.categoria === categoriaEdicion.value);
  }
  
  // ✅ NUEVO: Filter by search
  if (busquedaEdicion.value) {
    const query = busquedaEdicion.value.toLowerCase();
    items = items.filter(item =>
      item.nombre.toLowerCase().includes(query) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(query))
    );
  }
  
  return items;
});

const getHintEliminar = (item) => {
  // Simple hint logic, can be improved with i18n if needed
  return t('waiter.edit');
};

const toggleMesa = (numero) => {
  if (mesaSeleccionada.value === numero) {
    mesaSeleccionada.value = null;
    categoriaSeleccionada.value = '';
    busqueda.value = ''; // ✅ NUEVO: Clear search
  } else {
    mesaSeleccionada.value = numero;
    categoriaSeleccionada.value = '';
    busqueda.value = ''; // ✅ NUEVO: Clear search
  }
};

const toggleCategoria = (cat) => {
  if (categoriaSeleccionada.value === cat) {
    categoriaSeleccionada.value = '';
  } else {
    categoriaSeleccionada.value = cat;
  }
};

// ✅ NUEVO: Toggle category in editor
const toggleCategoriaEdicion = (cat) => {
  if (categoriaEdicion.value === cat) {
    categoriaEdicion.value = '';
  } else {
    categoriaEdicion.value = cat;
  }
};


  
const abrirQRMesas = () => {
  const routeData = router.resolve({ name: 'mesas-qr' });
  window.open(routeData.href, '_blank');
};
const tipoQR = ref('pedido'); // 'pedido' | 'menu'

const mostrarQRCliente = (pedidoId) => {
  const baseUrl = window.location.origin;
  urlParaQR.value = `${baseUrl}/pedido/${pedidoId}/status`;
  tipoQR.value = 'pedido';
  mostrarQR.value = true;
};

const mostrarQRMenu = () => {
  const baseUrl = window.location.origin;
  urlParaQR.value = `${baseUrl}/menu`;
  tipoQR.value = 'menu';
  mostrarQR.value = true;
};

const cerrarQR = () => {
    mostrarQR.value = false;
};

const imprimirQR = () => {
    if (!qrComponent.value || !qrComponent.value.qrSrc) return;
    
    // Abrir ventana de impresión limpia
    const win = window.open('', '_blank', 'width=600,height=600');
    win.document.write(`
        <html>
            <head>
                <title>Imprimir QR</title>
                <style>
                    body { 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        min-height: 100vh; 
                        margin: 0; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    }
                    img { max-width: 400px; height: auto; margin: 20px 0; }
                    h2 { margin: 0; padding: 20px; text-align: center; }
                    .qr-modal h3 {
  margin-top: 0;
  color: #1f2937;
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.btn-text-danger {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 8px;
  text-decoration: underline;
  transition: color 0.2s;
}

.btn-text-danger:hover {
  color: #dc2626;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  gap: 0.5rem;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-secondary {
  background-color: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}                 @media print { 
                        button { display: none; } 
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <h2>${tipoQR.value === 'menu' ? t('waiter.menu_qr') : t('waiter.scan_status')}</h2>
                <img src="${qrComponent.value.qrSrc}" />
                <p class="note">${urlParaQR.value}</p>
                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
        </html>
    `);
    win.document.close();
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
  // ✅ NUEVO: Don't show items if no category selected and no search query
  if (!categoriaSeleccionada.value && !busqueda.value) {
    return [];
  }
  
  let items = pedidoStore.menu;
  
  // Filter by category if selected
  if (categoriaSeleccionada.value) {
    items = items.filter(item => item.categoria === categoriaSeleccionada.value);
  }
  
  // ✅ NUEVO: Filter by search query
  if (busqueda.value) {
    const query = busqueda.value.toLowerCase();
    items = items.filter(item => 
      item.nombre.toLowerCase().includes(query) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(query))
    );
  }
  
  return items;
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
    alert(t('waiter.alert_item_unavailable'));
    return;
  }
  
  const existe = pedidoEnProgreso.value.find(i => i.id === item.id);
  
  if (existe) {
    // Si usa inventario, verificar que no exceda el stock
    if (item.usa_inventario && item.stock_actual !== null) {
      if (existe.cantidad >= item.stock_actual) {
        alert(t('waiter.alert_stock_low', { count: item.stock_actual }));
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
  // ✅ NUEVO: Confirmation dialog
  const confirmado = confirm(t('waiter.confirm_send_order'));
  if (!confirmado) return;
  
  enviandoPedido.value = true;
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
    busqueda.value = ''; // ✅ NUEVO: Clear search
    localStorage.removeItem('mesero_pedidoEnProgreso');
    localStorage.removeItem('mesero_mesaSeleccionada');
    localStorage.removeItem('mesero_notasPedido');
    
    alert(t('waiter.alert_order_sent'));
  } catch (err) {
    alert(t('waiter.alert_error_sending'));
  } finally {
    enviandoPedido.value = false;
  }
};

const marcarComoServido = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'servido');
    alert(t('waiter.alert_marked_served'));
  } catch (err) {
    alert(t('common.error'));
  }
};
const cancelarPedido = async (pedidoId) => {
  const confirmado = confirm(t('waiter.confirm_cancel'));
  if (!confirmado) return;

  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'cancelado');
    await pedidoStore.cargarPedidosActivos();
    alert(t('waiter.alert_cancelled'));
  } catch (err) {
    console.error(err);
    alert(t('common.error'));
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
    alert(t('common.error'));
  }
};


// ✅ MODIFICADO: Usar el tiempo calculado por el backend
const calcularTiempoDesde = (minutos) => {
  // Si es null o undefined, no mostrar nada
  if (minutos === null || minutos === undefined) return '';
  
  if (minutos < 1) return t('common.now') || 'Ahora';
  if (minutos === 1) return `1 ${t('common.min') || 'min'}`;
  if (minutos < 60) return `${minutos} ${t('common.min') || 'min'}`;
  
  const hours = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${hours}h ${mins}min`;
};



const marcarListoPagar = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'listo_pagar');
    alert(t('waiter.alert_marked_pay_ready'));
  } catch (err) {
    alert(t('common.error'));
  }
};

// ✅ NUEVO: Ver cuenta online
const verCuenta = (pedidoId) => {
  const baseUrl = window.location.origin;
  window.open(`${baseUrl}/cuenta/${pedidoId}`, '_blank');
};

// ============= FUNCIONES DE EDICIÓN DE PEDIDOS =============

const abrirEditorPedido = async (pedido) => {
  try {
    // Cargar detalles completos del pedido
    const response = await api.getPedido(pedido.id);
    pedidoEditando.value = response.data;
    itemsParaAgregar.value = [];
    
    // ✅ NUEVO: No seleccionar categoría automáticamente (empezar con todas cerradas)
    categoriaEdicion.value = '';
    busquedaEdicion.value = '';
    
    mostrarEditorPedido.value = true;
  } catch (err) {
    console.error('Error cargando pedido:', err);
    alert(t('common.error'));
  }
};

const cerrarEditorPedido = () => {
  mostrarEditorPedido.value = false;
  pedidoEditando.value = null;
  itemsParaAgregar.value = [];
  busquedaEdicion.value = ''; // ✅ NUEVO: Clear search
};

const agregarItemAEdicion = (menuItem) => {
  if (menuItem.estado_inventario === 'no_disponible') {
    alert(t('waiter.alert_item_unavailable'));
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
  
  // ✅ NUEVO: Confirmation dialog
  const confirmado = confirm(t('waiter.confirm_add_items'));
  if (!confirmado) return;
  
  agregandoItems.value = true;
  try {
    await api.agregarItemsAPedido(pedidoEditando.value.id, itemsParaAgregar.value);
    
    // Recargar pedido para ver cambios
    const response = await api.getPedido(pedidoEditando.value.id);
    pedidoEditando.value = response.data;
    
    // Limpiar items pendientes y search
    itemsParaAgregar.value = [];
    busquedaEdicion.value = '';
    
    // Recargar pedidos activos en el store
    await pedidoStore.cargarPedidosActivos();
    
    alert(t('waiter.alert_items_added'));
  } catch (err) {
    console.error('Error agregando items:', err);
    alert(t('common.error'));
  } finally {
    agregandoItems.value = false;
  }
};

const eliminarItemDelPedido = async (item) => {
  const intentoEliminar = async (forzar = false) => {
    await api.eliminarItemDePedido(
      pedidoEditando.value.id,
      item.id,
      forzar 
    );

    await pedidoStore.cargarPedidosActivos();
    const response = await api.getPedido(pedidoEditando.value.id);
    pedidoEditando.value = response.data;

    alert(t('waiter.item_added', { name: item.nombre }));
  };

  try {
    await intentoEliminar(false);
  } catch (err) {
    const data = err.response?.data;

    // Caso: backend pide confirmación (en_preparacion, listo, servido)
    if (data?.requiereConfirmacion) {
      const ok = confirm(data.mensaje || data.error || t('common.are_you_sure'));
      if (!ok) return;

      try {
        await intentoEliminar(true);
      } catch (err2) {
        const msg2 = err2.response?.data?.error || t('common.error');
        alert('❌ ' + msg2);
      }
    } else {
      const msg = data?.error || t('common.error');
      alert('❌ ' + msg);
    }
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

<style scoped>
/* Fix for QR Modal Close Button */
.qr-modal {
  position: relative !important; /* Ensure absolute positioning works for children */
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  line-height: 1;
  z-index: 10;
}

.close-btn:hover {
  color: #ef4444;
}
</style>
