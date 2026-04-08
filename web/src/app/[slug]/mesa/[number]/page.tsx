'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UtensilsCrossed, ArrowRight, Loader2, Lock, ShieldCheck, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { getSecurityStatus, validateSecurityCode } from './actions'

export default function CustomerWelcomePage() {
    const { t } = useLanguage()
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [orgInfo, setOrgInfo] = useState<{ name: string; securityEnabled?: boolean } | null>(null)
    const [securityRequired, setSecurityRequired] = useState(false)
    const [code, setCode] = useState('')
    const [validating, setValidating] = useState(false)
    const [error, setError] = useState(false)

    const slug = params.slug as string
    const tableNumber = params.number as string

    useEffect(() => {
        const init = async () => {
            try {
                const [orgRes, secStatus] = await Promise.all([
                    fetch(`/api/organization?slug=${slug}`),
                    getSecurityStatus(slug, tableNumber)
                ])

                if (orgRes.ok) {
                    setOrgInfo(await orgRes.json())
                }

                if (secStatus.activeOrderId) {
                    router.push(`/${slug}/mesa/${tableNumber}/status`)
                    return
                }

                setSecurityRequired(secStatus.required)
            } catch (error) {
                console.error('Error initialization:', error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [slug, tableNumber, router])

    const handleValidate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code) return

        setValidating(true)
        setError(false)
        try {
            const res = await validateSecurityCode(slug, code)
            if (res.success) {
                setSecurityRequired(false)
            } else {
                setError(true)
            }
        } catch (err) {
            setError(true)
        } finally {
            setValidating(false)
        }
    }

    const startOrder = () => {
        router.push(`/${slug}/mesa/${tableNumber}/menu`)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-orange-600">
                <Loader2 className="animate-spin text-white" size={48} />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-6 text-center bg-gradient-to-br from-orange-500 to-orange-700 text-white">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-4">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto shadow-xl">
                        <UtensilsCrossed size={48} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            {orgInfo?.name ? `${t('customer.welcome')} ${orgInfo.name}` : t('customer.welcome')}
                        </h1>
                        <p className="text-xl opacity-90 font-medium mt-2">
                            {t('common.table')} {tableNumber}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {securityRequired ? (
                        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-3xl border border-white/20 space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center gap-2 mb-2">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-lg font-bold">Seguridad Activada</h3>
                                <p className="text-sm opacity-80">Por favor ingrese el código de activación para continuar con un nuevo pedido hoy.</p>
                            </div>

                            <form onSubmit={handleValidate} className="space-y-4">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Código de seguridad"
                                    className="w-full py-4 bg-white/20 border-2 border-white/30 rounded-2xl text-center text-2xl font-bold placeholder:text-white/40 focus:bg-white/30 focus:border-white outline-none transition-all"
                                />
                                {error && (
                                    <div className="flex items-center justify-center gap-2 text-white bg-red-500/30 py-2 rounded-xl text-sm animate-bounce">
                                        <AlertCircle size={16} />
                                        <span>Código incorrecto</span>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={validating || !code}
                                    className="w-full py-4 bg-white text-orange-600 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
                                >
                                    {validating ? <Loader2 className="animate-spin" size={24} /> : (
                                        <>
                                            Validar Código
                                            <ShieldCheck size={24} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            <p className="text-lg opacity-80 leading-relaxed">
                                {t('customer.start_instruction')}
                            </p>
                            <button
                                onClick={startOrder}
                                className="w-full py-4 bg-white text-orange-600 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                {t('customer.start_button')}
                                <ArrowRight size={24} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
