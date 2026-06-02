export function RouteLoadingScreen() {
  return (
    <div className="flex min-h-64 items-center justify-center px-6">
      <div className="rounded-xl border border-border bg-card px-5 py-4 text-center shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
          Carregando
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Preparando esta tela para você.
        </p>
      </div>
    </div>
  )
}
