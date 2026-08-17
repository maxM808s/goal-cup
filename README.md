# Goal Cup — TikTok Live knockout tournament

Two teams, one ball, a timer. Each side has its own gifts; sending one shoves the ball toward the other team's net. Ball crosses the line, that's a goal. Highest score when the clock runs out wins and climbs the bracket, until somebody lifts the trophy.

No server, no terminal, nothing running on your PC. The overlay is a web page on GitHub Pages, and Stream to Earn posts gifts straight into Firebase.

---

## How the pieces fit

```
TikTok gift  ->  Stream to Earn  ->  Firebase Realtime Database  ->  your overlay page
                  (HTTP POST)          (free tier)                   (GitHub Pages)
```

Stream to Earn can send an HTTP request but nothing on your PC can receive one. Firebase is the mailbox in the middle: Stream to Earn drops gift events in, the overlay reads them out.

---

## Part 1 — Firebase (about five minutes, once)

1. Go to **console.firebase.google.com** and sign in with a Google account.
2. **Create a project.** Name it anything. Turn Google Analytics **off** — you don't need it.
3. In the left menu: **Build → Realtime Database → Create Database**.
   - Pick any location.
   - Choose **Start in test mode**, then Enable. We tighten this in step 5.
4. Copy the database URL shown at the top. It looks like
   `https://your-project-default-rtdb.firebaseio.com` or `...europe-west1.firebasedatabase.app`.
5. Open the **Rules** tab and replace everything with this, putting your own room name in place of `my-secret-room-8h3kd9`:

```json
{
  "rules": {
    "my-secret-room-8h3kd9": {
      ".read": true,
      ".write": true
    }
  }
}
```

   Publish it. Everything outside that room is now locked, and the room name is the only thing standing between your game and a stranger.  Make it long and random — treat it like a password, and don't show it on stream.

6. Back in **Project settings** (the gear, top left) → scroll to **Your apps** → click the **web** icon `</>` → register the app with any nickname. You'll get a config block. You only need two lines from it: `apiKey` and `databaseURL`.

7. Open **firebase-config.js** and fill in all three values — the database URL, the API key, and the same room name you used in the rules.

---

## Part 2 — GitHub Pages

1. Create a new repository on github.com. Public, no README.
2. Upload every file from this folder: `index.html`, `control.html`, `common.js`, `firebase-config.js`, `teams.js`, `gifts.json`, plus the `logos` and `gifts` folders. Drag and drop on the web works fine.
3. **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save.**
4. Wait a minute, then your links are:

   - Overlay: `https://YOURNAME.github.io/REPO/`
   - Control panel: `https://YOURNAME.github.io/REPO/control.html`

Updating later is one file upload. The overlay picks it up on the next refresh — no restart, nothing to stop.

**Keep the repository private if you'd rather not have your room name public.** Pages needs a paid plan for private repos, so the alternative is simply a long random room name. Anyone who has it can push fake gifts, but not read anything else in your Firebase project.

---

## Part 3 — Stream to Earn

One event per gift. Eight gifts total, and they never change no matter who is playing — the gift decides the *side*, not the team.

For each gift:

- **Method:** POST
- **URL:** `https://YOUR-DATABASE-URL/YOUR-ROOM/events.json`
- **POST Body:** `{"gift": "Rose", "user": "{nickname}"}`
- **Untick Gift multiplier and Repetition multiplier.** Leave them on and one 25× combo fires 25 requests and multiplies again.

The control panel prints the exact URL and a ready-made body line for each of your eight gifts. Copy them from there.

---

## Part 4 — Run a tournament

Open the control panel.

1. **Teams.** Search and click to add. Any number from 2 to 16 — it doesn't have to be a power of two, and odd counts get byes into round two. Tick **עברית** for Hebrew names.
2. **Build the bracket.**
3. **Gifts.** Four for the blue (left) side, four for orange (right). Put a cheap gift in each so there's constant movement, and one expensive one for the dramatic swings.
4. **Rules.** Match length, coins per goal, break between matches.
5. **Start / next match.**

Add the overlay to OBS or TikTok Live Studio as a **Browser source, 1080 × 1920**.

### Coins per goal

This is the dial that matters. It's how many coins push the ball from the centre into the net — but both sides push at once, so what actually decides a goal is the *difference* between the two sides.

Start at 150. If goals never come, drop it. If the ball pinballs from end to end, raise it. A good match has three to six goals.

---

## Things worth knowing

**Open exactly one overlay.** The overlay is the engine — it reads gifts, moves the ball, keeps the clock. Two copies open means every gift counts twice.

**The control panel is safe to open anywhere**, including your phone, and as many times as you like. It only sends commands.

**Reopening the overlay mid-match is fine.** It picks the match back up from Firebase.

**Free tier is plenty.** A busy stream might write a few thousand tiny events an hour; Firebase's free allowance is far above that.

**Club crests and gift artwork** live in `logos/` and `gifts/`. Crests are named after the team — `maccabi-haifa.png` — and gift images after the gift — `soccer-ball.png`, `finger-heart.png`. Add a file, refresh, done.
