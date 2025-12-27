import express from 'express';
import { getAsync, allAsync, runAsync } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { getFromCache, setCache, clearCache } from '../utils/cache.js'; // ✅ NUEVO

const router = express.Router();

// GET /api/menu - Obtener todos los items del menú
router.get('/', async (req, res) => {
    try {
        // ✅ Check cache (5 min TTL)
        const cached = getFromCache('menu_items', 300000);
        if (cached) {
            return res.json(cached);
        }

        // ✅ COALESCE para manejar ambas columnas de tiempo
        const items = await allAsync(`
            SELECT id, nombre, categoria, precio, 
                   COALESCE(tiempo_estimado, tiempo_preparacion_min, 15) as tiempo_estimado, 
                   disponible, descripcion, usa_inventario, stock_actual, stock_minimo,
                   estado_inventario, es_directo, 
                   COALESCE(NULLIF(image_url, ''), imagen_url) as image_url
            FROM menu_items 
            WHERE disponible = true
            ORDER BY categoria, nombre
        `);

        // ✅ Cache result
        setCache('menu_items', items);

        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/menu - Crear nuevo item del menú
router.post('/', async (req, res) => {
    try {
        const { nombre, categoria, precio, tiempo_estimado, disponible, descripcion, usa_inventario, stock_actual, stock_minimo, estado_inventario, es_directo, image_url } = req.body;

        if (!nombre || !categoria || !precio) {
            return res.status(400).json({ error: 'Nombre, categoría y precio son requeridos' });
        }

        const id = uuidv4();
        // Insertamos en AMBAS columnas para evitar inconsistencias
        const query = `
            INSERT INTO menu_items(
                id, nombre, categoria, precio, tiempo_estimado, tiempo_preparacion_min, disponible, descripcion,
                usa_inventario, stock_actual, stock_minimo, estado_inventario, es_directo, image_url
            )
        VALUES($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;

        await runAsync(query, [
            id,
            nombre,
            categoria,
            precio,
            tiempo_estimado || 15, // Se usa para ambas columnas ($5)
            disponible !== false,
            descripcion || null,
            usa_inventario || false,
            stock_actual || null,
            stock_minimo || null,
            estado_inventario || 'disponible',
            es_directo || false,
            image_url || null
        ]);

        // 🧹 Limpiar caché para refrescar menú
        clearCache('menu_items');

        res.json({ message: '✓ Item agregado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/menu/:id - Actualizar item del menú
// PUT /api/menu/:id - Actualizar item del menú (Parcial o Completo)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        // Mapeo seguro de campos permitidos
        // frontend_field -> db_column
        const fieldMap = {
            'nombre': 'nombre',
            'categoria': 'categoria',
            'precio': 'precio',
            'tiempo_estimado': 'tiempo_estimado', // Prioridad
            'disponible': 'disponible',
            'descripcion': 'descripcion',
            'usa_inventario': 'usa_inventario',
            'stock_actual': 'stock_actual',
            'stock_minimo': 'stock_minimo',
            'estado_inventario': 'estado_inventario',
            'es_directo': 'es_directo',
            'image_url': 'image_url'
        };

        const allowedKeys = Object.keys(fieldMap);
        const keysToUpdate = Object.keys(updates).filter(k => allowedKeys.includes(k));

        if (keysToUpdate.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos válidos' });
        }

        // Construir query dinámica: SET db_col=$1, db_col2=$2 ...
        let setClause = keysToUpdate.map((k, i) => `${fieldMap[k]} = $${i + 1}`).join(', ');
        const values = keysToUpdate.map(k => updates[k]);

        // Hack: Si viene tiempo_estimado, agregamos tiempo_preparacion_min a la query manualmente
        if (updates.tiempo_estimado) {
            setClause += `, tiempo_preparacion_min = $${values.length + 1}`;
            values.push(updates.tiempo_estimado); // Valor duplicado
        }

        // Agregar ID al final de los valores
        values.push(id);

        const query = `UPDATE menu_items SET ${setClause} WHERE id = $${values.length}`;

        await runAsync(query, values);

        // 🧹 Limpiar caché
        clearCache('menu_items');

        res.json({ message: '✓ Item actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// DELETE /api/menu/:id - Eliminar item del menú
router.delete('/:id', async (req, res) => {
    try {
        await runAsync('DELETE FROM menu_items WHERE id = $1', [req.params.id]);

        // 🧹 Limpiar caché
        clearCache('menu_items');

        res.json({ message: '✓ Item eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/menu/:id/inventario - Actualizar solo inventario
router.put('/:id/inventario', async (req, res) => {
    try {
        const { usa_inventario, stock_actual, stock_minimo, estado_inventario } = req.body;

        await runAsync(`
            UPDATE menu_items 
            SET usa_inventario = $1, stock_actual = $2, stock_minimo = $3, estado_inventario = $4
            WHERE id = $5
            `, [usa_inventario, stock_actual, stock_minimo, estado_inventario, req.params.id]);

        res.json({ message: '✓ Inventario actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/menu/:id/ajustar-stock - Ajustar stock manualmente
router.post('/:id/ajustar-stock', async (req, res) => {
    try {
        const { ajuste } = req.body;

        if (typeof ajuste !== 'number') {
            return res.status(400).json({ error: 'El ajuste debe ser un número' });
        }

        const item = await getAsync('SELECT * FROM menu_items WHERE id = $1', [req.params.id]);

        if (!item) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        if (!item.usa_inventario) {
            return res.status(400).json({ error: 'Este item no usa control de inventario' });
        }

        const nuevoStock = (item.stock_actual || 0) + ajuste;

        if (nuevoStock < 0) {
            return res.status(400).json({ error: 'El stock no puede ser negativo' });
        }

        let nuevoEstado = item.estado_inventario;

        if (nuevoStock === 0) {
            nuevoEstado = 'no_disponible';
        } else if (nuevoStock <= item.stock_minimo) {
            nuevoEstado = 'poco_stock';
        } else if (item.estado_inventario === 'no_disponible' && nuevoStock > 0) {
            nuevoEstado = 'disponible';
        } else if (item.estado_inventario === 'poco_stock' && nuevoStock > item.stock_minimo) {
            nuevoEstado = 'disponible';
        }

        await runAsync(`
            UPDATE menu_items 
            SET stock_actual = $1, estado_inventario = $2
            WHERE id = $3
            `, [nuevoStock, nuevoEstado, req.params.id]);

        res.json({
            message: '✓ Stock ajustado',
            stock_actual: nuevoStock,
            estado_inventario: nuevoEstado
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
