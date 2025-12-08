# 🍽️ Sistema POS para Restaurante (RestoPOS)
Sistema completo de gestión de pedidos, mesas y facturación para restaurantes. Permite a los meseros tomar pedidos desde dispositivos móviles, a la cocina visualizar comandas en tiempo real y a la administración gestionar el menú y ver reportes de ventas.

## 🚀 Características Principales
📱 Menú Digital Público: Acceso mediante código QR para que los clientes vean los platos.

👨‍🍳 Gestión de Pedidos: Flujo completo desde "Nuevo", "En Cocina", "Servido" hasta "Pagado".

🪑 Gestión de Mesas: Creación y visualización del estado de las mesas en tiempo real.

📊 Panel Administrativo:

Editor visual de menú (categorías, precios, stock).

Reportes de ventas diarias e históricas.

Gestión de usuarios y roles (Admin, Mesero, Cocina).

🖨️ Impresión: Soporte para imprimir comandas y recibos (integración con impresoras térmicas).

💾 Persistencia: Base de datos PostgreSQL robusta en la nube.

## 🛠️ Tecnologías Utilizadas
### Frontend
Vue.js 3 (Composition API)

Vite (Build tool)

Vue Router (Navegación SPA)

Axios (Comunicación HTTP)

CSS Puro (Diseño responsive y ligero)

### Backend
Node.js & Express

PostgreSQL (Base de datos alojada en Neon Tech)

pg (Cliente de Postgres)

CORS & Dotenv

###Despliegue (Deploy)
Frontend: Vercel

Backend: Render

Base de Datos: Neon Tech

## ⚙️ Instalación y Configuración Local
Si deseas correr el proyecto en tu máquina local:

### 1. Clonar el repositorio
bash
git clone https://github.com/[TU_USUARIO]/[TU_REPO].git
cd [TU_REPO]
### 2. Configurar el Backend
bash
cd backend
npm install
Crea un archivo .env en la carpeta backend con lo siguiente:

text
PORT=3000
DATABASE_URL=postgres://[USUARIO]:[PASSWORD]@[HOST_NEON]/[DB_NAME]
Ejecutar el servidor:

bash
npm run dev
# O para producción:
node server.js
El backend inicializará las tablas automáticamente al arrancar.

### 3. Configurar el Frontend
Abre una nueva terminal:

bash
cd frontend
npm install
Crea un archivo .env en la carpeta frontend:

text
VITE_API_URL=http://localhost:3000/api
Ejecutar el cliente:

bash
npm run dev
## 🔐 Credenciales por Defecto
Al iniciar el sistema por primera vez, se crea un usuario administrador:

Usuario: admin

Contraseña: admin123

## 📂 Estructura del Proyecto
text
/  
├── backend/  
│   ├── server.js           # Lógica principal y API endpoints  
│   ├── printer-simple.js   # Lógica de impresión  
│   └── ...  
├── frontend/  
│   ├── src/  
│   │   ├── api.js          # Configuración de Axios  
│   │   ├── router.js       # Rutas de Vue  
│   │   ├── components/     # Componentes (Admin, Menu, etc.)  
│   │   └── ...  
│   └── vercel.json         # Configuración de rewrites para SPA  
└── README.md  
## 🌍 Despliegue en Producción
Variables de Entorno Requeridas
En Render (Backend):

DATABASE_URL: Tu string de conexión de Neon/Postgres.

PORT: 10000 (o el que asigne Render).

En Vercel (Frontend):

VITE_API_URL: La URL de tu backend en Render (ej: https://mi-backend.onrender.com/api).
