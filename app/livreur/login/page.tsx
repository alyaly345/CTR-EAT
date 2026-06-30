'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setCurrentLivreur, setCurrentRestaurant } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Bike, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'

export default function LivreurLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nom: '',
    numero: '',
    id: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

     const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!formData.nom || !formData.numero || !formData.id) {
      setError('Veuillez remplir tous les champs')
      setIsLoading(false)
      return
    }

    const cleanedId = formData.id.trim().toUpperCase()
    const cleanedName = formData.nom.trim()
    const cleanedPhone = formData.numero.trim()

    try {
      const { data: livreur, error: livreurError } = await supabase
        .from('livreurs')
        .select('*')
        .eq('id', cleanedId)
        .eq('nom', cleanedName)
        .eq('numero', cleanedPhone)
        .maybeSingle()

      if (livreurError) {
        setError(`Erreur base de données : ${livreurError.message}`)
        setIsLoading(false)
        return
      }

      if (!livreur) {
        setError('Identifiants incorrects ou introuvables.')
        setIsLoading(false)
        return
      }

      setCurrentLivreur(livreur)

      if (livreur.restaurantId) {
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', livreur.restaurantId)
          .maybeSingle()

        if (restaurant && !restaurantError) {
          setCurrentRestaurant(restaurant)
        }
      }

      router.push('/livreur/dashboard')

    } catch (err: any) {
      setError('Une erreur réseau ou système est survenue.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] relative overflow-hidden antialiased">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[350px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #ffffff 0%, transparent 70%)' }}
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
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <Bike className="w-7 h-7 text-white/60" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Espace Livreur
            </h1>
            <p className="text-white/40 text-sm text-center leading-relaxed">
              Entrez vos identifiants fournis par votre restaurant
            </p>
          </div>

          {/* Form Card */}
          <div
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5"> 

              {/* Nom */}
              <div className="space-y-2">
                <label htmlFor="nom" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Nom
                </label>
                <input
                  id="nom"
                  type="text"
                  placeholder="Votre nom complet"
                  value={formData.nom}
                  onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-medium outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200"
                />
              </div>

              {/* Numéro */}
              <div className="space-y-2">
                <label htmlFor="numero" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Numéro de téléphone
                </label>
                <input
                  id="numero"
                  type="text"
                  placeholder="Ex: 77337458"
                  value={formData.numero}
                  onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-medium outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200"
                />
              </div>

              {/* ID */}
              <div className="space-y-2">
                <label htmlFor="id" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  ID Livreur
                </label>
                <input
                  id="id"
                  type="text"
                  placeholder="Ex: LIV-001"
                  value={formData.id}
                  onChange={e => setFormData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-semibold font-mono outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 tracking-wider"
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
                  background: isLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                  boxShadow: isLoading ? 'none' : '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter au terminal
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Note */}
              <div className="flex items-start gap-2 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <p className="text-xs text-white/30 font-medium leading-relaxed">
                  Les comptes livreurs sont créés et gérés par les restaurants partenaires. Contactez votre restaurant si vous n'avez pas vos identifiants.
                </p>
              </div>

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