import { LoaderCircle, ShieldCheck } from 'lucide-react'

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 w-full max-w-sm rounded-[28px] border border-border/75 bg-card px-6 py-7 text-center shadow-[0_28px_54px_-42px_rgba(15,23,42,0.24)] backdrop-blur-sm motion-safe:duration-500 dark:shadow-[0_28px_54px_-38px_rgba(2,8,23,0.9)]">
        <div
          className="relative mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-[0_16px_34px_-24px_rgba(37,99,235,0.55)]"
          aria-hidden="true"
        >
          <span className="absolute inset-0 rounded-2xl border border-primary/20 motion-safe:animate-ping" />
          <LoaderCircle className="absolute size-12 opacity-70 motion-safe:animate-spin motion-safe:[animation-duration:1.8s]" />
          <ShieldCheck className="relative size-5" />
        </div>
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          Acesso administrativo
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-[1.35rem]">
          Validando seu acesso
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          Estamos confirmando sua sessão e preparando o painel com segurança.
        </p>
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-primary/80 motion-safe:animate-bounce" />
          <span className="size-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce motion-safe:[animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-primary/40 motion-safe:animate-bounce motion-safe:[animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
