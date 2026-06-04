"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ActionButtonProps {
  tooltip: string;
  onClick: () => void;
  className?: string;
  icon: React.ReactNode;
  size?: "sm" | "default";
}

export function ActionButton({ tooltip, onClick, className, icon, size = "sm" }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size={size}
          variant="ghost"
          className={size === "sm" ? `h-8 w-8 p-0 ${className ?? ""}` : `h-7 w-7 p-0 ${className ?? ""}`}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
