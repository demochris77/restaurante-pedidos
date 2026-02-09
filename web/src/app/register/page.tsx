'use client'

import { useState, useEffect, useCallback } from 'react'
import { PublicNavbar } from '@/components/public/navbar'
import { PublicFooter } from '@/components/public/footer'
import { Container } from '@/components/ui/container'
import { useLanguage } from '@/components/providers/language-provider'
import { ArrowRight, ArrowLeft, Check, Building2, User, CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { googleAuthenticate, logoutAction } from '@/app/lib/actions'
import { useSession, signOut } from 'next-auth/react'

type Step = 1 | 2 | 3 | 4

export default function RegisterPage() {
    const { t } = useLanguage()
    const { data: session } = useSession()
    const [currentStep, setCurrentStep] = useState<Step>(1)
    const [errors, setErrors] = useState<string[]>([])
    const [formData, setFormData] = useState({
        // Step 1: Restaurant Info
        restaurantName: '',
        slug: '',
        contactEmail: '',

        // Step 2: Admin Info
        adminName: '',
        username: '',
        password: '',
        confirmPassword: '',

        // Step 3: Plan Selection
        selectedPlan: 'professional'
    })

    // Pre-fill from Google session
    useEffect(() => {
        if (session?.user && !session.user.organizationId) {
            setFormData(prev => ({
                ...prev,
                adminName: session.user.name || prev.adminName,
                contactEmail: session.user.email || prev.contactEmail,
                // Use email as username for Google users by default
                username: session.user.email || prev.username,
            }))
        }
    }, [session])

    // Clear form when sign out
    useEffect(() => {
        if (!session) {
            setFormData({
                restaurantName: '',
                slug: '',
                contactEmail: '',
                adminName: '',
                username: '',
                password: '',
                confirmPassword: '',
                selectedPlan: 'professional'
            })
            setAvailability({
                slug: { checking: false, available: null },
                email: { checking: false, available: null },
                username: { checking: false, available: null }
            })
            setErrors([])
        }
    }, [session])

    // Availability checking state
    const [availability, setAvailability] = useState({
        slug: { checking: false, available: null as boolean | null },
        email: { checking: false, available: null as boolean | null },
        username: { checking: false, available: null as boolean | null }
    })

    // Debounced availability check
    const checkAvailability = useCallback(async (type: 'slug' | 'email' | 'username', value: string) => {
        if (!value || value.length < 3) {
            setAvailability(prev => ({
                ...prev,
                [type]: { checking: false, available: null }
            }))
            return
        }

        setAvailability(prev => ({
            ...prev,
            [type]: { checking: true, available: null }
        }))

        try {
            const response = await fetch('/api/check-availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, value: value.toLowerCase() })
            })

            const data = await response.json()

            setAvailability(prev => ({
                ...prev,
                [type]: { checking: false, available: data.available }
            }))
        } catch (error) {
            console.error(`Error checking ${type} availability:`, error)
            setAvailability(prev => ({
                ...prev,
                [type]: { checking: false, available: null }
            }))
        }
    }, [])

    // Debounce effect for slug
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.slug) {
                checkAvailability('slug', formData.slug)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData.slug, checkAvailability])

    // Debounce effect for email
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.contactEmail) {
                checkAvailability('email', formData.contactEmail)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData.contactEmail, checkAvailability])

    // Debounce effect for username
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.username) {
                checkAvailability('username', formData.username)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData.username, checkAvailability])

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear errors when user starts typing
        setErrors([])
    }

    const validateStep = (step: Step): boolean => {
        const newErrors: string[] = []

        if (step === 1) {
            if (!formData.restaurantName.trim()) newErrors.push(t('register.step1.name'))
            if (!formData.slug.trim()) newErrors.push(t('register.step1.slug'))
            if (!formData.contactEmail.trim()) newErrors.push(t('register.step1.email'))
            // Email validation
            if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
                newErrors.push(t('register.validation.invalidEmail'))
            }
        }

        if (step === 2) {
            // If authenticated via Google, we skip password/username validation
            if (session?.user) return true

            if (!formData.adminName.trim()) newErrors.push(t('register.step2.fullName'))
            if (!formData.username.trim()) newErrors.push(t('register.step2.username'))
            if (!formData.password) newErrors.push(t('register.step2.password'))
            if (!formData.confirmPassword) newErrors.push(t('register.step2.confirmPassword'))
            // Password match validation
            if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
                newErrors.push(t('register.validation.passwordMismatch'))
            }
            // Password length validation
            if (formData.password && formData.password.length < 6) {
                newErrors.push(t('register.validation.passwordLength'))
            }
        }

        setErrors(newErrors)
        return newErrors.length === 0
    }

    const nextStep = () => {
        if (validateStep(currentStep)) {
            if (currentStep < 4) setCurrentStep((currentStep + 1) as Step)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep((currentStep - 1) as Step)
    }

    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            // Call API to create Mercado Pago payment preference
            const response = await fetch('/api/create-payment-preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plan: formData.selectedPlan,
                    restaurantName: formData.restaurantName,
                    slug: formData.slug,
                    contactEmail: formData.contactEmail,
                    adminName: formData.adminName,
                    username: formData.username,
                    password: formData.password,
                }),
            })

            const data = await response.json()

            if (response.ok && data.initPoint) {
                // Redirect to Mercado Pago Checkout
                window.location.href = data.initPoint
            } else {
                console.error('Error creating payment preference:', data.error)
                alert('Error al crear la preferencia de pago. Por favor intenta nuevamente.')
                setSubmitting(false)
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al procesar el registro. Por favor intenta nuevamente.')
            setSubmitting(false)
        }
    }

    const steps = [
        { number: 1, icon: Building2, label: t('register.step.restaurant') },
        { number: 2, icon: User, label: t('register.step.admin') },
        { number: 3, icon: CreditCard, label: t('register.step.plan') },
        { number: 4, icon: Check, label: t('register.step.confirm') }
    ]

    const plans = [
        { id: 'basic', name: 'Starter', price: 60000, description: t('pricing.starter.description') },
        { id: 'professional', name: 'Professional', price: 100000, description: t('pricing.professional.description') },
        { id: 'enterprise', name: 'Enterprise', price: 400000, description: t('pricing.enterprise.description') }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <PublicNavbar />

            <section className="py-12">
                <Container>
                    <div className="max-w-3xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
                                {t('register.title')}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300">
                                {t('register.subtitle')}
                            </p>
                            {session?.user && (
                                <button
                                    onClick={() => signOut({ callbackUrl: '/register' })}
                                    className="mt-4 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-500 underline"
                                >
                                    {t('login.logout')} ({session.user.name})
                                </button>
                            )}
                        </div>

                        {/* Progress Steps */}
                        <div className="flex justify-between mb-8">
                            {steps.map((step) => (
                                <div key={step.number} className="flex flex-col items-center flex-1">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${currentStep >= step.number
                                        ? 'bg-orange-600 dark:bg-orange-500 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                        <step.icon size={20} />
                                    </div>
                                    <span className={`text-xs font-medium ${currentStep >= step.number
                                        ? 'text-orange-600 dark:text-orange-500'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Form Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">

                            <div className="mb-6">
                                {/* Google Social Login - Hide if already logged in via Google */}
                                {!session?.user && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => googleAuthenticate('/register')}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
                                        >
                                            <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                                                <path
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                    fill="#4285F4"
                                                />
                                                <path
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                    fill="#34A853"
                                                />
                                                <path
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                    fill="#FBBC05"
                                                />
                                                <path
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                    fill="#EA4335"
                                                />
                                            </svg>
                                            Google
                                        </button>

                                        <div className="relative mt-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-slate-300 dark:border-slate-600" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-white dark:bg-slate-800 px-2 text-slate-500">
                                                    {t('login.orContinueWithEmail')}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Error Messages */}
                            {errors.length > 0 && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
                                        {t('register.validation.completeFields')}
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                                        {errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Step 1: Restaurant Info */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                        {t('register.step1.title')}
                                    </h2>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            {t('register.step1.name')} {t('register.required')}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.restaurantName}
                                            onChange={(e) => updateField('restaurantName', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder={t('register.step1.namePlaceholder')}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            {t('register.step1.slug')} {t('register.required')}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 dark:text-slate-400">app.hamelinfoods.com/</span>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={formData.slug}
                                                    onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                    className="w-full px-4 py-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                    placeholder={t('register.step1.slugPlaceholder')}
                                                />
                                                {availability.slug.checking && (
                                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={18} />
                                                )}
                                                {!availability.slug.checking && availability.slug.available === true && (
                                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                                                )}
                                                {!availability.slug.checking && availability.slug.available === false && (
                                                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                                                )}
                                            </div>
                                        </div>
                                        {availability.slug.available === false && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('register.validation.slugTaken')}</p>
                                        )}
                                        {availability.slug.available === true && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('register.validation.available')}</p>
                                        )}
                                        {!availability.slug.checking && !availability.slug.available && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {t('register.step1.slugHint')}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            {t('register.step1.email')} {t('register.required')}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={formData.contactEmail}
                                                onChange={(e) => updateField('contactEmail', e.target.value)}
                                                className="w-full px-4 py-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                placeholder={t('register.step1.emailPlaceholder')}
                                            />
                                            {availability.email.checking && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={18} />
                                            )}
                                            {!availability.email.checking && availability.email.available === true && (
                                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                                            )}
                                            {!availability.email.checking && availability.email.available === false && (
                                                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                                            )}
                                        </div>
                                        {availability.email.available === false && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('register.validation.emailTaken')}</p>
                                        )}
                                        {availability.email.available === true && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('register.validation.available')}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Admin Info */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                        {t('register.step2.title')}
                                    </h2>

                                    {session?.user ? (
                                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                                            <div className="flex items-center gap-3">
                                                {session.user.image && (
                                                    <img src={session.user.image} alt="" className="h-10 w-10 rounded-full" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                                                        Autenticado con Google
                                                    </p>
                                                    <p className="text-xs text-orange-700 dark:text-orange-300">
                                                        {session.user.name} ({session.user.email})
                                                    </p>
                                                    <button
                                                        onClick={() => signOut({ callbackUrl: '/register' })}
                                                        className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline mt-1"
                                                    >
                                                        Cerrar Sesión
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            {t('register.step2.fullName')} {t('register.required')}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.adminName}
                                            onChange={(e) => updateField('adminName', e.target.value)}
                                            disabled={!!session?.user}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-70 disabled:bg-slate-50 dark:disabled:bg-slate-800"
                                            placeholder={t('register.step2.fullNamePlaceholder')}
                                        />
                                    </div>

                                    {!session?.user && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    {t('register.step2.username')} {t('register.required')}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formData.username}
                                                        onChange={(e) => updateField('username', e.target.value)}
                                                        className="w-full px-4 py-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                        placeholder={t('register.step2.usernamePlaceholder')}
                                                    />
                                                    {availability.username.checking && (
                                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={18} />
                                                    )}
                                                    {!availability.username.checking && availability.username.available === true && (
                                                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                                                    )}
                                                    {!availability.username.checking && availability.username.available === false && (
                                                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                                                    )}
                                                </div>
                                                {availability.username.available === false && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('register.validation.usernameTaken')}</p>
                                                )}
                                                {availability.username.available === true && (
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('register.validation.available')}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    {t('register.step2.password')} {t('register.required')}
                                                </label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => updateField('password', e.target.value)}
                                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                    placeholder={t('register.step2.passwordPlaceholder')}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    {t('register.step2.confirmPassword')} {t('register.required')}
                                                </label>
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                    placeholder={t('register.step2.confirmPasswordPlaceholder')}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Plan Selection */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                        {t('register.step3.title')}
                                    </h2>

                                    <div className="space-y-4">
                                        {plans.map((plan) => (
                                            <div
                                                key={plan.id}
                                                onClick={() => updateField('selectedPlan', plan.id)}
                                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${formData.selectedPlan === plan.id
                                                    ? 'border-orange-500 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                                                        <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{plan.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-3xl font-black text-slate-900 dark:text-white">${plan.price}</div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">{t('register.step3.perMonth')}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Confirmation */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                        {t('register.step4.title')}
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{t('register.step4.restaurantSection')}</h3>
                                            <p className="text-slate-600 dark:text-slate-300">{formData.restaurantName}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">app.hamelinfoods.com/{formData.slug}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{formData.contactEmail}</p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{t('register.step4.adminSection')}</h3>
                                            <p className="text-slate-600 dark:text-slate-300">{formData.adminName}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('register.step4.usernameLabel')} {formData.username}</p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{t('register.step4.planSection')}</h3>
                                            <p className="text-slate-600 dark:text-slate-300">
                                                {plans.find(p => p.id === formData.selectedPlan)?.name} - ${plans.find(p => p.id === formData.selectedPlan)?.price}{t('register.step3.perMonth')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                {currentStep > 1 && (
                                    <button
                                        onClick={prevStep}
                                        className="flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <ArrowLeft size={20} />
                                        {t('register.button.previous')}
                                    </button>
                                )}

                                {currentStep < 4 ? (
                                    <button
                                        onClick={nextStep}
                                        className="ml-auto flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold transition-colors"
                                    >
                                        {t('register.button.next')}
                                        <ArrowRight size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="ml-auto flex items-center gap-2 px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-bold transition-colors shadow-lg"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                {t('modal.processing')}
                                            </>
                                        ) : (
                                            <>
                                                <Check size={20} />
                                                {t('register.button.create')}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Login Link */}
                        <p className="text-center mt-6 text-slate-600 dark:text-slate-400">
                            {t('register.hasAccount')}{' '}
                            <Link href="/login" className="text-orange-600 dark:text-orange-500 font-semibold hover:underline">
                                {t('register.loginLink')}
                            </Link>
                        </p>
                    </div>
                </Container>
            </section>

            <PublicFooter />
        </div>
    )
}
