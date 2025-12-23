import express from 'express';
import { getAsync, allAsync, runAsync } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Función para actualizar estadísticas de tiempo
async function actualizarEstadisticasTiempo(menuItemId, tiempoReal) {
    const TIMEZONE = process.env.TIMEZONE || 'America/Bogota';
    // Usar fecha de la BD para consistencia
    const localDateExpr = `(now() AT TIME ZONE '${TIMEZONE}')::date`;

    const existing = await getAsync(`
        SELECT * FROM item_time_stats 
        WHERE menu_item_id = $1 AND fecha = ${localDateExpr}
    `, [menuItemId]);

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
            WHERE menu_item_id = $5 AND fecha = ${localDateExpr}
        `, [nuevoTotal, nuevoPromedio, nuevoMin, nuevoMax, menuItemId]);
    } else {
        await runAsync(`
            INSERT INTO item_time_stats 
            (menu_item_id, fecha, total_preparaciones, tiempo_promedio_minutos, tiempo_minimo_minutos, tiempo_maximo_minutos)
            VALUES ($1, ${localDateExpr}, 1, $2, $3, $4)
        `, [menuItemId, tiempoReal, tiempoReal, tiempoReal]);
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

        // ✅ NUEVO: Calcular subtotal y propina
        let subtotal = 0;
        items.forEach(item => {
            subtotal += item.cantidad * item.precio_unitario;
        });

        // Obtener porcentaje de propina de configuración (default 10%)
        const configPropina = await getAsync('SELECT valor FROM configuracion WHERE clave = $1', ['porcentaje_propina']);
        const porcentajePropina = parseFloat(configPropina?.valor || 10);

        const propinaSugerida = Math.round(subtotal * (porcentajePropina / 100));
        const total = subtotal + propinaSugerida;

        const pedidoQuery = `
            INSERT INTO pedidos(id, mesa_numero, usuario_mesero_id, subtotal, propina_monto, total, notas, estado)
            VALUES($1, $2, $3, $4, $5, $6, $7, 'nuevo')
        `;
        await runAsync(pedidoQuery, [pedido_id, mesa_numero, usuario_mesero_id, subtotal, propinaSugerida, total, notas || null]);

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
        // 1. Obtener pedidos con información de pagos
        const query = `
            SELECT 
                p.id,
                p.mesa_numero,
                p.usuario_mesero_id,
                p.estado,
                p.total,
                p.subtotal,
                p.propina_monto,
                p.notas,
                p.created_at,
                p.started_at,
                p.completed_at,
                u.nombre as mesero,
                COUNT(pi.id) as items_count,
                (SELECT COALESCE(SUM(t.monto), 0) 
                 FROM transacciones t 
                 WHERE t.pedido_id = p.id) as total_pagado
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

            // ✅ NUEVO: Calcular pendiente
            const total_pagado = parseFloat(pedido.total_pagado) || 0;
            const total = parseFloat(pedido.total) || 0;
            pedido.pendiente = Math.max(total - total_pagado, 0);
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

        // Obtener historial de pagos (transacciones)
        const pagos = await allAsync(`
            SELECT id, monto, metodo_pago, created_at
            FROM transacciones 
            WHERE pedido_id = $1
            ORDER BY created_at ASC
        `, [req.params.id]);

        // Calcular total pagado real
        const total_pagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

        // Calcular pendiente
        const pendiente = Math.max(parseFloat(pedido.total) - total_pagado, 0);

        res.json({ ...pedido, items, pagos, total_pagado, pendiente });
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
        mi.tiempo_estimado,
        mi.precio AS precio_unitario       -- ✅ AÑADIDO
      FROM pedido_items pi
      JOIN menu_items mi ON pi.menu_item_id = mi.id
      WHERE pi.pedido_id = $1
      ORDER BY pi.id
    `, [req.params.id]);

        const totalItems = items.length;
        const itemsServidos = items.filter(i => i.estado === 'servido').length;
        const itemsListos = items.filter(i => i.estado === 'listo').length;
        const itemsEnPreparacion = items.filter(i => i.estado === 'en_preparacion').length;

        const progreso = totalItems > 0
            ? Math.round(((itemsServidos + itemsListos) / totalItems) * 100)
            : 0;

        let tiempoTranscurrido = 0;
        if (pedido.started_at) {
            const inicio = new Date(pedido.started_at);
            let fin = new Date();
            if (['servido', 'listo_pagar', 'en_caja', 'pagado'].includes(pedido.estado)) {
                if (pedido.delivered_at) fin = new Date(pedido.delivered_at);
                else if (pedido.completed_at) fin = new Date(pedido.completed_at);
            }
            tiempoTranscurrido = Math.floor((fin - inicio) / 60000);
        }

        const pedidoConTiempo = { ...pedido, tiempoTranscurrido };

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


// ============= EDICIÓN DE PEDIDOS =============

// POST /api/pedidos/:id/items - Agregar items a pedido existente
router.post('/:id/items', async (req, res) => {
    try {
        const pedidoId = req.params.id;
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Se requieren items para agregar' });
        }

        // Verificar que el pedido existe y no está en estado final
        const pedido = await getAsync('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        if (['pagado', 'cancelado'].includes(pedido.estado)) {
            return res.status(400).json({ error: 'No se puede editar un pedido pagado o cancelado' });
        }

        let totalAdicional = 0;
        const nuevosItems = [];

        for (const item of items) {
            const menuItemData = await getAsync(
                'SELECT id, nombre, es_directo, usa_inventario, stock_actual, stock_minimo, estado_inventario FROM menu_items WHERE id = $1',
                [item.menu_item_id]
            );

            if (!menuItemData) {
                return res.status(400).json({ error: `Item de menú ${item.menu_item_id} no encontrado` });
            }

            // Verificar inventario
            if (menuItemData.usa_inventario && menuItemData.stock_actual < item.cantidad) {
                return res.status(400).json({
                    error: `Stock insuficiente para ${menuItemData.nombre}. Disponible: ${menuItemData.stock_actual}`
                });
            }

            const estadoInicial = menuItemData.es_directo ? 'listo' : 'pendiente';

            // Crear items individuales (como en la creación original)
            for (let i = 0; i < item.cantidad; i++) {
                const item_id = uuidv4();

                if (menuItemData.es_directo) {
                    await runAsync(
                        `INSERT INTO pedido_items(id, pedido_id, menu_item_id, cantidad, precio_unitario, notas, estado, completed_at) 
                         VALUES($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                        [item_id, pedidoId, item.menu_item_id, 1, item.precio_unitario, item.notas || null, 'listo']
                    );

                    req.app.get('io').emit('item_ready', {
                        item_id: item_id,
                        pedido_id: pedidoId,
                        mesa_numero: pedido.mesa_numero,
                        item_nombre: menuItemData.nombre,
                        mesero_id: pedido.usuario_mesero_id,
                        cantidad: 1,
                        completed_at: new Date().toISOString(),
                        tiempoDesdeReady: 0
                    });
                } else {
                    await runAsync(
                        `INSERT INTO pedido_items(id, pedido_id, menu_item_id, cantidad, precio_unitario, notas, estado) 
                         VALUES($1, $2, $3, $4, $5, $6, $7)`,
                        [item_id, pedidoId, item.menu_item_id, 1, item.precio_unitario, item.notas || null, 'pendiente']
                    );
                }

                nuevosItems.push({
                    id: item_id,
                    nombre: menuItemData.nombre,
                    cantidad: 1,
                    precio_unitario: item.precio_unitario,
                    estado: estadoInicial
                });
            }

            totalAdicional += item.cantidad * item.precio_unitario;

            // Actualizar inventario si aplica
            if (menuItemData.usa_inventario) {
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

        // ✅ ACTUALIZAR: Recalcular subtotal y propina
        const nuevoSubtotal = parseFloat(pedido.subtotal || pedido.total) + totalAdicional;

        // Obtener porcentaje de propina
        const configPropina = await getAsync('SELECT valor FROM configuracion WHERE clave = $1', ['porcentaje_propina']);
        const porcentajePropina = parseFloat(configPropina?.valor || 10);

        const nuevaPropina = Math.round(nuevoSubtotal * (porcentajePropina / 100));
        const nuevoTotal = nuevoSubtotal + nuevaPropina;

        // Si el pedido estaba en estado final (servido/listo), volver a en_cocina
        // para que los nuevos items aparezcan en los paneles activos
        let nuevoEstadoPedido = pedido.estado;
        if (['servido', 'listo', 'listo_pagar'].includes(pedido.estado)) {
            nuevoEstadoPedido = 'en_cocina';
            await runAsync('UPDATE pedidos SET subtotal = $1, propina_monto = $2, total = $3, estado = $4 WHERE id = $5',
                [nuevoSubtotal, nuevaPropina, nuevoTotal, nuevoEstadoPedido, pedidoId]);
            console.log(`📋 Pedido ${pedidoId}: Estado cambiado de "${pedido.estado}" a "en_cocina" por nuevos items`);
        } else {
            await runAsync('UPDATE pedidos SET subtotal = $1, propina_monto = $2, total = $3 WHERE id = $4',
                [nuevoSubtotal, nuevaPropina, nuevoTotal, pedidoId]);
        }

        // Emitir evento de pedido editado
        req.app.get('io').emit('pedido_editado', {
            id: pedidoId,
            accion: 'items_agregados',
            items: nuevosItems,
            nuevoTotal: nuevoTotal,
            nuevoEstado: nuevoEstadoPedido
        });

        // También emitir nuevo_pedido para que cocina vea los nuevos items
        req.app.get('io').emit('pedido_actualizado', {
            id: pedidoId,
            estado: nuevoEstadoPedido
        });

        res.json({
            message: '✓ Items agregados al pedido',
            items: nuevosItems,
            nuevoTotal: nuevoTotal
        });

    } catch (error) {
        console.error('Error agregando items:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/pedidos/:id/items/:itemId - Eliminar item del pedido
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const { id: pedidoId, itemId } = req.params;
        const { confirmar } = req.query;

        // Obtener el item con información del menú
        const item = await getAsync(`
            SELECT pi.*, mi.nombre, mi.usa_inventario, mi.stock_actual, mi.stock_minimo
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            WHERE pi.id = $1 AND pi.pedido_id = $2
        `, [itemId, pedidoId]);

        if (!item) {
            return res.status(404).json({ error: 'Item no encontrado en este pedido' });
        }

        // 2) Servido: solo permitir con confirmación fuerte
        if (item.estado === 'servido' && confirmar !== 'true') {
            return res.status(409).json({
                error: 'Este item ya fue servido al cliente.',
                requiereConfirmacion: true,
                estado: item.estado,
                mensaje: `¿Estás seguro de eliminar "${item.nombre}"? Ya fue servido.`
            });
        }

        // 3) Listo: también requiere confirmación
        if (item.estado === 'listo' && confirmar !== 'true') {
            return res.status(409).json({
                error: 'Este item ya fue preparado.',
                requiereConfirmacion: true,
                estado: item.estado,
                mensaje: `¿Estás seguro de eliminar "${item.nombre}"? Ya está listo en cocina.`
            });
        }

        if (item.estado === 'en_preparacion' && confirmar !== 'true') {
            return res.status(409).json({
                error: 'Este item ya está en preparación. Eliminarlo causará desperdicio.',
                requiereConfirmacion: true,
                estado: item.estado,
                mensaje: `¿Estás seguro de eliminar "${item.nombre}"? Ya está siendo preparado.`
            });
        }

        // Eliminar el item
        await runAsync('DELETE FROM pedido_items WHERE id = $1', [itemId]);

        // Devolver stock si usa inventario y está pendiente (no en_preparacion porque ya usó ingredientes)
        if (item.usa_inventario && item.estado === 'pendiente') {
            const nuevoStock = (item.stock_actual || 0) + item.cantidad;
            let nuevoEstado = 'disponible';
            if (nuevoStock <= item.stock_minimo) {
                nuevoEstado = 'poco_stock';
            }

            await runAsync(`
                UPDATE menu_items 
                SET stock_actual = $1, estado_inventario = $2
                WHERE id = $3
            `, [nuevoStock, nuevoEstado, item.menu_item_id]);
        }

        // Recalcular total del pedido
        const result = await getAsync(`
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0) as nuevo_total
            FROM pedido_items WHERE pedido_id = $1
        `, [pedidoId]);

        const nuevoTotal = parseFloat(result.nuevo_total);
        await runAsync('UPDATE pedidos SET total = $1 WHERE id = $2', [nuevoTotal, pedidoId]);

        // Emitir eventos
        req.app.get('io').emit('pedido_editado', {
            id: pedidoId,
            accion: 'item_eliminado',
            itemId: itemId,
            itemNombre: item.nombre,
            nuevoTotal: nuevoTotal
        });

        req.app.get('io').emit('pedido_actualizado', {
            id: pedidoId,
            estado: 'en_cocina' // Para que cocina recargue
        });

        res.json({
            message: `✓ Item "${item.nombre}" eliminado del pedido`,
            nuevoTotal: nuevoTotal
        });

    } catch (error) {
        console.error('Error eliminando item:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/pedidos/:id/items/:itemId/cantidad - Modificar cantidad de un item
router.put('/:id/items/:itemId/cantidad', async (req, res) => {
    try {
        const { id: pedidoId, itemId } = req.params;
        const { cantidad: nuevaCantidad } = req.body;

        if (!nuevaCantidad || nuevaCantidad < 1) {
            return res.status(400).json({ error: 'La cantidad debe ser al menos 1' });
        }

        // Obtener el item
        const item = await getAsync(`
            SELECT pi.*, mi.nombre, mi.usa_inventario, mi.stock_actual, mi.stock_minimo
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            WHERE pi.id = $1 AND pi.pedido_id = $2
        `, [itemId, pedidoId]);

        if (!item) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        // Solo permitir modificar items pendientes
        if (item.estado !== 'pendiente') {
            return res.status(400).json({
                error: `No se puede modificar la cantidad de un item en estado "${item.estado}"`,
                estado: item.estado
            });
        }

        const diferenciaCantidad = nuevaCantidad - item.cantidad;

        // Verificar inventario si aumentamos cantidad
        if (item.usa_inventario && diferenciaCantidad > 0) {
            if (item.stock_actual < diferenciaCantidad) {
                return res.status(400).json({
                    error: `Stock insuficiente. Disponible: ${item.stock_actual}`
                });
            }
        }

        // Actualizar cantidad
        await runAsync('UPDATE pedido_items SET cantidad = $1 WHERE id = $2', [nuevaCantidad, itemId]);

        // Actualizar inventario si aplica
        if (item.usa_inventario && diferenciaCantidad !== 0) {
            const nuevoStock = (item.stock_actual || 0) - diferenciaCantidad;
            let nuevoEstado = 'disponible';

            if (nuevoStock <= 0) {
                nuevoEstado = 'no_disponible';
            } else if (nuevoStock <= item.stock_minimo) {
                nuevoEstado = 'poco_stock';
            }

            await runAsync(`
                UPDATE menu_items 
                SET stock_actual = $1, estado_inventario = $2
                WHERE id = $3
            `, [Math.max(0, nuevoStock), nuevoEstado, item.menu_item_id]);
        }

        // Recalcular total
        const result = await getAsync(`
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0) as nuevo_total
            FROM pedido_items WHERE pedido_id = $1
        `, [pedidoId]);

        const nuevoTotal = parseFloat(result.nuevo_total);
        await runAsync('UPDATE pedidos SET total = $1 WHERE id = $2', [nuevoTotal, pedidoId]);

        // Emitir eventos
        req.app.get('io').emit('pedido_editado', {
            id: pedidoId,
            accion: 'cantidad_modificada',
            itemId: itemId,
            nuevaCantidad: nuevaCantidad,
            nuevoTotal: nuevoTotal
        });

        res.json({
            message: `✓ Cantidad actualizada a ${nuevaCantidad}`,
            nuevoTotal: nuevoTotal
        });

    } catch (error) {
        console.error('Error modificando cantidad:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
