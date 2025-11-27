import express from 'express';
import { getAsync, allAsync, runAsync } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/menu - Obtener todos los items del menú
router.get('/', async (req, res) => {
    try {
        const items = await allAsync(`
            SELECT * FROM menu_items ORDER BY categoria, nombre
        `);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/menu - Crear nuevo item del menú
router.post('/', async (req, res) => {
    try {
        const { nombre, categoria, precio, tiempo_estimado, disponible, descripcion, usa_inventario, stock_actual, stock_minimo, estado_inventario, es_directo } = req.body;

        if (!nombre || !categoria || !precio) {
            return res.status(400).json({ error: 'Nombre, categoría y precio son requeridos' });
        }

        const id = uuidv4();
        const query = `
            INSERT INTO menu_items(
                id, nombre, categoria, precio, tiempo_estimado, disponible, descripcion,
                usa_inventario, stock_actual, stock_minimo, estado_inventario, es_directo
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;

        await runAsync(query, [
            id,
            nombre,
            categoria,
            precio,
            tiempo_estimado || 15,
            disponible !== false,
            descripcion || null,
            usa_inventario || false,
            stock_actual || null,
            stock_minimo || null,
            estado_inventario || 'disponible',
            es_directo || false // ✅ Nuevo campo
        ]);

        res.json({
            id,
            nombre,
            categoria,
            precio,
            tiempo_estimado: tiempo_estimado || 15,
            disponible: disponible !== false,
            descripcion,
            usa_inventario: usa_inventario || false,
            stock_actual,
            stock_minimo,
            estado_inventario: estado_inventario || 'disponible',
            es_directo: es_directo || false,
            message: '✓ Item agregado'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/menu/:id - Actualizar item del menú
router.put('/:id', async (req, res) => {
    try {
        const { nombre, categoria, precio, tiempo_estimado, disponible, descripcion, usa_inventario, stock_actual, stock_minimo, estado_inventario, es_directo } = req.body;

        const query = `
            UPDATE menu_items 
            SET nombre = $1, categoria = $2, precio = $3, tiempo_estimado = $4, 
                disponible = $5, descripcion = $6, usa_inventario = $7, 
                stock_actual = $8, stock_minimo = $9, estado_inventario = $10, es_directo = $11
            WHERE id = $12
        `;

        await runAsync(query, [
            nombre,
            categoria,
            precio,
            tiempo_estimado,
            disponible,
            descripcion,
            usa_inventario,
            stock_actual,
            stock_minimo,
            estado_inventario,
            es_directo || false, // ✅ Nuevo campo
            req.params.id
        ]);

        res.json({ message: '✓ Item actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// DELETE /api/menu/:id - Eliminar item del menú
router.delete('/:id', async (req, res) => {
    try {
        await runAsync('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
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
