import { cn } from '@/lib/utils'

type AvatarBadgeProps = {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses: Record<NonNullable<AvatarBadgeProps['size']>, string> = {
  sm: 'size-10 text-sm',
  md: 'size-12 text-base',
  lg: 'size-16 text-lg',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AvatarBadge({
  name,
  photoUrl,
  size = 'md',
  className,
}: AvatarBadgeProps) {
  return (
    <div
      className={cn(
        `flex ${sizeClasses[size]} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#2f6ef2,#15377d)] font-semibold text-white shadow-[0_12px_26px_-18px_rgba(21,55,125,0.86)] dark:bg-[linear-gradient(145deg,#4d84ff,#17336a)] dark:shadow-[0_18px_30px_-18px_rgba(37,99,235,0.72)]`,
        className,
      )}
      aria-hidden="true"
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
