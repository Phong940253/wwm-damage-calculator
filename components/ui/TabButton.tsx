export function TabButton({
  active,
  children,
  title,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center
        w-9 h-9 rounded-md
        transition
        ${
          active
            ? "bg-background border shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }
      `}
    >
      {children}
    </button>
  );
}
