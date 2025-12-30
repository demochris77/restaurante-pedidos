<template>
  <div class="admin-inventory">
    <div class="header-premium">
      <div class="header-title">
        <div class="icon-box-header">
           <PackageOpen :size="24" />
        </div>
        <div>
           <h2>{{ $t('inventory.title') }}</h2>
           <p class="subtitle">{{ $t('inventory.subtitle') }}</p>
        </div>
      </div>
      <button @click="$emit('volver')" class="btn-secondary-outline">
        <ArrowLeft :size="18" /> {{ $t('admin.back_to_panel') }}
      </button>
    </div>

    <!-- Main Card -->
    <div class="premium-card fade-in-up">
      <!-- Actions Bar -->
      <div class="card-header-actions">
         <div class="search-wrapper">
            <Search :size="18" class="search-icon" />
            <input type="text" :placeholder="$t('inventory.search_placeholder')" class="search-input" />
         </div>
         <button @click="openCreateModal" class="btn-create">
            <Plus :size="18" /> {{ $t('inventory.new_item') }}
         </button>
      </div>

      <!-- Inventory Table -->
      <div class="table-responsive">
        <table class="inventory-table">
            <thead>
            <tr>
                <th>{{ $t('inventory.name') }}</th>
                <th>{{ $t('inventory.stock_current') }}</th>
                <th>{{ $t('inventory.stock_min') }}</th>
                <th>{{ $t('inventory.cost_unit') }}</th>
                <th>{{ $t('inventory.status') }}</th>
                <th>{{ $t('inventory.actions') }}</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in items" :key="item.id">
                <td class="item-name-cell">
                    <Package :size="16" class="text-gray-400" />
                    {{ item.name }}
                </td>
                <td>
                    <span class="stock-value" :class="getStockClass(item)">
                        {{ formatNumber(item.current_stock) }}
                    </span>
                    <span class="unit-badge">{{ item.unit }}</span>
                </td>
                <td>
                    {{ formatNumber(item.min_stock) }} <span class="unit-badge">{{ item.unit }}</span>
                </td>
                <td>${{ formatNumber(item.cost_per_unit) }}</td>
                <td>
                    <span class="status-badge" :class="getStatusClass(item)">
                        <component :is="getStatusIcon(item)" :size="12" />
                        {{ getStatusLabel(item) }}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button @click="openQuickStock(item)" class="btn-icon add" :title="$t('inventory.form.adjust_stock')">
                            <ArrowLeftRight :size="16" />
                        </button>
                        <button @click="openEditModal(item)" class="btn-icon edit" :title="$t('common.edit')">
                            <Edit2 :size="16" />
                        </button>
                        <button @click="deleteItem(item)" class="btn-icon delete" :title="$t('common.delete')">
                            <Trash2 :size="16" />
                        </button>
                    </div>
                </td>
            </tr>
            <tr v-if="items.length === 0">
                <td colspan="6" class="empty-state">
                    <PackageSearch :size="48" />
                    <p>{{ $t('inventory.no_items') }}</p>
                </td>
            </tr>
            </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Crear/Editar -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
            <h3>
                <component :is="isEditing ? Edit3 : PlusCircle" :size="24" class="text-green-600" />
                {{ isEditing ? $t('inventory.edit_item') : $t('inventory.new_item') }}
            </h3>
            <button @click="closeModal" class="btn-close-modal"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveItem" class="inventory-form">
          <div class="form-group full">
            <label>{{ $t('inventory.form.name_label') }}</label>
            <input v-model="form.name" required :placeholder="$t('inventory.form.name_placeholder')" autofocus />
          </div>
          
          <div class="form-grid">
            <div class="form-group">
                <label>{{ $t('inventory.form.unit_label') }}</label>
                <select v-model="form.unit">
                    <option value="kg">{{ $t('inventory.form.units.kg') }}</option>
                    <option value="g">{{ $t('inventory.form.units.g') }}</option>
                    <option value="l">{{ $t('inventory.form.units.l') }}</option>
                    <option value="ml">{{ $t('inventory.form.units.ml') }}</option>
                    <option value="unid">{{ $t('inventory.form.units.unid') }}</option>
                    <option value="oz">{{ $t('inventory.form.units.oz') }}</option>
                    <option value="lb">{{ $t('inventory.form.units.lb') }}</option>
                </select>
            </div>
            <div class="form-group">
                <label>{{ $t('inventory.form.cost_label') }}</label>
                <input type="number" step="0.01" v-model="form.cost_per_unit" placeholder="0.00" />
            </div>
            
            <div class="form-group">
                <label>{{ $t('inventory.form.stock_current_label') }}</label>
                <input type="number" step="0.0001" v-model="form.current_stock" />
            </div>
            <div class="form-group">
                <label>{{ $t('inventory.form.stock_min_label') }}</label>
                <input type="number" step="0.0001" v-model="form.min_stock" />
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-cancel">{{ $t('common.cancel') }}</button>
            <button type="submit" class="btn-save">
                {{ isEditing ? $t('inventory.form.save_changes') : $t('inventory.form.create_item') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Stock Rápido -->
    <div v-if="showStockModal" class="modal-overlay">
      <div class="modal sm">
         <div class="modal-header">
            <h3><ArrowLeftRight :size="20" /> {{ $t('inventory.form.adjust_stock') }}</h3>
            <button @click="closeStockModal" class="btn-close-modal"><X :size="20" /></button>
        </div>

        <div class="stock-actions-content">
           <div class="stock-info">
               <span class="stock-label">{{ selectedItem?.name }}</span>
               <span class="current-stock-display">
                   {{ formatNumber(selectedItem?.current_stock) }}
                   <span class="stock-unit">{{ selectedItem?.unit }}</span>
               </span>
               <small style="color: #64748b;">{{ $t('inventory.form.stock_current_label') }}</small>
           </div>
           
           <div class="form-group">
             <label>{{ $t('inventory.form.adjust_qty_label') }}</label>
             <input type="number" step="0.0001" v-model="stockForm.quantity" autofocus placeholder="0.00" style="text-align: center; font-size: 1.25rem; font-weight: 700;" />
           </div>

           <div class="modal-actions">
             <button @click="applyStock('subtract')" class="btn-stock-action sub">
                <Minus :size="18" /> {{ $t('inventory.form.subtract') }}
             </button>
             <button @click="applyStock('add')" class="btn-stock-action add">
                <Plus :size="18" /> {{ $t('inventory.form.add') }}
             </button>
           </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  PackageOpen, ArrowLeft, Plus, Search, Package, Edit2, Trash2, 
  ArrowLeftRight, PackageSearch, X, Edit3, PlusCircle, Minus, CheckCircle, AlertTriangle, XCircle
} from 'lucide-vue-next';
import api from '../api';

const { t } = useI18n();
const items = ref([]);
const showModal = ref(false);
const showStockModal = ref(false);
const isEditing = ref(false);
const selectedItem = ref(null);

const form = ref({
  id: null,
  name: '',
  unit: 'kg',
  current_stock: 0,
  min_stock: 0,
  cost_per_unit: 0
});

const stockForm = ref({
  quantity: 0
});

onMounted(() => {
  loadInventory();
});

async function loadInventory() {
  try {
    const res = await api.getInventory();
    items.value = res.data;
  } catch (error) {
    console.error('Error cargando inventario:', error);
    alert('Error cargando inventario');
  }
}

function formatNumber(num) {
  return Number(num).toLocaleString('es-ES', { maximumFractionDigits: 3 });
}

function getStockClass(item) {
  if (Number(item.current_stock) <= 0) return 'text-danger';
  if (Number(item.current_stock) <= Number(item.min_stock)) return 'text-warning';
  return 'text-success';
}

function getStatusLabel(item) {
  const stock = Number(item.current_stock);
  const min = Number(item.min_stock);
  if (stock <= 0) return t('inventory.status_label.out');
  if (stock <= min) return t('inventory.status_label.low');
  return t('inventory.status_label.ok');
}

function getStatusClass(item) {
  const stock = Number(item.current_stock);
  const min = Number(item.min_stock);
  if (stock <= 0) return 'badge-danger';
  if (stock <= min) return 'badge-warning';
  return 'badge-success';
}

function getStatusIcon(item) {
  const stock = Number(item.current_stock);
  const min = Number(item.min_stock);
  if (stock <= 0) return XCircle;
  if (stock <= min) return AlertTriangle;
  return CheckCircle;
}

// Modal Logic
function openCreateModal() {
  isEditing.value = false;
  form.value = { name: '', unit: 'kg', current_stock: 0, min_stock: 0, cost_per_unit: 0 };
  showModal.value = true;
}

function openEditModal(item) {
  isEditing.value = true;
  form.value = { ...item };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function saveItem() {
  try {
    if (isEditing.value) {
      await api.updateInventoryItem(form.value.id, form.value);
    } else {
      await api.createInventoryItem(form.value);
    }
    closeModal();
    loadInventory();
  } catch (error) {
    console.error(error);
    alert(t('inventory.alerts.save_error'));
  }
}

async function deleteItem(item) {
  if (!confirm(t('inventory.alerts.confirm_delete', { name: item.name }))) return;
  try {
    await api.deleteInventoryItem(item.id);
    loadInventory();
  } catch (error) {
    console.error(error);
    alert(t('inventory.alerts.delete_error'));
  }
}

// Quick Stock Logic
function openQuickStock(item) {
  selectedItem.value = item;
  stockForm.value = { quantity: 1 }; // Default value can be 1
  showStockModal.value = true;
}

function closeStockModal() {
  showStockModal.value = false;
  selectedItem.value = null;
}

async function applyStock(operation) {
  const qty = Number(stockForm.value.quantity);
  if (!qty || qty <= 0) return alert(t('inventory.alerts.invalid_qty'));

  try {
    await api.updateStock(selectedItem.value.id, qty, operation);
    closeStockModal();
    loadInventory();
  } catch (error) {
    console.error(error);
    alert(t('inventory.alerts.stock_error'));
  }
}
</script>

<style src="../assets/styles/AdminInventory.css" scoped></style>
