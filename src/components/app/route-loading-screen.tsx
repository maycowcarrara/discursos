export function RouteLoadingScreen() {
  return (
    <div className="flex min-h-64 items-center justify-center px-6">
      <div className="rounded-[24px] border border-border/70 bg-card/90 px-6 py-5 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Carregando
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Preparando esta tela.
        </p>
      </div>
    </div>
  )
}
