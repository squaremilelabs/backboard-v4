"use client"

import { useCallback, useSyncExternalStore } from "react"

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return defaultValue
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Use useSyncExternalStore to properly subscribe to localStorage
  const subscribe = useCallback(
    (callback: () => void) => {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === key) callback()
      }
      window.addEventListener("storage", handleStorage)
      return () => window.removeEventListener("storage", handleStorage)
    },
    [key]
  )

  const getSnapshot = useCallback(() => {
    return getStorageValue(key, defaultValue)
  }, [key, defaultValue])

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback(
    (newValue: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
        // Dispatch storage event for same-window updates
        window.dispatchEvent(new StorageEvent("storage", { key }))
      } catch {
        // Ignore write errors
      }
    },
    [key]
  )

  return [value, setValue]
}
