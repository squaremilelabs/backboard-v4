import { db, type Scope, type ScopeType } from "@/lib/db"

// Note: With Dexie Cloud's @id schema, IDs are auto-generated on add()
// The add() method returns the generated ID

export async function createScope(
  type: ScopeType,
  title: string,
  parentId?: string
): Promise<string> {
  // With @id schema, Dexie auto-generates the ID and returns it
  const id = (await db.scopes.add({
    type,
    title,
    parentId,
    createdAt: Date.now(),
  } as Scope)) as string
  return id
}

export async function updateScopeTitle(id: string, title: string): Promise<void> {
  await db.scopes.update(id, { title })
}

export async function archiveScope(id: string): Promise<void> {
  await db.scopes.update(id, { archivedAt: Date.now() })
}

export async function unarchiveScope(id: string): Promise<void> {
  await db.scopes.update(id, { archivedAt: undefined })
}
