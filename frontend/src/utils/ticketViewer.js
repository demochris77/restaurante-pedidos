// utils/ticketViewer.js (o dentro de MeseroPanel.vue)
export const verCuentaEnVentana = (data) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('❌ Permite ventanas emergentes para ver la cuenta');
    return;
  }

  const contenidoHTML = `
    <html>
    <head>
      <title>Cuenta - Restaurante Sazón de la Sierra</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h3 { margin: 0 0 5px 0; font-size: 16px; }
        .header p { margin: 2px 0; }
        .divider { border-top: 1px dashed black; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .col-cant { width: 10%; }
        .col-desc { width: 65%; }
        .col-total { width: 25%; text-align: right; }
        .total-section { font-size: 16px; font-weight: bold; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h3>RESTAURANTE SAZÓN DE LA SIERRA</h3>
        <p>Fecha: ${new Date().toLocaleString()}</p>
        <p>Mesa: ${data.mesa}</p>
        <div class="divider"></div>
        <p>CUENTA DE COBRO</p>
        <div class="divider"></div>
      </div>

      <div class="items">
        <div class="row" style="font-weight:bold; border-bottom:1px solid black;">
          <span class="col-cant">Cant</span>
          <span class="col-desc">Desc</span>
          <span class="col-total">Total</span>
        </div>
        ${data.items.map(item => `
          <div class="row">
            <span class="col-cant">${item.cantidad}</span>
            <span class="col-desc">${item.nombre}</span>
            <span class="col-total">$${(item.cantidad * item.precio).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>

      <div class="total-section">
        <div class="divider"></div>
        <div class="row">
          <span>TOTAL:</span>
          <span>$${data.total}</span>
        </div>
        <div class="divider"></div>
      </div>

      <div class="footer">
        <p>¡Gracias por su visita!</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(contenidoHTML);
  printWindow.document.close();
};
