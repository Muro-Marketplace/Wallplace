import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Link,
  Text,
  Hr,
} from "@react-email/components";
import type { ReactNode } from "react";
import { theme, siteUrl } from "./theme";

interface EmailShellProps {
  /** Short preview text shown in inbox list (under the subject). */
  preview: string;
  /** Category drives the unsubscribe footer link. Omit for critical tx emails. */
  unsubscribeCategory?: string;
  children: ReactNode;
}

export function EmailShell({ preview, unsubscribeCategory, children }: EmailShellProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={{ padding: "28px 32px 20px", textAlign: "center" }}>
            <Link href={siteUrl} style={{ textDecoration: "none" }}>
              <Text
                style={{
                  fontFamily: theme.serifStack,
                  fontSize: 22,
                  letterSpacing: "0.04em",
                  color: theme.foreground,
                  margin: 0,
                }}
              >
                Wallplace
              </Text>
            </Link>
          </Section>

          <Hr style={{ borderColor: theme.border, margin: 0 }} />

          {/* Main content */}
          <Section style={{ padding: "32px" }}>{children}</Section>

          <Hr style={{ borderColor: theme.border, margin: 0 }} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Wallplace Ltd &middot; London, United Kingdom
            </Text>
            <Text style={footerTextStyle}>
              <Link href={`${siteUrl}/account/email`} style={footerLinkStyle}>
                Email preferences
              </Link>
              {unsubscribeCategory ? (
                <>
                  {" "}&middot;{" "}
                  <Link
                    href={`${siteUrl}/account/email/unsubscribe?c=${unsubscribeCategory}`}
                    style={footerLinkStyle}
                  >
                    Unsubscribe
                  </Link>
                </>
              ) : null}
              {" "}&middot;{" "}
              <Link href={`${siteUrl}/terms`} style={footerLinkStyle}>
                Terms
              </Link>
              {" "}&middot;{" "}
              <Link href={`${siteUrl}/privacy`} style={footerLinkStyle}>
                Privacy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: theme.background,
  fontFamily: theme.sansStack,
  margin: 0,
  padding: "32px 12px",
  color: theme.foreground,
};

const containerStyle = {
  backgroundColor: theme.surface,
  borderRadius: 4,
  border: `1px solid ${theme.border}`,
  maxWidth: 560,
  margin: "0 auto",
  overflow: "hidden" as const,
};

const footerStyle = {
  padding: "20px 32px 28px",
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: theme.muted,
  fontSize: 11,
  lineHeight: "18px",
  margin: "4px 0",
  letterSpacing: "0.02em",
};

const footerLinkStyle = {
  color: theme.muted,
  textDecoration: "underline",
};
