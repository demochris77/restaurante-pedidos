# Proyecto Restaurante: Arquitectura Global

Este repositorio contiene la evolución completa del sistema de gestión para restaurantes, desde su versión original monolítica hasta el nuevo núcleo SaaS unificado.

## 📂 Organización del Repositorio

El proyecto se divide en tres bloques principales según su función y etapa de desarrollo:

---

### 🟢 1. `web/` (El Futuro: Núcleo SaaS v2)
Esta es la versión moderna y unificada del sistema, diseñada para operar como una plataforma multi-inquilino (SaaS).
- **Framework**: **Next.js 15+ (App Router)**.
- **Base de Datos**: PostgreSQL gestionada vía **Prisma ORM**.
- **Autenticación**: Auth.js (v5) nativo de Next.js.
- **Real-time**: **Ably** (Mensajería en tiempo real).
- **Suscripciones**: Integración con **Stripe**.
- **Estilos**: Tailwind CSS 4 con diseño responsivo premium.

#### 🏗️ Estructura Completa del Directorio `web/`:
```text
web/
├── prisma/                 # Modelos de base de datos y migraciones
├── public/                 # Imágenes, iconos y fuentes estáticas
└── src/
    ├── app/                # Enrutamiento de Next.js (App Router)
    │   ├── [slug]/         # Rutas dinámicas por restaurante (inquilino)
    │   │   ├── (staff)/    # Área de personal (Admin, Cocina, Mesero)
    │   │   │   ├── admin/  # Configuración, Staff, Settings
    │   │   │   ├── cook/   # Monitor de cocina (Control de platos)
    │   │   │   └── waiter/ # Gestión de pedidos y platos listos
    │   │   ├── mesa/       # Interfaz pública para clientes (QR)
    │   │   │   └── [number]/ # Ruta específica por mesa (Menu, Status, Bill)
    │   │   └── receipt/    # Impresión de recibos y facturas
    │   ├── (auth)/         # Autenticación (Login, Signup, Recovery)
    │   ├── (marketing)/    # Páginas públicas (Landing, Contacto, Legal)
    │   └── api/            # Endpoints API (Public, Internal, Stripe, Ably)
    ├── components/         # Bloques de construcción UI
    │   ├── admin/          # Componentes específicos del dashboard admin
    │   ├── cook/           # Componentes para el monitor de preparación
    │   ├── waiter/         # Herramientas para meseros (ReadyItems, etc)
    │   ├── common/         # UI compartida (Buttons, Modals, Inputs)
    │   └── providers/      # Contextos (I18n, Theme, Auth, Query)
    ├── hooks/              # Lógica de componentes reutilizable (Custom Hooks)
    ├── lib/                # Servicios y utilidades core
    │   ├── auth.ts         # Configuración de Auth.js
    │   ├── prisma.ts       # Cliente Singleton de Prisma
    │   ├── ably.ts         # Integración de mensajería real-time
    │   └── visitor-auth.ts # Seguridad de pedidos mediante visitor-id
    └── middleware.ts       # Protección de rutas y gestión de sesiones
```

---

### 🟡 2. `backend/` (Legado v1: API & Sockets)
Fue el corazón de la primera versión del sistema. Sigue siendo funcional para despliegues locales o simples.
- **Runtime**: Node.js con Express.
- **Real-time**: **Socket.io** para sincronización directa servidor-cocina.
- **Persistencia**: Consultas SQL directas a PostgreSQL.
- **Modularidad**: Rutas divididas en `auth`, `pedidos`, `menu`, `inventory`, etc.

---

### 🔵 3. `frontend/` (Legado v1: Aplicación Vue)
El cliente original para meseros y administración antes de la migración a Next.js.
- **Framework**: **Vue.js 3** (Composition API).
- **Estado**: Pinia para reactividad ligera.
- **Build**: Vite para compilación rápida.
- **Real-time**: Comunicación bidireccional vía Socket.io-client.

---

## 📡 Flujo de Comunicación

| Componente | Protocolo | Responsabilidad |
| :--- | :--- | :--- |
| **SaaS Web** | Server Actions / API | Gestión multi-sucursal, suscripciones y dashboard moderno. |
| **Legacy Backend** | REST / Websockets | Sincronización instantánea en cocina y toma de comandas rápida. |
| **Legacy Frontend** | Axios / Sockets | Interfaz de usuario reactiva para el personal de sala. |

---

## 🛠️ Stack Tecnológico Unificado
- **Lenguaje**: TypeScript y JavaScript (ESM).
- **Diseño**: Tailwind CSS / CSS Moderno.
- **Base de Datos**: PostgreSQL (Compartida o migrada hacia el esquema Prisma).
- **Despliegue**: Preparado para Vercel (Web/Frontend) y Render/Docker (Backend).
