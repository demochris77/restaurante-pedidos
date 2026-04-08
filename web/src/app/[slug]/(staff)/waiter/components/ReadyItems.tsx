'use client'

import React from 'react'
import { BellRing, CheckCircle2 } from 'lucide-react'

export interface ReadyItem {
    id: string
    quantity: number
    status?: string
    menuItem?: {
        name: string
    }
    order?: {
        tableNumber: string
    }
}

interface TableGroup {
    tableNumber: string
    items: ReadyItem[]
}

interface ItemStack {
    name: string
    totalQuantity: number
    items: ReadyItem[]
}

interface ReadyItemsProps {
    readyItems: ReadyItem[]
    t: (key: string, params?: Record<string, string | number>) => string
    handleServeAll: (items: ReadyItem[]) => void
    isSubmitting: boolean
}

export const ReadyItems: React.FC<ReadyItemsProps> = ({
    readyItems,
    t,
    handleServeAll,
    isSubmitting
}) => {
    if (readyItems.length === 0) return null

    const groupedByTable = Object.values(
        readyItems.reduce((acc: Record<string, TableGroup>, item: ReadyItem) => {
            const tableNumber = item.order?.tableNumber || '0'
            if (!acc[tableNumber]) acc[tableNumber] = { tableNumber, items: [] }
            acc[tableNumber].items.push(item)
            return acc
        }, {})
    )

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BellRing size={20} className="text-green-500" />
                {t('waiter.items_ready')}
                <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">
                    {readyItems.length}
                </span>
            </h3>
            <div className="space-y-3">
                {groupedByTable.map((tableGroup) => {
                    // Further group table items by name to stack them
                    const stackedItems = Object.values(
                        tableGroup.items.reduce((acc: Record<string, ItemStack>, item: ReadyItem) => {
                            const name = item.menuItem?.name || 'Unknown'
                            if (!acc[name]) {
                                acc[name] = {
                                    name,
                                    totalQuantity: 0,
                                    items: []
                                }
                            }
                            acc[name].totalQuantity += item.quantity
                            acc[name].items.push(item)
                            return acc
                        }, {})
                    )

                    return (
                        <div key={tableGroup.tableNumber} className="border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10 rounded-xl p-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-green-800 dark:text-green-400 text-sm">
                                    {t('common.table')} {tableGroup.tableNumber}
                                </span>
                                <button
                                    onClick={() => handleServeAll(tableGroup.items)}
                                    disabled={isSubmitting}
                                    className="text-xs font-bold uppercase bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                                >
                                    {t('waiter.serve_all') || 'Servir Todo'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {stackedItems.map((stack: any) => (
                                    <div key={stack.name} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                {stack.totalQuantity}x
                                            </span>
                                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                                {stack.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleServeAll(stack.items)}
                                            disabled={isSubmitting}
                                            className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm disabled:opacity-50"
                                            title={t('waiter.mark_served') || 'Marcar como servido'}
                                        >
                                            <CheckCircle2 size={24} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
