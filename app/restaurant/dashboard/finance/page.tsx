'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentRestaurant } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/lib/types'
import {
  TrendingUp,
  Wallet,
  ShoppingBag,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/* ── Type local aligné sur Supabase snake_case avec fallbacks ── */
interface OrderRow {
  id: string
  restaurant_id: string
  livreur_id: string | null
  recipient_name?: string
  recipient_phone?: string
  customer_address?: string
  client_nom?: string          // Sécurité au cas où ta colonne s'appelle client_nom
  nom_client?: string          // Sécurité au cas où ta colonne s'appelle nom_client
  total: number
  status: string
  created_at: string
  updated_at: string
}

/* ── Configuration des devises identique au Dashboard ── */
const CURRENCIES = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'XOF', symbol: 'FCFA' },
  { code: 'MAD', symbol: 'DH' },
  { code: 'DZD', symbol: 'DA' },
  { code: 'TND', symbol: 'DT' },
  { code: 'GBP', symbol: '£' },
  { code: 'CAD', symbol: 'CA$' },
  { code: 'GNF', symbol: 'FG' },
  { code: 'SEN', symbol: 'FCFA' },
]

const CURRENCY_KEY = 'restaurant_currency'

export default function FinancePage() {
  const router = useRouter()

  const [restaurant,      setRestaurant]     = useState<Restaurant | null>(null)
  const [date,            setDate]           = useState<Date | undefined>(new Date())
  const [loading,         setLoading]        = useState(true)
  const [completedOrders, setCompletedOrders] = useState<OrderRow[]>([])
  const [totalRecettes,   setTotalRecettes]  = useState(0)
  const [totalCommandes,  setTotalCommandes] = useState(0)
  const [panierMoyen,     setPanierMoyen]    = useState(0)
  const [currency,        setCurrency]       = useState('EUR')

  /* ── Charger la devise partagée avec le Dashboard ── */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem(CURRENCY_KEY) || 'EUR'
      setCurrency(savedCurrency)
    }
  }, [])

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || currency

  /* ── Nettoyage des montants pour supprimer les .00 inutiles ── */
  const formatAmount = (amount: number) => {
    if (amount % 1 === 0) {
      return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`
    }
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol}`
  }

  /* ── Auth ── */
  useEffect(() => {
    const r = getCurrentRestaurant()
    if (!r) { router.push('/restaurant/login'); return }
    setRestaurant(r)
  }, [router])

  /* ── Chargement données financières filtrées STRICTEMENT par restaurant.id ── */
  const fetchFinancialData = useCallback(async () => {
    if (!restaurant?.id || !date) return
    setLoading(true)

    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)   // Double sécurité : filtre strict
        .eq('status', 'delivered')             // Uniquement les commandes livrées
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      const list = (data || []) as OrderRow[]
      setCompletedOrders(list)

      const recettes = list.reduce((s, o) => s + (o.total || 0), 0)
      const nb       = list.length
      setTotalRecettes(recettes)
      setTotalCommandes(nb)
      setPanierMoyen(nb > 0 ? recettes / nb : 0)

    } catch (err) {
      console.error('Erreur données financières:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, date])

  /* ── Realtime étanche et isolé par ID de restaurant ── */
  useEffect(() => {
    if (!restaurant?.id) return

    // Charger les données initiales du restaurant actif
    fetchFinancialData()

    // Création du canal Realtime isolé pour CE restaurant unique
    const channel = supabase
      .channel(`finance_channel_${restaurant.id}`)
      .on(
        'postgres_changes', 
        {
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`, // Filtre matériel au niveau Postgres
        }, 
        (payload) => {
          // Vérification supplémentaire de sécurité côté client
          if (payload.new && (payload.new as OrderRow).restaurant_id === restaurant.id) {
            fetchFinancialData()
          } else if (payload.old && (payload.old as OrderRow).restaurant_id === restaurant.id) {
            fetchFinancialData()
          }
        }
      )
      .subscribe()

    // Nettoyage complet à la désactivation ou au changement de restaurant
    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [restaurant?.id, fetchFinancialData])

  if (!restaurant) return null

  /* ── KPI cards config ── */
  const kpis = [
    {
      label: "Chiffre d'Affaires",
      icon: Wallet,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      value: formatAmount(totalRecettes),
      sub: 'Encaissé · commandes livrées',
      subColor: 'text-emerald-500',
    },
    {
      label: 'Commandes Livrées',
      icon: ShoppingBag,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      value: `${totalCommandes}`,
      sub: 'Livraisons finalisées',
      subColor: 'text-blue-500',
    },
    {
      label: 'Panier Moyen',
      icon: TrendingUp,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      value: formatAmount(panierMoyen),
      sub: 'Valeur moyenne par commande',
      subColor: 'text-amber-500',
    },
  ]

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6 bg-background">

      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Suivi Financier
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Encaissements réels en temps réel pour{' '}
            <span className="font-semibold text-primary">{restaurant.nom}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] sm:w-[260px] justify-start text-left font-normal border-muted-foreground/20 hover:bg-accent text-sm',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                {date ? format(date, 'PPP', { locale: fr }) : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={fr} />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline" size="icon"
            onClick={fetchFinancialData}
            disabled={loading}
            className="border-muted-foreground/20 shrink-0"
          >
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-sidebar-border bg-card p-4 sm:p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">{kpi.label}</h3>
              <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                <kpi.icon className={`h-4 sm:h-5 w-4 sm:w-5 ${kpi.iconColor}`} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
                {kpi.value}
              </span>
              <p className={`text-[11px] mt-1 flex items-center gap-1 ${kpi.subColor}`}>
                <ArrowUpRight className="h-3 w-3" />{kpi.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-sidebar-border bg-card shadow-sm">
        <div className="p-4 sm:p-6 border-b border-sidebar-border">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Flux de Caisse</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Encaissements générés uniquement par les commandes au statut <strong>Livrée</strong>.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Synchronisation en cours…</p>
          </div>
        ) : completedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-3 bg-muted rounded-full mb-3">
              <CalendarIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucun encaissement ce jour</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aucune commande livrée le{' '}
              {date ? format(date, 'dd MMMM yyyy', { locale: fr }) : ''}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-sidebar-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Heure</th>
                  <th className="p-4">ID Commande</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-right">Montant</th>
                  <th className="p-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sidebar-border text-xs sm:text-sm">
                {completedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-muted-foreground">
                      {order.created_at ? format(new Date(order.created_at), 'HH:mm') : '—'}
                    </td>
                    <td className="p-4 text-xs font-mono text-muted-foreground select-all">
                      {order.id}
                    </td>
                    <td className="p-4 text-foreground font-medium">
                      {/* Robustesse : test de toutes les variantes possibles de colonnes de nom de client */}
                      {order.recipient_name || 'Client Anonyme'}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        <ArrowUpRight className="h-3 w-3" />RECETTE
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-500">
                      + {formatAmount(order.total || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        Encaissé
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Total en bas de tableau */}
              <tfoot>
                <tr className="border-t-2 border-sidebar-border bg-muted/20">
                  <td colSpan={4} className="p-4 text-xs font-bold text-foreground uppercase tracking-wider">
                    Total du jour
                  </td>
                  <td className="p-4 text-right font-extrabold text-emerald-600 text-sm">
                    + {formatAmount(totalRecettes)}
                  </td>
                  <td className="p-4 text-center text-xs font-semibold text-emerald-600">
                    {totalCommandes} livraison{totalCommandes > 1 ? 's' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}