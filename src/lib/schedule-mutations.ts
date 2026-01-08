import {
  db,
  type Weekday,
  type DefaultScheduleSlot,
  type MonthSlot,
  type ScheduleSlot,
  type ExcludedScheduleSlot,
} from "@/lib/db"

// Note: With Dexie Cloud's @id schema, IDs are auto-generated on add()

// ============================================================================
// DefaultScheduleSlot (Jobs weekly template)
// ============================================================================

export async function toggleDefaultScheduleSlot(jobId: string, weekday: Weekday): Promise<void> {
  // Check if slot exists
  const existing = await db.defaultScheduleSlots
    .where("[weekday+jobId]")
    .equals([weekday, jobId])
    .first()

  if (existing) {
    await db.defaultScheduleSlots.delete(existing.id)
  } else {
    // With @id schema, Dexie auto-generates the ID
    await db.defaultScheduleSlots.add({
      weekday,
      jobId,
    } as DefaultScheduleSlot)
  }
}

// ============================================================================
// MonthSlot (Projects 6-month timeline)
// ============================================================================

export async function toggleMonthSlot(
  projectId: string,
  month: string // YYYY-MM
): Promise<void> {
  // Check if slot exists
  const existing = await db.monthSlots.where("[month+projectId]").equals([month, projectId]).first()

  if (existing) {
    await db.monthSlots.delete(existing.id)
  } else {
    // With @id schema, Dexie auto-generates the ID
    await db.monthSlots.add({
      month,
      projectId,
    } as MonthSlot)
  }
}

// ============================================================================
// ScheduleSlot (7-day schedule)
// ============================================================================

export async function toggleScheduleSlot(
  scopeId: string,
  date: string // YYYY-MM-DD
): Promise<void> {
  // Check if slot exists
  const existing = await db.scheduleSlots.where("[date+scopeId]").equals([date, scopeId]).first()

  if (existing) {
    // Removing a slot - delete it
    await db.scheduleSlots.delete(existing.id)

    // Add exclusion to prevent sync re-adding it (for all dates in the 7-day window)
    const existingExclusion = await db.excludedScheduleSlots
      .where("[date+scopeId]")
      .equals([date, scopeId])
      .first()

    if (!existingExclusion) {
      await db.excludedScheduleSlots.add({
        date,
        scopeId,
      } as ExcludedScheduleSlot)
    }
  } else {
    // Adding a slot - create it
    const dateObj = new Date(date + "T00:00:00")
    const weekdayIndex = dateObj.getDay() // 0 = Sunday
    const weekdays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const weekday = weekdays[weekdayIndex]

    // With @id schema, Dexie auto-generates the ID
    await db.scheduleSlots.add({
      date,
      weekday,
      scopeId,
    } as ScheduleSlot)

    // Remove any exclusion for this slot
    const existingExclusion = await db.excludedScheduleSlots
      .where("[date+scopeId]")
      .equals([date, scopeId])
      .first()

    if (existingExclusion) {
      await db.excludedScheduleSlots.delete(existingExclusion.id)
    }
  }
}
