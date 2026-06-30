'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentLivreur, logoutLivreur } from '@/lib/storage'
import {
  Bell, BellOff, CheckCircle, Clock, LogOut,
  MapPin, Navigation, Package, Phone,
  RefreshCw, Store, Truck, User, ExternalLink
} from 'lucide-react'

/* ── TYPES ──────────────────────────────────────────────────── */
type OrderStatus = 'pending' | 'sent' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered'

// ✅ FIX: Supporte les deux clés (qty et quantity) pour compatibilité
interface OrderItem { name: string; quantity?: number; qty?: number; price: number }

interface Order {
  id: string
  status: OrderStatus
  restaurant_id: string
  livreur_id: string | null
  // ✅ Toutes les colonnes de la table orders
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  items: OrderItem[]
  total: number
  subtotal?: number
  delivery_fee?: number
  delivery_mode?: string
  payment_method?: string
  created_at: string
  updated_at?: string
}

interface Livreur { id: string; nom: string }

/* ── HELPERS pour récupérer les champs avec fallback ─────────── */
function getCustomerName(order: Order): string {
  return order.customer_name || order.recipient_name || 'Client Anonyme'
}
function getCustomerPhone(order: Order): string | null {
  return order.customer_phone || order.recipient_phone || null
}
function getCustomerAddress(order: Order): string | null {
  return order.customer_address || order.delivery_address || null
}
function getItemQty(item: OrderItem): number {
  return item.quantity ?? item.qty ?? 1
}

/* ── CONSTANTES ─────────────────────────────────────────────── */
const STATUS_ORDER: OrderStatus[] = ['pending','sent','accepted','picked_up','on_the_way','delivered']

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    'En attente',
  sent:       'Assignée',
  accepted:   'Acceptée',
  picked_up:  'Récupérée',
  on_the_way: 'En route',
  delivered:  'Livrée ✓',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    'bg-gray-100 text-gray-600 border border-gray-200',
  sent:       'bg-orange-100 text-orange-700 border border-orange-200 font-bold',
  accepted:   'bg-blue-100 text-blue-700 border border-blue-200',
  picked_up:  'bg-purple-100 text-purple-700 border border-purple-200',
  on_the_way: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  delivered:  'bg-green-100 text-green-700 border border-green-200',
}

const STEP_LABELS = ['Assignée', 'Acceptée', 'Récupérée', 'En route', 'Livrée']
const STEP_ICONS  = [Bell, CheckCircle, Package, Navigation, CheckCircle]

function getNextStatus(s: OrderStatus): OrderStatus | null {
  const idx = STATUS_ORDER.indexOf(s)
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null
  return STATUS_ORDER[idx + 1]
}
function getProgress(s: OrderStatus): number {
  return { pending:0, sent:10, accepted:35, picked_up:60, on_the_way:85, delivered:100 }[s] ?? 0
}
function getActionText(s: OrderStatus): string {
  return {
    pending:    '',
    sent:       '✅ Accepter et prendre la commande',
    accepted:   '📦 Nourriture récupérée au restaurant',
    picked_up:  '🛵 En route vers le client',
    on_the_way: '🏁 Confirmer la livraison au client',
    delivered:  'Terminée',
  }[s] ?? ''
}
function formatPrice(n: number) { return n.toLocaleString('fr-FR') + ' FCFA' }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ✅ Ouvre Google Maps avec coordonnées ou adresse texte
function openInMaps(address: string | null, lat?: number | null, lng?: number | null) {
  if (lat && lng) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}&z=16`, '_blank')
  } else if (address) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
  }
}

/* ── COMPOSANT PRINCIPAL ────────────────────────────────────── */
export default function LivreurDashboardPage() {
  const router = useRouter()

  const [livreur,    setLivreur]    = useState<Livreur | null>(null)
  const [orders,     setOrders]     = useState<Order[]>([])
  const [loading,    setLoading]    = useState(true)
  // ✅ FIX SON: on initialise avec le localStorage si disponible
  const [soundOn,    setSoundOn]    = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('livreur_sound')
      return stored === null ? true : stored === 'true'
    }
    return true
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [ignoringId, setIgnoringId] = useState<string | null>(null)
  const [activeTab,  setActiveTab]  = useState<'active'|'history'>('active')
  const [error,      setError]      = useState<string | null>(null)
  // ✅ État séparé pour savoir si l'alarme joue
  const [alarmPlaying, setAlarmPlaying] = useState(false)

  const alreadyAlarmedIds = useRef<Set<string>>(new Set())
  const alarmTimer        = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef       = useRef<AudioContext | null>(null)
  // ✅ Ref pour soundOn pour éviter les closures stales
  const soundOnRef        = useRef<boolean>(soundOn)

  useEffect(() => {
    soundOnRef.current = soundOn
    // Persiste dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('livreur_sound', String(soundOn))
    }
  }, [soundOn])

  /* ── Alarme ── */
  const playBeep = useCallback(() => {
    if (!soundOnRef.current) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      const b = (f: number, t: number) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = f; o.type = 'sine'
        g.gain.setValueAtTime(0.3, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25)
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.28)
      }
      b(880,0); b(1100,0.3); b(880,0.6); b(1100,0.9)
    } catch {}
  }, [])

  const stopAlarm = useCallback(() => {
    if (alarmTimer.current) {
      clearInterval(alarmTimer.current)
      alarmTimer.current = null
    }
    try { audioCtxRef.current?.close() } catch {}
    audioCtxRef.current = null
    setAlarmPlaying(false)
  }, [])

  const startAlarm = useCallback(() => {
    if (!soundOnRef.current) return
    // Ne pas démarrer si déjà en cours
    if (alarmTimer.current) return
    playBeep()
    setAlarmPlaying(true)
    alarmTimer.current = setInterval(() => {
      if (soundOnRef.current) {
        playBeep()
      } else {
        stopAlarm()
      }
    }, 3500)
  }, [playBeep, stopAlarm])

  /* ── Chargement commandes ── */
  const loadOrders = useCallback(async (lv: Livreur) => {
    try {
      setError(null)
      const { data, error: err } = await supabase
        .from('orders').select('*').order('created_at', { ascending: false })
      if (err) throw err

      const all = (data ?? []) as Order[]
      const myOrders = all.filter(o => o.livreur_id === lv.id)

      // Nouvelles commandes "sent" assignées à moi → alarme
      const newAssigned = myOrders.filter(o =>
        o.status === 'sent' &&
        !alreadyAlarmedIds.current.has(o.id)
      )
      if (newAssigned.length > 0) {
        newAssigned.forEach(o => alreadyAlarmedIds.current.add(o.id))
        startAlarm()
        setExpandedId(newAssigned[0].id)
      }

      // Stopper alarme si plus de "sent" à accepter
      const pendingSent = myOrders.filter(o => o.status === 'sent')
      if (pendingSent.length === 0) stopAlarm()

      setOrders(myOrders)
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de synchronisation')
    }
  }, [startAlarm, stopAlarm])

  /* ── Init + Realtime ── */
  useEffect(() => {
    const lv = getCurrentLivreur()
    if (!lv) { router.push('/livreur/login'); return }
    setLivreur(lv)
    setLoading(false)
    loadOrders(lv)

    const channel = supabase
  .channel(`livreur_${lv.id}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'orders'
    },
    (payload) => {
      console.log('Realtime reçu:', payload)
      loadOrders(lv)
    }
  )
  .subscribe()

    return () => { supabase.removeChannel(channel); stopAlarm() }
  }, [router, loadOrders, stopAlarm])

  /* ✅ FIX SON: quand soundOn passe à false → stop alarme
     quand soundOn passe à true → redémarre si des commandes "sent" attendent */
  useEffect(() => {
    if (!soundOn) {
      stopAlarm()
    } else if (livreur) {
      // Vérifie s'il y a des commandes en attente pour redémarrer l'alarme
      const pendingSent = orders.filter(o => o.status === 'sent')
      if (pendingSent.length > 0) {
        startAlarm()
      }
    }
  }, [soundOn, stopAlarm, startAlarm, livreur, orders])

  const handleToggleSound = useCallback(() => {
    setSoundOn(prev => !prev)
  }, [])

  const handleLogout = () => { stopAlarm(); logoutLivreur(); router.push('/') }

  /* ── Accepter / avancer statut ── */
  const handleUpdateStatus = async (orderId: string) => {
    if (!livreur) return
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    const next = getNextStatus(order.status)
    if (!next) return

    stopAlarm()
    setUpdatingId(orderId)
    try {
      const payload: any = { status: next, updated_at: new Date().toISOString() }
      if (order.status === 'sent') payload.livreur_id = livreur.id
      if (next === 'delivered') payload.delivered_at = new Date().toISOString()

      const { error: err } = await supabase
        .from('orders').update(payload).eq('id', orderId)
      if (err) throw err

      await loadOrders(livreur)
      if (next === 'delivered') setExpandedId(null)
    } catch (e: any) {
      setError(e?.message ?? 'Erreur mise à jour')
    } finally {
      setUpdatingId(null)
    }
  }

  /* ── Ignorer → Transférer automatiquement au livreur suivant ── */
  const handleIgnore = async (orderId: string) => {
    if (!livreur) return
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    setIgnoringId(orderId)
    stopAlarm()

    try {
      const { data: allLivreurs, error: livErr } = await supabase
        .from('livreurs')
        .select('id, nom, created_at')
        .eq('restaurant_id', order.restaurant_id)
        .order('created_at', { ascending: true })

      if (livErr) throw livErr
      if (!allLivreurs || allLivreurs.length === 0) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        return
      }

      if (allLivreurs.length === 1) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        return
      }

      const currentIndex = allLivreurs.findIndex(l => l.id === livreur.id)
      const nextIndex    = (currentIndex + 1) % allLivreurs.length
      const nextLivreur  = allLivreurs[nextIndex]

      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          livreur_id: nextLivreur.id,
          status:     'sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateErr) throw updateErr

      setOrders(prev => prev.filter(o => o.id !== orderId))
      alreadyAlarmedIds.current.delete(orderId)

    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du transfert')
    } finally {
      setIgnoringId(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Initialisation…</p>
      </div>
    </div>
  )
  if (!livreur) return null

  const sentToMe      = orders.filter(o => o.status === 'sent')
  const activeOrders  = orders.filter(o => ['accepted','picked_up','on_the_way'].includes(o.status))
  const historyOrders = orders.filter(o => o.status === 'delivered')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* TOPBAR */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="font-bold text-gray-900">{livreur.nom}</span>
              <span className="text-xs text-gray-400">(Livreur)</span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">ID : {livreur.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* ✅ FIX: bouton son corrigé avec handler dédié */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-lg transition-colors relative ${soundOn ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}
              title={soundOn ? 'Couper le son' : 'Activer le son'}
            >
              {soundOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {alarmPlaying && soundOn && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </button>
            <button
              onClick={() => loadOrders(livreur)}
              className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />Quitter
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-5 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <span>⚠️</span>
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-lg leading-none">✕</button>
          </div>
        )}

        {/* ── Stats 3 blocs ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '✅', label: 'Livrées',     value: historyOrders.length, color: 'text-green-600',  bg: 'bg-green-50'  },
            { icon: '🚴', label: 'Mes Courses', value: activeOrders.length,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { icon: '🔔', label: 'À accepter',  value: sentToMe.length,      color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-xl sm:text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Commandes assignées à accepter ── */}
        {sentToMe.length > 0 && (
          <div className={`border-2 rounded-2xl overflow-hidden shadow-md ${alarmPlaying && soundOn ? 'border-red-400' : 'border-orange-400'}`}>
            <div className={`px-4 py-3 flex items-center justify-between gap-2 ${alarmPlaying && soundOn ? 'bg-red-500' : 'bg-orange-500'}`}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white animate-bounce" />
                <span className="text-white font-bold text-sm">
                  {sentToMe.length} commande{sentToMe.length > 1 ? 's' : ''} assignée{sentToMe.length > 1 ? 's' : ''} — répondez !
                </span>
              </div>
              {alarmPlaying && soundOn && (
                <button
                  onClick={stopAlarm}
                  className="text-white/80 hover:text-white text-xs underline font-medium shrink-0"
                >
                  Couper alarme
                </button>
              )}
            </div>
            <div className="p-4 space-y-3 bg-orange-50/30">
              {sentToMe.map(order => {
                const customerName    = getCustomerName(order)
                const customerPhone   = getCustomerPhone(order)
                const customerAddress = getCustomerAddress(order)

                return (
                  <div key={order.id} className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{customerName}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                            {formatPrice(order.total)}
                          </span>
                          {order.delivery_mode && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {order.delivery_mode === 'delivery' ? '🛵 Livraison' : '🏃 À emporter'}
                            </span>
                          )}
                        </div>

                        {/* ✅ Téléphone cliquable */}
                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0 text-orange-500" />
                          {customerPhone ? (
                            <a href={`tel:${customerPhone}`} className="text-orange-600 font-bold hover:underline">
                              {customerPhone}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Aucun numéro</span>
                          )}
                        </p>

                        {/* ✅ Adresse cliquable → Google Maps */}
                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0 text-orange-500" />
                          {customerAddress ? (
                            <button
                              onClick={() => openInMaps(customerAddress, order.delivery_lat, order.delivery_lng)}
                              className="text-left text-orange-600 font-medium hover:underline inline-flex items-center gap-1"
                            >
                              {customerAddress} <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">Aucune adresse</span>
                          )}
                        </p>

                        <p className="text-[11px] text-gray-400 pt-0.5">
                          Reçue à {formatTime(order.created_at)}
                          {' · '}ID: <span className="font-mono">{order.id.slice(0, 8)}…</span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0 min-w-[100px]">
                        <button
                          onClick={() => handleUpdateStatus(order.id)}
                          disabled={updatingId === order.id}
                          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs px-3 py-2.5 rounded-xl active:scale-95 shadow-md transition-all text-center"
                        >
                          {updatingId === order.id ? (
                            <span className="flex items-center justify-center gap-1">
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Prise…
                            </span>
                          ) : '✅ Accepter'}
                        </button>

                        <button
                          onClick={() => handleIgnore(order.id)}
                          disabled={ignoringId === order.id}
                          className="text-gray-400 hover:text-orange-500 disabled:opacity-40 text-[11px] font-semibold text-center py-1.5 px-2 rounded-lg hover:bg-orange-50 transition-all border border-transparent hover:border-orange-200"
                        >
                          {ignoringId === order.id ? (
                            <span className="flex items-center justify-center gap-1">
                              <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              Transfert…
                            </span>
                          ) : '↩ Passer au suivant'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'active',  label: 'Missions en cours',        count: activeOrders.length  },
            { key: 'history', label: 'Historique des livraisons', count: historyOrders.length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Missions actives */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeOrders.length === 0 ? <EmptyState /> : activeOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedId === order.id}
                onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                onUpdateStatus={handleUpdateStatus}
                updatingId={updatingId}
              />
            ))}
          </div>
        )}

        {/* Historique */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-sm">Aucune livraison effectuée</p>
              </div>
            ) : historyOrders.slice(0, 20).map(order => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{getCustomerName(order)}</p>
                  <p className="text-xs text-gray-500">{getCustomerPhone(order) || '—'}</p>
                  <p className="text-xs text-gray-400">ID: <span className="font-mono text-[11px]">{order.id}</span></p>
                  <p className="text-xs text-gray-400">Finalisée à {formatTime(order.updated_at ?? order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                  <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Clôturée</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Supabase Realtime actif · Synchronisation instantanée
        </p>
      </main>
    </div>
  )
}

/* ── ORDER CARD ─────────────────────────────────────────────── */
function OrderCard({ order, isExpanded, onToggle, onUpdateStatus, updatingId }: {
  order: Order; isExpanded: boolean; onToggle: () => void
  onUpdateStatus: (id: string) => void; updatingId: string | null
}) {
  const progress    = getProgress(order.status)
  const nextStatus  = getNextStatus(order.status)
  const actionText  = getActionText(order.status)
  const stepOrder: OrderStatus[] = ['sent','accepted','picked_up','on_the_way','delivered']
  const currentStep = stepOrder.indexOf(order.status)

  const customerName    = getCustomerName(order)
  const customerPhone   = getCustomerPhone(order)
  const customerAddress = getCustomerAddress(order)

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm transition-all">
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-gray-50/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            order.status === 'on_the_way' ? 'bg-yellow-500 animate-pulse' :
            order.status === 'accepted'   ? 'bg-blue-500'   :
            order.status === 'picked_up'  ? 'bg-purple-500' :
            order.status === 'delivered'  ? 'bg-green-500'  : 'bg-orange-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 text-sm">{customerName}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 font-mono">ID: {order.id.slice(0, 8)}…</span>
              <span className="text-xs font-bold text-orange-600">{formatPrice(order.total)}</span>
              <span className="text-xs text-gray-400">{formatTime(order.created_at)}</span>
            </div>
          </div>
          <span className="text-gray-400 text-xs ml-2">{isExpanded ? '▲' : '▼'}</span>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            {STEP_LABELS.map((label, i) => {
              const Icon = STEP_ICONS[i]
              const done = currentStep >= 0 && i <= currentStep
              const curr = i === currentStep
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    curr ? 'bg-orange-500 text-white ring-4 ring-orange-100' :
                    done ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-300'
                  }`}><Icon className="w-2.5 h-2.5" /></div>
                  <span className={`text-[9px] font-medium hidden sm:block ${
                    curr ? 'text-orange-600 font-bold' : done ? 'text-orange-400' : 'text-gray-300'
                  }`}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox icon={<Store className="w-4 h-4 text-gray-400" />} label="Restaurant" value="Restaurant" />
            <InfoBox icon={<User className="w-4 h-4 text-gray-400" />} label="Destinataire" value={customerName} />

            {/* ✅ Téléphone cliquable dans la fiche */}
            <InfoBox
              icon={<Phone className="w-4 h-4 text-gray-400" />}
              label="Téléphone client"
              value={customerPhone ? (
                <a href={`tel:${customerPhone}`} className="text-orange-600 font-bold hover:underline">
                  {customerPhone}
                </a>
              ) : <span className="text-gray-400 italic text-xs">Non renseigné</span>}
            />

            {/* ✅ Adresse cliquable → Google Maps */}
            <InfoBox
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
              label="Adresse livraison"
              value={customerAddress ? (
                <button
                  onClick={() => openInMaps(customerAddress, order.delivery_lat, order.delivery_lng)}
                  className="text-left text-orange-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  {customerAddress} <ExternalLink className="w-3 h-3 inline shrink-0" />
                </button>
              ) : <span className="text-gray-400 italic text-xs">Non renseignée</span>}
            />
          </div>

          {/* ✅ Détail commande avec getItemQty pour supporter qty ET quantity */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Détail commande</p>
            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2 shadow-sm">
              {(order.items ?? []).map((item, i) => (
                <div key={i} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-700 font-medium">{getItemQty(item)}× {item.name}</span>
                  <span className="text-gray-500">{formatPrice(item.price * getItemQty(item))}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs sm:text-sm font-bold">
                <span>Total à encaisser</span>
                <span className="text-orange-600">{formatPrice(order.total)}</span>
              </div>
              {order.delivery_mode === 'delivery' && order.delivery_fee != null && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>dont frais de livraison</span>
                  <span>{formatPrice(order.delivery_fee)}</span>
                </div>
              )}
            </div>
          </div>

          {nextStatus && actionText && (
            <button
              onClick={() => onUpdateStatus(order.id)}
              disabled={updatingId === order.id}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm sm:text-base disabled:opacity-60 shadow-md transition-all active:scale-[0.98]"
              style={{ background: nextStatus === 'delivered'
                ? 'linear-gradient(135deg,#22C55E,#16A34A)'
                : 'linear-gradient(135deg,#F97316,#EA580C)'
              }}
            >
              {updatingId === order.id ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mise à jour…
                </span>
              ) : actionText}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function InfoBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5 break-words">{value}</div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-2xl py-14 px-6 text-center bg-white shadow-sm">
      <Truck className="w-12 h-12 mx-auto text-gray-300 mb-4 animate-pulse" />
      <h3 className="text-base font-bold text-gray-700 mb-2">Aucune course en cours</h3>
      <p className="text-xs sm:text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
        Quand le restaurant vous assigne une commande, elle apparaît ici avec une alarme sonore.
      </p>
    </div>
  )
}