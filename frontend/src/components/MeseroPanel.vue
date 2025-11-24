<template>
  <div class="mesero-panel">
    <div class="panel-header">
      <h2>📝 Tomar Pedido</h2>
      <div class="header-buttons">
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
              class="item-card"
              @click="agregarItemAlPedido(item)"
            >
              <div class="item-nombre">{{ item.nombre }}</div>
              <div class="item-precio">${{ item.precio }}</div>
              <div class="item-tiempo">⏱️ {{ item.tiempo_preparacion_min }}min</div>
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

        <!-- Pedidos Listos para Servir -->
        <div class="section" v-if="misPedidosListos.length > 0">
          <h3>🔔 Pedidos Listos para Servir</h3>
          <div class="pedidos-listos-list">
            <div v-for="pedido in misPedidosListos" :key="pedido.id" class="pedido-listo-item">
              <div class="pedido-listo-header">
                <span class="mesa-badge-listo">Mesa {{ pedido.mesa_numero }}</span>
                <span class="tiempo-badge">{{ calcularTiempoEspera(pedido.created_at) }}</span>
              </div>
              <div class="pedido-listo-detalles">
                <div class="info">
                  <span>{{ pedido.items_count }} items</span>
                  <span class="total">${{ pedido.total }}</span>
                </div>
                <button @click="marcarComoServido(pedido.id)" class="btn btn-servir">
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
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useUsuarioStore } from '../stores/usuarioStore';
import { useNotificaciones } from '../composables/useNotificaciones';
import GeneradorQR from './GeneradorQR.vue';
const { notificaciones, cerrarNotificacion } = useNotificaciones('mesero');

const pedidoStore = usePedidoStore();
const usuarioStore = useUsuarioStore();

const mesaSeleccionada = ref(null);
const categoriaSeleccionada = ref('');
const pedidoEnProgreso = ref([]);
const notasPedido = ref('');
const loading = ref(false);
const qrComponent = ref(null);
const mostrarQR = ref(true);
const urlParaQR = ref('https://restaurante-pedidos.vercel.app/menu');
const descargarQR = () => {
  if (qrComponent.value && qrComponent.value.qrSrc) {
    const link = document.createElement('a');
    link.href = qrComponent.value.qrSrc;
    link.download = 'qr-mesero.png';
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
  return pedidoStore.pedidos.filter(p => String(p.usuario_mesero_id) === String(usuarioStore.usuario.id));
});

const misPedidosListos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  return pedidoStore.pedidos.filter(
    p => String(p.usuario_mesero_id) === String(usuarioStore.usuario.id) && p.estado === 'listo'
  );
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
    console.log('👤 Usuario actual:', usuarioStore.usuario);
    
    await pedidoStore.cargarMenu();
    await pedidoStore.cargarMesas();
    await pedidoStore.cargarPedidosActivos();
    
    console.log('📦 Pedidos cargados:', pedidoStore.pedidos);
    console.log('🔍 Filtrando por ID:', usuarioStore.usuario?.id);
    
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
  const existe = pedidoEnProgreso.value.find(i => i.id === item.id);
  if (existe) {
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
  pedidoEnProgreso.value.splice(idx, 1);
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
    alert('❌ Error al marcar pedido como servido');
  }
};

const marcarListoPagar = async (pedidoId) => {
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoId, 'listo_pagar');
    alert('✅ Pedido marcado como listo para pagar');
  } catch (err) {
    alert('❌ Error al marcar pedido');
  }
};

const calcularTiempoEspera = (createdAt) => {
  const ahora = new Date();
  const creado = new Date(createdAt);
  const diffMs = ahora - creado;
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

onMounted(() => {
  cargarDatos();
  cargarEstadoLocal();
});
</script>

<style scoped>
.mesero-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.mesas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
}

.mesa-btn {
  padding: 16px;
  border: 2px solid var(--color-border);
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.mesa-btn:hover {
  border-color: var(--color-primary);
}

.mesa-btn.mesa-active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.categorias-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  flex-wrap: wrap;
}

.tab {
  padding: 8px 16px;
  border: 2px solid var(--color-border);
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.tab.tab-active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.item-card {
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.item-card:hover {
  border-color: var(--color-primary);
  background: rgba(102, 126, 234, 0.05);
}

.item-nombre {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.item-precio {
  color: var(--color-success);
  font-weight: 700;
  margin-bottom: 4px;
}

.item-tiempo {
  font-size: 12px;
  color: #666;
}

.pedido-summary {
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
}

.item-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cantidad {
  font-weight: 700;
  color: var(--color-primary);
}

.item-acciones {
  display: flex;
  gap: 12px;
  align-items: center;
}

.precio {
  font-weight: 600;
  color: var(--color-success);
}

.btn-remove {
  background: var(--color-error);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.pedido-total {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: 600;
}

.total-amount {
  color: var(--color-success);
  font-size: 18px;
}

.notas-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-family: inherit;
  margin-bottom: 16px;
}

.btn-submit {
  width: 100%;
}

.pedidos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pedido-item {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.pedido-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.mesa-badge {
  background: var(--color-primary);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.estado-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.estado-nuevo {
  background: #dbeafe;
  color: #1e40af;
}

.estado-en_cocina {
  background: #fed7aa;
  color: #92400e;
}

.estado-listo {
  background: #bbf7d0;
  color: #065f46;
}

.pedido-detalles {
  display: flex;
  gap: 16px;
  font-size: 14px;
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
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .mesas-grid {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
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
  margin-left: 12px;
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

/* Pedidos Listos para Servir */
.pedidos-listos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pedido-listo-item {
  padding: 16px;
  border: 2px solid #10b981;
  border-radius: 8px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #10b981;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    border-color: #059669;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
}

.pedido-listo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mesa-badge-listo {
  background: #10b981;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
}

.tiempo-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #065f46;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.pedido-listo-detalles {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.pedido-listo-detalles .info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #065f46;
}

.pedido-listo-detalles .total {
  font-weight: 700;
  font-size: 16px;
  color: #059669;
}

.btn-servir {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-servir:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-servir:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .pedido-listo-detalles {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-servir {
    width: 100%;
  }
}

/* Pedidos Servidos - Listos para Cobrar */
.pedidos-servidos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pedido-servido-item {
  padding: 16px;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.pedido-servido-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mesa-badge-servido {
  background: #f59e0b;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
}

.total-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #92400e;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 700;
}

.pedido-servido-detalles {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.pedido-servido-detalles .info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #92400e;
}

.btn-pagar {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-pagar:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-pagar:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .pedido-servido-detalles {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-pagar {
    width: 100%;
  }
}

</style>
