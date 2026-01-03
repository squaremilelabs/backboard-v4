import { db, type Weekday } from "@/lib/db"

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
    await db.defaultScheduleSlots.add({
      id: crypto.randomUUID(),
      weekday,
      jobId,
    })
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
    await db.monthSlots.add({
      id: crypto.randomUUID(),
      month,
      projectId,
    })
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
    await db.scheduleSlots.delete(existing.id)
  } else {
    // Derive weekday from date
    const dateObj = new Date(date + "T00:00:00")
    const weekdayIndex = dateObj.getDay() // 0 = Sunday
    const weekdays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const weekday = weekdays[weekdayIndex]

    await db.scheduleSlots.add({
      id: crypto.randomUUID(),
      date,
      weekday,
      scopeId,
    })
  }
}
