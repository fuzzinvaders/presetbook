# Changelog

What each version brings, and why. [Français](CHANGELOG.fr.md).

Versions follow [semantic versioning](https://semver.org/): the first number changes when an update
needs your intervention, the second when things are added, the third when only defects are fixed. No
update has ever required touching your data: it lives in a volume the image knows nothing about.

To stay on a given version rather than following the tip:

```yaml
image: ghcr.io/fuzzinvaders/presetbook:v1.2.1   # instead of :latest
```

And to find out which one is running on your machine, without digging through the container:

```bash
curl -s https://your-domain/healthz
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' presetbook
```

---

## 1.2.1 — 30 August 2026

### Fixed

- **An environment setting could have no effect at all, without a word.** The `ALLOW_REQUESTS`,
  `ALLOW_REGISTER` and `SECURE_COOKIES` switches were compared without trimming the value: a `.env`
  file saved with Windows line endings yields "1\r", and "1\r" is not "1". You added the line, you
  restarted, and nothing moved — with nothing to say why. Values are now trimmed, `on`, `true`,
  `oui` and `yes` are accepted like `1`, and `0`/`false`/`non`/`off` close explicitly.

### Changed

- **Startup says what it understood.** The server log announces the state of the account-request
  form, next to the state of account creation. And a value that is present but not recognised is
  reported plainly — better one line in the log than half an hour hunting a mistake you did not make.

---

## 1.2.0 — 30 August 2026

The version that looks after first contact. The link has been public since it was posted on a forum,
and the visitor's path was a dead end: they tried the demo, took a liking to it, and had nowhere to
ask for more.

### Added

- **An "Ask for an account" button on the sign-in screen.** The visitor leaves a username they would
  like, an address and, if they feel like it, a word about themselves. Next time the administrator
  signs in, a banner tells them and a badge counts the requests on the *Accounts* button. Beside each
  one, *Prepare the invitation* builds the link and reminds them of the address to send it to.

  **The app sends nothing**: it has no dependencies, so no mail client, and sending stays a human
  move. That is also what stops a sending server from being hijacked by whoever finds the form. The
  address is used for nothing else and goes away with the request as soon as it is dismissed.

  Closed by default: `ALLOW_REQUESTS=1` opens it. A private instance has no reason to expose an
  unauthenticated write endpoint — and when it is open, it is held: three requests per IP address per
  day, fifty pending at most, and the same address twice is accepted without adding anything, because
  answering "already requested" would tell a stranger who has written there.
- **A sentence saying what Presetbook is**, on the sign-in screen. The kicker line was enough for
  someone who had just read the post that led here; not for someone handed the link second-hand.

### Changed

- **The demo is described more accurately.** It announced a reset "every time the server restarts",
  keeping quiet about what matters to the visitor: it resets **when they arrive** if nobody has
  touched it for half an hour. So they find a clean screen, not a stranger's experiments. The screen
  also points out that "Backup" hands them what they made as a file, to bring into a real account.

### Fixed

- **The administration sections only appeared after a reload.** The session read at startup is an
  anonymous one; signing in did not read it again, so the app did not know that this account
  administers the instance. The accounts screen therefore opened without the list of accounts,
  without the invitations, without anything — until you reloaded the page.

---

## 1.1.0 — 29 August 2026

The version that opens the app up to more than one person. Until now everyone kept their presets to
themselves; you can now publish one, invite someone, and make mistakes without consequence.

### Added

- **A shelf shared between the accounts on a server.** A card's *Share* button offers the preset to
  the other accounts, *Shared* opens what others have published. What is published is a frozen copy,
  not a link: editing your preset changes nothing for those who copied it. The copy carries your own
  front panels, otherwise the preset would be unreadable on the other side. Past half a dozen
  presets, a search field appears above the shelf.
- **Single-use invitation links.** The administrator makes a link, hands it to whoever they choose,
  and that person picks their own username and password. The token is stripped from the address bar
  as soon as it is read: it would otherwise end up in history and in screenshots.
- **A safety net.** A deleted preset goes to a bin and stays there for thirty days, deletion can be
  undone from the banner in one click, and one state per day is kept so you can go back. A notebook
  where a page can be wiped by accident is no longer a notebook.
- **Comparing two presets**, differences marked, so you can see what separates two neighbouring
  settings.
- **Filtering and grouping by brand.** Brand paints with a broad brush, the model is precise. It does
  not appear when the view holds a single brand: offering a choice of one teaches nobody anything.
- **Some twenty named models in the catalogue**, and not a line of code for any of them — bass amps
  (Ampeg SVT-CL, Markbass Little Mark, TC Electronic BH250, Fender Rumble 500), guitar amps (Fender
  Blues Junior, Vox AC30C2, Marshall DSL40, Boss Katana 50), instruments (Fender Precision and Jazz
  Bass, Music Man StingRay, Ibanez SR) and seven named pedals alongside the generic types.
- **Suggestions while typing a name**, so the same preset is not written twice. From the second
  letter, close presets appear; a name already taken is flagged more firmly. Clicking a suggestion
  opens the existing preset, and the banner brings back what you were typing.
- **The documentation in English**, all three parts, plus an installation guide for a Mac aimed at
  people who never open a terminal.

### Changed

- **Search no longer rebuilds the whole list on every keystroke.** Measured: about 2.4 KB of HTML per
  card, so over a megabyte per keystroke on a library of five hundred presets. A 150 ms delay is
  enough; six rapid keystrokes now produce a single render.
- **The demo resets** when a newcomer starts it after a long idle period, so they do not land on
  somebody else's screen.

### Fixed

- **Creating the first account failed** on a fresh instance, with "This invitation is no longer
  valid" when no invitation was involved at all. The page declared the same variable name twice: the
  invitation token and the browser's install prompt were one and the same. On any public deployment,
  the install event ended up being sent as an invitation.
- **An invitation was consumed before the form was validated**: a password that was too short burned
  a single-use link, leaving the invited person facing a dead link without ever having an account.
- **A dubious token closed a door that was open anyway**: the three other conditions for opening are
  now tested first.
- **A corrupt accounts file took the last good copy with it.** The backup was overwritten by the
  unreadable file; that file is now set aside and the backup left intact.
- **The sign-in error message stayed in French** on an English page, the only one of four such
  displays that did not translate.

---

## 1.0.0 — 28 August 2026

The first public version: the app, the accounts, and what it takes to run it yourself.

### Added

- **The notebook itself.** A single self-contained page that files presets for an instrument, an amp,
  a pedal, a whole pedalboard and Reaper plugin chains. Each preset is shown the way you would read
  it off the gear: in clock hours for a knob detented at noon, on its own scale for a graduated knob,
  with the plugins' real parameter names.
- **Declarative registries rather than per-model code.** A front panel is described — its knobs, its
  modes, which controls leave the circuit — and the interface follows. You create your own gear, down
  to drawing a pedal, without touching the code.
- **The Laney Lionheart L20T-112 guitar combo**, the first proof that the registry is not bass-only:
  two channels sharing the EQ, a global Tone, a drive channel that greys out its own controls when
  switched off. Not a line of code was added for it.
- **A public demo account**, enabled by `DEMO_LOGIN`. Its credentials being public, it is held apart
  on four points — it notably cannot create accounts, which would have handed that right to the whole
  internet.
- **Filtering by gear and by style, and printing.** The sheet holds exactly what is on screen,
  filters included, with a header line saying what it contains.
- **An app usable on a phone and installable**, which opens with no network.
- **Password changes** by each person, plus a rescue tool from the machine for a forgotten one — no
  one can change someone else's over the web.
- **An administrator**, who is the first account created on the instance. An ordinary user can only
  change their password and delete their own account.
- **gzip compression**: the page is 198 KB, and 58 KB on the wire.
- **Importing and exporting Reaper `.RfxChain` chains**, with two fidelity rules — an unchanged value
  is written back with its original float, and export refuses by naming the offending plugin rather
  than inventing anything.

### Fixed

- **The page had no `viewport` tag.** A phone rendered it in a 980 px virtual window and then shrank
  the lot — readable with a magnifying glass. Measured afterwards at 390 px: 118 px of horizontal
  overflow, caused by the tab row not wrapping.
- **Search ignored accents in one direction only.** "pedalier" found nothing where "pédalier" found
  two presets — on a phone, where nobody types accents, it looked broken half the time.
- **The administrator role went to the wrong account.** It was assigned by creation date, and an
  account without that date sorted ahead of every other.
- **The demo switched itself on**: the `.env` template shipped `DEMO_LOGIN` active, so copying it
  opened a public account on your private server without you meaning to.
