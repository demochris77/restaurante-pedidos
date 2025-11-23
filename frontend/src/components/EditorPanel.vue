<template>
  <div class="editor-panel">
    <div class="header-actions no-print">
      <h2>🛠️ Editor de Restaurante</h2>
      <div class="tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'menu' }]" 
          @click="activeTab = 'menu'"
        >
          🍔 Menú
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'config' }]" 
          @click="activeTab = 'config'"
        >
          ⚙️ Configuración PDF/QR
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'mesas' }]" 
          @click="activeTab = 'mesas'"
        >
          🪑 Mesas
        </button>
        <button @click="$emit('volver')" class="btn-volver">← Volver</button>
      </div>
    </div>

    <!-- TAB: MENÚ -->
    <div v-if="activeTab === 'menu'" class="tab-content">
      <div class="menu-controls no-print">
        <a :href="urlMenu" target="_blank" class="btn-primary">
          � Ver Menú Digital / PDF
        </a>
      </div>

      <!-- VISTA DE EDICIÓN -->
      <div class="editor-view">
        <!-- Formulario Nuevo Item -->
        <div class="card new-item-form">
          <h3>➕ Agregar Nuevo Plato/Bebida</h3>
          <form @submit.prevent="crearItem">
            <div class="form-grid">
              <input v-model="newItem.nombre" placeholder="Nombre del plato" required />
              <input v-model="newItem.categoria" placeholder="Categoría (ej: Entradas)" required />
              <input v-model.number="newItem.precio" type="number" placeholder="Precio" required />
              <input v-model.number="newItem.stock" type="number" placeholder="Cantidad Disponible" />
            </div>
            <textarea v-model="newItem.descripcion" placeholder="Descripción (ingredientes, notas...)"></textarea>
            <button type="submit" class="btn-add" :disabled="loading">Agregar Item</button>
          </form>
        </div>

        <!-- Lista de Items por Categoría -->
        <div v-for="(items, categoria) in menuPorCategoria" :key="categoria" class="category-section">
          <h3 class="category-title">{{ categoria }}</h3>
          <div class="items-grid">
            <div v-for="item in items" :key="item.id" class="item-card">
              <div class="item-header">
                <input v-model="item.nombre" class="edit-input name" @change="actualizarItem(item)" />
                <button @click="eliminarItem(item.id)" class="btn-delete" title="Eliminar">🗑️</button>
              </div>
              <div class="item-body">
                <textarea v-model="item.descripcion" class="edit-input desc" @change="actualizarItem(item)" placeholder="Descripción..."></textarea>
                <div class="item-meta">
                  <label>Precio: $
                    <input v-model.number="item.precio" type="number" class="edit-input price" @change="actualizarItem(item)" />
                  </label>
                  <label>Stock:
                    <input v-model.number="item.stock" type="number" class="edit-input price" @change="actualizarItem(item)" />
                  </label>
                </div>
                <div class="item-status">
                  <label>
                    <input type="checkbox" v-model="item.disponible" @change="actualizarItem(item)" />
                    Disponible
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: CONFIGURACIÓN -->
    <div v-if="activeTab === 'config'" class="tab-content">
      <div class="card config-form">
        <h3>⚙️ Personalizar Menú Digital / PDF</h3>
        
        <div class="form-group">
          <label>Nombre del Restaurante (Portada)</label>
          <input v-model="config.nombre" placeholder="Ej: Restaurante Sierra Nevada" />
        </div>
        
        <div class="form-group">
          <label>Subtítulo / Slogan</label>
          <input v-model="config.subtitulo" placeholder="Ej: La mejor comida de la ciudad" />
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="config.ocultarTextoPortada" />
            Ocultar texto en portada (Solo mostrar imagen)
          </label>
        </div>

        <div class="form-group">
          <label>Imagen de Portada (Primera Página)</label>
          <input type="file" @change="e => procesarImagen(e, 'imagenPortada')" accept="image/*" />
          <div v-if="config.imagenPortada" class="img-preview">
            <img :src="config.imagenPortada" alt="Vista previa portada" />
            <button @click="config.imagenPortada = ''" class="btn-sm btn-danger">🗑️ Eliminar</button>
          </div>
        </div>

        <div class="form-group">
          <label>Imagen de Fondo del Menú (Listado)</label>
          <input type="file" @change="e => procesarImagen(e, 'imagenFondoMenu')" accept="image/*" />
          <div v-if="config.imagenFondoMenu" class="img-preview">
            <img :src="config.imagenFondoMenu" alt="Vista previa fondo" />
            <button @click="config.imagenFondoMenu = ''" class="btn-sm btn-danger">🗑️ Eliminar</button>
          </div>
        </div>

        <button @click="guardarConfig" class="btn-primary" :disabled="guardando">
          {{ guardando ? '💾 Guardando...' : '💾 Guardar Configuración' }}
        </button>
        
        <div class="qr-preview">
          <h4>Código QR del Menú</h4>
          <GeneradorQR :valor="urlMenu" :size="200" />
          <p>Escanea este código para ver el menú digital.</p>
          <a :href="urlMenu" target="_blank">{{ urlMenu }}</a>
        </div>
      </div>
    </div>

    <!-- TAB: MESAS -->
    <div v-if="activeTab === 'mesas'" class="tab-content no-print">
      <div class="card new-mesa-form">
        <h3>➕ Agregar Mesa</h3>
        <form @submit.prevent="crearMesa" class="inline-form">
          <input v-model.number="newMesa.numero" type="number" placeholder="Número de Mesa" required />
          <input v-model.number="newMesa.capacidad" type="number" placeholder="Capacidad (personas)" required />
          <button type="submit" class="btn-add" :disabled="loading">Agregar Mesa</button>
        </form>
      </div>

      <div class="mesas-grid">
        <div v-for="mesa in mesas" :key="mesa.id" class="mesa-card">
          <div class="mesa-icon">🪑</div>
          <div class="mesa-info">
            <h4>Mesa {{ mesa.numero }}</h4>
            <p>Capacidad: {{ mesa.capacidad }} pers.</p>
            <span :class="['status', mesa.estado]">{{ mesa.estado }}</span>
          </div>
          <button @click="eliminarMesa(mesa.id)" class="btn-delete-mesa">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import GeneradorQR from './GeneradorQR.vue';

const emit = defineEmits(['volver']);

const activeTab = ref('menu');
const loading = ref(false);
const urlMenu = ref(`${window.location.origin}/menu`);

// Obtener IP local del servidor para el QR
const obtenerIP = async () => {
  try {
    const res = await api.getIp(); // Necesito agregar esto a api.js
    if (res.data && res.data.ip) {
      // El usuario prefiere explícitamente el puerto 3000 (backend/producción)
      // para que funcione en los teléfonos.
      urlMenu.value = `http://${res.data.ip}:3000/menu`;
    }
  } catch (err) {
    console.error('Error obteniendo IP:', err);
  }
};

// Estado Menú
const menuItems = ref([]);
const newItem = ref({ nombre: '', categoria: '', precio: '', descripcion: '', tiempo: 15, stock: 10 });

// Estado Configuración
const config = ref({
  nombre: 'Restaurante Sierra Nevada',
  subtitulo: 'Menú Digital',
  imagenPortada: '',
  imagenFondoMenu: '',
  ocultarTextoPortada: false
});

// Estado Mesas
const mesas = ref([]);
const newMesa = ref({ numero: '', capacidad: 4 });

// Computed: Agrupar menú por categoría
const menuPorCategoria = computed(() => {
  const grupos = {};
  menuItems.value.forEach(item => {
    if (!grupos[item.categoria]) grupos[item.categoria] = [];
    grupos[item.categoria].push(item);
  });
  return grupos;
});

// --- MÉTODOS MENÚ ---
const cargarMenu = async () => {
  try {
    const res = await api.getMenu();
    menuItems.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const crearItem = async () => {
  loading.value = true;
  try {
    await api.agregarMenuItem(
      newItem.value.nombre,
      newItem.value.descripcion,
      newItem.value.categoria,
      newItem.value.precio,
      newItem.value.tiempo,
      newItem.value.stock
    );
    newItem.value = { nombre: '', categoria: '', precio: '', descripcion: '', tiempo: 15, stock: 10 };
    await cargarMenu();
  } catch (err) {
    alert('Error al crear item');
  } finally {
    loading.value = false;
  }
};

const actualizarItem = async (item) => {
  try {
    await api.updateMenuItem(item.id, item);
  } catch (err) {
    console.error('Error actualizando item', err);
    alert('Error al guardar cambios');
  }
};

const eliminarItem = async (id) => {
  if (!confirm('¿Eliminar este plato del menú?')) return;
  try {
    await api.deleteMenuItem(id);
    await cargarMenu();
  } catch (err) {
    alert('Error al eliminar');
  }
};

// --- MÉTODOS CONFIGURACIÓN ---
const guardando = ref(false);

const procesarImagen = (event, key) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tamaño (ej. max 5MB para evitar problemas de red aunque el server acepte 50)
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es muy grande. Intenta con una menor a 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    config.value[key] = e.target.result;
  };
  reader.readAsDataURL(file);
};

const guardarConfig = async () => {
  guardando.value = true;
  try {
    await api.saveConfig(config.value);
    alert('✅ Configuración guardada en el servidor');
  } catch (err) {
    console.error('Error guardando config:', err);
    alert('❌ Error al guardar configuración');
  } finally {
    guardando.value = false;
  }
};

const cargarConfig = async () => {
  try {
    const res = await api.getConfig();
    if (res.data) {
      // Fusionar con defaults para no perder claves si el server devuelve parcial
      config.value = { ...config.value, ...res.data };
    }
  } catch (err) {
    console.error('Error cargando config:', err);
  }
};

// --- MÉTODOS MESAS ---
const cargarMesas = async () => {
  try {
    const res = await api.getMesas();
    mesas.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const crearMesa = async () => {
  loading.value = true;
  try {
    await api.crearMesa(newMesa.value.numero, newMesa.value.capacidad);
    newMesa.value = { numero: '', capacidad: 4 };
    await cargarMesas();
  } catch (err) {
    alert('Error al crear mesa (¿Ya existe el número?)');
  } finally {
    loading.value = false;
  }
};

const eliminarMesa = async (id) => {
  if (!confirm('¿Eliminar esta mesa?')) return;
  try {
    await api.deleteMesa(id);
    await cargarMesas();
  } catch (err) {
    alert('Error al eliminar mesa');
  }
};

onMounted(() => {
  cargarMenu();
  cargarMesas();
  cargarConfig();
  obtenerIP();
});
</script>

<style scoped>
.editor-panel {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #374151;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-volver {
  background: transparent;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

/* ESTILOS MENÚ EDITOR */
.menu-controls {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 20px;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

input, textarea {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  width: 100%;
  font-family: inherit;
}

.btn-add {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.category-section {
  margin-bottom: 32px;
}

.category-title {
  font-size: 20px;
  color: #4b5563;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.item-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: shadow 0.2s;
}

.item-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.item-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.edit-input {
  border: 1px solid transparent;
  background: #f9fafb;
  padding: 4px 8px;
}

.edit-input:focus {
  border-color: #6366f1;
  background: white;
}

.edit-input.name {
  font-weight: 700;
  font-size: 16px;
  flex: 1;
}

.edit-input.desc {
  font-size: 14px;
  color: #666;
  resize: vertical;
  min-height: 40px;
  margin-bottom: 8px;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.edit-input.price {
  width: 80px;
  text-align: right;
}

.btn-delete {
  background: #fee2e2;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px 8px;
}

/* ESTILOS MESAS */
.inline-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mesas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.mesa-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  border: 2px solid #e5e7eb;
  position: relative;
}

.mesa-icon { font-size: 32px; margin-bottom: 8px; }
.btn-delete-mesa {
  margin-top: 12px;
  background: #ef4444;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/* ESTILOS VISTA PREVIA / IMPRESIÓN */
.preview-view {
  background: white;
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

.menu-header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
.menu-header h1 { font-size: 36px; margin: 0; letter-spacing: 2px; }
.menu-category h2 { text-align: center; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 20px; }
.menu-list-item { display: flex; justify-content: space-between; margin-bottom: 16px; }
.item-info { display: flex; flex-direction: column; }
.item-name { font-weight: 700; font-size: 18px; }
.item-desc { font-size: 14px; color: #666; font-style: italic; }
.item-price { font-weight: 700; font-size: 18px; }

.menu-footer { margin-top: 60px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
.qr-section { margin-top: 20px; display: flex; flex-direction: column; align-items: center; }

@media print {
  .no-print { display: none !important; }
  .editor-panel { padding: 0; margin: 0; max-width: none; }
  .preview-view { box-shadow: none; padding: 0; }
  body { background: white; }
}
</style>
