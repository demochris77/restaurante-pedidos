<template>
  <div class="qr-scanner-container">
    <div v-if="!tipo" class="tipo-selector">
      <h2>🔍 Escanear QR</h2>
      <p>¿Qué deseas escanear?</p>
      <div class="botones">
        <button @click="tipo = 'menu'" class="btn btn-primary btn-grande">
          📱 Menú para Comensal
        </button>
        <button @click="tipo = 'mesa'" class="btn btn-secondary btn-grande">
          🪑 Mesa (Mesero)
        </button>
      </div>
    </div>

    <div v-else class="scanner-activo">
      <div class="header">
        <button @click="tipo = null" class="btn-volver">← Atrás</button>
        <h3>{{ tipo === 'menu' ? '📱 Menú' : '🪑 Mesa' }}</h3>
      </div>

      <div id="qr-reader"></div>

      <div v-if="resultado" class="resultado">
        <div v-if="tipo === 'menu'" class="menu-resultado">
          <h4>{{ resultado.nombre }}</h4>
          <p>${{ resultado.precio }}</p>
          <p>⏱️ {{ resultado.tiempo_preparacion_min }} min</p>
        </div>
        <div v-else class="mesa-resultado">
          <h4>Mesa {{ resultado.numero }}</h4>
          <p>Capacidad: {{ resultado.capacidad }}</p>
        </div>
        <button @click="resultado = null" class="btn btn-secondary">
          Escanear otro
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Html5QrcodeScanner from 'html5-qrcode';
import api from '../api';

const tipo = ref(null);
const resultado = ref(null);
let scanner = null;

onMounted(() => {
  // Scanner se inicializa cuando tipo cambia
});

const iniciarScanner = () => {
  if (scanner) scanner.clear();

  scanner = new Html5QrcodeScanner(
    'qr-reader',
    { fps: 10, qrbox: { width: 250, height: 250 } },
    false
  );

  scanner.render(onScanSuccess, onScanError);
};

const onScanSuccess = async (decodedText) => {
  try {
    const data = JSON.parse(decodedText);

    if (tipo.value === 'menu') {
      // Buscar item en menú
      const menuResponse = await api.getMenu();
      const item = menuResponse.data.find(m => m.id === data.menu_item_id);
      if (item) {
        resultado.value = item;
        scanner.clear();
      }
    } else if (tipo.value === 'mesa') {
      // Buscar mesa
      const mesasResponse = await api.getMesas();
      const mesa = mesasResponse.data.find(m => m.numero === parseInt(data.mesa_numero));
      if (mesa) {
        resultado.value = mesa;
        scanner.clear();
      }
    }
  } catch (err) {
    console.log('QR no es JSON válido:', decodedText);
  }
};

const onScanError = () => {
  // Ignorar errores de lectura
};

const watch_tipo = (newVal) => {
  if (newVal) {
    setTimeout(() => {
      iniciarScanner();
    }, 100);
  } else {
    if (scanner) {
      scanner.clear();
      scanner = null;
    }
  }
};

// Watchers (alternativa)
onMounted(() => {
  const observador = setInterval(() => {
    const div = document.getElementById('qr-reader');
    if (div && tipo.value && !scanner) {
      iniciarScanner();
      clearInterval(observador);
    }
  }, 100);
});

onUnmounted(() => {
  if (scanner) {
    scanner.clear();
    scanner = null;
  }
});
</script>

<style scoped>
.qr-scanner-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.tipo-selector {
  text-align: center;
}

.tipo-selector h2 {
  margin-bottom: 16px;
}

.botones {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-grande {
  padding: 20px;
  font-size: 16px;
  height: auto;
  width: 100%;
}

.scanner-activo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-volver {
  background: #999;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

#qr-reader {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.resultado {
  background: var(--color-bg);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 2px solid var(--color-primary);
}

.menu-resultado h4,
.mesa-resultado h4 {
  font-size: 20px;
  margin-bottom: 8px;
}

.menu-resultado p,
.mesa-resultado p {
  margin: 4px 0;
  color: #666;
}
</style>
