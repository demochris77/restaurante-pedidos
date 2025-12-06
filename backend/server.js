process.env.TZ = 'UTC';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './config/db.js';
import { allAsync } from './config/db.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import menuRoutes from './routes/menu.js';
import mesasRoutes from './routes/mesas.js';
import pedidosRoutes from './routes/pedidos.js';
import reportesRoutes from './routes/reportes.js';
import transaccionesRoutes from './routes/transacciones.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Hacer io accesible en las rutas
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());

// ============= INICIALIZACIÓN DE BD =============
async function initDatabase() {
    try {
        // Crear tabla de usuarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nombre TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('admin', 'mesero', 'cocinero', 'cajero'))
            )
        `);

        // Crear tabla de menú
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                precio NUMERIC(10,2) NOT NULL,
                tiempo_estimado INTEGER DEFAULT 15,
                disponible BOOLEAN DEFAULT TRUE,
                descripcion TEXT,
                usa_inventario BOOLEAN DEFAULT FALSE,
                stock_actual INTEGER,
                stock_minimo INTEGER,
                estado_inventario TEXT DEFAULT 'disponible' CHECK(estado_inventario IN ('disponible', 'poco_stock', 'no_disponible'))
            )
        `);

        // Crear tabla de mesas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mesas (
                id SERIAL PRIMARY KEY,
                numero INTEGER UNIQUE NOT NULL,
                capacidad INTEGER DEFAULT 4,
                estado TEXT DEFAULT 'disponible' CHECK(estado IN ('disponible', 'ocupada', 'reservada'))
            )
        `);

        // Crear tabla de pedidos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id TEXT PRIMARY KEY,
                mesa_id TEXT NOT NULL,
                usuario_facturero_id TEXT,
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_preparacion', 'listo', 'servido')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (mesa_id) REFERENCES mesas(id),
                FOREIGN KEY (usuario_facturero_id) REFERENCES usuarios(id)
            )
        `);

        // Crear tabla de items del pedido
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedido_items (
                id TEXT PRIMARY KEY,
                pedido_id TEXT NOT NULL,
                menu_item_id TEXT NOT NULL,
                cantidad INTEGER NOT NULL DEFAULT 1,
                precio_unitario NUMERIC(10,2) NOT NULL,
                notas TEXT,
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_preparacion', 'listo', 'servido')),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                served_at TIMESTAMP,
                tiempo_real INTEGER,
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
            )
        `);

        // Crear tabla de estadísticas de tiempo
        await pool.query(`
            CREATE TABLE IF NOT EXISTS item_time_stats (
                id SERIAL PRIMARY KEY,
                menu_item_id TEXT NOT NULL,
                fecha DATE NOT NULL,
                total_preparaciones INTEGER DEFAULT 0,
                tiempo_promedio INTEGER DEFAULT 0,
                tiempo_minimo INTEGER,
                tiempo_maximo INTEGER,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
                UNIQUE(menu_item_id, fecha)
            )
        `);

        // Crear tabla de transacciones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transacciones (
                id TEXT PRIMARY KEY,
                pedido_id TEXT NOT NULL,
                usuario_facturero_id TEXT,
                monto NUMERIC(10,2) NOT NULL,
                metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
                completada BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
                FOREIGN KEY (usuario_facturero_id) REFERENCES usuarios(id)
            )
        `);

        // Crear tabla de configuración
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT
            )
        `);

        console.log('✓ Tablas inicializadas en Postgres');
    } catch (err) {
        console.error('Error inicializando BD:', err);
    }
}

initDatabase();

// ============= RUTAS =============
app.use('/api/auth', authRoutes);
app.use('/api/users', usuariosRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pedido-items', pedido_itemsRoutes); // Items usan el mismo router
app.use('/api/reportes', reportesRoutes);
app.use('/api/transacciones', transaccionesRoutes);

// ============= CONFIGURACIÓN =============
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

// ============= SOCKET.IO =============
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // Cliente solicita la cuenta - retransmitir al mesero
    socket.on('solicitar_cuenta', (data) => {
        console.log('💳 Cuenta solicitada:', data);
        io.emit('solicitar_cuenta', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// ============= TEST =============
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
            'GET /api/reportes/ventas-hoy',
            'GET /api/reportes/top-platos',
            'GET /api/mesas/:numero/pedido-actual'
        ]
    });
});

// ============= MANEJO DE ERRORES =============
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

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
