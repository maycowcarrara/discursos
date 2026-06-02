import { cn } from '@/lib/utils'

export type MetadataChipTone = 'default' | 'pending' | 'success' | 'warning'

function getMetadataChipClassName(tone: MetadataChipTone) {
  if (tone === 'success') {
    return 'border-emerald-400 text-emerald-800 dark:border-emerald-500 dark:text-emerald-100'
  }

  if (tone === 'warning') {
    return 'border-amber-400 text-amber-800 dark:border-amber-500 dark:text-amber-100'
  }

  if (tone === 'pending') {
    return 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
  }

  return 'border-border text-foreground'
}

export function MetadataChip({
  label,
  tone = 'default',
  value,
}: {
  label: string
  tone?: MetadataChipTone
  value: string
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-baseline gap-1.5 border-l-2 bg-transparent py-0.5 pl-2 pr-1 text-xs leading-4',
        getMetadataChipClassName(tone),
      )}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </span>
  )
}
