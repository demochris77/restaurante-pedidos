<template>
  <div class="editor-panel">
    <!-- HEADER Y NAVEGACIÓN -->
    <div class="editor-header no-print">
      <div class="header-top">
        <h2>🛠️ {{ $t('editor.title') }}</h2>
        <button @click="$emit('volver')" class="btn-volver" :title="$t('common.back')">
          <span class="icon">⬅️</span> <span class="text">{{ $t('common.back') }}</span>
        </button>
      </div>

      <div class="tabs-container">
        <button 
          :class="['tab-btn', { active: activeTab === 'menu' }]" 
          @click="activeTab = 'menu'"
          :title="$t('editor.tabs.menu')"
        >
          <span class="tab-icon">🍔</span>
          <span class="tab-text">{{ $t('editor.tabs.menu') }}</span>
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'categorias' }]" 
          @click="activeTab = 'categorias'"
          title="Categorías"
        >
          <span class="tab-icon">🏷️</span>
          <span class="tab-text">{{ $t('editor.tabs.categories') || 'Categorías' }}</span>
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'pagos' }]" 
          @click="activeTab = 'pagos'"
          title="Métodos de Pago"
        >
          <span class="tab-icon">💳</span>
          <span class="tab-text">{{ $t('editor.tabs.payments') || 'Pagos' }}</span>
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'config' }]" 
          @click="activeTab = 'config'"
          :title="$t('editor.tabs.config')"
        >
          <span class="tab-icon">⚙️</span>
          <span class="tab-text">{{ $t('editor.tabs.config') }}</span>
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'mesas' }]" 
          @click="activeTab = 'mesas'"
          :title="$t('editor.tabs.tables')"
        >
          <span class="tab-icon">🪑</span>
          <span class="tab-text">{{ $t('editor.tabs.tables') }}</span>
        </button>
      </div>
    </div>

    <!-- CONTENIDO PRINCIPAL -->
    <div class="panel-body">
      
      <!-- TAB: MENÚ -->
      <div v-if="activeTab === 'menu'" class="tab-content fade-in">
        <!-- Botón Ver Menú -->
        <div class="menu-actions no-print">
          <a :href="urlMenuDinamica" target="_blank" class="btn-ver-menu">
            <span class="icon">📄</span>
            {{ $t('editor.menu.view_menu') }}
            <span class="external-icon">↗</span>
          </a>
        </div>

        <!-- Formulario Nuevo Item -->
        <div class="card form-card">
          <div class="card-header">
            <h3>➕ {{ $t('editor.menu.new_item') }}</h3>
          </div>
          <form @submit.prevent="crearItem" class="item-form">
            <div class="form-grid">
              <div class="form-group">
                <label>{{ $t('editor.form.name') }}</label>
                <input v-model="newItem.nombre" :placeholder="$t('editor.placeholders.name')" required />
              </div>
              <div class="form-group">
                <label>{{ $t('editor.form.category') }}</label>
                <select v-model="newItem.categoria" required>
                  <option value="" disabled>{{ $t('editor.placeholders.category') }}</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                    {{ cat.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ $t('editor.form.price') }}</label>
                <input v-model.number="newItem.precio" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div class="form-group">
                <label>{{ $t('editor.form.time') }}</label>
                <input v-model.number="newItem.tiempo_estimado" type="number" placeholder="15" />
              </div>
            </div>

            <div class="form-group">
              <label>{{ $t('editor.form.desc') }}</label>
              <textarea v-model="newItem.descripcion" :placeholder="$t('editor.placeholders.ingredients')" rows="2"></textarea>
            </div>

            <!-- ✅ NUEVO: Subir imagen del plato -->
            <div class="form-group">
              <label>{{ $t('editor.form.image') }}</label>
              <input type="file" @change="subirImagenItem" accept="image/*" />
              <div v-if="newItem.image_url" class="img-preview-small">
                <img :src="newItem.image_url" alt="Preview" />
                <button @click="newItem.image_url = ''" type="button" class="btn-text-danger">
                  {{ $t('common.delete') }}
                </button>
              </div>
              <small v-if="subiendoImagen" class="text-info">⏳ {{ $t('common.uploading') }}</small>
            </div>

            <div class="options-grid">
              <label class="checkbox-card">
                <input type="checkbox" v-model="newItem.usa_inventario" />
                <span>📦 {{ $t('editor.form.stock_control') }}</span>
              </label>
              <label class="checkbox-card highlight">
                <input type="checkbox" v-model="newItem.es_directo" />
                <span>🍹 {{ $t('editor.form.direct_serve') }}</span>
              </label>
            </div>

            <!-- Campos de Inventario (Condicional) -->
            <div v-if="newItem.usa_inventario" class="inventory-subform">
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

            <button type="submit" class="btn-submit" :disabled="loading">
              {{ loading ? $t('common.saving') : '✨ ' + $t('editor.form.add_item') }}
            </button>
          </form>
        </div>

        <!-- Lista de Items -->
        <div class="menu-list">
          <div v-for="(items, categoria) in menuPorCategoria" :key="categoria" class="category-group">
            <h3 class="category-title">{{ categoria }} <span class="count">{{ items.length }}</span></h3>
            <div class="items-grid">
              <div v-for="item in items" :key="item.id" class="item-card">
                <div class="item-card-header">
                  <input v-model="item.nombre" class="edit-input title-input" @change="actualizarItem(item)" />
                  <!-- Botones de Acción -->
                  <div class="action-buttons-row">
                    <!-- Toggle Disponibilidad (Ojo) -->
                    <button 
                      @click="toggleDisponibilidad(item)" 
                      class="btn-icon" 
                      :class="{ 'btn-eye-active': item.disponible, 'btn-eye-off': !item.disponible }"
                      :title="item.disponible ? 'Desactivar (Ocultar)' : 'Activar (Mostrar)'"
                    >
                      {{ item.disponible ? '👁️' : '🚫' }}
                    </button>

                    <!-- Eliminar (con warning) -->
                    <div v-if="deletingId === item.id" class="delete-spinner">⏳</div>
                    <button v-else @click="eliminarItem(item.id)" class="btn-icon delete" title="Eliminar Definitivamente">🗑️</button>
                  </div>
                </div>

                <div class="item-card-body">
                  <textarea
                    v-model="item.descripcion"
                    class="edit-input desc-input"
                    @change="actualizarItem(item)"
                    rows="2"
                    :placeholder="$t('editor.form.desc_placeholder')"
                  ></textarea>

                  <!-- Category Selector for Edit -->
                  <div class="form-group" style="margin-top: 8px;">
                    <label style="font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">{{ $t('editor.form.category') }}</label>
                    <select v-model="item.categoria" @change="actualizarItem(item)" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
                      <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                        {{ cat.name }}
                      </option>
                    </select>
                  </div>

                  <!-- ✅ NUEVO: Imagen del plato -->
                  <div style="margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 6px;">
                    <label style="font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">🖼️ {{ $t('editor.form.image_label') }}</label>
                    <input
                      type="file"
                      @change="(e) => subirImagenItemExistente(e, item)"
                      accept="image/*"
                      style="font-size: 11px; width: 100%;"
                    />
                    <div v-if="item.image_url" class="img-preview-small" style="margin-top: 8px;">
                      <img :src="item.image_url" alt="Preview" />
                      <button
                        @click="eliminarImagenItem(item)"
                        type="button"
                        class="btn-text-danger"
                      >
                        {{ $t('common.delete') }}
                      </button>
                    </div>
                    <small v-if="itemEditandoImagen === item.id" class="text-info">⏳ {{ $t('common.uploading') }}</small>
                  </div>

                  <div class="price-time-row">
                    <div class="input-wrapper symbol">
                      <input v-model.number="item.precio" type="number" class="edit-input" @change="actualizarItem(item)" />
                    </div>
                    <div class="input-wrapper suffix">
                      <input v-model.number="item.tiempo_estimado" type="number" class="edit-input" @change="actualizarItem(item)" />
                    </div>
                  </div>

                  <!-- Badges y Checkbox Rápidos -->
                  <div class="badges-row">
                    <label class="badge-checkbox" :class="{ active: item.es_directo }">
                      <input type="checkbox" v-model="item.es_directo" @change="actualizarItem(item)" />
                      🍹 {{ $t('editor.badges.direct') }}
                    </label>
                    
                    <label class="badge-checkbox" :class="{ active: item.usa_inventario }">
                      <input type="checkbox" v-model="item.usa_inventario" @change="actualizarItem(item)" />
                      📦 {{ $t('editor.badges.stock') }}
                    </label>
                  </div>

                  <!-- Control de Stock Rápido -->
                  <div v-if="item.usa_inventario" class="stock-control">
                    <input v-model.number="item.stock_actual" type="number" class="stock-input" @change="actualizarItem(item)" placeholder="#" />
                    <select v-model="item.estado_inventario" class="stock-select" @change="actualizarItem(item)">
                      <option value="disponible">✅ {{ $t('editor.stock.available') }}</option>
                      <option value="poco_stock">⚠️ {{ $t('editor.stock.low') }}</option>
                      <option value="no_disponible">❌ {{ $t('editor.stock.out') }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: CONFIGURACIÓN -->
      <div v-if="activeTab === 'config'" class="tab-content fade-in">
        <div class="card config-card">
          <div class="card-header">
            <h3>⚙️ {{ $t('editor.config.title') }}</h3>
          </div>
          <div class="form-group">
            <label>{{ $t('editor.config.name') }}</label>
            <input v-model="config.nombre" />
          </div>

          <!-- ✅ Campo Nombre Corto -->
          <div class="form-group">
            <label>{{ $t('editor.config.short_name') }} <small>(Máx 12 letras)</small></label>
            <input v-model="config.nombre_corto" type="text" placeholder="Ej: SierraNevada" maxlength="15" />
          </div>
          <div class="form-group">
            <label>{{ $t('editor.config.slogan') }}</label>
            <input v-model="config.subtitulo" />
          </div>
          
          <div class="options-grid" style="margin-top: 16px;">
             <label class="checkbox-card">
                <input type="checkbox" v-model="config.ocultarTextoPortada" />
                <span>{{ $t('editor.config.hide_text') }}</span>
              </label>
          </div>

          <div class="form-group" style="margin-top: 16px;">
             <label>{{ $t('editor.config.cover_img') }}</label>
             <div class="input-group-row">
                <input v-model="config.imagenPortada" type="text" placeholder="https://..." class="clean-input" style="flex: 1;" />
                <input type="file" @change="e => subirImagenConfig(e, 'imagenPortada')" accept="image/*" style="width: auto;" />
             </div>
             <div v-if="config.imagenPortada" class="img-preview">
                <img :src="config.imagenPortada" />
                <button @click="config.imagenPortada = ''" class="btn-text-danger">{{ $t('common.delete') }}</button>
             </div>
          </div>

          <div class="form-group">
             <label>{{ $t('editor.config.menu_bg') }}</label>
             <div class="input-group-row">
                <input v-model="config.imagenFondoMenu" type="text" placeholder="https://..." class="clean-input" style="flex: 1;" />
                <input type="file" @change="e => subirImagenConfig(e, 'imagenFondoMenu')" accept="image/*" style="width: auto;" />
             </div>
             <div v-if="config.imagenFondoMenu" class="img-preview">
                <img :src="config.imagenFondoMenu" />
                <button @click="config.imagenFondoMenu = ''" class="btn-text-danger">{{ $t('common.delete') }}</button>
             </div>
          </div>

          <!-- ✅ NUEVO: Configuración de Propina -->
          <div class="form-group" style="margin-top: 24px; border-top: 2px solid #e5e7eb; padding-top: 24px;">
            <label>💰 {{ $t('editor.config.tip_percentage') }}</label>
            <div style="display: flex; align-items: center; gap: 12px;">
              <input
                v-model.number="porcentajePropina"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="10"
                style="width: 100px;"
              />
              <span style="color: #6b7280;">%</span>
              <span style="color: #6b7280; font-size: 14px;">
                ({{ $t('common.currently') }}: {{ porcentajePropina }}%)
              </span>
            </div>
            <p style="font-size: 13px; color: #6b7280; margin-top: 8px;">
              {{ $t('editor.config.tip_help') }}
            </p>
          </div>

          <!-- ✅ NUEVO: Colores del tema -->
          <div style="margin-top: 24px; border-top: 2px solid #e5e7eb; padding-top: 24px;">
            <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
              🎨 {{ $t('editor.config.colors_title') }}
            </h4>
            <div class="form-grid">
              <div class="form-group">
                <label>{{ $t('editor.config.colors_primary') }}</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input v-model="config.color_primario" type="color" style="width: 60px; height: 40px; cursor: pointer; border-radius: 6px; border: 1px solid #e5e7eb;" />
                  <input v-model="config.color_primario" type="text" placeholder="#667eea" style="flex: 1;" />
                </div>
              </div>
              
              <div class="form-group">
                <label>{{ $t('editor.config.colors_secondary') }}</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input v-model="config.color_secundario" type="color" style="width: 60px; height: 40px; cursor: pointer; border-radius: 6px; border: 1px solid #e5e7eb;" />
                  <input v-model="config.color_secundario" type="text" placeholder="#764ba2" style="flex: 1;" />
                </div>
              </div>
            </div>
          </div>

          <!-- ✅ NUEVO: Iconos de la Aplicación -->
          <div style="margin-top: 24px; border-top: 2px solid #e5e7eb; padding-top: 24px;">
            <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
              📱 {{ $t('editor.config.icons_title') }}
            </h4>
            
            <div class="form-grid">
              <!-- Favicon -->
              <div class="form-group">
                <label>Favicon (32x32)</label>
                <input type="file" @change="(e) => subirIcono(e, 'favicon_url')" accept="image/*" />
                <div v-if="config.favicon_url" class="img-preview-small" style="margin-top: 8px;">
                  <img :src="config.favicon_url" alt="Favicon" style="width: 32px; height: 32px; object-fit: contain;" />
                  <button @click="config.favicon_url = ''" type="button" class="btn-text-danger">{{ $t('common.delete') }}</button>
                </div>
              </div>

              <!-- PWA 192 -->
              <div class="form-group">
                <label>Icono App (192x192)</label>
                <input type="file" @change="(e) => subirIcono(e, 'icon_192_url')" accept="image/*" />
                <div v-if="config.icon_192_url" class="img-preview-small" style="margin-top: 8px;">
                  <img :src="config.icon_192_url" alt="Icon 192" style="width: 48px; height: 48px; object-fit: contain;" />
                  <button @click="config.icon_192_url = ''" type="button" class="btn-text-danger">{{ $t('common.delete') }}</button>
                </div>
              </div>

              <!-- PWA 512 -->
              <div class="form-group">
                <label>Icono Grande (512x512)</label>
                <input type="file" @change="(e) => subirIcono(e, 'icon_512_url')" accept="image/*" />
                <div v-if="config.icon_512_url" class="img-preview-small" style="margin-top: 8px;">
                  <img :src="config.icon_512_url" alt="Icon 512" style="width: 48px; height: 48px; object-fit: contain;" />
                  <button @click="config.icon_512_url = ''" type="button" class="btn-text-danger">{{ $t('common.delete') }}</button>
                </div>
              </div>

              <!-- Apple Touch -->
              <div class="form-group">
                <label>Icono Apple (180x180)</label>
                <input type="file" @change="(e) => subirIcono(e, 'apple_touch_icon_url')" accept="image/*" />
                <div v-if="config.apple_touch_icon_url" class="img-preview-small" style="margin-top: 8px;">
                  <img :src="config.apple_touch_icon_url" alt="Apple Icon" style="width: 48px; height: 48px; object-fit: contain;" />
                  <button @click="config.apple_touch_icon_url = ''" type="button" class="btn-text-danger">{{ $t('common.delete') }}</button>
                </div>
              </div>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
              💡 {{ $t('editor.config.icons_help') }}
            </p>
          </div>
          
          <button @click="guardarConfig" class="btn-submit" :disabled="guardando" style="margin-top: 24px;">
            {{ guardando ? $t('common.saving') : '💾 ' + $t('common.save_changes') }}
          </button>

          <div class="qr-preview" style="margin-top: 32px; text-align: center;">
             <h4>{{ $t('editor.qr_title') }}</h4>
             <GeneradorQR :valor="urlMenuDinamica" :size="180" />
             <p style="margin-top: 8px; font-size: 12px; color: #666;">{{ urlMenuDinamica }}</p>
          </div>
        </div>
      </div>

      <!-- TAB: MESAS -->
      <div v-if="activeTab === 'mesas'" class="tab-content fade-in">
        <div class="card form-card">
          <div class="card-header">
            <h3>➕ {{ $t('editor.tables.new_table') }}</h3>
          </div>
          <form @submit.prevent="crearMesa" class="inline-form">
            <div class="form-grid" style="grid-template-columns: 1fr 1fr auto;">
              <input v-model.number="newMesa.numero" type="number" :placeholder="$t('editor.tables.number')" required />
              <input v-model.number="newMesa.capacidad" type="number" :placeholder="$t('editor.tables.capacity')" required />
              <button type="submit" class="btn-submit small" style="width: auto;">{{ $t('common.add') }}</button>
            </div>
          </form>
        </div>

        <div class="mesas-grid">
          <div v-for="mesa in mesas" :key="mesa.id" class="mesa-card">
            <div class="mesa-number">{{ $t('common.table') }} {{ mesa.numero }}</div>
            <div class="mesa-capacity">👤 {{ mesa.capacidad }} {{ $t('common.people') }}</div>
            <button @click="eliminarMesa(mesa.id)" class="btn-icon delete-mesa" title="Eliminar">✕</button>
          </div>
        </div>
      </div>

      <!-- TAB: CATEGORÍAS (Restored) -->
      <div v-if="activeTab === 'categorias'" class="tab-content fade-in">
          <div class="card form-card">
              <div class="card-header">
                  <h3>➕ {{ $t('editor.tabs.categories') }}</h3>
              </div>
              <form @submit.prevent="crearCategoria" class="inline-form">
                  <div class="form-grid" style="grid-template-columns: 2fr 1fr auto;">
                      <div class="input-labeled">
                        <label>{{ $t('editor.form.name') }}</label>
                        <input v-model="newCategory.name" :placeholder="$t('editor.placeholders.category')" required />
                      </div>
                      <div class="input-labeled">
                        <label>Orden</label>
                        <input v-model.number="newCategory.display_order" type="number" placeholder="0" />
                      </div>
                      <div class="input-labeled">
                         <label>&nbsp;</label>
                         <button type="submit" class="btn-submit small">{{ $t('common.add') }}</button>
                      </div>
                  </div>
              </form>
          </div>

          <div class="list-container">
              <div class="list-header">
                <span style="flex: 2;">{{ $t('editor.headers.category_name') }}</span>
                <span style="flex: 1; text-align: center;">{{ $t('editor.headers.visual_order') }}</span>
                <span style="width: 40px;"></span>
              </div>
              <div v-for="cat in categories" :key="cat.id" class="list-item-row">
                  <div style="flex: 2;">
                    <input v-model="cat.name" class="clean-input" @change="actualizarCategoria(cat)" />
                  </div>
                  <div style="flex: 1; text-align: center;">
                    <input v-model.number="cat.display_order" type="number" class="clean-input center" @change="actualizarCategoria(cat)" />
                  </div>
                  <div style="width: 40px; text-align: right;">
                    <button @click="eliminarCategoria(cat.id)" class="btn-icon delete" title="Eliminar">🗑️</button>
                  </div>
              </div>
          </div>
      </div>

      <!-- TAB: MÉTODOS DE PAGO (Restored) -->
      <div v-if="activeTab === 'pagos'" class="tab-content fade-in">
          <div class="card form-card">
              <div class="card-header">
                  <h3>➕ {{ $t('editor.tabs.payments') }}</h3>
              </div>
              <form @submit.prevent="crearMetodoPago" class="inline-form">
                  <div class="form-grid" style="grid-template-columns: 1fr 1fr auto;">
                      <div class="input-labeled">
                        <label>Código Interno</label>
                        <input v-model="newPaymentMethod.name" placeholder="ej: daviplata" required />
                      </div>
                      <div class="input-labeled">
                        <label>Nombre Visible</label>
                        <input v-model="newPaymentMethod.label" placeholder="ej: Daviplata" required />
                      </div>
                      <div class="input-labeled">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn-submit small">{{ $t('common.add') }}</button>
                      </div>
                  </div>
              </form>
          </div>

          <div class="list-container">
               <div class="list-header">
                <span style="flex: 1;">{{ $t('editor.headers.visible_name') }}</span>
                <span style="flex: 1;">{{ $t('editor.headers.internal_code') }}</span>
                <span style="width: 100px; text-align: center;">{{ $t('editor.headers.status') }}</span>
                <span style="width: 40px;"></span>
              </div>
              <div v-for="pm in paymentMethods" :key="pm.id" class="list-item-row">
                  <div style="flex: 1;">
                      <input v-model="pm.label" class="clean-input" @change="actualizarMetodoPago(pm)" />
                  </div>
                  <div style="flex: 1; color: #6b7280; font-family: monospace;">
                      {{ pm.name }}
                  </div>
                  <div style="width: 100px; display: flex; justify-content: center;">
                      <label class="switch">
                          <input type="checkbox" v-model="pm.active" @change="actualizarMetodoPago(pm)">
                          <span class="slider round"></span>
                      </label>
                  </div>
                  <div style="width: 40px; text-align: right;">
                      <button v-if="pm.name !== 'cash'" @click="eliminarMetodoPago(pm.id)" class="btn-icon delete">🗑️</button>
                  </div>
              </div>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
            ℹ️ <strong>{{ $t('editor.headers.status') }}:</strong> {{ $t('editor.config.payment_method_status_help') }}
          </p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'; // Import useI18n
import api from '../api';
import GeneradorQR from './GeneradorQR.vue';

const { t } = useI18n(); // Destructure t function
const emit = defineEmits(['volver']);

const activeTab = ref('menu');
const loading = ref(false);
// ✅ URL DINÁMICA: Detecta si es localhost o vercel
const urlMenuDinamica = computed(() => {
  const origen = window.location.origin;
  return `${origen}/menu`; 
});



// Estado Menú
const menuItems = ref([]);
const newItem = ref({ 
  nombre: '',
  descripcion: '',
  precio: 0,
  categoria: '',
  tiempo_estimado: 15,
  usa_inventario: false,
  stock_actual: 0,
  stock_minimo: 0,
  unidad_medida: 'unidades',
  es_directo: false,
  image_url: '' // ✅ NUEVO
});

// Estado Configuración
const config = ref({
  nombre: 'Restaurante Sierra Nevada',
  nombre_corto: 'Restaurante', // ✅ NUEVO
  subtitulo: 'Menú Digital',
  imagenPortada: '',
  imagenFondoMenu: '',
  ocultarTextoPortada: false,
  color_primario: '#667eea',
  color_secundario: '#764ba2'
});

// ✅ NUEVO: Porcentaje de propina
const porcentajePropina = ref(10);

// ✅ NUEVO: Estado de carga de imagen
const subiendoImagen = ref(false);
const itemEditandoImagen = ref(null); // ID del item cuya imagen se está subiendo

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
const getBadgeText = (estado) => {
  const badges = {
    'disponible': '✅ Disponible',
    'poco_stock': '⚠️ Poco Stock',
    'no_disponible': '❌ Agotado'
  };
  return badges[estado] || estado;
};

const cargarMenu = async () => {
  try {
    const res = await api.getMenu();
    menuItems.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

// ✅ NUEVO: Subir imagen del item a Cloudinary
const subirImagenItem = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tamaño (10MB máximo para fondos grandes)
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen es muy grande. Máximo 10MB.');
    return;
  }
  
  subiendoImagen.value = true;
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const res = await api.uploadMenuImage(formData);
    newItem.value.image_url = res.data.url;
    
    alert('✅ Imagen subida correctamente');
  } catch (err) {
    console.error('Error subiendo imagen:', err);
    alert('❌ Error al subir la imagen');
  } finally {
    subiendoImagen.value = false;
  }
};

// ✅ NUEVO: Subir imagen de configuración (Portada/Fondo)
const subirImagenConfig = async (event, campo) => {
  const file = event.target.files[0];
  if (!file) return;

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen es muy grande. Máximo 10MB.');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('image', file);

    const res = await api.uploadMenuImage(formData);
    config.value[campo] = res.data.url;

    alert('✅ Imagen subida correctamente. Recuerda Guardar Cambios.');
  } catch (err) {
    console.error('Error subiendo imagen:', err);
    alert('❌ Error al subir la imagen');
  }
};

// ✅ NUEVO: Subir iconos de aplicación
const subirIcono = async (event, campo) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validar que sea imagen
  if (!file.type.startsWith('image/')) {
    alert('❌ Solo se permiten imágenes');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert('❌ La imagen es muy grande. Máximo 2MB.');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('image', file);

    // Usamos el mismo endpoint de upload de menú, Cloudinary maneja todo
    const res = await api.uploadMenuImage(formData);
    
    // Actualizar campo específico en config
    config.value[campo] = res.data.url;

    alert(`✅ Icono subido correctamente. Recuerda Guardar Cambios para aplicar.`);
  } catch (err) {
    console.error('Error subiendo icono:', err);
    alert('❌ Error al subir el icono');
  }
};

// ✅ NUEVO: Subir imagen para item existente
const subirImagenItemExistente = async (event, item) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB.');
        return;
    }

    itemEditandoImagen.value = item.id;

    try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await api.uploadMenuImage(formData);
        item.image_url = res.data.url;

        // Guardar en BD
        await actualizarItem(item);

        alert('✅ Imagen actualizada');
    } catch (err) {
        console.error('Error subiendo imagen:', err);
        alert('❌ Error al subir la imagen');
    } finally {
        itemEditandoImagen.value = null;
    }
};

// ✅ NUEVO: Eliminar imagen de item existente
const eliminarImagenItem = async (item) => {
    if (!confirm('¿Eliminar la imagen de este plato?')) return;

    item.image_url = '';
    await actualizarItem(item);
};

const crearItem = async () => {
  loading.value = true;
  try {
    const itemData = {
      nombre: newItem.value.nombre,
      descripcion: newItem.value.descripcion,
      categoria: newItem.value.categoria,
      precio: newItem.value.precio,
      tiempo_estimado: newItem.value.tiempo_estimado,
      disponible: true,
      usa_inventario: newItem.value.usa_inventario,
      stock_actual: newItem.value.usa_inventario ? newItem.value.stock_actual : null,
      stock_minimo: newItem.value.usa_inventario ? newItem.value.stock_minimo : 5,
      estado_inventario: newItem.value.usa_inventario ? 'disponible' : 'disponible',
      image_url: newItem.value.image_url || null, // ✅ NUEVO
      es_directo: newItem.value.es_directo // ✅ NUEVO
    };
    
    await api.agregarMenuItem(itemData);
    
    newItem.value = { 
      nombre: '', 
      categoria: '', 
      precio: 0,
      descripcion: '', 
      tiempo_estimado: 15,
      usa_inventario: false,
      stock_actual: 0,
      stock_minimo: 0,
      unidad_medida: 'unidades',
      es_directo: false,
      image_url: '' // ✅ NUEVO
    };
    
    await cargarMenu();
  } catch (err) {
    console.error(err);
    alert('Error creando item');
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

const toggleDisponibilidad = async (item) => {
  const nuevoEstado = !item.disponible;
  try {
    // Actualizamos localmente para feedback inmediato
    item.disponible = nuevoEstado;
    await api.updateMenuItem(item.id, { disponible: nuevoEstado });
  } catch (err) {
    console.error(err);
    alert('Error al cambiar disponibilidad');
    item.disponible = !nuevoEstado; // Revertir
  }
};

const deletingId = ref(null);

const eliminarItem = async (id) => {
  const mensaje = `⚠️ ADVERTENCIA CRÍTICA ⚠️\n\nSi eliminas este plato, desaparecerá de TODOS los reportes históricos de ventas.\n\n¿Estás SEGURO de que quieres eliminarlo?\n(Recomendamos usar el botón 'Ojo' para solo ocultarlo)`;
  
  if (!confirm(mensaje)) return;
  if (!confirm('¿De verdad? Esta acción no se puede deshacer.')) return;
  
  deletingId.value = id; 
  try {
    await api.deleteMenuItem(id);
    menuItems.value = menuItems.value.filter(i => i.id !== id);
  } catch (err) {
    console.error(err);
    alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
    await cargarMenu();
  } finally {
    deletingId.value = null;
  }
};

// --- MÉTODOS CONFIGURACIÓN ---
const guardando = ref(false);



const guardarConfig = async () => {
  guardando.value = true;
  try {
    // Guardar configuración de menú
    await api.saveConfig(config.value);
    // ✅ NUEVO: Guardar porcentaje de propina
    await api.updateConfig('porcentaje_propina', porcentajePropina.value);
    
    // ✅ NUEVO: Aplicar colores inmediatamente
    if (config.value.color_primario) {
      document.documentElement.style.setProperty('--theme-color', config.value.color_primario);
    }
    if (config.value.color_secundario) {
      document.documentElement.style.setProperty('--background-color', config.value.color_secundario);
    }
    
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
      // ✅ NUEVO: Cargar porcentaje de propina
      if (res.data.porcentaje_propina) {
        porcentajePropina.value = parseFloat(res.data.porcentaje_propina);
      }
      
      // ✅ NUEVO: Aplicar colores guardados
      if (res.data.color_primario) {
        document.documentElement.style.setProperty('--theme-color', res.data.color_primario);
      }
      if (res.data.color_secundario) {
        document.documentElement.style.setProperty('--background-color', res.data.color_secundario);
      }
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

// Computed para agrupar ítems por categoría y ORDENAR por configuración
const menuAgrupado = computed(() => {
  const grupos = {};
  
  // 1. Agrupar
  pedidoStore.menu.forEach(item => {
    if (!grupos[item.categoria]) grupos[item.categoria] = [];
    grupos[item.categoria].push(item);
  });

  // 2. Ordenar objeto basado en la lista de categorías (categories.value)
  const gruposOrdenados = {};
  
  // Primero las categorías definidas en el orden correcto
  categories.value.forEach(cat => {
    if (grupos[cat.name]) {
        gruposOrdenados[cat.name] = grupos[cat.name];
        delete grupos[cat.name]; // Ya lo procesamos
    }
  });

  // Luego las que sobren (por si hay inconsistencias o categorías borradas)
  Object.keys(grupos).sort().forEach(key => {
      gruposOrdenados[key] = grupos[key];
  });

  return gruposOrdenados;
});

// --- MÉTODOS CATEGORÍAS ---
const categories = ref([]);
const newCategory = ref({ name: '', display_order: 0 });

const cargarCategories = async () => {
    try {
        const res = await api.getCategories();
        categories.value = res.data; // Ya viene ordenado por DB
    } catch (err) {
        console.error('Error cargando categorías:', err);
    }
};

const crearCategoria = async () => {
    if (!newCategory.value.name) return;
    try {
        await api.createCategory(newCategory.value);
        newCategory.value = { name: '', display_order: 0 };
        await cargarCategories();
    } catch (err) {
        alert(err.response?.data?.error || 'Error creando categoría');
    }
};

const actualizarCategoria = async (cat) => {
    try {
        await api.updateCategory(cat.id, cat);
        // Recargar para ordenar
        await cargarCategories();
    } catch (err) {
        alert('Error actualizando categoría');
    }
};

const eliminarCategoria = async (id) => {
    if (!confirm('⚠️ ¿Eliminar esta categoría?\n\nSi hay platos asociados, no se permitirá eliminar.')) return;
    try {
        await api.deleteCategory(id);
        await cargarCategories();
    } catch (err) {
        alert(err.response?.data?.error || 'Error al eliminar');
    }
};

// --- MÉTODOS PAGOS ---
const paymentMethods = ref([]);
const newPaymentMethod = ref({ name: '', label: '', is_digital: false });

const cargarPaymentMethods = async () => {
    try {
        const res = await api.getPaymentMethods();
        paymentMethods.value = res.data;
    } catch (err) {
        console.error('Error cargando métodos de pago:', err);
    }
};

const crearMetodoPago = async () => {
    if (!newPaymentMethod.value.name || !newPaymentMethod.value.label) return;
    try {
        await api.createPaymentMethod(newPaymentMethod.value);
        newPaymentMethod.value = { name: '', label: '', is_digital: false };
        await cargarPaymentMethods();
    } catch (err) {
        alert(err.response?.data?.error || 'Error creando método de pago');
    }
};

const actualizarMetodoPago = async (pm) => {
    try {
        // Enviar el objeto tal cual, la DB espera 'active' (que ya debe estar en pm) o 'active' mapeado
        // Si el v-model está en pm.active, esto funciona directo.
        await api.updatePaymentMethod(pm.id, pm);
    } catch (err) {
        console.error(err);
        alert('Error actualizando método');
    }
};

const eliminarMetodoPago = async (id) => {
    if (!confirm('¿Eliminar método de pago?')) return;
    try {
        await api.deletePaymentMethod(id);
        await cargarPaymentMethods();
    } catch (err) {
         alert('Error al eliminar');
    }
};

onMounted(() => {
  cargarMenu();
  cargarMesas();
  cargarConfig();
  cargarCategories(); // ✅ NUEVO
  cargarPaymentMethods(); // ✅ NUEVO
  // obtenerIP();
});
</script>

<style src="../assets/styles/EditorPanel.css" scoped></style>

<style scoped>
/* Clean List Styling */
.input-labeled {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.input-labeled label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.list-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
  margin-top: 16px;
}

.list-header {
  display: flex;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-.action-buttons-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-eye-active {
  background-color: #e5e7eb;
  border-radius: 4px;
  padding: 4px 8px;
}

.btn-eye-off {
  background-color: #fee2e2;
  border-radius: 4px;
  padding: 4px 8px;
  opacity: 0.8;
}

.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.list-item-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  gap: 12px;
}

.list-item-row:last-child {
  border-bottom: none;
}

.clean-input {
  width: 100%;
  border: 1px solid transparent;
  padding: 4px 8px;
  border-radius: 4px;
  background: transparent;
  font-size: 14px;
}

.clean-input:hover {
  background: #f3f4f6;
}

.clean-input:focus {
  background: white;
  border-color: var(--color-primary);
  outline: none;
}

.clean-input.center {
  text-align: center;
}

.input-group-row {
   display: flex;
   gap: 8px;
   align-items: center;
}
</style>
