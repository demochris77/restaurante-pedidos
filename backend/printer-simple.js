import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Crear carpetas si no existen
async function crearCarpetas() {
    try {
        await fs.mkdir('./recibos', { recursive: true });
        await fs.mkdir('./comandas', { recursive: true });
    } catch (err) {
        console.log('Carpetas ya existen');
    }
}

crearCarpetas();

// Recibo de CUENTA (lo que debe pagar)
export const imprimirCuenta = async (pedido) => {
    try {
        let contenido = '\n';
        contenido += '        RESTAURANTE\n';
        contenido += '       SIERRA NEVADA\n';
        contenido += '\n';
        contenido += `Mesa: ${pedido.mesa_numero}\n`;
        contenido += '─────────────────────\n';
        contenido += 'CUENTA:\n';
        contenido += '─────────────────────\n';

        pedido.items.forEach(item => {
            const cantidad = item.cantidad.toString().padEnd(2);
            const nombre = item.nombre.substring(0, 20).padEnd(20);
            const precio = `$${(item.cantidad * item.precio).toFixed(2)}`.padStart(10);
            contenido += `${cantidad}x ${nombre}${precio}\n`;
        });

        contenido += '─────────────────────\n';
        contenido += `TOTAL A PAGAR:\n`;
        contenido += `$${pedido.total}\n`;
        contenido += '\n';
        contenido += new Date().toLocaleString('es-CO') + '\n';
        contenido += 'Por favor, acérquese a caja\n';
        contenido += '\n\n\n';

        const timestamp = Date.now();
        const archivo = `./recibos/cuenta-${timestamp}.txt`;
        await fs.writeFile(archivo, contenido);

        console.log(`✅ Cuenta guardada: ${archivo}`);

        try {
            await execAsync(`print /d:LPT1 "${archivo}"`);
            console.log('✅ Cuenta impresa');
        } catch (err) {
            console.log('⚠️ Cuenta guardada pero no se pudo imprimir');
        }

        return true;
    } catch (err) {
        console.error('❌ Error en cuenta:', err.message);
        return false;
    }
};

// Recibo de PAGO (comprobante de pago)
export const imprimirReciboPago = async (pedido, metodoPago, monto) => {
    try {
        let contenido = '\n';
        contenido += '        RESTAURANTE\n';
        contenido += '       SIERRA NEVADA\n';
        contenido += '\n';
        contenido += `Mesa: ${pedido.mesa_numero}\n`;
        contenido += '─────────────────────\n';
        contenido += 'RECIBO DE PAGO\n';
        contenido += '─────────────────────\n';

        contenido += `Monto: $${monto}\n`;
        contenido += `Método: ${metodoPago.toUpperCase()}\n`;
        contenido += '\n';
        contenido += new Date().toLocaleString('es-CO') + '\n';
        contenido += '¡Gracias por su compra!\n';
        contenido += 'Vuelva pronto\n';
        contenido += '\n\n\n';

        const timestamp = Date.now();
        const archivo = `./recibos/pago-${timestamp}.txt`;
        await fs.writeFile(archivo, contenido);

        console.log(`✅ Recibo de pago guardado: ${archivo}`);

        try {
            await execAsync(`print /d:LPT1 "${archivo}"`);
            console.log('✅ Recibo de pago impreso');
        } catch (err) {
            console.log('⚠️ Recibo de pago guardado pero no se pudo imprimir');
        }

        return true;
    } catch (err) {
        console.error('❌ Error en recibo de pago:', err.message);
        return false;
    }
};
