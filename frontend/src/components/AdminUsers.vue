<template>
  <div class="admin-users">
    <div class="header-premium">
      <div class="header-title">
        <Users :size="28" class="text-indigo" />
        <div>
           <h2>{{ $t('admin.users_management') }}</h2>
           <p class="subtitle">{{ $t('admin.users_subtitle', 'Gestiona el acceso y roles del personal') }}</p>
        </div>
      </div>
      <button @click="$emit('volver')" class="btn-secondary-outline">
        <ArrowLeft :size="18" /> {{ $t('admin.back_to_panel') }}
      </button>
    </div>

    <!-- Formulario de Creación -->
    <div class="card premium-card create-user-card fade-in-up">
      <div class="card-header">
         <div class="icon-bg"><UserPlus :size="20" /></div>
         <h3>{{ $t('admin.new_user') }}</h3>
      </div>
      <form @submit.prevent="crearUsuario" class="create-form">
        <div class="form-grid">
           <!-- Nombre -->
           <div class="form-group">
             <label>{{ $t('admin.full_name') }}</label>
             <div class="input-with-icon">
                <User :size="18" class="field-icon" />
                <input v-model="newUser.nombre" type="text" required placeholder="Ej: Juan Pérez" />
             </div>
           </div>

           <!-- Usuario -->
           <div class="form-group">
             <label>{{ $t('login.username') }}</label>
             <div class="input-with-icon">
                <AtSign :size="18" class="field-icon" />
                <input v-model="newUser.username" type="text" required placeholder="Ej: juanp" />
             </div>
           </div>

           <!-- Password -->
           <div class="form-group">
             <label>{{ $t('login.password') }}</label>
             <div class="input-with-icon">
                <Lock :size="18" class="field-icon" />
                <input v-model="newUser.password" type="password" required placeholder="••••••" />
             </div>
           </div>

           <!-- Rol -->
           <div class="form-group">
             <label>{{ $t('admin.users_role') }}</label>
             <div class="input-with-icon">
                <Shield :size="18" class="field-icon" />
                <select v-model="newUser.rol" required>
                  <option value="mesero">{{ $t('roles.mesero') }}</option>
                  <option value="cocinero">{{ $t('roles.cocinero') }}</option>
                  <option value="facturero">{{ $t('roles.facturero') }}</option>
                  <option value="admin">{{ $t('roles.admin') }}</option>
                </select>
             </div>
           </div>
        </div>
        
        <div class="form-actions">
           <button type="submit" class="btn-primary" :disabled="loading">
             <Plus :size="18" />
             {{ loading ? $t('common.loading') : $t('common.create') }}
           </button>
        </div>
      </form>
    </div>


    <!-- Lista de Usuarios -->
    <div class="card premium-card list-card fade-in-up delay-100">
      <div class="card-header">
         <h3>{{ $t('admin.users_registered') }} <span class="badge-count">{{ usuarios.length }}</span></h3>
      </div>

      <div v-if="loadingList" class="loading-state">
         <div class="spinner"></div>
         <p>{{ $t('common.loading') }}</p>
      </div>

      <div v-else-if="usuarios.length === 0" class="empty-state">
         <Users :size="48" class="text-gray-300" />
         <p>{{ $t('admin.no_users') }}</p>
      </div>
      
      <div v-else class="table-responsive">
        <table class="premium-table">
          <thead>
            <tr>
              <th>{{ $t('editor.form.name') }}</th>
              <th>{{ $t('login.username') }}</th>
              <th>{{ $t('admin.users_role') || 'Rol' }}</th>
              <th class="text-right">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in usuarios" :key="user.id">
              <td class="font-medium">
                 <div class="user-cell">
                   <div class="avatar-circle">{{ user.nombre.charAt(0).toUpperCase() }}</div>
                   {{ user.nombre }}
                 </div>
              </td>
              <td><span class="username-tag">@{{ user.username }}</span></td>
              <td>
                <span :class="['rol-badge', user.rol]">
                   <Shield :size="12" v-if="user.rol === 'admin'" />
                   {{ $t('roles.' + user.rol) }}
                </span>
              </td>
              <td class="text-right">
                <button 
                  v-if="user.username !== 'admin'" 
                  @click="eliminarUsuario(user.id)" 
                  class="btn-icon delete"
                  :title="$t('common.delete')"
                >
                  <Trash2 :size="18" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Users, UserPlus, User, Lock, Shield, AtSign, ArrowLeft, Trash2, Plus } from 'lucide-vue-next';
import api from '../api';

const emit = defineEmits(['volver']);

const usuarios = ref([]);
const loading = ref(false);
const loadingList = ref(false);

const newUser = ref({
  nombre: '',
  username: '',
  password: '',
  rol: 'mesero'
});

const cargarUsuarios = async () => {
  loadingList.value = true;
  try {
    const res = await api.getUsuarios();
    usuarios.value = res.data;
  } catch (err) {
    console.error('Error cargando usuarios:', err);
    alert('Error al cargar usuarios');
  } finally {
    loadingList.value = false;
  }
};

const crearUsuario = async () => {
  loading.value = true;
  try {
    await api.crearUsuario(newUser.value);
    alert('✅ Usuario creado con éxito');
    newUser.value = { nombre: '', username: '', password: '', rol: 'mesero' };
    cargarUsuarios();
  } catch (err) {
    console.error(err);
    alert('❌ Error al crear usuario: ' + (err.response?.data?.error || err.message));
  } finally {
    loading.value = false;
  }
};

const eliminarUsuario = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
  
  try {
    await api.eliminarUsuario(id);
    cargarUsuarios();
  } catch (err) {
    console.error(err);
    alert('❌ Error al eliminar usuario');
  }
};

onMounted(() => {
  cargarUsuarios();
});
</script>

<style src="../assets/styles/AdminUsers.css" scoped></style>
