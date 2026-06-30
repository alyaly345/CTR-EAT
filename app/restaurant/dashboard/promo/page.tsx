// app/restaurant/dashboard/promo/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentRestaurant } from '@/lib/storage'
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, AlertCircle, CheckCircle, Calendar,
  Percent, DollarSign, Building2, X, Save,
} from 'lucide-react'

interface PromoCode {
  id: string
  restaurant_location_id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  label: string | null
  max_uses: number | null
  uses_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

interface Location {
  id: string
  neighborhood: string
  city: string
  country: string
}

const EMPTY_FORM = {
  code:           '',
  discount_type:  'percent' as 'percent' | 'fixed',
  discount_value: '',
  label:          '',
  max_uses:       '',
  expires_at:     '',
  restaurant_location_id: '',
}

export default function PromoPage() {
  const [promos,    setPromos]    = useState<PromoCode[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [toggling,  setToggling]  = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [filterLoc, setFilterLoc] = useState<string>('all')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)

      if (typeof window === 'undefined') return

      const restaurant = getCurrentRestaurant()
      if (!restaurant) {
        setError("Impossible de récupérer les informations du restaurant connecté. Veuillez vous reconnecter.")
        setLoading(false)
        return
      }

      const { data: locs, error: locsErr } = await supabase
        .from('restaurant_locations')
        .select('id, neighborhood, city, country')
        .eq('restaurant_uuid', restaurant.id)
        .order('city')

      if (locsErr) throw new Error(`Locations: ${locsErr.message}`)

      const locList = (locs ?? []) as Location[]
      setLocations(locList)

      if (locList.length === 0) {
        setLoading(false)
        return
      }

      const locIds = locList.map(l => l.id)
      const { data, error: err } = await supabase
        .from('promo_codes')
        .select('*')
        .in('restaurant_location_id', locIds)
        .order('created_at', { ascending: false })

      if (err) throw new Error(`Promos: ${err.message}`)

      setPromos((data ?? []) as PromoCode[])
    } catch (e: any) {
      console.error("Erreur critique lors du chargement:", e)
      setError(e.message || "Une erreur inconnue est survenue.")
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleCreate = async () => {
    setError(null)
    if (!form.code.trim())           return setError('Le code est requis.')
    if (!form.discount_value)         return setError('La valeur de réduction est requise.')
    if (!form.restaurant_location_id) return setError('Sélectionnez un établissement.')
    if (form.discount_type === 'percent' && Number(form.discount_value) > 100)
                                      return setError('Le pourcentage ne peut pas dépasser 100%.')

    setSaving(true)
    try {
      const { data, error: err } = await supabase
        .from('promo_codes')
        .insert({
          restaurant_location_id: form.restaurant_location_id,
          code:           form.code.trim().toUpperCase(),
          discount_type:  form.discount_type,
          discount_value: Number(form.discount_value),
          label:          form.label.trim() || null,
          max_uses:       form.max_uses ? Number(form.max_uses) : null,
          uses_count:     0,
          is_active:      true,
          expires_at:     form.expires_at || null,
        })
        .select()
        .single()

      if (err) throw err

      setPromos(prev => [data as PromoCode, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
      showSuccess('Code promo créé avec succès !')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (promo: PromoCode) => {
    setToggling(promo.id)
    try {
      const { error: err } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id)

      if (err) throw err
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return
    setDeleting(id)
    try {
      const { error: err } = await supabase.from('promo_codes').delete().eq('id', id)
      if (err) throw err
      setPromos(prev => prev.filter(p => p.id !== id))
      showSuccess('Code promo supprimé.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const getLocation = (id: string) => locations.find(l => l.id === id)

  const filtered     = filterLoc === 'all' ? promos : promos.filter(p => p.restaurant_location_id === filterLoc)
  const activeCount  = promos.filter(p => p.is_active).length
  const expiredCount = promos.filter(p => p.expires_at && new Date(p.expires_at) < new Date()).length

  if (loading) return (
    <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh' }} className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF7A00' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-sm">Chargement des promotions...</p>
      </div>
    </div>
  )

  return (
    <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', color: '#ffffff' }}>
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF7A00, #E06000)' }}
            >
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: '#ffffff' }}>Codes Promo</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Gérez vos promotions par établissement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm(true); setError(null) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FF7A00, #E06000)', boxShadow: '0 4px 14px rgba(255,122,0,0.3)' }}
          >
            <Plus className="w-4 h-4" />
            Nouveau code
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total codes', value: promos.length,  color: '#FF7A00', icon: Tag },
            { label: 'Actifs',      value: activeCount,    color: '#10B981', icon: ToggleRight },
            { label: 'Expirés',     value: expiredCount,   color: '#EF4444', icon: Calendar },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: stat.color + '20' }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: '#ffffff' }}>{stat.value}</p>
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Erreur */}
        {error && (
          <div
            className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
            <p className="text-sm flex-1" style={{ color: '#f87171' }}>{error}</p>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" style={{ color: '#f87171' }} />
            </button>
          </div>
        )}

        {/* Succès */}
        {success && (
          <div
            className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#34d399' }} />
            <p className="text-sm" style={{ color: '#34d399' }}>{success}</p>
          </div>
        )}

        {/* Formulaire création */}
        {showForm && (
          <div
            className="mb-6 rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,122,0,0.2)' }}
          >
            {/* En-tête formulaire */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" style={{ color: '#FF7A00' }} />
                <p className="text-sm font-black" style={{ color: '#ffffff' }}>Créer un code promo</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); setForm(EMPTY_FORM) }}
              >
                <X className="w-4 h-4 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Établissement */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Building2 className="w-3 h-3" /> Établissement *
                </label>
                <select
                  value={form.restaurant_location_id}
                  onChange={e => setForm(p => ({ ...p, restaurant_location_id: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  }}
                >
                  <option value="" style={{ backgroundColor: '#0A0A0A', color: '#ffffff' }}>Sélectionner un établissement</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id} style={{ backgroundColor: '#0A0A0A', color: '#ffffff' }}>
                      {loc.neighborhood} — {loc.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Code promo */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Tag className="w-3 h-3" /> Code promo *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: CHITIR30"
                  maxLength={20}
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  }}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="Ex: −30% sur la commande"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  }}
                />
              </div>

              {/* Type de réduction */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Type de réduction *
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'percent', label: 'Pourcentage %', icon: Percent },
                    { value: 'fixed',   label: 'Montant fixe',  icon: DollarSign },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, discount_type: opt.value as 'percent' | 'fixed' }))}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                      style={form.discount_type === opt.value
                        ? { border: '1px solid rgba(255,122,0,0.5)', backgroundColor: 'rgba(255,122,0,0.1)', color: '#FF7A00' }
                        : { border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
                      }
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valeur */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Valeur * {form.discount_type === 'percent' ? '(%)' : '(FCFA)'}
                </label>
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                  placeholder={form.discount_type === 'percent' ? '30' : '1000'}
                  min="1"
                  max={form.discount_type === 'percent' ? '100' : undefined}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  }}
                />
              </div>

              {/* Utilisations max */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Utilisations max
                </label>
                <input
                  type="number"
                  value={form.max_uses}
                  onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))}
                  placeholder="Illimité"
                  min="1"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  }}
                />
              </div>

              {/* Date d'expiration */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Calendar className="w-3 h-3" /> Date d'expiration
                </label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  }}
                />
              </div>

            </div>

            {/* Bouton créer */}
            <div className="px-6 pb-6 flex justify-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF7A00, #E06000)',
                  boxShadow: '0 4px 14px rgba(255,122,0,0.3)',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                  : <><Save className="w-4 h-4" /> Créer le code</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Filtre par location */}
        {locations.length > 1 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterLoc('all')}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={filterLoc === 'all'
                ? { backgroundColor: '#FF7A00', color: '#ffffff' }
                : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
              }
            >
              Tous ({promos.length})
            </button>
            {locations.map(loc => {
              const count = promos.filter(p => p.restaurant_location_id === loc.id).length
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setFilterLoc(loc.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={filterLoc === loc.id
                    ? { backgroundColor: '#FF7A00', color: '#ffffff' }
                    : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {loc.neighborhood} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Liste promos */}
        {filtered.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Tag className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>Aucun code promo</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Créez votre premier code promo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(promo => {
              const loc      = getLocation(promo.restaurant_location_id)
              const isExpired = promo.expires_at ? new Date(promo.expires_at) < new Date() : false
              

              return (
                <div
                  key={promo.id}
                  className="rounded-2xl p-5 transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: isExpired
                      ? '1px solid rgba(239,68,68,0.2)'
                      : promo.is_active
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(255,255,255,0.05)',
                    opacity: isExpired || !promo.is_active ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">

                    {/* Gauche */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">

                      {/* Badge code */}
                      <div
                        className="px-3 py-2 rounded-xl font-mono font-black text-sm flex-shrink-0"
                        style={isExpired
                          ? { backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
                          : promo.is_active
                            ? { backgroundColor: 'rgba(255,122,0,0.1)', border: '1px solid rgba(255,122,0,0.3)', color: '#FF7A00' }
                            : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }
                        }
                      >
                        {promo.code}
                      </div>

                      <div className="flex-1 min-w-0">
                        {promo.label && (
                          <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>{promo.label}</p>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black"
                            style={{ backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
                          >
                            {promo.discount_type === 'percent'
                              ? <><Percent className="w-3 h-3" />−{promo.discount_value}%</>
                              : <><DollarSign className="w-3 h-3" />−{promo.discount_value.toLocaleString('fr-FR')} FCFA</>
                            }
                          </span>
                          {isExpired && (
                            <span
                              className="rounded-lg px-2.5 py-1 text-xs font-bold"
                              style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                            >
                              Expiré
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          {loc && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              <Building2 className="w-3 h-3" />
                              {loc.neighborhood}, {loc.city}
                            </span>
                          )}
                          <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <Tag className="w-3 h-3" />
                                        
                          </span>
                          {promo.expires_at && (
                            <span
                              className="text-xs flex items-center gap-1"
                              style={{ color: isExpired ? '#f87171' : 'rgba(255,255,255,0.3)' }}
                            >
                              <Calendar className="w-3 h-3" />
                              {new Date(promo.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                                
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(promo)}
                        disabled={toggling === promo.id || isExpired}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          opacity: toggling === promo.id || isExpired ? 0.4 : 1,
                          ...(promo.is_active && !isExpired
                            ? { border: '1px solid #10B981', color: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)' }
                            : { border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.03)' }
                          ),
                        }}
                      >
                        {toggling === promo.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : promo.is_active
                            ? <><ToggleRight className="w-3.5 h-3.5" />Actif</>
                            : <><ToggleLeft className="w-3.5 h-3.5" />Inactif</>
                        }
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(promo.id)}
                        disabled={deleting === promo.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: '#f87171',
                          opacity: deleting === promo.id ? 0.4 : 1,
                        }}
                      >
                        {deleting === promo.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}