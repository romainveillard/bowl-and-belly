<p align="center">
  <img src="docs/brand/readme-banner.png" alt="Bowl & Belly" width="640">
</p>

Bowl & Belly is a small self-hosted app for keeping track of what your pets eat and weigh. Log each feed in a couple of taps, see the day's calories against a target worked out for each pet, and keep an eye on stock and weight over time. It installs on a phone's home screen as a web app and runs as a single container with a single SQLite file.

<!-- Screenshots: Today, Log a feed, Insights and Pets on a phone, plus Today on desktop. -->

## Features

- **Daily calories:** each pet gets a target from the AAHA guidelines (cats and dogs), or one you set yourself, and Today shows what's been eaten against it.
- **Quick logging:** pick a food, enter the grams or portions, done. Leftovers can be recorded later and go back into stock or the bin.
- **Food and stock:** foods with their calories from the label, stock that goes down as you feed, and portions such as pouches or tins.
- **Weight:** weigh-ins with a trend, and a prompt to update the target when the weight changes.
- **Insights:** day, week and month views of intake and weight.
- **Households:** several pets, and as many devices as you like. English and French.
- **Backups:** scheduled copies in the data volume, or a download from Settings.

## Running it

Images for amd64 and arm64 are published to the GitHub Container Registry. The quickest way to run one is the [`compose.yaml`](compose.yaml) in this repository:

1. Download [`compose.yaml`](https://raw.githubusercontent.com/romainveillard/bowl-and-belly/main/compose.yaml) into an empty folder.
2. Next to it, create a `.env` file with the password, at least 12 characters: `BOWL_PASSWORD=…`
3. Run `docker compose up -d` (or `podman compose up -d`) and open http://localhost:3000.

The file has the options for running behind a tunnel or Cloudflare commented in; the variables below go in its `environment:` section.

| Variable | Default | What it does |
| --- | --- | --- |
| `BOWL_PASSWORD` | unset | The password for the login page, at least 12 characters. Unset means no login at all. |
| `BOWL_HOSTS` | unset | Without a password, the app only answers requests addressed to `localhost` or an IP address, so a web page can't reach it through a domain of its own. List any other names it's reached by, separated by commas, for example `nas.home.arpa,pets.example.org`. Not needed with a password. |
| `BOWL_TRUST_PROXY` | unset | Set to `cloudflare` when the app sits behind Cloudflare, so login attempts are limited per visitor (using `CF-Connecting-IP`) rather than for everyone at once. Only set it if every request really comes through Cloudflare, since the header is easy to fake otherwise. |
| `TZ` | `UTC` | The time zone the app starts with. You can change it later in Settings. |
| `PORT` | `3000` | The port the app listens on inside the container. |
| `DATA_DIR` | `/data` | Where the database, backups and login secret are kept. The image's volume is there, so leave it unless you mount it elsewhere. |
| `BOWL_DEMO` | unset | `true` runs the public demo: see [Running a public demo](#running-a-public-demo). |

Everything the app keeps lives in `/data`: the database, backups, and the secret that signs login sessions. The container runs as the `node` user (uid 1000), so a bind-mounted folder must be writable by that user.

Tags: `latest` and `x.y.z` / `x.y` follow releases; `edge` follows the main branch.

### Exposing it to the internet

> [!WARNING]
> Without `BOWL_PASSWORD`, anyone who can reach the app can read and change everything in it. Don't expose an instance without a password, or without something like Cloudflare Access in front of it.

With a password set, the app's data is only served to devices that have logged in. A login lasts a year and is renewed whenever the app is used, so a phone that opens it regularly stays signed in. Changing the password signs every device out. Wrong passwords are slowed down and limited to ten a minute.

<!-- Screenshot: the login page, on a phone and on desktop. The public demo has no password, so this is the only place visitors see it. -->

When a tunnel or reverse proxy on the same machine is the way in, publish the port on the loopback interface only (`"127.0.0.1:3000:3000"`), or leave out `ports:` when the tunnel runs on the same compose network. Otherwise the app is also reachable directly, past whatever the proxy checks. Without a password, also list the public hostname in `BOWL_HOSTS`.

If you put Cloudflare Access (or another login proxy) in front of the app, give it a long session duration too. When that outer session runs out, the app can't renew it itself: it shows a "Your session has expired" page asking you to reopen or reload it.

## Backups

Scheduled backups are off by default. Turn them on in Settings, choose daily or weekly and how many copies to keep. Each backup is a consistent copy of the database, written to `/data/backups/` with its time in its name, for example `bowl-and-belly-20261123T033000Z.db`. Only files named like that are deleted when older copies are pruned.

These copies live in the same volume as the database, so copy them somewhere else too, for example with a nightly `rsync` or `rclone` from another machine.

**Download backup** in Settings gives you a fresh copy at any time, whether scheduled backups are on or not.

### Restoring a backup

There's no restore button: you replace the database file while the app is stopped.

1. Stop the app: `docker compose stop bowl-and-belly`
2. If the backup is on your computer rather than in the volume, copy it in: `docker compose cp ./bowl-and-belly-2026-11-23.db bowl-and-belly:/data/restore.db`
3. Copy the current database aside first, so you can go back to it, then put the backup in its place, remove the old database's journal files and give the files back to the app's user. Set `backup` to `/data/restore.db` for a copied-in file, or to a scheduled backup such as `/data/backups/bowl-and-belly-20261123T033000Z.db`:

   ```sh
   docker compose run --rm --no-deps --user root --entrypoint sh bowl-and-belly -c '
     backup=/data/restore.db
     mkdir -p /data/before-restore &&
     cp /data/bowl-and-belly.db* /data/before-restore/ &&
     cp "$backup" /data/bowl-and-belly.db &&
     rm -f /data/bowl-and-belly.db-wal /data/bowl-and-belly.db-shm &&
     chown -R node:node /data'
   ```

4. Start it again: `docker compose start bowl-and-belly`

Logins are kept, since the session secret isn't part of the database. A backup from an older version is upgraded automatically when the app starts.

## Running a public demo

`BOWL_DEMO=true` turns an instance into a demo: three pets with three months of history, replaced with fresh data at start-up and every night at 03:00 (London time), a banner on every screen, and no photo uploads or backups. Visitors can add a handful of pets, foods and feeds between resets. Run it as its own container with its own volume, never on the one holding your real data, and without `BOWL_PASSWORD`. Set `BOWL_HOSTS` to the demo's public hostname.

To try the same data locally, run `npm run demo` (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setting up, running and testing the app, and [docs/design.md](docs/design.md) for how it's meant to work.

## Licence

[MIT](LICENSE)
