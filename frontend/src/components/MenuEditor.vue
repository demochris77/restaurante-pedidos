<template>
  <div class="menu-editor">
        <!-- Header Tools -->
        <div class="menu-header-tools no-print">
            <div class="search-container">
               <Search :size="18" class="search-icon" />
               <input 
                 v-model="searchQuery" 
                 :placeholder="$t('editor.menu.search_placeholder')" 
                 class="search-input"
               />
            </div>
            
            <div class="header-actions">
               <a :href="urlMenuDinamica" target="_blank" class="btn-outline-primary">
                 <FileText :size="18" />
                 <span class="desktop-only">{{ $t('editor.menu.view_menu') }}</span>
               </a>
               <button @click="showNewItemForm = !showNewItemForm" class="btn-primary">
                 <Plus :size="18" />
                 {{ $t('editor.menu.new_item') }}
               </button>
            </div>
        </div>

        <!-- Formulario Nuevo Item (Expandable) -->
        <div v-if="showNewItemForm" class="new-item-panel fade-in-down">
          <div class="card form-card">
            <div class="card-header">
              <div class="section-title">
                 <PlusCircle :size="20" />
                 <h3>{{ $t('editor.menu.new_item') }}</h3>
              </div>
              <button @click="showNewItemForm = false" class="btn-icon-close"><X :size="20" /></button>
            </div>
            <form @submit.prevent="crearItem" class="item-form">
                <div class="form-grid">
                  <div class="form-group">
                    <label>{{ $t('editor.form.name') }}</label>
                    <div class="input-with-icon">
                       <Type :size="16" />
                       <input v-model="newItem.nombre" :placeholder="$t('editor.placeholders.name')" required />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ $t('editor.form.category') }}</label>
                     <div class="input-with-icon">
                       <Tag :size="16" />
                       <select v-model="newItem.categoria" required>
                          <option value="" disabled>{{ $t('editor.placeholders.category') }}</option>
                          <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                            {{ cat.name }}
                          </option>
                        </select>
                     </div>
                  </div>
                  <div class="form-group">
                    <label>{{ $t('editor.form.price') }}</label>
                    <div class="input-with-icon">
                       <DollarSign :size="16" />
                       <input v-model.number="newItem.precio" type="number" step="0.01" placeholder="0.00" required />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ $t('editor.form.time') }}</label>
                     <div class="input-with-icon">
                       <Clock :size="16" />
                       <input v-model.number="newItem.tiempo_estimado" type="number" placeholder="15" />
                     </div>
                  </div>
                </div>

                <div class="form-group">
                  <label>{{ $t('editor.form.desc') }}</label>
                  <textarea v-model="newItem.descripcion" :placeholder="$t('editor.placeholders.ingredients')" rows="2" class="textarea-premium"></textarea>
                </div>

                <!-- Image Upload -->
                <div class="form-group">
                   <label>{{ $t('editor.form.image') }}</label>
                   <div class="image-uploader inline">
                      <div v-if="newItem.image_url" class="img-preview-mini">
                         <img :src="newItem.image_url" />
                         <button @click="newItem.image_url = ''" type="button" class="btn-icon delete-overlay-mini"><X :size="12" /></button>
                      </div>
                      <label class="btn-upload-small">
                         <Upload :size="16" /> {{ $t('common.upload') }}
                         <input type="file" @change="subirImagenItem" accept="image/*" />
                      </label>
                      <span v-if="subiendoImagen" class="loading-text">⏳</span>
                   </div>
                </div>

                <div class="options-row">
                  <label class="checkbox-pill">
                    <input type="checkbox" v-model="newItem.usa_inventario" />
                    <Box :size="16" />
                    <span>{{ $t('editor.form.stock_control') }}</span>
                  </label>
                  <label class="checkbox-pill highlight">
                    <input type="checkbox" v-model="newItem.es_directo" />
                    <Coffee :size="16" />
                    <span>{{ $t('editor.form.direct_serve') }}</span>
                  </label>
                </div>

               <!-- Stock Fields -->
               <div v-if="newItem.usa_inventario" class="inventory-fields bg-light">
                 <div class="form-grid small-grid">
                    <div class="form-group">
                      <label>{{ $t('editor.form.stock_current') }}</label>
                      <input v-model.number="newItem.stock_actual" type="number" min="0" />
                    </div>
                    <div class="form-group">
                      <label>{{ $t('editor.form.stock_min') }}</label>
                      <input v-model.number="newItem.stock_minimo" type="number" min="0" />
                    </div>
                 </div>
               </div>

               <div class="form-actions-right">
                  <button type="submit" class="btn-submit" :disabled="loading">
                    <Plus :size="18" />
                    {{ loading ? $t('common.saving') : $t('editor.form.add_item') }}
                  </button>
               </div>
            </form>
          </div>
        </div>

        <!-- Lista de Items (Acordeón) -->
        <div class="menu-list">
          <div v-for="(items, categoria) in filteredMenu" :key="categoria" class="category-group">
            <h3 
              class="category-title accordion-header" 
              @click="toggleCategoria(categoria)"
            >
              <span class="flex-center gap-2"><Tag :size="18" /> {{ categoria }} <span class="count">{{ items.length }}</span></span>
              <span class="accordion-icon"><ChevronDown :size="20" :class="{ rotated: !isCategoriaOpen(categoria) }" /></span>
            </h3>
            
            <div v-show="isCategoriaOpen(categoria)" class="items-grid fade-in">
              <div v-for="item in items" :key="item.id" class="item-card">
                <div class="item-card-header">
                  <div class="header-main">
                      <input v-model="item.nombre" class="edit-input title-input" @change="actualizarItem(item)" />
                  </div>
                  <!-- Botones de Acción -->
                  <div class="action-buttons-row">
                    <!-- Toggle Disponibilidad -->
                    <button 
                      @click="toggleDisponibilidad(item)" 
                      class="btn-icon" 
                      :class="{ 'btn-eye-active': item.disponible, 'btn-eye-off': !item.disponible }"
                      :title="item.disponible ? 'Ocultar' : 'Activar'"
                    >
                      <Eye :size="18" v-if="item.disponible" />
                      <EyeOff :size="18" v-else />
                    </button>

                    <!-- Eliminar -->
                    <div v-if="deletingId === item.id" class="spinner-small"></div>
                    <button v-else @click="eliminarItem(item.id)" class="btn-icon delete" :title="$t('common.delete')">
                        <Trash2 :size="18" />
                    </button>
                  </div>
                </div>

                <div class="item-card-body">
                  <div class="desc-wrapper">
                      <textarea
                        v-model="item.descripcion"
                        class="edit-input desc-input"
                        @change="actualizarItem(item)"
                        rows="2"
                        :placeholder="$t('editor.form.desc_placeholder')"
                      ></textarea>
                  </div>

                  <!-- Category Selector for Edit -->
                  <div class="form-group" style="margin-top: 8px;">
                    <label style="font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">{{ $t('editor.form.category') }}</label>
                    <select v-model="item.categoria" @change="actualizarItem(item)" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
                      <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                        {{ cat.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Image Editor -->
                  <div class="item-image-section">
                    <div class="image-label"><Image :size="14" /> {{ $t('editor.form.image_label') }}</div>
                    <div class="image-controls">
                        <input
                          type="file"
                          @change="(e) => subirImagenItemExistente(e, item)"
                          accept="image/*"
                          class="file-input-compact"
                        />
                        <div v-if="itemEditandoImagen === item.id" class="spinner-small"></div>
                    </div>
                    
                    <div v-if="item.image_url" class="img-preview-row">
                      <img :src="item.image_url" alt="Preview" />
                      <button @click="eliminarImagenItem(item)" type="button" class="btn-icon delete-mini">
                        <X :size="14" />
                      </button>
                    </div>
                  </div>

                  <div class="price-time-row">
                    <div class="input-wrapper symbol">
                      <input v-model.number="item.precio" type="number" class="edit-input price" @change="actualizarItem(item)" />
                    </div>
                    <div class="input-wrapper suffix">
                      <input v-model.number="item.tiempo_estimado" type="number" class="edit-input time" @change="actualizarItem(item)" />
                    </div>
                  </div>

                  <!-- Badges -->
                  <div class="badges-row">
                    <label class="badge-pill" :class="{ active: item.es_directo }">
                      <input type="checkbox" v-model="item.es_directo" @change="actualizarItem(item)" />
                      <Coffee :size="12" /> {{ $t('editor.badges.direct') }}
                    </label>
                    <label class="badge-pill" :class="{ active: item.usa_inventario }">
                      <input type="checkbox" v-model="item.usa_inventario" @change="actualizarItem(item)" />
                      <Box :size="12" /> {{ $t('editor.badges.stock') }}
                    </label>
                  </div>

                  <!-- Control de Stock Rápido -->
                  <div v-if="item.usa_inventario" class="stock-control-panel">
                    <div class="stock-inputs-row">
                        <div class="stock-group">
                            <label>Stock</label>
                            <input v-model.number="item.stock_actual" type="number" class="stock-input" @change="actualizarItem(item)" />
                        </div>
                         <div class="stock-group">
                            <label>Min</label>
                            <input v-model.number="item.stock_minimo" type="number" class="stock-input" @change="actualizarItem(item)" />
                        </div>
                    </div>
                    <div class="select-wrapper-status">
                      <select 
                        v-model="item.estado_inventario" 
                        class="stock-select" 
                        :class="['status-' + item.estado_inventario]"
                        @change="actualizarItem(item)"
                      >
                        <option value="disponible">{{ $t('editor.stock.available') }}</option>
                        <option value="poco_stock">{{ $t('editor.stock.low') }}</option>
                        <option value="no_disponible">{{ $t('editor.stock.out') }}</option>
                      </select>
                      <ChevronDown :size="14" class="select-arrow" />
                    </div>

                    <button @click="openRecipeModal(item)" class="btn-recipe">
                      <ChefHat :size="14" /> {{ $t('editor.form.recipe_btn') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Recipe Modal -->
    <div v-if="recipeModalOpen" class="modal-overlay">
      <div class="modal fade-in-up">
        <div class="modal-header">
           <h3><ChefHat :size="24" class="text-orange" /> {{ $t('editor.form.recipe_title', { name: currentRecipeItem.nombre }) }}</h3>
           <button @click="closeRecipeModal" class="btn-icon-close-modal"><X :size="20" /></button>
        </div>
        <p class="modal-subtitle">{{ $t('editor.form.recipe_subtitle') }}</p>
        
        <div class="recipe-form">
          <div v-for="(ing, index) in currentRecipeIngredients" :key="index" class="recipe-row">
            <div class="input-with-icon">
               <Package :size="16" class="field-icon" />
               <select v-model="ing.inventory_item_id" class="recipe-select" required>
                  <option value="" disabled>{{ $t('editor.form.ingredient_placeholder') }}</option>
                  <option v-for="inv in inventoryList" :key="inv.id" :value="inv.id">
                    {{ inv.name }}
                  </option>
               </select>
            </div>

            <div class="recipe-qty-group">
              <input 
                v-model.number="ing.quantity_required" 
                type="number" 
                step="0.001" 
                placeholder="0"
                class="qty-input"
              />
              <span class="unit-label">{{ getIngredientUnit(ing.inventory_item_id) || '-' }}</span>
            </div>

            <button @click="removeIngredientRow(index)" class="btn-icon delete-row">
                <X :size="18" />
            </button>
          </div>
          
          <button @click="addIngredientRow" class="btn-add-row">
            <Plus :size="16" /> {{ $t('editor.form.add_ingredient') }}
          </button>
        </div>
        
        <div class="modal-actions">
          <button @click="closeRecipeModal" class="btn-cancel">{{ $t('common.cancel') }}</button>
          <button @click="saveRecipe" class="btn-save">{{ $t('editor.form.save_recipe') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast'; 
import { 
  Search, FileText, Plus, PlusCircle, X, Type, Tag, DollarSign, Clock, Upload, 
  Box, Coffee, ChevronDown, Eye, EyeOff, Trash2, Image, ChefHat, Package 
} from 'lucide-vue-next';
import api from '../api';
const { t } = useI18n();
const { success, error: showError } = useToast();

const props = defineProps({
  menuItems: Array,
  categories: Array
});
const emit = defineEmits(['refresh']);
const showNewItemForm = ref(false);
// Refs
const newItem = ref({ 
  nombre: '',
  descripcion: '',
  precio: 0,
  categoria: '',
  tiempo_estimado: 15,
  usa_inventario: false,
  stock_actual: 0,
  stock_minimo: 0,
  es_directo: false,
  image_url: ''
});
const searchQuery = ref('');
const categoriasAbiertas = ref(new Set());
const subiendoImagen = ref(false);
const itemEditandoImagen = ref(null);
const deletingId = ref(null);
const inventoryList = ref([]);
const recipeModalOpen = ref(false);
const currentRecipeItem = ref(null);
const currentRecipeIngredients = ref([]);
// Computed
const filteredMenu = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const grouped = {};
  
  props.menuItems
    .filter(item => 
      item.nombre.toLowerCase().includes(query) ||
      item.descripcion?.toLowerCase().includes(query)
    )
    .forEach(item => {
      if (!grouped[item.categoria]) {
        grouped[item.categoria] = [];
      }
      grouped[item.categoria].push(item);
    });
  
  return grouped;
});
const urlMenuDinamica = computed(() => {
  return `${window.location.origin}/menu`;
});
// Methods
const crearItem = async () => {
  try {
    await api.agregarMenuItem(newItem.value);
    newItem.value = { 
      nombre: '', descripcion: '', precio: 0, categoria: '',
      tiempo_estimado: 15, usa_inventario: false, stock_actual: 0,
      stock_minimo: 0, es_directo: false, image_url: ''
    };
    emit('refresh');
  } catch (err) {
    console.error('Error:', err);
    showError(t('editor.error_creating_item') || 'Error al crear item');
  }
};
const actualizarItem = async (item) => {
  try {
    await api.updateMenuItem(item.id, item);
    emit('refresh');
  } catch (err) {
    console.error('Error:', err);
  }
};
const eliminarItem = async (id) => {
  if (!confirm('¿Eliminar este item?')) return;
  deletingId.value = id;
  try {
    await api.deleteMenuItem(id);
    emit('refresh');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    deletingId.value = null;
  }
};
const toggleDisponibilidad = async (item) => {
  item.disponible = !item.disponible;
  await actualizarItem(item);
};
const toggleCategoria = (categoria) => {
  if (categoriasAbiertas.value.has(categoria)) {
    categoriasAbiertas.value.delete(categoria);
  } else {
    categoriasAbiertas.value.add(categoria);
  }
};
const isCategoriaOpen = (categoria) => {
  return categoriasAbiertas.value.has(categoria);
};
const subirImagenItem = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  subiendoImagen.value = true;
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const res = await api.uploadMenuImage(formData);
    newItem.value.image_url = res.data.url;
  } catch (err) {
    console.error('Error:', err);
    showError(t('editor.error_uploading_image') || 'Error subiendo imagen');
  } finally {
    subiendoImagen.value = false;
  }
};
const subirImagenItemExistente = async (event, item) => {
  const file = event.target.files[0];
  if (!file) return;
  
  itemEditandoImagen.value = item.id;
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const res = await api.uploadMenuImage(formData);
    item.image_url = res.data.url;
    await actualizarItem(item);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    itemEditandoImagen.value = null;
  }
};
const eliminarImagenItem = async (item) => {
  item.image_url = '';
  await actualizarItem(item);
};
// Recipe methods
const openRecipeModal = async (item) => {
  currentRecipeItem.value = item;
  currentRecipeIngredients.value = [];
  recipeModalOpen.value = true;
  
  try {
    const res = await api.getRecipe(item.id);
    if (res.data) {
      currentRecipeIngredients.value = res.data.map(i => ({
        inventory_item_id: i.inventory_item_id,
        quantity_required: i.quantity_required
      }));
    }
  } catch (err) {
    console.error('Error:', err);
  }
};
const closeRecipeModal = () => {
  recipeModalOpen.value = false;
  currentRecipeItem.value = null;
  currentRecipeIngredients.value = [];
};
const addIngredientRow = () => {
  currentRecipeIngredients.value.push({
    inventory_item_id: '',
    quantity_required: 0
  });
};
const removeIngredientRow = (index) => {
  currentRecipeIngredients.value.splice(index, 1);
};
const saveRecipe = async () => {
  try {
    await api.saveRecipe(currentRecipeItem.value.id, currentRecipeIngredients.value);
    closeRecipeModal();
    emit('refresh');
  } catch (err) {
    console.error('Error:', err);
    showError(t('editor.error_saving_recipe') || 'Error guardando receta');
  }
};
const getIngredientUnit = (inventoryItemId) => {
  const item = inventoryList.value.find(i => i.id === inventoryItemId);
  return item ? item.unit : '';
};
// Load inventory on mount
onMounted(async () => {
  try {
    const res = await api.getInventory();
    inventoryList.value = res.data;
  } catch (err) {
    console.error('Error:', err);
  }
  
  // Open all categories by default
  Object.keys(filteredMenu.value).forEach(cat => {
    categoriasAbiertas.value.add(cat);
  });
});
</script>
<style src="../assets/styles/MenuEditor.css" scoped></style>