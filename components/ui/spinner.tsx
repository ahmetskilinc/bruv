import { cn } from "@/lib/utils"
import { ArrowsClockwise } from "@phosphor-icons/react/ssr"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <ArrowsClockwise data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
