import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import RegisterSW from './register-sw'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'CHITIRCHICKEN - Gestion Restaurant & Livraison',
  description: 'Application de gestion pour restaurants et livreurs CHITIRCHICKEN',
  generator: 'v0.app',
  manifest: '/manifest.json',
  themeColor: '#F97316',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Livreur',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        <RegisterSW />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}