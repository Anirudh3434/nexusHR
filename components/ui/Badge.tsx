import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const variantStyles = {
  default: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  secondary: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-200 dark:border-white/15",
  destructive: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  outline: "border border-gray-300 text-gray-700 dark:border-white/20 dark:text-gray-200",
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
