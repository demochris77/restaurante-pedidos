import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new sqlite3.Database('./restaurante.db', (err) => {
    if (err) {
        console.error('Error conectando a BD:', err);
        process.exit(1);
    }
    console.log('✓ Conectado a SQLite\n');
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

// ============= CREAR TABLAS PRIMERO =============
const createTables = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Tabla: Usuarios
            db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          email TEXT UNIQUE,
          rol TEXT NOT NULL,
          activo BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Tabla: Mesas
            db.run(`
        CREATE TABLE IF NOT EXISTS mesas (
          numero INTEGER PRIMARY KEY,
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
          tiempo_preparacion_min INTEGER DEFAULT 15,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          delivered_at DATETIME
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
          FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
        )
      `, (err) => {
                if (err) {
                    console.error('Error creando tablas:', err);
                    reject(err);
                } else {
                    console.log('✓ Tablas creadas\n');
                    resolve();
                }
            });
        });
    });
};

// ============= INSERTAR DATOS =============
const insertData = async () => {
    try {
        console.log('🌱 Insertando datos de prueba...\n');

        // ============= INSERTAR MESAS =============
        console.log('📍 Creando mesas...');
        for (let i = 1; i <= 10; i++) {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO mesas (numero, capacidad, estado) VALUES (?, ?, ?)',
                    [i, 4, 'disponible'],
                    (err) => {
                        if (err) {
                            console.error(`Error creando mesa ${i}:`, err.message);
                        }
                        resolve();
                    }
                );
            });
        }
        console.log('✓ 10 mesas creadas\n');

        // ============= INSERTAR MENÚ =============
        console.log('🍽️  Creando menú...');

        const menuItems = [
            { nombre: 'Arepa con queso', categoria: 'Entrada', precio: 2.50, descripcion: 'Arepa caliente rellena de queso fresco', tiempo: 10 },
            { nombre: 'Huevos pericos', categoria: 'Entrada', precio: 4.00, descripcion: 'Huevos revueltos con cebolla y tomate', tiempo: 8 },
            { nombre: 'Patacones', categoria: 'Entrada', precio: 3.50, descripcion: 'Plátano verde frito', tiempo: 10 },
            { nombre: 'Ajiaco Colombiano', categoria: 'Plato fuerte', precio: 8.00, descripcion: 'Sopa tradicional con papas y pollo', tiempo: 20 },
            { nombre: 'Bandeja Paisa', categoria: 'Plato fuerte', precio: 12.00, descripcion: 'Plato típico completo', tiempo: 30 },
            { nombre: 'Picadillo de carne', categoria: 'Plato fuerte', precio: 9.50, descripcion: 'Carne molida con papas', tiempo: 18 },
            { nombre: 'Pechuga a la plancha', categoria: 'Plato fuerte', precio: 10.00, descripcion: 'Pechuga con ensalada y papas', tiempo: 15 },
            { nombre: 'Filete de pescado', categoria: 'Plato fuerte', precio: 11.00, descripcion: 'Pescado fresco con limón y arroz', tiempo: 18 },
            { nombre: 'Cerveza (350ml)', categoria: 'Bebida', precio: 3.00, descripcion: 'Cerveza fría', tiempo: 2 },
            { nombre: 'Gaseosa (330ml)', categoria: 'Bebida', precio: 1.50, descripcion: 'Refresco variedad', tiempo: 2 },
            { nombre: 'Jugo natural', categoria: 'Bebida', precio: 2.50, descripcion: 'Jugo fresco de frutas', tiempo: 5 },
            { nombre: 'Tinto (Café)', categoria: 'Bebida', precio: 1.00, descripcion: 'Café negro pequeño', tiempo: 3 },
            { nombre: 'Agua mineral', categoria: 'Bebida', precio: 1.00, descripcion: 'Botella de agua', tiempo: 2 },
            { nombre: 'Flan', categoria: 'Postre', precio: 3.00, descripcion: 'Flan casero con caramelo', tiempo: 5 },
            { nombre: 'Helado (bola)', categoria: 'Postre', precio: 2.50, descripcion: 'Una bola de helado', tiempo: 3 },
            { nombre: 'Torta de chocolate', categoria: 'Postre', precio: 3.50, descripcion: 'Porción de torta casera', tiempo: 5 }
        ];

        for (const item of menuItems) {
            const id = uuidv4();
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO menu_items (id, nombre, descripcion, categoria, precio, tiempo_preparacion_min, disponible)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [id, item.nombre, item.descripcion, item.categoria, item.precio, item.tiempo],
                    (err) => {
                        if (err) {
                            console.error('Error item menú:', err.message);
                        }
                        resolve();
                    }
                );
            });
        }

        console.log(`✓ ${menuItems.length} items creados\n`);

        // ============= INSERTAR USUARIOS =============
        console.log('👥 Creando usuarios...');

        const usuarios = [
            { nombre: 'Carlos', email: 'carlos@restaurant.com', rol: 'mesero' },
            { nombre: 'María', email: 'maria@restaurant.com', rol: 'mesero' },
            { nombre: 'Juan', email: 'juan@restaurant.com', rol: 'cocinero' },
            { nombre: 'Pedro', email: 'pedro@restaurant.com', rol: 'cocinero' },
            { nombre: 'Rosa', email: 'rosa@restaurant.com', rol: 'facturero' },
            { nombre: 'Admin', email: 'admin@restaurant.com', rol: 'admin' }
        ];

        for (const user of usuarios) {
            const id = uuidv4();
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO usuarios (id, nombre, email, rol, activo) VALUES (?, ?, ?, ?, 1)',
                    [id, user.nombre, user.email, user.rol],
                    (err) => {
                        if (err) {
                            console.error('Error usuario:', err.message);
                        }
                        resolve();
                    }
                );
            });
        }

        console.log('✓ 6 usuarios creados\n');

        // ============= RESUMEN FINAL =============
        setTimeout(() => {
            db.all('SELECT COUNT(*) as count FROM mesas', (err, rows) => {
                if (err) {
                    console.error('Error contando mesas:', err);
                    process.exit(1);
                }

                const mesasCount = rows.count;

                db.all('SELECT COUNT(*) as count FROM menu_items', (err, rows2) => {
                    if (err) {
                        console.error('Error contando menu:', err);
                        process.exit(1);
                    }

                    const menuCount = rows2.count;

                    db.all('SELECT COUNT(*) as count FROM usuarios', (err, rows3) => {
                        if (err) {
                            console.error('Error contando usuarios:', err);
                            process.exit(1);
                        }

                        const usuariosCount = rows3.count;

                        console.log('\n' + '='.repeat(50));
                        console.log('✅ BASE DE DATOS INICIALIZADA');
                        console.log('='.repeat(50));
                        console.log(`📊 Mesas:      ${mesasCount} creadas`);
                        console.log(`🍽️  Menú:       ${menuCount} items`);
                        console.log(`👥 Usuarios:   ${usuariosCount} creados\n`);
                        console.log('🚀 Ahora ejecuta:\n   node server.js\n');

                        db.close();
                        process.exit(0);
                    });
                });
            });
        }, 500);

    } catch (error) {
        console.error('Error en insertData:', error);
        process.exit(1);
    }
};

// ============= EJECUTAR TODO =============
createTables()
    .then(() => insertData())
    .catch(err => {
        console.error('Error fatal:', err);
        process.exit(1);
    });
