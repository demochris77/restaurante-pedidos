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
        <div class="form-row">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input v-model="newUser.nombre" type="text" required placeholder="Ej: Juan Pérez" />
          </div>
          <div class="form-group">
            <label>Usuario</label>
            <input v-model="newUser.username" type="text" required placeholder="Ej: juanp" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Contraseña</label>
            <input v-model="newUser.password" type="password" required placeholder="••••••" />
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select v-model="newUser.rol" required>
              <option value="mesero">Mesero</option>
              <option value="cocinero">Cocinero</option>
              <option value="facturero">Facturero/Caja</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
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

<style scoped>
.admin-users {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-volver {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  margin-bottom: 24px;
}

.section h3 {
  margin-top: 0;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
  margin-bottom: 20px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-group input, .form-group select {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.btn-crear {
  background: #10b981;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}

.btn-crear:hover {
  background: #059669;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.rol-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.rol-badge.admin { background: #fee2e2; color: #991b1b; }
.rol-badge.mesero { background: #e0e7ff; color: #3730a3; }
.rol-badge.cocinero { background: #ffedd5; color: #9a3412; }
.rol-badge.facturero { background: #d1fae5; color: #065f46; }

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-delete:hover {
  opacity: 1;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
