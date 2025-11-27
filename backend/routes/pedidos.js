import express from 'express';
import { getAsync, allAsync, runAsync } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Función para actualizar estadísticas de tiempo
async function actualizarEstadisticasTiempo(menuItemId, tiempoReal) {
    const hoy = new Date().toISOString().split('T')[0];

    const existing = await getAsync(`
        SELECT * FROM item_time_stats 
        WHERE menu_item_id = $1 AND fecha = $2
    `, [menuItemId, hoy]);

    if (existing) {
        const nuevoTotal = existing.total_preparaciones + 1;
        const nuevoPromedio = Math.round(
            (existing.tiempo_promedio_minutos * existing.total_preparaciones + tiempoReal) / nuevoTotal
        );
        const nuevoMin = Math.min(existing.tiempo_minimo_minutos, tiempoReal);
        const nuevoMax = Math.max(existing.tiempo_maximo_minutos, tiempoReal);

        await runAsync(`
            UPDATE item_time_stats 
            SET total_preparaciones = $1,
                tiempo_promedio_minutos = $2,
                tiempo_minimo_minutos = $3,
                tiempo_maximo_minutos = $4
            WHERE menu_item_id = $5 AND fecha = $6::date
        `, [nuevoTotal, nuevoPromedio, nuevoMin, nuevoMax, menuItemId, hoy]);
    } else {
        await runAsync(`
            INSERT INTO item_time_stats 
            (menu_item_id, fecha, total_preparaciones, tiempo_promedio_minutos, tiempo_minimo_minutos, tiempo_maximo_minutos)
            VALUES ($1, $2::date, 1, $3, $4, $5)
        `, [menuItemId, hoy, tiempoReal, tiempoReal, tiempoReal]);
    }
}

// POST /api/pedidos - Crear nuevo pedido
router.post('/', async (req, res) => {
    try {
        const { mesa_numero, usuario_mesero_id, items, notas } = req.body;

        if (!mesa_numero || !items || items.length === 0) {
            return res.status(400).json({ error: 'Mesa e items requeridos' });
        }

        // Obtener nombre del mesero
        const mesero = await getAsync('SELECT nombre FROM usuarios WHERE id = $1', [usuario_mesero_id]);
        const nombreMesero = mesero ? mesero.nombre : 'Sin asignar';

        const pedido_id = uuidv4();
        let total = 0;

        items.forEach(item => {
            total += item.cantidad * item.precio_unitario;
        });

        const pedidoQuery = `
            INSERT INTO pedidos(id, mesa_numero, usuario_mesero_id, total, notas, estado)
            VALUES($1, $2, $3, $4, $5, 'nuevo')
        `;
        await runAsync(pedidoQuery, [pedido_id, mesa_numero, usuario_mesero_id, total, notas || null]);

        for (const item of items) {
            // ✅ OBTENER CONFIGURACIÓN DEL ITEM (Para saber si es directo)
            const menuItemData = await getAsync('SELECT es_directo, usa_inventario, stock_actual, stock_minimo, estado_inventario FROM menu_items WHERE id = $1', [item.menu_item_id]);

            // ✅ DETERMINAR ESTADO INICIAL
            const estadoInicial = menuItemData?.es_directo ? 'listo' : 'pendiente';
            // Si es directo, guardamos la hora de completado de una vez
            const completedAt = menuItemData?.es_directo ? 'CURRENT_TIMESTAMP' : 'NULL';

            for (let i = 0; i < item.cantidad; i++) {
                const item_id = uuidv4();

                // Insertar item con estado dinámico
                // Nota: Usamos concatenación segura o lógica condicional para CURRENT_TIMESTAMP
                if (menuItemData?.es_directo) {
                    await runAsync(
                        `INSERT INTO pedido_items(id, pedido_id, menu_item_id, cantidad, precio_unitario, notas, estado, completed_at) 
                         VALUES($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                        [item_id, pedido_id, item.menu_item_id, 1, item.precio_unitario, item.notas || null, 'listo']
                    );

                    // ✅ NOTIFICAR AL MESERO DE INMEDIATO
                    req.app.get('io').emit('item_ready', {
                        item_id: item_id,
                        pedido_id: pedido_id,
                        mesa_numero: mesa_numero,
                        item_nombre: item.nombre,
                        mesero_id: usuario_mesero_id,
                        cantidad: 1,
                        completed_at: new Date().toISOString(), // Para el timer del frontend
                        tiempoDesdeReady: 0
                    });

                } else {
                    await runAsync(
                        `INSERT INTO pedido_items(id, pedido_id, menu_item_id, cantidad, precio_unitario, notas, estado) 
                         VALUES($1, $2, $3, $4, $5, $6, $7)`,
                        [item_id, pedido_id, item.menu_item_id, 1, item.precio_unitario, item.notas || null, 'pendiente']
                    );
                }
            }

            // Lógica de Inventario (sin cambios, solo usando menuItemData ya consultado)
            if (menuItemData && menuItemData.usa_inventario) {
                const nuevoStock = (menuItemData.stock_actual || 0) - item.cantidad;
                let nuevoEstado = menuItemData.estado_inventario;

                if (nuevoStock <= 0) {
                    nuevoEstado = 'no_disponible';
                } else if (nuevoStock <= menuItemData.stock_minimo) {
                    nuevoEstado = 'poco_stock';
                }

                await runAsync(`
                    UPDATE menu_items 
                    SET stock_actual = $1, estado_inventario = $2
                    WHERE id = $3
                `, [Math.max(0, nuevoStock), nuevoEstado, item.menu_item_id]);
            }
        }

        const nuevoPedido = {
            id: pedido_id,
            mesa_numero,
            usuario_mesero_id,
            mesero: nombreMesero,
            total,
            estado: 'nuevo',
            items_count: items.length,
            items: items,
            created_at: new Date()
        };

        req.app.get('io').emit('nuevo_pedido', nuevoPedido);

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
router.get('/activos', async (req, res) => {
    try {
        // 1. Obtener pedidos
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
                u.nombre as mesero,
                COUNT(pi.id) as items_count
            FROM pedidos p
            LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
            LEFT JOIN usuarios u ON p.usuario_mesero_id = u.id
            WHERE p.estado IN('nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja')
            GROUP BY p.id, u.nombre
            ORDER BY p.created_at ASC
        `;

        const pedidos = await allAsync(query);

        // 2. Obtener items y calcular tiempos para CADA pedido
        for (let pedido of pedidos) {
            const itemsQuery = `
                SELECT 
                    pi.id, pi.menu_item_id, mi.nombre, pi.cantidad, 
                    pi.precio_unitario, pi.estado, pi.notas, 
                    pi.started_at, pi.completed_at
                FROM pedido_items pi
                JOIN menu_items mi ON pi.menu_item_id = mi.id
                WHERE pi.pedido_id = $1
            `;
            const items = await allAsync(itemsQuery, [pedido.id]);

            // ✅ AQUÍ ESTÁ LA MAGIA: Calcular tiempo en el backend (UTC safe)
            pedido.items = items.map(item => {
                let tiempoDesdeReady = null;

                if (item.estado === 'listo' && item.completed_at) {
                    // Calcular diferencia en minutos
                    const completedTime = new Date(item.completed_at).getTime();
                    const now = Date.now(); // Node.js en UTC (gracias al process.env.TZ)
                    tiempoDesdeReady = Math.floor((now - completedTime) / 60000);
                }

                return {
                    ...item,
                    tiempoDesdeReady // Enviamos el número calculado
                };
            });
        }

        res.json(pedidos);
    } catch (error) {
        console.error('Error en /activos:', error);
        res.status(500).json({ error: error.message });
    }
});



// GET /api/pedidos/:id - Obtener pedido específico
router.get('/:id', async (req, res) => {
    try {
        const pedido = await getAsync(`
            SELECT p.*, u.nombre as mesero
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_mesero_id = u.id
            WHERE p.id = $1
            `, [req.params.id]);

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const items = await allAsync(`
            SELECT pi.id, pi.menu_item_id, mi.nombre, pi.cantidad, pi.precio_unitario, pi.estado, pi.notas
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            WHERE pi.pedido_id = $1
            `, [req.params.id]);

        let metodo_pago = null;
        if (pedido.estado === 'pagado') {
            const transaccion = await getAsync(`
                SELECT metodo_pago FROM transacciones WHERE pedido_id = $1 LIMIT 1
            `, [req.params.id]);
            if (transaccion) {
                metodo_pago = transaccion.metodo_pago;
            }
        }

        res.json({ ...pedido, items, metodo_pago });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/pedidos/:id/estado - Actualizar estado del pedido
router.put('/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;

        const estadosValidos = ['nuevo', 'en_cocina', 'listo', 'servido', 'listo_pagar', 'en_caja', 'pagado', 'cancelado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

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

        req.app.get('io').emit('pedido_actualizado', { id: req.params.id, estado });

        res.json({ message: '✓ Pedido actualizado', estado });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/pedido-items/:id/start - Iniciar preparación de un item
router.put('/items/:id/start', async (req, res) => {
    try {
        const itemId = req.params.id;

        // ✅ CAMBIO: Usa CURRENT_TIMESTAMP de PostgreSQL
        await runAsync(`
            UPDATE pedido_items 
            SET started_at = CURRENT_TIMESTAMP, estado = 'en_preparacion'
            WHERE id = $1
            `, [itemId]);

        const item = await getAsync(`
            SELECT pi.*, mi.nombre, p.mesa_numero, p.usuario_mesero_id
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            JOIN pedidos p ON pi.pedido_id = p.id
            WHERE pi.id = $1
            `, [itemId]);

        if (item) {
            req.app.get('io').emit('item_started', {
                item_id: item.id,
                pedido_id: item.pedido_id,
                mesa_numero: item.mesa_numero,
                item_nombre: item.nombre
            });

            req.app.get('io').emit('pedido_actualizado', {
                id: item.pedido_id,
                estado: 'en_cocina'
            });
        }

        res.json({ message: '✓ Item iniciado', item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/items/:id/complete', async (req, res) => {
    try {
        const itemId = req.params.id;

        const item = await getAsync(`
            SELECT pi.*, mi.nombre, p.mesa_numero, p.usuario_mesero_id
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            JOIN pedidos p ON pi.pedido_id = p.id
            WHERE pi.id = $1
            `, [itemId]);

        if (!item) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        let tiempoReal = null;
        if (item.started_at) {
            const startTime = new Date(item.started_at).getTime();
            tiempoReal = Math.round((Date.now() - startTime) / 60000);
        }

        // ✅ NUEVO: Calcular tiempo transcurrido desde que está listo
        const tiempoDesdeReady = 0; // Empezará en 0, se incrementará en el frontend

        await runAsync(`
            UPDATE pedido_items 
            SET completed_at = CURRENT_TIMESTAMP, estado = 'listo', tiempo_real = $1
            WHERE id = $2
            `, [tiempoReal, itemId]);

        if (tiempoReal !== null && item.menu_item_id) {
            await actualizarEstadisticasTiempo(item.menu_item_id, tiempoReal);
        }

        const allItems = await allAsync(`
            SELECT estado FROM pedido_items WHERE pedido_id = $1
            `, [item.pedido_id]);

        const todosListos = allItems.every(i => i.estado === 'listo' || i.estado === 'servido');

        if (todosListos) {
            await runAsync(`
                UPDATE pedidos SET estado = 'listo' WHERE id = $1
            `, [item.pedido_id]);

            req.app.get('io').emit('pedido_actualizado', {
                id: item.pedido_id,
                estado: 'listo'
            });
        }

        // ✅ MODIFICADO: Enviar tiempo transcurrido desde el backend
        req.app.get('io').emit('item_ready', {
            item_id: itemId,
            pedido_id: item.pedido_id,
            mesa_numero: item.mesa_numero,
            item_nombre: item.nombre,
            mesero_id: item.usuario_mesero_id,
            cantidad: item.cantidad,
            completed_at: new Date().toISOString(), // Timestamp ISO
            tiempoDesdeReady: 0 // Inicialmente 0 minutos
        });

        res.json({ message: '✓ Item completado', item });
    } catch (error) {
        console.error('Error en /items/:id/complete:', error);
        res.status(500).json({ error: error.message });
    }
});



// PUT /api/pedido-items/:id/serve - Marcar item como servido
router.put('/items/:id/serve', async (req, res) => {
    try {
        const itemId = req.params.id;

        // ✅ CAMBIO: Usa CURRENT_TIMESTAMP
        await runAsync(`
            UPDATE pedido_items 
            SET served_at = CURRENT_TIMESTAMP, estado = 'servido'
            WHERE id = $1
            `, [itemId]);

        const item = await getAsync(`
            SELECT pedido_id FROM pedido_items WHERE id = $1
            `, [itemId]);

        // Verificar si todos los items están servidos
        const allItems = await allAsync(`
            SELECT estado FROM pedido_items WHERE pedido_id = $1
            `, [item.pedido_id]);

        const todosServidos = allItems.every(i => i.estado === 'servido');

        if (todosServidos) {
            // ✅ CAMBIO: Usa CURRENT_TIMESTAMP aquí también
            await runAsync(`
                UPDATE pedidos SET estado = 'servido', delivered_at = CURRENT_TIMESTAMP WHERE id = $1
            `, [item.pedido_id]);

            req.app.get('io').emit('pedido_actualizado', {
                id: item.pedido_id,
                estado: 'servido'
            });
        }

        req.app.get('io').emit('item_served', {
            item_id: itemId,
            pedido_id: item.pedido_id
        });

        res.json({ message: '✓ Item servido' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// GET /api/pedidos/:id/status-publico
router.get('/:id/status-publico', async (req, res) => {
    try {
        const pedido = await getAsync(`
            SELECT p.*, u.nombre as mesero
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_mesero_id = u.id
            WHERE p.id = $1
            `, [req.params.id]);

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const items = await allAsync(`
            SELECT
                pi.id,
                pi.cantidad,
                pi.estado,
                pi.started_at,
                pi.completed_at,
                pi.tiempo_real,
                mi.nombre,
                mi.tiempo_estimado
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            WHERE pi.pedido_id = $1
            ORDER BY pi.id
            `, [req.params.id]);

        const totalItems = items.length;
        const itemsServidos = items.filter(i => i.estado === 'servido').length;
        const itemsListos = items.filter(i => i.estado === 'listo').length;
        const itemsEnPreparacion = items.filter(i => i.estado === 'en_preparacion').length;

        const progreso = totalItems > 0 ? Math.round(((itemsServidos + itemsListos) / totalItems) * 100) : 0;

        // ✅ LÓGICA MEJORADA DEL TIMER
        let tiempoTranscurrido = 0;
        if (pedido.started_at) {
            const inicio = new Date(pedido.started_at);
            // Si el pedido tiene fecha de entrega (servido), usamos esa. Si no, usamos ahora.
            // Nota: Asegúrate de que 'delivered_at' o 'completed_at' se guarde cuando marcas como servido/pagado.
            // Si usas 'delivered_at' en tu tabla, cámbialo aquí. Si usas 'completed_at', usa ese.
            // Asumiré que cuando está servido ya tienes una fecha final, o si el estado es 'servido'/'pagado' usamos la fecha de ese momento si la tienes, o 'ahora' si no ha terminado.

            let fin = new Date(); // Por defecto ahora

            // Si ya finalizó (servido, pagado, etc), intentamos usar la fecha real de fin
            if (['servido', 'listo_pagar', 'en_caja', 'pagado'].includes(pedido.estado)) {
                if (pedido.delivered_at) fin = new Date(pedido.delivered_at);
                else if (pedido.completed_at) fin = new Date(pedido.completed_at);
                // Si no hay fecha guardada, el timer seguirá corriendo hasta que se guarde una fecha en BD
            }

            tiempoTranscurrido = Math.floor((fin - inicio) / 60000);
        }

        console.log('🕐 DEBUG Backend:', {
            started_at: pedido.started_at,
            estado: pedido.estado,
            tiempoTranscurrido: tiempoTranscurrido
        });

        const pedidoConTiempo = {
            ...pedido,
            tiempoTranscurrido
        };

        res.json({
            pedido: pedidoConTiempo,
            items: items.map(item => ({
                ...item,
                tiempoTranscurrido: item.started_at
                    ? Math.floor((new Date() - new Date(item.started_at)) / 60000)
                    : 0
            })),
            estadisticas: {
                total_items: totalItems,
                servidos: itemsServidos,
                listos: itemsListos,
                en_preparacion: itemsEnPreparacion,
                pendientes: totalItems - itemsServidos - itemsListos - itemsEnPreparacion,
                progreso_porcentaje: progreso
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});


export default router;
