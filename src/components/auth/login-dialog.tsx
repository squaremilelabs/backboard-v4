"use client"

import { useState } from "react"
import { useObservable } from "dexie-react-hooks"
import { resolveText, type DXCInputField, type DXCUserInteraction } from "dexie-cloud-addon"
import { Loader2, Mail, KeyRound, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/db"

/**
 * Login dialog that handles Dexie Cloud's OTP authentication flow
 * Automatically appears when db.cloud.userInteraction emits a login request
 */
export function LoginDialog() {
  const userInteraction = useObservable(db.cloud.userInteraction)

  if (!userInteraction) return null

  return <LoginDialogContent ui={userInteraction} />
}

interface LoginDialogContentProps {
  ui: DXCUserInteraction
}

function LoginDialogContent({ ui }: LoginDialogContentProps) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await ui.onSubmit(params)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    try {
      await ui.onCancel?.()
    } catch {
      // Expected: Dexie Cloud rejects with "User cancelled" - silently ignore
    }
  }

  // Determine dialog icon based on type
  const getIcon = () => {
    switch (ui.type) {
      case "email":
        return <Mail className="h-6 w-6 text-muted-foreground" />
      case "otp":
        return <KeyRound className="h-6 w-6 text-muted-foreground" />
      default:
        return null
    }
  }

  // Get description based on type
  const getDescription = () => {
    switch (ui.type) {
      case "email":
        return "Enter your email to receive a one-time login code"
      case "otp":
        return "Check your email for the login code"
      case "message-alert":
        return null
      case "logout-confirmation":
        return "You will be logged out of cloud sync"
      default:
        return null
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <DialogTitle>{ui.title}</DialogTitle>
              {getDescription() && <DialogDescription>{getDescription()}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        {/* Alerts */}
        {ui.alerts && ui.alerts.length > 0 && (
          <div className="space-y-2">
            {ui.alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                  alert.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : alert.type === "warning"
                      ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resolveText(alert)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(ui.fields as Record<string, DXCInputField>).map(
            ([fieldName, field], idx) => (
              <div key={fieldName} className="space-y-2">
                {field.label && (
                  <label htmlFor={fieldName} className="text-sm leading-none font-medium">
                    {field.label}
                  </label>
                )}
                <Input
                  id={fieldName}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={params[fieldName] ?? ""}
                  onChange={(e) => setParams((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                  autoFocus={idx === 0}
                  disabled={isSubmitting}
                  className="font-mono"
                />
              </div>
            )
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {ui.cancelLabel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {ui.cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ui.submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
