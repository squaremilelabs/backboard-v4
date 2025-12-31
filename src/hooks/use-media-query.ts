"use client"

import { useSyncExternalStore } from "react"

function getServerSnapshot(): boolean {
  return false
}

export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener("change", callback)
    return () => media.removeEventListener("change", callback)
  }

  const getSnapshot = () => {
    return window.matchMedia(query).matches
  }

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Convenience hook for mobile detection
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)")
}
