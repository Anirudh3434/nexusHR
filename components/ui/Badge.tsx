import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const variantStyles = {
  default: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30",
  secondary: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-200 dark:border-white/15",
  destructive: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  outline: "border border-border text-foreground dark:border-border dark:text-foreground",
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div 
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className || ''}`} 
      {...props} 
    />
  )
}

export { Badge }
