<template>
  <div class="qr-component">
    <img v-if="qrSrc" :src="qrSrc" alt="QR Code" :style="{ width: size + 'px', height: size + 'px' }" />
    <div v-else class="loading">Generando QR...</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  valor: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 200
  }
});

const qrSrc = ref('');

const generarQR = async () => {
  try {
    qrSrc.value = await QRCode.toDataURL(props.valor, {
      width: props.size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generando QR:', err);
  }
};

watch(() => props.valor, generarQR);

onMounted(generarQR);
</script>

<style scoped>
.qr-component {
  display: flex;
  justify-content: center;
  align-items: center;
}
.loading {
  font-size: 12px;
  color: #666;
}
img {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
