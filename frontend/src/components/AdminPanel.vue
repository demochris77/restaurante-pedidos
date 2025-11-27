<template>
  <div class="admin-panel">
    <!-- Vista de Gestión de Usuarios -->
    <AdminUsers v-if="mostrarUsuarios" @volver="mostrarUsuarios = false" />
    
    <!-- Vista de Editor de Menú/Mesas -->
    <EditorPanel v-else-if="mostrarEditor" @volver="mostrarEditor = false" />

    <!-- Vista Principal del Dashboard -->
    <div v-else class="dashboard-view">
      <div class="panel-header">
        <h2>📊 Panel Administrativo</h2>
        <div class="header-actions">
          <button @click="mostrarEditor = true" class="btn btn-primary">
            🛠️ Editor
          </button>
          <button @click="mostrarUsuarios = true" class="btn btn-primary">
            👥 Usuarios
          </button>
          <button @click="cargarReportes" class="btn btn-secondary" :disabled="loading">
            🔄 Actualizar
          </button>
        </div>
      </div>
    </div>

      <div class="panel-content">
        <div v-if="loading" class="loading">Cargando reportes...</div>

        <template v-else>
        <!-- Estadísticas Diarias -->
        <div class="section">
          <h3>📈 Estadísticas del Día</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">💵</div>
              <div class="stat-value">${{ ventasTotal }}</div>
              <div class="stat-label">Total Ventas</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📦</div>
              <div class="stat-value">{{ pedidosHoy.length }}</div>
              <div class="stat-label">Pedidos</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-value">{{ pedidosPagados.length }}</div>
              <div class="stat-label">Pagados</div>
            </div>
          </div>
        </div>

        <!-- BARRA DE FILTROS -->
        <div class="section filters-section">
          <h3>📅 Filtros de Reporte</h3>
          <div class="filters-row">
            <div class="filter-group">
              <label>Desde:</label>
              <input type="date" v-model="filtroFechaInicio" class="input-date" />
            </div>
            <div class="filter-group">
              <label>Hasta:</label>
              <input type="date" v-model="filtroFechaFin" class="input-date" />
            </div>
            <button @click="aplicarFiltros" class="btn btn-primary">
              🔎 Aplicar Filtros
            </button>
            <button @click="limpiarFiltros" class="btn btn-secondary">
              🧹 Limpiar
            </button>
          </div>
        </div>
        <!-- Desglose por Método de Pago -->
        <div class="section">
          <h3>💳 Métodos de Pago</h3>
          <div class="metodos-grid">
            <div v-for="metodo in detallesVentas" :key="metodo.metodo_pago" class="metodo-card">
              <div class="metodo-header">
                <span class="metodo-nombre">{{ metodo.metodo_pago.toUpperCase() }}</span>
                <span class="metodo-cantidad">{{ metodo.cantidad }} transacciones</span>
              </div>
              <div class="metodo-total">${{ Number(metodo.total).toFixed(2) }}</div>
            </div>
          </div>
        </div>
        <div class="section">
          <h3>📱 Herramientas</h3>
          <button @click="mostrarGeneradorQR = !mostrarGeneradorQR" class="btn btn-secondary">
            📱 {{ mostrarGeneradorQR ? 'Ocultar' : 'Mostrar' }} Generador de QR
          </button>
          <GeneradorQR v-if="mostrarGeneradorQR" />
        </div>

        <!-- Reporte Histórico -->
        <div class="section">
          <h3>📊 Reporte Histórico (Últimos 30 Días)</h3>
          
          <!-- Total Acumulado -->
          <div class="total-acumulado">
            <div class="total-card">
              <div class="total-label">Total Acumulado</div>
              <div class="total-value">${{ Number(totalAcumulado.total_acumulado).toFixed(2) || '0.00' }}</div>
              <div class="total-subtitle">{{ totalAcumulado.total_transacciones || 0 }} transacciones</div>
            </div>
          </div>
          
          <!-- Tabla de Ventas por Día -->
          <div v-if="ventasPorDia.length === 0" class="empty-state">
            Sin datos históricos
          </div>
          <div v-else class="tabla-historico">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Transacciones</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dia in ventasPorDia" :key="dia.fecha">
                  <td>{{ formatearFecha(dia.fecha) }}</td>
                  <td>{{ dia.cantidad_transacciones }}</td>
                  <td class="total-dia">${{ Number(dia.total_dia).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>


        <!-- Detalle de Pedidos -->
        <div class="section">
          <h3>📋 Pedidos Hoy</h3>
          <div v-if="pedidosHoy.length === 0" class="empty-state">
            Sin pedidos hoy
          </div>
          <div v-else class="tabla-pedidos">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Mesa</th>
                  <th>Mesero</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pedido in pedidosHoy" :key="pedido.id">
                  <td>{{ formatearHora(pedido.created_at) }}</td>
                  <td>{{ pedido.mesa_numero }}</td>
                  <td>{{ pedido.mesero }}</td>
                  <td>{{ pedido.items_count }}</td>
                  <td>${{ pedido.total }}</td>
                  <td>
                    <span :class="['estado-badge', `estado-${pedido.estado}`]">
                      {{ pedido.estado.replace('_', ' ').toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <button @click="verDetallesPedido(pedido.id)" class="btn btn-sm btn-info">
                      👁️ Ver
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tiempos de Cocina -->
        <div class="section">
          <h3>⏱️ Tiempos de Cocina</h3>
          
          <div v-if="loadingTiempos" class="loading-small">Cargando estadísticas...</div>
          
          <div v-else-if="tiemposCocina.length > 0" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoría</th>
                  <th>Preparaciones</th>
                  <th>Promedio</th>
                  <th>Estimado</th>
                  <th>Diferencia</th>
                  <th>Min/Max</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in tiemposCocina" :key="stat.menu_item_id">
                  <td><strong>{{ stat.item_nombre }}</strong></td>
                  <td><span class="categoria-badge">{{ stat.categoria }}</span></td>
                  <td class="text-center">{{ stat.total_preparaciones }}</td>
                  <td class="text-center"><strong>{{ Math.round(stat.tiempo_promedio) }} min</strong></td>
                  <td class="text-center">{{ stat.tiempo_estimado || '-' }} min</td>
                  <td class="text-center">
                    <span :class="getDiferenciaClass(stat.diferencia_minutos)">
                      {{ stat.diferencia_minutos > 0 ? '+' : '' }}{{ Math.round(stat.diferencia_minutos) }} min
                    </span>
                  </td>
                  <td class="text-center text-small">
                    {{ stat.tiempo_minimo }}/{{ stat.tiempo_maximo }} min
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-else class="empty-state">
            No hay estadísticas de tiempos para el período seleccionado
          </div>
        </div>
        <!-- Top Platos Más Pedidos -->
        <div class="section">
          <h3>🏆 Top Platos Más Pedidos</h3>
          
          <div v-if="loadingTopPlatos" class="loading-small">Cargando top platos...</div>
          
          <div v-else-if="topPlatos.length > 0" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Plato</th>
                  <th>Categoría</th>
                  <th>Total Pedidos</th>
                  <th>Ingresos Totales</th>
                  <th>Precio Unitario</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(plato, index) in topPlatos" :key="plato.id">
                  <td class="text-center"><strong>{{ index + 1 }}</strong></td>
                  <td><strong>{{ plato.nombre }}</strong></td>
                  <td><span class="categoria-badge">{{ plato.categoria }}</span></td>
                  <td class="text-center"><strong>{{ plato.total_pedidos }}</strong></td>
                  <td class="text-center">${{ Number(plato.ingresos_totales).toFixed(2) }}</td>
                  <td class="text-center">${{ Number(plato.precio).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-else class="empty-state">
            No hay datos de platos pedidos
          </div>
        </div>
      </template>
    </div>

    <!-- Modal de Detalles del Pedido -->
    <div v-if="pedidoDetalle" class="modal-overlay" @click.self="cerrarDetalle">
      <div class="modal-detalle">
        <div class="modal-header">
          <h3>📋 Detalles del Pedido</h3>
          <button @click="cerrarDetalle" class="btn-cerrar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detalle-info">
            <div class="info-row">
              <span>Mesa:</span>
              <strong>{{ pedidoDetalle.mesa_numero }}</strong>
            </div>
            <div class="info-row">
              <span>Estado:</span>
              <span :class="['estado-badge', `estado-${pedidoDetalle.estado}`]">
                {{ pedidoDetalle.estado.replace('_', ' ').toUpperCase() }}
              </span>
            </div>
            <div class="info-row">
              <span>Hora:</span>
              <strong>{{ formatearHora(pedidoDetalle.created_at) }}</strong>
            </div>
            <div class="info-row" v-if="pedidoDetalle.metodo_pago">
              <span>Método de Pago:</span>
              <strong>{{ pedidoDetalle.metodo_pago.toUpperCase() }}</strong>
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
            <strong>${{ pedidoDetalle.total }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../api';
import socket from '../socket';
import GeneradorQR from './GeneradorQR.vue';
import AdminUsers from './AdminUsers.vue';
import EditorPanel from './EditorPanel.vue';

const mostrarGeneradorQR = ref(false);
const mostrarUsuarios = ref(false);
const mostrarEditor = ref(false);


const loading = ref(false);
const detallesVentas = ref([]);
const pedidosHoy = ref([]);
const ventasPorDia = ref([]);
const totalAcumulado = ref({ total_transacciones: 0, total_acumulado: 0 });
const pedidoDetalle = ref(null);

// Tiempos de Cocina
const tiemposCocina = ref([]);
const loadingTiempos = ref(false);
const filtroFechaInicio = ref('');
const filtroFechaFin = ref('');

// Top Platos
const topPlatos = ref([]);
const loadingTopPlatos = ref(false);

const ventasTotal = computed(() => {
  return detallesVentas.value
    .reduce((sum, m) => sum + (Number(m.total) || 0), 0)
    .toFixed(2);
});

const pedidosPagados = computed(() => {
  return pedidosHoy.value.filter(p => p.estado === 'pagado');
});

// Agrupar items por nombre para mostrar cantidades consolidadas
const itemsAgrupados = computed(() => {
  if (!pedidoDetalle.value || !pedidoDetalle.value.items) return [];
  
  const grupos = {};
  
  pedidoDetalle.value.items.forEach(item => {
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
const limpiarFiltros = () => {
    filtroFechaInicio.value = '';
    filtroFechaFin.value = '';
    aplicarFiltros(); // Recarga todo sin filtros (histórico completo)
};

const cargarReportes = async () => {
  loading.value = true;
  try {
    const [ventasRes, pedidosRes, historicoRes] = await Promise.all([
      api.getVentasHoy(),
      api.getPedidosHoy(),
      api.getReporteHistorico()
    ]);
    detallesVentas.value = ventasRes.data.detalles || [];
    pedidosHoy.value = pedidosRes.data || [];
    ventasPorDia.value = historicoRes.data.ventas_por_dia || [];
    totalAcumulado.value = historicoRes.data.total_acumulado || { total_transacciones: 0, total_acumulado: 0 };
  } catch (err) {
    console.error('Error cargando reportes:', err);
  } finally {
    loading.value = false;
  }
};

const formatearFecha = (fecha) => {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatearHora = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const verDetallesPedido = async (pedidoId) => {
  try {
    const response = await api.getPedido(pedidoId);
    pedidoDetalle.value = response.data;
  } catch (err) {
    console.error('Error cargando detalles:', err);
    alert('❌ Error al cargar detalles del pedido');
  }
};

const cerrarDetalle = () => {
  pedidoDetalle.value = null;
};

// Cargar tiempos de cocina
const cargarTiemposCocina = async () => {
  loadingTiempos.value = true;
  try {
    const params = {};
    if (filtroFechaInicio.value) params.fecha_inicio = filtroFechaInicio.value;
    if (filtroFechaFin.value) params.fecha_fin = filtroFechaFin.value;
    
    const response = await api.getTiemposCocina(params);
    tiemposCocina.value = response.data;
  } catch (err) {
    console.error('Error cargando tiempos de cocina:', err);
  } finally {
    loadingTiempos.value = false;
  }
};

// Helper para clase de diferencia
const getDiferenciaClass = (diferencia) => {
  if (!diferencia) return '';
  if (diferencia > 5) return 'diferencia-alta';
  if (diferencia < -3) return 'diferencia-baja';
  return 'diferencia-normal';
};

// Cargar top platos
// Modificar esta función existente
const cargarTopPlatos = async () => {
  loadingTopPlatos.value = true;
  try {
    const params = {};
    // Usamos las mismas variables de filtro que ya tienes
    if (filtroFechaInicio.value) params.fecha_inicio = filtroFechaInicio.value;
    if (filtroFechaFin.value) params.fecha_fin = filtroFechaFin.value;

    // Pasamos params a la api
    const response = await api.getTopPlatos(10, params);
    topPlatos.value = response.data;
  } catch (err) {
    console.error('Error cargando top platos:', err);
  } finally {
    loadingTopPlatos.value = false;
  }
};

// Modificar el botón de filtrar para que actualice AMBAS tablas
const aplicarFiltros = () => {
    cargarTiemposCocina();
    cargarTopPlatos();
};


// ================= REAL-TIME =================
const setupRealTime = () => {
    if (!socket.connected) socket.connect();

    socket.on('nuevo_pedido', (nuevoPedido) => {
        // Agregar a la lista de hoy
        pedidosHoy.value.unshift({
            ...nuevoPedido,
            mesero: '...' // El nombre del mesero no viene en el evento, se actualizará al recargar o podríamos buscarlo si tuviéramos la lista de usuarios
        });
    });

    socket.on('pedido_actualizado', ({ id, estado }) => {
        const pedido = pedidosHoy.value.find(p => p.id === id);
        if (pedido) {
            pedido.estado = estado;
        }
    });

    socket.on('pedido_pagado', ({ pedido_id, estado, monto, metodo_pago }) => {
        // Actualizar estado del pedido
        const pedido = pedidosHoy.value.find(p => p.id === pedido_id);
        if (pedido) {
            pedido.estado = estado;
        }

        // Actualizar estadísticas de ventas
        const metodoExistente = detallesVentas.value.find(d => d.metodo_pago === metodo_pago);
        if (metodoExistente) {
            metodoExistente.cantidad = Number(metodoExistente.cantidad) + 1;
            metodoExistente.total = Number(metodoExistente.total) + Number(monto);
        } else {
            detallesVentas.value.push({
                metodo_pago,
                cantidad: 1,
                total: Number(monto)
            });
        }

        // Actualizar histórico (simple aproximación visual, para exactitud mejor recargar)
        totalAcumulado.value.total_transacciones = Number(totalAcumulado.value.total_transacciones) + 1;
        totalAcumulado.value.total_acumulado = Number(totalAcumulado.value.total_acumulado) + Number(monto);
    });
};

onMounted(() => {
  cargarReportes();
  cargarTiemposCocina(); // Cargar estadísticas de tiempos
  cargarTopPlatos(); // Cargar top platos
  setupRealTime();
});

onUnmounted(() => {
    socket.off('nuevo_pedido');
    socket.off('pedido_actualizado');
    socket.off('pedido_pagado');
});
</script>
<style src="../assets/styles/AdminPanel.css" scoped></style>
