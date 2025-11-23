<template>
  <div class="caja-panel">
    <div class="panel-header">
      <h2>💰 Panel de Caja</h2>
      <button @click="actualizarPedidos" class="btn btn-secondary" :disabled="loading">
        🔄 Actualizar
      </button>
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading">Cargando pedidos...</div>

      <template v-else>
        <!-- Notificaciones -->
        <div v-if="notificaciones.length > 0" class="notificaciones-container">
          <div v-for="notif in notificaciones" :key="notif.id" :class="['notificacion', `notif-${notif.tipo}`]">
            {{ notif.titulo }}
            <button @click="cerrarNotificacion(notif.id)" class="btn-cerrar-notif">✕</button>
          </div>
        </div>

        <!-- Pedidos Listos para Pagar -->
        <div class="section">
          <h3>📋 Pedidos Listos para Pagar</h3>
          <div v-if="pedidosListosPagar.length === 0" class="empty-state">
            Sin pedidos listos
          </div>
          <div v-else class="pedidos-grid">
            <div v-for="pedido in pedidosListosPagar" :key="pedido.id" :class="['pedido-card', `estado-${pedido.estado}`]">
              <div class="card-header">
                <span class="mesa">Mesa {{ pedido.mesa_numero }}</span>
                <span class="total">${{ pedido.total }}</span>
              </div>
              <div class="items-count">
                {{ pedido.items_count }} items
              </div>
              
              <div class="botones-pedido">
                <button
                  @click="pedirCuenta(pedido)"
                  class="btn btn-sm btn-secondary"
                  title="Imprimir cuenta para el cliente"
                >
                  🧾 Cuenta
                </button>
                <button
                  @click="seleccionarPedido(pedido)"
                  class="btn btn-sm btn-primary"
                  title="Registrar el pago"
                >
                  💳 Pagar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulario de Pago -->
        <div v-if="pedidoSeleccionado" class="section pago-section">
          <h3>💳 Registrar Pago</h3>
          
          <div class="pago-info">
            <div class="info-row">
              <span>Mesa:</span>
              <strong>{{ pedidoSeleccionado.mesa_numero }}</strong>
            </div>
            <div class="info-row">
              <span>Total a Pagar:</span>
              <strong class="monto-total">${{ pedidoSeleccionado.total }}</strong>
            </div>
          </div>

          <div class="form-group">
            <label>Método de Pago</label>
            <div class="payment-methods">
              <button
                v-for="metodo in metodoPagos"
                :key="metodo"
                @click="metodoSeleccionado = metodo"
                :class="['metodo-btn', { 'metodo-active': metodoSeleccionado === metodo }]"
              >
                {{ obtenerEmojiMetodo(metodo) }} {{ metodo }}
              </button>
            </div>
          </div>

          <div v-if="metodoSeleccionado === 'efectivo'" class="form-group">
            <label>Monto Recibido</label>
            <input
              v-model.number="montoRecibido"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              class="monto-input"
            />
            <div v-if="montoRecibido && montoRecibido > pedidoSeleccionado.total" class="cambio">
              💵 Cambio: ${{ (montoRecibido - pedidoSeleccionado.total).toFixed(2) }}
            </div>
            <div v-if="montoRecibido && montoRecibido < pedidoSeleccionado.total" class="alerta">
              ⚠️ Monto insuficiente
            </div>
          </div>

          <div class="botones-pago">
            <button
              @click="procesarPago"
              class="btn btn-success btn-full"
              :disabled="!metodoSeleccionado || (metodoSeleccionado === 'efectivo' && (!montoRecibido || montoRecibido < pedidoSeleccionado.total))"
            >
              ✅ Confirmar Pago
            </button>
            <button
              @click="cancelarPago"
              class="btn btn-secondary btn-full"
            >
              ❌ Cancelar
            </button>
          </div>
        </div>

        <!-- Historial de Pagos -->
        <div class="section">
          <h3>📝 Pagos Hoy</h3>
          <div v-if="pedidosPagadosHoy.length === 0" class="empty-state">
            Sin pagos registrados
          </div>
          <div v-else class="pagos-list">
            <div v-for="pedido in pedidosPagadosHoy" :key="pedido.id" class="pago-item">
              <div class="pago-info-item">
                <span class="mesa">Mesa {{ pedido.mesa_numero }}</span>
                <span class="monto">${{ pedido.total }}</span>
              </div>
              <div class="pago-detalles-extra">
                <span class="metodo-pago-badge" v-if="pedido.metodo_pago">
                  {{ obtenerEmojiMetodo(pedido.metodo_pago) }} {{ pedido.metodo_pago.toUpperCase() }}
                </span>
                <span class="timestamp">{{ formatearHora(pedido.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Ticket para Impresión (Oculto en pantalla) -->
        <!-- Ticket para Impresión (Oculto en pantalla) -->
        <div id="ticket" class="ticket-impresion" v-if="ticketData">
          <div class="ticket-content">
            <div class="ticket-header">
              <h3>🍽️ RESTAURANTE POS</h3>
              <p>NIT: 900.123.456-7</p>
              <p>Calle 123 # 45-67</p>
              <p>Tel: (601) 123 4567</p>
              <div class="divider">================================</div>
              <p>Fecha: {{ new Date().toLocaleString() }}</p>
              <p>Mesa: {{ ticketData.mesa }}</p>
              <p>Cajero: {{ ticketData.cajero }}</p>
              <div class="divider">--------------------------------</div>
              <p v-if="ticketData.tipo === 'pago'">COMPROBANTE DE PAGO</p>
              <p v-if="ticketData.metodoPago">Método: {{ ticketData.metodoPago.toUpperCase() }}</p>
              <p v-else-if="ticketData.tipo !== 'pago'">CUENTA DE COBRO</p>
              <div class="divider">================================</div>
            </div>
            
            <div class="ticket-body">
              <div class="ticket-row header-row">
                <span class="col-cant">Cant</span>
                <span class="col-desc">Desc</span>
                <span class="col-total">Total</span>
              </div>
              <div v-for="(item, index) in ticketData.items" :key="index" class="ticket-row">
                <span class="col-cant">{{ item.cantidad }}</span>
                <span class="col-desc">{{ item.nombre }}</span>
                <span class="col-total">${{ (item.cantidad * item.precio).toFixed(2) }}</span>
              </div>
            </div>
            
            <div class="ticket-total-section">
              <div class="divider">--------------------------------</div>
              <div class="ticket-row total-row">
                <span>TOTAL:</span>
                <span>${{ ticketData.total }}</span>
              </div>
              <div class="divider">================================</div>
            </div>
            
            <div class="ticket-footer">
              <p>¡Gracias por su visita!</p>
              <p>Propina voluntaria sugerida</p>
              <p>Regimen Simplificado</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useUsuarioStore } from '../stores/usuarioStore';
import api from '../api';
import { useNotificaciones } from '../composables/useNotificaciones';

const { notificaciones, cerrarNotificacion } = useNotificaciones('facturero');

const pedidoStore = usePedidoStore();
const usuarioStore = useUsuarioStore();

const loading = ref(false);
const pedidoSeleccionado = ref(null);
const metodoSeleccionado = ref('');
const montoRecibido = ref(null);
const pedidosPagadosHoy = ref([]);
const ticketData = ref(null);

const metodoPagos = ['efectivo', 'tarjeta', 'nequi', 'otro_digital'];

const pedidosListosPagar = computed(() => {
  const listos = pedidoStore.pedidosPorEstado.listo_pagar || [];
  const enCaja = pedidoStore.pedidosPorEstado.en_caja || [];
  return [...listos, ...enCaja].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
});
const pedidosPagados = computed(() => pedidoStore.pedidosPorEstado.pagado);

const actualizarPedidos = async () => {
  loading.value = true;
  try {
    await pedidoStore.cargarPedidosActivos();
    // Cargar pedidos pagados del día por este cajero
    const pedidosHoyRes = await api.getPedidosHoy();
    
    pedidosPagadosHoy.value = pedidosHoyRes.data.filter(p => 
      p.estado === 'pagado' && 
      String(p.usuario_facturero_id) === String(usuarioStore.usuario.id)
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    loading.value = false;
  }
};

const seleccionarPedido = (pedido) => {
  pedidoSeleccionado.value = pedido;
  metodoSeleccionado.value = '';
  montoRecibido.value = null;
};

const cancelarPago = () => {
  pedidoSeleccionado.value = null;
  metodoSeleccionado.value = '';
  montoRecibido.value = null;
};

const obtenerEmojiMetodo = (metodo) => {
  const emojis = {
    efectivo: '💵',
    tarjeta: '💳',
    nequi: '📱',
    otro_digital: '🌐'
  };
  return emojis[metodo] || '💰';
};

const formatearHora = (fecha) => {
  return new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const prepararTicket = (pedido, tipo, metodo = null) => {
  ticketData.value = {
    tipo,
    mesa: pedido.mesa_numero,
    total: pedido.total,
    // El backend devuelve 'precio_unitario', pero a veces puede ser 'precio'
    items: (pedido.items || []).map(item => ({
      ...item,
      precio: item.precio_unitario || item.precio || 0
    })),
    cajero: usuarioStore.usuario.nombre,
    metodoPago: metodo
  };
};

const pedirCuenta = async (pedido) => {
  try {
    // 1. Preparar datos para impresión
    prepararTicket(pedido, 'cuenta');
    
    // Esperar a que el DOM se actualice con el ticket
    await nextTick();
    
    // 2. Abrir diálogo de impresión del navegador
    window.print();
    
    // 3. Cambiar estado a 'en_caja'
    await pedidoStore.actualizarEstadoPedido(pedido.id, 'en_caja');
    
  } catch (err) {
    console.error(err);
    alert('❌ Error al procesar cuenta');
  }
};

const procesarPago = async () => {
  if (!pedidoSeleccionado.value) return;
  
  try {
    await api.registrarPago(
      pedidoSeleccionado.value.id,
      usuarioStore.usuario.id,
      pedidoSeleccionado.value.total,
      metodoSeleccionado.value
    );
    
    // Preparar ticket de pago con el método seleccionado
    prepararTicket(pedidoSeleccionado.value, 'pago', metodoSeleccionado.value);
    await nextTick();
    
    // Imprimir
    window.print();

    alert('✅ Pago registrado con éxito');
    cancelarPago();
    await actualizarPedidos();
  } catch (err) {
    console.error(err);
    alert('❌ Error al registrar pago');
  }
};

onMounted(() => {
  actualizarPedidos();
});
</script>
<style scoped>
.loading {
  text-align: center;
  padding: 40px;
}

/* Notificaciones */
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
  max-width: 300px;
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
  .pedidos-grid {
    grid-template-columns: 1fr;
  }

  .notificaciones-container {
    right: 10px;
    left: 10px;
    top: 70px;
  }

  .metodo-btn {
    font-size: 11px;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 8px;
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

.pedidos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.pedido-card {
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.pedido-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mesa {
  font-weight: 700;
}

.total {
  color: var(--color-success);
  font-weight: 700;
  font-size: 18px;
}

.items-count {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.pago-section {
  border: 2px solid var(--color-success);
  background: rgba(16, 185, 129, 0.05);
}

.pago-info {
  background: var(--color-bg);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.metodo-btn {
  padding: 10px;
  border: 2px solid var(--color-border);
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.metodo-btn:hover {
  border-color: var(--color-success);
}

.metodo-btn.metodo-active {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.form-group {
  margin-bottom: 16px;
}

.cambio {
  margin-top: 8px;
  padding: 8px;
  background: #ecfdf5;
  border-left: 3px solid var(--color-success);
  color: #065f46;
  font-weight: 600;
}

.btn-full {
  width: 100%;
  margin-bottom: 8px;
}

.pagos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pago-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.pago-info-item {
  display: flex;
  gap: 16px;
  align-items: center;
}

.pago-detalles-extra {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metodo-pago-badge {
  font-size: 11px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-weight: 600;
}

.mesa {
  font-weight: 600;
}

.monto {
  color: var(--color-success);
  font-weight: 700;
}

.timestamp {
  font-size: 12px;
  color: #999;
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
  .pedidos-grid {
    grid-template-columns: 1fr;
  }

  .payment-methods {
    grid-template-columns: repeat(2, 1fr);
  }
}

.ticket-impresion {
  display: none;
}

@media print {
  /* Ocultar TODO por defecto */
  body > * {
    display: none !important;
  }

  /* Asegurar que el ticket se vea */
  body > .ticket-impresion,
  .ticket-impresion {
    display: block !important;
    position: absolute !important;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: white;
    z-index: 9999;
  }

  .ticket-content {
    width: 300px; /* Ancho típico de impresora térmica */
    margin: 0 auto;
    padding: 10px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: black;
  }

  .ticket-header {
    text-align: center;
  }
  
  .ticket-header h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
  }
  
  .ticket-header p {
    margin: 2px 0;
  }

  .divider {
    text-align: center;
    margin: 5px 0;
    white-space: pre;
  }

  .ticket-row {
    display: flex !important;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  
  .header-row {
    font-weight: bold;
    border-bottom: 1px dashed black;
    padding-bottom: 2px;
    margin-bottom: 5px;
  }
  
  .col-cant { width: 15%; text-align: left; }
  .col-desc { width: 60%; text-align: left; }
  .col-total { width: 25%; text-align: right; }

  .total-row {
    font-weight: bold;
    font-size: 16px;
  }

  .ticket-footer {
    text-align: center;
    margin-top: 15px;
    font-size: 10px;
  }
  
  .ticket-footer p {
    margin: 2px 0;
  }
  
  /* Restaurar visibilidad de hijos del ticket */
  .ticket-impresion * {
    display: block;
    visibility: visible;
  }
}

</style>
