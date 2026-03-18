import * as React from "react";
import { cn } from "../../lib/utils";

const ScrollArea = React.forwardRef(({ className, children, maxHeight = "300px", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div
        className="h-full overflow-y-auto scrollbar-thin"
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
});
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
