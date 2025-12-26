<template>
  <div class="cuenta-container">
    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ $t('bill.loading') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error">
      <div class="icon">❌</div>
      <h3>{{ $t('bill.error_title') }}</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Cuenta OK -->
    <div v-else-if="pedido" class="cuenta-content">
      <div class="header">
        <h1>🧾 {{ $t('bill.title') }} {{ pedido.mesa_numero }}</h1>
        <div class="pedido-id">{{ $t('bill.order_id') }}{{ pedido.id.slice(-8) }}</div>
        
        <!-- ✅ NUEVO: Botón de navegación -->
        <button @click="volverAtras" class="btn-back">
          ⬅️ {{ esMeseroLogueado ? $t('waiter.back_to_panel') : $t('waiter.back_to_order_status') }}
        </button>
      </div>

      <!-- Estado del Pedido -->
      <div class="status-card">
        <div class="status-info">
          <span class="status-label">{{ $t('bill.status') }}:</span>
          <span class="status-value">{{ getEstadoTexto(pedido.estado) }}</span>
        </div>
        <div class="status-info">
          <span class="status-label">{{ $t('bill.total') }}:</span>
          <span class="status-value">${{ total.toLocaleString() }}</span>
        </div>
        <div class="status-info">
          <span class="status-label">{{ $t('bill.date') }}:</span>
          <span class="status-value">{{ formatFecha(pedido.created_at) }}</span>
        </div>
      </div>

      <!-- Items Agrupados -->
      <div class="items-section">
        <h3>{{ $t('bill.details_title') }}</h3>
        <div class="items-list">
          <div v-for="item in itemsAgrupados" :key="item.nombre" class="item-row">
            <div class="item-info">
              <span class="item-name">{{ item.nombre }}</span>
              <span class="item-qty">x{{ item.cantidad }}</span>
            </div>
            <div class="item-price">${{ (item.precio * item.cantidad).toLocaleString() }}</div>
          </div>
        </div>
        <div class="total-section">
          <div class="subtotal-row">
            <span>{{ $t('bill.subtotal') }}:</span>
            <span>${{ (pedido.subtotal || total).toLocaleString() }}</span>
          </div>
          <div class="subtotal-row">
            <span>{{ $t('bill.tip') }} ({{ calcularPorcentajePropina() }}%):</span>
            <span>${{ (pedido.propina_monto || 0).toLocaleString() }}</span>
          </div>
          <div class="divider"></div>
          <div class="total-row">
            <span>{{ $t('bill.total_pay') }}:</span>
            <span class="total-amount">${{ total.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="actions-section" v-if="pedido.estado === 'servido'">
        <button 
          @click="pedirCuenta" 
          class="btn-pedir-cuenta"
          :disabled="cuentaSolicitada"
        >
          {{ cuentaSolicitada ? $t('bill.requested_btn') : ('💳 ' + $t('bill.request_btn')) }}
        </button>
        <p v-if="cuentaSolicitada" class="cuenta-solicitada-msg">
          {{ $t('bill.requested_msg') }}
        </p>
      </div>

      <div class="footer">
      <div class="footer">
        <p>{{ $t('bill.footer') }} {{ title }}</p>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import socket from '../socket';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const title = import.meta.env.VITE_APP_TITLE;

const pedido = ref(null);
const items = ref([]);
const loading = ref(true);
const error = ref(null);
const cuentaSolicitada = ref(false);

// ✅ Detectar ruta MANUALMENTE (igual que PedidoStatus)
const path = window.location.pathname;
const pathParts = path.split('/');
const cuentaId = pathParts[2]; // ID después de /cuenta/

// ✅ NUEVO: Detectar si es usuario logueado (cualquier rol)
const esMeseroLogueado = ref(false);

const volverAtras = () => {
  if (esMeseroLogueado.value) {
    // Usuario logueado (cualquier rol): volver al panel principal
    window.location.href = '/';
  } else {
    // Cliente público: volver a order status  
    window.location.href = `/pedido/${cuentaId}/status`;
  }
};

// Detectar si está logueado
const detectarLogin = () => {
  try {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    esMeseroLogueado.value = !!(token && usuario);
  } catch {
    esMeseroLogueado.value = false;
  }
};

const itemsAgrupados = computed(() => {
  const grupos = {};
  (items.value || []).forEach(item => {
    const key = item.nombre; // o item.id/menu_item_id si lo agregas
    if (!grupos[key]) {
      grupos[key] = {
        nombre: item.nombre,
        precio: Number(item.precio_unitario || 0), // ✅ usa precio_unitario
        cantidad: 0,
      };
    }
    grupos[key].cantidad += (item.cantidad || 1);
  });
  return Object.values(grupos);
});

const total = computed(() => {
  // Usar el total del pedido (que incluye propina) en lugar de calcularlo
  return parseFloat(pedido.value?.total || 0);
});


const cargarPedido = async () => {
  loading.value = true;
  error.value = null;
  
  console.log('🎯 Cuenta ID detectado:', cuentaId); // ✅ DEBUG
  
  try {
    const response = await api.getPedidoStatusPublico(cuentaId);
    pedido.value = response.data.pedido;
    items.value = response.data.items || [];
    console.log('✅ Pedido cargado:', pedido.value.id); // ✅ DEBUG
  } catch (err) {
    console.error('❌ Error cargando cuenta:', err);
    error.value = t('bill.error_msg');
  } finally {
    loading.value = false;
  }
};

const getEstadoTexto = (estado) => {
  const textos = {
    nuevo: t('status.nuevo') || 'Recibido',
    en_cocina: t('status.en_cocina') || 'Preparando',
    listo: t('status.listo') || 'Listo',
    servido: t('status.servido') || 'Servido ✅',
    pagado: t('status.pagado') || 'Pagado 💰'
  };
  return textos[estado] || estado;
};

const formatFecha = (fecha) => {
  return new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const pedirCuenta = () => {
  if (!pedido.value || cuentaSolicitada.value) return;
  
  cuentaSolicitada.value = true;
  
  socket.emit('solicitar_cuenta', {
    pedido_id: pedido.value.id,
    mesa_numero: pedido.value.mesa_numero,
    mesero_id: pedido.value.usuario_mesero_id
  });
  
  alert(t('bill.alert_requested'));
};

const calcularPorcentajePropina = () => {
  if (!pedido.value || !pedido.value.subtotal || !pedido.value.propina_monto) return 10;
  const subtotal = parseFloat(pedido.value.subtotal);
  const propina = parseFloat(pedido.value.propina_monto);
  if (subtotal === 0) return 10;
  return Math.round((propina / subtotal) * 100);
};

onMounted(() => {
  if (cuentaId) {
    cargarPedido();
    detectarLogin(); // ✅ Detectar si está logueado
  } else {
    error.value = t('bill.invalid_id');
    loading.value = false;
  }
});
</script>

<style scoped>
.cuenta-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Inter', sans-serif;
  color: white;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
  gap: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error .icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
  font-weight: 700;
}

.pedido-id {
  background: rgba(255,255,255,0.2);
  padding: 8px 16px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 500;
}

/* ✅ NUEVO: Back button */
.btn-back {
  margin-top: 16px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255,255,255,0.3);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.btn-back:hover {
  background: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-2px);
}

.status-card {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(255,255,255,0.2);
}

.status-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.status-info:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: 500;
  opacity: 0.9;
}

.status-value {
  font-weight: 700;
  font-size: 18px;
}

.items-section {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255,255,255,0.2);
}

.items-section h3 {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
}

.items-list {
  margin-bottom: 24px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-weight: 600;
  font-size: 16px;
}

.item-qty {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
}

.item-price {
  font-weight: 700;
  font-size: 18px;
}

.total-section {
  border-top: 2px solid rgba(255,255,255,0.3);
  padding-top: 16px;
}

.subtotal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  opacity: 0.9;
}

.divider {
  border-top: 1px dashed rgba(255,255,255,0.5);
  margin: 12px 0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
  font-weight: 700;
}

.total-amount {
  font-size: 28px;
  color: #ffd700;
}

.actions-section {
  margin: 32px 0;
}

.btn-pedir-cuenta {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 18px 32px;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.btn-pedir-cuenta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.5);
}

.btn-pedir-cuenta:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
}

.cuenta-solicitada-msg {
  margin-top: 12px;
  color: #059669;
  font-size: 14px;
  font-weight: 600;
}

.footer {
  text-align: center;
  margin-top: 40px;
  opacity: 0.9;
  font-size: 14px;
}

@media (max-width: 480px) {
  .cuenta-container {
    padding: 16px;
  }
  
  .header h1 {
    font-size: 24px;
  }
}
</style>
