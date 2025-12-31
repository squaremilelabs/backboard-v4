import { db, type ScopeType } from "@/lib/db"

export async function createScope(
  type: ScopeType,
  title: string,
  parentId?: string
): Promise<string> {
  const id = crypto.randomUUID()
  await db.scopes.add({
    id,
    type,
    title,
    parentId,
    createdAt: Date.now(),
  })
  return id
}

export async function updateScopeTitle(id: string, title: string): Promise<void> {
  await db.scopes.update(id, { title })
}

export async function archiveScope(id: string): Promise<void> {
  await db.scopes.update(id, { archivedAt: Date.now() })
}
