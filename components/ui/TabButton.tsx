import { cn } from "@/lib/utils";

type TabButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  active: boolean;
  onClick: () => void;
  label?: string;
};

export function TabButton({
  active,
  children,
  title,
  label,
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
        "flex h-9 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-all duration-150 sm:h-10",
        label ? "gap-1.5 px-2.5 sm:px-3" : "w-9 sm:w-10",
        active
          ? "bg-primary/10 border border-primary/20 text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        className
      )}
    >
      {children}
      {label && (
        <span className="hidden text-xs font-medium sm:inline">{label}</span>
      )}
    </button>
  );
}
