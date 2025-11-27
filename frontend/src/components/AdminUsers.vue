<template>
  <div class="admin-users">
    <div class="header">
      <h2>👥 Gestión de Usuarios</h2>
      <button @click="$emit('volver')" class="btn-volver">← Volver al Panel</button>
    </div>

    <!-- Formulario de Creación -->
    <div class="section create-user-section">
      <h3>Nuevo Usuario</h3>
      <form @submit.prevent="crearUsuario" class="create-form">
        
        <!-- Input 1 -->
        <div class="form-group">
          <label>Nombre Completo</label>
          <input v-model="newUser.nombre" type="text" required placeholder="Ej: Juan Pérez" />
        </div>

        <!-- Input 2 -->
        <div class="form-group">
          <label>Usuario</label>
          <input v-model="newUser.username" type="text" required placeholder="Ej: juanp" />
        </div>

        <!-- Input 3 -->
        <div class="form-group">
          <label>Contraseña</label>
          <input v-model="newUser.password" type="password" required placeholder="••••••" />
        </div>

        <!-- Input 4 -->
        <div class="form-group">
          <label>Rol</label>
          <select v-model="newUser.rol" required>
            <option value="mesero">Mesero</option>
            <option value="cocinero">Cocinero</option>
            <option value="facturero">Facturero/Caja</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        
        <!-- Botón (ocupará todo el ancho) -->
        <button type="submit" class="btn-crear" :disabled="loading">
          {{ loading ? 'Creando...' : '➕ Crear Usuario' }}
        </button>
      </form>
    </div>


    <!-- Lista de Usuarios -->
    <div class="section users-list-section">
      <h3>Usuarios Registrados</h3>
      <div v-if="loadingList" class="loading">Cargando usuarios...</div>
      <div v-else-if="usuarios.length === 0" class="empty">No hay usuarios registrados</div>
      
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in usuarios" :key="user.id">
              <td>{{ user.nombre }}</td>
              <td>{{ user.username }}</td>
              <td>
                <span :class="['rol-badge', user.rol]">{{ user.rol.toUpperCase() }}</span>
              </td>
              <td>
                <button 
                  v-if="user.username !== 'admin'" 
                  @click="eliminarUsuario(user.id)" 
                  class="btn-delete"
                  title="Eliminar usuario"
                >
                  🗑️
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
