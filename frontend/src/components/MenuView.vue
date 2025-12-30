<template>
  <div class="public-menu">
    <!-- ✅ Fixed Background (Global) -->
    <div class="menu-background" 
         :style="{ backgroundImage: config.imagenFondoMenu ? `url('${config.imagenFondoMenu}')` : undefined }">
    </div>

    <!-- ✅ Hero / Cover Section -->
    <div class="cover-page">
      <!-- Layer 1: Blurred Background (Full Cover) -->
      <div class="cover-background-blur"
           v-if="config.imagenPortada"
           :style="{ backgroundImage: `url('${config.imagenPortada}')` }">
      </div>

      <!-- Layer 2: Main Image (Contain) -->
      <div class="cover-image-contain"
           v-if="config.imagenPortada"
           :style="{ backgroundImage: `linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.6)), url('${config.imagenPortada}')` }">
      </div>
      <img v-if="config.logo" :src="config.logo" alt="Logo" class="restaurant-logo-large" />
      
      <div class="cover-content" v-if="!config.ocultarTextoPortada">
        <h1 class="restaurant-name-main">{{ config.nombre || fallbackTitle }}</h1>
        <p class="restaurant-subtitle-main">{{ config.subtitulo || fallbackSubtitle }}</p>
      </div>
      
      <div class="scroll-indicator" @click="scrollToMenu">
        <span class="scroll-text">{{ $t('menu.scroll_hint') }}</span>
        <ChevronDown :size="32" />
      </div>
    </div>

    <!-- ✅ Menu Content -->
    <div class="menu-content-wrapper" id="menu-content">
      <div class="menu-container">
        
        <div v-for="(items, categoria) in menuPorCategoria" :key="categoria" class="menu-category-section">
          <!-- Sticky Header per Category -->
          <div class="category-header">
            <h2 class="category-title">{{ categoria }}</h2>
            <!-- Optional: Icon based on category or generic -->
            <Utensils :size="20" class="category-icon" />
          </div>

          <!-- Items Grid -->
          <div class="menu-items-grid">
            <div v-for="item in items" :key="item.id" class="menu-item-card">
              
              <!-- Item Image -->
              <div v-if="item.image_url" class="item-image-container">
                <img :src="item.image_url" :alt="item.nombre" class="item-image" loading="lazy" />
              </div>
              
              <!-- Item Content -->
              <div class="item-content">
                <div class="item-header">
                  <h3 class="item-name">{{ item.nombre }}</h3>
                  <span class="item-price">${{ item.precio.toLocaleString() }}</span>
                </div>
                
                <p class="item-desc">{{ item.descripcion }}</p>
                
                <div class="item-footer">
                  <span v-if="item.estado_inventario === 'no_disponible'" class="badge badge-sold-out">
                    {{ $t('menu.sold_out') }}
                  </span>
                   <!-- Example 'New' badge logic could go here if data existed -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="menu-footer">
          <p>{{ $t('menu.thank_you') }}</p>
          <small>© {{ new Date().getFullYear() }} {{ config.nombre || fallbackTitle }}</small>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { useI18n } from 'vue-i18n';
import { ChevronDown, Utensils } from 'lucide-vue-next';
import '@/assets/styles/MenuView.css'; // ✅ Import new premium styles

const { t } = useI18n();

// ✅ Fallback variables
const fallbackTitle = import.meta.env.VITE_APP_TITLE || 'Restaurante';
const fallbackSubtitle = import.meta.env.VITE_APP_DESCRIPTION || 'Menú Digital';

const menuItems = ref([]);
const categories = ref([]);
const config = ref({
  nombre: '',
  subtitulo: '',
  imagenPortada: '', 
  imagenFondoMenu: '',
  ocultarTextoPortada: false,
  logo: '' 
});
const state = ref('default');

const menuPorCategoria = computed(() => {
  const grupos = {};
  menuItems.value.forEach(item => {
    if (!grupos[item.categoria]) grupos[item.categoria] = [];
    grupos[item.categoria].push(item);
  });

  // Sort using categories from DB order
  const gruposOrdenados = {};
  categories.value.forEach(cat => {
    if (grupos[cat.name]) {
        gruposOrdenados[cat.name] = grupos[cat.name];
        delete grupos[cat.name];
    }
  });
  
  // Remaining categories
  Object.keys(grupos).sort().forEach(key => {
    gruposOrdenados[key] = grupos[key];
  });

  return gruposOrdenados;
});

const cargarMenu = async () => {
  try {
    try {
        const catRes = await api.getCategories();
        categories.value = catRes.data;
    } catch(e) { console.error('Error loading categories', e); }

    const res = await api.getMenu();
    menuItems.value = res.data;
    
    try {
      const configRes = await api.getConfig();
      if (configRes.data) {
        config.value = { ...config.value, ...configRes.data };
         // Map logo if available in your API, otherwise standard logic
      }
    } catch (configErr) {
      console.error('Error loading config:', configErr);
    }
  } catch (err) {
    console.error('Error loading menu:', err);
  }
};



const scrollToMenu = () => {
  document.getElementById('menu-content')?.scrollIntoView({ behavior: 'smooth' });
};

onMounted(() => {
  cargarMenu();
});
</script>
