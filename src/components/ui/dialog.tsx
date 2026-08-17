import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
export function DialogContent({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="ui-dialog-overlay" /><DialogPrimitive.Content className={cn('ui-dialog-content', className)} {...props} /></DialogPrimitive.Portal>
}
export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('ui-dialog-header', className)} {...props} /> }
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('ui-dialog-footer', className)} {...props} /> }
