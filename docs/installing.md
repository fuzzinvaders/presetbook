# Installing and running Presetbook

*[Version française](installation.md) — for a step-by-step guide aimed at people who never open a
terminal, see [Running it on a Mac](install-mac.md).*

The server has **no dependencies**: Node 18 or later is enough, and the Docker image builds without
installing a single package.

## Locally

```bash
npm start
```

Then <http://localhost:8080>. Data goes into `./data`, next to the repository.

### On a workstation, without Docker

This is the simplest route, on a Mac as anywhere else.

```bash
brew install node                                          # if Node is not already there
git clone https://github.com/fuzzinvaders/presetbook.git
cd presetbook
npm start
```

On Windows or Linux only the first line changes — the installer from <https://nodejs.org> or the
distribution's package manager.

On first open no account exists: **the first one created is yours**, and it is this instance's
administrator.

Three useful things to know:

- the server listens on **all interfaces** by default, so other machines on the local network can see
  it. For a genuinely personal install: `HOST=127.0.0.1 npm start`;
- from `http://localhost` the app is **installable** — the browser treats it as a secure site. Chrome
  and Edge offer an **Install** button in the header; Safari 17 and later has *File → Add to Dock*.
  It then opens in its own window, with its icon;
- to stop it, `Ctrl+C`. Nothing runs in the background, nothing is installed into the system.

### Without installing anything at all

`public/index.html` opens straight from disk with a double-click: the app shows the whole catalogue
and works with no server. Its limits are real, though:

- there are **no accounts** — data lives in the browser's local storage;
- **Safari restricts that storage for local files**: depending on version and settings, changes may
  not survive closing. Chrome and Edge allow it. When in doubt, use "Backup" to export before
  closing;
- the app cannot be installed from a local file.

Fine for looking around or for troubleshooting; to actually use it, `npm start` costs one more minute
and removes those limits.

## With Docker

The image is published on every commit to `main`: nothing to build.

```bash
docker run -d --name presetbook -p 8080:8080 -v presetbook-data:/data ghcr.io/fuzzinvaders/presetbook:latest
```

Or with the repository's compose file, which adds the health probe and automatic restart:

```bash
docker compose up -d
```

Three tags exist: `latest` follows `main`, `vX.Y.Z` pins a version, and `sha-1a2b3c` points at a
precise commit. Images are built for **amd64 and arm64**, so they run on a Raspberry Pi too.

To build from source rather than the published image, uncomment `build: .` in the compose file and
run `docker compose up -d --build`.

## Behind a reverse proxy

`docker-compose.traefik.yml` covers going online over HTTPS behind Traefik, on a shared network. Two
values depend on the machine and live in a `.env` beside the compose file, never in the repository:

```bash
git clone https://github.com/fuzzinvaders/presetbook.git
cd presetbook
cp .env.example .env        # then fill in DOMAIN and DATA_PATH
sudo mkdir -p /srv/presetbook-data
sudo chown -R 1000:1000 /srv/presetbook-data
docker compose -f docker-compose.traefik.yml up -d
```

`DATA_PATH` is **required**, with no default. That is deliberate: a default would start the service
on an empty folder, which looks exactly like losing every preset while the data sits intact
elsewhere. Better a start that refuses and names the variable.

The `chown` matters as much as the rest: **the container runs unprivileged, as uid 1000.** On a
root-owned folder the server starts and cannot write a single preset.

Four points in that file deserve attention:

- **no published port.** Traefik reaches the container over the internal network; a `ports:` would
  make the site reachable in the clear, without TLS, bypassing the proxy. For troubleshooting, bind
  to the host's loopback only: `127.0.0.1:6598:8080`;
- **the Traefik rule expects backticks** around the host, not double quotes, and the whole label then
  goes in single quotes in YAML:

  ```yaml
  - 'traefik.http.routers.presetbook.rule=Host(`${DOMAIN:?set DOMAIN in .env}`)'
  ```

- **`SECURE_COOKIES=1`** guarantees the session cookie's `Secure` flag even if the
  `X-Forwarded-Proto` header is missing;
- the entrypoint name (`websecure` in the example) must match what Traefik's static configuration
  declares.

### Updating

```bash
docker compose -f docker-compose.traefik.yml pull
docker compose -f docker-compose.traefik.yml up -d
```

`pull` fetches the republished image, `up -d` recreates the container only if the image changed.
Nothing is built on the server any more, so an update takes a few seconds. The data lives in the bind
mount: it is not touched.

A `git pull` of the repository is no longer needed to update the application — only to pick up
changes to the compose files themselves.

## Configuration

| Variable | Default | Role |
| --- | --- | --- |
| `PORT` | `8080` | listening port |
| `HOST` | `0.0.0.0` | listening interface |
| `DATA_DIR` | `/data` (image) or `./data` | data folder |
| `ALLOW_REGISTER` | empty | `1` to open account creation to everyone |
| `SESSION_DAYS` | `30` | session lifetime |
| `SECURE_COOKIES` | empty | `1` to force the `Secure` cookie |
| `BASIC_AUTH` | empty | `user:password` — an HTTP gate in front of the whole site except `/healthz` |
| `DEMO_LOGIN` | empty | `username:password` — public demo account, see below |

An `environment` block is written **either** as a mapping (`KEY: "value"`) **or** as a list
(`- KEY=value`): mixing the two in one block is a YAML syntax error, and the file does not load at
all.

Secrets like `BASIC_AUTH` go in a `.env` beside the compose file, never in the compose file itself,
which is tracked by git. See `.env.example`.

## Accounts and security

Account creation is possible in three cases: no account exists yet, `ALLOW_REGISTER` is on, or the
request comes from the **administrator** — the first account created on the instance. That is what
the **Accounts** button in the header does, and it is the recommended route: leave `ALLOW_REGISTER`
off.

An ordinary user can only change their password and delete their own account. The administrator role
is written in `users.json` (`"admin": true`); on an instance predating this version it is assigned to
the oldest account at the first start, and the log announces it. To see it or move it, use
`tools/admin.js` — see below.

An account created by a signed-in user **receives no session cookie**: the response carries
`switched: false`, so the creator's session is not diverted to the new account. The person signs in
themselves.

What is stored, and how:

- passwords are **never** recorded. Only an **scrypt** derivation (N=16384, r=8, p=1, 64 bytes) is,
  with a random per-account salt, and the comparison is constant-time;
- session tokens are not recorded either: only their SHA-256 fingerprint, so reading `sessions.json`
  does not let anyone impersonate a session;
- cookie `HttpOnly`, `SameSite=Lax`, `Secure` as soon as the site is served over HTTPS;
- past 10 failed sign-ins in a quarter of an hour, the same address is refused without even checking
  the password. An unknown username and a wrong password give the same answer, so as not to reveal
  which accounts exist;
- **no email recovery.** A lost password is reissued from the machine, see just below — the presets
  themselves do not move.

Accounts protect the data, not the network. To expose the service beyond the local network, put it
behind a reverse proxy over **HTTPS**: authentication sends the password in the request body, which
only makes sense under TLS. `BASIC_AUTH` can serve as an extra barrier hiding the site's existence
altogether.

### What stays on disk

Several things live beside each account's preset file, in `presets/`:

| File | What it is |
| --- | --- |
| `<id>.json` | the account's presets |
| `<id>.bak.json` | the previous generation, overwritten on every save |
| `<id>.snap-YYYY-MM-DD.json` | one snapshot per day, seven kept |
| `deleted-<id>-YYYY-MM-DD.json` | the presets of a deleted account |

Snapshots are taken **at the first save of each day**, before writing: each therefore freezes the
previous evening's state. They are restored from the application, **Backup** screen.

A deleted account has its presets **renamed, not erased** — deletion is irreversible in the
application, it does not have to be on disk. Cleaning up is yours to do, whenever you judge it right:

```bash
ls -l "$DATA_PATH/presets/" | grep deleted-
```

### Editing `users.json` by hand: what to know

You can — the administrator role is only an `"admin": true` field — but **a syntax error loses your
edit**, and that is the reason to prefer `tools/admin.js`, which validates before writing.

The mechanism, so that it surprises nobody. If `users.json` becomes unreadable:

1. the server keeps running on `users.bak.json` and says so: `users.json illisible, reprise de …`;
2. at the first write afterwards, the unreadable file is **set aside** as
   `users.corrompu-<timestamp>.json` and replaced by what the server had in memory. **Your edit is
   then lost** — the log says so explicitly;
3. the `users.bak.json` backup is **not** touched: the last valid copy survives.

If you edit anyway, do it **with the server stopped**, re-read the file with
`node -e "JSON.parse(require('fs').readFileSync('users.json','utf8'))"` before restarting, and check
the file still belongs to uid 1000.

### Seeing and moving the administrator role

```bash
docker compose -f docker-compose.traefik.yml exec presetbook node tools/admin.js
```

With no argument the tool prints the accounts, their creation dates and who holds the role. It is the
first reflex when the role is not where you expected: it flags in particular accounts with no
creation date, which could skew the assignment on earlier versions.

To move it:

```bash
docker compose -f docker-compose.traefik.yml exec presetbook node tools/admin.js <username>
```

The change takes effect immediately — the server re-reads the accounts on every request — and there
is deliberately **no screen** for this: otherwise an administrator could appoint another one behind
the server owner's back.

### A forgotten password

Everyone changes their own from the application, **Accounts** button. But nobody can change someone
else's over the web, **not even the administrator**, and that is deliberate: they can delete an
account, they cannot get into it. Otherwise the role would grant access to everyone's presets.

The right to reissue a password therefore comes from access to the machine, which leaves a trace in
the server log:

```bash
DATA_DIR=/srv/presetbook-data node tools/motdepasse.js <username>
```

With no second argument the tool **draws a random password and prints it** — nothing goes through
the shell history. It also closes the account's recorded sessions. Sessions still held in the
server's memory fall at the next restart:

```bash
docker compose -f docker-compose.traefik.yml restart presetbook
```

From a running container, without stopping the service:

```bash
docker compose -f docker-compose.traefik.yml exec presetbook node tools/motdepasse.js <username>
```

### What goes over the wire

The server gzips what benefits from it — HTML, JavaScript, JSON, SVG, manifest — above 1400 bytes and
only when the client accepts it. The page goes from **198 KB to 58 KB**, which shows on a rehearsal
room's mobile connection far more than on a local network.

Three precautions, each against a specific defect:

- `Vary: Accept-Encoding` accompanies every affected response. Without it, an intermediary can serve
  the compressed version to a client that cannot read it;
- the **ETag changes with the encoding** (a `-gz` suffix), for the same reason, and both forms are
  recognised in a conditional request;
- images and fonts are **left alone**: already compressed, running them through gzip would cost time
  to grow by a few bytes.

Static files are compressed once then memoised, keyed by their ETag — no need to redo the work on
every visit on a modest machine.

### The demo account

`DEMO_LOGIN=demo:demo` opens a public account, to let people look at the application without signing
up. It then appears on the sign-in screen as a **Try the demo** button — one click, no password to
type or to pass on: the server opens the session itself. The credentials remain usable by hand for
whoever knows them.

Its credentials being public, the account is kept apart on four points:

- it **cannot create an account**, nor publish to the shared shelf. Without that, anyone on the
  internet would be writing on your server;
- its presets **go back to zero** when the server starts, and when a visitor arrives if nobody has
  touched them for half an hour. The delay matters: without it, a curious visitor would wipe the
  screen of someone in the middle of exploring;
- it **does not count** as the server's owner. On a fresh install its presence does not close account
  creation: the first real account created is still yours;
- entries into the demo are **capped per address**, so a bot cannot mint sessions endlessly.

The ten-character minimum does not apply to that password: it is not a secret. Leaving `DEMO_LOGIN`
empty removes the account from the sign-in screen — the existing account itself stays in `users.json`
until you remove it by hand.

### The only third-party script

The floating donation button is served by Ko-fi: it is code running in your page that you do not
serve yourself. Two precautions make it acceptable:

- it is loaded **only once a session is open**, never while the sign-in screen is possible. A
  third-party script and a password field have no business on the same page;
- it is absent from the published page, where the content security policy blocks external hosts
  anyway.

To remove it: empty the `KOFI` constant, at the top of the script part of `public/index.html`. The
footer link stays — it depends on no third party. That is also what to do for an instance that must
run **with no outgoing request at all**; note that the page otherwise loads its fonts from Google
Fonts, with a system fallback if they do not arrive.

## The data on disk

```
/data
├── users.json      accounts (salt + scrypt derivation, "admin" flag)
├── sessions.json   active sessions (token fingerprints)
├── invites.json    pending invitations (token fingerprints)
├── shared.json     the shelf shared between accounts
└── presets/        one file per account, plus its snapshots
```

Every write copies the previous state to `*.bak.json` and replaces the file atomically (temporary
file then rename), so that an interruption never leaves truncated JSON. If the main file becomes
unreadable, the server falls back on the backup — and **does not copy the corrupt file over it**,
which would destroy the last valid copy; it sets it aside as `*.corrompu-<timestamp>.json` and says
so in the log.

Backing up an instance means copying that folder. The **Backup** button in the interface additionally
offers a JSON export per account, to keep somewhere else.

## Entry points

| Method | Path | Effect |
| --- | --- | --- |
| `GET` | `/` | the application |
| `GET` | `/api/session` | who is signed in, their role, the state of account creation |
| `POST` | `/api/register` | creates an account — administrator, invitation, or first time |
| `POST` | `/api/login` · `/api/logout` | opens and closes a session |
| `POST` | `/api/demo` | enters the demo, with no password |
| `POST` | `/api/password` | changes **one's own** password |
| `GET` | `/api/users` | the list of accounts — administrator only |
| `POST` | `/api/account/delete` | deletes one's account, or another when administrating |
| `GET`/`POST` | `/api/invites` | pending invitations, and creating one — administrator only |
| `POST` | `/api/invites/revoke` | cancels an invitation |
| `GET`/`POST` | `/api/shared` | the shared shelf, and publishing a preset to it |
| `POST` | `/api/shared/delete` | removes a preset from the shelf |
| `GET`/`PUT` | `/api/presets` | reads and replaces the signed-in account's presets |
| `GET` | `/api/presets/versions` | the available snapshots |
| `POST` | `/api/presets/restore` | goes back to one of them |
| `GET` | `/healthz` | health probe, never gated; publishes the fingerprint of the page being served |

## "I updated and I don't see the changes"

`/healthz` publishes the fingerprint of the page actually being served. One command settles it:

```bash
curl -s https://presetbook.example.com/healthz
```

```json
{"status":"ok","uptime":42,"app":{"sha":"36490f25464e","bytes":128877,"mtime":"…"}}
```

Compare with the source at the same commit:

```bash
sha256sum public/index.html | cut -c1-12          # in the repository, at the intended commit
```

- **identical fingerprints**: the server is serving the new version, the problem is in the browser.
  Force a reload (Ctrl+Shift+R); the page is served `no-cache`, but an intermediary or a tab left
  open can hold the old one;
- **different fingerprints**: the container is running an older image. The `pull` was not done, or
  the published image is not ready yet — the pipeline takes a few minutes after the commit, and it
  publishes nothing if the tests fail.

```bash
docker compose -f docker-compose.traefik.yml pull && docker compose -f docker-compose.traefik.yml up -d
docker compose -f docker-compose.traefik.yml logs --tail 5 presetbook
docker image inspect ghcr.io/fuzzinvaders/presetbook:latest -f '{{index .Config.Labels "org.opencontainers.image.revision"}}'
```

The last command gives the exact commit embedded in the image, stamped by the publishing pipeline.

The `page servie : <fingerprint>` line in the startup log says immediately what the container is
carrying.

## Common startup errors

### `denied` or `unauthorized` when pulling the image

The registry package is still **private**. An image published to `ghcr.io` starts private: it has to
be made public once, on the package's page on GitHub (*Package settings → Change visibility*). Until
that is done, `docker pull` asks for authentication, including from the server.

### `required variable DATA_PATH is missing a value`

The `.env` is missing beside the compose file, or does not carry the variable. That is the intended
refusal, described above: the service does not start on an empty folder without saying so.

### `failed to read dockerfile: no such file or directory`

Only if you build locally. The build context is the **compose file's folder**, never the current
folder: running the command from the repository is not enough if the compose file is elsewhere. To
keep a personal compose file outside the repository, name the context explicitly:

```yaml
    build:
      context: /path/to/presetbook
```

## Publishing a new image

`.github/workflows/docker.yml` builds and publishes on every commit to `main`, and on every `vX.Y.Z`
tag. Two safeguards: **the tests run before publishing**, so a red suite ships no image; and a pull
request builds everything without publishing anything.

To pin a version:

```bash
git tag -a v1.1.0 -m "…" && git push origin v1.1.0
```

The first publication needs one manual action: making the package public, as described above. After
that, nothing more to do.
