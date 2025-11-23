import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import http from 'http';
import { imprimirCuenta, imprimirReciboPago } from './printer-simple.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendPath = path.join(__dirname, '../frontend/dist');


dotenv.config();

const app = express();
const httpServer = http.createServer(app);
// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= BASE DE DATOS =============
const db = new sqlite3.Database('./restaurante.db', (err) => {
    if (err) {
        console.error('❌ Error conectando a BD:', err.message);
        process.exit(1);
    }
    console.log('✓ Conectado a SQLite');
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

// ============= INICIALIZAR TABLAS =============
const initializeTables = () => {
    db.serialize(() => {
        // Tabla: Usuarios
        db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE,
        rol TEXT NOT NULL,
        password_hash TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Tabla: Mesas
        db.run(`
      CREATE TABLE IF NOT EXISTS mesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero INTEGER UNIQUE NOT NULL,
        capacidad INTEGER DEFAULT 4,
        estado TEXT DEFAULT 'disponible',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Tabla: Items de Menú
        db.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        categoria TEXT,
        precio DECIMAL(10,2) NOT NULL,
        disponible BOOLEAN DEFAULT 1,
        imagen_url TEXT,
        tiempo_preparacion_min INTEGER DEFAULT 15,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Tabla: Pedidos
        db.run(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        mesa_numero INTEGER NOT NULL,
        usuario_mesero_id TEXT,
        estado TEXT DEFAULT 'nuevo',
        total DECIMAL(10,2),
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        delivered_at DATETIME,
        FOREIGN KEY(usuario_mesero_id) REFERENCES usuarios(id)
      )
    `);

        // Tabla: Items del Pedido
        db.run(`
      CREATE TABLE IF NOT EXISTS pedido_items (
        id TEXT PRIMARY KEY,
        pedido_id TEXT NOT NULL,
        menu_item_id TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario DECIMAL(10,2),
        estado TEXT DEFAULT 'pendiente',
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
      )
    `);

        // Tabla: Transacciones (Pagos)
        db.run(`
      CREATE TABLE IF NOT EXISTS transacciones (
        id TEXT PRIMARY KEY,
        pedido_id TEXT NOT NULL,
        usuario_facturero_id TEXT,
        monto DECIMAL(10,2) NOT NULL,
        metodo_pago TEXT NOT NULL,
        referencia_transaccion TEXT,
        completada BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY(usuario_facturero_id) REFERENCES usuarios(id)
      )
    `);

        console.log('✓ Tablas inicializadas');
    });
};

// Inicializar al arrancar
initializeTables();

// ============= FUNCIONES AUXILIARES =============

// Helper: Ejecutar query y devolver promesa
const runAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Helper: Obtener un registro
const getAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Helper: Obtener múltiples registros
const allAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

// ============= RUTAS: AUTENTICACIÓN =============

// POST /api/auth/login - Login del usuario
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, rol } = req.body;

        if (!email || !rol) {
            return res.status(400).json({ error: 'Email y rol requeridos' });
        }

        const validRoles = ['admin', 'mesero', 'cocinero', 'facturero'];
        if (!validRoles.includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await getAsync('SELECT * FROM usuarios WHERE email = ?', [email]);

        let id;
        let nombre = email.split('@')[0];

        if (usuarioExistente) {
            // Usuario existe: Usar su ID
            id = usuarioExistente.id;
            await runAsync('UPDATE usuarios SET rol = ?, nombre = ? WHERE id = ?', [rol, nombre, id]);
        } else {
            // Usuario nuevo: Generar ID
            id = uuidv4();
            await runAsync(
                'INSERT INTO usuarios (id, nombre, email, rol, activo) VALUES (?, ?, ?, ?, 1)',
                [id, nombre, email, rol]
            );
        }

        res.json({
            id,
            nombre,
            email,
            rol,
            token: 'demo-token'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// GET /api/auth/usuarios - Obtener todos los usuarios
app.get('/api/auth/usuarios', async (req, res) => {
    try {
        const usuarios = await allAsync('SELECT id, nombre, email, rol, activo FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RUTAS: MENÚ =============

// GET /api/menu - Obtener menú disponible
app.get('/api/menu', async (req, res) => {
    try {
        const menu = await allAsync('SELECT * FROM menu_items WHERE disponible = 1 ORDER BY categoria, nombre');
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
      VALUES (?, ?, ?, ?, ?, ?)
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

        const query = `INSERT INTO mesas (numero, capacidad) VALUES (?, ?)`;
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
      INSERT INTO pedidos (id, mesa_numero, usuario_mesero_id, total, notas, estado)
      VALUES (?, ?, ?, ?, ?, 'nuevo')
    `;
        await runAsync(pedidoQuery, [pedido_id, mesa_numero, usuario_mesero_id, total, notas || null]);

        // Insertar items del pedido
        for (const item of items) {
            const item_id = uuidv4();
            const itemQuery = `
        INSERT INTO pedido_items (id, pedido_id, menu_item_id, cantidad, precio_unitario, notas)
        VALUES (?, ?, ?, ?, ?, ?)
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

        res.json({
            pedido_id,
            mesa_numero,
            total,
            estado: 'nuevo',
            items_count: items.length,
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
      WHERE p.estado IN ('nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja')
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
        WHERE pi.pedido_id = ?
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
        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const items = await allAsync(`
      SELECT pi.id, pi.menu_item_id, mi.nombre, pi.cantidad, pi.precio_unitario, pi.estado, pi.notas
      FROM pedido_items pi
      JOIN menu_items mi ON pi.menu_item_id = mi.id
      WHERE pi.pedido_id = ?
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
        let updateQuery = 'UPDATE pedidos SET estado = ?';
        let params = [estado];

        if (estado === 'en_cocina') {
            updateQuery += ', started_at = CURRENT_TIMESTAMP';
        } else if (estado === 'servido') {
            updateQuery += ', delivered_at = CURRENT_TIMESTAMP';
        } else if (estado === 'pagado') {
            updateQuery += ', completed_at = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE id = ?';
        params.push(req.params.id);

        await runAsync(updateQuery, params);

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

        await runAsync('UPDATE pedido_items SET estado = ? WHERE id = ?', [estado, req.params.id]);

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
      INSERT INTO transacciones (id, pedido_id, usuario_facturero_id, monto, metodo_pago, completada)
      VALUES (?, ?, ?, ?, ?, 1)
    `;

        await runAsync(query, [transaccion_id, pedido_id, usuario_facturero_id, monto, metodo_pago]);

        // Marcar pedido como pagado
        await runAsync('UPDATE pedidos SET estado = ? WHERE id = ?', ['pagado', pedido_id]);

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

        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const items = await allAsync(`
      SELECT pi.*, mi.nombre, mi.precio
      FROM pedido_items pi
      JOIN menu_items mi ON pi.menu_item_id = mi.id
      WHERE pi.pedido_id = ?
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

        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
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
        COUNT(pi.id) as items_count
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_mesero_id = u.id
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      WHERE DATE(p.created_at) = DATE('now')
      GROUP BY p.id
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
            WHERE t.completada = 1
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
            WHERE completada = 1
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

// ============= SERVIR FRONTEND =============
console.log('📁 Sirviendo frontend desde:', frontendPath);

// Servir archivos estáticos
app.use(express.static(frontendPath));

// SPA fallback - todas las rutas van a index.html
app.use((req, res, next) => {
    // Si no es API, servir index.html
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        // Si es API y no se encontró, pasar al 404
        next();
    }
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
    console.log('\n' + '='.repeat(60));
    console.log('✓ SERVIDOR CORRIENDO');
    console.log('='.repeat(60));
    console.log(`\n📍 Acceso local:  http://localhost:${PORT}`);
    console.log(`📍 Acceso red:    http://${process.env.HOST}:${PORT}`);
    console.log(`\n🧪 Prueba:       http://localhost:${PORT}/api/test`);
    console.log(`📊 Menú:         http://localhost:${PORT}/api/menu`);
    console.log(`🪑 Mesas:        http://localhost:${PORT}/api/mesas`);
    console.log('\n' + '='.repeat(60) + '\n');
});

// Cerrar BD al terminar
process.on('SIGINT', () => {
    db.close(() => {
        console.log('\n✓ Base de datos cerrada');
        process.exit(0);
    });
});


