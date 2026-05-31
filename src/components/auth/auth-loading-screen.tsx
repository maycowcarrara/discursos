export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-[32px] border border-border/70 bg-card/90 px-8 py-10 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Autenticacao
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground">
          Verificando sessao
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Restaurando acesso e preparando as rotas protegidas.
        </p>
      </div>
    </div>
  )
}
