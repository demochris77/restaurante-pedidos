<template>
  <div class="payment-form-container">
    <!-- Order Summary Card -->
    <div class="detail-card summary-card">
      <div class="summary-header">
        <div class="table-info">
          <span class="table-label">{{ $t('common.table') }}</span>
          <span class="table-number">{{ pedido.mesa_numero }}</span>
        </div>
      </div>
      
      <div class="summary-amounts">
        <div class="amount-row">
          <span class="amount-label">{{ $t('waiter.total') }} Consumo</span>
          <span class="amount-value">${{ Math.round(pedido.total || 0).toLocaleString() }}</span>
        </div>
        
        <div v-if="pedido.total_pagado > 0" class="amount-row paid-row">
          <span class="amount-label">{{ $t('status.pagado') }}</span>
          <span class="amount-value paid-value">-${{ Math.round(pedido.total_pagado || 0).toLocaleString() }}</span>
        </div>
        
        <div class="amount-row total-row">
          <span class="amount-label">{{ $t('cashier.amount_to_pay') }}</span>
          <span class="amount-value total-value">${{ Math.round(totalAPagar).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Tip Selection Card (Only for first payment) -->
    <div class="detail-card tip-card" v-if="esPrimerPago">
      <div class="card-title">
        <Coins class="tip-icon" />
        <span class="tip-label">{{ $t('cashier.tip') }}</span>
      </div>
      
      <div class="tip-options-grid">
        <label class="tip-option" :class="{ active: opcionPropina === 'sin_propina' }">
          <input type="radio" v-model="opcionPropina" value="sin_propina" />
          <span class="tip-option-content">
            <span class="tip-label">{{ $t('cashier.tip_options.none') }}</span>
          </span>
        </label>
        
        <label class="tip-option" :class="{ active: opcionPropina === 'sugerida' }">
          <input type="radio" v-model="opcionPropina" value="sugerida" />
          <span class="tip-option-content">
            <span class="tip-label">{{ $t('cashier.tip_options.suggested') }}</span>
            <span class="tip-amount">${{ Math.round(pedido.propina_monto || 0).toLocaleString() }}</span>
          </span>
        </label>
        
        <label class="tip-option" :class="{ active: opcionPropina === 'personalizada' }">
          <input type="radio" v-model="opcionPropina" value="personalizada" />
          <span class="tip-option-content">
            <span class="tip-label">{{ $t('cashier.tip_options.custom') }}</span>
          </span>
        </label>
      </div>
      
      <div v-if="opcionPropina === 'personalizada'" class="custom-tip-input">
        <input
          v-model.number="propinaPersonalizada"
          type="number"
          placeholder="Monto de propina"
          min="0"
          step="100"
          class="form-input"
        />
      </div>
      
      <div class="tip-total" v-if="opcionPropina !== 'sin_propina'">
        <span>Total con Propina:</span>
        <span class="tip-total-value">${{ Math.round(totalConPropina).toLocaleString() }}</span>
      </div>
    </div>
    
    <div v-else-if="!esPrimerPago && saldoPendiente > 0" class="detail-card warning-card">
      <div class="warning-content">
        <AlertCircle class="w-5 h-5" />
        <span>{{ $t('cashier.tip_already_set', { amount: Math.round(saldoPendiente).toLocaleString() }) }}</span>
      </div>
    </div>


    <!-- Payment Mode Selector -->
    <div class="detail-card mode-card">
      <div class="mode-selector">
        <button 
          @click="modoPago = 'unico'" 
          :class="['mode-btn', { active: modoPago === 'unico' }]"
        >
          <CreditCard class="w-5 h-5" />
          <span>{{ $t('cashier.single_payment') || 'Pago Único' }}</span>
        </button>
        <button 
          @click="modoPago = 'multiple'" 
          :class="['mode-btn', { active: modoPago === 'multiple' }]"
        >
          <Users class="w-5 h-5" />
          <span>{{ $t('cashier.multiple_payment') || 'Dividir Cuenta' }}</span>
        </button>
      </div>
    </div>

    <!-- MODO PAGO ÚNICO -->
    <div v-if="modoPago === 'unico'" class="fade-in">
        <div class="detail-card payment-method-card">
          <div class="card-title">
            <CreditCard class="w-4 h-4" />
            <span>{{ $t('cashier.payment_method') }}</span>
          </div>
          <div class="payment-methods-grid">
            <button
              v-for="metodo in metodosPago"
              :key="metodo.name"
              @click="metodoSeleccionado = metodo.name"
              :class="['payment-method-btn', { 'active': metodoSeleccionado === metodo.name }]"
            >
              <component :is="getIcon(metodo.name)" class="w-6 h-6" />
              <span>{{ metodo.label }}</span>
            </button>
          </div>
        </div>

        <div v-if="metodoSeleccionado" class="detail-card amount-card fade-in">
          <div class="card-title">
            <Calculator class="w-4 h-4" />
            <span>{{ metodoSeleccionado === 'efectivo' ? $t('cashier.amount_received') : $t('cashier.amount_to_pay') }}</span>
          </div>
          
          <div class="amount-input-group">
            <div class="input-with-prefix">
                <span class="currency-prefix">$</span>
                <input
                  v-model.number="montoRecibido"
                  type="number"
                  :placeholder="Math.round(totalAPagar).toString()"
                  min="0"
                  class="amount-input"
                  ref="inputMonto"
                />
            </div>
            
            <button 
              @click="setTotal"
              class="exact-btn"
              type="button"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Exacto</span>
            </button>
          </div>
          
          <!-- Cambio -->
          <div v-if="metodoSeleccionado === 'efectivo' && montoRecibido > totalAPagar" class="change-display">
            <span>{{ $t('cashier.change') }}:</span>
            <span class="change-amount">${{ Math.round(montoRecibido - totalAPagar).toLocaleString() }}</span>
          </div>
          
          <!-- Advertencia Pago Parcial -->
          <div v-if="montoRecibido > 0 && montoRecibido < totalAPagar" class="partial-warning">
            <AlertCircle class="w-4 h-4" />
            <span>Pago parcial. Quedará un saldo de ${{ Math.round(totalAPagar - montoRecibido).toLocaleString() }}</span>
          </div>
        </div>
    </div>

    <!-- MODO PAGO MÚLTIPLE -->
    <div v-else class="fade-in">
        <div class="detail-card multiple-payment-card">
            <div class="card-title">
                <Users class="w-4 h-4" />
                <span>Distribuir Monto</span>
            </div>
            
            <div class="multiple-payment-inputs">
                <div v-for="metodo in metodosPago" :key="metodo.name" class="payment-input-row">
                    <div class="payment-input-label">
                        <component :is="getIcon(metodo.name)" class="w-5 h-5 text-primary" />
                        <span>{{ metodo.label }}</span>
                    </div>
                    <div class="payment-input-field">
                        <span class="currency-prefix">$</span>
                        <input 
                            type="number" 
                            v-model.number="pagosMultiples[metodo.name]"
                            class="amount-input"
                            placeholder="0"
                            min="0"
                        />
                    </div>
                </div>
            </div>
        </div>
        
        <div class="detail-card summary-totals-card">
            <div class="total-row">
                <span class="total-label">Total Ingresado</span>
                <span class="total-value ingresado">${{ Math.round(totalIngresadoMultiple).toLocaleString() }}</span>
            </div>
            <div class="total-row highlight">
                <span class="total-label">Restante</span>
                <span :class="['total-value', {'restante-pending': restanteMultiple > 0, 'restante-complete': restanteMultiple <= 0}]">
                    ${{ Math.round(restanteMultiple).toLocaleString() }}
                </span>
            </div>
        </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button
       v-if="modoPago === 'unico'"
       @click="procesarPago"
       class="confirm-btn"
       :disabled="puedePagarUnico"
      >
        <span v-if="procesandoPago" class="flex items-center gap-2">
            <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            {{ $t('common.saving') }}...
        </span>
        <span v-else>
            {{ $t('cashier.confirm_payment') }} - ${{ Math.round(montoRecibido > 0 ? (metodoSeleccionado === 'efectivo' ? Math.min(montoRecibido, totalAPagar) : montoRecibido) : totalAPagar).toLocaleString() }}
        </span>
      </button>

      <button
       v-else
       @click="procesarPagoMultiple"
       class="confirm-btn"
       :disabled="puedePagarMultiple"
      >
        {{ procesandoPago ? $t('common.saving') : `Confirmar ($${Math.round(totalIngresadoMultiple).toLocaleString()})` }}
      </button>
      
      <button
        @click="$emit('cancelar')"
        class="cancel-btn"
      >
        {{ $t('cashier.cancel') }}
      </button>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="mostrarConfirmacion" class="modal-overlay" @click.self="mostrarConfirmacion = false">
      <div class="modal-content small-modal">
        <div class="modal-header-clean">
          <h3>{{ $t('cashier.confirm_payment') }}</h3>
          <button @click="mostrarConfirmacion = false" class="btn-close-clean">×</button>
        </div>
        
        <div class="modal-body-clean">
          <p class="confirm-message">{{ mensajeConfirmacion }}</p>
          
          <div class="modal-actions-row">
            <button @click="mostrarConfirmacion = false" class="btn-secondary-action large">
              {{ $t('common.no') }}
            </button>
            <button @click="confirmarPago" class="btn-primary-action large success">
              {{ $t('common.yes') }} <CheckCircle2 :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pago-section {
    padding: 0.5rem;
}

.pago-info {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
}

.main-total {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border-color);
    font-size: 1.1rem;
}

.payment-methods {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.metodo-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--card-bg);
    cursor: pointer;
    transition: all 0.2s;
    height: 80px;
}

.metodo-btn:hover {
    border-color: var(--theme-color, var(--c-primary));
    background: var(--bg-secondary);
}

.metodo-btn.metodo-active {
    background: rgba(var(--theme-color-rgb, 16, 185, 129), 0.1);
    border-color: var(--theme-color, var(--c-primary));
    color: var(--theme-color, var(--c-primary));
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb, 16, 185, 129), 0.1);
}

.monto-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 1.1rem;
    outline: none;
    background: var(--card-bg);
    color: var(--text-primary);
}

.monto-input:focus {
    border-color: var(--theme-color, var(--c-primary));
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb, 16, 185, 129), 0.1);
}

.btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-weight: 600;
    transition: all 0.2s;
}

.btn-primary {
    background: var(--theme-color, var(--c-primary));
    color: white;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.multi-inputs .flex {
    align-items: center;
}

/* Animations */
.fade-in {
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

<style src="../assets/styles/PaymentForm.css" scoped></style>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import api from '../api';
import { useI18n } from 'vue-i18n';
import { 
    Banknote, CreditCard, Smartphone, Globe, Coins, Calculator, AlertCircle, Users, CheckCircle2 
} from 'lucide-vue-next';

// Props
const props = defineProps({
  pedido: { type: Object, required: true },
  metodosPago: { type: Array, required: true },
  usuarioId: { type: String, required: true },
  saldoPendiente: { type: Number, default: 0 }
});

const emit = defineEmits(['pago-registrado', 'cancelar']);
const { t } = useI18n();

// Estado
const modoPago = ref('unico');
const metodoSeleccionado = ref('');
const montoRecibido = ref(null);
const pagosMultiples = ref({});
const opcionPropina = ref('sugerida');
const propinaPersonalizada = ref(null);
const procesandoPago = ref(false);
const inputMonto = ref(null);

// Confirmation modal state
const mostrarConfirmacion = ref(false);
const mensajeConfirmacion = ref('');
const accionPendiente = ref(null);

// Icons helper
const getIcon = (name) => {
    const n = name.toLowerCase();
    if(n.includes('efectivo') || n.includes('cash')) return Banknote;
    if(n.includes('tarjeta') || n.includes('card')) return CreditCard;
    if(n.includes('nequi') || n.includes('daviplata')) return Smartphone;
    return Globe;
};

// --- Watchers & Init ---

// Initialize multiple payments object
watch(() => props.metodosPago, (newVal) => {
    newVal.forEach(m => {
        if(!(m.name in pagosMultiples.value)) pagosMultiples.value[m.name] = null;
    });
}, { immediate: true });

// Reset logic
watch(() => props.pedido, () => {
    modoPago.value = 'unico';
    metodoSeleccionado.value = '';
    montoRecibido.value = null;
    pagosMultiples.value = {};
    opcionPropina.value = 'sugerida';
    propinaPersonalizada.value = null;
    props.metodosPago.forEach(m => { pagosMultiples.value[m.name] = null; });
});

// Auto-focus input when method selected
watch(metodoSeleccionado, async (val) => {
    if(val) {
        await nextTick();
        if(inputMonto.value) inputMonto.value.focus();
        // Auto fill total if not cash (optional, but good UX)
        if(val !== 'efectivo' && !montoRecibido.value) {
            montoRecibido.value = totalAPagar.value;
        }
    }
});


// --- Computed ---

const esPrimerPago = computed(() => !props.pedido.total_pagado || props.pedido.total_pagado === 0);

const totalConPropina = computed(() => {
  const subtotal = parseFloat(props.pedido.subtotal || props.pedido.total || 0);
  const propinaSugerida = parseFloat(props.pedido.propina_monto || 0);
  
  if (opcionPropina.value === 'sin_propina') return subtotal;
  if (opcionPropina.value === 'personalizada') return subtotal + (parseFloat(propinaPersonalizada.value) || 0);
  return subtotal + propinaSugerida; // Default sugerida
});

const totalAPagar = computed(() => {
  if (esPrimerPago.value) return totalConPropina.value;
  return props.saldoPendiente != null ? props.saldoPendiente : props.pedido.total;
});

const totalIngresadoMultiple = computed(() => {
    return Object.values(pagosMultiples.value).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

const restanteMultiple = computed(() => {
  return totalAPagar.value - totalIngresadoMultiple.value;
});

// Validation computed properties for UI state
const puedePagarUnico = computed(() => {
    if(!metodoSeleccionado.value) return true;
    if(procesandoPago.value) return true;
    if(metodoSeleccionado.value === 'efectivo' && (!montoRecibido.value || montoRecibido.value <= 0)) return true;
    return false;
});

const puedePagarMultiple = computed(() => {
    return totalIngresadoMultiple.value <= 0 || procesandoPago.value || restanteMultiple.value > 100; // tolerance
});

// --- Methods ---

const setTotal = () => {
    montoRecibido.value = Math.round(totalAPagar.value);
};

const getPropinaFinal = () => {
    if (!esPrimerPago.value) return null; // Solo primer pago registra propina globalmente
    if (opcionPropina.value === 'sin_propina') return 0;
    if (opcionPropina.value === 'personalizada') return parseFloat(propinaPersonalizada.value) || 0;
    return parseFloat(props.pedido.propina_monto) || 0;
};

const procesarPago = async () => {
  if (!metodoSeleccionado.value) return;

  // Show confirmation modal
  mensajeConfirmacion.value = t('cashier.confirm_payment_prompt');
  accionPendiente.value = 'pago_unico';
  mostrarConfirmacion.value = true;
};

const confirmarPago = async () => {
  mostrarConfirmacion.value = false;
  
  if (accionPendiente.value === 'pago_unico') {
    await ejecutarPagoUnico();
  } else if (accionPendiente.value === 'pago_multiple') {
    await ejecutarPagoMultiple();
  }
  
  accionPendiente.value = null;
};

const ejecutarPagoUnico = async () => {

  procesandoPago.value = true;
  
  const pendienteActual = totalAPagar.value;
  
  // Validaciones
  if (!montoRecibido.value || montoRecibido.value <= 0) {
    alert('Ingresa un monto válido');
    procesandoPago.value = false;
    return;
  }
  
  const montoRecibidoEstaVez = Number(montoRecibido.value);
  let montoQueSeRegistra = 0;

  if (metodoSeleccionado.value === 'efectivo') {
    // Si da más, registramos el pendiente (el resto es cambio)
    montoQueSeRegistra = Math.min(montoRecibidoEstaVez, pendienteActual);
  } else {
    // Tarjetas no dan cambio (usualmente), bloqueamos sobrepago
    if (montoRecibidoEstaVez > pendienteActual + 100) { // +100 tolerance
      alert(`❌ El monto excede el pendiente: $${Math.round(pendienteActual).toLocaleString()}`);
      procesandoPago.value = false;
      return;
    }
    montoQueSeRegistra = Math.min(montoRecibidoEstaVez, pendienteActual);
  }

  try {
    const propinaFinal = getPropinaFinal();
    
    const res = await api.registrarPago(
      props.pedido.id,
      props.usuarioId,
      montoQueSeRegistra,
      metodoSeleccionado.value,
      propinaFinal
    );

    const cambio = metodoSeleccionado.value === 'efectivo'
      ? Math.max(montoRecibidoEstaVez - montoQueSeRegistra, 0)
      : 0;
    
    emit('pago-registrado', { 
        data: res.data, // Pedido actualizado
        metodo: metodoSeleccionado.value,
        montoRecibido: montoRecibidoEstaVez,
        montoAplicado: montoQueSeRegistra,
        cambio,
        esMultiple: false
    });

  } catch (err) {
    console.error(err);
    alert('❌ ' + (err.response?.data?.error || t('cashier.alert_error_payment')));
  } finally {
    procesandoPago.value = false;
  }
};

const procesarPagoMultiple = async () => {
    const pendienteActual = totalAPagar.value;
    
    // Show confirmation modal
    mensajeConfirmacion.value = `¿Confirmar pago múltiple por un total de $${Math.round(totalIngresadoMultiple.value).toLocaleString()}?`;
    accionPendiente.value = 'pago_multiple';
    mostrarConfirmacion.value = true;
};

const ejecutarPagoMultiple = async () => {
    const pendienteActual = totalAPagar.value;
    
    if (Math.abs(restanteMultiple.value) > 100 && restanteMultiple.value > 0) {
        if(!confirm(`⚠️ El monto total ($${totalIngresadoMultiple.value}) es MENOR al pendiente. ¿Registrar como pago parcial?`)) {
            return;
        }
    }
    
    procesandoPago.value = true;
    
    // Preparar payload
    const montos = Object.entries(pagosMultiples.value)
        .map(([metodo, monto]) => ({ 
            pedido_id: props.pedido.id,
            usuario_facturero_id: props.usuarioId,
            metodo_pago: metodo, 
            monto: Number(monto),
            propina_final: getPropinaFinal() // Se enviará en cada uno, el backend debería manejarlo (o solo en el primero)
            // Mejor estrategia: backend maneja "pagos multiples" batch
        }))
        .filter(p => p.monto > 0);

    if (montos.length === 0) {
        alert('Ingrese al menos un monto');
        procesandoPago.value = false;
        return;
    }

    try {
        // Opción A: Enviar uno por uno (riesgoso si falla mitad)
        // Opción B: Nuevo endpoint batch (recomendado) => asumo api.registrarPago soporta array o creamos registrarPagosBatch
        // Dado el código anterior, parecia soportar array? Revisemos api.js.
        // Si no, enviamos loop.
        
        // Revisando api.js anterior, registrarPago toma args individuales.
        // Haremos loop secuencial por seguridad simple por ahora.
        
        let lastRes = null;
        for(const p of montos) {
            lastRes = await api.registrarPago(
                p.pedido_id, p.usuario_facturero_id, p.monto, p.metodo_pago, p.propina_final
            );
            // Solo mandamos propina en el primero si fuera necesario, pero api lo maneja
        }

        emit('pago-registrado', {
            data: lastRes.data,
            montoRecibido: totalIngresadoMultiple.value,
            montoAplicado: totalIngresadoMultiple.value,
            cambio: 0,
            esMultiple: true
        });

    } catch (err) {
        console.error(err);
        alert('❌ Error procesando pagos: ' + (err.response?.data?.error || err.message));
    } finally {
        procesandoPago.value = false;
    }
};

</script>

<style src="../assets/styles/CajaPanel.css" scoped></style>
