# Running Presetbook on your Mac

No Docker, no Homebrew, no command-line experience needed. About five minutes.

You will end up with Presetbook running on your own machine, with your presets stored in a folder you
can see and copy. Nothing is installed into the system, and nothing runs in the background.

---

## 1. Install Node

Presetbook needs Node — one free program that lets your Mac run the app.

1. Go to **<https://nodejs.org>**
2. Download the button that says **LTS** (the recommended version)
3. Open the downloaded `.pkg` file and click through the installer

That is the only thing you install.

## 2. Download Presetbook

1. Go to **<https://github.com/fuzzinvaders/presetbook>**
2. Click the green **Code** button, then **Download ZIP**
3. Double-click the downloaded file to unzip it

You now have a folder called `presetbook-main`. Move it wherever you like — your Documents folder is
fine. **This folder is the app**, and your presets will live inside it.

## 3. Start it

1. Open **Terminal** — press `Cmd` + `Space`, type `terminal`, press Return
2. Type `cd` followed by a space (don't press Return yet)
3. **Drag the `presetbook-main` folder from the Finder onto the Terminal window.** It fills in the
   path for you
4. Press Return
5. Type `npm start` and press Return

You should see something like:

```
[presetbook] ouvre http://localhost:8080
[presetbook] comptes : 0 — le premier créé sera le tien
```

## 4. Open it

Go to **<http://localhost:8080>** in your browser.

The first time, it asks you to create an account — **the first account created is yours**, and it is
the administrator of your copy. There is no email, nothing to confirm; it stays on your machine.

Switch the interface to English with the **EN** button in the top-right corner.

---

## Day to day

**To stop it:** click on the Terminal window and press `Ctrl` + `C`.

**To start it again later:** open Terminal and repeat step 3 (the `cd` + drag trick, then
`npm start`). Leave the Terminal window open while you use the app — closing it stops the server.

**Make it a real app.** While it is running, your browser can turn it into a proper Mac application
with its own icon and window:

- **Chrome or Edge** — an **Install** button appears in the app's header
- **Safari 17 or later** — menu **File → Add to Dock**

It then opens like any other app, and keeps working even when you are offline.

**Where your presets are.** In a folder called `data`, inside `presetbook-main`. Copy that folder and
you have copied everything. The app also has a **Backup** button that exports the lot as a single
file — worth doing before you update.

**To update.** Download the ZIP again, unzip it, and **copy your `data` folder into the new one**
before starting it. Your presets are in `data`; the rest is just the app.

---

## If something goes wrong

**`command not found: npm`** — Node did not install, or Terminal was open before you installed it.
Close Terminal, open it again, and retry.

**`EADDRINUSE` or "address already in use"** — Presetbook is already running in another Terminal
window, or something else uses port 8080. Try `PORT=8081 npm start` and open
<http://localhost:8081>.

**The page does not load** — check the Terminal window is still open and shows no error. The address
is `http://localhost:8080`, not the `0.0.0.0` you may see elsewhere.

**You forgot your password** — there is no email recovery, but nothing is lost. In Terminal, in the
same folder:

```
node tools/motdepasse.js YOUR-USERNAME
```

It prints a new password. Change it afterwards from the app, under **Accounts**.

---

## One thing to know

By default the server accepts connections from other machines on your network — handy if you want to
open it from your phone while your Mac is on, but not what everyone wants on a laptop in a café.

For a strictly private copy, start it with:

```
HOST=127.0.0.1 npm start
```

---

Presetbook is free software under AGPL-3.0, and free of charge. If you would rather not run anything
yourself, ask on the forum — there is a public instance with a demo account.
