'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Bike, ChevronRight, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] relative overflow-hidden antialiased select-none">

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #FF7A00 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #FF7A00 0%, transparent 70%)' }}
        />
        {/* Grid texture */}
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

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            Chitir System
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
          <Shield className="w-3 h-3 text-[#FF7A00]" />
          <span className="text-[10px] font-bold text-white/50 tracking-wider">SECURE</span>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">

          {/* Logo */}
          <div className="mb-8 sm:mb-10 flex flex-col items-center">
            {/* Outer glow ring */}
            <div className="relative p-[3px] rounded-full"
              style={{ background: 'linear-gradient(135deg, #FF7A00, #FF4400, #FF7A00)' }}>
              <div className="w-[100px] h-[100px] sm:w-[116px] sm:h-[116px] rounded-full bg-[#0A0A0A] flex items-center justify-center p-1.5">
                <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                  <Image
                    src="/logo.png"
                    alt="Chitir Chicken Logo"
                    fill
                    priority
                    sizes="116px"
                    className="object-contain p-1"
                  />
                </div>
              </div>
            </div>
            {/* Brand name */}
            <div className="mt-4 text-center">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-[0.08em] uppercase">
                Chitir<span className="text-[#FF7A00]">.</span>
              </h1>
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/25 mt-0.5 block">
                Portail Administratif
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-8 sm:mb-10 px-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-[1.2] tracking-tight mb-3">
              Pilotez votre activité{' '}
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(90deg, #FF7A00, #FFAA44)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                en temps réel
              </span>
            </h2>
            <p className="text-white/40 text-sm sm:text-base leading-relaxed font-medium">
              Choisissez votre espace de travail pour accéder au tableau de bord.
            </p>
          </div>

          {/* Cards */}
          <div className="w-full flex flex-col gap-4">

            {/* Restaurant Card */}
            <div
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:border-[#FF7A00]/40 hover:bg-white/[0.06] active:scale-[0.98]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {/* Inner top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="p-5 sm:p-6">
                {/* Header row */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center transition-all duration-300 group-hover:bg-[#FF7A00] group-hover:border-[#FF7A00] group-hover:shadow-[0_6px_20px_rgba(255,122,0,0.4)]">
                    <UtensilsCrossed className="w-5 h-5 text-[#FF7A00] transition-colors duration-300 group-hover:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Espace Restaurant
                      </h3>
                      <div className="flex items-center gap-1 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-full px-2 py-0.5">
                        <Zap className="w-2.5 h-2.5 text-[#FF7A00]" />
                        <span className="text-[9px] font-black text-[#FF7A00] uppercase tracking-wider">Pro</span>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs sm:text-sm mt-1 leading-relaxed">
                      Commandes, catalogue &amp; coursiers
                    </p>
                  </div>
                </div>

                {/* Features row */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {['Commandes live', 'Catalogue', 'Statistiques'].map((f) => (
                    <span key={f} className="text-[10px] font-semibold text-white/30 bg-white/5 border border-white/8 rounded-full px-2.5 py-1">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2.5">
                  <Link href="/restaurant/login" className="block">
                    <button className="w-full h-11 sm:h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #FF7A00, #E06000)',
                        boxShadow: '0 4px 16px rgba(255,122,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                      }}>
                      Accéder au tableau de bord
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/restaurant/register" className="block">
                    <button className="w-full h-10 sm:h-11 rounded-xl font-semibold text-sm text-white/60 border border-white/10 bg-white/[0.03] flex items-center justify-center gap-2 transition-all duration-200 hover:bg-white/[0.07] hover:text-white/80 hover:border-white/20 active:scale-95">
                      Créer une franchise
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Livreur Card */}
            <div
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="p-5 sm:p-6">
                {/* Header row */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/25 group-hover:shadow-[0_6px_20px_rgba(255,255,255,0.1)]">
                    <Bike className="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Espace Livreur
                    </h3>
                    <p className="text-white/40 text-xs sm:text-sm mt-1 leading-relaxed">
                      Missions, trajets &amp; gains quotidiens
                    </p>
                  </div>
                </div>

                {/* Features row */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {['Missions live', 'Trajets', 'Revenus'].map((f) => (
                    <span key={f} className="text-[10px] font-semibold text-white/30 bg-white/5 border border-white/8 rounded-full px-2.5 py-1">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Button */}
                <Link href="/livreur/login" className="block">
                  <button className="w-full h-11 sm:h-12 rounded-xl font-bold text-sm text-white border border-white/15 bg-white/8 flex items-center justify-center gap-2 transition-all duration-200 hover:bg-white/15 hover:border-white/25 hover:-translate-y-0.5 active:scale-95"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    Se connecter au terminal
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>

                {/* Warning note */}
                <div className="mt-3 flex items-start gap-2 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5">
                  <span className="text-base leading-none mt-0.5">⚠️</span>
                  <p className="text-[11px] text-white/30 font-medium leading-relaxed">
                    Les accès coursiers sont administrés par les restaurants partenaires.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Stats strip */}
          <div className="w-full mt-6 grid grid-cols-3 gap-3">
            {[
              { value: '24/7', label: 'Disponible' },
              { value: '< 1s', label: 'Temps réponse' },
              { value: '256-bit', label: 'Chiffrement' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center bg-white/[0.03] border border-white/8 rounded-xl py-3 px-2">
                <div className="text-sm sm:text-base font-black text-white">{value}</div>
                <div className="text-[9px] font-semibold text-white/25 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-4 px-5">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-white/20 tracking-wider">
            &copy; {new Date().getFullYear()}{' '}
            <span className="text-[#FF7A00]">CHITIR CHICKEN</span>
            {' '}— Tous droits réservés.
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-white/20 hover:text-[#FF7A00] cursor-pointer transition-colors tracking-wider uppercase">
              Support
            </span>
            <span className="w-0.5 h-3 bg-white/10 rounded-full" />
            <span className="text-[10px] font-bold text-white/20 hover:text-[#FF7A00] cursor-pointer transition-colors tracking-wider uppercase">
              Sécurité
            </span>
          </div>
        </div>
      </footer>

    </div>
  )
}