<template>
  <div class="caja-panel">
    <div class="panel-header">
      <h2>{{ $t('cashier.title') }}</h2>
      <button @click="actualizarPedidos" class="btn btn-secondary" :disabled="loading">
        {{ $t('cashier.update') }}
      </button>
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading">{{ $t('cashier.loading') }}</div>

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
          <h3>{{ $t('cashier.orders_ready_pay') }}</h3>
          <div v-if="pedidosListosPagar.length === 0" class="empty-state">
            {{ $t('cashier.no_orders_ready') }}
          </div>
          <div v-else class="pedidos-grid">
            <div v-for="pedido in pedidosListosPagar" :key="pedido.id" :class="['pedido-card', `estado-${pedido.estado}`]">
              <div class="card-header">
                <span class="mesa">{{ $t('common.table') }} {{ pedido.mesa_numero }}</span>
                <span class="total">${{ pedido.total }}</span>
              </div>
              <div class="items-count">
                {{ pedido.items_count }} items
              </div>
              
              <div class="pedido-botones">
                <button 
                  @click="verCuentaOnline(pedido.id)" 
                  class="btn btn-sm btn-info"
                >
                  👁️ {{ $t('cashier.view_bill_online') }}
                </button>
                <button 
                  @click="pedirCuenta(pedido)" 
                  class="btn btn-sm btn-secondary"
                >
                  🖨️ {{ $t('cashier.print_bill') }}
                </button>
                <button 
                  @click="seleccionarPedido(pedido)" 
                  class="btn btn-sm btn-primary"
                >
                  {{ $t('cashier.pay') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulario de Pago (Refactorizado) -->
        <div v-if="pedidoSeleccionado" class="section">
          <CajaPaymentForm 
            :pedido="pedidoSeleccionado"
            :metodos-pago="metodoPagos"
            :usuario-id="usuarioStore.usuario.id"
            :saldo-pendiente="saldoPendiente"
            @pago-por-procesar="onPagoPorProcesar"
            @pago-registrado="onPagoRegistrado"
            @cancelar="cancelarPago"
          />
        </div>

        <!-- Historial de Pagos -->
        <div class="section">
          <h3>{{ $t('cashier.payments_today') }}</h3>
          <div v-if="pedidosPagadosHoy.length === 0" class="empty-state">
            {{ $t('cashier.no_payments') }}
          </div>
          <div v-else class="pagos-list">
            <div v-for="pedido in pedidosPagadosHoy" :key="pedido.id" :class="['pago-item', pedido.pagos_multiples ? 'pago-multiple' : '']">
              <div class="pago-info-item">
                <span class="mesa">{{ $t('common.table') }} {{ pedido.mesa_numero }}</span>
                <span class="monto">${{ pedido.total }}</span>
              </div>
              <div class="pago-detalles-extra">
                <span class="metodo-pago-badge" v-if="pedido.pagos_multiples">
                   🔄 MÚLTIPLE
                </span>
                <span class="metodo-pago-badge" v-else-if="pedido.metodo_pago">
                  {{ obtenerEmojiMetodo(pedido.metodo_pago) }} {{ pedido.metodo_pago.toUpperCase() }}
                </span>
                <span class="timestamp">{{ formatearHora(pedido.created_at) }}</span>
                <button @click="verDetallesPago(pedido.id)" class="btn btn-sm btn-info">
                  {{ $t('cashier.view') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal de Detalles del Pago -->
    <div v-if="pagoDetalle" class="modal-overlay" @click.self="cerrarDetallePago">
      <div class="modal-detalle">
        <div class="modal-header">
          <h3>{{ $t('cashier.payment_details') }}</h3>
          <button @click="cerrarDetallePago" class="btn-cerrar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detalle-info">
            <div class="info-row">
              <span>{{ $t('common.table') }}:</span>
              <strong>{{ pagoDetalle.mesa_numero }}</strong>
            </div>
            <div class="info-row" v-if="pagoDetalle.pagos && pagoDetalle.pagos.length > 0">
              <div style="width: 100%;">
                <span><strong>Pagos:</strong></span>
                <ul style="list-style: none; padding: 0; margin-top: 5px;">
                  <li v-for="(pago, pIndex) in pagoDetalle.pagos" :key="pIndex" style="font-size: 0.9em; margin-bottom: 4px; display: flex; justify-content: space-between;">
                    <span>
                      {{ new Date(pago.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }} - 
                      {{ obtenerEmojiMetodo(pago.metodo_pago) }} {{ $te('cashier.methods.' + pago.metodo_pago) ? $t('cashier.methods.' + pago.metodo_pago) : pago.metodo_pago.toUpperCase() }}
                    </span>
                    <strong>${{ Number(pago.monto).toLocaleString() }}</strong>
                  </li>
                </ul>
              </div>
            </div>
            
            <div class="info-row" v-else-if="pagoDetalle.metodo_pago">
              <span>{{ $t('cashier.payment_method') }}:</span>
              <strong>{{ obtenerEmojiMetodo(pagoDetalle.metodo_pago) }} {{ $te('cashier.methods.' + pagoDetalle.metodo_pago) ? $t('cashier.methods.' + pagoDetalle.metodo_pago) : pagoDetalle.metodo_pago.toUpperCase() }}</strong>
            </div>
            <div class="info-row">
              <span>Hora:</span>
              <strong>{{ formatearHora(pagoDetalle.created_at) }}</strong>
            </div>
            <div class="info-row">
              <span>Cajero:</span>
              <strong>{{ usuarioStore.usuario.nombre }}</strong>
            </div>
          </div>

          <div class="detalle-items">
            <h4>Items</h4>
            <div class="items-tabla">
              <div class="item-row header-row">
                <span>Cant.</span>
                <span>Descripción</span>
                <span>Precio</span>
                <span>Total</span>
              </div>
              <div v-for="(item, index) in itemsAgrupados" :key="index" class="item-row">
                <span>{{ item.cantidad }}</span>
                <span>{{ item.nombre }}</span>
                <span>${{ Number(item.precio_unitario).toFixed(2) }}</span>
                <span>${{ Number(item.total).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="detalle-total">
             <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9em; font-weight: normal;">
              <span>{{ $t('ticket.tip') }}:</span>
              <span>${{ Number(pagoDetalle.propina_monto || 0).toLocaleString() }}</span>
            </div>
            <span>TOTAL:</span>
            <strong>${{ pagoDetalle.total }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useUsuarioStore } from '../stores/usuarioStore';
import api from '../api';
import { useNotificaciones } from '../composables/useNotificaciones';
import { useI18n } from 'vue-i18n';
import CajaPaymentForm from './CajaPaymentForm.vue';
import socket from '../socket';

const { t } = useI18n();
const { notificaciones, cerrarNotificacion } = useNotificaciones('facturero');

const pedidoStore = usePedidoStore();
const usuarioStore = useUsuarioStore();

const loading = ref(false);
const pedidoSeleccionado = ref(null);
const pedidosPagadosHoy = ref([]);
const ticketData = ref(null);
const pagoDetalle = ref(null);

const metodoPagos = ref([]);

// ✅ NUEVO: Almacenar temporalmente info del último pago para el ticket
const lastPaymentInfo = ref(null);

const cargarMetodosPago = async () => {
  try {
    const res = await api.getPaymentMethods();
    metodoPagos.value = res.data.filter(m => m.active);
  } catch (err) {
    console.error('Error cargando métodos de pago:', err);
    metodoPagos.value = [
      { name: 'efectivo', label: 'Efectivo', is_digital: false },
      { name: 'tarjeta', label: 'Tarjeta', is_digital: true }
    ];
  }
};

const pedidosListosPagar = computed(() => {
  const listos = pedidoStore.pedidosPorEstado.listo_pagar || [];
  const enCaja = pedidoStore.pedidosPorEstado.en_caja || [];
  return [...listos, ...enCaja].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
});

// Agrupar items por nombre para mostrar cantidades consolidadas
const itemsAgrupados = computed(() => {
  if (!pagoDetalle.value || !pagoDetalle.value.items) return [];
  
  const grupos = {};
  
  pagoDetalle.value.items.forEach(item => {
    const key = `${item.menu_item_id || item.nombre}`;
    
    if (!grupos[key]) {
      grupos[key] = {
        nombre: item.nombre,
        precio_unitario: item.precio_unitario || item.precio || 0,
        cantidad: 0,
        total: 0
      };
    }
    
    grupos[key].cantidad += item.cantidad;
    grupos[key].total += (item.precio_unitario || item.precio || 0) * item.cantidad;
  });
  
  return Object.values(grupos);
});

const actualizarPedidos = async () => {
  loading.value = true;
  try {
    await pedidoStore.cargarPedidosActivos();
    // Cargar pedidos pagados del día por este cajero
    const pedidosHoyRes = await api.getPedidosHoy();
    
    pedidosPagadosHoy.value = pedidosHoyRes.data.filter(p => 
      p.estado === 'pagado' && 
      p.pagos && p.pagos.some(pago => String(pago.cajero_id) === String(usuarioStore.usuario.id))
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    loading.value = false;
  }
};

const saldoPendiente = ref(null);

const seleccionarPedido = (pedido) => {
  pedidoSeleccionado.value = pedido;
  saldoPendiente.value = pedido.pendiente !== undefined ? pedido.pendiente : pedido.total;
};

const cancelarPago = () => {
  pedidoSeleccionado.value = null;
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

// ✅ Agrupa items para el ticket
const prepararTicket = (pedido, tipo, metodo = null, extras = {}) => {
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

  ticketData.value = {
    tipo,
    mesa: pedido.mesa_numero,
    subtotal: subtotal,
    propinaMonto: propinaMonto,
    totalPedido: pedido.total,
    items: itemsFinales,
    cajero: usuarioStore.usuario.nombre,
    metodoPago: metodo,
    montoRecibido: extras.montoRecibido ?? null,
    montoAplicado: extras.montoAplicado ?? null,
    cambio: extras.cambio ?? null,
    pagos: pedido.pagos || []
  };
};

// ✅ NUEVO: Capturar info del pago ANTES de enviarlo al backend
const onPagoPorProcesar = (paymentInfo) => {
  console.log('🚀 Pago por procesar (PRE-envío):', paymentInfo);
  lastPaymentInfo.value = paymentInfo;
  console.log('💾 lastPaymentInfo guardado (PRE-envío):', lastPaymentInfo.value);
};

const onPagoRegistrado = async (evento) => {
    const { data, metodo, montoRecibido, montoAplicado, cambio, esMultiple } = evento;
    const { total_pagado, pendiente } = data;

    // 🔍 DEBUG: Logging para diagnosticar problemas
    console.log('📝 onPagoRegistrado llamado:', {
        total_pagado,
        pendiente,
        'pendiente < 1': pendiente < 1,
        metodo,
        montoRecibido,
        montoAplicado,
        cambio,
        esMultiple,
        data
    });

    // ✅ NUEVO: Guardar info del pago para usarla en el listener de Socket.IO
    lastPaymentInfo.value = {
        metodo,
        montoRecibido,
        montoAplicado,
        cambio,
        esMultiple,
        pedidoId: pedidoSeleccionado.value.id
    };
    
    console.log('💾 lastPaymentInfo guardado:', lastPaymentInfo.value);

    await actualizarPedidos();

    // ✅ CAMBIO: usar pendiente < 1 en vez de <= 0 para manejar redondeos
    if (pendiente < 1) {
        const fullOrderRes = await api.getPedido(pedidoSeleccionado.value.id);
        const fullOrder = fullOrderRes.data;

        prepararTicket(
            fullOrder,
            'pago',
            esMultiple ? 'MULTIPLE' : metodo,
            { montoRecibido, montoAplicado, cambio }
        );

        alert(t('cashier.alert_payment_registered') +
            (esMultiple ? `\n¡Pago Múltiple completado!` : `\nPagado ahora: $${Math.round(montoAplicado).toLocaleString()}`) +
            `\nTotal pagado: $${Math.round(total_pagado).toLocaleString()}\n` +
            `¡Pago completado! Imprimiendo ticket...`
        );

        imprimirContenido(ticketData.value);
        pedidoSeleccionado.value = null; // Cerrar form
    } else {
        alert(t('cashier.alert_payment_registered') +
            `\nPagado ahora: $${Math.round(montoAplicado).toLocaleString()}\n` +
            `Pendiente: $${Math.round(pendiente).toLocaleString()}`
        );
        // Actualizar datos del pedido seleccionado para seguir pagando
        const pedidoActualizado = pedidosListosPagar.value.find(p => p.id === pedidoSeleccionado.value.id);
        if (pedidoActualizado) {
             pedidoSeleccionado.value = { ...pedidoActualizado };
             saldoPendiente.value = pedidoActualizado.pendiente;
        }
    }
};

const imprimirContenido = (data) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('❌ Por favor permite ventanas emergentes para imprimir el ticket');
    return;
  }

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
        <p>${t('ticket.nit')}: ${import.meta.env.VITE_APP_NIT}</p>
        <p>${t('ticket.date')}: ${new Date().toLocaleString()}</p>
        <p>${t('common.table')}: ${data.mesa}</p>
        <p>${t('ticket.server')}: ${data.cajero}</p>
        <div class="divider"></div>
        <p>${data.tipo === 'pago' ? t('ticket.payment_title') : t('ticket.bill_title')}</p>
        ${data.metodoPago ? `<p>${t('ticket.method')}: ${data.metodoPago.toUpperCase()}</p>` : ''}
        <div class="divider"></div>
      </div>

      <div class="items">
        <div class="row" style="font-weight:bold; border-bottom:1px solid black;">
          <span class="col-cant">${t('ticket.qty')}</span>
          <span class="col-desc">${t('ticket.desc')}</span>
          <span class="col-total">${t('ticket.total')}</span>
        </div>
        ${data.items.map(item => `
          <div class="row">
            <span class="col-cant">${item.cantidad}</span>
            <span class="col-desc">${item.nombre}</span>
            <span class="col-total">$${(item.cantidad * item.precio).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>

      <div class="total-section">
        <div class="divider"></div>
        <div class="row">
          <span>${t('ticket.subtotal')}:</span>
          <span>$${Math.round(data.subtotal).toLocaleString()}</span>
        </div>
        <div class="row">
          <span>${t('ticket.tip')} (${data.propinaMonto > 0 ? Math.round((data.propinaMonto / data.subtotal) * 100) : 0}%):</span>
          <span>$${Math.round(data.propinaMonto).toLocaleString()}</span>
        </div>
        <div class="divider"></div>
        <div class="row" style="font-size: 18px;">
          <span>${t('ticket.total').toUpperCase()}:</span>
          <span>$${Math.round(data.totalPedido).toLocaleString()}</span>
        </div>
        ${data.montoRecibido != null ? `
          <div class="row">
            <span>${t('ticket.received')}:</span>
            <span>$${Math.round(data.montoRecibido).toLocaleString()}</span>
          </div>
        ` : ''}
        ${data.cambio != null ? `
          <div class="row">
            <span>${t('ticket.change')}:</span>
            <span>$${Math.round(data.cambio).toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="divider"></div>
      </div>


      ${data.pagos && data.pagos.length > 0 ? `
        <div class="pagos-history" style="margin-top: 10px;">
           <div class="row" style="font-weight:bold;">
            <span>${t('ticket.payment_history') || 'Historial de Pagos'}</span>
          </div>
          <div class="divider"></div>
          ${data.pagos.map(p => `
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
        <p>${t('ticket.tip_suggested')}</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          // setTimeout(() => window.close(), 1000);
        }
      <\/script> 
    <\/body>
    <\/html>
  `;

  printWindow.document.write(contenidoHTML);
  printWindow.document.close();
};

const pedirCuenta = async (pedido) => {
  try {
    const response = await api.imprimirCuenta(pedido.id);
    
    if (response?.data?.content) {
      // Versión simplificada: imprimir directo (sin recibos ni abrir en iframe)
      const contenidoHTML = response.data.content;
      const ventanaImpresion = window.open('', '_blank', 'width=300,height=600');
      ventanaImpresion.document.write(contenidoHTML);
      ventanaImpresion.document.close();
      ventanaImpresion.print();
      ventanaImpresion.close();
    } else {
      alert('Error al generar la cuenta');
    }
  } catch (error) {
    console.error('Error al imprimir cuenta:', error);
    alert('Error al solicitar cuenta: ' + (error.response?.data?.error || error.message));
  }
};

// ✅ NUEVO: Ver cuenta online
const verCuentaOnline = (pedidoId) => {
  const baseUrl = window.location.origin;
  window.open(`${baseUrl}/cuenta/${pedidoId}`, '_blank');
};

const verDetallesPago = async (pedidoId) => {
  try {
    const response = await api.getPedido(pedidoId);
    pagoDetalle.value = response.data;
  } catch (err) {
    console.error('Error cargando detalles:', err);
    alert('❌ Error al cargar detalles del pago');
  }
};

const cerrarDetallePago = () => {
  pagoDetalle.value = null;
};

onMounted(() => {
  actualizarPedidos();
  cargarMetodosPago();
  
  // ✅ NUEVO: Conectar Socket.IO para actualizaciones en tiempo real
  if (!socket.connected) socket.connect();
  
  socket.on('pedido_actualizado', (data) => {
    console.log('📝 Pedido actualizado en caja:', data);
    
    // ✅ NUEVO: Si hay un pedido seleccionado (usuario trabajando), no recargar automáticamente
    if (pedidoSeleccionado.value) {
      console.log('⚠️ Usuario trabajando en pago, marcando actualización pendiente');
      hayActualizacionPendiente.value = true;
    } else {
      // No hay trabajo activo, recargar normalmente
      actualizarPedidos();
    }
  });
  
  socket.on('pedido_pagado', async (data) => {
    console.log('💰 Pago registrado:', data);
    console.log('🔍 lastPaymentInfo actual:', lastPaymentInfo.value);
    
    // Si el pedido se completó (pendiente < 1), preparar para imprimir
    if (data.pendiente < 1 && data.pedido_id === pedidoSeleccionado.value?.id) {
      try {
        // Obtener pedido completo para el ticket
        const fullOrderRes = await api.getPedido(data.pedido_id);
        const fullOrder = fullOrderRes.data;

        // ✅ USAR la info guardada del pago si está disponible
        const paymentInfo = lastPaymentInfo.value?.pedidoId === data.pedido_id 
          ? lastPaymentInfo.value 
          : null;

        console.log('🎫 Payment info para ticket:', paymentInfo);
        console.log('🔄 Comparación pedidoId:', {
          'lastPaymentInfo.pedidoId': lastPaymentInfo.value?.pedidoId,
          'data.pedido_id': data.pedido_id,
          'coinciden': lastPaymentInfo.value?.pedidoId === data.pedido_id
        });

        // Determinar método de pago para el ticket
        const ultimoPago = data.pagos_detalles?.[data.pagos_detalles.length - 1];
        const metodoPago = paymentInfo?.esMultiple 
          ? 'MULTIPLE' 
          : (paymentInfo?.metodo || ultimoPago?.metodo || 'efectivo');
        
        const ticketPaymentData = { 
          montoRecibido: paymentInfo?.montoRecibido || data.monto, 
          montoAplicado: paymentInfo?.montoAplicado || data.monto, 
          cambio: paymentInfo?.cambio || 0
        };
        
        console.log('🎟️ Datos para ticket:', ticketPaymentData);
        
        // Preparar ticket con la info correcta del monto recibido y cambio
        prepararTicket(
          fullOrder,
          'pago',
          metodoPago,
          ticketPaymentData
        );

        alert(t('cashier.alert_payment_registered') +
          (data.pagos_multiples ? `\n¡Pago Múltiple completado!` : `\nPagado ahora: $${Math.round(data.monto).toLocaleString()}`) +
          `\nTotal pagado: $${Math.round(data.total_pagado).toLocaleString()}\n` +
          `¡Pago completado! Imprimiendo ticket...`
        );

        imprimirContenido(ticketData.value);
        pedidoSeleccionado.value = null; // Cerrar form
        
        // Limpiar info temporal del pago
        lastPaymentInfo.value = null;
      } catch (error) {
        console.error('Error al preparar ticket:', error);
      }
    }
    
    actualizarPedidos();
  });
});

onUnmounted(() => {
  socket.off('pedido_actualizado');
  socket.off('pedido_pagado');
});
</script>
<style src="../assets/styles/CajaPanel.css" scoped></style>
