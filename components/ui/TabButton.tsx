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
        "flex items-center justify-center w-9 h-9 rounded-md transition",
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
