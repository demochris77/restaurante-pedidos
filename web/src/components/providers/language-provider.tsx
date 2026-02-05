'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'es' | 'en'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
    es: {
        // Navbar
        'nav.pricing': 'Precios',
        'nav.login': 'Iniciar Sesión',
        'nav.register': 'Comenzar Gratis',

        // Landing Page
        'landing.hero.title': 'Gestiona tu Restaurante con',
        'landing.hero.titleHighlight': 'Eficiencia Total',
        'landing.hero.subtitle': 'Sistema POS completo para restaurantes modernos. Gestiona mesas, pedidos, cocina y pagos desde una sola plataforma.',
        'landing.hero.cta': 'Comenzar Gratis',
        'landing.hero.pricing': 'Ver Precios',
        'landing.hero.benefits': '✓ Sin tarjeta de crédito · ✓ Configuración en 5 minutos · ✓ Soporte en español',

        'landing.features.title': 'Todo lo que necesitas para tu restaurante',
        'landing.features.subtitle': 'Funcionalidades diseñadas para optimizar cada aspecto de tu negocio',

        'landing.feature.orders.title': 'Gestión de Pedidos',
        'landing.feature.orders.desc': 'Toma pedidos rápidamente desde tablets o móviles. Envía directamente a cocina.',
        'landing.feature.tables.title': 'Control de Mesas',
        'landing.feature.tables.desc': 'Visualiza el estado de todas tus mesas en tiempo real. Optimiza la rotación.',
        'landing.feature.kitchen.title': 'Cocina Sincronizada',
        'landing.feature.kitchen.desc': 'Los cocineros reciben pedidos al instante. Marcan platos listos en tiempo real.',
        'landing.feature.reports.title': 'Reportes Detallados',
        'landing.feature.reports.desc': 'Analiza ventas, productos más vendidos y rendimiento del personal.',
        'landing.feature.security.title': 'Seguro y Confiable',
        'landing.feature.security.desc': 'Tus datos protegidos con encriptación de nivel empresarial.',
        'landing.feature.easy.title': 'Fácil de Usar',
        'landing.feature.easy.desc': 'Interfaz intuitiva. Tu equipo aprende a usarlo en minutos.',

        'landing.steps.title': 'Comienza en 3 simples pasos',
        'landing.step1.title': 'Regístrate',
        'landing.step1.desc': 'Crea tu cuenta en menos de 2 minutos',
        'landing.step2.title': 'Configura',
        'landing.step2.desc': 'Agrega tu menú, mesas y personal',
        'landing.step3.title': '¡Listo!',
        'landing.step3.desc': 'Comienza a gestionar tu restaurante',

        'landing.cta.title': '¿Listo para transformar tu restaurante?',
        'landing.cta.subtitle': 'Únete a cientos de restaurantes que ya optimizaron su operación',
        'landing.cta.button': 'Comenzar Ahora',

        // Pricing Page
        'pricing.title': 'Precios simples y transparentes',
        'pricing.subtitle': 'Elige el plan perfecto para tu restaurante. Sin costos ocultos, cancela cuando quieras.',
        'pricing.popular': 'Más Popular',
        'pricing.cta': 'Comenzar Ahora',
        'pricing.perMonth': '/mes',

        'pricing.starter.name': 'Starter',
        'pricing.starter.desc': 'Perfecto para restaurantes pequeños',
        'pricing.professional.name': 'Professional',
        'pricing.professional.desc': 'Ideal para restaurantes en crecimiento',
        'pricing.enterprise.name': 'Enterprise',
        'pricing.enterprise.desc': 'Para cadenas y múltiples locales',

        'pricing.faq.title': 'Preguntas Frecuentes',
        'pricing.faq.q1': '¿Puedo cambiar de plan en cualquier momento?',
        'pricing.faq.a1': 'Sí, puedes actualizar o degradar tu plan cuando lo necesites. Los cambios se reflejan en tu próxima facturación.',
        'pricing.faq.q2': '¿Hay costos de instalación o configuración?',
        'pricing.faq.a2': 'No, todos nuestros planes incluyen la configuración inicial sin costo adicional.',
        'pricing.faq.q3': '¿Qué métodos de pago aceptan?',
        'pricing.faq.a3': 'Aceptamos tarjetas de crédito, débito y transferencias bancarias. La facturación es mensual.',
        'pricing.faq.q4': '¿Ofrecen período de prueba?',
        'pricing.faq.a4': 'Sí, todos los planes incluyen 14 días de prueba gratis sin necesidad de tarjeta de crédito.',

        'pricing.contact.title': '¿Aún tienes dudas?',
        'pricing.contact.subtitle': 'Contáctanos y te ayudaremos a elegir el mejor plan para tu negocio',
        'pricing.contact.button': 'Contactar Ventas',

        // Pricing Features
        'pricing.feature.tables5': 'Hasta 5 mesas',
        'pricing.feature.users2': '2 usuarios del sistema',
        'pricing.feature.basicOrders': 'Gestión de pedidos básica',
        'pricing.feature.monthlyReports': 'Reportes mensuales',
        'pricing.feature.emailSupport': 'Soporte por email',
        'pricing.feature.updates': 'Actualizaciones incluidas',

        'pricing.feature.tables20': 'Hasta 20 mesas',
        'pricing.feature.users10': '10 usuarios del sistema',
        'pricing.feature.fullOrders': 'Gestión completa de pedidos',
        'pricing.feature.realtimeReports': 'Reportes en tiempo real',
        'pricing.feature.prioritySupport': 'Soporte prioritario',
        'pricing.feature.kitchenIntegration': 'Integración con cocina',
        'pricing.feature.inventory': 'Control de inventario',
        'pricing.feature.advancedStats': 'Estadísticas avanzadas',

        'pricing.feature.unlimitedTables': 'Mesas ilimitadas',
        'pricing.feature.unlimitedUsers': 'Usuarios ilimitados',
        'pricing.feature.multiRestaurant': 'Múltiples restaurantes',
        'pricing.feature.customReports': 'Reportes personalizados',
        'pricing.feature.support24': 'Soporte 24/7',
        'pricing.feature.api': 'API de integración',
        'pricing.feature.accountManager': 'Gestor de cuenta dedicado',
        'pricing.feature.customization': 'Personalización avanzada',

        // Footer
        'footer.tagline': 'Sistema de gestión para restaurantes moderno y fácil de usar.',
        'footer.product': 'Producto',
        'footer.features': 'Características',
        'footer.company': 'Empresa',
        'footer.about': 'Nosotros',
        'footer.contact': 'Contacto',
        'footer.legal': 'Legal',
        'footer.privacy': 'Privacidad',
        'footer.terms': 'Términos',
        'footer.rights': 'Todos los derechos reservados.',

        // Login
        'login.title': 'Bienvenido de nuevo',
        'login.subtitle': 'Inicia sesión en tu cuenta',
        'login.username': 'Usuario',
        'login.password': 'Contraseña',
        'login.usernamePlaceholder': 'Ingresa tu usuario',
        'login.passwordPlaceholder': 'Ingresa tu contraseña',
        'login.submit': 'Iniciar Sesión',
        'login.submitting': 'Iniciando sesión...',
        'login.noAccount': '¿No tienes una cuenta?',
        'login.registerLink': 'Regístrate gratis',

        // Register
        'register.title': 'Crea tu cuenta',
        'register.subtitle': 'Comienza a gestionar tu restaurante en minutos',
        'register.step.restaurant': 'Restaurante',
        'register.step.admin': 'Administrador',
        'register.step.plan': 'Plan',
        'register.step.confirm': 'Confirmar',

        'register.step1.title': 'Información del Restaurante',
        'register.step1.name': 'Nombre del Restaurante',
        'register.step1.namePlaceholder': 'Mi Restaurante',
        'register.step1.slug': 'URL Personalizada (slug)',
        'register.step1.slugHint': 'Solo letras minúsculas, números y guiones',
        'register.step1.slugPlaceholder': 'mi-restaurante',
        'register.step1.email': 'Email de Contacto',
        'register.step1.emailPlaceholder': 'contacto@mirestaurante.com',

        'register.step2.title': 'Información del Administrador',
        'register.step2.fullName': 'Nombre Completo',
        'register.step2.fullNamePlaceholder': 'Juan Pérez',
        'register.step2.username': 'Usuario',
        'register.step2.usernamePlaceholder': 'admin',
        'register.step2.password': 'Contraseña',
        'register.step2.passwordPlaceholder': '••••••••',
        'register.step2.confirmPassword': 'Confirmar Contraseña',

        'register.step3.title': 'Selecciona tu Plan',
        'register.step3.perMonth': '/mes',

        'register.step4.title': 'Confirma tu Información',
        'register.step4.restaurantSection': 'Restaurante',
        'register.step4.adminSection': 'Administrador',
        'register.step4.planSection': 'Plan Seleccionado',
        'register.step4.usernameLabel': 'Usuario:',

        'register.button.previous': 'Anterior',
        'register.button.next': 'Siguiente',
        'register.button.create': 'Crear Cuenta',
        'register.hasAccount': '¿Ya tienes una cuenta?',
        'register.loginLink': 'Inicia sesión',
        'register.required': '*',

        // Register Validation
        'register.validation.completeFields': 'Por favor completa los siguientes campos:',
        'register.validation.invalidEmail': 'Email inválido',
        'register.validation.passwordMismatch': 'Las contraseñas no coinciden',
        'register.validation.passwordLength': 'La contraseña debe tener al menos 6 caracteres',

        // Plan Descriptions (for register page)
        'pricing.starter.description': 'Perfecto para restaurantes pequeños',
        'pricing.professional.description': 'Ideal para restaurantes en crecimiento',
        'pricing.enterprise.description': 'Para cadenas y múltiples locales',

        // Payment Success Page
        'payment.success.title': '¡Pago Exitoso!',
        'payment.success.subtitle': 'Tu cuenta ha sido creada exitosamente. Recibirás un email de confirmación en breve.',
        'payment.success.steps': 'Próximos pasos',
        'payment.success.step1': 'Tu organización ha sido creada',
        'payment.success.step2': 'Tu usuario administrador está listo',
        'payment.success.step3': 'Tu suscripción está activa',
        'payment.success.message': 'Ya puedes iniciar sesión y comenzar a usar la plataforma',
        'payment.success.button': 'Iniciar Sesión',

        // Payment Cancel Page
        'payment.cancel.title': 'Pago Cancelado',
        'payment.cancel.subtitle': 'El proceso de pago fue cancelado. No se realizó ningún cargo.',
        'payment.cancel.whatToDo': '¿Qué puedes hacer?',
        'payment.cancel.option1': 'Puedes intentar nuevamente el proceso de registro',
        'payment.cancel.option2': 'Si tuviste algún problema, contáctanos para ayudarte',
        'payment.cancel.option3': 'Todos tus datos están seguros y no se guardó ninguna información de pago',
        'payment.cancel.retry': 'Intentar Nuevamente',
        'payment.cancel.home': 'Volver al Inicio',

        // Payment Pending Page
        'payment.pending.title': 'Pago Pendiente',
        'payment.pending.subtitle': 'Tu pago está siendo procesado. Te notificaremos por email cuando se complete.',
        'payment.pending.whatNext': '¿Qué sigue?',
        'payment.pending.info1': 'Si pagaste con transferencia bancaria o efectivo, el proceso puede tardar hasta 48 horas.',
        'payment.pending.info2': 'Recibirás un email de confirmación cuando tu pago sea aprobado.',
        'payment.pending.info3': 'Una vez aprobado, podrás iniciar sesión y comenzar a usar la plataforma.',
        'payment.pending.button': 'Volver al Inicio',
    },
    en: {
        // Navbar
        'nav.pricing': 'Pricing',
        'nav.login': 'Sign In',
        'nav.register': 'Get Started',

        // Landing Page
        'landing.hero.title': 'Manage Your Restaurant with',
        'landing.hero.titleHighlight': 'Total Efficiency',
        'landing.hero.subtitle': 'Complete POS system for modern restaurants. Manage tables, orders, kitchen and payments from a single platform.',
        'landing.hero.cta': 'Get Started',
        'landing.hero.pricing': 'View Pricing',
        'landing.hero.benefits': '✓ No credit card · ✓ 5-minute setup · ✓ Support in Spanish',

        'landing.features.title': 'Everything you need for your restaurant',
        'landing.features.subtitle': 'Features designed to optimize every aspect of your business',

        'landing.feature.orders.title': 'Order Management',
        'landing.feature.orders.desc': 'Take orders quickly from tablets or mobile. Send directly to kitchen.',
        'landing.feature.tables.title': 'Table Control',
        'landing.feature.tables.desc': 'View the status of all your tables in real time. Optimize rotation.',
        'landing.feature.kitchen.title': 'Synchronized Kitchen',
        'landing.feature.kitchen.desc': 'Cooks receive orders instantly. Mark dishes ready in real time.',
        'landing.feature.reports.title': 'Detailed Reports',
        'landing.feature.reports.desc': 'Analyze sales, best-selling products and staff performance.',
        'landing.feature.security.title': 'Secure and Reliable',
        'landing.feature.security.desc': 'Your data protected with enterprise-level encryption.',
        'landing.feature.easy.title': 'Easy to Use',
        'landing.feature.easy.desc': 'Intuitive interface. Your team learns to use it in minutes.',

        'landing.steps.title': 'Get started in 3 simple steps',
        'landing.step1.title': 'Sign Up',
        'landing.step1.desc': 'Create your account in less than 2 minutes',
        'landing.step2.title': 'Configure',
        'landing.step2.desc': 'Add your menu, tables and staff',
        'landing.step3.title': 'Ready!',
        'landing.step3.desc': 'Start managing your restaurant',

        'landing.cta.title': 'Ready to transform your restaurant?',
        'landing.cta.subtitle': 'Join hundreds of restaurants that have already optimized their operation',
        'landing.cta.button': 'Start Now',

        // Pricing Page
        'pricing.title': 'Simple and transparent pricing',
        'pricing.subtitle': 'Choose the perfect plan for your restaurant. No hidden costs, cancel anytime.',
        'pricing.popular': 'Most Popular',
        'pricing.cta': 'Get Started',
        'pricing.perMonth': '/month',

        'pricing.starter.name': 'Starter',
        'pricing.starter.desc': 'Perfect for small restaurants',
        'pricing.professional.name': 'Professional',
        'pricing.professional.desc': 'Ideal for growing restaurants',
        'pricing.enterprise.name': 'Enterprise',
        'pricing.enterprise.desc': 'For chains and multiple locations',

        'pricing.faq.title': 'Frequently Asked Questions',
        'pricing.faq.q1': 'Can I change plans at any time?',
        'pricing.faq.a1': 'Yes, you can upgrade or downgrade your plan whenever you need. Changes are reflected in your next billing.',
        'pricing.faq.q2': 'Are there installation or setup costs?',
        'pricing.faq.a2': 'No, all our plans include initial setup at no additional cost.',
        'pricing.faq.q3': 'What payment methods do you accept?',
        'pricing.faq.a3': 'We accept credit cards, debit cards and bank transfers. Billing is monthly.',
        'pricing.faq.q4': 'Do you offer a trial period?',
        'pricing.faq.a4': 'Yes, all plans include 14 days free trial without credit card required.',

        'pricing.contact.title': 'Still have questions?',
        'pricing.contact.subtitle': 'Contact us and we will help you choose the best plan for your business',
        'pricing.contact.button': 'Contact Sales',

        // Pricing Features
        'pricing.feature.tables5': 'Up to 5 tables',
        'pricing.feature.users2': '2 system users',
        'pricing.feature.basicOrders': 'Basic order management',
        'pricing.feature.monthlyReports': 'Monthly reports',
        'pricing.feature.emailSupport': 'Email support',
        'pricing.feature.updates': 'Updates included',

        'pricing.feature.tables20': 'Up to 20 tables',
        'pricing.feature.users10': '10 system users',
        'pricing.feature.fullOrders': 'Complete order management',
        'pricing.feature.realtimeReports': 'Real-time reports',
        'pricing.feature.prioritySupport': 'Priority support',
        'pricing.feature.kitchenIntegration': 'Kitchen integration',
        'pricing.feature.inventory': 'Inventory control',
        'pricing.feature.advancedStats': 'Advanced statistics',

        'pricing.feature.unlimitedTables': 'Unlimited tables',
        'pricing.feature.unlimitedUsers': 'Unlimited users',
        'pricing.feature.multiRestaurant': 'Multiple restaurants',
        'pricing.feature.customReports': 'Custom reports',
        'pricing.feature.support24': '24/7 support',
        'pricing.feature.api': 'API integration',
        'pricing.feature.accountManager': 'Dedicated account manager',
        'pricing.feature.customization': 'Advanced customization',

        // Footer
        'footer.tagline': 'Modern and easy-to-use restaurant management system.',
        'footer.product': 'Product',
        'footer.features': 'Features',
        'footer.company': 'Company',
        'footer.about': 'About',
        'footer.contact': 'Contact',
        'footer.legal': 'Legal',
        'footer.privacy': 'Privacy',
        'footer.terms': 'Terms',
        'footer.rights': 'All rights reserved.',

        // Login
        'login.title': 'Welcome back',
        'login.subtitle': 'Sign in to your account',
        'login.username': 'Username',
        'login.password': 'Password',
        'login.usernamePlaceholder': 'Enter your username',
        'login.passwordPlaceholder': 'Enter your password',
        'login.submit': 'Sign In',
        'login.submitting': 'Signing in...',
        'login.noAccount': "Don't have an account?",
        'login.registerLink': 'Sign up free',

        // Register
        'register.title': 'Create your account',
        'register.subtitle': 'Start managing your restaurant in minutes',
        'register.step.restaurant': 'Restaurant',
        'register.step.admin': 'Administrator',
        'register.step.plan': 'Plan',
        'register.step.confirm': 'Confirm',

        'register.step1.title': 'Restaurant Information',
        'register.step1.name': 'Restaurant Name',
        'register.step1.namePlaceholder': 'My Restaurant',
        'register.step1.slug': 'Custom URL (slug)',
        'register.step1.slugHint': 'Only lowercase letters, numbers and hyphens',
        'register.step1.slugPlaceholder': 'my-restaurant',
        'register.step1.email': 'Contact Email',
        'register.step1.emailPlaceholder': 'contact@myrestaurant.com',

        'register.step2.title': 'Administrator Information',
        'register.step2.fullName': 'Full Name',
        'register.step2.fullNamePlaceholder': 'John Doe',
        'register.step2.username': 'Username',
        'register.step2.usernamePlaceholder': 'admin',
        'register.step2.password': 'Password',
        'register.step2.passwordPlaceholder': '••••••••',
        'register.step2.confirmPassword': 'Confirm Password',

        'register.step3.title': 'Select your Plan',
        'register.step3.perMonth': '/month',

        'register.step4.title': 'Confirm your Information',
        'register.step4.restaurantSection': 'Restaurant',
        'register.step4.adminSection': 'Administrator',
        'register.step4.planSection': 'Selected Plan',
        'register.step4.usernameLabel': 'Username:',

        'register.button.previous': 'Previous',
        'register.button.next': 'Next',
        'register.button.create': 'Create Account',
        'register.hasAccount': 'Already have an account?',
        'register.loginLink': 'Sign in',
        'register.required': '*',

        // Register Validation
        'register.validation.completeFields': 'Please complete the following fields:',
        'register.validation.invalidEmail': 'Invalid email',
        'register.validation.passwordMismatch': 'Passwords do not match',
        'register.validation.passwordLength': 'Password must be at least 6 characters',

        // Plan Descriptions (for register page)
        'pricing.starter.description': 'Perfect for small restaurants',
        'pricing.professional.description': 'Ideal for growing restaurants',
        'pricing.enterprise.description': 'For chains and multiple locations',

        // Payment Success Page
        'payment.success.title': 'Payment Successful!',
        'payment.success.subtitle': 'Your account has been created successfully. You will receive a confirmation email shortly.',
        'payment.success.steps': 'Next steps',
        'payment.success.step1': 'Your organization has been created',
        'payment.success.step2': 'Your admin user is ready',
        'payment.success.step3': 'Your subscription is active',
        'payment.success.message': 'You can now log in and start using the platform',
        'payment.success.button': 'Sign In',

        // Payment Cancel Page
        'payment.cancel.title': 'Payment Canceled',
        'payment.cancel.subtitle': 'The payment process was canceled. No charges were made.',
        'payment.cancel.whatToDo': 'What can you do?',
        'payment.cancel.option1': 'You can try the registration process again',
        'payment.cancel.option2': 'If you had any issues, contact us for help',
        'payment.cancel.option3': 'All your data is safe and no payment information was saved',
        'payment.cancel.retry': 'Try Again',
        'payment.cancel.home': 'Back to Home',

        // Payment Pending Page
        'payment.pending.title': 'Payment Pending',
        'payment.pending.subtitle': 'Your payment is being processed. We will notify you by email when it completes.',
        'payment.pending.whatNext': 'What\'s next?',
        'payment.pending.info1': 'If you paid with bank transfer or cash, the process may take up to 48 hours.',
        'payment.pending.info2': 'You will receive a confirmation email when your payment is approved.',
        'payment.pending.info3': 'Once approved, you can log in and start using the platform.',
        'payment.pending.button': 'Back to Home',
    }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('es')

    const t = (key: string): string => {
        const esTranslations = translations['es'] as Record<string, string>
        const enTranslations = translations['en'] as Record<string, string>
        const currentTranslations = language === 'es' ? esTranslations : enTranslations
        return currentTranslations[key] || key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider')
    }
    return context
}
