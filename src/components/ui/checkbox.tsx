import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) { return <CheckboxPrimitive.Root className={cn('ui-checkbox', className)} {...props}><CheckboxPrimitive.Indicator><Check size={14} /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root> }
