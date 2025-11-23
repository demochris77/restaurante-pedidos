<template>
  <div class="generador-qr">
    <div class="panel-header">
      <h2>📱 Generador de QR</h2>
    </div>

    <div class="panel-content">
      <div class="opciones">
        <button @click="generarQRMesas" class="btn btn-primary btn-grande">
          🪑 Generar QR Mesas
        </button>
        <button @click="generarQRMenu" class="btn btn-secondary btn-grande">
          🍽️ Generar QR Menú
        </button>
      </div>

      <div v-if="loading" class="loading">
        Generando QR...
      </div>

      <!-- QR de Mesas -->
      <div v-if="qrMesas.length > 0" class="section">
        <h3>🪑 QR de Mesas</h3>
        <p class="instrucciones">Imprime estos QR y pégalos en cada mesa</p>
        <div class="qr-grid">
          <div v-for="mesa in qrMesas" :key="mesa.numero" class="qr-item">
            <img :src="mesa.qr" :alt="`Mesa ${mesa.numero}`" />
            <p>Mesa {{ mesa.numero }}</p>
            <button @click="descargarQR(mesa.qr, `mesa-${mesa.numero}`)" class="btn btn-sm btn-secondary">
              ⬇️ Descargar
            </button>
          </div>
        </div>
      </div>

      <!-- QR de Menú -->
      <div v-if="qrMenu.length > 0" class="section">
        <h3>🍽️ QR de Menú</h3>
        <p class="instrucciones">Imprime estos QR para que comensales escaneen el menú</p>
        <div class="qr-grid">
          <div v-for="item in qrMenu" :key="item.id" class="qr-item">
            <img :src="item.qr" :alt="item.nombre" />
            <p>{{ item.nombre }}</p>
            <span class="precio">${{ item.precio }}</span>
            <button @click="descargarQR(item.qr, item.nombre)" class="btn btn-sm btn-secondary">
              ⬇️ Descargar
            </button>
          </div>
        </div>
      </div>

      <div v-if="qrMesas.length === 0 && qrMenu.length === 0 && !loading" class="empty-state">
        Haz click en un botón para generar QR
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import QRCode from 'qrcode';
import api from '../api';

const qrMesas = ref([]);
const qrMenu = ref([]);
const loading = ref(false);

const generarQRMesas = async () => {
  loading.value = true;
  qrMesas.value = [];
  
  try {
    const mesasResponse = await api.getMesas();
    
    for (const mesa of mesasResponse.data) {
      // Generar datos del QR
      const datosQR = {
        tipo: 'mesa',
        mesa_numero: mesa.numero,
        restaurante: 'Sierra Nevada'
      };
      
      // Convertir a QR
      const qr = await QRCode.toDataURL(JSON.stringify(datosQR), {
        width: 300,
        margin: 10,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      qrMesas.value.push({
        numero: mesa.numero,
        qr: qr
      });
    }
    
    console.log('✅ QR de mesas generados');
  } catch (err) {
    console.error('❌ Error generando QR mesas:', err);
    alert('Error generando QR de mesas');
  } finally {
    loading.value = false;
  }
};

const generarQRMenu = async () => {
  loading.value = true;
  qrMenu.value = [];
  
  try {
    const menuResponse = await api.getMenu();
    const items = menuResponse.data.slice(0, 10); // Primeros 10 items
    
    for (const item of items) {
      // Generar datos del QR
      const datosQR = {
        tipo: 'menu',
        menu_item_id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        restaurante: 'Sierra Nevada'
      };
      
      // Convertir a QR
      const qr = await QRCode.toDataURL(JSON.stringify(datosQR), {
        width: 300,
        margin: 10,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      qrMenu.value.push({
        id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        qr: qr
      });
    }
    
    console.log('✅ QR de menú generados');
  } catch (err) {
    console.error('❌ Error generando QR menú:', err);
    alert('Error generando QR de menú');
  } finally {
    loading.value = false;
  }
};

const descargarQR = (qrDataUrl, nombre) => {
  // Crear link para descargar
  const link = document.createElement('a');
  link.href = qrDataUrl;
  link.download = `qr-${nombre}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<style scoped>
.generador-qr {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-header h2 {
  margin: 0;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.opciones {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-grande {
  padding: 16px 24px;
  font-size: 16px;
  height: auto;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.instrucciones {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

.qr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.qr-item {
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qr-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.qr-item img {
  width: 100%;
  height: auto;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.qr-item p {
  margin: 0;
  font-weight: 600;
  font-size: 16px;
}

.precio {
  color: var(--color-success);
  font-weight: 700;
  font-size: 18px;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 12px;
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  background: var(--color-bg);
  border-radius: 8px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

@media (max-width: 768px) {
  .qr-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .panel-header {
    flex-direction: column;
    gap: 12px;
  }

  .opciones {
    flex-direction: column;
  }

  .btn-grande {
    width: 100%;
  }
}
</style>
