import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-white/10", className)}
      {...props}
      aria-hidden="true"
    />
  )
}

export { Skeleton }
