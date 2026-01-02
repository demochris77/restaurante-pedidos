<template>
  <div class="customer-welcome">
    <div class="welcome-content">
      <div class="logo-area">
        <div class="logo-circle">
          <UtensilsCrossed :size="48" class="logo-icon" />
        </div>
        <h1>{{ restaurantName ? $t('home.welcome_to') + ' ' + restaurantName : $t('home.welcome') }}</h1>
        <p class="table-info">{{ $t('common.table') }} {{ tableId }}</p>
      </div>
      
      <div class="action-area">
        <p class="instruction">{{ $t('customer.start_instruction') }}</p>
        <button @click="startOrder" class="btn-start">
          {{ $t('customer.start_button') }}
          <ArrowRight :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePedidoStore } from '@/stores/pedidoStore';
import { UtensilsCrossed, ArrowRight } from 'lucide-vue-next';
import api from '@/api';

const route = useRoute();
const router = useRouter();
const pedidoStore = usePedidoStore();

const tableId = computed(() => route.params.tableId);
const restaurantName = ref(import.meta.env.VITE_APP_TITLE || 'Restaurante');

onMounted(async () => {
  try {
    const response = await api.getConfig();
    if (response.data) {
      restaurantName.value = response.data.nombre || restaurantName.value;
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
});

const startOrder = () => {
  // Save table context and navigate to menu
  // In a real app we might validate the tableId here or start a session
  router.push(`/mesa/${tableId.value}/menu`);
};
</script>

<style scoped>
.customer-welcome {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--theme-color, #ff6b6b) 0%, var(--background-color, #ee5253) 100%);
  color: white;
}

.welcome-content {
  width: 100%
;
  max-width: 400px;
  animation: slideUp 0.6s ease-out;
}

.logo-circle {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  backdrop-filter: blur(10px);
}

.logo-icon {
  color: white;
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  letter-spacing: -0.5px;
  text-wrap: balance; /* Prevent widow words */
  line-height: 1.2;
}

.table-info {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 3rem;
  font-weight: 500;
}

.instruction {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  opacity: 0.9;
}

.btn-start {
  width: 100%;
  padding: 1.2rem;
  background: white;
  color: var(--theme-color, #ff6b6b);
  border: none;
  border-radius: 16px;
  font-size: 1.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.btn-start:active {
  transform: scale(0.98);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
