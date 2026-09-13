# Per-artwork revenue share and paid loan fee

Date: 2026-09-13
Status: shipped in PR #102. Partly replaced by
`2026-09-13-work-arrangements-and-per-size-loan-fees-design.md`, which moves the
loan fee onto each size, adds per-work arrangement tick boxes, and changes the
editor and the card.

## The problem

An artist sets one revenue share percentage on their profile, and every one of
their works shows it in orange on its Galleries card ("25% Revenue Share").
There is no way to offer a different share on a particular work, and no way to
show what it costs to take a work on paid loan.

Two facts about the current code shape the design.

1. **The card is an advertisement, not the contract.** At the point of sale the
   Stripe webhook pays the venue the `revenue_share_percent` agreed on the
   placement. It resolves that placement through
   `artist_works.current_placement_id`, falling back to the artist's active
   placement at the venue. It never reads the artist's profile percentage.
2. **The advertisement and the negotiation are disconnected.** None of the three
   forms that start a placement look at what the card says.
   `SpacesPlacementRequestForm` and the visualiser's `ProposalSendPanel` open at
   a hardcoded 25% and £25. The artist portal's placement form opens at 10% with
   a blank fee.

## What we are building

- An artist can set a revenue share percentage on any work. Blank means the work
  uses their profile default.
- An artist can set a paid loan fee, in pounds a month, on any work. It is
  optional. A blank fee changes nothing: the work is still offered for paid loan
  exactly as today, just with no price shown.
- The orange line on the work card shows both, separated by a dot.
- The placement forms start from the selected work's terms.

Out of scope: loan fees that vary by size, a profile-level default loan fee, and
switching arrangements on or off for individual works.

## Data

Migration `148_artist_work_terms.sql` adds two nullable columns to
`artist_works`.

| Column | Type | Null means | Constraint |
|---|---|---|---|
| `revenue_share_percent` | `integer` | use `artist_profiles.revenue_share_percent` | `between 0 and 100` |
| `paid_loan_monthly_gbp` | `numeric` | no listed fee | `>= 15 and <= 100000` |

The types match `artist_profiles.revenue_share_percent` (integer) and
`placements.monthly_fee_gbp` (numeric).

The constraints live in the database as well as in zod. Row security on
`artist_works` lets a signed-in artist update their own rows directly with the
publishable key, which skips the route's validation entirely, so the database
is the only guard that always applies. The £15 floor is `PAID_LOAN_MIN_GBP` in
`src/lib/pricing.ts`; a test reads the migration and fails if the two disagree.

`artist_works` is granted at table level, so the new columns need no grant
changes. Every existing row stays null, so nothing visible changes on release
until an artist sets something.

Both columns join `ARTIST_WORK_WRITABLE` and `artistWorkInputSchema`, and
`POST /api/artist-works` persists them. Sending `null` clears an override.

**Repo parity.** Migrations 146 and 147 were applied to production on
10 September 2026 and never committed. Their files go in alongside 148, exactly
as applied, so the repo matches production again.

## One source of truth for a work's terms

`dbProfileToArtist` maps the raw columns onto each work as
`revenueShareOverride: number | null` and `paidLoanMonthlyGbp: number | null`.
The override is kept separate from the effective figure so the editor can tell
"inherits the default" apart from "set".

New `src/lib/work-terms.ts` exports two functions.

`resolveWorkTerms(work, artist)` returns:

| Field | Value |
|---|---|
| `revenueSharePercent` | `work.revenueShareOverride`, else `artist.revenueSharePercent`, else `0` |
| `usesDefaultShare` | `true` when the work has no override |
| `paidLoanMonthlyGbp` | `work.paidLoanMonthlyGbp`, else `null` |

`initialPlacementTerms(works, artist)` returns the starting terms for a
placement form (rules under "Placement forms" below).

Consumers:

- `artistsToGalleryWorks` in `src/data/galleries.ts`, which builds every
  Galleries card. It names each field one by one rather than spreading the work,
  and today sets `revenueSharePercent: artist.revenueSharePercent`. So
  `GalleryWork` and the builder both gain `paidLoanMonthlyGbp`, and
  `revenueSharePercent` switches to the resolver. A work field that is not named
  there never reaches the card. Because the existing minimum-share filter and the
  "Revenue Share" sort already read `work.revenueSharePercent`, they then use
  per-work figures with no further change.
- The three placement forms.
- The work editor's placeholder text.

Surfaces that describe the artist rather than one work keep showing the profile
default: the Portfolios card and the artist profile page.

## Editing

`WorksEditor` gets two optional inputs per work, beside the existing pricing
fields. The artist's default and arrangement flags come from the raw profile
row that `useCurrentArtist` already returns.

- **Revenue share %**, placeholder "25%, your default". Shown only when the
  artist is open to revenue share.
- **Paid loan, £ a month**, placeholder "No listed fee". Shown only when the
  artist is open to paid loans. Values under £15 are rejected with the same
  message placements already use.

Underneath: "These don't change placements you've already agreed."

## The card

In `src/app/(pages)/browse/page.tsx` the orange line under each gallery work
becomes:

| Work has | Orange line |
|---|---|
| Both | `25% Revenue Share · £40/month Paid Loan` |
| Share only | `25% Revenue Share` |
| Fee only | `£40/month Paid Loan` |
| Neither | the existing transparent spacer row |

- "Share" means an effective share above 0 on an artist open to revenue share,
  which is today's rule. "Fee" means a listed fee on an artist open to paid
  loans.
- Whole pounds show without pence (£40). Anything else shows two decimals
  (£42.50).
- The dot is hidden from screen readers, which hear "25% Revenue Share, £40 a
  month Paid Loan".
- The line wraps rather than cutting off the fee, and cards in the same row keep
  equal heights at every breakpoint. Checked by eye at 375, 768 and 1280 px.

## Placement forms

| Form | Starts at today | Starts at after |
|---|---|---|
| `SpacesPlacementRequestForm` | 25%, £25 | the selected works' terms |
| `ProposalSendPanel`, via `WallVisualizer` | 25%, £25 | the terms of the works on the wall |
| Artist portal placement form | 10%, blank fee | the selected works' terms |

The rules are the same in all three, because all three call
`initialPlacementTerms`:

- **Revenue share** starts at the first selected work's effective share. If that
  work has no override and the artist has no default, the form keeps its current
  starting value.
- **Monthly fee** starts at the total of the selected works' listed fees, when
  at least one has a fee. Otherwise the form keeps its current starting value.
  In the artist portal form a fee above 0 is what makes the placement a paid
  loan, so there the total is applied when the artist ticks Paid loan rather
  than on selection.
- **Mixed terms.** If the selected works resolve to different shares, or only
  some have a listed fee, the form shows: "These works list different terms. One
  revenue share and one monthly fee apply to the whole placement, so check the
  figures below."
- Everything stays editable, and counter-offers work as they do now.
- **QR sales share on a paid loan.** In `SpacesPlacementRequestForm` and
  `ProposalSendPanel` it is a separate field and keeps its current starting
  value (20%). The artist portal form has no separate field: one percentage
  input serves as the revenue share and, when a fee is entered, as the QR share
  on the loan. That input starts at the work's share either way.

The visualiser's `PanelWork` gains the resolved terms, carried on the works it
already loads for the artist, so `WallVisualizer` can compute the starting terms
before the panel opens.

## Money

Nothing changes at the point of sale. The webhook keeps paying the rate agreed
on the placement. What changes is that the agreed rate now starts from what the
card advertised, instead of a hardcoded 25%.

## Testing

- `work-terms.ts`: an override wins, including 0; a blank override inherits the
  default; a missing default resolves to 0; the fee passes through or is null.
  `initialPlacementTerms` covers one work, several works with the same terms,
  several with different shares, and some fees missing.
- Migration guard: the SQL floor equals `PAID_LOAN_MIN_GBP`.
- `POST /api/artist-works`: persists both fields, `null` clears an override, and
  it rejects a share over 100, a fractional share and a fee under £15.
- The card: all four states, the pence rule, and the screen-reader text.
- Each placement form opens at the work's terms and shows the mixed-terms note
  when it should.
- Schema guards: `tests/integration/schema-columns.json` gains the two columns,
  and the phantom-write test passes.

## Decisions recorded

- A blank loan fee changes nothing. Owner's choice, 13 September 2026.
- Cards that describe the artist keep showing the profile default.
- A placement carries one rate and one fee, so a proposal with several works
  totals their fees and takes the first work's share.
- Where the QR sales share on a paid loan is its own field, it keeps its
  current default of 20%. The artist portal form's single percentage field
  starts at the work's share.
