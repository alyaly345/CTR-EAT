export interface Restaurant {
  id: string
  nom: string
  pays?: string
  ville: string
  quartier?: string
  email?: string
  password?: string
  created_at?: string
}

export interface Livreur {
  id: string
  nom: string
  numero: string
  restaurant_id: string       // ✅ snake_case = colonne Supabase
  "restaurantId"?: string     // ✅ colonne générée pour le login
  is_available: boolean       // ✅ snake_case = colonne Supabase
  created_at?: string
}

export type OrderStatus =
  | 'pending'
  | 'sent'
  | 'accepted'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'

export interface OrderItem {
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  restaurant_id: string       // ✅ snake_case
  livreur_id: string | null   // ✅ snake_case
  customer_name: string       // ✅ snake_case
  customer_phone: string      // ✅ snake_case
  customer_address: string    // ✅ snake_case
  items: OrderItem[]
  total: number
  status: OrderStatus
  created_at: string
  updated_at: string
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    'En attente',
  sent:       'Envoyée au livreur',
  accepted:   'Acceptée',
  picked_up:  'Nourriture récupérée',
  on_the_way: 'En route',
  delivered:  'Livrée',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  sent:       'bg-blue-100 text-blue-800',
  accepted:   'bg-indigo-100 text-indigo-800',
  picked_up:  'bg-purple-100 text-purple-800',
  on_the_way: 'bg-orange-100 text-orange-800',
  delivered:  'bg-green-100 text-green-800',
}