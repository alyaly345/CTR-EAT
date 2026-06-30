// app/restaurant/dashboard/contact/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentRestaurant } from '@/lib/storage'
import { Phone, Mail, MessageCircle, MapPin, Clock, Save, CheckCircle, AlertCircle, Loader2, Globe, Building2 } from 'lucide-react'

interface LocationContact {
  id: string
  restaurant_name: string
  neighborhood: string
  city: string
  country: string
  address: string | null
  phone: string | null
  email: string | null
  whatsapp: string | null
  opening_time: string | null
  closing_time: string | null
  is_active: boolean
}

export default function ContactPage() {
  const [locations, setLocations] = useState<LocationContact[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [saved,     setSaved]     = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  // Formulaires par location
  const [forms, setForms] = useState<Record<string, {
    phone: string; email: string; whatsapp: string;
    address: string; opening_time: string; closing_time: string;
  }>>({})

  useEffect(() => {
    const load = async () => {
      const restaurant = getCurrentRestaurant()
      if (!restaurant) return

      const { data, error: err } = await supabase
        .from('restaurant_locations')
        .select('id, restaurant_name, neighborhood, city, country, address, phone, email, whatsapp, opening_time, closing_time, is_active')
        .eq('restaurant_uuid', restaurant.id)
        .order('city')

      if (err) { setError(err.message); setLoading(false); return }

      const locs = (data ?? []) as LocationContact[]
      setLocations(locs)

      // Initialiser les formulaires
      const init: typeof forms = {}
      locs.forEach(loc => {
        init[loc.id] = {
          phone:        loc.phone        ?? '',
          email:        loc.email        ?? '',
          whatsapp:     loc.whatsapp     ?? '',
          address:      loc.address      ?? '',
          opening_time: loc.opening_time ?? '',
          closing_time: loc.closing_time ?? '',
        }
      })
      setForms(init)
      setLoading(false)
    }
    load()
  }, [])

  const handleChange = (locId: string, field: string, value: string) => {
    setForms(prev => ({ ...prev, [locId]: { ...prev[locId], [field]: value } }))
  }

  const handleSave = async (locId: string) => {
    setSaving(locId)
    setError(null)
    const f = forms[locId]

    const { error: err } = await supabase
      .from('restaurant_locations')
      .update({
        phone:        f.phone        || null,
        email:        f.email        || null,
        whatsapp:     f.whatsapp     || null,
        address:      f.address      || null,
        opening_time: f.opening_time || null,
        closing_time: f.closing_time || null,
      })
      .eq('id', locId)

    setSaving(null)
    if (err) { setError(err.message); return }

    setSaved(locId)
    setTimeout(() => setSaved(null), 3000)

    // Mettre à jour l'état local
    setLocations(prev => prev.map(loc =>
      loc.id === locId ? { ...loc, ...f, phone: f.phone || null, email: f.email || null, whatsapp: f.whatsapp || null } : loc
    ))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-[#FF7A00] animate-spin" />
        <p className="text-zinc-500 text-sm font-medium">Chargement des contacts...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF7A00, #E06000)' }}>
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900">Informations de contact</h1>
            <p className="text-zinc-500 text-sm">Gérez les coordonnées de chaque établissement</p>
          </div>
        </div>
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center py-20">
          <MapPin className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-400 font-semibold">Aucun établissement trouvé</p>
        </div>
      ) : (
        <div className="space-y-6">
          {locations.map(loc => {
            const f         = forms[loc.id] ?? {}
            const isSaving  = saving === loc.id
            const isSaved   = saved  === loc.id

            return (
              <div key={loc.id} className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">

                {/* Card header */}
                <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FF7A00]/15 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-[#FF7A00]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{loc.neighborhood}</p>
                      <p className="text-xs text-zinc-500 font-medium">{loc.city} · {loc.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${loc.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-bold ${loc.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
                      {loc.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                {/* Formulaire */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">

                  {/* Téléphone */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> Téléphone
                    </label>
                    <input
                      type="tel"
                      value={f.phone ?? ''}
                      onChange={e => handleChange(loc.id, 'phone', e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#FF7A00]/50 focus:bg-zinc-50/50 transition-all"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={f.whatsapp ?? ''}
                      onChange={e => handleChange(loc.id, 'whatsapp', e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#25D366]/50 focus:bg-zinc-50/50 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email
                    </label>
                    <input
                      type="email"
                      value={f.email ?? ''}
                      onChange={e => handleChange(loc.id, 'email', e.target.value)}
                      placeholder="contact@chitirchicken.com"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#FF7A00]/50 focus:bg-zinc-50/50 transition-all"
                    />
                  </div>

                  {/* Adresse */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Adresse complète
                    </label>
                    <input
                      type="text"
                      value={f.address ?? ''}
                      onChange={e => handleChange(loc.id, 'address', e.target.value)}
                      placeholder="Rue 10, Quartier Médina, Dakar"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#FF7A00]/50 focus:bg-zinc-50/50 transition-all"
                    />
                  </div>

                  {/* Horaires */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Ouverture
                    </label>
                    <input
                      type="time"
                      value={f.opening_time ?? ''}
                      onChange={e => handleChange(loc.id, 'opening_time', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-[#FF7A00]/50 focus:bg-zinc-50/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Fermeture
                    </label>
                    <input
                      type="time"
                      value={f.closing_time ?? ''}
                      onChange={e => handleChange(loc.id, 'closing_time', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-[#FF7A00]/50 focus:bg-zinc-50/50 transition-all"
                    />
                  </div>

                </div>

                {/* Footer bouton */}
                <div className="px-6 pb-6 flex items-center justify-between bg-white">
                  {isSaved && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">Sauvegardé !</span>
                    </div>
                  )}
                  {!isSaved && <div />}

                  <button
                    onClick={() => handleSave(loc.id)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #FF7A00, #E06000)', boxShadow: '0 4px 14px rgba(255,122,0,0.3)' }}
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Enregistrer</>
                    )}
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}