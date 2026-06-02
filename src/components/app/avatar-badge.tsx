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
        `flex ${sizeClasses[size]} shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300 bg-blue-600 font-black text-white shadow-sm`,
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
