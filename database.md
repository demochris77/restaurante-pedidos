# Proyecto Restaurante: Documentación de Datos

Este documento describe el modelo de datos del sistema, abarcando tanto la base de datos relacional original como el nuevo esquema unificado para el SaaS.

---

## 🏗️ Modelos de Datos

### 🔵 1. Esquema SaaS Unified (Moderno - web/)
Gestionado a través de **Prisma ORM** en la carpeta `/web`. Este es el modelo multi-inquilino donde cada restaurante es una `Organization`.

#### Entidades Core (SaaS):
- **`Organization`**: Representa a cada cliente/restaurante. Controla límites de mesas, usuarios y el plan actual.
- **`Subscription`**: Integración con **Stripe**. Almacena el estado del plan (`starter`, `professional`, `enterprise`) y el ciclo de facturación.
- **`User` (usuarios)**: Sistema de identidad unificado. Roles: `admin`, `mesero`, `cocinero`, `cajero`.

#### Operaciones:
- **`MenuItem` / `Category`**: Gestión dinámica de la carta por organización.
- **`Order` / `OrderItem`**: Flujo completo de pedidos con trazabilidad de tiempos.
- **`InventoryItem` / `DishIngredient`**: Control de stock de materia prima vinculado a los platos.

---

### 🟡 2. Esquema Monolítico (Legado - backend/)
Utilizado por la versión original en Node/Express. Se basa en consultas SQL directas.

#### Tablas Principales:
- `usuarios`: Gestión simple de credenciales y roles.
- `menu_items`: Lista de productos con precios y disponibilidad simple.
- `pedidos`: Registro de comandas vinculadas a números de mesa.
- `transacciones`: Registro de depósitos y pagos por métodos tradicionales.
- `configuracion`: Tabla clave-valor para settings globales del sistema.

---

## 🔄 Resumen de Migración

| Concepto | Legado (v1) | SaaS (v2) |
| :--- | :--- | :--- |
| **Arquitectura** | Monotenante | Multi-inquilino (Organization) |
| **Acceso a Datos** | SQL Directo / Pool | Prisma ORM (Type-safe) |
| **Pagos** | Manual / Configurable | Stripe (Automatizado) |
| **Real-time** | Sockets directos | Server Components / Sockets |

---

## 🛠️ Herramientas de Gestión (en /web)
- `npx prisma db push`: Sincroniza cambios del esquema con la base de datos.
- `npx prisma studio`: Interfaz web para explorar y editar los datos visualmente.
- `npm run db:seed`: Puebla la base de datos con información inicial de prueba.

> [!NOTE]
> Para habilitar la persistencia de datos, asegúrate de configurar la variable `DATABASE_URL` en el archivo `web/.env`.
