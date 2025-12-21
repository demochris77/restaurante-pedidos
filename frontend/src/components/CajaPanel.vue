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
              🔹 Pago parcial, quedará saldo pendiente.
            </div>

          </div>

          <div class="botones-pago">
           <button
            @click="procesarPago"
            class="btn btn-success btn-full"
            :disabled="!metodoSeleccionado || (metodoSeleccionado === 'efectivo' && (!montoRecibido || montoRecibido <= 0))"
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
                <button @click="verDetallesPago(pedido.id)" class="btn btn-sm btn-info">
                  👁️ Ver
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
          <h3>💳 Detalles del Pago</h3>
          <button @click="cerrarDetallePago" class="btn-cerrar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detalle-info">
            <div class="info-row">
              <span>Mesa:</span>
              <strong>{{ pagoDetalle.mesa_numero }}</strong>
            </div>
            <div class="info-row" v-if="pagoDetalle.metodo_pago">
              <span>Método de Pago:</span>
              <strong>{{ obtenerEmojiMetodo(pagoDetalle.metodo_pago) }} {{ pagoDetalle.metodo_pago.toUpperCase() }}</strong>
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
            <h4>Items del Pedido</h4>
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
            <span>TOTAL:</span>
            <strong>${{ pagoDetalle.total }}</strong>
          </div>
        </div>
      </div>
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
const pagoDetalle = ref(null);

const metodoPagos = ['efectivo', 'tarjeta', 'nequi', 'otro_digital'];

const pedidosListosPagar = computed(() => {
  const listos = pedidoStore.pedidosPorEstado.listo_pagar || [];
  const enCaja = pedidoStore.pedidosPorEstado.en_caja || [];
  return [...listos, ...enCaja].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
});
const pedidosPagados = computed(() => pedidoStore.pedidosPorEstado.pagado);

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

// ✅ FUNCIÓN CORREGIDA: Agrupa items para el ticket
const prepararTicket = (pedido, tipo, metodo = null) => {
  // Lógica de agrupación
  const itemsAgrupadosParaTicket = {};
  
  (pedido.items || []).forEach(item => {
    // Usamos ID del menú o nombre como clave única
    const key = item.menu_item_id || item.nombre;
    
    if (!itemsAgrupadosParaTicket[key]) {
      itemsAgrupadosParaTicket[key] = {
        nombre: item.nombre,
        precio: Number(item.precio_unitario || item.precio || 0),
        cantidad: 0
      };
    }
    
    // Sumamos cantidad
    itemsAgrupadosParaTicket[key].cantidad += (item.cantidad || 1);
  });

  // Convertir objeto agrupado a array
  const itemsFinales = Object.values(itemsAgrupadosParaTicket);

  ticketData.value = {
    tipo,
    mesa: pedido.mesa_numero,
    total: pedido.total,
    items: itemsFinales, // Usamos la lista agrupada
    cajero: usuarioStore.usuario.nombre,
    metodoPago: metodo
  };
};


// ✅ FUNCIÓN CORREGIDA (Escapando etiquetas)
const imprimirContenido = (data) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('❌ Por favor permite ventanas emergentes para imprimir el ticket');
    return;
  }

  const contenidoHTML = `
    <html>
    <head>
      <title>Ticket - Restaurante Sazón de la Sierra</title>
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
        <h3>RESTAURANTE SAZÓN DE LA SIERRA</h3>
        <p>NIT: 900.123.456-7</p>
        <p>Fecha: ${new Date().toLocaleString()}</p>
        <p>Mesa: ${data.mesa}</p>
        <p>Cajero: ${data.cajero}</p>
        <div class="divider"></div>
        <p>${data.tipo === 'pago' ? 'COMPROBANTE DE PAGO' : 'CUENTA DE COBRO'}</p>
        ${data.metodoPago ? `<p>Método: ${data.metodoPago.toUpperCase()}</p>` : ''}
        <div class="divider"></div>
      </div>

      <div class="items">
        <div class="row" style="font-weight:bold; border-bottom:1px solid black;">
          <span class="col-cant">Cant</span>
          <span class="col-desc">Desc</span>
          <span class="col-total">Total</span>
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
          <span>TOTAL:</span>
          <span>$${data.total}</span>
        </div>
        <div class="divider"></div>
      </div>

      <div class="footer">
        <p>¡Gracias por su visita!</p>
        <p>Propina voluntaria sugerida</p>
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
  // ⬆️ FIJATE ARRIBA: He puesto la barra invertida \ antes de las barras /

  printWindow.document.write(contenidoHTML);
  printWindow.document.close();
};

const pedirCuenta = async (pedido) => {
  try {
    // 1. Preparar datos
    prepararTicket(pedido, 'cuenta');
    
    // 2. Imprimir usando ventana nueva (Funciona en móvil)
    imprimirContenido(ticketData.value);
    
    // 3. Actualizar estado
    await pedidoStore.actualizarEstadoPedido(pedido.id, 'en_caja');
    
  } catch (err) {
    console.error(err);
    alert('❌ Error al procesar cuenta');
  }
};

const procesarPago = async () => {
  if (!pedidoSeleccionado.value || !metodoSeleccionado.value) return;

  // Monto que se va a registrar en esta transacción
  let monto = 0;

  if (metodoSeleccionado.value === 'efectivo') {
    if (!montoRecibido.value || montoRecibido.value <= 0) {
      alert('Ingresa un monto válido en efectivo');
      return;
    }
    monto = Number(montoRecibido.value);
  } else {
    // Por ahora: para Nequi / tarjeta / otro_digital registras el total pendiente
    // Más abajo calculamos pendiente a partir de pagos previos (cuando expongas pagos)
    monto = Number(pedidoSeleccionado.value.total);
  }

  try {
    const res = await api.registrarPago(
      pedidoSeleccionado.value.id,
      usuarioStore.usuario.id,
      monto,
      metodoSeleccionado.value
    );

    // res.data trae: total_pagado, total_pedido, pendiente, nuevo_estado
    const { total_pagado, total_pedido, pendiente } = res.data;

    // Preparar ticket con el monto que se pagó en ESTA transacción
    prepararTicket(
      { ...pedidoSeleccionado.value, total: monto },
      'pago',
      metodoSeleccionado.value
    );

    alert(
      `✅ Pago registrado.\n` +
      `Pagado ahora: $${monto}\n` +
      `Total pagado: $${total_pagado}\n` +
      `Pendiente: $${pendiente}`
    );

    imprimirContenido(ticketData.value);

    cancelarPago();
    await actualizarPedidos();
  } catch (err) {
    console.error(err);
    alert('❌ Error al registrar pago');
  }
};
;

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
});
</script>
<style src="../assets/styles/CajaPanel.css" scoped></style>
