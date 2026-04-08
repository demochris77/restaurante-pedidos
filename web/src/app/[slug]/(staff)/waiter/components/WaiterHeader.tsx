import { ChevronLeft, ClipboardList, QrCode } from 'lucide-react'

interface Table {
    id: string
    number: string
    capacity: number
    status: string
}

interface WaiterHeaderProps {
    selectedTable: Table | null
    setSelectedTable: (table: Table | null) => void
    setCart: (cart: any[]) => void
    setActiveOrderId: (id: string | null) => void
    setOrderNote: (note: string) => void
    t: any
    router: any
    slug: string
    setIsMenuQRModalOpen: (isOpen: boolean) => void
}

export const WaiterHeader: React.FC<WaiterHeaderProps> = ({
    selectedTable,
    setSelectedTable,
    setCart,
    setActiveOrderId,
    setOrderNote,
    t,
    router,
    slug,
    setIsMenuQRModalOpen
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-16 z-10 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {selectedTable ? (
                        <button
                            onClick={() => {
                                setSelectedTable(null)
                                setActiveOrderId(null)
                                setCart([])
                                setOrderNote('')
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ChevronLeft className="text-slate-600 dark:text-slate-400" />
                        </button>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <ClipboardList className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                            {selectedTable
                                ? `${t('common.table')} ${selectedTable.number}`
                                : t('waiter.title')}
                        </h2>
                        {selectedTable && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('waiter.select_dishes')}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push(`/${slug}/tables`)}
                        className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                        title="QR Mesas"
                    >
                        <QrCode size={18} />
                        <span className="">{t('waiter.tables_qr') || 'QR Mesas'}</span>
                    </button>
                    <button
                        onClick={() => setIsMenuQRModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                        title="QR Menú"
                    >
                        <QrCode size={18} />
                        <span className="">{t('waiter.menu_qr') || 'QR Menú'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
