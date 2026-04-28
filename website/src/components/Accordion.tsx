"use client";

import { useState, type ReactNode } from "react";

interface AccordionItem {
  question: string;
  /** Plain string OR a ReactNode for FAQ answers that need inline
   *  links / CTAs (#13). Strings render as a `<p>`; ReactNodes render
   *  in a `<div>` so a caller can compose paragraphs + anchors + CTAs. */
  answer: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-border border-t border-b border-border">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index}>
            <button
              type="button"
              className="flex w-full items-center justify-between py-5 text-left cursor-pointer group"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
            >
              <span className="text-base font-medium text-foreground pr-8 group-hover:text-accent transition-colors duration-200">
                {item.question}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className={`shrink-0 text-muted transition-transform duration-300 ${
                  isOpen ? "rotate-45" : "rotate-0"
                }`}
              >
                <line x1="10" y1="4" x2="10" y2="16" />
                <line x1="4" y1="10" x2="16" y2="10" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                // Bumped from max-h-96 so longer FAQ answers with
                // inline CTAs don't get clipped (#13).
                isOpen ? "max-h-[40rem] pb-5" : "max-h-0"
              }`}
            >
              {typeof item.answer === "string" ? (
                <p className="text-muted leading-relaxed pr-12">{item.answer}</p>
              ) : (
                <div className="text-muted leading-relaxed pr-12 space-y-3 [&_a]:text-accent [&_a]:hover:underline">
                  {item.answer}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
