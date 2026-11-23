# Design decisions

## Accounts

Spring Security Resource Server uses Nimbus to verify HS256 bearer tokens signed
with the environment-provided key. Each protected request checks that the signed
UUID belongs to an existing account. This costs one lookup and makes account
deletion immediately revoke access without a token store.

PostgreSQL enforces uniqueness on normalized email, including concurrent
registrations. BCrypt receives the original password after character and UTF-8
byte validation. Registration points to the authenticated current-account URL.

## Known gaps

Login has no rate limiting in v1.

## Subscriptions

Subscription queries use the authenticated account UUID and scope item lookups to
that owner. Creation locks the account row before counting all subscriptions so
concurrent requests cannot exceed 100. PostgreSQL cascades account deletion and
enforces trial-date consistency. JPA versioning detects concurrent changes.
An already cancelled row is returned unchanged on repeat cancellation.
Start-date bounds use Asia/Kolkata with the shared injected clock, and amounts
use fixed-scale INR decimals.

Subscription responses calculate the next billing date on demand using the
injected clock in Asia/Kolkata. A pure calculator accepts an explicit date so
reminders can reuse it. It estimates the cycle index directly and checks at
most two dates, each calculated from the original anchor to avoid date drift.
Keeping the date computed avoids storing a value that becomes stale as time passes.

## Dashboard

The 100-subscription cap lets the dashboard aggregate a single owner-scoped
read of active rows in memory. The dashboard and subscription endpoints share
the Kolkata date calculation and billing anchors. Exact annual totals are
summed before monthly rounding, so per-subscription rounding errors do not
accumulate. The dashboard requires no persisted aggregates.


## Reminders

A PostgreSQL advisory transaction lock coordinates the cron and scheduler.
Each subscription commits independently, and the unique alert key makes
same-window retries safe. The lock transaction holds one connection while
workers use another. The cron endpoint uses a separate security chain and
compares fixed-length digests of the configured and supplied credentials.

The in-app alert is available as soon as its row commits. A future email
channel will enqueue a delivery record alongside the alert with a unique
notification and channel pair. A worker will send outside the transaction
using a stable provider idempotency key, then record success or retry state
on the delivery row. Reminder deduplication stays at the alert insert.

## Subscription management (6b)

The shared protected shell redirects the root to subscriptions while the
dashboard is pending. Subscription queries are scoped to the authenticated
account, invalidated after writes, and cleared on session end. Protected API
rejections use the existing session-expiry redirect. Date-only display uses
an explicit timezone and form bounds use the Kolkata business date.

## Frontend authentication (6a)

Vite sends requests directly to the API using its configured base URL and the
backend's existing localhost CORS allowlist. Each tab stores one session with
the server's expiry. Expiry and logout cancel and remove the current-user
query. A protected 401 ends the session while invalid credentials on the login
request leave the form available for another attempt.

The client checks email length and requires exactly one at sign with nonempty,
whitespace-free text on both sides. The API handles stricter validation. The
fixed palette uses muted input borders, accent focus rings with an offset,
and error text on light surfaces. Labels and live error messages accompany
those visual cues.

## Dashboard, notifications, and account deletion (6c)

The dashboard presents server-calculated spend and uses annual totals for
category proportions. Dashboard and notification queries are scoped to the
signed-in account. Subscription writes refresh the dashboard, and subscription
deletion refreshes notification queries because the database cascades those rows.
Notification read actions refresh both the list and the shared unread count.

Account deletion uses an inline email confirmation and the existing authenticated
DELETE endpoint. The auth provider uses one teardown path to cancel and remove
queries on logout, expiry, and deletion, with a distinct notice after deletion.
Calendar dates retain the 6b formatter and timestamps display in Asia/Kolkata.

## Public landing and shared frontend design

Cross now has a public introduction at the root and keeps its dashboard behind
the existing auth guard at /dashboard. The landing uses illustrative HTML
previews so visitors can see the reminder and INR spend flows without loading
account data. The app and landing share slate and teal tokens, and the landing
motion respects reduced-motion preferences.

## Indigo palette and iconography

The frontend uses a cool alabaster canvas, white cards, slate text, and indigo
actions. Layered shadows distinguish cards, preview windows, and controls.
Amber and crimson convey reminder urgency alongside text, with darker ink
for accessible small labels. Lucide React supplies consistent, individually
imported icons across public and signed-in screens. Preview amounts use the
INR formatter so the currency symbol does not depend on source-file encoding.

## Final monochrome palette and typography

Cross uses warm-neutral off-white and alternate surfaces, white cards, and
near-black actions with neutral shadows. Amber and muted red are reserved for
reminder and error cues. Instrument Serif provides compact editorial headings,
while DM Sans handles interface copy and tabular amounts and dates.

## Apple-inspired monochrome showcase

Cross uses a soft #F5F5F7 canvas, white tiles, near-black actions, and
neutral shadows. Plus Jakarta Sans sets the headings and Inter handles the
interface and tabular figures. The landing groups the product, reminders,
and spending into distinct sections, with account entry in the floating
navigation and closing band. Auth forms use compact cards and inline links.

## Interactive landing examples

The landing uses local selection state for subscription examples and derives
forecast and category figures from the same fixture data. Inline SVG charts
include text equivalents, and scroll motion respects reduced-motion settings.

## Landing spending and contact

The public preview uses Cross's category labels and shares its fixture
amounts with the spending tiles. The forecast places the conditional trial
charge on top of existing spend in April. The light closing section leads
into a footer with navigation and contact links.

## Signed-in Bento dashboard

The app shell uses a frosted segmented header with quiet account controls.
The dashboard places its add action above uniform metric tiles and pairs
renewals with category spend. Empty states stay inside their respective cards.

## Signed-in dashboard hierarchy

The app shell uses a full-width frosted header with one segmented switcher.
The dashboard distinguishes primary spending, pending trials, renewals, and
category breakdown with dark, amber or recessed, white, and recessed surfaces.

## Dashboard summary spacing

The two summary cards own their surface styles, with an explicit two-column
breakdown inside the spend card. The summary stacks independently of the
renewals and category panels. A hairline separates the notification bell
from account actions in the app header.

## Dashboard workspace

A single metrics strip replaces the two summary cards. The billing snapshot
uses the existing dashboard response, including renewals due today through
day seven, with no additional request. The recessed category panel keeps
its presentation beside the new snapshot.

## App sidebar and aligned dashboard

A persistent desktop sidebar keeps navigation and account utilities separate.
The dashboard uses equal-width cards and places seven-day renewal totals
inside the renewals card. The category footer summarizes the existing
dashboard response without another request.

## Sidebar and dashboard visual contrast

Current navigation and monthly spend use dark anchor surfaces. Category spend
pairs a segmented overview with matching row accents. Hover feedback respects
the operating system's reduced-motion preference.

## Floating charcoal app rail

The authenticated shell uses a floating rail on desktop and a wrapping top
bar on phones. The shared add shortcut sits beside the wordmark, and account
actions remain grouped separately from primary navigation.

## Light split-view workspace

The authenticated shell uses an edge-to-edge light sidebar beside a white
workspace. The metrics sit between hairlines, and renewals and category
spend share the same flat panel surface. The dashboard header is the single
add-subscription entry point in the populated dashboard.

## Compact subscription ledger

Dashboard and Subscriptions share the same compact add link. Subscriptions
uses a segmented status filter and a single ledger with compact row actions.
Cancellation dates use the existing Kolkata formatter for timestamps.

## Subscription forms and ledger alignment

The ledger reserves consistent tracks for dates, amounts, and row actions.
Both pagination controls share one style. Create and edit use the same
header and two fieldsets inside responsive panels, preserving native
grouping and inline validation.

## Account panels and ledger actions

The account page groups profile details and deletion in separate panels.
The existing email confirmation, focus restoration, and error handling
remain in the deletion panel. The subscription ledger reserves fixed slots
for compact, single-line actions.

## Notification feed

Notifications share the ledger's status filter and pagination controls.
The feed distinguishes unread messages with weight and a status dot,
and names the reminder interval beside billing and receipt dates.

## Login and register finish

Credential screens use compact cards, matching input and submit radii,
and a quiet return link. The credential presentation is scoped separately
from profile status and not-found screens.

## Public not-found route

The existing catch-all renders a standalone monochrome card. Its return link
uses the resolved profile to send signed-in visitors to the dashboard and
other visitors to the public home page.

## Notes sizing and open 404

The notes field grows with its panel while retaining a usable minimum height.
The 404 uses an open canvas and shows the requested path, browser back
navigation, and links selected from the existing auth state.

## Cross brand lockup

The navigation wordmark pairs the name with an inline geometric cross.
The favicon uses the same silhouette on a white tile for light and dark tabs.

## Frontend motion

Shared motion primitives honor the operating system preference. The landing
preview remains live while its frame tilts with scroll. Navigation indicators
slide between active items, and pending or exiting rows retain the existing
query and mutation behavior.

## Landing hero depth of field

The hero uses a viewport-relative scroll range so motion still progresses
when the content is shorter than the viewport. The deeper bezel surrounds
the live preview, and the scroll cue follows its content height.

## Full-width landing preview

The live preview uses a wider bezel and a taller desktop surface. Desktop
perspective moves farther back to make room for the wider card as it tilts.
Mobile retains its own sizing and tilt.

## Landing motion suite

Landing sections use a stationary scroll target for depth of field, with
focus kept clear for keyboard interaction. The live preview crossfades its
details, the spending figures reserve their final widths, and the cursor
spotlight is limited to fine pointers with motion enabled.

## Interactive preview and reminders motion

The live preview staggers its rows, moves one shared selection outline,
and rolls between prices using the selected plan data. Reminders connect
the cards to their milestones and pause the toast pulse offscreen or
through a visible control.

## Dashboard motion

Dashboard count-ups use Motion values so updating the visible digits does not rerender the surrounding UI or announce intermediate totals. Category segments and progress fills animate with transforms to keep their layout stable. Reduced motion shows final values immediately and preserves category highlighting.

## Landing motion replay

The landing preview shares one visibility trigger across its rows and prices. Spending fills reserve their final widths and animate with transforms, while the count-ups reserve space for the final INR strings. Reduced motion keeps the final values and cross-highlighting immediately available. Dashboard renewal prices follow the existing row entrance delays.

## Fast list and drawer transitions

Subscription and notification views transition a single keyed list at a time. Outgoing lists become inert, and only a confirmed subscription deletion collapses an individual row. The confirmation drawer animates in normal grid flow so neighboring rows follow its height without layout projection.

## Landing scroll layers

The hero preview and landing section wrappers use transforms and opacity for scroll-linked depth. Layout and style containment isolate the sections, and native scrolling handles wheel and trackpad input. Existing count-up, hover, stagger, timeline, and spotlight timings are retained.

The full-motion design restores scroll-linked blur on the hero heading, 3D preview, and three landing sections. The landing preview preserves its 0.05-second stagger, dashboard renewal prices count up over 0.8 seconds, and category amounts and percent labels finish with their 0.7-second fills. Reduced motion renders the resting states immediately.
