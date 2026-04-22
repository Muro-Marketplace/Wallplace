import { Button as REButton } from "@react-email/components";
import { theme } from "./theme";

interface Props {
  href: string;
  children: string;
  variant?: "primary" | "secondary";
}

export function Button({ href, children, variant = "primary" }: Props) {
  const style =
    variant === "primary"
      ? {
          backgroundColor: theme.accent,
          color: "#FFFFFF",
          borderRadius: 2,
          padding: "12px 22px",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.02em",
          textDecoration: "none" as const,
          display: "inline-block" as const,
        }
      : {
          backgroundColor: "transparent",
          color: theme.foreground,
          border: `1px solid ${theme.border}`,
          borderRadius: 2,
          padding: "11px 21px",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.02em",
          textDecoration: "none" as const,
          display: "inline-block" as const,
        };
  return (
    <REButton href={href} style={style}>
      {children}
    </REButton>
  );
}
