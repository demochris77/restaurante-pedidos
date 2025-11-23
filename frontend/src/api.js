import axios from 'axios';

// Apuntar siempre al puerto 3000 (Backend)
const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;


const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
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
    getConfig: () => axios.get(`${API_URL}/config`),
    saveConfig: (config) => axios.post(`${API_URL}/config`, config),
    getIp: () => axios.get(`${API_URL}/ip`),
};
