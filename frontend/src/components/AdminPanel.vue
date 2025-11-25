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

        <!-- Desglose por Método de Pago -->
        <div class="section">
          <h3>💳 Métodos de Pago</h3>
          <div class="metodos-grid">
            <div v-for="metodo in detallesVentas" :key="metodo.metodo_pago" class="metodo-card">
              <div class="metodo-header">
                <span class="metodo-nombre">{{ metodo.metodo_pago.toUpperCase() }}</span>
                <span class="metodo-cantidad">{{ metodo.cantidad }} transacciones</span>
              </div>
              <div class="metodo-total">${{ metodo.total.toFixed(2) }}</div>
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
              <div class="total-value">${{ totalAcumulado.total_acumulado?.toFixed(2) || '0.00' }}</div>
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
                  <td class="total-dia">${{ dia.total_dia.toFixed(2) }}</td>
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
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
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

const ventasTotal = computed(() => {
  return detallesVentas.value
    .reduce((sum, m) => sum + (Number(m.total) || 0), 0)
    .toFixed(2);
});

const pedidosPagados = computed(() => {
  return pedidosHoy.value.filter(p => p.estado === 'pagado');
});

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
  setupRealTime();
});

onUnmounted(() => {
    socket.off('nuevo_pedido');
    socket.off('pedido_actualizado');
    socket.off('pedido_pagado');
});
</script>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-card {
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.metodos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.metodo-card {
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-bg);
}

.metodo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metodo-nombre {
  font-weight: 700;
  color: var(--color-text);
}

.metodo-cantidad {
  font-size: 12px;
  color: #999;
}

.metodo-total {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-success);
}

.tabla-pedidos {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--color-bg);
}

th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--color-border);
  font-size: 14px;
}

td {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

tr:hover {
  background: var(--color-bg);
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

.estado-pagado {
  background: #bbf7d0;
  color: #065f46;
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
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .metodos-grid {
    grid-template-columns: 1fr;
  }

  table {
    font-size: 12px;
  }

  th, td {
    padding: 8px;
  }
}

.total-acumulado {
  margin-bottom: 24px;
}

.total-card {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
}

.total-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.total-value {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 4px;
}

.total-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

.tabla-historico {
  overflow-x: auto;
}

.total-dia {
  font-weight: 700;
  color: var(--color-success);
}
</style>
