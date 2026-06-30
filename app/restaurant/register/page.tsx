'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/storage'
import { ArrowLeft, UtensilsCrossed, ChevronRight, AlertCircle, Loader2, Shuffle } from 'lucide-react'

export default function RestaurantRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nom: '',
    id: '',
    pays: '',
    ville: '',
    quartier: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const cleanedId = formData.id.trim().toUpperCase()

    if (!formData.nom || !cleanedId || !formData.pays || !formData.ville || !formData.quartier) {
      setError('Veuillez remplir tous les champs')
      setIsLoading(false)
      return
    }

    try {
      const { data: existingRestaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', cleanedId)
        .maybeSingle()

      if (existingRestaurants) {
        setError('Cet ID est déjà utilisé. Veuillez en choisir un autre.')
        setIsLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('restaurants')
        .insert([
          {
            id: cleanedId,
            nom: formData.nom,
            pays: formData.pays,
            ville: formData.ville,
            quartier: formData.quartier
          }
        ])

      if (insertError) {
        setError(`Erreur lors de la création : ${insertError.message}`)
        setIsLoading(false)
        return
      }

      router.push('/restaurant/login?registered=true')
    } catch (err) {
      setError('Une erreur réseau ou serveur est survenue.')
      setIsLoading(false)
    }
  }

  const generateRandomId = () => {
    const newId = `REST-${generateId().slice(0, 8).toUpperCase()}`
    setFormData(prev => ({ ...prev, id: newId }))
  }

  const fields = [
    { key: 'nom', label: 'Nom du restaurant', placeholder: 'Ex: Chicken Express', type: 'text', mono: false },
    { key: 'pays', label: 'Pays', placeholder: 'Ex: France', type: 'text', mono: false },
    { key: 'ville', label: 'Ville', placeholder: 'Ex: Paris', type: 'text', mono: false },
    { key: 'quartier', label: 'Quartier', placeholder: 'Ex: Montmartre', type: 'text', mono: false },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] relative overflow-hidden antialiased">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[350px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #FF7A00 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-200 group-hover:bg-white/10 group-hover:border-white/20">
            <ArrowLeft className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.15em] text-white/30 group-hover:text-white/50 transition-colors">
            Retour
          </span>
        </Link>
        <span className="text-sm font-black uppercase tracking-[0.2em] text-white/20">
          Chitir<span className="text-[#FF7A00]/60">.</span>
        </span>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md mx-auto">

          {/* Icon + Title */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,122,0,0.15), rgba(255,122,0,0.05))',
                border: '1px solid rgba(255,122,0,0.25)',
                boxShadow: '0 8px 32px rgba(255,122,0,0.15)'
              }}
            >
              <UtensilsCrossed className="w-7 h-7 text-[#FF7A00]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Créer un compte
            </h1>
            <p className="text-white/40 text-sm text-center leading-relaxed">
              Enregistrez votre franchise sur la plateforme
            </p>
          </div>

          {/* Form Card */}
          <div
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-[#FF7A00]/30 to-transparent" />

            <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4">

              {/* Nom */}
              <div className="space-y-2">
                <label htmlFor="nom" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Nom du restaurant
                </label>
                <input
                  id="nom"
                  type="text"
                  placeholder="Ex: Chicken Express"
                  value={formData.nom}
                  onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-medium outline-none focus:border-[#FF7A00]/40 focus:bg-white/[0.08] transition-all duration-200"
                />
              </div>

              {/* ID avec bouton générer */}
              <div className="space-y-2">
                <label htmlFor="id" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  ID du restaurant
                </label>
                <div className="flex gap-2">
                  <input
                    id="id"
                    type="text"
                    placeholder="Ex: REST-ABC123"
                    value={formData.id}
                    onChange={e => setFormData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                    className="flex-1 h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-semibold font-mono outline-none focus:border-[#FF7A00]/40 focus:bg-white/[0.08] transition-all duration-200 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={generateRandomId}
                    className="h-12 px-3.5 rounded-xl border border-white/10 bg-white/[0.05] text-white/50 hover:bg-white/[0.10] hover:text-white/80 hover:border-white/20 transition-all duration-200 active:scale-95 flex-shrink-0"
                    title="Générer un ID aléatoire"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-white/25 font-medium pl-1">
                  Cet ID sera utilisé pour vous connecter — conservez-le précieusement.
                </p>
              </div>

              {/* Pays */}
              <div className="space-y-2">
                <label htmlFor="pays" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Pays
                </label>
                <input
                  id="pays"
                  type="text"
                  placeholder="Ex: France"
                  value={formData.pays}
                  onChange={e => setFormData(prev => ({ ...prev, pays: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-medium outline-none focus:border-[#FF7A00]/40 focus:bg-white/[0.08] transition-all duration-200"
                />
              </div>

              {/* Ville */}
              <div className="space-y-2">
                <label htmlFor="ville" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Ville
                </label>
                <input
                  id="ville"
                  type="text"
                  placeholder="Ex: Paris"
                  value={formData.ville}
                  onChange={e => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-medium outline-none focus:border-[#FF7A00]/40 focus:bg-white/[0.08] transition-all duration-200"
                />
              </div>

              {/* Quartier */}
              <div className="space-y-2">
                <label htmlFor="quartier" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Quartier
                </label>
                <input
                  id="quartier"
                  type="text"
                  placeholder="Ex: Montmartre"
                  value={formData.quartier}
                  onChange={e => setFormData(prev => ({ ...prev, quartier: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-medium outline-none focus:border-[#FF7A00]/40 focus:bg-white/[0.08] transition-all duration-200"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{
                  background: isLoading ? 'rgba(255,122,0,0.3)' : 'linear-gradient(135deg, #FF7A00, #E06000)',
                  boxShadow: isLoading ? 'none' : '0 4px 16px rgba(255,122,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Créer le compte
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Login link */}
              <p className="text-sm text-center text-white/30 font-medium">
                Déjà inscrit ?{' '}
                <Link href="/restaurant/login" className="text-[#FF7A00] hover:text-[#FFAA44] transition-colors font-bold">
                  Se connecter
                </Link>
              </p>

            </form>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-4 px-5">
        <div className="max-w-md mx-auto text-center">
          <span className="text-[10px] font-bold text-white/20 tracking-wider">
            &copy; {new Date().getFullYear()} <span className="text-[#FF7A00]">CHITIR CHICKEN</span> — Tous droits réservés.
          </span>
        </div>
      </footer>

    </div>
  )
}