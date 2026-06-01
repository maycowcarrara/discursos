import type { HTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  closeOnBackdrop?: boolean
}

export function Modal({
  open,
  onOpenChange,
  children,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onOpenChange, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={() => {
          if (closeOnBackdrop) {
            onOpenChange(false)
          }
        }}
      />
      <div className="absolute inset-0 overflow-y-auto p-3 sm:p-5 lg:p-8">
        <div className="flex min-h-full items-center justify-center">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ModalContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'relative w-full max-w-5xl rounded-[28px] border border-border/70 bg-card shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] dark:shadow-[0_32px_90px_-42px_rgba(2,8,23,0.92)]',
        className,
      )}
      {...props}
    />
  )
}

export function ModalHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5', className)}
      {...props}
    />
  )
}

export function ModalBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-4 sm:px-6 sm:py-5', className)} {...props} />
}

export function ModalFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t border-border/70 px-4 py-4 sm:px-6 sm:py-5',
        className,
      )}
      {...props}
    />
  )
}

export function ModalTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-xl font-semibold text-foreground sm:text-2xl', className)}
      {...props}
    />
  )
}

export function ModalDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm leading-6 text-muted-foreground', className)} {...props} />
  )
}
