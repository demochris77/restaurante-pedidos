<template>
  <div class="cuenta-page" v-if="pedido">
    <header class="cuenta-header">
      <h1>Restaurante Sazón de la Sierra</h1>
      <p>Mesa {{ pedido.mesa_numero }}</p>
      <p>{{ new Date().toLocaleString('es-CO') }}</p>
    </header>

    <section class="cuenta-items">
      <div class="cuenta-row header">
        <span>Cant.</span>
        <span>Descripción</span>
        <span>Total</span>
      </div>
      <div
        v-for="(item, idx) in itemsAgrupados"
        :key="idx"
        class="cuenta-row"
      >
        <span>{{ item.cantidad }}</span>
        <span>{{ item.nombre }}</span>
        <span>${{ (item.cantidad * item.precio).toFixed(2) }}</span>
      </div>
    </section>

    <section class="cuenta-total">
      <div class="cuenta-row">
        <span>Total</span>
        <span>${{ pedido.total.toFixed(2) }}</span>
      </div>
    </section>

    <footer class="cuenta-footer">
      <button @click="window.print()" class="btn-print">🖨️ Imprimir (opcional)</button>
      <p>¡Gracias por su visita!</p>
    </footer>
  </div>

  <div v-else class="cuenta-loading">
    Cargando cuenta...
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';

const route = useRoute();
const pedido = ref(null);
const items = ref([]);

const itemsAgrupados = computed(() => {
  const grupos = {};
  (items.value || []).forEach(item => {
    const key = item.menu_item_id || item.nombre;
    if (!grupos[key]) {
      grupos[key] = {
        nombre: item.nombre,
        precio: Number(item.precio_unitario || item.precio || 0),
        cantidad: 0,
      };
    }
    grupos[key].cantidad += (item.cantidad || 1);
  });
  return Object.values(grupos);
});

onMounted(async () => {
  const pedidoId = route.params.id;

  try {
    // ✅ Usar el endpoint público, igual que PedidoStatus
    const res = await api.getPedidoStatusPublico(pedidoId);
    pedido.value = res.data.pedido;
    items.value = res.data.items || [];
  } catch (err) {
    console.error('Error cargando pedido para cuenta:', err);
  }
});
</script>

<style scoped>
.cuenta-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  color: #111827;
}

.cuenta-header {
  text-align: center;
  margin-bottom: 16px;
}

.cuenta-header h1 {
  font-size: 18px;
  margin-bottom: 4px;
}

.cuenta-items, .cuenta-total {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.cuenta-row {
  display: grid;
  grid-template-columns: 40px 1fr 80px;
  font-size: 14px;
  padding: 4px 0;
}

.cuenta-row.header {
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 4px;
}

.cuenta-row span:last-child {
  text-align: right;
}

.cuenta-footer {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  margin-top: 12px;
}

.btn-print {
  margin-bottom: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: #4b5563;
  color: white;
  font-size: 14px;
}

@media print {
  .btn-print { display: none; }
  .cuenta-page { background: white; }
}
</style>
