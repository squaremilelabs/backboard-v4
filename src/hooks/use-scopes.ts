"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db, type ScopeType } from "@/lib/db"

export function useScopes(type: ScopeType) {
  return useLiveQuery(
    () =>
      db.scopes
        .where("type")
        .equals(type)
        .filter((scope) => !scope.archivedAt)
        .toArray(),
    [type]
  )
}

export function useScope(id: string | null) {
  return useLiveQuery(() => (id ? db.scopes.get(id) : undefined), [id])
}
