import axios from 'axios';

// Usar variable de entorno VITE_API_URL o localhost para desarrollo local
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

  agregarMenuItem(nombre, descripcion, categoria, precio, tiempo, stock) {
    return api.post('/menu', { nombre, descripcion, categoria, precio, tiempo_preparacion_min: tiempo, stock });
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
    return api.put(`/pedido-items/${id}/estado`, { estado });
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
