import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function FieldGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('ui-field-group', className)} {...props} /> }
export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('ui-field', className)} {...props} /> }
