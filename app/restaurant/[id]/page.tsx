'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getCurrentRestaurant } from '@/lib/storage'
import type { Restaurant } from '@/lib/types'
import {
  Send, Package, CheckCircle, Truck,
  RefreshCw, Loader2, DollarSign, Bell, Calendar as CalendarIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/* ── Types ─────────────────────────────────────────────────── */
type OrderStatus = 'pending' | 'sent' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered'

interface OrderRow {
  id: string
  status: OrderStatus
  restaurant_id: string
  livreur_id: string | null
  customer_name: string
  customer_phone: string
  customer_address: string
  items: {
  id?: string;
  name: string;
  quantity: number;
  qty?: number;
  price: number;
  emoji?: string;
  spice_level?: string;
  drinks?: string[];
  note?: string;
  }[]
  total: number
  created_at: string
  updated_at: string
}

interface LivreurRow {
  id: string
  nom: string
  restaurant_id: string
  is_available: boolean
  created_at: string
}

/* ── Devises ────────────────────────────────────────────────── */
const CURRENCIES = [
  { code: 'EUR', symbol: '€',    label: 'Euro (€)'            },
  { code: 'USD', symbol: '$',    label: 'Dollar US ($)'       },
  { code: 'XOF', symbol: 'FCFA', label: 'Franc CFA (FCFA)'   },
  { code: 'MAD', symbol: 'DH',   label: 'Dirham (DH)'        },
  { code: 'DZD', symbol: 'DA',   label: 'Dinar algérien (DA)' },
  { code: 'TND', symbol: 'DT',   label: 'Dinar tunisien (DT)' },
  { code: 'GBP', symbol: '£',    label: 'Livre sterling (£)'  },
  { code: 'CAD', symbol: 'CA$',  label: 'Dollar canadien'     },
  { code: 'GNF', symbol: 'FG',   label: 'Franc guinéen (FG)'  },
  { code: 'SEN', symbol: 'FCFA', label: 'CFA Sénégal'         },
]

const CURRENCY_KEY = 'restaurant_currency'
function getCurrency(): string {
  if (typeof window === 'undefined') return 'EUR'
  return localStorage.getItem(CURRENCY_KEY) || 'EUR'
}
function saveCurrency(code: string) {
  if (typeof window !== 'undefined') localStorage.setItem(CURRENCY_KEY, code)
}

/* ── StatusBadge ────────────────────────────────────────────── */
function statusConfig(status: OrderStatus) {
  switch (status) {
    case 'pending':    return { label: 'En attente',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500'  }
    case 'sent':       return { label: 'Envoyé',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       dot: 'bg-blue-500'   }
    case 'accepted':   return { label: 'Accepté',     color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',   dot: 'bg-indigo-500' }
    case 'picked_up':  return { label: 'Récupéré',    color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',   dot: 'bg-violet-500' }
    case 'on_the_way': return { label: 'En route',     color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',         dot: 'bg-sky-500'    }
    case 'delivered':  return { label: 'Livré',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500'}
    default:           return { label: status,        color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',       dot: 'bg-gray-400'   }
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = statusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════
    PAGE PRINCIPALE
══════════════════════════════════════════════════════════════ */
export default function RestaurantOrdersPage() {
  const router = useRouter()

  const [restaurant,           setRestaurant]           = useState<Restaurant | null>(null)
  const [orders,               setOrders]               = useState<OrderRow[]>([])
  const [livreurs,             setLivreurs]             = useState<LivreurRow[]>([])
  
  const [isCurrencyOpen,       setIsCurrencyOpen]       = useState(false)
  const [isLoading,            setIsLoading]            = useState(true)
  const [isActionLoading,      setIsActionLoading]      = useState<string | null>(null)
  
  const [currency,             setCurrency]             = useState('EUR')
  const [date,                 setDate]                 = useState<Date | undefined>(new Date())

  useEffect(() => { setCurrency(getCurrency()) }, [])

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || currency
  const fmt = (n: number) => `${n.toFixed(2)} ${currencySymbol}`

  /* ── Chargement ── */
  const loadData = useCallback(async () => {
    const current = getCurrentRestaurant()
    if (!current) { router.push('/restaurant/login'); return }
    try {
      const { data: restData, error: restError } = await supabase
        .from('restaurants').select('*').eq('id', current.id).single()
      if (restError || !restData) { router.push('/restaurant/login'); return }
      setRestaurant(restData)

      let query = supabase.from('orders').select('*').eq('restaurant_id', current.id)
      
      if (date) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)
        
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
      }

      const { data: ordersData } = await query.order('created_at', { ascending: false })
      setOrders((ordersData || []) as OrderRow[])

      const { data: livreursData } = await supabase
        .from('livreurs').select('*')
        .eq('restaurant_id', current.id)
        .order('created_at', { ascending: true })
      setLivreurs((livreursData || []) as LivreurRow[])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [router, date])

  /* ── Realtime ── */
  useEffect(() => {
    loadData()
    const current = getCurrentRestaurant()
    if (!current) return
    const channel = supabase
      .channel(`orders_restaurant_${current.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${current.id}`
      }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  /* ── Envoyer au livreur (Round-Robin) ── */
  const handleSendToLivreur = async (orderId: string) => {
    if (!restaurant) return
    if (livreurs.length === 0) {
      alert('Aucun livreur disponible.')
      return
    }
    setIsActionLoading(orderId)
    try {
      const { data: recentOrders } = await supabase
        .from('orders').select('livreur_id, updated_at')
        .eq('restaurant_id', restaurant.id)
        .in('status', ['sent', 'accepted', 'picked_up', 'on_the_way'])
        .not('livreur_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)

      const lastLivreurId = recentOrders?.[0]?.livreur_id ?? null
      const lastIndex = lastLivreurId ? livreurs.findIndex(l => l.id === lastLivreurId) : -1
      const nextIndex = (lastIndex + 1) % livreurs.length
      const nextLivreur = livreurs[nextIndex]

      const { error } = await supabase.from('orders').update({
        status: 'sent',
        livreur_id: nextLivreur.id,
        updated_at: new Date().toISOString(),
      }).eq('id', orderId)
      if (error) throw error
      await loadData()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    } finally {
      setIsActionLoading(null)
    }
  }

  const getLivreurName = (id: string | null) =>
    id ? (livreurs.find(l => l.id === id)?.nom || 'Inconnu') : 'Non assigné'

  const pendingOrders   = orders.filter(o => o.status === 'pending')
  const activeOrders    = orders.filter(o => ['sent','accepted','picked_up','on_the_way'].includes(o.status))
  const completedOrders = orders.filter(o => o.status === 'delivered')
  const todayRevenue    = completedOrders.reduce((s, o) => s + o.total, 0)

  /* ── Loading ── */
  if (isLoading && !restaurant) return (
    <div className="flex items-center justify-center flex-1 min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#FF7A00] flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="text-sm font-semibold text-gray-400">Chargement…</p>
      </div>
    </div>
  )
  if (!restaurant) return null

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9FA] min-h-screen overflow-y-auto">

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 sm:px-7 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Commandes</h1>
          <p className="text-xs text-gray-400 font-medium">{restaurant.nom} · {restaurant.ville}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Badge alertes */}
          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-black text-amber-700 hidden sm:inline">{pendingOrders.length} en attente</span>
              <span className="text-xs font-black text-amber-700 sm:hidden">{pendingOrders.length}</span>
            </div>
          )}

          {/* Option Calendrier Filtrage de Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-8 justify-start text-left font-bold border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs rounded-xl',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                {date ? format(date, 'dd MMM yyyy', { locale: fr }) : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={fr} />
            </PopoverContent>
          </Popover>

          {/* Devise */}
          <Dialog open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-xs font-bold transition-all duration-200 border border-gray-200">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currencySymbol}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xs rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-bold">Devise</DialogTitle>
                <DialogDescription className="text-sm">Symbole affiché — aucune conversion.</DialogDescription>
              </DialogHeader>
              <div className="mt-3 space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Choisir la devise</Label>
                <Select value={currency} onValueChange={val => { setCurrency(val); saveCurrency(val); setIsCurrencyOpen(false) }}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-mono font-bold mr-2">{c.symbol}</span>{c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogContent>
          </Dialog>

          {/* Actualiser */}
          <button
            onClick={loadData}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 border border-gray-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── CONTENU ── */}
      <div className="flex-1 p-4 sm:p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'En attente',   value: pendingOrders.length,   sub: 'commandes', accent: '#F59E0B', bg: 'bg-amber-50',  border: 'border-amber-100' },
            { label: 'En livraison', value: activeOrders.length,    sub: 'actives',   accent: '#3B82F6', bg: 'bg-blue-50',    border: 'border-blue-100'  },
            { label: 'Livrées',      value: completedOrders.length, sub: 'total',     accent: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-100'},
            { label: 'CA livré',     value: fmt(todayRevenue),      sub: 'encaissé',  accent: '#FF7A00', bg: 'bg-orange-50',  border: 'border-orange-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-xl sm:text-2xl font-black" style={{ color: s.accent }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── EN ATTENTE ── */}
        {pendingOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-amber-500" />
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                À traiter <span className="text-amber-500">({pendingOrders.length})</span>
              </h2>
            </div>
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <div key={order.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-lg">
                        N° {order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>

                    <p className="text-sm font-bold text-gray-900">
                      {order.customer_name}
                      <span className="font-normal text-gray-400"> · {order.customer_phone}</span>
                    </p>
                    
                    <p className="text-xs text-gray-400 truncate">{order.customer_address}</p>

                    {/* ─── EN ATTENTE : BOUCLE SUR LES MENUS COMMANDÉS ─── */}
                    <div className="bg-gray-50 rounded-xl p-3 my-2 space-y-1 border border-gray-100">
                      {order.items && order.items.length > 0 ? (
                          order.items.map((item, index) => (
  <div key={index} className="space-y-0.5">
    <div className="flex items-center justify-between text-xs">
      <p className="text-gray-700 font-medium">
        <span className="text-[#FF7A00] font-black mr-1.5">{item.quantity}x</span>
        {item.emoji && <span className="mr-1">{item.emoji}</span>}
        {item.name}
      </p>
      <p className="text-gray-400 font-mono">{fmt(item.price * item.quantity)}</p>
    </div>

    {/* ✅ Niveau d'épice */}
    {item.spice_level && item.spice_level !== 'none' && (
      <p className="text-[11px] text-orange-500 font-bold pl-5">
        ↳ {item.spice_level === 'mild' ? '🌶️ Doux' : item.spice_level === 'medium' ? '🌶️🌶️ Moyen' : '🌶️🌶️🌶️ Épicé'}
      </p>
    )}

    {/* ✅ Boissons incluses */}
    {item.drinks && item.drinks.length > 0 && (
      <p className="text-[11px] text-emerald-600 font-bold pl-5">
        ↳ 🥤 {item.drinks.join(', ')}
      </p>
    )}

    {/* ✅ Note spéciale */}
    {item.note && (
      <p className="text-[11px] text-blue-500 font-medium pl-5 italic">
        ↳ 📝 {item.note}
      </p>
    )}
  </div>
))
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">Aucun article enregistré</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-gray-900">Total : {fmt(order.total)}</p>
                      <span className="text-gray-200">·</span>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendToLivreur(order.id)}
                    disabled={isActionLoading === order.id}
                    className="w-full lg:w-auto flex items-center justify-center gap-2 h-10 px-5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 hover:-translate-y-0.5 disabled:opacity-50 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #FF7A00, #E06000)', boxShadow: '0 3px 10px rgba(255,122,0,0.3)' }}
                  >
                    {isActionLoading === order.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Attribution…</>
                      : <><Send className="w-3.5 h-3.5" />Envoyer au livreur</>
                    }
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── LIVRAISONS ACTIVES ── */}
        {activeOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                En livraison <span className="text-blue-500">({activeOrders.length})</span>
              </h2>
            </div>
            <div className="space-y-3">
              {activeOrders.map(order => (
                <div key={order.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-200 transition-all shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-lg">
                          N° {order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm font-bold text-gray-800">{order.customer_name}</p>
                      
                      {/* ─── NOUVEAU : BOUCLE SUR LES ARTICLES ÉGALEMENT EN LIVRAISON ACTIVE ─── */}
                      <div className="bg-gray-50 rounded-xl p-3 my-2 space-y-1 border border-gray-100">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <p className="text-gray-700 font-medium">
                                <span className="text-[#FF7A00] font-black mr-1.5">{item.quantity}x</span> 
                                {item.name}
                              </p>
                              <p className="text-gray-400 font-mono">{fmt(item.price * item.quantity)}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">Aucun article enregistré</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-gray-150 border border-gray-200 rounded-lg px-2 py-1 w-fit">
                        <span className="text-[10px] text-gray-400 font-medium">Livreur ·</span>
                        <span className="text-[10px] text-gray-700 font-bold">{getLivreurName(order.livreur_id)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-12 sm:pl-0 sm:self-center">
                    <p className="text-base font-black text-gray-900">{fmt(order.total)}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(order.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── HISTORIQUE ── */}
        {completedOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                Dernières livraisons <span className="text-emerald-500">({completedOrders.length})</span>
              </h2>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {completedOrders.slice(0, 10).map((order, i) => (
                <div key={order.id}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${i < Math.min(completedOrders.length, 10) - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-500 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400 truncate">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-black text-emerald-700">{fmt(order.total)}</p>
                    <p className="text-[10px] text-gray-300">
                      {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── VIDE ── */}
        {orders.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
              <Package className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Aucune commande</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Aucune commande enregistrée pour cette date.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}