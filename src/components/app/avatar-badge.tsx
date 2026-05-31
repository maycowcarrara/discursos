type AvatarBadgeProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
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

export function AvatarBadge({ name, size = 'md' }: AvatarBadgeProps) {
  return (
    <div
      className={`flex ${sizeClasses[size]} shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#2b68ee,#10295f)] font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,42,99,0.9)] dark:bg-[linear-gradient(145deg,#4d84ff,#16306f)] dark:shadow-[0_18px_34px_-20px_rgba(37,99,235,0.75)]`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  )
}
