import { cn } from "@/lib/utils";

type TabButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  active: boolean;
  onClick: () => void;
};

export function TabButton({
  active,
  children,
  title,
  onClick,
  className,
  ...props
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      {...props}
      aria-pressed={active}
      className={cn(
        "flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-md transition sm:h-10 sm:w-10",
        active
          ? "bg-background border shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
