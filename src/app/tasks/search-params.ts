import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server"
import { parseAsString } from "nuqs"

export const taskListTypes = ["now", "later", "backlog", "recurring", "recent"] as const
export type TaskListType = (typeof taskListTypes)[number]

// Search param parsers
export const searchParamsParsers = {
  // List type: "now" | "later" | "backlog" | "recurring" | "recent"
  list: parseAsStringLiteral(taskListTypes).withDefault("now"),

  // Scope: "triage" or a scope ID
  scope: parseAsString.withDefault("triage"),
}

// Server-side cache for SSR
export const searchParamsCache = createSearchParamsCache(searchParamsParsers)
