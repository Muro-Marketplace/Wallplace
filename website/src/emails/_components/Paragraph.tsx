import { Text, Heading } from "@react-email/components";
import type { ReactNode } from "react";
import { theme } from "./theme";

export function H1({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{
        fontFamily: theme.serifStack,
        fontSize: 26,
        fontWeight: 500,
        lineHeight: "1.25",
        color: theme.foreground,
        margin: "0 0 16px",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </Heading>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h2"
      style={{
        fontFamily: theme.serifStack,
        fontSize: 20,
        fontWeight: 500,
        lineHeight: "1.3",
        color: theme.foreground,
        margin: "24px 0 12px",
      }}
    >
      {children}
    </Heading>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 15,
        lineHeight: "1.6",
        color: theme.mutedStrong,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function Small({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 12,
        lineHeight: "1.5",
        color: theme.muted,
        margin: "16px 0 0",
      }}
    >
      {children}
    </Text>
  );
}
