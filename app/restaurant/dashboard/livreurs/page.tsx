'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentRestaurant } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/lib/types'
import { 
  Plus, 
  Users, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Phone, 
  MapPin, 
  X, 
  CheckCircle2, 
  ShoppingBag 
} from 'lucide-react'

interface LivreurRow {
  id: string        
  nom: string
  numero: string
  restaurant_id: string
  is_available: boolean
  created_at: string
}

/* ── Interface alignée sur ton modèle de commande et ton Dashboard ── */
interface OrderRow {
  id: string
  restaurant_id: string
  livreur_id: string | null
  customer_name?: string
  client_nom?: string
  nom_client?: string
  customer_phone?: string
  customer_address?: string
  total: number
  status: string
  created_at: string
}

export default function LivreursPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [livreurs, setLivreurs] = useState<LivreurRow[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({ nom: '', numero: '', id: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const generateLivreurId = () => 'LIV-' + Math.random().toString(36).substring(2, 6).toUpperCase()

  /* ── États additionnels pour la gestion des commandes livreurs ── */
  const [activeOrders, setActiveOrders] = useState<OrderRow[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('FCFA')

  // Charger la devise au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('restaurant_currency') || 'XOF'
      if (savedCurrency === 'EUR') setCurrencySymbol('€')
      else if (savedCurrency === 'USD') setCurrencySymbol('$')
      else setCurrencySymbol('FCFA')
    }
  }, [])

  const loadData = useCallback(async (restaurantId: string) => {
    try {
      setIsLoading(true)
      // 1. Charger les livreurs
      const { data: livreursData, error: fetchError } = await supabase
        .from('livreurs')
        .select('*')
        .eq('restaurant_id', restaurantId)   
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setLivreurs(livreursData || [])

      // 2. Charger les commandes en attente ou attribuées aux livreurs (Statut en cours de livraison ou dispatché)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['accepted', 'dispatched', 'cooking']) // Commandes actives à livrer
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError
      setActiveOrders(ordersData || [])

    } catch (err) {
      console.error('Erreur lors de la récupération des données:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const r = getCurrentRestaurant()
    if (!r) {
      router.push('/restaurant/login')
      return
    }
    setRestaurant(r)
    loadData(r.id)
  }, [router, loadData])

  /* ── Realtime pour mettre à jour les écrans livreurs instantanément ── */
  useEffect(() => {
    if (!restaurant?.id) return

    const channel = supabase
      .channel(`livreurs_orders_realtime_${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => { loadData(restaurant.id) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livreurs', filter: `restaurant_id=eq.${restaurant.id}` },
        () => { loadData(restaurant.id) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurant?.id, loadData])
   const handleAddLivreur = async () => {
    if (!restaurant) return
    setError('')

    if (!formData.nom || !formData.numero || !formData.id) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setIsSubmitting(true)

    try {
      const { error: insertError } = await supabase
        .from('livreurs')
        .insert([{
          id:            formData.id.trim().toUpperCase(),
          nom:           formData.nom.trim(),
          numero:        formData.numero.trim(),
          restaurant_id: restaurant.id,   
          is_available:  true,             
          created_at:    new Date().toISOString(), 
        }])

      if (insertError) throw insertError

      setFormData({ nom: '', numero: '', id: '' })
      setIsAddOpen(false)
      await loadData(restaurant.id)

    } catch (err: any) {
      console.error('Exception création livreur :', err)
      setError(err.message || 'Erreur lors de la création du livreur.')
    } finally {
      setIsSubmitting(false)
    }
  }
  const handleDeleteLivreur = async (id: string) => {
    if (!restaurant) return
    const { error } = await supabase.from('livreurs').delete().eq('id', id)
    if (error) {
      console.error('Erreur suppression livreur :', error)
      return
    }
    await loadData(restaurant.id)
  }

  /* ── 🔄 LOGIQUE DE REFUS INTELLIGENTE ET PASSAGE AU SUIVANT ── */
  const handleRefuseOrder = async (orderId: string, currentLivreurId: string | null) => {
    if (!restaurant) return

    try {
      // Trouver tous les livreurs disponibles pour ce restaurant (exclure celui qui vient de refuser)
      const availableLivreurs = livreurs.filter(
        l => l.is_available && l.id !== currentLivreurId
      )

      let nextLivreurId: string | null = null

      if (availableLivreurs.length > 0) {
        // Il y a un autre livreur disponible -> On prend le premier de la liste
        nextLivreurId = availableLivreurs[0].id
      } else {
        // S'il n'y a personne d'autre ou un seul livreur -> La commande revient à lui-même
        nextLivreurId = currentLivreurId
      }

      // Mettre à jour la commande dans Supabase avec le nouvel ID du livreur attribué
      const { error: updateError } = await supabase
        .from('orders')
        .update({ livreur_id: nextLivreurId })
        .eq('id', orderId)

      if (updateError) throw updateError
      await loadData(restaurant.id)

    } catch (err) {
      console.error('Erreur lors du traitement du refus de commande:', err)
    }
  }

  /* ── Valider/Accepter la livraison par le livreur ── */
  const handleAcceptOrder = async (orderId: string) => {
    if (!restaurant) return
    try {
      await supabase
        .from('orders')
        .update({ status: 'delivered' }) // Passe directement à livré/encaissé
        .eq('id', orderId)
      
      await loadData(restaurant.id)
    } catch (err) {
      console.error(err)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.left = '-999999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!restaurant) return null

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Gestion Logistique Livreurs</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les livreurs et suivez les courses en temps réel pour <span className="font-semibold text-primary">{restaurant.nom}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="icon" onClick={() => loadData(restaurant.id)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open)
            if (open) setFormData({ nom: '', numero: '', id: generateLivreurId() })
            }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un livreur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[92vw] sm:w-full rounded-xl">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau livreur</DialogTitle>
                <DialogDescription>
                  Enregistrez un livreur pour lui attribuer des livraisons en temps réel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du livreur</Label>
                  <Input
                    id="nom"
                    placeholder="Jean Dupont"
                    value={formData.nom}
                    onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Numéro de téléphone</Label>
                  <Input
                    id="numero"
                    placeholder="77000000"
                    value={formData.numero}
                    onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="livreur-id">ID Livreur (à communiquer au livreur)</Label>
                  <Input
                    id="livreur-id"
                    placeholder="LIV-001"
                    value={formData.id}
                    onChange={e => setFormData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                    className="font-mono"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
                )}

                <Button onClick={handleAddLivreur} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Ajouter le livreur'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total livreurs</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{livreurs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Disponibles</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {livreurs.filter(l => l.is_available).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* ── 📱 NOUVELLE SECTION : RUNTIME & DISPATCH DES COMMANDES POUR LIVREURS (STYLE RESTAURANT DASHBOARD) ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Écran d'expédition des courses (Vue Livreur)</h2>
        </div>

        {activeOrders.length === 0 ? (
          <Card className="border-dashed shadow-none text-center py-8">
            <p className="text-sm text-muted-foreground">Aucune course active en attente d'expédition pour le moment.</p>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {activeOrders.map(order => {
              // Trouver le nom du livreur assigné actuel pour l'afficher sur le badge
              const assignedLivreur = livreurs.find(l => l.id === order.livreur_id)
              const clientNom = order.customer_name || order.client_nom || order.nom_client || 'Client anonyme'
              const clientTel = order.customer_phone || 'Non renseigné'
              const clientAdresse = order.customer_address || 'Non renseignée'
              
              return (
                <Card key={order.id} className="overflow-hidden border border-sidebar-border shadow-md bg-card transition-all hover:shadow-lg">
                  {/* Premium Header type Dashboard */}
                  <div className="bg-muted/50 p-4 border-b border-sidebar-border flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-mono text-muted-foreground block">ID: {order.id.slice(0, 8)}...</span>
                      <span className="text-xs text-gray-500">
                        Reçue à : {order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                        {order.total.toLocaleString('fr-FR')} {currencySymbol}
                      </Badge>
                      <Badge className="bg-amber-500 text-white border-none">
                        {assignedLivreur ? `Assigné à : ${assignedLivreur.nom}` : 'En attente'}
                      </Badge>
                    </div>
                  </div>

                  {/* Body avec infos clients, téléphone et Localisation cliquable Google Maps */}
                  <CardContent className="p-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-semibold text-foreground text-base">{clientNom}</span>
                    </div>

                    {/* Téléphone Client */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">Tél :</span>
                      <a href={`tel:${clientTel}`} className="text-primary hover:underline font-semibold">
                        {clientTel}
                      </a>
                    </div>

                    {/* Localisation Cliquable (Ouvre Google Maps directement) */}
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span className="font-medium">Adresse :</span>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAdresse)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium flex items-center gap-1 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-200/30 text-xs transition-all hover:bg-blue-500/10"
                        title="Ouvrir l'adresse dans Google Maps"
                      >
                        {clientAdresse}
                      </a>
                    </div>

                    {/* 🕹️ Boutons d'actions pour le livreur (Accepter / Refuser avec algorithme cascade) */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full font-medium"
                        onClick={() => handleRefuseOrder(order.id, order.livreur_id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Refuser / Suivant
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        onClick={() => handleAcceptOrder(order.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Terminer Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Liste des comptes Livreurs */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Chargement des livreurs...
          </CardContent>
        </Card>
      ) : livreurs.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6 border-b">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Liste des livreurs ({livreurs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="space-y-3">
              {livreurs.map(livreur => (
                <div
                  key={livreur.id}
                  className="flex items-center justify-between p-4 border rounded-xl bg-white hover:bg-slate-50/50 transition-all gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-foreground">{livreur.nom}</span>
                      <Badge
                        variant={livreur.is_available ? 'default' : 'secondary'}
                        className={livreur.is_available ? 'bg-green-100 text-green-700 border-green-200' : ''}
                      >
                        {livreur.is_available ? 'Disponible' : 'Occupé'}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      📞 {livreur.numero}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono truncate max-w-[180px]">
                        ID: {livreur.id}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(
                          `Nom: ${livreur.nom}\nNuméro: ${livreur.numero}\nID: ${livreur.id}`,
                          livreur.id
                        )}
                        title="Copier les identifiants"
                      >
                        {copiedId === livreur.id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer {livreur.nom} ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le livreur ne pourra plus recevoir de commandes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteLivreur(livreur.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-16 text-center max-w-sm mx-auto">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4 stroke-[1.5]" />
            <h3 className="text-lg font-semibold tracking-tight">Aucun livreur</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Ajoutez des livreurs pour pouvoir dispatcher vos commandes automatiquement.
            </p>
            <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un livreur
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}