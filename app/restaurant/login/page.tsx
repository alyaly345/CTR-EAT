'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { setCurrentRestaurant } from '@/lib/storage'
import { ArrowLeft, UtensilsCrossed, ChevronRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function RestaurantLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const cleanedId = id.trim().toUpperCase()

    if (!cleanedId) {
      setError('Veuillez entrer votre ID')
      setIsLoading(false)
      return
    }

    try {
      const { data: restaurants, error: supabaseError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', cleanedId)
        .single()

      if (supabaseError || !restaurants) {
        setError('ID invalide. Aucun restaurant trouvé.')
        setIsLoading(false)
        return
      }

      setCurrentRestaurant(restaurants)
      router.push(`/restaurant/${restaurants.id}`)
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion.')
      setIsLoading(false)
    }
  }

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
              Espace Restaurant
            </h1>
            <p className="text-white/40 text-sm text-center leading-relaxed">
              Entrez votre ID pour accéder à votre tableau de bord
            </p>
          </div>

          {/* Success banner */}
          {showSuccess && (
            <div className="mb-5 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-400 font-medium">
                Compte créé avec succès ! Connectez-vous maintenant.
              </p>
            </div>
          )}

          {/* Form Card */}
          <div
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-[#FF7A00]/30 to-transparent" />

            <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">

              {/* ID field */}
              <div className="space-y-2">
                <label htmlFor="id" className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  ID du restaurant
                </label>
                <input
                  id="id"
                  type="text"
                  placeholder="Ex: REST-ABC123"
                  value={id}
                  onChange={e => setId(e.target.value.toUpperCase())}
                  autoFocus
                  className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-white placeholder:text-white/20 text-sm font-semibold font-mono outline-none focus:border-[#FF7A00]/40 focus:bg-white/[0.08] transition-all duration-200 tracking-wider"
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
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Accéder au tableau de bord
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Register link */}
              <p className="text-sm text-center text-white/30 font-medium">
                Pas encore inscrit ?{' '}
                <Link href="/restaurant/register" className="text-[#FF7A00] hover:text-[#FFAA44] transition-colors font-bold">
                  Créer un compte
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