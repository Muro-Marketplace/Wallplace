# Per-work arrangements and per-size paid loan fees

Date: 2026-09-13
Status: design agreed with the owner; spec awaiting review
Builds on: `2026-09-13-per-artwork-terms-design.md`, shipped in PR #102. This spec
replaces that one's single loan fee, its "Editing" section and its card rules,
and brings in the two things it left out: loan fees that vary by size, and
switching an arrangement on or off for one work.

## What the owner asked for

1. On each work, revenue share is a tick box. It starts ticked, at the profile
   rate, when the artist chose revenue share on their profile.
2. A paid loan fee can differ by size, so it is a column in the sizes table to
   the right of Shipping, tinted light orange.
3. Paid loan is a tick box too. It starts ticked, with the fee boxes showing,
   for artists who chose paid loan on their profile. It starts unticked for
   everyone else, who can tick it and add fees.

## What the code and data look like today

- `artist_works` holds 36 real rows (13 September 2026). None has
  `revenue_share_percent` or `paid_loan_monthly_gbp` set, and no `pricing` entry
  has a fee key, so nothing needs moving. 14 profiles are open to paid loan and
  15 to revenue share.
- Per-size values already live in each entry of the `pricing` jsonb array:
  `price`, `shippingPrice`, `quantityAvailable`, `inStorePrice`.
  `sizePricingSchema` in `src/lib/validations.ts` is a `z.object`, which strips
  keys it does not declare (E46a). A new per-size key must be declared there or
  every save drops it.
- **The profile's deal types don't match the rest of the product.** The
  application form offers Revenue share, Paid loan and Direct purchase. The
  profile page (`src/app/(pages)/artist-portal/profile/page.tsx`) offers
  "Display (with optional revenue share)", which is `open_to_free_loan` and is
  shown everywhere else as "Paid loan", then "Purchase" and "Programmes". It has
  no box for `open_to_revenue_share`, and shows the revenue share % only under
  the Display box. The save writes `open_to_revenue_share` back unchanged, so an
  artist cannot change it after applying.
- **The venue's own request form ignores the work's terms.** "Request
  Placement" on the public work page (`ArtworkPageClient`) opens
  `venue-portal/placements`, which starts at 0% and seeds £50 when Paid loan is
  ticked. The first spec covered only the three forms an artist uses.
- The public work page lists sizes and sale prices, and no placement terms.
- No server route enforces the profile's arrangement flags when a placement is
  requested, so switching one on for a single work cannot be rejected further
  down the line.

## Data

### Migration 149

```sql
alter table public.artist_works
  add column if not exists open_to_revenue_share boolean,
  add column if not exists open_to_free_loan boolean;
```

Null means the work follows `artist_profiles.open_to_revenue_share` or
`artist_profiles.open_to_free_loan`. The names mirror the profile columns,
including the legacy `free_loan`, which means paid loan everywhere in the
product. Both columns carry a comment saying so.

Per-size fees go in each pricing entry as `paidLoanMonthlyGbp` (pounds, two
decimal places), beside `shippingPrice`. A CHECK guards the range, because row
security lets an artist update their own row directly and skip zod:

```sql
create or replace function public.artist_work_pricing_loan_fees_valid(p jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(bool_and(
    jsonb_typeof(e -> 'paidLoanMonthlyGbp') is null
    or jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'null'
    or (jsonb_typeof(e -> 'paidLoanMonthlyGbp') = 'number'
        and (e ->> 'paidLoanMonthlyGbp')::numeric between 15 and 100000)
  ), true)
  from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) as e
$$;

alter table public.artist_works
  drop constraint if exists artist_works_pricing_loan_fees_range,
  add constraint artist_works_pricing_loan_fees_range
    check (public.artist_work_pricing_loan_fees_valid(pricing));
```

The function stays SECURITY INVOKER and keeps EXECUTE for `authenticated`.
Postgres checks EXECUTE on a CHECK constraint's function for the role doing the
write, so revoking it would block every direct update an artist makes. A test
holds the SQL floor to `PAID_LOAN_MIN_GBP`, as it does for 148, and a
transaction rolled back on the database confirms an authenticated artist's own
update passes with a valid fee and fails at £5.

### Retiring the single fee

`paid_loan_monthly_gbp` stops being read or written. It is empty, so nothing is
lost. The column and its CHECK stay until a later migration drops them, so the
code running in production keeps working while this ships. The field leaves
`extendedColumns`, `ARTIST_WORK_WRITABLE`, `ArtistWork` and the transform. zod
still accepts the key and the route ignores it, so a tab opened before the
deploy cannot fail a whole save (the `inStorePrice` precedent).

### Writes

`POST /api/artist-works` accepts `openToRevenueShareOverride` and
`openToFreeLoanOverride`, each `boolean | null` and optional, and writes each
only when the request names it. `null` returns the work to following the
profile. That keeps the reorder trap closed, because the portfolio re-saves
every work without these keys. Both columns join `extendedColumns` and
`ARTIST_WORK_WRITABLE`, and `postKey` in `changed-works.ts` gains both, so a
change to a tick alone is saved. Per-size fees ride inside `pricing`, which
`postKey` already compares.

## One source of truth

In `src/lib/work-terms.ts`, `resolveWorkTerms(work, artist)` returns:

| Field | Value |
|---|---|
| `openToRevenueShare` | the work's override, else the profile's flag |
| `revenueSharePercent` | when open: the work's rate, else the profile rate, else 0. When not open: 0 |
| `usesDefaultShare` | true when the work has no rate of its own |
| `openToFreeLoan` | the work's override, else the profile's flag |
| `paidLoanFromGbp` | when open: the lowest listed per-size fee. Otherwise null |
| `paidLoanFeesVary` | when open: true when the listed fees differ |

`paidLoanFeeForSize(work, sizeLabel)` returns the fee listed for that size, or
the lowest listed fee when no size is given. A size with no fee returns null.

`workTermsFromRow(row)` reads the two new columns off a raw `artist_works` row
as well as the rate. Per-size fees are read from `pricing`, tolerating a numeric
string as the 148 reader does.

`initialPlacementTerms(selections, artist)` takes each selected work with its
chosen size, if any:

- **Revenue share** starts at the first selected work that is open to revenue
  share. With none open it is null, and the form keeps its own default.
- **Monthly fee** is the total, across the works open to paid loan, of each
  work's fee for its chosen size (its lowest fee when no size is chosen). With
  none listed it is null.
- **Mixed** when more than one work is selected and they differ on whether
  revenue share is offered, on the effective share, or on whether a fee is
  listed for the size in question.

Consumers: `artistsToGalleryWorks`, `WorkTermsLine`, the four placement forms,
the public work page and the editor.

## The editor (`WorksEditor`)

### Paid loan

- A third tick box in the column toggles row, after "Different quantity per
  size": **Offer on paid loan**.
- Ticked, the sizes table gains a **Paid loan / month** column as its last
  column (after Qty when that is on). The header and inputs sit on a light
  orange tint (`bg-accent/10`). The stacked mobile layout gets the same field
  for each size.
- Each fee input carries an accessible label naming its size.
- A blank fee lists no price for that size, and the work is still offered.
- Each fee is blank or from £15 to £100,000: "Monthly loan fees run from £15 to
  £100,000".
- Unticking hides the column but keeps and saves the fees, so ticking it again
  brings them back. The card and the forms ignore them while it is unticked.
- The fees are an array aligned with `sizes` (`sizeLoanFees`), like
  `sizeShipping`. Adding a size or a suggested-size chip appends a blank.
  Removing a size removes its fee. "Copy sizes from…" clears
  them and "Copy prices from…" brings them across row by row, exactly as each
  treats per-size shipping. The quick price edit keeps them,
  because it already merges onto the existing rows.

### Revenue share

- Under "Placement terms for this work": **Offer on revenue share**, with the
  rate box beside it.
- Unticked hides the rate box.
- Ticked, the box shows the work's own rate, else the profile rate. Blank or
  outside 1 to 100 while ticked: "Enter a revenue share from 1 to 100".
- "These don't change placements you've already agreed." stays underneath.

The block no longer hides when the profile is closed to an arrangement. Every
work shows both tick boxes.

### Following the profile

A work stores only what differs from the profile.

- Each tick is `boolean | null` in the form. Null shows the profile's value, and
  clicking sets it. On save, a value equal to the profile's becomes null.
- The rate is `string | null`. Null shows the profile rate. On save, a rate
  equal to the profile rate becomes null.
- So a work nobody changed follows later profile changes, and a work that was
  changed keeps its own setting.
- The tick shows `own ?? profile` rather than copying the profile into the form
  when it opens. A profile that loads after the form opened therefore cannot be
  saved as if the artist had chosen it.
- Both tick boxes and the rate box stay disabled until the profile has loaded,
  so a save never compares against a guessed profile.

## The profile (`artist-portal/profile`)

- Deal types become Revenue share, Paid loan and Direct purchase, the
  `ARRANGEMENT_LABEL` words the application form uses, followed by Programmes.
- The revenue share % shows under Revenue share rather than under Paid loan.
- A note under the group: "Every work starts with these. You can change them on
  any work, and a work you've changed keeps its own setting."

This relabels the box artists knew as "Display (with optional revenue share)".
The cards and filters have shown those artists as "Paid loan" since K3, and the
application asked "Paid loan", so the words catch up with what venues already
see. **Owner to confirm.**

## The Galleries card

| Work | Orange line |
|---|---|
| Revenue share and one listed fee | `20% Revenue Share · £40/month Paid Loan` |
| Fees differ by size | `20% Revenue Share · From £25/month Paid Loan` |
| Revenue share only | `20% Revenue Share` |
| Paid loan only | `£40/month Paid Loan`, or `From £25/month Paid Loan` |
| Nothing to show | the existing spacer |

- Screen readers hear "From £25 a month Paid Loan".
- The grey arrangement line, the Galleries Revenue Share and Paid Loan filters,
  and the revenue share sort all use the resolved per-work values through
  `GalleryWork`.
- Portfolios, the artist page, collections and the artist carousel describe the
  artist, and keep using the profile.

## The public work page

- Under Size & Price, the same orange line for the selected size: the share,
  and that size's fee rather than "From". It follows the size dropdown and is
  left out, with no spacer, when there is nothing to show.
- "Request Placement" adds `&size=` so the venue form opens with that size
  chosen.

## Placement forms

| Form | Size the fee comes from |
|---|---|
| `SpacesPlacementRequestForm` (artist) | none chosen, so each work's lowest listed fee |
| `ProposalSendPanel` via `WallVisualizer` (artist) | the size placed on the wall, lowest when none was picked |
| Artist portal placement form | the size picked for each work, lowest for "Any size" |
| Venue placement form (new) | the size picked for each work, lowest for "Any size" |

All four call `initialPlacementTerms`. The rules are the first spec's, with two
changes: a work not open to an arrangement does not set that arrangement's
starting figure, and the fee follows the size.

The venue form:

- `loadArtistWorks` keeps each work's own terms and the artist's default rate
  and flags from `/api/browse-artists`. When the URL names one work, its `size`
  parameter preselects that work's size.
- The share starts at the works' share (`input ?? suggested ?? 0`).
- Ticking Paid loan seeds the works' fee total for the chosen sizes, or £50 as
  now when none is listed. As in the artist portal form, the tick is what makes
  it a paid loan, so choosing works never ticks it.
- The mixed-terms note shows while QR or Paid loan is ticked.

## Sample catalogue

- The existing sample fees move onto sizes, and some works vary by size so
  "From" shows.
- One sample artist whose profile is closed to paid loan gets a work switched
  on, with fees.
- One loan-open artist gets a work switched off, and one revenue-share artist
  gets a work with revenue share switched off.
- `seed-terms.test.ts` checks per-size fees are in range and that only works
  resolved as open to paid loan list them.

## Out of scope

- Loan fees in the bulk add table. New works follow the profile, and fees are
  added in the editor.
- Dropping `paid_loan_monthly_gbp`, which is a later migration.
- Enforcing a work's arrangements when a placement is requested. Either side
  can still propose any arrangement.
- A profile-level default loan fee.

## Testing

- `work-terms.ts`: ticks follow the profile and override it; a work not open
  resolves to a 0 share and no fee; "From" and "vary"; the fee for a chosen
  size, a size with no fee, and no size; `initialPlacementTerms` with sizes,
  with works not open, and each mixed rule.
- Editor save rules: a value equal to the profile saves null; the rate must be
  1 to 100 while ticked and is not checked while unticked; each per-size fee is
  checked.
- zod: `sizePricingSchema` keeps `paidLoanMonthlyGbp` and rejects £5; both
  overrides accept a boolean or null.
- `POST /api/artist-works`: each override is written only when named, `null`
  clears it, and an omitted key leaves the row untouched.
- Migration guard: the SQL floor equals `PAID_LOAN_MIN_GBP`, the function sets
  `search_path`, and nothing revokes EXECUTE from `authenticated`.
- `changed-works`: a tick-only change and a per-size fee change are both posted.
- `WorkTermsLine`: the "From" wording and its spoken form.
- `galleries`: per-work ticks drive `openToFreeLoan`, `openToRevenueShare`, the
  share and the fee fields.
- Editor: ticks start from the profile; the column appears and its fees survive
  adding, removing and copying sizes; a profile that loads late is not saved as
  an override.
- Venue form: it starts at the work's share, seeds the chosen size's fee when
  Paid loan is ticked, and preselects the size from the URL.
- Work page: the line follows the selected size.
- Profile page: the new labels, the % under Revenue share, and the note.
- `tests/integration/schema-columns.json` gains the two columns, and the
  phantom-write test passes.
- By eye, on sample data: the sizes table with the orange column at 1280 and
  375 px, the card's "From" line, and the work page line.

## Decisions recorded

- A work stores only what differs from the profile. Agreed with the owner,
  13 September 2026.
- Fees that differ by size show as "From £X/month".
- The fee column is the last column in the sizes table.
- Unticking paid loan hides the fees and keeps them.
- The profile's deal types are relabelled to match the application form.
  Owner to confirm.
