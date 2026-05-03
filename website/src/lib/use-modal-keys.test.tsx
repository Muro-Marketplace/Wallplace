// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { useModalKeys } from "./use-modal-keys";

afterEach(() => cleanup());

function Modal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: () => void;
}) {
  const ref = useModalKeys<HTMLDivElement>({ onClose, onSubmit });
  return (
    <div ref={ref}>
      <input data-testid="first" />
      <textarea data-testid="note" />
    </div>
  );
}

describe("useModalKeys", () => {
  it("Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Enter on a non-textarea calls onSubmit", () => {
    const onSubmit = vi.fn();
    render(<Modal onClose={vi.fn()} onSubmit={onSubmit} />);
    const first = document.querySelector('[data-testid="first"]') as HTMLInputElement;
    fireEvent.keyDown(first, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("Enter inside a textarea does NOT call onSubmit", () => {
    const onSubmit = vi.fn();
    render(<Modal onClose={vi.fn()} onSubmit={onSubmit} />);
    const note = document.querySelector('[data-testid="note"]') as HTMLTextAreaElement;
    fireEvent.keyDown(note, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("auto-focuses the first focusable element", () => {
    const { getByTestId } = render(<Modal onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(document.activeElement).toBe(getByTestId("first"));
  });
});
