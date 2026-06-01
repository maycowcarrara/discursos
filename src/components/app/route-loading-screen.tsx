export function RouteLoadingScreen() {
  return (
    <div className="flex min-h-64 items-center justify-center px-6">
      <div className="rounded-[18px] border border-border/70 bg-card/90 px-5 py-4 text-center shadow-[0_12px_28px_-20px_rgba(15,23,42,0.16)]">
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
