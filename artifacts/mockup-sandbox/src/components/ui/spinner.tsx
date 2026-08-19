import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

const SpinnerIcon =
  Loader2Icon as React.ComponentType<React.ComponentProps<"svg">>

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <SpinnerIcon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
