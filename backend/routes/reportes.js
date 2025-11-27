import express from 'express';
import { getAsync, allAsync } from '../config/db.js';

const router = express.Router();

// GET /api/reportes/ventas-hoy - Ventas del día
router.get('/ventas-hoy', async (req, res) => {
    try {
        const query = `
            SELECT
                metodo_pago,
                COUNT(*) as cantidad,
                SUM(monto) as total
            FROM transacciones
            WHERE DATE(created_at) = CURRENT_DATE
            GROUP BY metodo_pago
        `;

        const reportes = await allAsync(query);

        const totalQuery = `
            SELECT SUM(monto) as total
            FROM transacciones
            WHERE DATE(created_at) = CURRENT_DATE
        `;

        const totalRow = await getAsync(totalQuery);

        res.json({
            detalles: reportes,
            total_general: totalRow?.total || 0,
            fecha: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reportes/pedidos-hoy - Pedidos del día
router.get('/pedidos-hoy', async (req, res) => {
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
            WHERE DATE(p.created_at) = CURRENT_DATE
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
router.get('/historico', async (req, res) => {
    try {
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
            total_acumulado: totalAcumulado || { total_transacciones: 0, total_acumulado: 0 }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reportes/tiempos-cocina - Estadísticas de tiempos de preparación
router.get('/tiempos-cocina', async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        let params = [];

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE its.fecha BETWEEN $1 AND $2';
            params = [fecha_inicio, fecha_fin];
        } else if (fecha_inicio) {
            whereClause = 'WHERE its.fecha >= $1';
            params = [fecha_inicio];
        } else if (fecha_fin) {
            whereClause = 'WHERE its.fecha <= $1';
            params = [fecha_fin];
        }

        const query = `
            SELECT 
                mi.id,
                mi.nombre as item_nombre,
                mi.categoria,
                mi.tiempo_estimado,
                SUM(its.total_preparaciones) as total_preparaciones,
                ROUND(AVG(its.tiempo_promedio_minutos)) as tiempo_promedio,
                MIN(its.tiempo_minimo_minutos) as tiempo_minimo,
                MAX(its.tiempo_maximo_minutos) as tiempo_maximo
            FROM item_time_stats its
            JOIN menu_items mi ON its.menu_item_id = mi.id
            ${whereClause}
            GROUP BY mi.id, mi.nombre, mi.categoria, mi.tiempo_estimado
            HAVING SUM(its.total_preparaciones) > 0
            ORDER BY total_preparaciones DESC
        `;

        const stats = await allAsync(query, params);

        const statsConDiferencia = stats.map(stat => ({
            ...stat,
            tiempo_promedio: Number(stat.tiempo_promedio),
            diferencia_minutos: stat.tiempo_estimado ?
                Math.round(Number(stat.tiempo_promedio) - stat.tiempo_estimado) : null
        }));

        res.json(statsConDiferencia);
    } catch (error) {
        console.error('Error en /tiempos-cocina:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reportes/top-platos - Top platos más pedidos (con filtro de fechas opcional)
router.get('/top-platos', async (req, res) => {
    try {
        const { limit = 10, fecha_inicio, fecha_fin } = req.query;

        let query = `
            SELECT 
                mi.id,
                mi.nombre,
                mi.categoria,
                mi.precio,
                COUNT(pi.id) as total_pedidos,
                SUM(pi.precio_unitario) as ingresos_totales
            FROM pedido_items pi
            JOIN menu_items mi ON pi.menu_item_id = mi.id
            JOIN pedidos p ON pi.pedido_id = p.id
            WHERE p.estado != 'cancelado'
        `;

        const params = [];
        let paramIndex = 1;

        // ✅ AGREGAR LOGICA DE FECHAS
        if (fecha_inicio && fecha_fin) {
            query += ` AND p.created_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(fecha_inicio, fecha_fin);
            paramIndex += 2;
        }

        query += `
            GROUP BY mi.id, mi.nombre, mi.categoria, mi.precio
            ORDER BY total_pedidos DESC
            LIMIT $${paramIndex}
        `;

        params.push(parseInt(limit));

        const topPlatos = await allAsync(query, params);

        res.json(topPlatos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


export default router;
