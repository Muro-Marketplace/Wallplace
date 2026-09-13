// @vitest-environment jsdom
// Owner report 13 September 2026, on the print preview: "QR Only" was a size,
// so it shrank the label instead of printing just the code; the Medium,
// Dimensions and Price tick boxes did nothing on Minimal or QR Only, which never
// print those rows; and style and colour could only be chosen before opening it.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/lib/qr", () => ({ generateQRDataURL: vi.fn(async () => "data:image/png;base64,AAAA") }));

import LabelPreview from "./LabelPreview";
import type { LabelData } from "./LabelSheet";

afterEach(() => cleanup());

function label(over: Partial<LabelData> = {}): LabelData {
  return {
    artistName: "Fin Coles",
    artistSlug: "fin-coles",
    workTitle: "Vietnamese Village",
    workMedium: "Photography Print",
    workDimensions: "30 x 40 cm",
    sizeOptions: ["30 x 40 cm", "50 x 70 cm"],
    workPrice: "From £29.99",
    quantity: 1,
    labelSize: "medium",
    labelStyle: "editorial",
    ...over,
  };
}

/** The printable sheet, as opposed to the controls. */
async function sheet() {
  return (await screen.findAllByAltText("QR code"))[0].closest(".label-sheet") as HTMLElement;
}
const controls = () => screen.getByRole("complementary", { name: "Edit labels" });
const styleGroup = () => within(controls()).getByRole("group", { name: "Label style" });
const sizeGroup = () => within(controls()).getByRole("group", { name: "Label size" });
const card = (title: string) => within(controls()).getByRole("group", { name: title });

describe("<LabelPreview /> sidebar", () => {
  it("chooses the style, the size and the colour, with no QR Only size", async () => {
    render(<LabelPreview labels={[label()]} onClose={() => {}} />);
    await sheet();

    for (const name of ["Minimal", "Editorial", "QR Only"]) {
      expect(within(styleGroup()).getByRole("button", { name })).toBeTruthy();
    }
    expect(within(sizeGroup()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Small",
      "Medium",
      "Large",
      "Extra Large",
    ]);
    for (const name of ["Classic (white)", "Warm cream", "Dark", "Accent"]) {
      expect(within(controls()).getByRole("button", { name })).toBeTruthy();
    }
  });

  it("prints only the QR code once QR Only is chosen, and says so in the header", async () => {
    render(<LabelPreview labels={[label()]} onClose={() => {}} />);
    await sheet();
    fireEvent.click(within(styleGroup()).getByRole("button", { name: "QR Only" }));

    const printed = await sheet();
    for (const text of ["Vietnamese Village", "Fin Coles", "Photography Print", "From £29.99", "30 x 40 cm"]) {
      expect(within(printed).queryByText(text), text).toBeNull();
    }
    expect(within(printed).getAllByAltText("QR code")).toHaveLength(1);
    expect(screen.getByText("Medium · 35 × 35 mm")).toBeTruthy();
  });

  // Owner follow-up, 13 September 2026: hiding the tick boxes on Minimal left no
  // way to add a row there. Minimal prints any row that is ticked; only QR Only,
  // which prints nothing but the code, has no tick boxes.
  it("offers the Medium, Dimensions and Price tick boxes on Minimal, and a ticked row prints", async () => {
    render(
      <LabelPreview
        labels={[label({ labelStyle: "minimal" })]}
        initialVisibility={[{ medium: false, dimensions: false, price: false }]}
        onClose={() => {}}
      />,
    );
    expect(within(await sheet()).queryByText("From £29.99")).toBeNull();

    const price = within(card("Vietnamese Village")).getByRole("checkbox", { name: "Price" }) as HTMLInputElement;
    expect(price.checked).toBe(false);
    fireEvent.click(price);
    expect(within(await sheet()).getByText("From £29.99")).toBeTruthy();
  });

  it("turns the rows on for Editorial, lets a tick box hide one, and offers none on QR Only", async () => {
    render(
      <LabelPreview
        labels={[label({ labelStyle: "minimal" })]}
        initialVisibility={[{ medium: false, dimensions: false, price: false }]}
        onClose={() => {}}
      />,
    );
    await sheet();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: "Editorial" }));
    expect(within(await sheet()).getByText("From £29.99")).toBeTruthy();
    const price = within(card("Vietnamese Village")).getByRole("checkbox", { name: "Price" }) as HTMLInputElement;
    expect(price.checked).toBe(true);
    fireEvent.click(price);
    expect(within(await sheet()).queryByText("From £29.99")).toBeNull();
    expect(within(await sheet()).getByText("Photography Print")).toBeTruthy();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: "QR Only" }));
    expect(within(card("Vietnamese Village")).queryByRole("checkbox")).toBeNull();
  });

  it("recolours the sheet from the sidebar and tells the page", async () => {
    const onLabelThemeChange = vi.fn();
    render(<LabelPreview labels={[label()]} labelTheme="classic" onLabelThemeChange={onLabelThemeChange} onClose={() => {}} />);
    await sheet();

    fireEvent.click(within(controls()).getByRole("button", { name: "Dark" }));
    expect(onLabelThemeChange).toHaveBeenCalledWith("dark");
    const printedCard = (await sheet()).querySelector(".qr-label") as HTMLElement;
    expect(printedCard.style.backgroundColor).toBe("rgb(31, 31, 31)");
  });

  it("tells the page when the style or the size changes", async () => {
    const onLabelStyleChange = vi.fn();
    const onLabelSizeChange = vi.fn();
    render(
      <LabelPreview
        labels={[label()]}
        onLabelStyleChange={onLabelStyleChange}
        onLabelSizeChange={onLabelSizeChange}
        onClose={() => {}}
      />,
    );
    await sheet();

    fireEvent.click(within(styleGroup()).getByRole("button", { name: "Minimal" }));
    fireEvent.click(within(sizeGroup()).getByRole("button", { name: "Large" }));
    expect(onLabelStyleChange).toHaveBeenCalledWith("minimal");
    expect(onLabelSizeChange).toHaveBeenCalledWith("large");
  });

  it("offers each work's own sizes to print on its label", async () => {
    render(<LabelPreview labels={[label({ workDimensions: undefined })]} onClose={() => {}} />);
    await sheet();

    fireEvent.click(within(card("Vietnamese Village")).getByRole("button", { name: "50 x 70 cm" }));
    expect(within(await sheet()).getByText("50 x 70 cm")).toBeTruthy();
  });
});
