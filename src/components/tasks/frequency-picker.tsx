"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Clock } from "lucide-react"
import { WEEKDAYS } from "./frequency-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { FrequencyValue, Weekday } from "@/lib/db"

// Common timezone options
const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
]

interface FrequencyPickerProps {
  frequency: FrequencyValue[]
  userTimezone: string
  onFrequencyChange: (frequency: FrequencyValue[]) => void
  onTimezoneChange: (timezone: string) => void
  trigger: React.ReactNode
  themeClass?: string
}

export function FrequencyPicker({
  frequency,
  userTimezone,
  onFrequencyChange,
  onTimezoneChange,
  trigger,
  themeClass,
}: FrequencyPickerProps) {
  const [open, setOpen] = useState(false)
  const [localFrequency, setLocalFrequency] = useState<FrequencyValue[]>(frequency)
  const [localTimezone, setLocalTimezone] = useState(userTimezone)

  // Sync local state when props change
  useEffect(() => {
    setLocalFrequency(frequency)
  }, [frequency])

  useEffect(() => {
    setLocalTimezone(userTimezone)
  }, [userTimezone])

  const handleSave = () => {
    onFrequencyChange(localFrequency)
    if (localTimezone !== userTimezone) {
      onTimezoneChange(localTimezone)
    }
    setOpen(false)
  }

  const handleCancel = () => {
    setLocalFrequency(frequency)
    setLocalTimezone(userTimezone)
    setOpen(false)
  }

  const addFrequency = () => {
    const newEntry: FrequencyValue = {
      weekday: "mon",
      time: "09:00",
      timezone: localTimezone,
    }
    setLocalFrequency([...localFrequency, newEntry])
  }

  const removeFrequency = (index: number) => {
    setLocalFrequency(localFrequency.filter((_, i) => i !== index))
  }

  const updateFrequency = (index: number, updates: Partial<FrequencyValue>) => {
    setLocalFrequency(
      localFrequency.map((f, i) =>
        i === index ? { ...f, ...updates, timezone: localTimezone } : f
      )
    )
  }

  const toggleWeekday = (index: number, weekday: Weekday) => {
    updateFrequency(index, { weekday })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn("w-80 p-0", themeClass)} align="end">
        <div className="flex flex-col">
          {/* Header */}
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-medium">Schedule</h4>
            <p className="text-xs text-muted-foreground">Set when this task should repeat</p>
          </div>

          {/* Timezone selector */}
          <div className="border-b px-4 py-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Timezone
            </label>
            <select
              value={localTimezone}
              onChange={(e) => setLocalTimezone(e.target.value)}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-1.5 text-sm",
                "focus:ring-2 focus:ring-ring focus:outline-none"
              )}
            >
              {/* Add current timezone if not in list */}
              {!TIMEZONE_OPTIONS.includes(localTimezone) && (
                <option value={localTimezone}>{localTimezone}</option>
              )}
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency entries */}
          <div className="max-h-64 overflow-y-auto px-4 py-3">
            {localFrequency.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No schedule set (template mode)
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {localFrequency.map((entry, index) => (
                  <FrequencyEntry
                    key={index}
                    entry={entry}
                    onWeekdayChange={(weekday) => toggleWeekday(index, weekday)}
                    onTimeChange={(time) => updateFrequency(index, { time })}
                    onRemove={() => removeFrequency(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add frequency button */}
          <div className="border-t px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addFrequency}
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" />
              Add schedule
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FrequencyEntryProps {
  entry: FrequencyValue
  onWeekdayChange: (weekday: Weekday) => void
  onTimeChange: (time: string) => void
  onRemove: () => void
}

function FrequencyEntry({ entry, onWeekdayChange, onTimeChange, onRemove }: FrequencyEntryProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      {/* Weekday selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {WEEKDAYS.map(({ key, label }) => {
            const isActive = entry.weekday === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onWeekdayChange(key)}
                className={cn(
                  `flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                  transition-colors`,
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Time input */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Input
          type="time"
          value={entry.time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="h-7 w-auto px-2 text-sm"
        />
      </div>
    </div>
  )
}
