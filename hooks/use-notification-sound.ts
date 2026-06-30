'use client'

import { useCallback, useRef, useEffect } from 'react'

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isPlayingRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }, [])

  const startNotificationSound = useCallback((duration: number = 30000) => {
    if (isPlayingRef.current) return

    isPlayingRef.current = true
    playBeep()
    
    intervalRef.current = setInterval(() => {
      playBeep()
    }, 2000)

    setTimeout(() => {
      stopNotificationSound()
    }, duration)
  }, [playBeep])

  const stopNotificationSound = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isPlayingRef.current = false
  }, [])

  return {
    playBeep,
    startNotificationSound,
    stopNotificationSound,
  }
}
