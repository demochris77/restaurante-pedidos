<template>
  <div class="mesero-panel">
    <div class="panel-header">
      <div class="header-content">
        <div class="header-title">
          <h2><ClipboardList :size="28" class="text-primary" /> {{ $t('waiter.title') }}</h2>
        </div>
        <div class="header-buttons">
          <button @click="abrirQRMesas" class="btn-icon-label" title="QR Mesas">
            <Printer :size="18" /> {{ $t('waiter.tables_qr') }}
          </button>
          <button @click="mostrarQRMenu" class="btn-icon-label" title="QR Menú">
            <QrCode :size="18" /> {{ $t('waiter.menu_qr') }}
          </button>
          <button @click="cargarDatos" class="btn-refresh" :disabled="loading" :class="{ 'spinning': loading }">
            <RefreshCw :size="20" />
          </button>
        </div> 
      </div>
    </div>

    <div class="panel-content">
      <div v-if="loading && !pedidoStore.mesas.length" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('waiter.loading') }}</p>
      </div>

      <template v-else>
        <!-- Notificaciones -->
        <!-- Notificaciones (Legacy removed - handled by Global Toasts) -->

        <!-- Selector de Mesa -->
        <div class="section tables-section">
          <h3><LayoutGrid :size="20" class="text-muted" /> {{ $t('waiter.select_table') }}</h3>
          <div class="mesas-grid" :class="{ 'single-table': mesaSeleccionada }">
            <button
              v-for="mesa in pedidoStore.mesas"
              :key="mesa.numero"
              v-show="!mesaSeleccionada || mesaSeleccionada === mesa.numero"
              @click="!isTableBlocked(mesa) && toggleMesa(mesa.numero)"
              :class="['mesa-btn', { 
                'mesa-active': mesaSeleccionada === mesa.numero,
                'mesa-blocked': isTableBlocked(mesa)
              }]"
              :disabled="isTableBlocked(mesa)"
            >
              <div class="table-content">
                 <span class="table-label">{{ $t('common.table') }}</span>
                 <span class="table-number">{{ mesa.numero }}</span>
              </div>
              <Lock v-if="isTableBlocked(mesa)" :size="16" class="lock-icon" />
            </button>
          </div>
        </div>

        <!-- Selector de Items -->
        <div class="section items-section" v-if="mesaSeleccionada">
          <h3><Utensils :size="20" class="text-muted" /> {{ $t('waiter.select_dishes') }}</h3>
          
          <div class="filters-row">
            <div class="categorias-tabs" :class="{ 'single-category': categoriaSeleccionada }">
                <button
                v-for="cat in categorias"
                :key="cat"
                v-show="!categoriaSeleccionada || categoriaSeleccionada === cat"
                @click="toggleCategoria(cat)"
                :class="['tab', { 'tab-active': categoriaSeleccionada === cat }]"
                >
                {{ cat }}
                </button>
            </div>

            <div class="search-container">
                <Search :size="16" class="search-icon" />
                <input
                v-model="busqueda"
                type="text"
                :placeholder="$t('waiter.search_dishes')"
                class="search-input"
                />
                <button v-if="busqueda" @click="busqueda = ''" class="btn-clear-search"><X :size="14" /></button>
            </div>
          </div>

          <div class="items-grid">
            <div
              v-for="item in itemsPorCategoria"
              :key="item.id"
              :class="['item-card', { 
                'item-disabled': !canAddMain(item),
                'item-low-stock': item.estado_inventario === 'poco_stock'
              }]"
              @click="canAddMain(item) ? agregarItemAlPedido(item) : null"
            >
              <div class="item-image-wrapper">
                 <img v-if="item.image_url" :src="item.image_url" :alt="item.nombre" class="item-img" />
                 <div v-else class="item-placeholder">
                    <UtensilsCrossed :size="24" />
                 </div>
                 
                 <div v-if="item.estado_inventario === 'no_disponible' || getRemainingStockMain(item) <= 0" class="stock-badge out">
                    {{ $t('waiter.sold_out') }}
                 </div>
                 <div v-else-if="item.estado_inventario === 'poco_stock' && !item.usa_inventario" class="stock-badge low">
                    {{ $t('waiter.low_stock') }}
                 </div>
                 <div v-else-if="item.usa_inventario" class="stock-badge count">
                    {{ getRemainingStockMain(item) }} {{ $t('waiter.available') }}
                 </div>
              </div>
              
              <div class="item-info">
                  <div class="item-nombre">{{ item.nombre }}</div>
                  <div class="item-meta">
                      <span class="item-precio">${{ item.precio }}</span>
                      <span class="item-tiempo"><Clock :size="12" /> {{ item.tiempo_preparacion_min }}{{ $t('common.min') }}</span>
                  </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen del Pedido (Sticky Footer/Sidebar style implied by CSS later) -->
        <div class="section order-summary-section" v-if="pedidoEnProgreso.length > 0">
           <div class="summary-header">
              <h3><ShoppingCart :size="20" class="text-primary" /> {{ $t('waiter.order_summary') }}</h3>
              <span class="badge-table">{{ $t('common.table') }} {{ mesaSeleccionada }}</span>
           </div>
          
          <div class="pedido-summary-list">
            <div class="summary-item" v-for="(item, idx) in pedidoEnProgreso" :key="idx">
              <div class="item-row-main">
                 <div class="item-qty-name">
                    <div class="qty-controls">
                        <button 
                            @click="disminuirCantidad(idx)" 
                            class="btn-qty"
                        >
                            <Minus :size="14" />
                        </button>
                        <span class="cantidad-val">{{ item.cantidad }}</span>
                        <button 
                            @click="incrementarCantidad(item)" 
                            class="btn-qty"
                            :disabled="!canAddMain(item)"
                        >
                            <Plus :size="14" />
                        </button>
                    </div>
                    <span class="nombre">{{ item.nombre }}</span>
                 </div>
                 <span class="precio">${{ (item.cantidad * item.precio).toFixed(2) }}</span>
              </div>
              
              <div class="item-actions-row">
                 <div class="item-inputs">
                     <textarea
                        v-if="!item.es_directo"
                        v-model="item.notas"
                        :placeholder="$t('waiter.item_notes_placeholder') || 'Notas...'"
                        class="input-notes"
                        rows="1"
                    ></textarea>
                 </div>
                 <div class="action-buttons">
                    <button 
                        v-if="item.cantidad > 1" 
                        @click="desagruparItem(idx)" 
                        class="btn-icon-action split"
                        title="Separar"
                    >
                        <Scissors :size="14" />
                    </button>
                    <button @click="removerItem(idx)" class="btn-icon-action delete">
                        <Trash2 :size="14" />
                    </button>
                 </div>
              </div>
            </div>
          </div>
          
          <div class="summary-footer">
            <div class="pedido-total">
                <span>{{ $t('waiter.total') }}</span>
                <span class="total-amount">${{ calcularTotal().toFixed(2) }}</span>
            </div>

            <textarea
                v-model="notasPedido"
                :placeholder="$t('waiter.notes_placeholder')"
                class="main-notes-input"
                rows="2"
            ></textarea>

            <button
                ref="btnConfirmar"
                @click="enviarPedido"
                class="btn-submit-order"
                :disabled="!mesaSeleccionada || pedidoEnProgreso.length === 0 || enviandoPedido"
            >
                <span v-if="enviandoPedido" class="spinning"><Loader2 :size="18" /></span>
                <span v-else>{{ $t('waiter.send_to_kitchen') }} <Send :size="18" /></span>
            </button>
          </div>
        </div>

        <!-- FAB Buttons -->
        <!-- Scroll to Confirm (bottom-right) -->
        <button 
          v-if="pedidoEnProgreso.length > 0" 
          @click="scrollToConfirm" 
          class="fab-confirm"
          title="Ir a confirmar pedido"
        >
          <Check :size="24" />
        </button>
        
        <!-- Scroll to Categories (bottom-left) -->
        <button 
          v-if="mesaSeleccionada && itemsPorCategoria.length > 0" 
          @click="scrollToCategories" 
          :class="['fab-scroll-up', { hidden: !showScrollUpButton }]"
          title="Ir a categorías"
        >
          <ArrowUp :size="24" />
        </button>

        <!-- Items Listos -->
        <div class="section ready-section" v-if="misItemsListos.length > 0">
          <h3>
             <BellRing :size="20" class="text-success" /> 
             {{ $t('waiter.items_ready') }} 
             <span class="badge-count">{{ misItemsListos.length }}</span>
          </h3>
          <div class="ready-grid">
          <div class="ready-grid">
            <div v-for="grupo in misMesasListas" :key="grupo.mesa_numero" class="active-card ready-group">
               <div class="active-header ready-header-group">
                 <span class="table-badge">{{ $t('common.table') }} {{ grupo.mesa_numero }}</span>
                 <button @click="servirMesa(grupo)" class="btn-serve-all">
                    {{ $t('waiter.mark_all_served') }} <CheckCheck :size="16" />
                 </button>
               </div>
               
               <div class="active-body">
                 <div class="ready-items-list">
                    <div v-for="item in grupo.items" :key="item.item_id" class="ready-item-row">
                       <span class="ready-qty">{{ item.cantidad_lista }}x</span>
                       <span class="ready-name">{{ item.nombre }}</span>
                       <span class="time-badge mini">
                         <Clock :size="10" /> {{ calcularTiempoDesde(item.tiempoDesdeReady) }}
                       </span>
                       <button @click="marcarItemComoServido(item.item_ids[0])" class="btn-icon-action check" title="Servir">
                          <Check :size="14" />
                       </button>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          </div>
        </div>



        <!-- Pedidos Activos -->
        <div class="section active-orders-section">
          <h3><Activity :size="20" class="text-secondary" /> {{ $t('waiter.orders_in_progress') }}</h3>
          <div v-if="misPedidos.length === 0" class="empty-active-state">
            <Coffee :size="32" class="text-muted" />
            <p>{{ $t('waiter.no_active_orders') }}</p>
          </div>
          <div v-else class="active-grid">
            <div v-for="pedido in misPedidos" :key="pedido.id" class="active-card">
              <div class="active-header">
                <span class="table-badge">{{ $t('common.table') }} {{ pedido.mesa_numero }}</span>
                <span :class="['status-pill', `status-${pedido.estado}`]">
                   <span class="dot"></span> {{ $t('status.' + pedido.estado) }}
                </span>
              </div>
              <div class="active-body">
                <div class="active-meta">
                   <span><Layers :size="14" /> {{ pedido.items_count }} items</span>
                   <span class="active-price">${{ pedido.total }}</span>
                </div>
                <div class="active-actions" :class="{ 'served-layout': pedido.estado === 'servido' }">
                  <!-- Primera fila: Editar, Cambiar Mesa, Cancelar, QR -->
                  <div class="actions-row">
                    <button 
                      v-if="pedido.estado !== 'listo_pagar'"
                      @click="abrirEditorPedido(pedido)" 
                      class="btn-edit"
                    >
                      <Edit3 :size="16" /> {{ $t('waiter.edit') }}
                    </button>
                    <button 
                      v-if="['nuevo', 'en_cocina'].includes(pedido.estado)"
                      @click="iniciarCambioMesa(pedido)" 
                      class="btn-edit"
                      style="margin-left: 0.25rem;"
                      title="Cambiar Mesa"
                    >
                      <ArrowLeftRight :size="16" />
                    </button>

                    <button 
                      v-if="['nuevo', 'en_cocina'].includes(pedido.estado)"
                      @click="cancelarPedido(pedido.id)"
                      class="btn-cancel"
                      title="Cancelar"
                    >
                      <Trash2 :size="16" />
                    </button>
                    <button @click="mostrarQRCliente(pedido.id)" class="btn-qr" title="QR">
                      <QrCode :size="16" />
                    </button>
                  </div>
                  
                  <!-- Segunda fila: Ver Cuenta y Listo para Pagar (solo para pedidos servidos) -->
                  <div v-if="pedido.estado === 'servido'" class="actions-row">
                    <button 
                      @click="verCuenta(pedido.id)" 
                      class="btn-view-bill"
                    >
                      {{ $t('waiter.view_bill') }} <Eye :size="16" />
                    </button>
                    <button 
                      @click="marcarListoPagar(pedido.id)" 
                      class="btn-pay"
                    >
                      {{ $t('waiter.ready_to_pay') }} <DollarSign :size="16" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
    </template>
    </div>
    
  <!-- QR Modal (simplified) -->
  <div v-if="mostrarQR" class="modal-overlay" @click.self="cerrarQR">
    <div class="modal-content qr-content">
        <button class="btn-close-modal" @click="cerrarQR"><X :size="24" /></button>
        <h3>{{ tipoQR === 'menu' ? $t('waiter.menu_qr') : $t('waiter.scan_status') }}</h3>
        <GeneradorQR ref="qrComponent" :valor="urlParaQR" :size="300" :mostrarDescarga="false" />
        
        <div class="modal-actions-col">
            <template v-if="tipoQR === 'pedido'">
                <a :href="urlParaQR" target="_blank" class="btn-primary-link">
                    <Eye :size="18" /> {{ $t('qr_view.view_qr') }}
                </a>
                <button @click="imprimirQR" class="btn-secondary-action">
                    <Printer :size="18" /> {{ $t('qr_view.print') }}
                </button>
            </template>

            <template v-if="tipoQR === 'menu'">
                <a :href="urlParaQR" target="_blank" class="btn-primary-link">
                    <FileText :size="18" /> {{ $t('editor.menu.view_menu') }}
                </a>
                 <button @click="imprimirQR" class="btn-secondary-action">
                    <Printer :size="18" /> {{ $t('qr_view.print') }}
                </button>
            </template>
        </div>
    </div>
  </div>

  <!-- Modal de Edición -->
  <div v-if="mostrarEditorPedido" class="modal-overlay" @click.self="cerrarEditorPedido">
    <div class="modal-content editor-modal">
      <div class="modal-header">
        <h3><Edit3 :size="20" /> {{ $t('waiter.edit_order_title') }} {{ pedidoEditando?.mesa_numero }}</h3>
        <button @click="cerrarEditorPedido" class="btn-close-modal"><X :size="24" /></button>
      </div>

      <div class="editor-body">
          <!-- Left Col: Current Items -->
          <div class="editor-col items-col">
             <h4>{{ $t('waiter.order_items') }}</h4>
             <div v-if="!pedidoEditando?.items?.length" class="empty-state-mini">{{ $t('waiter.no_active_orders') }}</div>
             <div v-else class="editor-items-list">
               <div v-for="item in pedidoEditando.items" :key="item.id" class="editor-item-row">
                  <div class="editor-item-header">
                      <span class="item-name">{{ item.nombre }}</span>
                      <span class="item-price">${{ item.precio_unitario }}</span>
                  </div>
                  <div class="editor-item-meta">
                     <span :class="['status-pill-mini', `status-${item.estado}`]">{{ $t('status.' + item.estado) }}</span>
                     <div class="editor-item-actions">
                        <button 
                            v-if="['pendiente','en_preparacion'].includes(item.estado) && item.cantidad > 1"
                            @click="dividirItemEnEdicion(item)" 
                            class="btn-icon-mini"
                            title="Dividir"
                        >
                            <Scissors :size="12" />
                        </button>
                        <button 
                            v-if="['pendiente','en_preparacion','listo','servido'].includes(item.estado)"
                            @click="eliminarItemDelPedido(item)" 
                            class="btn-icon-mini danger"
                        >
                            <Trash2 :size="12" />
                        </button>
                     </div>
                  </div>
                  <div class="editor-item-notes">
                     <textarea
                        v-model="item.notas"
                        @change="guardarNotasItem(item)"
                        placeholder="Notas..."
                        class="input-notes mini"
                        rows="1"
                        :disabled="!['pendiente','en_preparacion'].includes(item.estado)"
                     ></textarea>
                  </div>
               </div>
             </div>
             
             <div class="editor-summary">
                 <strong>{{ $t('waiter.total') }} ${{ pedidoEditando?.total || 0 }}</strong>
             </div>
          </div>
          
          <!-- Right Col: Add Items -->
          <div class="editor-col add-col">
             <h4>{{ $t('waiter.add_items') }}</h4>
             <div class="search-container mini">
                <Search :size="14" class="search-icon" />
                 <input
                    v-model="busquedaEdicion"
                    type="text"
                    :placeholder="$t('waiter.search_dishes')"
                    class="search-input"
                 />
                 <button v-if="busquedaEdicion" @click="busquedaEdicion = ''" class="btn-clear-search"><X :size="12" /></button>
             </div>
             
             <!-- Categories mini -->
             <div class="categorias-tabs mini" :class="{ 'single-category': categoriaEdicion }">
                <button
                    v-for="cat in categorias"
                    :key="cat"
                    v-show="!categoriaEdicion || categoriaEdicion === cat"
                    @click="toggleCategoriaEdicion(cat)"
                    :class="['tab', { 'tab-active': categoriaEdicion === cat }]"
                >
                    {{ cat }}
                </button>
            </div>
            
            <div class="start-items-grid">
               <div
                v-for="menuItem in itemsPorCategoriaEdicion"
                :key="menuItem.id"
                :class="['item-card-mini', { 
                  'disabled': !canAddEdit(menuItem)
                }]"
                @click="canAddEdit(menuItem) ? agregarItemAEdicion(menuItem) : null"
              >
                 <div class="card-mini-content">
                    <span class="mini-name">{{ menuItem.nombre }}</span>
                    <span class="mini-price">${{ menuItem.precio }}</span>
                 </div>
                 <div v-if="menuItem.usa_inventario" class="mini-stock">
                    {{ getRemainingStockEdit(menuItem) }}
                 </div>
                 <div v-if="getRemainingStockEdit(menuItem) <= 0" class="mini-stock out">
                    0
                 </div>
              </div>
            </div>
            
            <!-- Pending Adds -->
            <div id="pending-section-anchor"></div> 
            <div v-if="itemsParaAgregar.length > 0" class="pending-section">
               <h5>{{ $t('waiter.items_to_add') }}</h5>
               <div class="pending-list">
                  <div v-for="(item, idx) in itemsParaAgregar" :key="idx" class="pending-item">
                     <div class="pending-header">
                        <span>{{ item.cantidad }}x {{ item.nombre }}</span>
                        <div class="pending-actions">
                            <button v-if="item.cantidad > 1" @click="desagruparItemAgregado(idx)" class="btn-icon-mini"><Scissors :size="12" /></button>
                            <button @click="quitarItemPendiente(idx)" class="btn-icon-mini"><X :size="12" /></button>
                        </div>
                     </div>
                     <textarea
                        v-model="item.notas"
                        placeholder="Notas..."
                        class="input-notes mini"
                        rows="1"
                    ></textarea>
                  </div>
               </div>
               <button 
                @click="confirmarAgregarItems" 
                class="btn-submit-mini" 
                :disabled="agregandoItems"
               >
                {{ agregandoItems ? $t('common.saving') : $t('waiter.confirm_new_items') }}
               </button>
            </div>

             <!-- Floating Scroll Buttons for Modal -->
             <div class="modal-fabs">
                 <button 
                    v-if="categoriaEdicion" 
                    class="fab-modal up" 
                    @click="toggleCategoriaEdicion(categoriaEdicion)"
                >
                    <ArrowUp :size="20" />
                 </button>
                 <button 
                    v-if="itemsParaAgregar.length > 0" 
                    class="fab-modal down" 
                    @click="scrollToPending"
                >
                    <ArrowDown :size="20" />
                 </button>
             </div>
          </div>
      </div>
    </div>
  </div>

  <!-- Confirm Payment Modal -->
  <div v-if="mostrarConfirmacionPago" class="modal-overlay" @click.self="mostrarConfirmacionPago = false">
    <div class="modal-content small-modal payment-modal">
      <div class="modal-header-clean">
         <h3><DollarSign :size="24" class="text-success" /> {{ $t('waiter.confirm_payment') }}</h3>
         <button @click="mostrarConfirmacionPago = false" class="btn-close-clean"><X :size="20" /></button>
      </div>
      
      <div class="modal-body-clean">
        <p class="confirm-message">{{ $t('waiter.ready_to_pay_confirm') }}</p>
        
        <div class="note-field-wrapper">
          <label class="input-label">{{ $t('waiter.note_for_cashier') }}</label>
          <textarea
            v-model="notaPago"
            placeholder="Ej: 'Pagaron $50.000 en efectivo', 'Dividir cuenta en 2'"
            class="input-notes styled-input"
            rows="3"
          ></textarea>
        </div>

        <div class="modal-actions-row">
          <button @click="mostrarConfirmacionPago = false" class="btn-secondary-action large danger">
            {{ $t('common.cancel') }}
          </button>
          <button @click="confirmarListoPagar" class="btn-primary-action large success">
            {{ $t('common.yes') }} <CheckCircle2 :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal for Batch Serve -->
  <div v-if="mostrarConfirmacionServir" class="modal-overlay" @click.self="mostrarConfirmacionServir = false">
    <div class="modal-content small-modal">
      <div class="modal-header-clean">
        <h3>{{ $t('waiter.mark_all_served') }}</h3>
        <button @click="mostrarConfirmacionServir = false" class="btn-close-clean"><X :size="20" /></button>
      </div>
      
      <div class="modal-body-clean">
        <p class="confirm-message">{{ $t('waiter.confirm_serve_all', { table: mesaParaServir?.mesa, count: mesaParaServir?.items.length }) }}</p>
        
        <div class="modal-actions-row">
          <button @click="mostrarConfirmacionServir = false" class="btn-secondary-action large">
            {{ $t('common.cancel') }}
          </button>
          <button @click="confirmarServirMesa" class="btn-primary-action large success">
            {{ $t('common.yes') }} <CheckCircle2 :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal for Delete Item -->
  <div v-if="mostrarConfirmacionEliminar" class="modal-overlay" @click.self="mostrarConfirmacionEliminar = false">
    <div class="modal-content small-modal">
      <div class="modal-header-clean">
        <h3>{{ $t('waiter.delete_item') }}</h3>
        <button @click="mostrarConfirmacionEliminar = false" class="btn-close-clean"><X :size="20" /></button>
      </div>
      
      <div class="modal-body-clean">
        <p class="confirm-message">{{ confirmacionEliminarMensaje }}</p>
        
        <div class="modal-actions-row">
          <button @click="mostrarConfirmacionEliminar = false" class="btn-secondary-action large">
            {{ $t('common.cancel') }}
          </button>
          <button @click="confirmarEliminarItem" class="btn-primary-action large danger">
            {{ $t('common.yes') }} <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal for Cancel Order -->
  <div v-if="mostrarConfirmacionCancelar" class="modal-overlay" @click.self="mostrarConfirmacionCancelar = false">
    <div class="modal-content small-modal">
      <div class="modal-header-clean">
        <h3>{{ $t('waiter.cancel_order') }}</h3>
        <button @click="mostrarConfirmacionCancelar = false" class="btn-close-clean"><X :size="20" /></button>
      </div>
      
      <div class="modal-body-clean">
        <p class="confirm-message">{{ confirmacionCancelarMensaje }}</p>
        
        <div class="modal-actions-row">
          <button @click="mostrarConfirmacionCancelar = false" class="btn-secondary-action large">
            {{ $t('common.no') }}
          </button>
          <button @click="confirmarCancelarPedido" class="btn-primary-action large danger">
            {{ $t('common.yes') }} <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Change Table Modal -->
  <div v-if="mostrarCambioMesa" class="modal-overlay" @click.self="mostrarCambioMesa = false">
    <div class="modal-content small-modal">
        <div class="modal-header-clean">
            <h3>{{ $t('waiter.change_table') }}</h3>
            <button @click="mostrarCambioMesa = false" class="btn-close-clean"><X :size="20" /></button>
        </div>
        
        <div class="modal-body-clean">
            <p class="confirm-message">
                {{ $t('waiter.change_table_prompt', { table: pedidoParaCambiarMesa?.mesa_numero }) }}
            </p>
            
            <div class="table-selector-grid">
                <button
                    v-for="mesa in mesasDisponibles"
                    :key="mesa"
                    @click="nuevaMesaSeleccionada = mesa"
                    :class="['table-btn', { 'selected': nuevaMesaSeleccionada === mesa }]"
                >
                    {{ mesa }}
                </button>
            </div>
            
            <div class="modal-actions-row" style="margin-top: 1.5rem;">
                <button @click="mostrarCambioMesa = false" class="btn-secondary-action large">
                    {{ $t('common.cancel') }}
                </button>
                <button 
                    @click="confirmarCambioMesa" 
                    class="btn-primary-action large success"
                    :disabled="!nuevaMesaSeleccionada"
                >
                    {{ $t('common.confirm') }} <CheckCircle2 :size="18" />
                </button>
            </div>
        </div>
    </div>
  </div>
</div>

</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { usePedidoStore } from '../stores/pedidoStore';
import { useUsuarioStore } from '../stores/usuarioStore';
import { useNotificaciones } from '../composables/useNotificaciones';
import GeneradorQR from './GeneradorQR.vue';
import api from '../api';
import socket from '../socket';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { 
    ClipboardList, Printer, QrCode, RefreshCw, Bell, AlertTriangle, CheckCircle, 
    LayoutGrid, Lock, Utensils, Search, UtensilsCrossed, Clock, ShoppingCart, 
    Scissors, Trash2, Send, Loader2, Check, BellRing, CheckCircle2, CheckCheck, 
    Layers, Eye, DollarSign, Activity, Coffee, Edit3, X, FileText, ArrowUp, ArrowDown,
    ArrowLeftRight, Plus, Minus
} from 'lucide-vue-next';

const { t } = useI18n();
const { notificaciones, cerrarNotificacion, mostrarNotificacion } = useNotificaciones('mesero');

const pedidoStore = usePedidoStore();
const usuarioStore = useUsuarioStore();

const mesaSeleccionada = ref(null);
const categoriaSeleccionada = ref('');
const pedidoEnProgreso = ref([]);
const notasPedido = ref('');
const loading = ref(false);
const busqueda = ref(''); 
const enviandoPedido = ref(false); 
const agregandoItems = ref(false); 
const qrComponent = ref(null);
const mostrarQR = ref(false);
const urlParaQR = ref('');
const now = ref(Date.now()); 
 
const router = useRouter(); 
const btnConfirmar = ref(null); 

const mostrarConfirmacionPago = ref(false);
const notaPago = ref('');
const pedidoParaPagar = ref(null); 

const mostrarEditorPedido = ref(false);
const pedidoEditando = ref(null);
const itemsParaAgregar = ref([]);
const categoriaEdicion = ref('');
const busquedaEdicion = ref(''); 
const showScrollUpButton = ref(true);

// Table Change State
const mostrarCambioMesa = ref(false);
const pedidoParaCambiarMesa = ref(null);
const nuevaMesaSeleccionada = ref(null);
const mesasDisponibles = ref([]);

// Batch serve confirmation
const mostrarConfirmacionServir = ref(false);
const confirmacionServirMensaje = ref('');
const grupoParaServir = ref(null);

// Delete item confirmation
const mostrarConfirmacionEliminar = ref(false);
const confirmacionEliminarMensaje = ref('');
const itemParaEliminar = ref(null);

// Cancel order confirmation
const mostrarConfirmacionCancelar = ref(false);
const confirmacionCancelarMensaje = ref('');
const pedidoParaCancelar = ref(null);

// Computed para items del menú en el editor
const itemsPorCategoriaEdicion = computed(() => {
  if (!categoriaEdicion.value && !busquedaEdicion.value) {
    return [];
  }
  
  let items = pedidoStore.menu;
  
  // Filter by category
  if (categoriaEdicion.value) {
    items = items.filter(item => item.categoria === categoriaEdicion.value);
  }
  
  // Filter by search
  if (busquedaEdicion.value) {
    const query = busquedaEdicion.value.toLowerCase();
    items = items.filter(item =>
      item.nombre.toLowerCase().includes(query) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(query))
    );
  }
  
  return items;
});

// ✅ STOCK HELPERS
const getStockTotal = (item) => {
  if (!item.usa_inventario || item.es_directo) return 9999;
  return (item.stock_actual || 0) - (item.stock_reservado || 0);
};

// Use Store Logic for REAL consistency
const getRemainingStockMain = (item) => {
  return pedidoStore.getRealTimeStock(item, pedidoEnProgreso.value);
};

const getRemainingStockEdit = (item) => {
  // Combine current items in edit + pending items to add
  // BUT: 'pedidoEditando.items' are ALREADY in the order, so they consume stock?
  // Actually, 'pedidoEditando' items are existing items. 
  // If we are adding NEW items, we need to check if we can add them on top of existing ones.
  // The 'itemsParaAgregar' are the ones we need to validate.
  // AND we must consider the items *already* in the order (pedidoEditando.items) as consuming stock too?
  // Yes, theoretically. The store stock check doesn't know about *active orders* unless they are committed to DB (stock_actual).
  // Committed orders reduce 'stock_actual'.
  // 'itemsParaAgregar' are NOT committed. 'pedidoEditando.items' ARE committed (so they are already deducted from stock_actual).
  // So we only need to validate 'itemsParaAgregar' against 'stock_actual'.
  // EXCEPT: if we are adding MORE of an item that is already in 'itemsParaAgregar'.
  
  return pedidoStore.getRealTimeStock(item, itemsParaAgregar.value);
};

// Use Store Validation
const canAddMain = (item) => {
    // Check if we can add 1 more
    return pedidoStore.checkStockAvailability(item, 1, pedidoEnProgreso.value);
};

const canAddEdit = (item) => {
    return pedidoStore.checkStockAvailability(item, 1, itemsParaAgregar.value);
};

const isTableBlocked = (mesa) => {
  if (!mesa.is_blockable) return false;
  
  const activeOrder = pedidoStore.pedidos.find(p => String(p.mesa_numero) === String(mesa.numero));
  
  if (activeOrder && ['nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja'].includes(activeOrder.estado)) {
    return true;
  }
  
  return false;
};

const getHintEliminar = (item) => {
  return t('waiter.edit');
};

const toggleMesa = (numero) => {
  if (mesaSeleccionada.value === numero) {
    mesaSeleccionada.value = null;
    categoriaSeleccionada.value = '';
    busqueda.value = ''; 
  } else {
    mesaSeleccionada.value = numero;
    categoriaSeleccionada.value = '';
    busqueda.value = ''; 
  }
};

const toggleCategoria = (cat) => {
  if (categoriaSeleccionada.value === cat) {
    categoriaSeleccionada.value = '';
  } else {
    categoriaSeleccionada.value = cat;
  }
};

const toggleCategoriaEdicion = (cat) => {
  if (categoriaEdicion.value === cat) {
    categoriaEdicion.value = '';
  } else {
    categoriaEdicion.value = cat;
  }
};

const abrirQRMesas = () => {
  const routeData = router.resolve({ name: 'mesas-qr' });
  window.open(routeData.href, '_blank');
};
const tipoQR = ref('pedido'); // 'pedido' | 'menu'

const mostrarQRCliente = (pedidoId) => {
  const baseUrl = window.location.origin;
  urlParaQR.value = `${baseUrl}/pedido/${pedidoId}/status`;
  tipoQR.value = 'pedido';
  mostrarQR.value = true;
};

const mostrarQRMenu = () => {
  const baseUrl = window.location.origin;
  urlParaQR.value = `${baseUrl}/menu`;
  tipoQR.value = 'menu';
  mostrarQR.value = true;
};

const cerrarQR = () => {
    mostrarQR.value = false;
};

const imprimirQR = () => {
    if (!qrComponent.value || !qrComponent.value.qrSrc) return;
    
    // Abrir ventana de impresión limpia
    const win = window.open('', '_blank', 'width=600,height=600');
    win.document.write(`
        <html>
            <head>
                <title>Imprimir QR</title>
                <style>
                    body { 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        min-height: 100vh; 
                        margin: 0; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    }
                    img { max-width: 400px; height: auto; margin: 20px 0; }
                    h2 { margin: 0; padding: 20px; text-align: center; }
                    @media print { 
                        button { display: none; } 
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <h2>${tipoQR.value === 'menu' ? t('waiter.menu_qr') : t('waiter.scan_status')}</h2>
                <img src="${qrComponent.value.qrSrc}" />
                <p class="note">${urlParaQR.value}</p>
                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
        </html>
    `);
    win.document.close();
};

const descargarQR = () => {
  if (qrComponent.value && qrComponent.value.qrSrc) {
    const link = document.createElement('a');
    link.href = qrComponent.value.qrSrc;
    link.download = 'qr-pedido.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
const categorias = computed(() => {
  const cats = new Set(pedidoStore.menu.map(item => item.categoria));
  return Array.from(cats).sort();
});

const itemsPorCategoria = computed(() => {
  // ✅ NUEVO: Don't show items if no category selected and no search query
  if (!categoriaSeleccionada.value && !busqueda.value) {
    return [];
  }
  
  let items = pedidoStore.menu;
  
  // Filter by category if selected
  if (categoriaSeleccionada.value) {
    items = items.filter(item => item.categoria === categoriaSeleccionada.value);
  }
  
  // ✅ NUEVO: Filter by search query
  if (busqueda.value) {
    const query = busqueda.value.toLowerCase();
    items = items.filter(item => 
      item.nombre.toLowerCase().includes(query) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(query))
    );
  }
  
  return items;
});

const misPedidos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  // ✅ Include orders assigned to me OR unassigned (null)
  // ✅ Now includes 'servido' state - served orders stay in active list
  return pedidoStore.pedidos.filter(p => 
    (String(p.usuario_mesero_id) === String(usuarioStore.usuario.id) || p.usuario_mesero_id === null) &&
    p.estado !== 'cancelado' &&
    p.estado !== 'listo_pagar' && // Exclude ready-to-pay from active list (goes to cashier)
    p.estado !== 'pagado' // Exclude paid orders
  );
});

const misItemsListos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  
  const _tick = now.value; 
  
  const itemsListos = [];
  
  pedidoStore.pedidos.forEach(pedido => {
    // ✅ Include unassigned orders
    if (String(pedido.usuario_mesero_id) !== String(usuarioStore.usuario.id) && pedido.usuario_mesero_id !== null) return;
    
    if (!['nuevo', 'en_cocina', 'listo'].includes(pedido.estado)) return;
    if (!pedido.items) return;
    
    const itemsAgrupados = {};
    
    pedido.items.forEach(item => {
      if (item.estado === 'listo') {
        const key = `${pedido.id}-${item.menu_item_id}`;
        
        // Cálculo en tiempo real usando el reloj del cliente
        let minutosDinámicos = 0;
        if (item.completed_at) {
            const completedTime = new Date(item.completed_at).getTime();
            // Calculamos la diferencia con el reloj actual (_tick)
            minutosDinámicos = Math.floor((_tick - completedTime) / 60000);
        }

        if (!itemsAgrupados[key]) {
          itemsAgrupados[key] = {
            item_ids: [], // ✅ Array to store ALL item IDs
            pedido_id: pedido.id,
            mesa_numero: pedido.mesa_numero,
            nombre: item.nombre,
            cantidad_lista: 0,
            completed_at: item.completed_at,
            // ✅ Usamos el cálculo dinámico en lugar del estático del backend
            tiempoDesdeReady: minutosDinámicos 
          };
        }
        // ✅ Add this item's ID to the array
        itemsAgrupados[key].item_ids.push(item.id);
        itemsAgrupados[key].cantidad_lista++;
        // To show max time waiting
        if (minutosDinámicos > itemsAgrupados[key].tiempoDesdeReady) {
            itemsAgrupados[key].tiempoDesdeReady = minutosDinámicos;
        }
      }
    });
    
    Object.values(itemsAgrupados).forEach(item => itemsListos.push(item));
  });
  
  return itemsListos;
});

// ✅ NUEVO: Agrupar items listos por mesa para batch actions
const misMesasListas = computed(() => {
  const items = misItemsListos.value;
  const grupos = {};
  
  items.forEach(item => {
    if (!grupos[item.mesa_numero]) {
      grupos[item.mesa_numero] = {
        mesa_numero: item.mesa_numero,
        items: []
      };
    }
    grupos[item.mesa_numero].items.push(item);
  });
  
  return Object.values(grupos).sort((a, b) => a.mesa_numero - b.mesa_numero);
});

const misPedidosServidos = computed(() => {
  if (!usuarioStore.usuario?.id) return [];
  
  // Only show 'servido' status - once marked as 'listo_pagar', it goes to cashier panel
  return pedidoStore.pedidos.filter(p => 
    (String(p.usuario_mesero_id) === String(usuarioStore.usuario.id) || p.usuario_mesero_id === null) &&
    p.estado === 'servido'  // Removed 'listo_pagar' - those orders should only appear in cashier panel
  );
});

// WATCHERS & METHODS
const incrementarCantidad = (item) => {
    // Re-use logic: 'item' is from pedidoEnProgreso, so we look it up by ID to check stock against MAIN menu item definition?
    // Actually 'canAddMain' takes a menu item.
    // The item in 'pedidoEnProgreso' has same properties usually.
    // Let's just call 'agregarItemAlPedido' passing the item, it handles grouping and validation.
    agregarItemAlPedido(item);
};

const disminuirCantidad = (idx) => {
    const item = pedidoEnProgreso.value[idx];
    if (item.cantidad > 1) {
        item.cantidad--;
    } else {
        removerItem(idx);
    }
};

const agregarItemAlPedido = (item) => {
  if (!canAddMain(item)) return; // ✅ Robust check
  
  const existe = pedidoEnProgreso.value.find(p => p.id === item.id && !p.notas); // Group only if no notes
  if (existe) {
    existe.cantidad++;
  } else {
    pedidoEnProgreso.value.push({
      ...item,
      cantidad: 1,
      notas: '' 
    });
  }
};

const removerItem = (idx) => {
  pedidoEnProgreso.value.splice(idx, 1);
};

const desagruparItem = (idx) => {
  const item = pedidoEnProgreso.value[idx];
  if (item.cantidad > 1) {
    item.cantidad--;
    const newItem = { ...item, cantidad: 1, notas: '' }; // Clean copy
    // Insert after current
    pedidoEnProgreso.value.splice(idx + 1, 0, newItem);
  }
};

const calcularTotal = () => {
  return pedidoEnProgreso.value.reduce((acc, item) => acc + (item.cantidad * item.precio), 0);
};

const cargarDatos = async () => {
  loading.value = true;
  await Promise.all([
    pedidoStore.cargarMesas(),
    pedidoStore.cargarMenu(),
    pedidoStore.cargarPedidosActivos()
  ]);
  loading.value = false;
};

const enviarPedido = async () => {
  if (!mesaSeleccionada.value || pedidoEnProgreso.value.length === 0) return;
  enviandoPedido.value = true;
  
  try {
    const items = pedidoEnProgreso.value.map(item => ({
      menu_item_id: item.id,
      cantidad: item.cantidad,
      precio_unitario: item.precio, // Backend needs this
      notas: item.notas || ''
    }));

    // Sanitize table number (handle case where it might be an object)
    let mesaNum = mesaSeleccionada.value;
    if (typeof mesaNum === 'object' && mesaNum !== null) {
      mesaNum = mesaNum.numero || mesaNum.mesa_numero; 
    }

    const payload = {
      mesa_numero: mesaNum,
      usuario_mesero_id: usuarioStore.usuario.id,
      items: JSON.parse(JSON.stringify(items)),
      notas: notasPedido.value
    };
    
    console.log('Enviando pedido:', payload);

    await api.crearPedido(payload);

    pedidoEnProgreso.value = [];
    notasPedido.value = '';
    mesaSeleccionada.value = null; // Reset selection
    mostrarNotificacion(`pedido-enviado-${Date.now()}`, t('waiter.order_sent'), 'success');
  } catch (error) {
    console.error(error);
    mostrarNotificacion(`error-envio-${Date.now()}`, t('waiter.error_sending'), 'error');
  } finally {
    enviandoPedido.value = false;
  }
};

const marcarItemComoServido = async (itemId) => {
  try {
    await api.servirItem(itemId);
  } catch (e) {
    console.error('Error serving item:', e);
    mostrarNotificacion('error', t('common.error'));
  }
};

// ✅ NUEVO: Servir mesa completa
const servirMesa = async (grupo) => {
  console.log('🔘 servirMesa clicked for grupo:', grupo);
  
  // ✅ Flatten all item_ids from all grouped items
  const itemIds = grupo.items.flatMap(i => i.item_ids);
  console.log('📋 Item IDs to serve:', itemIds);
  
  if (itemIds.length === 0) {
    console.warn('⚠️ No items to serve');
    return;
  }

  // Show custom confirmation modal
  confirmacionServirMensaje.value = `¿Marcar como servidos todos los items de la mesa ${grupo.mesa_numero}? (${itemIds.length} items)`;
  grupoParaServir.value = grupo;
  mostrarConfirmacionServir.value = true;
};

const confirmarServirMesa = async () => {
  mostrarConfirmacionServir.value = false;
  
  if (!grupoParaServir.value) {
    console.warn('⚠️ No grupo para servir');
    return;
  }
  
  // ✅ Flatten all item_ids from all grouped items
  const itemIds = grupoParaServir.value.items.flatMap(i => i.item_ids);
  console.log('🚀 Calling api.servirItemsBatch with:', itemIds);
  
  try {
    const response = await api.servirItemsBatch(itemIds);
    console.log('✅ Batch serve success, response:', response);
    mostrarNotificacion(`mesa-servida-${grupoParaServir.value.mesa_numero}`, t('waiter.alert_marked_served'), 'success');
  } catch (e) {
    console.error('❌ Error batch serve:', e);
    mostrarNotificacion('error', t('common.error')); 
  } finally {
    grupoParaServir.value = null;
  }
};

const marcarListoPagar = async (pedidoId) => {
  pedidoParaPagar.value = pedidoId;
  notaPago.value = '';
  mostrarConfirmacionPago.value = true;
};

const confirmarListoPagar = async () => {
  if (!pedidoParaPagar.value) return;
  try {
    // ✅ Send the note along with the status update
    await pedidoStore.actualizarEstadoPedido(pedidoParaPagar.value, 'listo_pagar', notaPago.value || null);
    mostrarNotificacion(`listo-pagar-${pedidoParaPagar.value}`, t('waiter.ready_to_pay'), 'success');
    mostrarConfirmacionPago.value = false;
    notaPago.value = ''; // Clear note after sending
  } catch (e) {
    console.error('Error marcando listo para pagar:', e);
    alert(t('common.error'));
  }
};

const iniciarCambioMesa = async (pedido) => {
    pedidoParaCambiarMesa.value = pedido;
    nuevaMesaSeleccionada.value = null;
    
    // Obtener mesas configuradas del store
    const todasLasMesas = pedidoStore.mesas.map(m => m.numero);
    
    // Obtener mesas ocupadas de los pedidos activos
    const mesasOcupadas = pedidoStore.pedidos
        .filter(p => p.estado !== 'pagado' && p.estado !== 'cancelado')
        .map(p => Number(p.mesa_numero));
        
    // Filtrar mesas disponibles (existentes - ocupadas)
    mesasDisponibles.value = todasLasMesas.filter(m => !mesasOcupadas.includes(Number(m)));
    
    mostrarCambioMesa.value = true;
};

const confirmarCambioMesa = async () => {
    if (!pedidoParaCambiarMesa.value || !nuevaMesaSeleccionada.value) return;
    
    try {
        await api.cambiarMesa(pedidoParaCambiarMesa.value.id, nuevaMesaSeleccionada.value);
        mostrarNotificacion(`cambio-mesa-${pedidoParaCambiarMesa.value.id}`, t('waiter.table_changed'), 'success');
        mostrarCambioMesa.value = false;
        // La actualización vendrá por socket 'pedido_actualizado'
    } catch (e) {
        console.error(e);
        alert(e.response?.data?.error || t('common.error'));
    }
};

const verCuenta = (pedidoId) => {
  if (!pedidoId) return;
  // Navigate in same tab - CuentaView will detect mesero login and show back button to panel
  router.push(`/cuenta/${pedidoId}`);
};



const cancelarPedido = async (pedidoId) => {
  const pedido = pedidoStore.pedidos.find(p => p.id === pedidoId);
  const mesaNumero = pedido ? pedido.mesa_numero : '';
  
  confirmacionCancelarMensaje.value = t('waiter.confirm_cancel_order', { table: mesaNumero });
  pedidoParaCancelar.value = pedidoId;
  mostrarConfirmacionCancelar.value = true;
};

const confirmarCancelarPedido = async () => {
  mostrarConfirmacionCancelar.value = false;
  
  if (!pedidoParaCancelar.value) return;
  
  try {
    await pedidoStore.actualizarEstadoPedido(pedidoParaCancelar.value, 'cancelado');
    mostrarNotificacion('success', t('waiter.alert_cancelled'));
  } catch (e) {
    console.error('Error cancelando pedido:', e);
    alert(t('common.error'));
  } finally {
    pedidoParaCancelar.value = null;
  }
};

// EDITOR METHODS
const abrirEditorPedido = async (pedido) => {
  pedidoEditando.value = JSON.parse(JSON.stringify(pedido)); // Deep copy
  itemsParaAgregar.value = [];
  mostrarEditorPedido.value = true;
};

const cerrarEditorPedido = () => {
  mostrarEditorPedido.value = false;
  pedidoEditando.value = null;
  itemsParaAgregar.value = [];
};

const agregarItemAEdicion = (menuItem) => {
  if (!canAddEdit(menuItem)) return; // ✅ Robust check
  
  const existe = itemsParaAgregar.value.find(i => i.id === menuItem.id && !i.notas);
  if (existe) {
    existe.cantidad++;
  } else {
    itemsParaAgregar.value.push({
      ...menuItem,
      cantidad: 1,
      notas: ''
    });
  }
};

const quitarItemPendiente = (idx) => {
  itemsParaAgregar.value.splice(idx, 1);
};

const desagruparItemAgregado = (idx) => {
  const item = itemsParaAgregar.value[idx];
  if (item.cantidad > 1) {
    item.cantidad--;
    itemsParaAgregar.value.splice(idx + 1, 0, { ...item, cantidad: 1, notas: '' });
  }
};

const confirmarAgregarItems = async () => {
  if (itemsParaAgregar.value.length === 0) return;
  agregandoItems.value = true;
  
  try {
    // Backend expects a single request with { items: [...] }
    // and each item MUST have precio_unitario
    const itemsPayload = itemsParaAgregar.value.map(item => ({
        menu_item_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio, // Essential for backend
        notas: item.notas
    }));

    await api.agregarItemsAPedido(pedidoEditando.value.id, { items: itemsPayload });
    
    mostrarNotificacion(`items-agregados-${Date.now()}`, t('waiter.items_added'), 'success');
    cerrarEditorPedido();
    cargarDatos(); // Refresh main list
  } catch (e) {
    console.error(e);
    alert(t('common.error'));
  } finally {
    agregandoItems.value = false;
  }
};

const dividirItemEnEdicion = async (item) => {
    try {
        await api.splitItem(item.id);
        mostrarNotificacion(`item-dividido-${Date.now()}`, 'Item dividido', 'success');
        cerrarEditorPedido(); // Force refresh by closing
        cargarDatos();
    } catch (e) {
        alert(t('common.error'));
    }
};

const eliminarItemDelPedido = async (item) => {
    confirmacionEliminarMensaje.value = t('waiter.confirm_delete_item', { name: item.nombre });
    itemParaEliminar.value = item;
    mostrarConfirmacionEliminar.value = true;
};

const confirmarEliminarItem = async () => {
    mostrarConfirmacionEliminar.value = false;
    
    if (!itemParaEliminar.value) return;
    
    try {
        await api.eliminarItemDePedido(pedidoEditando.value.id, itemParaEliminar.value.id, true);
        const idx = pedidoEditando.value.items.findIndex(i => i.id === itemParaEliminar.value.id);
        if (idx !== -1) pedidoEditando.value.items.splice(idx, 1);
        mostrarNotificacion('success', 'Item eliminado');
        // Reload order to get updated total
        const response = await api.getPedido(pedidoEditando.value.id);
        pedidoEditando.value = response.data;
    } catch (e) {
        console.error('Error eliminando item:', e);
        alert(t('common.error'));
    } finally {
        itemParaEliminar.value = null;
    }
};

const guardarNotasItem = async (item) => {
    try {
        await api.actualizarNotasItem(item.id, item.notas);
    } catch (e) {
        console.error(e);
    }
};

const calcularTiempoDesde = (minutos) => {
  if (minutos < 1) return t('common.now');
  return `${minutos} ${t('common.min')}`;
};

const scrollToConfirm = () => {
  if (btnConfirmar.value) {
    btnConfirmar.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

const scrollToCategories = () => {
  // Target tabs specifically to center them
  const categoriesTabs = document.querySelector('.categorias-tabs');
  if (categoriesTabs) {
    categoriesTabs.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    // Fallback to section if tabs not found
    const categoriesSection = document.querySelector('.items-section');
    if (categoriesSection) {
      categoriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

const scrollToPending = () => {
    const pendingSection = document.getElementById('pending-section-anchor');
    if (pendingSection) {
        pendingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

onMounted(() => {
  cargarDatos();
  
  // Scroll listener for FAB visibility
  const handleScroll = () => {
    // Hide scroll-up button when near top (within 50px)
    showScrollUpButton.value = window.scrollY > 50;
  };
  
  window.addEventListener('scroll', handleScroll);
  
  // Store the handler for cleanup
  window._meseroScrollHandler = handleScroll;
  
  // Socket listeners...
  if (!socket.connected) socket.connect();

  socket.on('item_ready', () => {
    cargarDatos();
  });

  socket.on('pedido_actualizado', () => {
    cargarDatos();
  });

  socket.on('item_served', () => {
    cargarDatos();
  });

  socket.on('nuevo_pedido', () => {
    cargarDatos();
  });

  // Update time every minute for "5 min ago" to update
  const interval = setInterval(() => {
    now.value = Date.now();
  }, 60000); // 1 min check is enough for "minutes ago"

  onUnmounted(() => {
  socket.off('item_ready');
  socket.off('pedido_actualizado');
  
  // Clean up scroll listener
  if (window._meseroScrollHandler) {
    window.removeEventListener('scroll', window._meseroScrollHandler);
    delete window._meseroScrollHandler;
  }
    socket.off('item_served');
    socket.off('nuevo_pedido');
    clearInterval(interval);
  });
});
</script>

<style src="../assets/styles/MeseroPanel.css" scoped></style>

<style scoped>
/* NEW STYLES for Layout */
.item-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

/* Modifying item-qty-name to accommodate controls layout */
.item-qty-name {
    display: flex;
    flex-direction: column; 
    gap: 4px;
    flex: 1; /* Allow it to take space */
}

/* Existing styles fallback or overrides */
.precio {
  font-weight: 700;
  color: var(--text-primary);
}

/* New Quantity Control Styles */
.qty-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 2px;
    width: fit-content;
}

.btn-qty {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    cursor: pointer;
    padding: 0;
    transition: all 0.1s;
}

.btn-qty:active {
    transform: scale(0.95);
}

.btn-qty:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-tertiary);
}

.cantidad-val {
    font-weight: 700;
    min-width: 20px;
    text-align: center;
    font-size: 0.95rem;
    color: var(--text-primary);
}
</style>