import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
  {
    variants: {
      variant: {
        primary: 'bg-brand-gradient text-white shadow-[0_8px_30px_-8px_rgba(139,92,246,0.7)] hover:brightness-110',
        glass: 'glass text-fg hover:bg-white/10',
        ghost: 'text-fg hover:bg-[var(--glass)]',
        outline: 'border border-line text-fg hover:bg-[var(--glass)]',
        danger: 'bg-danger/15 text-danger hover:bg-danger/25',
        white: 'bg-white text-black hover:bg-white/90',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-sm',
        md: 'h-11 rounded-full px-5 text-[15px]',
        lg: 'h-14 rounded-full px-7 text-base',
        icon: 'size-11 rounded-full',
        'icon-sm': 'size-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? children : <>{loading && <Spinner className="size-4" />}{children}</>}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
