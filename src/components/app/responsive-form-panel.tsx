import type { ReactNode } from 'react'

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { cn } from '@/lib/utils'

type ResponsiveFormPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
}

export function ResponsiveFormPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: ResponsiveFormPanelProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        className={cn(
          'flex max-h-[calc(100vh-1.5rem)] max-w-4xl flex-col overflow-hidden rounded-xl sm:max-h-[calc(100vh-2.5rem)]',
          className,
        )}
      >
        <ModalHeader className="bg-card">
          <ModalTitle>{title}</ModalTitle>
          {description ? (
            <ModalDescription>{description}</ModalDescription>
          ) : null}
        </ModalHeader>
        <ModalBody className={cn('min-h-0 flex-1 overflow-y-auto', bodyClassName)}>
          {children}
        </ModalBody>
        {footer ? (
          <ModalFooter className="bg-card">
            {footer}
          </ModalFooter>
        ) : null}
      </ModalContent>
    </Modal>
  )
}
