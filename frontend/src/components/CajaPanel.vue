<template>
  <div class="caja-panel">
    <!-- Header -->
    <header class="panel-header">
      <div class="header-title">
        <h2>
          <Wallet class="w-8 h-8 text-primary" />
          {{ $t('cashier.title')}}
        </h2>
      </div>
      
      <div class="header-info">
        <div class="info-item">
          <User class="w-4 h-4" />
          <span class="user-name">{{ usuarioStore.usuario.nombre }}</span>
        </div>
        <div class="info-item">
          <Clock class="w-4 h-4" />
          <span class="time">{{ currentTime }}</span>
        </div>
        <button @click="cargarDatos" class="btn-refresh" :title="$t('cashier.update')">
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </header>

    <div class="panel-content">
      <!-- Sección Principal: Pedidos por Cobrar -->
      <div class="main-section">
        <div class="section-title">
          <Receipt class="w-5 h-5 text-primary" />
          {{ $t('cashier.orders_to_pay') }}
          <span v-if="pedidosListosPagar.length" class="badge">
            {{ pedidosListosPagar.length }}
          </span>
        </div>

        <div v-if="loading" class="loading-state">
           {{ $t('common.loading') }}...
        </div>

        <div v-else-if="pedidosListosPagar.length === 0" class="empty-state">
          <CheckCircle2 class="empty-state-icon text-success" />
          <h3>{{ $t('cashier.no_orders') }}</h3>
          <p>{{ $t('cashier.all_caught_up') }}</p>
        </div>

        <div v-else class="pedidos-grid">
          <div 
            v-for="pedido in pedidosListosPagar" 
            :key="pedido.id" 
            class="billing-card"
            @click="abrirCaja(pedido)"
          >
            <div class="billing-card-header">
              <span class="table-badge">
                {{ $t('common.table') }} {{ pedido.mesa_numero }}
              </span>
              <span class="waiter-info">
                <User class="w-3 h-3" /> {{ pedido.mesero || 'Mesero' }}
              </span>
            </div>

            <div class="billing-details">
               <span>Items: {{ pedido.items_count || (pedido.items ? pedido.items.length : 0) }}</span>
               <span>{{ formatearHora(pedido.created_at) }}</span>
            </div>

            <div class="billing-total">
               <span>Total:</span>
               <span class="total-amount">${{ Math.round(pedido.total || 0).toLocaleString() }}</span>
            </div>
            
            <!-- Order Notes -->
            <div v-if="pedido.notas" class="order-notes">
              <span class="notes-label">📝 Nota:</span>
              <span class="notes-text">{{ pedido.notas }}</span>
            </div>
            
            <!-- Action Buttons -->
            <div class="billing-actions">
              <button @click.stop="verCuenta(pedido)" class="btn-action-icon" :title="$t('cashier.view_bill')">
                <Eye :size="18" />
              </button>
              <button @click.stop="imprimirCuenta(pedido)" class="btn-action-icon" :title="$t('cashier.print_bill')">
                <Printer :size="18" />
              </button>
              <button @click.stop="devolverPedido(pedido)" class="btn-action-icon warning" :title="$t('cashier.return_order')">
                <ArrowLeft :size="18" />
              </button>
            </div>
            
             <!-- Estado de pago parcial -->
            <div v-if="pedido.total_pagado > 0" class="text-success text-sm text-right">
                Pagado: ${{ Math.round(pedido.total_pagado).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar: Historial de Pagos -->
      <div class="history-sidebar">
        <div class="sidebar-header">
           <div class="section-title">
             <History class="w-5 h-5 text-muted" />
             {{ $t('cashier.payment_history') }}
           </div>
        </div>
        
        <div class="history-list">
          <div v-if="historialPagos.length === 0" class="empty-state small">
             <span class="text-muted">{{ $t('cashier.no_history_today') }}</span>
          </div>
          <div v-else v-for="pedido in historialPagos" :key="pedido.id" class="history-item">
             <div class="history-info">
                <h4>{{ $t('common.table') }} {{ pedido.mesa_numero }}</h4>
                <div class="history-meta">
                   <!-- Mostrar método de pago principal o 'Múltiple' -->
                   <component 
                     :is="getPaymentIcon(pedido.pagos_multiples ? 'multiple' : pedido.metodo_pago)" 
                     class="w-3 h-3" 
                   />
                   {{ pedido.pagos_multiples ? 'Múltiple' : formatMetodo(pedido.metodo_pago) }} • {{ formatearHora(pedido.created_at) }}
                </div>
             </div>
             <div class="history-amount">
                ${{ Math.round(pedido.total).toLocaleString() }}
             </div>
             <button @click="verDetallesPago(pedido)" class="btn-icon-mini ml-2" :title="$t('cashier.view')">
                <Eye class="w-4 h-4 text-muted hover:text-primary" />
             </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Cobro -->
    <div v-if="pedidoSeleccionado" class="modal-overlay" @click.self="cerrarModal">
       <div class="modal-content payment-modal">
          <div class="modal-header">
             <h3>
                <Banknote class="w-6 h-6 text-primary" />
                {{ $t('cashier.register_payment') }} - Mesa {{ pedidoSeleccionado.mesa_numero }}
             </h3>
             <button @click="cerrarModal" class="btn-close">&times;</button>
          </div>
          <div class="modal-body">
             <CajaPaymentForm 
               :pedido="pedidoSeleccionado"
               :saldoPendiente="saldoPendiente"
               :usuarioId="usuarioStore.usuario.id"
               :metodosPago="metodosPago"
               @pago-registrado="onPagoRegistrado"
               @cancelar="cerrarModal"
             />
          </div>
       </div>
    </div>
    
     <!-- Modal Feedback e Impresión (Ticket) -->
    <div v-if="pagoExitosoData" class="modal-overlay">
       <div class="modal-content success-modal">
          <div class="modal-header">
             <h3 class="text-success">
                <CheckCircle2 class="w-6 h-6" />
                {{ $t('cashier.payment_success') }}
             </h3>
          </div>
          <div class="modal-body text-center">
             <p class="text-lg mb-4">
                Pago de <strong>${{ Math.round(ultimoPagoMonto).toLocaleString() }}</strong> registrado.
             </p>
             <div class="change-display" v-if="ultimoCambio > 0">
                Cambio: ${{ Math.round(ultimoCambio).toLocaleString() }}
             </div>
             
             <div class="flex flex-col gap-2 mt-6">
                <button @click="imprimirTicket(pagoExitosoData, ultimoPagoMonto, ultimoCambio, false)" class="btn btn-primary btn-full">
                   <Printer class="w-5 h-5" /> {{ $t('cashier.print_ticket') }}
                </button>
                <button @click="imprimirTicket(pagoExitosoData, ultimoPagoMonto, ultimoCambio, true)" class="btn btn-secondary btn-full">
                   <Printer class="w-5 h-5" /> {{ $t('cashier.print_ticket_gift') }} (Sin Precio)
                </button>
                <button @click="cerrarModalExito" class="btn btn-outline btn-full">
                   {{ $t('common.close') }}
                </button>
             </div>
          </div>
       </div>
    </div>
    
    <!-- Ticket Invisible para impresión -->
    <div id="ticket-print-area" class="print-only">
        <!-- El contenido se inyecta dinámicamente o se usa un componente invisible -->
    </div>

    <!-- Modal de Detalles del Pago (Historial) -->
    <div v-if="pagoDetalle" class="modal-overlay" @click.self="cerrarDetallePago">
      <div class="modal-content payment-details-modal">
        <div class="modal-header">
          <h3>
             <History class="w-6 h-6 text-primary" />
             {{ $t('cashier.payment_details') }}
          </h3>
          <button @click="cerrarDetallePago" class="btn-close">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- Header Card: Mesa & Info -->
          <div class="detail-card header-card">
            <div class="card-header">
              <div class="table-badge-large">
                <span class="label">{{ $t('common.table') }}</span>
                <span class="number">{{ pagoDetalle.mesa_numero }}</span>
              </div>
              <div class="meta-info">
                <div class="meta-item">
                  <Clock class="w-3.5 h-3.5" />
                  <span>{{ formatearHora(pagoDetalle.created_at) }}</span>
                </div>
                <div class="meta-item">
                  <User class="w-3.5 h-3.5" />
                  <span>{{ usuarioStore.usuario.nombre }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Payments Card -->
          <div class="detail-card" v-if="pagoDetalle.pagos && pagoDetalle.pagos.length">
            <div class="card-title">
              <Receipt class="w-4 h-4" />
              <span>Métodos de Pago</span>
            </div>
            <div class="payment-list">
              <div v-for="(pago, pIndex) in pagoDetalle.pagos" :key="pIndex" class="payment-item">
                <div class="payment-method">
                  <component :is="getPaymentIcon(pago.metodo_pago)" class="w-5 h-5 text-primary" />
                  <span class="method-name">{{ pago.metodo_pago }}</span>
                </div>
                <div class="payment-amount">${{ Number(pago.monto).toLocaleString() }}</div>
              </div>
            </div>
          </div>
          
          <!-- Single Payment Fallback -->
          <div class="detail-card" v-else-if="pagoDetalle.metodo_pago">
            <div class="card-title">
              <Receipt class="w-4 h-4" />
              <span>Método de Pago</span>
            </div>
            <div class="payment-list">
              <div class="payment-item">
                <div class="payment-method">
                  <component :is="getPaymentIcon(pagoDetalle.metodo_pago)" class="w-5 h-5 text-primary" />
                  <span class="method-name">{{ pagoDetalle.metodo_pago }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Items Card -->
          <div class="detail-card items-card">
            <div class="card-title">
              <CheckCircle2 class="w-4 h-4" />
              <span>Items del Pedido</span>
            </div>
            <div class="items-table">
              <div class="items-table-header">
                <span class="col-qty">Cant.</span>
                <span class="col-desc">Descripción</span>
                <span class="col-total">Total</span>
              </div>
              <div class="items-table-body">
                <div v-for="(item, index) in itemsAgrupados" :key="index" class="item-row">
                  <span class="col-qty">{{ item.cantidad }}</span>
                  <span class="col-desc">{{ item.nombre }}</span>
                  <span class="col-total">${{ Number(item.total).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Card -->
          <div class="detail-card total-card">
            <div class="total-row tip-row" v-if="pagoDetalle.propina_monto">
              <span class="total-label">{{ $t('cashier.tip') }}</span>
              <span class="total-value tip-value">+ ${{ Number(pagoDetalle.propina_monto).toLocaleString() }}</span>
            </div>
            <div class="total-row final-total">
              <span class="total-label">TOTAL</span>
              <span class="total-value">${{ Number(pagoDetalle.total).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Return Order -->
    <div v-if="mostrarConfirmacionDevolver" class="modal-overlay" @click.self="cerrarConfirmacionDevolver">
      <div class="modal-content small-modal">
        <div class="modal-header-clean">
          <h3>{{ $t('cashier.return_order') }}</h3>
          <button @click="cerrarConfirmacionDevolver" class="btn-close-clean"><X :size="20" /></button>
        </div>
        
        <div class="modal-body-clean">
          <p class="confirm-message">{{ confirmacionDevolverMensaje }}</p>
          
          <div class="modal-actions-row">
            <button @click="cerrarConfirmacionDevolver" class="btn-secondary-action large">
              {{ $t('common.cancel') }}
            </button>
            <button @click="confirmarDevolver" class="btn-primary-action large warning">
              {{ $t('common.yes') }} <ArrowLeft :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useUsuarioStore } from '../stores/usuarioStore';
import { usePedidoStore } from '../stores/pedidoStore';
import { useNotificaciones } from '../composables/useNotificaciones';
import CajaPaymentForm from './CajaPaymentForm.vue';
import api from '../api';
import socket from '../socket';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { 
  Wallet, User, Clock, RefreshCw, Receipt, CheckCircle2, History,
  Banknote, Printer, CreditCard, Smartphone, Banknote as CashIcon, Globe, Eye, ArrowLeft, X
} from 'lucide-vue-next';

// --- Estado ---
const usuarioStore = useUsuarioStore();
const pedidoStore = usePedidoStore(); // Usamos el store para mantener consistencia si se quiere
const { t } = useI18n(); // Uso de i18n
const router = useRouter();

// Inicializar notificaciones para rol cajero/facturero
const { notificaciones } = useNotificaciones('facturero'); 
const loading = ref(false);

const historialPagos = ref([]);
const currentTime = ref('');
const metodosPago = ref([]);

// Modal y Selección
const pedidoSeleccionado = ref(null);
const saldoPendiente = ref(0);

// Estado post-pago
const pagoExitosoData = ref(null); // Objeto pedido actualizado tras pago
const ultimoPagoMonto = ref(0);
const ultimoCambio = ref(0);

// Return order confirmation
const mostrarConfirmacionDevolver = ref(false);
const confirmacionDevolverMensaje = ref('');
const pedidoParaDevolver = ref(null);

// --- Helpers de Iconos ---
const getPaymentIcon = (method) => {
   const methodLower = (method || '').toLowerCase();
   if (methodLower.includes('efectivo') || methodLower.includes('cash')) return CashIcon;
   if (methodLower.includes('tarjeta') || methodLower.includes('card')) return CreditCard;
   if (methodLower.includes('nequi') || methodLower.includes('daviplata')) return Smartphone;
   return Globe; // Default generic
};

const formatMetodo = (metodo) => {
   // Intentar traducir o capitalizar
   if (!metodo) return '';
   return t(`cashier.methods.${metodo}`) !== `cashier.methods.${metodo}` 
     ? t(`cashier.methods.${metodo}`) 
     : metodo.charAt(0).toUpperCase() + metodo.slice(1);
};


// --- Métodos de Carga ---
// Computed original
const pedidosListosPagar = computed(() => {
  const listos = pedidoStore.pedidosPorEstado.listo_pagar || [];
  const enCaja = pedidoStore.pedidosPorEstado.en_caja || [];
  return [...listos, ...enCaja].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
});

// --- Métodos de Carga ---
const cargarDatos = async () => {
  loading.value = true;
  try {
    // Usar store para activos (lógica original)
    await pedidoStore.cargarPedidosActivos();
    
    // Usar API directa para historial de hoy (lógica original)
    const reportesRes = await api.getPedidosHoy();
    
    // Filtrar localmente como antes
    const pedidosFiltrados = (reportesRes.data || []).filter(p => 
        (p.estado === 'pagado' || p.estado === 'en_caja') && 
        p.pagos && 
        p.pagos.some(pago => String(pago.cajero_id) === String(usuarioStore.usuario.id))
    );

    pedidosFiltrados.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    historialPagos.value = pedidosFiltrados;
    
  } catch (err) {
    console.error('Error cargando datos de caja:', err);
  } finally {
    loading.value = false;
  }
};

const cargarConfiguracionPago = async () => {
    try {
        const res = await api.getPaymentMethods(); // Get active payment methods
        // Filtrar solo activos y mapear
        metodosPago.value = res.data.filter(pm => pm.active).map(pm => ({
            name: pm.name,
            label: pm.label
        }));
    } catch (e) {
        console.error("Error loading payment methods", e);
        // Fallback default
        metodosPago.value = [
            { name: 'efectivo', label: 'Efectivo' },
            { name: 'tarjeta', label: 'Tarjeta' },
            { name: 'nequi', label: 'Nequi' },
            { name: 'daviplata', label: 'Daviplata' }
        ];
    }
};


// --- Reloj ---
let timer;
const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Acciones ---
const abrirCaja = (pedido) => {
  pedidoSeleccionado.value = pedido;
  
  // Calcular saldo pendiente preciso
  const total = Number(pedido.total);
  const pagado = Number(pedido.total_pagado || 0);
  saldoPendiente.value = Math.max(0, total - pagado);
  saldoPendiente.value = Math.max(0, total - pagado);
};

// Reutilizamos la lógica para ver detalles desde el historial
// (Eliminado: se usa la versión nueva más abajo)

const cerrarModal = () => {
  pedidoSeleccionado.value = null;
  saldoPendiente.value = 0;
};

// --- Lógica Modal Detalles (Historial) ---
const pagoDetalle = ref(null);

const verDetallesPago = async (pedido) => {
  try {
    // Obtener ID del pedido
    const pedidoId = typeof pedido === 'object' ? pedido.id : pedido;
    
    // Cargar detalles completos del pedido desde la API (incluye items)
    const response = await api.getPedido(pedidoId);
    pagoDetalle.value = response.data;
  } catch (err) {
    console.error('Error cargando detalles del pago:', err);
    // Fallback: usar datos básicos si falla la API
    if (typeof pedido === 'object') {
      pagoDetalle.value = pedido;
    }
  }
};

const cerrarDetallePago = () => {
  pagoDetalle.value = null;
};

// Agrupar items para el ticket/detalle
const itemsAgrupados = computed(() => {
  if (!pagoDetalle.value || !pagoDetalle.value.items) return [];
  const grupos = {};
  pagoDetalle.value.items.forEach(item => {
    // Clave única por nombre y precio
    const key = `${item.nombre}-${item.precio_unitario}`;
    if (!grupos[key]) {
      grupos[key] = { ...item, cantidad: 0, total: 0 };
    }
    grupos[key].cantidad += item.cantidad;
    grupos[key].total += (item.precio_unitario * item.cantidad);
  });
  return Object.values(grupos);
});

// Helper para iconos de metodo (reutilizando existente o nuevo)
// const obtenerEmojiMetodo = (metodo) => { ... } // Eliminado para usar iconos

const onPagoRegistrado = ({ data, montoAplicado, cambio, esMultiple }) => { // data es el pedido actualizado
  // 1. Store the original pedido (with items) for ticket printing FIRST
  // The backend response might not include items, so we use the original pedidoSeleccionado
  pagoExitosoData.value = pedidoSeleccionado.value; // Use original pedido which has items
  ultimoPagoMonto.value = montoAplicado;
  ultimoCambio.value = cambio;
  
  // 2. Cerrar modal de cobro
  cerrarModal();
  
  // 3. Reproducir sonido de caja
  playCashSound();
  
  // 4. Recargar datos (se actualiza la grilla y el historial) - LAST to avoid clearing modal data
  cargarDatos();
};

const cerrarModalExito = () => {
    pagoExitosoData.value = null;
    ultimoPagoMonto.value = 0;
    ultimoCambio.value = 0;
};

const playCashSound = () => {
  const audio = new Audio('/sounds/cash-register.mp3');
  audio.volume = 0.5;
  audio.play().catch(e => console.log('Audio autoplay blocked', e));
};

const devolverPedido = async (pedido) => {
  confirmacionDevolverMensaje.value = t('cashier.confirm_return_table', { table: pedido.mesa_numero });
  pedidoParaDevolver.value = pedido;
  mostrarConfirmacionDevolver.value = true;
};

const confirmarDevolver = async () => {
  mostrarConfirmacionDevolver.value = false;
  
  if (!pedidoParaDevolver.value) return;
  
  try {
    await api.actualizarEstadoPedido(pedidoParaDevolver.value.id, 'servido');
    cargarDatos();
    alert(t('cashier.order_returned') || 'Pedido devuelto al mesero');
  } catch (err) {
    console.error('Error devolviendo pedido:', err);
    alert(t('common.error') || 'Error al devolver pedido');
  } finally {
    pedidoParaDevolver.value = null;
  }
};

const cerrarConfirmacionDevolver = () => {
  mostrarConfirmacionDevolver.value = false;
  pedidoParaDevolver.value = null;
};

const verCuenta = (pedido) => {
  if (!pedido.id) return;
  // Navigate in same tab - CuentaView will detect mesero login and show back button to panel
  router.push(`/cuenta/${pedido.id}`);
};

const imprimirCuenta = async (pedido) => {
  try {
    // Fetch full order details if needed
    let orderData = pedido;
    if (!pedido.items || pedido.items.length === 0) {
      const response = await api.getPedido(pedido.id);
      orderData = response.data;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para imprimir');
      return;
    }

    const ticketData = prepararTicket(orderData, true, null, null); // esRegalo=true for bill without prices

    const contenidoHTML = `
    <html>
    <head>
      <title>${t('cashier.bill')} - ${import.meta.env.VITE_APP_TITLE}</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h3 { margin: 0 0 5px 0; font-size: 16px; }
        .header p { margin: 2px 0; }
        .divider { border-top: 1px dashed black; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .col-cant { width: 10%; }
        .col-desc { width: 65%; }
        .col-total { width: 25%; text-align: right; }
        .total-section { font-size: 16px; font-weight: bold; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h3>${import.meta.env.VITE_APP_TITLE.toUpperCase()}</h3>
        <p>${t('ticket.date')}: ${new Date().toLocaleString()}</p>
        <p>${t('common.table')}: ${ticketData.mesa}</p>
        <div class="divider"></div>
        <p>${t('cashier.bill')}</p>
        <div class="divider"></div>
      </div>

      <div class="items">
        <div class="row" style="font-weight:bold; border-bottom:1px solid black;">
          <span class="col-cant">${t('ticket.qty')}</span>
          <span class="col-desc">${t('ticket.desc')}</span>
          <span class="col-total">${t('ticket.total')}</span>
        </div>
        ${ticketData.items.map(item => `
          <div class="row">
            <span class="col-cant">${item.cantidad}</span>
            <span class="col-desc">${item.nombre}</span>
            <span class="col-total">$${Math.round(item.cantidad * item.precio).toLocaleString()}</span>
          </div>
        `).join('')}
      </div>

      <div class="total-section">
        <div class="divider"></div>
        <div class="row">
          <span>${t('ticket.subtotal')}:</span>
          <span>$${Math.round(ticketData.subtotal).toLocaleString()}</span>
        </div>
        ${ticketData.propinaMonto > 0 ? `
        <div class="row">
          <span>${t('ticket.tip')}:</span>
          <span>$${Math.round(ticketData.propinaMonto).toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="row" style="font-size: 18px;">
          <span>${t('ticket.total').toUpperCase()}:</span>
          <span>$${Math.round(ticketData.totalPedido).toLocaleString()}</span>
        </div>
      </div>

      <div class="footer">
        <p>${t('ticket.thanks')}</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      <\/script> 
    <\/body>
    <\/html>
  `;

    printWindow.document.write(contenidoHTML);
    printWindow.document.close();
  } catch (error) {
    console.error('Error imprimiendo cuenta:', error);
    alert('Error al imprimir la cuenta');
  }
};

// --- Impresión ---
// Agrupa items para el ticket
const prepararTicket = (pedido, esRegalo, montoPago, cambio) => {
  const itemsAgrupadosParaTicket = {};

  (pedido.items || []).forEach(item => {
    const key = item.menu_item_id || item.nombre;
    if (!itemsAgrupadosParaTicket[key]) {
      itemsAgrupadosParaTicket[key] = {
        nombre: item.nombre,
        precio: Number(item.precio_unitario || item.precio || 0),
        cantidad: 0
      };
    }
    itemsAgrupadosParaTicket[key].cantidad += (item.cantidad || 1);
  });

  const itemsFinales = Object.values(itemsAgrupadosParaTicket);

  let subtotal = pedido.subtotal;
  let propinaMonto = pedido.propina_monto || 0;
  
  if (!subtotal) {
    subtotal = itemsFinales.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
    propinaMonto = parseFloat(pedido.total || 0) - subtotal;
  }

  return {
    mesa: pedido.mesa_numero,
    subtotal: subtotal,
    propinaMonto: propinaMonto,
    totalPedido: pedido.total,
    items: itemsFinales,
    cajero: usuarioStore.usuario.nombre,
    montoRecibido: montoPago,
    cambio: cambio,
    pagos: pedido.pagos || [],
    esRegalo: esRegalo
  };
};

const imprimirTicket = async (pedido, montoPago, cambio, esRegalo) => {
    // The pedido object from pagoExitosoData should already have items
    // If not, we need to ensure we have the order ID to fetch
    let orderData = pedido;
    
    // Only fetch if items are missing AND we have a valid ID
    if ((!pedido.items || pedido.items.length === 0) && pedido.id) {
        try {
            const response = await api.getPedido(pedido.id);
            orderData = response.data;
        } catch (error) {
            console.error('Error fetching order details:', error);
            alert('Error al cargar los detalles del pedido');
            return;
        }
    }
    
    // If still no items, we can't print
    if (!orderData.items || orderData.items.length === 0) {
        console.error('No items available for printing');
        alert('No se pueden obtener los items del pedido');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Por favor permite ventanas emergentes para imprimir el ticket');
        return;
    }

    const ticketData = prepararTicket(orderData, esRegalo, montoPago, cambio);

    const contenidoHTML = `
    <html>
    <head>
      <title>${t('ticket.title')} - ${import.meta.env.VITE_APP_TITLE}</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h3 { margin: 0 0 5px 0; font-size: 16px; }
        .header p { margin: 2px 0; }
        .divider { border-top: 1px dashed black; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .col-cant { width: 10%; }
        .col-desc { width: 65%; }
        .col-total { width: 25%; text-align: right; }
        .total-section { font-size: 16px; font-weight: bold; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h3>${import.meta.env.VITE_APP_TITLE.toUpperCase()}</h3>
        <p>${t('ticket.nit')}: ${import.meta.env.VITE_APP_NIT || 'N/A'}</p>
        <p>${t('ticket.date')}: ${new Date().toLocaleString()}</p>
        <p>${t('common.table')}: ${ticketData.mesa}</p>
        <p>${t('ticket.server')}: ${ticketData.cajero}</p>
        <div class="divider"></div>
        <p>${esRegalo ? t('ticket.bill_title') : t('ticket.payment_title')}</p>
        <div class="divider"></div>
      </div>

      <div class="items">
        <div class="row" style="font-weight:bold; border-bottom:1px solid black;">
          <span class="col-cant">${t('ticket.qty')}</span>
          <span class="col-desc">${t('ticket.desc')}</span>
          <span class="col-total">${esRegalo ? '' : t('ticket.total')}</span>
        </div>
        ${ticketData.items.map(item => `
          <div class="row">
            <span class="col-cant">${item.cantidad}</span>
            <span class="col-desc">${item.nombre}</span>
            <span class="col-total">${esRegalo ? '' : '$' + Math.round(item.cantidad * item.precio).toLocaleString()}</span>
          </div>
        `).join('')}
      </div>

      ${!esRegalo ? `
      <div class="total-section">
        <div class="divider"></div>
        <div class="row">
          <span>${t('ticket.subtotal')}:</span>
          <span>$${Math.round(ticketData.subtotal).toLocaleString()}</span>
        </div>
        ${ticketData.propinaMonto > 0 ? `
        <div class="row">
          <span>${t('ticket.tip')} (${Math.round((ticketData.propinaMonto / ticketData.subtotal) * 100)}%):</span>
          <span>$${Math.round(ticketData.propinaMonto).toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="row" style="font-size: 18px;">
          <span>${t('ticket.total').toUpperCase()}:</span>
          <span>$${Math.round(ticketData.totalPedido).toLocaleString()}</span>
        </div>
        ${ticketData.montoRecibido != null ? `
          <div class="row">
            <span>${t('ticket.received')}:</span>
            <span>$${Math.round(ticketData.montoRecibido).toLocaleString()}</span>
          </div>
        ` : ''}
        ${ticketData.cambio != null && ticketData.cambio > 0 ? `
          <div class="row">
            <span>${t('ticket.change')}:</span>
            <span>$${Math.round(ticketData.cambio).toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="divider"></div>
      </div>
      ` : ''}

      ${ticketData.pagos && ticketData.pagos.length > 0 && !esRegalo ? `
        <div class="pagos-history" style="margin-top: 10px;">
           <div class="row" style="font-weight:bold;">
            <span>${t('ticket.payment_history') || 'Historial de Pagos'}</span>
          </div>
          <div class="divider"></div>
          ${ticketData.pagos.map(p => `
            <div class="row" style="font-size: 11px; color: #333;">
              <span>${new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${p.metodo_pago ? p.metodo_pago.toUpperCase() : 'PAGO'}</span>
              <span>$${Math.round(p.monto).toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
        </div>
      ` : ''}

      <div class="footer">
        <p>${t('ticket.thanks')}</p>
        ${!esRegalo ? `<p>${t('ticket.tip_suggested')}</p>` : ''}
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      <\/script> 
    <\/body>
    <\/html>
  `;

    printWindow.document.write(contenidoHTML);
    printWindow.document.close();
};


const formatearHora = (fecha) => {
  return new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Lifecycle ---
onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 60000); // Cada minuto
  cargarConfiguracionPago();
  cargarDatos();
  
  if (!socket.connected) socket.connect();
  
  // Escuchar eventos socket para actualizar en tiempo real
  socket.on('nuevo_pedido', cargarDatos);
  socket.on('pedido_actualizado', cargarDatos);
  socket.on('item_servido', cargarDatos); // Por si cambia status a ready
  socket.on('pago_registrado', cargarDatos);
});

onUnmounted(() => {
  clearInterval(timer);
  socket.off('nuevo_pedido');
  socket.off('pedido_actualizado');
  socket.off('item_servido');
  socket.off('pago_registrado');
});

</script>

<style src="../assets/styles/CajaPanel.css" scoped></style>
<style src="../assets/styles/PaymentDetailsModal.css" scoped></style>
