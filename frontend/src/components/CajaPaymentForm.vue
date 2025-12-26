<template>
  <div class="section pago-section">
    <h3>{{ $t('cashier.register_payment') }}</h3>
    
    <div class="pago-info">
      <div class="info-row">
        <span>{{ $t('common.table') }}:</span>
        <strong>{{ pedido.mesa_numero }}</strong>
      </div>
      <div class="info-row">
        <span>{{ $t('waiter.total') }}</span>
        <strong>${{ Math.round(pedido.total || 0).toLocaleString() }}</strong>
      </div>
      <div v-if="pedido.total_pagado > 0" class="info-row">
        <span>{{ $t('status.pagado') }}:</span>
        <strong class="text-success">${{ Math.round(pedido.total_pagado || 0).toLocaleString() }}</strong>
      </div>
      <div class="info-row">
        <span>{{ $t('cashier.amount_to_pay') }}:</span>
        <strong class="monto-total">${{ Math.round(totalAPagar).toLocaleString() }}</strong>
      </div>
    </div>

    <!-- Selección de Propina -->
    <div class="form-group propina-section" v-if="esPrimerPago">
      <label>{{ $t('cashier.tip') }}</label>
      <div class="propina-options">
        <label class="propina-option">
          <input type="radio" v-model="opcionPropina" value="sin_propina" />
          <span>{{ $t('cashier.tip_options.none') }} (${{ Math.round(pedido.subtotal || pedido.total || 0).toLocaleString() }})</span>
        </label>
        <label class="propina-option">
          <input type="radio" v-model="opcionPropina" value="sugerida" />
          <span>{{ $t('cashier.tip_options.suggested') }} (${{ Math.round(pedido.propina_monto || 0).toLocaleString() }})</span>
        </label>
        <label class="propina-option">
          <input type="radio" v-model="opcionPropina" value="personalizada" />
          <span>{{ $t('cashier.tip_options.custom') }}</span>
        </label>
      </div>
      <div v-if="opcionPropina === 'personalizada'" class="propina-input">
        <input
          v-model.number="propinaPersonalizada"
          type="number"
          placeholder="Ingrese monto de propina"
          min="0"
          step="100"
          class="monto-input"
        />
      </div>
      <div class="total-con-propina">
        <strong>{{ $t('waiter.total') }}: ${{ Math.round(totalConPropina).toLocaleString() }}</strong>
      </div>
    </div>
    
    <div v-else class="form-group">
      <div class="info-box">
        {{ $t('cashier.tip_already_set', { amount: Math.round(saldoPendiente || 0).toLocaleString() }) }}
      </div>
    </div>

    <!-- Selector de Modo de Pago -->
    <div class="form-group mode-selector">
      <div class="btn-group" style="margin-bottom: 15px;">
          <button 
              @click="modoPago = 'unico'" 
              :class="['btn', modoPago === 'unico' ? 'btn-primary' : 'btn-outline-secondary']"
          >
              {{ $t('cashier.single_payment') || 'Pago Único' }}
          </button>
          <button 
              @click="modoPago = 'multiple'" 
              :class="['btn', modoPago === 'multiple' ? 'btn-primary' : 'btn-outline-secondary']"
          >
              {{ $t('cashier.multiple_payment') || 'Pago Múltiple' }}
          </button>
      </div>
    </div>

    <!-- MODO PAGO ÚNICO -->
    <div v-if="modoPago === 'unico'">
        <div class="form-group">
          <label>{{ $t('cashier.payment_method') }}</label>
          <div class="payment-methods">
            <button
              v-for="metodo in metodosPago"
              :key="metodo.name"
              @click="metodoSeleccionado = metodo.name"
              :class="['metodo-btn', { 'metodo-active': metodoSeleccionado === metodo.name }]"
            >
              {{ obtenerEmojiMetodo(metodo.name) }} {{ metodo.label }}
            </button>
          </div>
        </div>

        <div v-if="metodoSeleccionado" class="form-group">
          <label>
            {{ metodoSeleccionado === 'efectivo' ? $t('cashier.amount_received') : $t('cashier.amount_to_pay') }}
          </label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input
              v-model.number="montoRecibido"
              type="number"
              :placeholder="metodoSeleccionado === 'efectivo' ? '0.00' : `Max: ${Math.round(totalAPagar).toLocaleString()}`"
              min="0"
              :max="totalAPagar"
              step="100"
              class="monto-input"
              style="flex: 1;"
            />
            <button 
              @click="montoRecibido = Math.round(totalAPagar)"
              class="btn btn-secondary btn-sm"
              type="button"
              style="white-space: nowrap;"
            >
              💰 Total
            </button>
          </div>
          <div v-if="metodoSeleccionado === 'efectivo' && montoRecibido && montoRecibido > totalAPagar" class="cambio">
            {{ $t('cashier.change') }} ${{ Math.round(montoRecibido - totalAPagar).toLocaleString() }}
          </div>
          <div v-if="modoPago === 'unico' && montoRecibido && montoRecibido < totalAPagar" class="alerta-parcial">
            🔵 {{ $t('cashier.partial_payment_warning') || 'Pago parcial, quedará saldo pendiente.' }}
          </div>
        </div>
    </div>

    <!-- MODO PAGO MÚLTIPLE -->
    <div v-else class="multiple-payment-form">
        <div class="form-group">
            <label>Distribuir monto entre métodos de pago:</label>
            <div class="multi-inputs">
                <div v-for="metodo in metodosPago" :key="metodo.name" class="multi-input-row" style="margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                    <span class="method-label" style="width: 150px;">
                        {{ obtenerEmojiMetodo(metodo.name) }} {{ metodo.label }}
                    </span>
                    <input 
                        type="number" 
                        v-model.number="pagosMultiples[metodo.name]"
                        class="monto-input"
                        placeholder="0"
                        min="0"
                        step="100"
                        style="flex: 1;"
                    />
                </div>
            </div>
        </div>
        
        <div class="multi-summary" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Total Ingresado:</span>
                <strong>${{ Math.round(totalIngresadoMultiple).toLocaleString() }}</strong>
            </div>
            <div class="summary-row" style="display: flex; justify-content: space-between;">
                <span>Restante:</span>
                <strong :class="{'text-danger': restanteMultiple < 0, 'text-success': restanteMultiple === 0}">
                    ${{ Math.round(restanteMultiple).toLocaleString() }}
                </strong>
            </div>
        </div>
    </div>

    <div class="botones-pago">
     <button
      v-if="modoPago === 'unico'"
      @click="procesarPago"
      class="btn btn-success btn-full"
      :disabled="!metodoSeleccionado || (metodoSeleccionado === 'efectivo' && (!montoRecibido || montoRecibido <= 0)) || procesandoPago"
    >
        {{ procesandoPago ? $t('common.saving') : $t('cashier.confirm_payment') }}
      </button>
      <button
      v-else
      @click="procesarPagoMultiple"
      class="btn btn-success btn-full"
      :disabled="totalIngresadoMultiple <= 0 || procesandoPago"
    >
        {{ procesandoPago ? $t('common.saving') : `Confirmar Pagos (${Math.round(totalIngresadoMultiple).toLocaleString()})` }}
      </button>
      
      <button
        @click="$emit('cancelar')"
        class="btn btn-secondary btn-full"
      >
        {{ $t('cashier.cancel') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api from '../api';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  pedido: { type: Object, required: true },
  metodosPago: { type: Array, required: true },
  usuarioId: { type: String, required: true },
  saldoPendiente: { type: Number, default: 0 }
});

const emit = defineEmits(['pago-registrado', 'cancelar']);
const { t } = useI18n();

const modoPago = ref('unico');
const metodoSeleccionado = ref('');
const montoRecibido = ref(null);
const pagosMultiples = ref({});
const opcionPropina = ref('sugerida');
const propinaPersonalizada = ref(null);
const procesandoPago = ref(false); // ✅ NUEVO: Loading state

// Inicializar pagos múltiples
watch(() => props.metodosPago, (newVal) => {
    newVal.forEach(m => {
        if(!(m.name in pagosMultiples.value)) pagosMultiples.value[m.name] = null;
    });
}, { immediate: true });

// Reiniciar estado cuando cambia el pedido
watch(() => props.pedido, () => {
    modoPago.value = 'unico';
    metodoSeleccionado.value = '';
    montoRecibido.value = null;
    pagosMultiples.value = {};
    opcionPropina.value = 'sugerida';
    propinaPersonalizada.value = null;
    props.metodosPago.forEach(m => { pagosMultiples.value[m.name] = null; });
});

const esPrimerPago = computed(() => !props.pedido.total_pagado || props.pedido.total_pagado === 0);

const totalConPropina = computed(() => {
  const subtotal = parseFloat(props.pedido.subtotal || props.pedido.total || 0);
  const propinaSugerida = parseFloat(props.pedido.propina_monto || 0);
  
  if (opcionPropina.value === 'sin_propina') {
    return subtotal;
  } else if (opcionPropina.value === 'personalizada') {
    return subtotal + (parseFloat(propinaPersonalizada.value) || 0);
  } else { // 'sugerida'
    return subtotal + propinaSugerida;
  }
});

// ✅ NUEVO: Total a pagar considerando propina seleccionada
const totalAPagar = computed(() => {
  // Si es primer pago, usar totalConPropina (que considera la propina seleccionada)
  if (esPrimerPago.value) {
    return totalConPropina.value;
  }
  // Si ya hay pagos previos, usar el saldo pendiente
  return props.saldoPendiente != null ? props.saldoPendiente : props.pedido.total;
});


const totalIngresadoMultiple = computed(() => {
    return Object.values(pagosMultiples.value).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

const restanteMultiple = computed(() => {
  return totalAPagar.value - totalIngresadoMultiple.value;
});

const obtenerEmojiMetodo = (metodo) => {
  const emojis = {
    efectivo: '💵',
    tarjeta: '💳',
    nequi: '📱',
    otro_digital: '🌐'
  };
  return emojis[metodo] || '💰';
};

const getPropinaFinal = () => {
    if (!esPrimerPago.value) return null;
    
    if (opcionPropina.value === 'sin_propina') return 0;
    if (opcionPropina.value === 'personalizada') return parseFloat(propinaPersonalizada.value) || 0;
    return parseFloat(props.pedido.propina_monto) || 0;
};

const procesarPago = async () => {
  if (!metodoSeleccionado.value) return;

  // ✅ NUEVO: Confirmation dialog
  const confirmado = confirm(t('cashier.confirm_payment_prompt'));
  if (!confirmado) return;

  procesandoPago.value = true;
  
  // ✅ USAR totalAPagar en lugar de pendienteActual
  const pendienteActual = totalAPagar.value;
  
  if (!montoRecibido.value || montoRecibido.value <= 0) {
    alert('Ingresa un monto válido');
    procesandoPago.value = false;
    return;
  }
  
  const montoRecibidoEstaVez = Number(montoRecibido.value);
  let montoQueSeRegistra = 0;

  if (metodoSeleccionado.value === 'efectivo') {
    montoQueSeRegistra = Math.min(montoRecibidoEstaVez, pendienteActual);
  } else {
    if (montoRecibidoEstaVez > pendienteActual) {
      alert(`❌ El monto no puede exceder el pendiente: $${Math.round(pendienteActual).toLocaleString()}`);
      return;
    }
    montoQueSeRegistra = montoRecibidoEstaVez;
  }

  try {
    const propinaFinal = getPropinaFinal();
    
    // ✅ NUEVO: Emitir evento ANTES de procesar el pago para guardar la info
    emit('pago-por-procesar', {
      metodo: metodoSeleccionado.value,
      montoRecibido: montoRecibidoEstaVez,
      montoAplicado: montoQueSeRegistra,
      cambio: metodoSeleccionado.value === 'efectivo' ? Math.max(montoRecibidoEstaVez - montoQueSeRegistra, 0) : 0,
      esMultiple: false,
      pedidoId: props.pedido.id
    });
    
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
    
    // 🔍 DEBUG: Ver qué contiene la respuesta del backend
    console.log('💰 Enviando pago único:', { 
      pedido_id: props.pedido.id, 
      monto: montoQueSeRegistra, 
      metodo_pago: metodoSeleccionado.value 
    });
    console.log('📦 Respuesta del backend (res.data):', res.data);
    
    emit('pago-registrado', { 
        data: res.data, 
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
    const pendienteActual = props.saldoPendiente != null ? Number(props.saldoPendiente) : Number(props.pedido.total);
    
    // ✅ NUEVO: Confirmation dialog
    const confirmado = confirm(t('cashier.confirm_payment_prompt'));
    if (!confirmado) return;
    
    procesandoPago.value = true;
    
    // Validar montos
    const montos = Object.entries(pagosMultiples.value)
        .map(([metodo, monto]) => ({ 
            metodo_pago: metodo, 
            monto: Number(monto) 
        }))
        .filter(p => p.monto > 0);

    if (montos.length === 0) {
        alert('Ingrese al menos un monto válido');
        return;
    }

    if (totalIngresadoMultiple.value > pendienteActual + 100) { 
        alert(`❌ El total ingresado ($${totalIngresadoMultiple.value}) excede el pendiente ($${pendienteActual})`);
        return;
    }

    try {
        const propinaFinal = getPropinaFinal();

        const payload = montos.map(m => ({
            pedido_id: props.pedido.id,
            usuario_facturero_id: props.usuarioId,
            monto: m.monto,
            metodo_pago: m.metodo_pago,
            propina_final: propinaFinal 
        }));

        const res = await api.registrarPago(payload);

        emit('pago-registrado', {
            data: res.data,
            montoRecibido: totalIngresadoMultiple.value,
            montoAplicado: totalIngresadoMultiple.value,
            cambio: 0,
            esMultiple: true
        });

    } catch (err) {
        console.error(err);
        alert('❌ Error procesando pago múltiple: ' + (err.response?.data?.error || err.message));
    } finally {
        procesandoPago.value = false;
    }
};

</script>

<!-- Importar el mismo CSS que usa CajaPanel -->
<style src="../assets/styles/CajaPanel.css" scoped></style>
