import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { imprimirCuenta, imprimirReciboPago } from './printer-simple.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

import pgTypes from 'pg-types';

const { types } = pkg;

// OID para NUMERIC en PostgreSQL es 1700
types.setTypeParser(1700, val => parseFloat(val));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendPath = path.join(__dirname, '../frontend/dist');


dotenv.config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});
import os from 'os';

// ... imports ...

const app = express();
const httpServer = http.createServer(app);

// Configurar Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Permitir cualquier origen (ajustar en producción)
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Endpoint para obtener IP local
app.get('/api/ip', (req, res) => {
    const interfaces = os.networkInterfaces();
    let ipAddress = 'localhost';

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-ipv4 addresses
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            ipAddress = iface.address;
            break;
        }
    }
    res.json({ ip: ipAddress });
});
// ============= FUNCIONES AUXILIARES =============

// Helpers para consultas seguras con PostgreSQL (!!! Cambia ? por $n en todos los queries !!!)
const runAsync = async (query, params = []) => {
    await pool.query(query, params);
};

const getAsync = async (query, params = []) => {
    const res = await pool.query(query, params);
    return res.rows[0];
};

const allAsync = async (query, params = []) => {
    const res = await pool.query(query, params);
    return res.rows;
};
// ============= BASE DE DATOS =============

const initializeTablesPostgres = async () => {
    // Usuarios
    await runAsync(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT,
      rol TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Mesas
    await runAsync(`
    CREATE TABLE IF NOT EXISTS mesas (
      id SERIAL PRIMARY KEY,
      numero INTEGER UNIQUE NOT NULL,
      capacidad INTEGER DEFAULT 4,
      estado TEXT DEFAULT 'disponible',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Items de Menú
    await runAsync(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT,
      precio NUMERIC(10,2) NOT NULL,
      disponible BOOLEAN DEFAULT TRUE,
      imagen_url TEXT,
      tiempo_preparacion_min INTEGER DEFAULT 15,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Pedidos
    await runAsync(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id TEXT PRIMARY KEY,
      mesa_numero INTEGER NOT NULL,
      usuario_mesero_id TEXT,
      estado TEXT DEFAULT 'nuevo',
      total NUMERIC(10,2),
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      delivered_at TIMESTAMP,
      FOREIGN KEY(usuario_mesero_id) REFERENCES usuarios(id)
    )
  `);

    // Pedido items
    await runAsync(`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id TEXT PRIMARY KEY,
      pedido_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario NUMERIC(10,2),
      estado TEXT DEFAULT 'pendiente',
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
      FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
    )
  `);

    // Transacciones
    await runAsync(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id TEXT PRIMARY KEY,
      pedido_id TEXT NOT NULL,
      usuario_facturero_id TEXT,
      monto NUMERIC(10, 2) NOT NULL,
      metodo_pago TEXT NOT NULL,
      referencia_transaccion TEXT,
      completada BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
      FOREIGN KEY(usuario_facturero_id) REFERENCES usuarios(id)
    )
  `);

    // Configuración
    await runAsync(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    )
  `);

    // Seed admin user si no existe
    const row = await getAsync('SELECT count(*) as count FROM usuarios');
    if (row && Number(row.count) === 0) {
        await runAsync(
            'INSERT INTO usuarios (id, username, password, nombre, rol) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), 'admin', 'admin123', 'Administrador Principal', 'admin']
        );
        console.log('✓ Usuario admin creado: admin/admin123');
    }

    console.log('✓ Tablas inicializadas en Postgres');
};

// Inicializa al arrancar
initializeTablesPostgres();



// ============= RUTAS: AUTENTICACIÓN =============

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }
        const user = await getAsync(
            'SELECT * FROM usuarios WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (user) {
            res.json({
                id: user.id,
                nombre: user.nombre,
                rol: user.rol,
                username: user.username
            });
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: GESTIÓN DE USUARIOS (ADMIN) =============

// GET /api/users - Listar usuarios
app.get('/api/users', async (req, res) => {
    try {
        const users = await allAsync('SELECT id, username, nombre, rol FROM usuarios');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users - Crear usuario
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, nombre, rol } = req.body;
        if (!username || !password || !rol) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        // Verificar si ya existe
        const existing = await getAsync('SELECT id FROM usuarios WHERE username = $1', [username]);
        if (existing) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        const id = uuidv4();
        await runAsync(
            'INSERT INTO usuarios (id, username, password, nombre, rol) VALUES ($1, $2, $3, $4, $5)',
            [id, username, password, nombre, rol]
        );
        res.json({ id, username, nombre, rol, message: 'Usuario creado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id - Eliminar usuario
app.delete('/api/users/:id', async (req, res) => {
    try {
        await runAsync('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: MENÚ =============

// GET /api/menu - Obtener menú disponible
app.get('/api/menu', async (req, res) => {
    try {
        const menu = await allAsync('SELECT * FROM menu_items WHERE disponible = TRUE ORDER BY categoria, nombre');
        res.json(menu);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/menu - Agregar item al menú (Admin)
app.post('/api/menu', async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precio, tiempo_preparacion_min } = req.body;

        if (!nombre || !precio || !categoria) {
            return res.status(400).json({ error: 'Nombre, precio y categoría requeridos' });
        }

        const id = uuidv4();
        const query = `
  INSERT INTO menu_items (id, nombre, descripcion, categoria, precio, tiempo_preparacion_min)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

        await runAsync(query, [id, nombre, descripcion || null, categoria, precio, tiempo_preparacion_min || 15]);

        res.json({
            id,
            nombre,
            descripcion,
            categoria,
            precio,
            tiempo_preparacion_min,
            disponible: true,
            message: '✓ Item agregado'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/menu/:id - Actualizar item del menú
app.put('/api/menu/:id', async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precio, tiempo_preparacion_min, disponible } = req.body;

        await runAsync(`
            UPDATE menu_items 
            SET nombre = $1, descripcion = $2, categoria = $3, precio = $4, tiempo_preparacion_min = $5, disponible = $6
            WHERE id = $7
                `, [nombre, descripcion, categoria, precio, tiempo_preparacion_min, disponible, req.params.id]);

        res.json({ message: '✓ Item actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/menu/:id - Eliminar item del menú
app.delete('/api/menu/:id', async (req, res) => {
    try {
        await runAsync('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
        res.json({ message: '✓ Item eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: MESAS =============

// GET /api/mesas - Obtener todas las mesas
app.get('/api/mesas', async (req, res) => {
    try {
        const mesas = await allAsync('SELECT * FROM mesas ORDER BY numero');
        res.json(mesas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/mesas - Crear mesas
app.post('/api/mesas', async (req, res) => {
    try {
        const { numero, capacidad } = req.body;

        if (!numero) {
            return res.status(400).json({ error: 'Número de mesa requerido' });
        }

        const query = `INSERT INTO mesas(numero, capacidad) VALUES($1, $2)`;
        await runAsync(query, [numero, capacidad || 4]);

        res.json({
            numero,
            capacidad,
            estado: 'disponible',
            message: '✓ Mesa agregada'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/mesas/:id - Eliminar mesa
app.delete('/api/mesas/:id', async (req, res) => {
    try {
        await runAsync('DELETE FROM mesas WHERE id = $1', [req.params.id]);
        res.json({ message: '✓ Mesa eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: PEDIDOS =============

// POST /api/pedidos - Crear nuevo pedido
app.post('/api/pedidos', async (req, res) => {
    try {
        const { mesa_numero, usuario_mesero_id, items, notas } = req.body;

        if (!mesa_numero || !items || items.length === 0) {
            return res.status(400).json({ error: 'Mesa e items requeridos' });
        }

        const pedido_id = uuidv4();
        let total = 0;

        // Calcular total
        items.forEach(item => {
            total += item.cantidad * item.precio_unitario;
        });

        // Insertar pedido
        const pedidoQuery = `
      INSERT INTO pedidos(id, mesa_numero, usuario_mesero_id, total, notas, estado)
      VALUES($1, $2, $3, $4, $5, 'nuevo')
                `;
        await runAsync(pedidoQuery, [pedido_id, mesa_numero, usuario_mesero_id, total, notas || null]);

        // Insertar items del pedido
        for (const item of items) {
            const item_id = uuidv4();
            const itemQuery = `
        INSERT INTO pedido_items(id, pedido_id, menu_item_id, cantidad, precio_unitario, notas)
        VALUES($1, $2, $3, $4, $5, $6)
                `;
            await runAsync(itemQuery, [
                item_id,
                pedido_id,
                item.menu_item_id,
                item.cantidad,
                item.precio_unitario,
                item.notas || null
            ]);
        }

        const nuevoPedido = {
            id: pedido_id,
            mesa_numero,
            usuario_mesero_id, // Agregado para que el frontend pueda filtrar
            total,
            estado: 'nuevo',
            items_count: items.length,
            items: items, // Incluir items para el frontend
            created_at: new Date()
        };

        // Emitir evento Socket.io
        io.emit('nuevo_pedido', nuevoPedido);

        res.json({
            ...nuevoPedido,
            message: '✓ Pedido creado'
        });
    } catch (error) {
        console.error('Error creando pedido:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/pedidos/activos - Obtener pedidos activos
app.get('/api/pedidos/activos', async (req, res) => {
    try {
        const query = `
      SELECT 
        p.id,
            p.mesa_numero,
            p.usuario_mesero_id,
            p.estado,
            p.total,
            p.notas,
            p.created_at,
            p.started_at,
            p.completed_at,
            COUNT(pi.id) as items_count
      FROM pedidos p
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      WHERE p.estado IN('nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja')
      GROUP BY p.id
      ORDER BY p.created_at ASC
            `;

        const pedidos = await allAsync(query);

        // Para cada pedido, obtener los items
        for (let pedido of pedidos) {
            const itemsQuery = `
        SELECT pi.id, pi.menu_item_id, mi.nombre, pi.cantidad, pi.precio_unitario, pi.estado, pi.notas
        FROM pedido_items pi
        JOIN menu_items mi ON pi.menu_item_id = mi.id
        WHERE pi.pedido_id = $1
            `;
            pedido.items = await allAsync(itemsQuery, [pedido.id]);
        }

        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/pedidos/:id - Obtener pedido específico
app.get('/api/pedidos/:id', async (req, res) => {
    try {
        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = $1', [req.params.id]);

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const items = await allAsync(`
      SELECT pi.id, pi.menu_item_id, mi.nombre, pi.cantidad, pi.precio_unitario, pi.estado, pi.notas
      FROM pedido_items pi
      JOIN menu_items mi ON pi.menu_item_id = mi.id
      WHERE pi.pedido_id = $1
            `, [req.params.id]);

        res.json({ ...pedido, items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/pedidos/:id/estado - Actualizar estado del pedido
app.put('/api/pedidos/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;

        const estadosValidos = ['nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja', 'pagado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        // Actualizar timestamp según estado
        let updateQuery = 'UPDATE pedidos SET estado = $1';
        let params = [estado];

        if (estado === 'en_cocina') {
            updateQuery += ', started_at = CURRENT_TIMESTAMP';
        } else if (estado === 'servido') {
            updateQuery += ', delivered_at = CURRENT_TIMESTAMP';
        } else if (estado === 'pagado') {
            updateQuery += ', completed_at = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE id = $2';
        params.push(req.params.id);

        await runAsync(updateQuery, params);

        // Emitir evento Socket.io
        io.emit('pedido_actualizado', { id: req.params.id, estado });

        res.json({ message: '✓ Pedido actualizado', estado });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: ITEMS DEL PEDIDO =============

// PUT /api/pedido-items/:id/estado - Actualizar estado de item
app.put('/api/pedido-items/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;

        const estadosValidos = ['pendiente', 'preparando', 'listo', 'servido'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await runAsync('UPDATE pedido_items SET estado = $1 WHERE id = $2', [estado, req.params.id]);

        // Obtener el item actualizado para emitir
        const item = await getAsync('SELECT * FROM pedido_items WHERE id = $1', [req.params.id]);

        // Emitir evento Socket.io
        io.emit('item_actualizado', { id: req.params.id, pedido_id: item.pedido_id, estado });

        res.json({ message: '✓ Item actualizado', estado });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: PAGOS =============

// POST /api/transacciones - Registrar pago
app.post('/api/transacciones', async (req, res) => {
    try {
        const { pedido_id, usuario_facturero_id, monto, metodo_pago } = req.body;

        if (!pedido_id || !monto || !metodo_pago) {
            return res.status(400).json({ error: 'Pedido, monto y método de pago requeridos' });
        }

        const metodosValidos = ['efectivo', 'tarjeta', 'nequi', 'otro_digital'];
        if (!metodosValidos.includes(metodo_pago)) {
            return res.status(400).json({ error: 'Método de pago inválido' });
        }

        const transaccion_id = uuidv4();
        const query = `
      INSERT INTO transacciones(id, pedido_id, usuario_facturero_id, monto, metodo_pago, completada)
      VALUES($1, $2, $3, $4, $5, TRUE)
                `;

        await runAsync(query, [transaccion_id, pedido_id, usuario_facturero_id, monto, metodo_pago]);

        // Marcar pedido como pagado
        await runAsync('UPDATE pedidos SET estado = $1 WHERE id = $2', ['pagado', pedido_id]);

        // Emitir evento Socket.io con detalles de pago para el Admin
        io.emit('pedido_pagado', {
            pedido_id,
            estado: 'pagado',
            monto,
            metodo_pago,
            usuario_facturero_id
        });

        res.json({
            transaccion_id,
            pedido_id,
            monto,
            metodo_pago,
            message: '✓ Pago registrado'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= IMPRESORA =============

// POST /api/imprimir/cuenta (Cuando pide la cuenta)
app.post('/api/imprimir/cuenta', async (req, res) => {
    try {
        const { pedido_id } = req.body;

        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = $1', [pedido_id]);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const items = await allAsync(`
      SELECT pi.*, mi.nombre, mi.precio
      FROM pedido_items pi
      JOIN menu_items mi ON pi.menu_item_id = mi.id
      WHERE pi.pedido_id = $1
            `, [pedido_id]);

        pedido.items = items;
        const impreso = await imprimirCuenta(pedido);

        res.json({
            success: impreso,
            message: impreso ? '✅ Cuenta impresa' : '❌ Error al imprimir cuenta'
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/imprimir/pago (Cuando paga)
app.post('/api/imprimir/pago', async (req, res) => {
    try {
        const { pedido_id, metodo_pago, monto } = req.body;

        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = $1', [pedido_id]);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const impreso = await imprimirReciboPago(pedido, metodo_pago, monto);

        res.json({
            success: impreso,
            message: impreso ? '✅ Recibo de pago impreso' : '❌ Error al imprimir recibo'
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// ============= RUTAS: REPORTES =============

// GET /api/reportes/ventas-hoy - Ventas del día
app.get('/api/reportes/ventas-hoy', async (req, res) => {
    try {
        const query = `
      SELECT 
        metodo_pago,
            COUNT(*) as cantidad,
            SUM(monto) as total
      FROM transacciones
      WHERE DATE(created_at) = DATE('now')
      GROUP BY metodo_pago
            `;

        const reportes = await allAsync(query);

        const totalQuery = `
      SELECT SUM(monto) as total
      FROM transacciones
      WHERE DATE(created_at) = DATE('now')
            `;

        const totalRow = await getAsync(totalQuery);

        res.json({
            detalles: reportes,
            total_general: totalRow.total || 0,
            fecha: new Date().toISOString().split('T')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reportes/pedidos-hoy - Pedidos del día
app.get('/api/reportes/pedidos-hoy', async (req, res) => {
    try {
        const query = `
      SELECT 
        p.id,
            p.mesa_numero,
            u.nombre as mesero,
            p.total,
            p.estado,
            p.created_at,
            COUNT(pi.id) as items_count,
            t.usuario_facturero_id,
            t.metodo_pago
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_mesero_id = u.id
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      LEFT JOIN transacciones t ON p.id = t.pedido_id
      WHERE DATE(p.created_at) = DATE('now')
      GROUP BY p.id, p.mesa_numero, u.nombre, p.total, p.estado, p.created_at, t.usuario_facturero_id, t.metodo_pago
      ORDER BY p.created_at DESC
            `;

        const pedidos = await allAsync(query);
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reportes/historico - Reporte histórico por día
app.get('/api/reportes/historico', async (req, res) => {
    try {
        // Ventas por día
        const ventasPorDiaQuery = `
            SELECT 
                DATE(t.created_at) as fecha,
            COUNT(*) as cantidad_transacciones,
            SUM(t.monto) as total_dia
            FROM transacciones t
            WHERE t.completada = TRUE
            GROUP BY DATE(t.created_at)
            ORDER BY fecha DESC
            LIMIT 30
            `;

        const ventasPorDia = await allAsync(ventasPorDiaQuery);

        // Total acumulado
        const totalAcumuladoQuery = `
            SELECT 
                COUNT(*) as total_transacciones,
            SUM(monto) as total_acumulado
            FROM transacciones
            WHERE completada = TRUE
            `;

        const totalAcumulado = await getAsync(totalAcumuladoQuery);

        res.json({
            ventas_por_dia: ventasPorDia,
            total_acumulado: totalAcumulado
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: CONFIGURACIÓN =============

// GET /api/config
app.get('/api/config', async (req, res) => {
    try {
        const rows = await allAsync('SELECT * FROM configuracion');
        const config = {};
        rows.forEach(row => {
            if (row.valor === 'true') config[row.clave] = true;
            else if (row.valor === 'false') config[row.clave] = false;
            else config[row.clave] = row.valor;
        });
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/config
app.post('/api/config', async (req, res) => {
    try {
        const config = req.body;

        // Usamos INSERT ... ON CONFLICT para upsert en Postgres
        for (const [key, val] of Object.entries(config)) {
            await runAsync(
                'INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor',
                [key, String(val)]
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: TEST =============

// GET /api/test - Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: '✓ Servidor funcionando correctamente',
        timestamp: new Date(),
        endpoints: [
            'GET /api/menu',
            'GET /api/mesas',
            'GET /api/pedidos/activos',
            'POST /api/pedidos',
            'POST /api/transacciones',
            'GET /api/reportes/ventas-hoy'
        ]
    });
});

// ============= MANEJO DE ERRORES =============

// 404 (Solo para API, ya que el frontend atrapó lo demás)
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error general
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// ============= INICIAR SERVIDOR =============

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

// Cerrar BD al terminar
process.on('SIGINT', async () => {
    await pool.end();
    console.log('\n✓ Conexión a Postgres finalizada');
    process.exit(0);
});
