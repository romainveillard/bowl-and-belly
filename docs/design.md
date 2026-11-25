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

* Changing neutered status, activity, goal, target weight, birth date, pet type or the manual override inserts a new target row effective from today. A second change the same day replaces that day's row, a change that leaves the target as it was adds nothing, and a change back to the target in force before today removes today's row.
* A target the user set is never recalculated: it stays until they go back to the suggested value.
* A weigh-in never recalculates silently. The app offers "Update target from new weight?" so scale noise doesn't make the target jitter. The same goes for reaching an age at which the table moves a pet to another row: dogs at 4 and 12 months, cats at 12. That question is asked once per age step, whichever the answer, and only if the target was set before the pet reached it.
* Neither question is asked about a target the user set themselves.
* Editing the current weight on the pet form is the exception: it logs a weigh-in and updates a calculated target at once, because the form shows the new suggestion before saving. An edit that changes nothing the formula reads, such as a new name or photo, leaves a calculated target as it is, so a suggestion the user kept their old target over isn't applied behind their back.
* Custom pet types have no formula: the target is manual, and the target line is hidden if none is set. A pet moved from cat or dog to a custom type keeps its calculated target as its own, from today. Going back to the suggested target when there is none (no weigh-in yet, or a custom type) is refused with `no_suggestion`.

### Leftovers

A feed entry has an optional leftover in grams; eaten = served − leftover. Whether the leftover goes back into stock defaults from the food type (dry: returned; wet: binned) and can be overridden per entry. Leftovers are usually found at the next feed, so when the pet's previous feed, within the last 24 hours, has no leftover recorded and its food type returns leftovers to stock (dry by default), the log form shows an optional "Left over from 14:30?" field. Leaving it empty means nothing was left. Other types use Add leftover. The leftover is saved on the previous feed in the same transaction as the new one. Leftovers can also be added from the timeline.

### Stock and portions

Stock is a running total stored in grams for every food. Each food has a stock unit: grams (shown as kg/g) or portions (shown as e.g. "8 pouches + 45 g", and restocked as "+12 pouches").

- **Portions are opt-in per food.** A switch on the food form turns them on (off by default) and reveals the portion name and weight. Dry food never has portions: its section is hidden and its stock is always in grams. Every other food type, including custom ones, can use them.
- **Portion names** are picked from chips (Pouch, Tin, Tray) or typed after choosing Other. The suggested names come from the translation files; the chosen name is stored as plain text in the user's language.
- **Entering stock** for gram-counted foods has a g/kg toggle, since bags are labelled in kg. It only changes the input; storage stays in grams.
- **Calories** are entered per 100 g or per kg, as printed on the label, and stored as kcal/kg. Lists show them per 100 g.
- **Portion-counted stock** is shown as whole portions plus what is left of an open one ("8 pouches + 45 g"), or in plain grams under one portion. A suggested portion name is counted and translated properly ("1 tin", "3 boîtes"); a typed one takes a plain "s" in the plural.
- **Out of stock:** stock at or below zero is never shown as a number, only as "Out of stock" in the warning colour.
- **Restocking** adds to the current stock: a stepper in portions starting at 1, or an amount with a g/kg toggle (kg by default), with the new total shown. Stock that had run below zero counts as an empty shelf.
- **Correcting the count:** Current stock on the Edit food form sets the stock directly, for when the count is wrong. It keeps no history and leaves past feeds untouched. Saving the form without touching Current stock leaves the stock as it is on the server, so feeds logged from another device while the form was open still count.
- **"For"** on the food form defaults to the type of the currently selected pet and can be set to "Any pet".
- **Empty Stock tab:** "No foods yet" with "Add your first food", and the Archived foods link if any.

Logging is always in grams, with an optional grams/portions toggle on the amount input for portion-counted foods. Logging, editing and deleting a feed entry each adjust stock by the difference.

Deleting an entry returns its net amount to stock: served minus any leftover already returned. A delete means "logged by mistake", so the food never left the bag. If food was really served and binned, the entry should be edited (leftover not returned), not deleted.

### Editing a food's calories

Each feed entry snapshots the food's kcal/kg. Editing kcal asks whether to update existing logs: all of them (misread label), those since a date (recipe change), or none. The question is only asked when the food has past feeds, and "since a date" is preselected with today. Foods are archived, never deleted: an archived food leaves the food picker, keeps its past feeds, and can be restored from the Archived foods page, reached from a link under the stock list.

The backfill runs in the same transaction as the food edit: `UPDATE feed_entry SET kcal_per_kg = ? WHERE food_id = ?`, plus `AND fed_at >= ?` for "since a date", where that date means the start of that app day (time zone and day start applied). Edits apply in the order they are saved, so a later edit simply overwrites any range it overlaps. For example, "all logs → 3,500" followed by "since 1 March → 3,600" leaves earlier entries at 3,500 and later ones at 3,600.

### Days and time zones

Timestamps are stored in UTC. One app-wide IANA time zone (e.g. Europe/London) and a "day starts at" time (default 00:00, configurable to e.g. 03:00) decide which day an entry belongs to. Per-entry time zones are out of scope. A feed's time is entered as a clock time in the app time zone and saved as the latest moment at or before now when the clock read that time, so 23:50 entered at 00:10 lands on the previous evening.

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
- **Bounds:** the API refuses amounts, weights and portions over 1,000,000 g, stock beyond ±10,000,000 g, more than 10,000 kcal/kg and daily targets over 20,000 kcal, so one bad value can't swamp totals or charts.
- **Unused photos:** a photo is uploaded before its form is saved, so an abandoned form leaves one behind. Photos that no pet or food uses are deleted at start-up.
- **Stock audit trail:** none in the MVP; stock is a mutated total. A purchases table arrives with cost tracking.

## Screens and UX

Seven screens, mobile-first, installable as a PWA. A bottom bar holds five tabs (Today, History, Insights, Stock, Pets); Settings opens from a gear icon on Today. Each tab's main action (Log feed, Add pet, Add food) is a floating button in the same spot, bottom right above the bar. Pet-specific screens (Today, Insights, Log feed) show a pet chip with photo and name; with two or more pets, tapping it opens the pet switcher sheet (each pet with today's kcal, plus "Manage pets"), and the choice carries across screens. With one pet the chip is not tappable. The last pet used is the default; the choice is kept per device, like the language, and falls back to the first pet when that pet is archived.

| Screen | What it does |
| --- | --- |
| Today (home) | Card with kcal so far vs target, a progress bar, "N kcal left" (or "N kcal over", in the warning colour once past the 5% band) and the wet/dry split; today's entries in the feed row style below; a floating "Log feed" button above the bottom bar. |
| Log feed (bottom sheet) | Recents-first food picker with wet/dry badge, brand on a muted second line, and stock left in the food's own unit ("8 pouches left"); search and type filter chips above. Grams prefilled with the last amount for that pet and food, g/portion toggle, time defaults to now. Shows the "left over from last feed?" prompt when relevant: two lines at most, and leaving it empty means nothing was left. |
| History | One card per day with feeds, newest first, plus today. The card shows kcal vs target and a bar; tapping it expands a breakdown per food type (grams eaten and kcal) and the day's entries in the feed row style (see Feed rows below). The latest finished day is open by default, since today's feeds are already on Today. Today is badged "So far" with a lighter bar; a past day within 5% of its target either way is badged "On target", and a day more than 5% over gets a darker bar. Every kcal bar (History, Today, the pet cards) darkens by that same rule, so a day on target is never also shown as over. Older days load as the list scrolls. A pet with no feeds at all gets a "No feeds yet" message with Log feed. |
| Insights | Day / week / month toggle, remembered per device, with arrows to step through periods (forward stops at the current one). The period and day shown are in the address (`?period=week&from=2026-11-16`), so a link or a reload opens the same view. Stepping through periods replaces the address rather than adding to the history, so Back leaves Insights in one step, as from any screen, which matters on Android. The tab itself opens on the current period. **Day:** one app day (from the day start to the next), with a step line of the running kcal total, a dot per feed coloured by food type, the target line, the eaten total against target, the feed count and wet/dry split, and the day's feed rows. **Week:** one intake bar per day, Monday to Sunday. **Month:** one bar per day of the calendar month, with days still to come as short grey stubs, and "On target: X of Y days" (within 5%). Week and month averages count finished days with feeds only. On desktop, stat cards add the target with how it was set and, for weeks and months, the latest weight. Week shows the last eight weeks of weight; month shows that month's weigh-ins, both as raw readings plus a 7-day rolling average, and month calls the weight steady when the average moved by less than 1% or 50 g, whichever is larger, and otherwise "Up/Down 0.2 kg this month". The day's eaten total reads "On target" within the same 5% band as History, otherwise "N under/over target". |
| Pets | List of pet cards (photo, type, age, weight, today's kcal vs target), archived pets link, and Add pet. The profile shows the daily target with how it was calculated and "Set my own target", weight with a sparkline, recent weigh-ins and Log weight, target history, and Archive pet. See "Pet forms and target prompts" below. |
| Stock | Foods with stock level in their own unit; quick restock; add, edit and archive (the food form follows "Stock and portions" above). Editing kcal triggers the "update existing logs?" choice. |
| Settings | Time zone, day start time, pet types, food types, language, scheduled backups (opt-in), backup download. Pet types and Food types are pages listing built-in types (locked) and custom ones, which open in the same form as Add (a sheet on a phone, a dialog on desktop) with Archive type. Custom types are archived, never deleted, and a "Show archived" switch under each list reveals them with Restore. Custom names must be unique among active types and can't match a built-in label in the current language; restoring a type whose name has since been reused is refused. A pet or food whose type was archived keeps it, and its edit form shows it as "Raw (archived)"; new pets and foods are never offered it. Stock shows a type's filter chip only while an active food uses it. Settings has no Save button: choices save as they change, and typed times and numbers when the field is left, once valid. |

### First run

Until there is at least one pet and one food, Today guides the set-up instead of showing its normal layout, and Log feed (and Log weight on desktop) stays hidden.

- **No pets:** a welcome card with "Add your first pet", which opens the Add pet form, and a "Getting started" checklist (add your pet, add a food). History and Insights show a short version of the same message ("No history yet", "No insights yet") with the same button.
- **A pet but no foods:** the normal calories card (0 / target, "No feeds yet today") and an "Add a food to start logging" card with the checklist, its first step ticked. "Add food" opens the Add food form.
- **Once both exist,** Today switches to its normal layout and the checklist goes away for good.

### Feed rows

Used on Today and History. A food-type tile on the left (blue drop for wet, peach kibbles for dry), the food name with "14:30 · 20 g · 4 g left" underneath, and kcal on the right. Nothing wraps: long names end with "…".

- **Tap** opens the entry's actions: edit, add leftover, log again (same food and amount, time now), delete.
- **Edit feed** shows the food as one row with "Change" (which opens the picker in place), then Served and Left over side by side, then Date and Time. The entry keeps its own date unless Date is changed, and a time still to come is refused. Saving moves stock by the difference; a new food brings its own kcal snapshot.
- **Add leftover** takes the grams and "Back in stock / Binned" (from the food type, or the entry's earlier choice), with a live "Eaten: X g · Y kcal" line.
- **Log again** shows a "Logged again" snackbar with Undo, since a swipe right is easy to make by accident.
- **Swipe right** logs it again; **swipe left** deletes it. Both are shortcuts for actions also in the tap menu.
- **Delete** shows an undo snackbar above the bottom bar for about 10 seconds, or for as long as it is hovered or has focus, naming the entry ("07:30 · Salmon kibbles · 20 g"). One snackbar at a time: a new delete makes the previous one final. Undo restores the entry, the day's total and the stock.
- **Discoverability:** the first time Today shows entries, the top row peeks a few pixels to reveal the swipe colours, then settles back. No hint text.
- **Desktop:** no swipes; hovering or focusing a row shows "Log again" and "Delete" buttons beside its kcal.
- **Undo** puts the deleted entry back with its original time and kcal snapshot, and takes its stock again.

### Logging a feed

- **Food picker:** foods for the pet's type or for any pet, recently fed ones first (most recent first), the rest by name. The most recent food is chosen when the sheet opens.
- **Amount:** prefilled with the last amount served to this pet of that food. A portion-counted food starts in portions (one portion if never fed, or the last amount when it was a whole number of portions); switching between grams and portions keeps the same quantity. "≈ 74 kcal" follows the amount.
- **Time** defaults to now; left untouched, the feed is saved at the moment of saving.
- **Validation** follows the shared pattern; the leftover may not exceed what the previous feed served.
- **Log feed** stays hidden until there is at least one pet and one food.

### Pet forms and target prompts

- **Add and edit pet** share one form: details (photo, name, type), age (birth date, year or age; an age is saved as an estimate), health and goal, current weight, and daily target. Neutered is a Yes/No choice. Choosing Lose or Gain reveals a target weight field, and the suggestion then uses it.
- **Daily target** on the form shows the live suggestion, with a "Set my own target" switch for a manual value. Custom pet types have no suggestion and only offer the manual value.
- **Saving an edit that changes the target** (neutered, activity, goal, target weight) shows a snackbar such as "Daily target now 238 kcal from today".
- **Log weight** is a sheet with weight and date (default today), showing the last reading. The date is an app day, like a feed's. An earlier date is allowed (stored halfway through that app day, so it always falls on that day whatever time the day starts) and a later one refused; two readings on the same day are both kept. A reading more than 20% away from the one before it (not counting the reading being edited) gets an amber outline and "That's a big change from 4.5 kg. Is 45 kg right?", which does not block saving.
- **Weigh-ins** on the profile: the latest three, with "Show all (N)" expanding the full list in place, so any reading can be corrected. Tapping one opens its actions (Edit, Delete); on desktop they show as buttons on hover. Edit reopens the Log weight sheet prefilled, titled "Edit weigh-in"; Delete shows "Weigh-in deleted" with Undo.
- **After a weigh-in**, if it is now the latest reading and the suggested target differs, a dialog compares current and suggested targets with "Update to …" and "Keep …". It applies from today; past days keep their target. A backdated reading only joins the history. Editing or deleting the latest reading asks again. The age question uses the same dialog with its own sentence, the next time Today or the pet's profile opens.
- **Log weight** sits in the profile's Weight card on a phone, and beside the main floating button on desktop Today, History and Pets. Desktop Today also shows a Weight card with the latest reading and a sparkline, linking to the profile.
- **Set my own target** is a sheet with a kcal/day field and a way back to the suggested value. It also applies from today.
- **Current weight** is optional on the form. Without it, or without a target weight when the goal needs one, there is no suggestion yet.
- **The target explanation** on the profile names the species ("for an inactive cat", "for a growing puppy") and says "since today" for a target set today.
- **First run:** with no pets, the Pets tab shows "Add your first pet" in place of the list and the floating button.
- **Archive pet** asks for confirmation. Archived pets keep their history, leave the pet switcher, and are listed on their own page, reached from a link under the pets list, where each can be restored.

### Forms, dialogs and snackbars

- **Validation:** Save stays enabled, since a disabled button doesn't say what's wrong. A failed save shows a summary at the top ("2 things to fix before saving: name and current weight."), a message under each invalid field, and moves focus to the first. Fields are then re-validated on blur. Invalid fields carry `aria-invalid` and `aria-describedby`.
- **Snackbar:** one shared component, navy with white text and an optional action (Undo for deletes, none for target changes). A plain confirmation shows for about 5 seconds and one with an action, which also has a dismiss button, for about 10; neither closes while the pointer or focus is on it. When a delete has taken focus with it, focus moves to Undo, so keyboard and screen-reader users have all the time they need. On a phone it spans the width above the bottom bar; on desktop it sits at the bottom centre of the content column, clear of the floating buttons.
- **Error snackbar:** for an error that doesn't belong to a field (a refused photo, a lost connection, a save the server turns down). White on the danger colour with an alert icon, it says what failed and why ("Couldn't upload the photo. It's larger than 20 MB. Try a smaller one."), uses `role="alert"`, and stays until dismissed. The reason comes from the API's error code; without one it falls back to the connection or a generic line. An error replaces a confirmation on screen, never the other way round. Field errors stay inline.
- **Sheets and dialogs:** a sheet rises from the bottom on a phone and is a dialog near the top of the page on desktop. A confirmation is a centred dialog.
- **Desktop:** from 860 px the tabs move to a sidebar with Settings and the version at its foot, and Pets shows the list and the selected profile side by side.
- **Navigation:** each screen titles the browser tab ("Today · Bowl & Belly"). Moving to another tab or page puts focus on the content and announces the new title; choosing a pet in the desktop list leaves focus in the list. A "Skip to content" link, shown on focus, leads past the sidebar.

## UI design

- **Components:** Tailwind CSS with shadcn/ui. Colour tokens use shadcn's names, so they drop straight into its theme.
- **Colours:** foreground `#1F2A44`, primary `#F08A4B`, primary-strong `#CE7741`, accent `#FFC9A3`, accent-soft `#FFE6D4`, background `#F6F7F9`, card `#FFFFFF`, muted `#EEF0F4`, border `#E3E6EC`, input-border `#8A92A3`, muted-foreground `#5B6478`, success `#2A7049`, warning `#9A6412`, danger `#B93A32`.
- **Primary buttons** use navy text on orange (about 5.3:1). White on the brand orange fails contrast.
- **Controls:** switches only turn a feature on or off (portions, own target). Facts and choices (neutered, activity, goal, units) use segmented controls or chips.
- **Type:** Outfit SemiBold for headings and figures (tabular numbers), Inter for everything else. Both fonts are bundled with the app, so nothing is fetched from a font service. 4 px spacing grid, touch targets at least 44 px, radii from 8 px (inputs) to 24 px (sheet tops).
- **Charts:** intake bars in primary, days over target (beyond the same 5% band as "On target") in primary-strong, today's partial bar in accent and left out of averages, target as a dashed navy line that steps if the target changed within the period; weight as faint raw points with a primary-strong rolling-average line. The charting library is left out of the first load and fetched with Insights once the browser is idle, after the other screens.
- **Dark mode** is out of scope for the MVP, but every colour is a token so it can be added later.

## Translations

The app is translation-ready from the first commit and ships in English and French; further languages come from contributors. Retrofitting string extraction later means touching every component, whereas doing it from the start costs almost nothing.

- **Library:** i18next with react-i18next, the most familiar choice for open-source contributors, using ICU message format for plurals ("1 pouch", "8 pouches").
- **Formatting:** numbers, dates and units go through `Intl`, so French users see "4,2 kg", "1 500 kcal" and their own date order, and inputs are prefilled with "4,5". Numbers in messages are ICU `{kcal, number}`, units and in-sentence words have their own keys rather than labels lower-cased in code, and French puts a no-break space before `? ! ; : %` and inside « ». Dates of instants, such as a weigh-in, are taken in the app's time zone and day start.
- **Seeded rows:** cat, dog, wet and dry are labelled through their `system_key` translation keys. User-entered names (pets, foods, custom types) are never translated.
- **API:** returns error codes and machine values, never user-facing sentences, so all wording lives in the frontend. `not_found` (404) means the resource in the URL doesn't exist; `invalid_reference` (400) means an id in the request body (a pet type, food, photo and so on) doesn't. An error no route handles still answers a code: `invalid_reference` for a missing row the body named, `invalid_request` for a body that isn't JSON or breaks a constraint, and `internal` (logged) for anything else.
- **Language choice:** browser language by default, overridable per device (stored in the browser), since household members may want different languages and there are no user accounts.

## Architecture

One Docker container serves both the API and the built frontend, with a single volume holding the SQLite file.

| Layer | Choice |
| --- | --- |
| Backend | Node with Hono (via its Node adapter), TypeScript, Zod validation; the frontend calls it through Hono's typed RPC client |
| Database | SQLite via Drizzle ORM and migrations |
| Frontend | React SPA built with Vite, React Router, Tailwind CSS and shadcn/ui, TanStack Query, Recharts (chart export via a small SVG-to-PNG helper), served as static files by the backend |
| PWA | Web app manifest for install; no service worker, since the app is online-only and browsers no longer need one to offer installation |
| Images | amd64 and arm64, built with `docker buildx` on GitHub Actions native runners and published to GHCR once lint, tests and build pass, with an SBOM and provenance; pull requests build the image without publishing it |
| Licence | MIT |

- **Auth:** optional single password in `BOWL_PASSWORD`; unset means no auth. The README warns against exposing an unprotected instance.
  - Only `/api/*` is protected, except `/api/health` and the login endpoint; the static frontend is served openly so the login page can render.
  - Logging in sets an HttpOnly, SameSite=Lax cookie (Secure over HTTPS) holding a timestamp signed with HMAC-SHA256. The signing secret is generated on first start into `session-secret` in the volume, and the password is part of what is signed, so changing it ends every session. Sessions last a year and are reissued when used after a day, so one in regular use never ends. Log out (Settings, shown only when a password is set) clears this device's cookie.
  - Request bodies are capped at 64 KB (photo uploads at 20 MB), checked before the session so the open login route is covered too, and a password is at most 1,024 characters.
  - Form-style requests (a form, multipart or plain-text body, or no body) to the API must come from the app itself: `Sec-Fetch-Site: same-origin`, or an `Origin` on the same host. Anything else answers `forbidden`, so a page on another site can't change data on an instance without a password. JSON requests need no check, since browsers can't send them across sites without CORS, which the app never allows.
  - Every response carries security headers: a Content Security Policy that only allows the app's own scripts, styles, fonts and images (inline styles allowed, since the charts use them), no framing, and no referrer. HSTS is left to the proxy that terminates HTTPS.
  - Passwords are compared in constant time. A wrong one answers after a second, and ten failures within a minute block further attempts until they age out. The limit is global by default, since behind a proxy every request looks the same; `BOWL_TRUST_PROXY=cloudflare` keys it on `CF-Connecting-IP` instead, so one client can't lock everyone out. An IPv6 address counts by its /64, which one subscriber usually holds whole, and all clients together are capped at 100 failures a minute, so changing address doesn't lift the limit.
  - Behind Cloudflare Access, a long session duration avoids the installed PWA hitting expired-session redirects, and the app shows a "session expired" state when an API call is redirected (fetched with `redirect: "manual"`, so the browser reports an opaque redirect rather than following it into a CORS error): close and reopen on a phone, reload on desktop. A real network error only shows a snackbar, "Can't reach Bowl & Belly. Check your connection.", and leaves the screen usable. An empty password isn't sent and doesn't count as an attempt.
- **Backups:** opt-in in Settings and off by default, with a schedule (daily, or weekly on a chosen weekday, at a chosen time) and a number of copies to keep (default 7). Each run uses `VACUUM INTO` to write a consistent copy into the volume (a plain copy of a live SQLite file isn't safe), as `backups/bowl-and-belly-20261123T033000Z.db` (UTC). The schedule's time is read in the app time zone; a time skipped by a clock change runs an hour later, and a repeated one runs once. Retention deletes only files matching that name, so other files in the folder are safe. A run missed while the server was down is not caught up. A failed run (scheduled, or from "Back up now") is recorded with its time and a reason (disk full, can't write, unknown) and shown as a banner with "Back up now" until a later run succeeds; downloads don't count. The "Download backup" button in Settings works whether or not scheduled backups are on, and makes a fresh copy rather than serving the latest backup. Off-box copies are the operator's job, e.g. the Pi pulling the latest file from OCI.
- **Deployment target:** OCI Ampere VM (arm64) behind a Cloudflare Tunnel.
- **Demo data:** `npm run demo` fills `data-demo/` with three pets (Miso, a cat on maintain; Biscuit, a dog put on a diet three weeks in; Clover, a rabbit with a custom type and a manual target) and 90 days of feeds, leftovers, weigh-ins and restocks ending at the moment it runs. Feeds, leftovers, restocks and target changes go through the same server code as the API, so stock and targets follow the app's own rules; pets, foods and weigh-ins are inserted directly. It uses a fixed random seed.
- **Demo mode:** `BOWL_DEMO=true` runs the public demo. The database is replaced with fresh demo data at start-up and every night at 03:00 London time, ids included, so links survive a reset. A banner on every screen says the data is shared with other visitors and resets every night, and links to the repository. Since every visitor shares it, strangers can't upload photos, take or download backups, or change any setting other than the per-device language (the time zone stays Europe/London and the day starts at midnight; both fields are greyed out with "Fixed for the demo."), and all visitors together can add at most 10 pets, 30 foods, 500 feeds, 200 weigh-ins, 10 custom pet types and 10 custom food types between resets (custom types stay editable). The limits count rows, not requests, so undoing a delete or logging a weight from the pet form counts too; the API answers `demo_disabled` or `demo_limit`, and the app shows a snackbar for the limit. Settings hides Backups and Access, and the forms hide the photo picker.

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
