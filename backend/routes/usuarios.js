import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { allAsync, runAsync, getAsync } from '../config/db.js';

const router = express.Router();

// GET /api/users - Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const users = await allAsync('SELECT id, username, nombre, rol FROM usuarios ORDER BY nombre');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users - Crear nuevo usuario
router.post('/', async (req, res) => {
    try {
        const { username, password, nombre, rol } = req.body;

        if (!username || !password || !nombre || !rol) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        await runAsync(
            'INSERT INTO usuarios(id, username, password, nombre, rol) VALUES($1, $2, $3, $4, $5)',
            [id, username, hashedPassword, nombre, rol]
        );

        res.json({
            id,
            username,
            nombre,
            rol,
            message: '✓ Usuario creado'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Verificar dependencias
        const pedidos = await getAsync('SELECT count(*) as count FROM pedidos WHERE usuario_mesero_id = $1', [userId]);
        if (pedidos && Number(pedidos.count) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar: El usuario tiene pedidos asociados.' });
        }

        const transacciones = await getAsync('SELECT count(*) as count FROM transacciones WHERE usuario_facturero_id = $1', [userId]);
        if (transacciones && Number(transacciones.count) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar: El usuario tiene transacciones asociadas.' });
        }

        await runAsync('DELETE FROM usuarios WHERE id = $1', [userId]);
        res.json({ message: '✓ Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id/language - Update user language preference
router.put('/:id/language', async (req, res) => {
    try {
        const { language } = req.body;
        const userId = req.params.id;

        if (!language || !['es', 'en'].includes(language)) {
            return res.status(400).json({ error: 'Invalid language. Must be "es" or "en"' });
        }

        await pool.query(
            'UPDATE usuarios SET language = $1 WHERE id = $2',
            [language, userId]
        );

        console.log(`✅ Updated language for user ${userId}: ${language}`);
        res.json({ success: true, language });
    } catch (error) {
        console.error('Error updating language:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
