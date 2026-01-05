"use client"

export default function OfflinePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">You're Offline</h1>
        <p className="mt-2 text-muted-foreground">
          Backboard is a local-first app, but some features require an internet connection.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  )
}
