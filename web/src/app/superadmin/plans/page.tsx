'use client'

import { useEffect, useState } from 'react'
import {
    CreditCard,
    Search,
    Edit3,
    X,
    Loader2,
    Check,
    Settings,
    Building2,
    Trophy,
    Target,
    Zap
} from 'lucide-react'

interface Organization {
    id: string
    name: string
    subscriptionPlan: string
    subscriptionStatus: string
    maxTables: number
    maxUsers: number
}

interface PlanDefinition {
    id: string
    slug: string
    name: string
    price: number
    maxTables: number
    maxUsers: number
    features: string[]
}

export default function PlansManagementPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [globalPlans, setGlobalPlans] = useState<PlanDefinition[]>([])
    const [activeTab, setActiveTab] = useState<'orgs' | 'global'>('orgs')
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Edit state for Orgs
    const [editingOrgId, setEditingOrgId] = useState<string | null>(null)
    const [editOrgForm, setEditOrgForm] = useState<Partial<Organization>>({})

    // Edit state for Global Plans
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
    const [editPlanForm, setEditPlanForm] = useState<Partial<PlanDefinition>>({})

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        initData()
    }, [])

    const initData = async () => {
        setLoading(true)
        try {
            const [orgsRes, plansRes] = await Promise.all([
                fetch('/api/superadmin/organizations'),
                fetch('/api/superadmin/plans')
            ])
            if (orgsRes.ok) setOrganizations(await orgsRes.json())
            if (plansRes.ok) setGlobalPlans(await plansRes.json())
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveOrg = async () => {
        if (!editingOrgId) return
        setSaving(true)
        try {
            const res = await fetch(`/api/superadmin/organizations/${editingOrgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editOrgForm)
            })
            if (res.ok) {
                const updated = await res.json()
                setOrganizations(organizations.map(o => o.id === editingOrgId ? updated : o))
                setEditingOrgId(null)
            }
        } catch (error) {
            console.error('Error saving org plan:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveGlobalPlan = async () => {
        if (!editingPlanId) return
        setSaving(true)
        try {
            const res = await fetch(`/api/superadmin/plans/${editingPlanId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editPlanForm)
            })
            if (res.ok) {
                const updated = await res.json()
                setGlobalPlans(globalPlans.map(p => p.id === editingPlanId ? updated : p))
                setEditingPlanId(null)
            }
        } catch (error) {
            console.error('Error saving global plan:', error)
        } finally {
            setSaving(false)
        }
    }

    const filteredOrgs = organizations.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="animate-spin text-orange-600" size={48} />
            <p className="text-slate-500 font-medium">Cargando configuración...</p>
        </div>
    )

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestión de Planes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Controla los límites individuales y las definiciones globales del sistema.</p>
                </div>

                <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('orgs')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orgs' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Por Restaurante
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'global' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Config. Global
                    </button>
                </div>
            </div>

            {activeTab === 'orgs' ? (
                <div className="space-y-6">
                    {/* Search Orgs */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar restaurante..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-semibold placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrgs.map((org) => (
                            <div key={org.id} className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${editingOrgId === org.id ? 'border-orange-500 ring-1 ring-orange-500 shadow-lg' : 'border-slate-300 dark:border-slate-800 shadow-sm'}`}>
                                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{org.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: {org.id.split('-')[0]}...</p>
                                        </div>
                                    </div>

                                    {editingOrgId === org.id ? (
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1 block">Plan</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white"
                                                    value={editOrgForm.subscriptionPlan}
                                                    onChange={(e) => setEditOrgForm({ ...editOrgForm, subscriptionPlan: e.target.value })}
                                                >
                                                    {globalPlans.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                                                    <option value="custom">Personalizado</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1 block">Mesas Máx</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white"
                                                    value={editOrgForm.maxTables}
                                                    onChange={(e) => setEditOrgForm({ ...editOrgForm, maxTables: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1 block">Usuarios Máx</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white"
                                                    value={editOrgForm.maxUsers}
                                                    onChange={(e) => setEditOrgForm({ ...editOrgForm, maxUsers: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <button
                                                    onClick={handleSaveOrg}
                                                    disabled={saving}
                                                    className="flex-1 bg-green-600 text-white rounded-lg p-2.5 hover:bg-green-700 transition-colors flex items-center justify-center shadow-sm"
                                                >
                                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                                </button>
                                                <button
                                                    onClick={() => setEditingOrgId(null)}
                                                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg p-2.5 hover:bg-slate-200 transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-700"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Plan</p>
                                                    <p className="font-black text-slate-900 dark:text-white capitalize">{org.subscriptionPlan}</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Mesas</p>
                                                    <p className="font-black text-slate-900 dark:text-white">{org.maxTables}</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Usuarios</p>
                                                    <p className="font-black text-slate-900 dark:text-white">{org.maxUsers}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingOrgId(org.id)
                                                    setEditOrgForm({ ...org })
                                                }}
                                                className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all border border-slate-300 dark:border-slate-700 shadow-sm"
                                            >
                                                <Edit3 size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {globalPlans.map((plan) => (
                        <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
                            <div className="p-8 pb-4">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-2xl ${plan.slug === 'basic' ? 'bg-blue-100 text-blue-600' :
                                        plan.slug === 'professional' ? 'bg-orange-100 text-orange-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                        {plan.slug === 'basic' ? <Zap size={24} /> :
                                            plan.slug === 'professional' ? <Target size={24} /> : <Trophy size={24} />}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingPlanId(plan.id)
                                            setEditPlanForm({ ...plan })
                                        }}
                                        className="text-slate-400 hover:text-orange-600 transition-colors"
                                    >
                                        <Settings size={20} />
                                    </button>
                                </div>

                                {editingPlanId === plan.id ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            className="w-full text-2xl font-black bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-orange-500 text-slate-900 dark:text-white px-3"
                                            value={editPlanForm.name}
                                            onChange={(e) => setEditPlanForm({ ...editPlanForm, name: e.target.value })}
                                        />
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-slate-600 dark:text-slate-400 font-bold text-xl">$</span>
                                            <input
                                                type="number"
                                                className="w-full text-3xl font-black bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-orange-500 text-slate-900 dark:text-white px-3"
                                                value={editPlanForm.price}
                                                onChange={(e) => setEditPlanForm({ ...editPlanForm, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-4xl font-black text-slate-900 dark:text-white">
                                                ${plan.price.toLocaleString()}
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">/mes</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="p-8 space-y-4 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Límites del Plan</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-300 dark:border-slate-700">
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-300">Mesas Máximas</span>
                                        {editingPlanId === plan.id ? (
                                            <input
                                                type="number"
                                                className="w-24 bg-white dark:bg-slate-700 border-2 border-slate-400 dark:border-slate-500 rounded-lg text-sm font-black text-right py-1 px-2 text-slate-900 dark:text-white"
                                                value={editPlanForm.maxTables}
                                                onChange={(e) => setEditPlanForm({ ...editPlanForm, maxTables: parseInt(e.target.value) })}
                                            />
                                        ) : (
                                            <span className="text-lg font-black text-slate-900 dark:text-white">{plan.maxTables}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-300 dark:border-slate-700">
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-300">Usuarios Máximos</span>
                                        {editingPlanId === plan.id ? (
                                            <input
                                                type="number"
                                                className="w-24 bg-white dark:bg-slate-700 border-2 border-slate-400 dark:border-slate-500 rounded-lg text-sm font-black text-right py-1 px-2 text-slate-900 dark:text-white"
                                                value={editPlanForm.maxUsers}
                                                onChange={(e) => setEditPlanForm({ ...editPlanForm, maxUsers: parseInt(e.target.value) })}
                                            />
                                        ) : (
                                            <span className="text-lg font-black text-slate-900 dark:text-white">{plan.maxUsers}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {editingPlanId === plan.id && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 mt-auto border-t border-slate-200 dark:border-slate-700 flex gap-2">
                                    <button
                                        onClick={handleSaveGlobalPlan}
                                        disabled={saving}
                                        className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                        Guardar Cambios
                                    </button>
                                    <button
                                        onClick={() => setEditingPlanId(null)}
                                        className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-3 rounded-xl border border-slate-200 dark:border-slate-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
