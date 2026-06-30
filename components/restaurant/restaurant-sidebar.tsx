'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ClipboardList, Users, MapPin, LogOut, Home, Wallet, UtensilsCrossed , Phone , Tag} from 'lucide-react'
import { logoutRestaurant, getCurrentRestaurant } from '@/lib/storage'
import type { Restaurant } from '@/lib/types'

const menuItems = [
  { title: 'Commandes',  url: '/restaurant/dashboard',           icon: ClipboardList },
  { title: 'Livreurs',   url: '/restaurant/dashboard/livreurs',  icon: Users         },
  { title: 'Locations',  url: '/restaurant/dashboard/locations', icon: MapPin        },
  { title: 'Finance',    url: '/restaurant/dashboard/finance',   icon: Wallet        },
  { title: 'Contact', url: '/restaurant/dashboard/contact', icon: Phone    },
  { title: 'Promo',   url: '/restaurant/dashboard/promo',   icon: Tag      },
]

export function RestaurantSidebar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)

  useEffect(() => {
    const r = getCurrentRestaurant()
    if (!r) { router.push('/restaurant/login'); return }
    setRestaurant(r)
  }, [router])

  const handleLogout = () => {
    logoutRestaurant()
    router.push('/')
  }

  if (!restaurant) return null

  const restaurantLink = `/restaurant/${restaurant.id}`

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen bg-[#0A0A0A] border-r border-white/5 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #FF7A00 0%, transparent 70%)' }}
        />
      </div>

      {/* Brand */}
      <div className="relative px-5 py-5 border-b border-white/5 flex-shrink-0">
        <Link href={restaurantLink} className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF7A00, #E06000)', boxShadow: '0 4px 12px rgba(255,122,0,0.4)' }}
          >
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white tracking-wider uppercase leading-none">Chitir</p>
            <p className="text-[10px] text-white/30 font-semibold mt-0.5">Restaurant</p>
          </div>
        </Link>
      </div>

      {/* Restaurant info card */}
      <div className="relative px-4 py-4 border-b border-white/5 flex-shrink-0">
        <div className="bg-white/[0.04] border border-white/8 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-black text-white truncate">{restaurant.nom}</p>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-white/25 flex-shrink-0" />
            <p className="text-[11px] text-white/35 font-medium truncate">
              {restaurant.quartier ? `${restaurant.quartier}, ` : ''}{restaurant.ville}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Home className="w-3 h-3 text-white/25 flex-shrink-0" />
            <p className="text-[10px] text-white/25 font-mono truncate">{restaurant.id}</p>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold">En ligne</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-2 mb-3">Navigation</p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url === '/restaurant/dashboard' && pathname === restaurantLink)

            return (
              <li key={item.title}>
                <Link
                  href={item.url}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? 'text-white bg-white/10 border border-white/10'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent'
                    }
                  `}
                >
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${isActive
                      ? 'bg-[#FF7A00] shadow-[0_4px_10px_rgba(255,122,0,0.4)]'
                      : 'bg-white/5'
                    }
                  `}>
                    <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-white/40'}`} />
                  </div>
                  <span>{item.title}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-[#FF7A00]" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="relative px-3 py-4 border-t border-white/5 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 font-semibold text-sm hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/15 transition-all duration-200"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          Déconnexion
        </button>
      </div>

    </aside>
  )
}