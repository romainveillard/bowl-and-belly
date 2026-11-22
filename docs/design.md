# Bowl & Belly — design doc

Nov 22, 2026 · @Romain Veillard

## Overview

A self-hosted, open-source (MIT) web app to track what each pet eats, in calories, against a daily target, alongside its weight. It replaces PetFeed Tracker, which falls short in four ways:

- It always asks which pet, even with only one.
- Food is free text, retyped every time, with no calories.
- "Repeat" only copies the last entry, not the one you tapped.
- Entries aren't grouped by day, and the only overview is entries per day, which is meaningless for frequent small feeds.

Design principles that follow from that:

- **Logging is the hot path.** A typical feed is: open the form, tap a recent food (grams prefilled), adjust, save.
- **Calories, not counts.** Every day view leads with kcal eaten against the target.
- **History stays true.** Calorie values and targets are snapshotted, so later edits don't silently rewrite the past unless you ask them to.
- **Small and boring to run.** One container, one SQLite file, one volume.

## Scope

The MVP covers profiles, food stock, feed logging with leftovers, weight, and insights. Everything else is a later slice.

**In the MVP**

- **Pets:** name, type, photo, birth date, neutered status, activity level, goal, calculated or manual daily target.
- **Weight log:** per-pet entries, entered with up to two decimals.
- **Foods and stock:** brand, name, photo, kcal, food type, pet type, optional portion size, running stock in grams or portions, archiving.
- **Feed logging:** recents-first food picker, prefilled amount, "log again" on any entry, leftovers.
- **Timeline:** entries grouped by day, kcal vs target per day.
- **Insights:** intake vs target by day, week and month; weight chart with rolling average.
- **Settings:** time zone, day start time, pet types, food types, language, scheduled backups (opt-in), backup download.
- **Ops:** optional single password, opt-in scheduled backups, amd64 and arm64 images.

**Later:** see the last section.

## Domain decisions

### Daily calorie target

Targets are a per-pet history, not a per-entry value, so days with no entries still have a target and past days keep the target that applied then. For cats and dogs the target is calculated from resting energy requirement (RER), with weight in kg:

```latex
\mathrm{RER} = 70 \times \mathrm{weight}^{0.75}
```

The daily target is RER times a factor from the 2021 AAHA Nutrition and Weight Management Guidelines ([Box 1](https://www.AAHA.org/globalassets/02-guidelines/2021-nutrition-and-weight-management/resourcepdfs/nutritiongl_box1.pdf)). AAHA gives ranges, so the app uses the low end for normal activity (AAHA notes indoor and sedentary pets may need less) and the high end for active pets. Factors live in code, keyed by the pet type's `system_key`, and the first matching row wins, top to bottom:

| Case | Cat | Dog |
| --- | --- | --- |
| Growth (under 12 months) | 2.5 | 3.0 under 4 months, 2.0 from 4 months |
| Goal: lose weight (RER at target weight) | 0.8 | 1.0 |
| Activity: inactive / obese-prone | 1.0 | 1.1 |
| Intact adult, active | 1.6 | 1.8 |
| Intact adult, normal | 1.4 | 1.6 |
| Neutered adult, active | 1.4 | 1.6 |
| Neutered adult, normal | 1.2 | 1.4 |

- `activity_level` is `'inactive' | 'normal' | 'active'`. The dog inactive factor is the midpoint of AAHA's 1.0–1.2.
- A weight-gain goal uses the adult factor applied to RER at target weight; AAHA gives no separate gain factor.
- Otherwise RER uses the latest weigh-in. Until the weight a case needs is known (no weigh-in yet, or no target weight), there is no calculated target.
- Growing pets are always fed for their current weight: the growth case comes first, so a weight goal only takes effect from 12 months. Age is counted in completed calendar months from the birth date.
- Pregnancy, lactation and working dogs are out of scope and use the manual override. Large-breed dogs keep growing past 12 months, which also needs the override.

* Changing neutered status, activity, goal, target weight, birth date, pet type or the manual override inserts a new target row effective from today. A second change the same day replaces that day's row, and a change that leaves the target as it was adds nothing.
* A target the user set is never recalculated: it stays until they go back to the suggested value.
* A weigh-in never recalculates silently. The app offers "Update target from new weight?" so scale noise doesn't make the target jitter. The same goes for a pet reaching 4 or 12 months.
* Editing the current weight on the pet form is the exception: it logs a weigh-in and updates a calculated target at once, because the form shows the new suggestion before saving.
* Custom pet types have no formula: the target is manual, and the target line is hidden if none is set.

### Leftovers

A feed entry has an optional leftover in grams; eaten = served − leftover. Whether the leftover goes back into stock defaults from the food type (dry: returned; wet: binned) and can be overridden per entry. Leftovers are usually found at the next feed, so when the previous entry for that pet is a food whose type returns leftovers, the log form shows an optional "Left over from 14:30?" field. Leftovers can also be added from the timeline.

### Stock and portions

Stock is a running total stored in grams for every food. Each food has a stock unit: grams (shown as kg/g) or portions (shown as e.g. "8 pouches + 45g open", and restocked as "+12 pouches").

- **Portions are opt-in per food.** A switch on the food form turns them on (off by default) and reveals the portion name and weight. Dry food never has portions: its section is hidden and its stock is always in grams. Every other food type, including custom ones, can use them.
- **Portion names** are picked from chips (Pouch, Tin, Tray) or typed after choosing Other. The suggested names come from the translation files; the chosen name is stored as plain text in the user's language.
- **Entering stock** for gram-counted foods has a g/kg toggle, since bags are labelled in kg. It only changes the input; storage stays in grams.
- **Calories** are entered per 100 g or per kg, as printed on the label, and stored as kcal/kg.

Logging is always in grams, with an optional grams/portions toggle on the amount input for portion-counted foods. Logging, editing and deleting a feed entry each adjust stock by the difference.

Deleting an entry returns its net amount to stock: served minus any leftover already returned. A delete means "logged by mistake", so the food never left the bag. If food was really served and binned, the entry should be edited (leftover not returned), not deleted.

### Editing a food's calories

Each feed entry snapshots the food's kcal/kg. Editing kcal asks whether to update existing logs: all of them (misread label), those since a date (recipe change), or none. Foods in use are archived, never deleted.

The backfill runs in the same transaction as the food edit: `UPDATE feed_entry SET kcal_per_kg = ? WHERE food_id = ?`, plus `AND fed_at >= ?` for "since a date", where that date means the start of that app day (time zone and day start applied). Edits apply in the order they are saved, so a later edit simply overwrites any range it overlaps. For example, "all logs → 3,500" followed by "since 1 March → 3,600" leaves earlier entries at 3,500 and later ones at 3,600.

### Days and time zones

Timestamps are stored in UTC. One app-wide IANA time zone (e.g. Europe/London) and a "day starts at" time (default 00:00, configurable to e.g. 03:00) decide which day an entry belongs to. Per-entry time zones are out of scope.

### Weights and birth dates

Weights are stored as integer grams. The weight field accepts up to two decimals (kg), and there is no precision setting: each reading is shown as entered, with trailing zeros stripped but at least one decimal (4.52 kg, 4.5 kg, 4.0 kg). Derived values (rolling average, chart axis, pets list) always show one decimal. Birth date is stored with a precision flag (exact, year, estimated); entering an age produces an estimated date, shown as "about 6". A birth year is stored as 1 January, so the age reads as this year minus the birth year, and is also shown with "about". Under a year old, the age is shown in months.

## Data model

Nine tables in SQLite, accessed through Drizzle. Only fields an MVP screen reads or writes are included.

```sql
settings      (id, time_zone, day_starts_at,                      -- 'HH:MM'
               backup_enabled, backup_frequency,                  -- 'daily' | 'weekly'
               backup_weekday NULL, backup_time, backup_keep)                          -- single row

pet_type      (id, name NULL, system_key NULL, archived_at)       -- 'cat' | 'dog'
food_type     (id, name NULL, system_key NULL,                    -- 'wet' | 'dry'
               leftover_returns_to_stock, archived_at)

image         (id, data)                                          -- WebP blob

pet           (id, name, pet_type_id, photo_id NULL,
               birth_date, birth_date_precision,                  -- 'exact' | 'year' | 'estimated'
               neutered, activity_level,
               goal, target_weight_g NULL,                        -- 'maintain' | 'lose' | 'gain'
               archived_at)
pet_target    (id, pet_id, effective_from, kcal_per_day,          -- app day, unique per pet
               source)                                            -- 'calculated' | 'manual'
weight_entry  (id, pet_id, measured_at, weight_g)

food          (id, brand NULL, name, photo_id NULL,
               pet_type_id NULL, food_type_id,                    -- no pet type: suits any pet
               kcal_per_kg,
               portion_name NULL, portion_g NULL,
               stock_unit, stock_g,                               -- 'g' | 'portion'
               archived_at)
feed_entry    (id, pet_id, food_id, fed_at,                       -- UTC
               served_g, leftover_g NULL,
               leftover_returned_to_stock,
               kcal_per_kg)                                       -- snapshot
```

- **`system_key`:** non-null marks a seeded row. It makes the row read-only, selects the built-in formula (pet types), and gives the translation key for its label, so `name` is only set on custom rows (`CHECK (system_key IS NOT NULL OR name IS NOT NULL)`).
- **Enums:** fixed sets are `text` columns typed with Drizzle's `enum` option plus explicit `CHECK` constraints, since Drizzle's option alone isn't enforced by SQLite. User-extensible lists are lookup tables.
- **Derived, not stored:** kcal eaten (served − leftover, × snapshot kcal/kg), daily totals, current age and life stage.
- **Images:** resized on upload to about 800px WebP and stored as blobs, so the database is the whole backup. They live in their own `image` table, referenced by `photo_id`, so that listing pets or foods never loads a blob.
- **Seeded rows:** cat, dog, wet, dry and the single settings row (`CHECK (id = 1)`) are inserted by start-up code, not by a migration, and only when missing. Restarting never resets settings. The time zone starts as the server's (`TZ`), which is UTC in the container unless set.
- **Dates and times:** instants (`fed_at`, `measured_at`, `archived_at`) are integer milliseconds in UTC. Calendar values (`birth_date`, `effective_from`) are `YYYY-MM-DD` text, and times of day are `HH:MM` text.
- **Targets:** a pet has at most one target row per app day; a second change the same day replaces it. Any goal other than maintain requires `target_weight_g`.
- **Unused photos:** a photo is uploaded before its form is saved, so an abandoned form leaves one behind. Photos that no pet or food uses are deleted at start-up.
- **Stock audit trail:** none in the MVP; stock is a mutated total. A purchases table arrives with cost tracking.

## Screens and UX

Seven screens, mobile-first, installable as a PWA. A bottom bar holds five tabs (Today, History, Insights, Stock, Pets); Settings opens from a gear icon on Today. Each tab's main action (Log feed, Add pet, Add food) is a floating button in the same spot, bottom right above the bar. Pet-specific screens (Today, Insights, Log feed) show a pet chip with photo and name; with two or more pets, tapping it opens the pet switcher sheet (each pet with today's kcal, plus "Manage pets"), and the choice carries across screens. With one pet the chip is not tappable. The last pet used is the default.

| Screen | What it does |
| --- | --- |
| Today (home) | Card with kcal so far vs target, a progress bar and the wet/dry split; today's entries in the feed row style below; a floating "Log feed" button above the bottom bar. |
| Log feed (bottom sheet) | Recents-first food picker with wet/dry badge, brand on a muted second line, and stock left in the food's own unit ("8 pouches left"); search and type filter chips above. Grams prefilled with the last amount for that pet and food, g/portion toggle, time defaults to now. Shows the "left over from last feed?" prompt when relevant: two lines at most, and leaving it empty means nothing was left. |
| History | Entries grouped by day. Day header shows kcal vs target; tapping it expands a breakdown per food type (grams and kcal). Entries use the feed row style (see Feed rows below). |
| Insights | Day / week / month toggle. Intake bars with the target line (week and month show average daily kcal). Weight chart stacked below on the same time axis, raw points plus rolling average. |
| Pets | List of pet cards (photo, type, age, weight, today's kcal vs target), archived pets link, and Add pet. The profile shows the daily target with how it was calculated and "Set my own target", weight with a sparkline, recent weigh-ins and Log weight, target history, and Archive pet. See "Pet forms and target prompts" below. |
| Stock | Foods with stock level in their own unit; quick restock; add, edit and archive (the food form follows "Stock and portions" above). Editing kcal triggers the "update existing logs?" choice. |
| Settings | Time zone, day start time, pet types, food types, language, scheduled backups (opt-in), backup download. |

### First run

Until there is at least one pet and one food, Today guides the set-up instead of showing its normal layout, and Log feed (and Log weight on desktop) stays hidden.

- **No pets:** a welcome card with "Add your first pet", which opens the Add pet form, and a "Getting started" checklist (add your pet, add a food). History and Insights show a short version of the same message.
- **A pet but no foods:** the normal calories card (0 / target, "No feeds yet today") and an "Add a food to start logging" card with the checklist, its first step ticked. "Add food" opens the Add food form.
- **Once both exist,** Today switches to its normal layout and the checklist goes away for good.

### Feed rows

Used on Today and History. A food-type tile on the left (blue drop for wet, peach kibbles for dry), the food name with "14:30 · 20 g · 4 g left" underneath, and kcal on the right. Nothing wraps: long names end with "…".

- **Tap** opens the entry's actions: edit, add leftover, log again (same food and amount, time now).
- **Swipe right** logs it again; **swipe left** deletes it. Both are shortcuts for actions also in the tap menu.
- **Delete** shows an undo snackbar above the bottom bar for about 5 seconds, naming the entry ("07:30 · Salmon kibbles · 20 g"). One snackbar at a time: a new delete makes the previous one final. Undo restores the entry, the day's total and the stock.
- **Discoverability:** the first time Today shows entries, the top row peeks a few pixels to reveal the swipe colours, then settles back. No hint text.

### Pet forms and target prompts

- **Add and edit pet** share one form: details (photo, name, type), age (birth date, year or age; an age is saved as an estimate), health and goal, current weight, and daily target. Neutered is a Yes/No choice. Choosing Lose or Gain reveals a target weight field, and the suggestion then uses it.
- **Daily target** on the form shows the live suggestion, with a "Set my own target" switch for a manual value. Custom pet types have no suggestion and only offer the manual value.
- **Saving an edit that changes the target** (neutered, activity, goal, target weight) shows a snackbar such as "Daily target now 238 kcal from today".
- **Log weight** is a sheet with weight and date (default today), showing the last reading.
- **After a weigh-in**, if the suggested target differs, a dialog compares current and suggested targets with "Update to …" and "Keep …". It applies from today; past days keep their target.
- **Set my own target** is a sheet with a kcal/day field and a way back to the suggested value. It also applies from today.
- **Current weight** is optional on the form. Without it, or without a target weight when the goal needs one, there is no suggestion yet.
- **The target explanation** on the profile names the species ("for an inactive cat", "for a growing puppy") and says "since today" for a target set today.
- **First run:** with no pets, the Pets tab shows "Add your first pet" in place of the list and the floating button.
- **Archive pet** asks for confirmation. Archived pets keep their history, leave the pet switcher, and are listed on their own page, reached from a link under the pets list, where each can be restored.

### Forms, dialogs and snackbars

- **Validation:** Save stays enabled, since a disabled button doesn't say what's wrong. A failed save shows a summary at the top ("2 things to fix before saving: name and current weight."), a message under each invalid field, and moves focus to the first. Fields are then re-validated on blur. Invalid fields carry `aria-invalid` and `aria-describedby`.
- **Snackbar:** one shared component, navy with white text and an optional action (Undo for deletes, none for target changes), shown for about 5 seconds. On a phone it spans the width above the bottom bar; on desktop it sits at the bottom centre of the content column, clear of the floating buttons.
- **Sheets and dialogs:** a sheet rises from the bottom on a phone and is a dialog near the top of the page on desktop. A confirmation is a centred dialog.
- **Desktop:** from 860 px the tabs move to a sidebar with Settings and the version at its foot, and Pets shows the list and the selected profile side by side.

## UI design

- **Components:** Tailwind CSS with shadcn/ui. Colour tokens use shadcn's names, so they drop straight into its theme.
- **Colours:** foreground `#1F2A44`, primary `#F08A4B`, primary-strong `#CE7741`, accent `#FFC9A3`, accent-soft `#FFE6D4`, background `#F6F7F9`, card `#FFFFFF`, muted `#EEF0F4`, border `#E3E6EC`, muted-foreground `#5B6478`, success `#2F7D53`, warning `#9A6412`, danger `#B93A32`.
- **Primary buttons** use navy text on orange (about 5.3:1). White on the brand orange fails contrast.
- **Controls:** switches only turn a feature on or off (portions, own target). Facts and choices (neutered, activity, goal, units) use segmented controls or chips.
- **Type:** Outfit SemiBold for headings and figures (tabular numbers), Inter for everything else. Both fonts are bundled with the app, so nothing is fetched from a font service. 4 px spacing grid, touch targets at least 44 px, radii from 8 px (inputs) to 24 px (sheet tops).
- **Charts:** intake bars in primary, days over target in primary-strong, today's partial bar in accent and left out of averages, target as a dashed navy line; weight as faint raw points with a primary rolling-average line.
- **Dark mode** is out of scope for the MVP, but every colour is a token so it can be added later.

## Translations

The app is translation-ready from the first commit and ships in English and French; further languages come from contributors. Retrofitting string extraction later means touching every component, whereas doing it from the start costs almost nothing.

- **Library:** i18next with react-i18next, the most familiar choice for open-source contributors, using ICU message format for plurals ("1 pouch", "8 pouches").
- **Formatting:** numbers, dates and units go through `Intl`, so French users see "4,2 kg" and their own date order.
- **Seeded rows:** cat, dog, wet and dry are labelled through their `system_key` translation keys. User-entered names (pets, foods, custom types) are never translated.
- **API:** returns error codes and machine values, never user-facing sentences, so all wording lives in the frontend.
- **Language choice:** browser language by default, overridable per device (stored in the browser), since household members may want different languages and there are no user accounts.

## Architecture

One Docker container serves both the API and the built frontend, with a single volume holding the SQLite file.

| Layer | Choice |
| --- | --- |
| Backend | Node with Hono (via its Node adapter), TypeScript, Zod validation; the frontend calls it through Hono's typed RPC client |
| Database | SQLite via Drizzle ORM and migrations |
| Frontend | React SPA built with Vite, React Router, Tailwind CSS and shadcn/ui, TanStack Query, Recharts (chart export via a small SVG-to-PNG helper), served as static files by the backend |
| PWA | Web app manifest for install; no service worker, since the app is online-only and browsers no longer need one to offer installation |
| Images | amd64 and arm64, built with `docker buildx` on GitHub Actions native runners, published to GHCR |
| Licence | MIT |

- **Auth:** optional single password via an environment variable; unset means no auth. The README warns against exposing an unprotected instance. Behind Cloudflare Access, a long session duration avoids the installed PWA hitting expired-session redirects, and the app shows a "session expired, reopen" state when it does.
- **Backups:** opt-in in Settings and off by default, with a schedule (daily, or weekly on a chosen weekday, at a chosen time) and a number of copies to keep (default 7). Each run uses `VACUUM INTO` to write a consistent copy into the volume (a plain copy of a live SQLite file isn't safe). The "Download backup" button in Settings works whether or not scheduled backups are on. Off-box copies are the operator's job, e.g. the Pi pulling the latest file from OCI.
- **Deployment target:** OCI Ampere VM (arm64) behind a Cloudflare Tunnel.

## Name and branding

The app is called **Bowl & Belly**, in English for every language.

- **Slug:** `bowl-and-belly` wherever the ampersand isn't allowed: GitHub repo, GHCR image (`ghcr.io/<owner>/bowl-and-belly`), package name, domain.
- **PWA `short_name`:** "Bowl & Belly" (12 characters), so no shorter variant is needed.
- **Logo:** concept E, a rabbit, a cat and a dog peeking over an orange bowl, each in its own peach shade. Concept F (the same pets as navy silhouettes) is kept as an alternative; the dark-mode logo is still to be decided.
- **Typefaces:** Outfit SemiBold for the wordmark, Inter for UI text.

| Role | Colour |
| --- | --- |
| Ink (text, eyes, F silhouettes) | `#1F2A44` |
| Secondary text | `#4A5468` |
| Bowl | `#F08A4B` |
| Bowl rim | `#CE7741` |
| Cat | `#FFC9A3` |
| Rabbit | `#F6D4BB` |
| Dog / dog ears | `#F2B48A` / `#D99A70` |
| Light tile (F icon) | `#FFF3E8` |

**Icons**

| Use | Asset |
| --- | --- |
| Browser tab favicon (16 px) | Simplified mark: the cat alone over the bowl, E colours, no tile |
| 32 px favicon, bookmarks, PWA (192 and 512 px, plus a maskable 512) | Full E app icon: the trio on a navy rounded tile |
| README banner | E lockup: mark plus wordmark |

## Later slices

**Later slices**

1. **Cost tracking:** a purchases table (quantity, optional price in minor units), cost per kg from the last priced purchase, snapshot on each feed entry, currency setting.
2. **Export:** CSV of feeds and weights for the vet, plus the Insights charts as images.
3. **Units:** lb support as an app setting.
4. **Multiple users:** households, "who fed".
5. **Treats:** quick logging of treats and other calories.
6. **Alerts:** low stock, missed feeds, weight change, as in-app banners first and notifications later.
7. **Import:** CSV import in the same documented format as the export, so data round-trips between instances. Converting data from other apps into that format is up to the user.
