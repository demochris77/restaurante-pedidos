# 👥 Usuarios de Prueba - Hamelin Foods

Este documento contiene las credenciales de acceso para el entorno de desarrollo y pruebas del SaaS.

## 🏢 Organización
- **Nombre**: Hamelin Foods
- **Slug (URL)**: `hamelin-foods`
- **Plan**: Profesional (Activo)

---

## 🔑 Credenciales Generales
Todas las cuentas comparten la misma contraseña en el entorno de desarrollo:

> **Password**: `admin123`

---

## 👤 Usuarios por Rol

| Rol | Usuario | Nombre | Propósito |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | Admin Hamelin | Gestión total, configuración y reportes. |
| **Mesero** | `mesero` | Juan Waiter | Toma de pedidos y gestión de mesas. |
| **Cocinero** | `cocinero` | Chef Mario | Recepción y preparación de pedidos. |
| **Cajero** | `cajero` | Ana Cashier | Cobro de pedidos y cierre de caja. |

---

## 🚀 Cómo Iniciar Sesión
1. Dirígete a `http://localhost:3000/login`.
2. Ingresa el **Usuario** y la **Contraseña** (`admin123`).
3. El sistema te redirigirá automáticamente al panel correspondiente según tu rol.

> [!TIP]
> Puedes usar diferentes navegadores o pestañas de incógnito para probar la interacción en tiempo real entre el mesero, la cocina y el cajero.
