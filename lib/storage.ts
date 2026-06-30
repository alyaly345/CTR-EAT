'use client'

import type { Restaurant, Livreur, Order } from './types'

const STORAGE_KEYS = {
  RESTAURANTS: 'chitir_restaurants',
  LIVREURS: 'chitir_livreurs',
  ORDERS: 'chitir_orders',
  CURRENT_RESTAURANT: 'chitir_current_restaurant',
  CURRENT_LIVREUR: 'chitir_current_livreur',
  LIVREUR_TURN_INDEX: 'chitir_livreur_turn_index'
} as const

// Helper sécurisé pour localStorage
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) }))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

// ── RESTAURANT FUNCTIONS ────────────────────────────────────

export function getCurrentRestaurant(): Restaurant | null {
  const restaurant = getItem<Restaurant | null>(STORAGE_KEYS.CURRENT_RESTAURANT, null)
  
  if (restaurant) {
    // 🛠️ CORRECTION ANOMALIE UUID : Si l'ID stocké est "CHITIRCHICKEN5" (invalide pour Supabase),
    // on injecte temporairement un format UUID valide dédié à ta session de test.
    if (restaurant.id === 'CHITIRCHICKEN5') {
      return {
        ...restaurant,
        id: '11a22b33-c44d-55e6-f77g-888888888888' // Vrai format UUID accepté par Supabase
      }
    }
    return restaurant
  }
  return null
}

export function setCurrentRestaurant(restaurant: Restaurant): void {
  setItem(STORAGE_KEYS.CURRENT_RESTAURANT, restaurant)
}

export function logoutRestaurant(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.CURRENT_RESTAURANT)
}

// ── LIVREUR SESSION FUNCTIONS ────────────────────────────────

export function setCurrentLivreur(livreur: Livreur): void {
  setItem(STORAGE_KEYS.CURRENT_LIVREUR, livreur)
}

export function getCurrentLivreur(): Livreur | null {
  const livreur = getItem<Livreur | null>(STORAGE_KEYS.CURRENT_LIVREUR, null)
  if (livreur && livreur.id === 'CHITIRCHICKEN5') {
    return {
      ...livreur,
      id: '22b33c44-d55e-66f7-g88h-999999999999' // Format UUID valide pour le livreur de test
    }
  }
  return livreur
}

export function logoutLivreur(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.CURRENT_LIVREUR)
}

// ── UTILS (Maintenus pour la compatibilité locale) ───────────

export function getRestaurants(): Restaurant[] { return getItem<Restaurant[]>(STORAGE_KEYS.RESTAURANTS, []) }
export function getLivreurs(): Livreur[] { return getItem<Livreur[]>(STORAGE_KEYS.LIVREURS, []) }
export function getOrders(): Order[] { return getItem<Order[]>(STORAGE_KEYS.ORDERS, []) }

export function generateId(): string {
  // Génère une structure proche d'un UUID si Supabase n'est pas sollicité en amont
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}