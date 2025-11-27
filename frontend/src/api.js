import axios from 'axios';

// Determinar URL de la API dinámicamente
const getApiUrl = () => {
  const hostname = window.location.hostname;

  // Si estamos en localhost o una IP local (192.168.x.x, 10.x.x.x, 172.16.x.x)
  const isLocal = hostname === 'localhost' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31);

  if (isLocal) {
    // Modo Local: Conectar al backend en el mismo host, puerto 3000
    console.log('🔌 Modo Local detectado: Conectando a backend local');
    return `http://${hostname}:3000/api`;
  } else {
    // Modo Online: Usar URL de producción (Render)
    console.log('☁️ Modo Online detectado: Conectando a backend remoto');
    return import.meta.env.VITE_API_URL || 'https://restaurante-pedidos-backend.onrender.com/api';
  }
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default {
  // ============= AUTENTICACIÓN =============
  login(username, password) {
    return api.post('/auth/login', { username, password });
  },

  // ============= GESTIÓN DE USUARIOS (ADMIN) =============
  getUsuarios() {
    return api.get('/users');
  },

  crearUsuario(usuario) {
    return api.post('/users', usuario);
  },

  eliminarUsuario(id) {
    return api.delete(`/users/${id}`);
  },

  // ============= MENÚ =============
  getMenu() {
    return api.get('/menu');
  },

  agregarMenuItem(itemData) {
    return api.post('/menu', itemData);
  },

  updateMenuItem(id, item) {
    return api.put(`/menu/${id}`, item);
  },

  deleteMenuItem(id) {
    return api.delete(`/menu/${id}`);
  },

  // ============= MESAS =============
  getMesas() {
    return api.get('/mesas');
  },

  crearMesa(numero, capacidad) {
    return api.post('/mesas', { numero, capacidad });
  },

  deleteMesa(id) {
    return api.delete(`/mesas/${id}`);
  },

  // ============= PEDIDOS =============
  crearPedido(mesa_numero, usuario_mesero_id, items, notas) {
    return api.post('/pedidos', { mesa_numero, usuario_mesero_id, items, notas });
  },

  getPedidosActivos() {
    return api.get('/pedidos/activos');
  },

  getPedido(id) {
    return api.get(`/pedidos/${id}`);
  },

  actualizarEstadoPedido(id, estado) {
    return api.put(`/pedidos/${id}/estado`, { estado });
  },

  // ============= ITEMS DEL PEDIDO =============
  actualizarEstadoItem(id, estado) {
    return api.put(`/pedidos/items/${id}/estado`, { estado });
  },

  // Individual item tracking
  iniciarItem(id) {
    return api.put(`/pedidos/items/${id}/start`);
  },

  completarItem(id) {
    return api.put(`/pedidos/items/${id}/complete`);
  },

  servirItem(id) {
    return api.put(`/pedidos/items/${id}/serve`);
  },

  // ============= PAGOS =============
  registrarPago(pedido_id, usuario_facturero_id, monto, metodo_pago) {
    return api.post('/transacciones', { pedido_id, usuario_facturero_id, monto, metodo_pago });
  },

  // ============= REPORTES =============
  getVentasHoy() {
    return api.get('/reportes/ventas-hoy');
  },

  getPedidosHoy() {
    return api.get('/reportes/pedidos-hoy');
  },

  getReporteHistorico() {
    return api.get('/reportes/historico');
  },

  getTiemposCocina(params = {}) {
    return api.get('/reportes/tiempos-cocina', { params });
  },

  // En tu archivo api.js
  getTopPlatos: (limit = 10, params = {}) => {
    return axios.get(`/api/reportes/top-platos`, {
      params: { limit, ...params }
    });
  },

  // ============= PÚBLICO (Sin autenticación) =============
  getPedidoStatusPublico(id) {
    return api.get(`/pedidos/${id}/status-publico`);
  },

  getMesaPedidoActual(mesaNumero) {
    return api.get(`/mesas/${mesaNumero}/pedido-actual`);
  },

  // ============= IMPRESORA =============
  imprimirCuenta(pedido_id) {
    return api.post('/imprimir/cuenta', { pedido_id });
  },

  imprimirPago(pedido_id, metodo_pago, monto) {
    return api.post('/imprimir/pago', { pedido_id, metodo_pago, monto });
  },

  // Configuración
  getConfig: () => api.get('/config'),
  saveConfig: (config) => api.post('/config', config),
  getIp: () => api.get('/ip'),
};
