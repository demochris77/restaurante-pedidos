process.env.TZ = 'America/Bogota'; // ✅ CONFIGURAR TIMEZONE PARA COLOMBIA (UTC-5)
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool, { runAsync, getAsync, allAsync } from './config/db.js';
import bcrypt from 'bcrypt'; // ✅ NUEVO
import { v4 as uuidv4 } from 'uuid'; // ✅ NUEVO
import compression from 'compression'; // ✅ NUEVO: Compression
import { getFromCache, setCache, clearCache } from './utils/cache.js'; // ✅ NUEVO: Cache

// Importar rutas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import menuRoutes from './routes/menu.js';
import mesasRoutes from './routes/mesas.js';
import pedidosRoutes from './routes/pedidos.js';
import reportesRoutes from './routes/reportes.js';
import transaccionesRoutes from './routes/transacciones.js';
import uploadRoutes from './routes/upload.js';
import manifestRoutes from './routes/manifest.js';
import iconsRoutes from './routes/icons.js';
import wellKnownRoutes from './routes/well-known.js';
import configItemsRoutes from './routes/configItems.js'; // ✅ NUEVO
import pushRoutes from './routes/push.js'; // ✅ NUEVO: Push notifications
import { sendPushToRole, sendPushToUser } from './utils/pushNotifications.js'; // ✅ NUEVO

// dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configurar Socket.IO con opciones para producción
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    },
    // ✅ CRÍTICO PARA RENDER: Permitir ambos transports
    transports: ['polling', 'websocket'],
    // ✅ Configuraciones adicionales para producción
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowUpgrades: true,
    perMessageDeflate: false
});

// Hacer io accesible en las rutas
app.set('io', io);

// Middlewares
app.use(cors());

// ✅ NUEVO: Enable gzip compression (40-60% bandwidth reduction)
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses > 1KB
    level: 6 // Balance between speed and compression ratio
}));

// ✅ AUMENTAR LÍMITE para imágenes base64 grandes en configuración (50MB)
app.use(express.json({ limit: '50mb' }));

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
                rol TEXT NOT NULL CHECK(rol IN ('admin', 'mesero', 'cocinero', 'cajero')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                tiempo_preparacion_min INTEGER DEFAULT 15,
                disponible BOOLEAN DEFAULT TRUE,
                descripcion TEXT,
                usa_inventario BOOLEAN DEFAULT FALSE,
                stock_actual INTEGER,
                stock_minimo INTEGER,
                estado_inventario TEXT DEFAULT 'disponible' CHECK(estado_inventario IN ('disponible', 'poco_stock', 'no_disponible')),
                image_url VARCHAR(500),
                imagen_url TEXT,
                es_directo BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 🔄 MIGRACIONES AUTOMÁTICAS: MENU_ITEMS
        // Asegurar que las columnas existan si la tabla ya fue creada antes
        await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS usa_inventario BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_actual INTEGER`);
        await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_minimo INTEGER`);
        await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS estado_inventario TEXT DEFAULT 'disponible' CHECK(estado_inventario IN ('disponible', 'poco_stock', 'no_disponible'))`);
        await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
        await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_reservado INTEGER DEFAULT 0`);

        // ✅ NUEVO: Agregar columna de idioma a usuarios
        await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es'`);

        // Crear tabla de mesas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mesas (
                id SERIAL PRIMARY KEY,
                numero INTEGER UNIQUE NOT NULL,
                capacidad INTEGER DEFAULT 4,
                estado TEXT DEFAULT 'disponible' CHECK(estado IN ('disponible', 'ocupada', 'reservada')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ✅ NUEVO: Tabla de Categorías Dinámicas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ✅ NUEVO: Poblar categorías iniciales si está vacía
        const catCount = await pool.query('SELECT COUNT(*) FROM categories');
        if (parseInt(catCount.rows[0].count) === 0) {
            console.log('📥 Poblando categorías iniciales...');
            await pool.query(`
                INSERT INTO categories (name, display_order) VALUES 
                ('Platos Fuertes', 1),
                ('Entradas', 2),
                ('Bebidas', 3),
                ('Postres', 4),
                ('Adicionales', 5)
            `);
        }

        // ✅ NUEVO: Tabla de Métodos de Pago Dinámicos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                label VARCHAR(100),
                active BOOLEAN DEFAULT TRUE,
                is_digital BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ✅ NUEVO: Poblar métodos de pago iniciales si está vacía
        const pmCount = await pool.query('SELECT COUNT(*) FROM payment_methods');
        if (parseInt(pmCount.rows[0].count) === 0) {
            console.log('📥 Poblando métodos de pago iniciales...');
            await pool.query(`
                INSERT INTO payment_methods (name, label, is_digital) VALUES 
                ('efectivo', 'Efectivo', FALSE),
                ('tarjeta', 'Tarjeta Débito/Crédito', TRUE),
                ('nequi', 'Nequi', TRUE),
                ('daviplata', 'DaviPlata', TRUE),
                ('transferencia', 'Transferencia Bancaria', TRUE)
            `);
        }

        // Crear tabla de pedidos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id TEXT PRIMARY KEY,
                mesa_numero INTEGER NOT NULL,
                usuario_mesero_id TEXT,
                total NUMERIC(10,2) NOT NULL,
                subtotal NUMERIC(10,2) DEFAULT 0, -- ✅ MIGRACIÓN INTEGRADA
                propina_monto NUMERIC(10,2) DEFAULT 0, -- ✅ MIGRACIÓN INTEGRADA
                propina_porcentaje INTEGER DEFAULT 0, -- ✅ MIGRACIÓN INTEGRADA
                estado TEXT DEFAULT 'nuevo' CHECK(estado IN ('nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja', 'pagado', 'cancelado')),
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                delivered_at TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (usuario_mesero_id) REFERENCES usuarios(id)
            )
        `);

        // 🔄 MIGRACIONES AUTOMÁTICAS: PEDIDOS
        await pool.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0`);
        await pool.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS propina_monto NUMERIC(10,2) DEFAULT 0`);
        await pool.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS propina_porcentaje INTEGER DEFAULT 0`);

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
            )
        `);

        // 🔄 MIGRACIONES AUTOMÁTICAS: PEDIDO_ITEMS
        await pool.query(`ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`);
        await pool.query(`ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
        await pool.query(`ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS served_at TIMESTAMP`);
        await pool.query(`ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS tiempo_real INTEGER`);

        // Crear tabla de estadísticas de tiempo
        await pool.query(`
            CREATE TABLE IF NOT EXISTS item_time_stats (
                id SERIAL PRIMARY KEY,
                menu_item_id TEXT NOT NULL,
                fecha DATE NOT NULL,
                total_preparaciones INTEGER DEFAULT 0,
                tiempo_promedio INTEGER DEFAULT 0,
                tiempo_promedio_minutos NUMERIC(5, 2) DEFAULT 0,
                tiempo_minimo INTEGER,
                tiempo_minimo_minutos INTEGER,
                tiempo_maximo INTEGER,
                tiempo_maximo_minutos INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
                metodo_pago TEXT NOT NULL, -- ✅ CHECK constraint eliminado para permitir dinámicos
                referencia_transaccion TEXT,
                completada BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
                FOREIGN KEY (usuario_facturero_id) REFERENCES usuarios(id)
            )
        `);

        // 🔄 MIGRACIONES AUTOMÁTICAS: TRANSACCIONES
        // Intentar eliminar el constraint si existe (nombre por defecto suele ser transacciones_metodo_pago_check)
        try {
            await pool.query(`ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_metodo_pago_check`);
        } catch (e) {
            console.log('Nota: No se pudo eliminar constraint de transacciones (puede que no exista o tenga otro nombre)');
        }

        // 🔄 MIGRACIONES AUTOMÁTICAS: CORRECCIÓN DE FOREIGN KEYS (CASCADE DELETE)
        try {
            // Esto permite borrar items del menú aunque estén en pedidos antiguos
            await pool.query(`ALTER TABLE pedido_items DROP CONSTRAINT IF EXISTS pedido_items_menu_item_id_fkey`);
            await pool.query(`
                ALTER TABLE pedido_items 
                ADD CONSTRAINT pedido_items_menu_item_id_fkey 
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
            `);
        } catch (e) {
            console.log('Nota: Migración FK pedido_items (ya existe o error):', e.message);
        }

        // ✅ NUEVO: Tabla de suscripciones push
        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                keys_p256dh TEXT NOT NULL,
                keys_auth TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, endpoint)
            )
        `);

        // Crear tabla de configuración
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT
            )
        `);

        // 🔄 MIGRACIONES AUTOMÁTICAS: CONFIGURACIÓN INICIAL
        // Insertar claves por defecto si no existen
        const defaultConfigs = [
            { k: 'porcentaje_propina', v: '10' },
            { k: 'favicon_url', v: '' },
            { k: 'icon_192_url', v: '' },
            { k: 'icon_512_url', v: '' },
            { k: 'apple_touch_icon_url', v: '' }
        ];

        for (const conf of defaultConfigs) {
            await pool.query(`INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO NOTHING`, [conf.k, conf.v]);
        }

        // 🔄 CREAR ADMIN POR DEFECTO SI NO EXISTE NINGUNO
        try {
            const usersCount = await pool.query('SELECT count(*) FROM usuarios');
            if (parseInt(usersCount.rows[0].count) === 0) {
                console.log('⚠️ No hay usuarios. Creando ADMIN por defecto...');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await pool.query(`
                    INSERT INTO usuarios (id, username, password, nombre, rol)
                    VALUES ($1, $2, $3, $4, $5)
                `, [uuidv4(), 'admin', hashedPassword, 'Administrador Inicial', 'admin']);
                console.log('✅ Usuario ADMIN creado: user=admin, pass=admin123');
            }
        } catch (err) {
            console.error('Error creando admin por defecto:', err);
        }

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
app.use('/api/pedido-items', pedidosRoutes); // Items usan el mismo router
app.use('/api/reportes', reportesRoutes);
app.use('/api/transacciones', transaccionesRoutes);
app.use('/api/upload', uploadRoutes); // ✅ NUEVO
app.use('/api/manifest', manifestRoutes); // ✅ NUEVO - Manifest dinámico
app.use('/api/icons', iconsRoutes); // ✅ NUEVO - Iconos dinámicos
app.use('/api/well-known', wellKnownRoutes); // ✅ Well-known dinámico


// Rutas de administración de configuración (Categorías y Métodos de Pago)
app.use('/api', configItemsRoutes);

// ✅ NUEVO: Rutas de push notifications
app.use('/api/push', pushRoutes);

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

// POST /api/config - Guardar múltiples claves de configuración
app.post('/api/config', async (req, res) => {
    try {
        const config = req.body;

        // Guardar cada clave en la base de datos
        for (const [clave, valor] of Object.entries(config)) {
            // ✅ FILTRAR: Ignorar valores base64 (imágenes muy grandes)
            if (typeof valor === 'string' && valor.startsWith('data:image')) {
                // Las imágenes base64 son muy grandes, saltarlas
                // (se manejan por separado si es necesario)
                continue;
            }

            const valorString = String(valor);

            await runAsync(
                `INSERT INTO configuracion (clave, valor) 
                 VALUES ($1, $2)
                 ON CONFLICT (clave) 
                 DO UPDATE SET valor = $2`,
                [clave, valorString]
            );
        }

        res.json({ success: true, message: 'Configuración guardada' });
    } catch (error) {
        console.error('Error guardando configuración:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/config/:clave - Actualizar configuración
app.put('/api/config/:clave', async (req, res) => {
    try {
        const { clave } = req.params;
        const { valor } = req.body;

        if (!valor && valor !== 0 && valor !== false) {
            return res.status(400).json({ error: 'Valor requerido' });
        }

        // Convertir booleanos y números a string para almacenar
        const valorString = String(valor);

        await runAsync(
            'INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = $2',
            [clave, valorString]
        );

        res.json({ message: '✓ Configuración actualizada', clave, valor: valorString });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= SOCKET.IO =============
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // Cliente solicita la cuenta - retransmitir al mesero
    socket.on('solicitar_cuenta', async (data) => {
        console.log('💳 Cuenta solicitada:', data);
        io.emit('solicitar_cuenta', data);

        // ✅ NUEVO: Notificar al mesero via push
        try {
            if (data.usuario_mesero_id) {
                await sendPushToUser(data.usuario_mesero_id,
                    'bill_requested',
                    'bill_requested_body',
                    [data.mesa_numero],
                    {
                        url: '/',
                        mesa: data.mesa_numero
                    }
                );
            }
        } catch (pushError) {
            console.warn('⚠️ Push notification failed:', pushError);
        }
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
