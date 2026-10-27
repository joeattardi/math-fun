# Math Fun

A collection of small, silly, encouraging math games for a young child (early elementary, early reader), played on an iPad in Safari as a Home Screen web app. Hosted on GitHub Pages.

Each game targets one specific math skill the child is struggling with. Fun is the delivery mechanism; the learning goal comes first.

## Audience and design principles

- **Player:** a young child who reads at an early level and has a great sense of humor. Assume he can't read instructions reliably: every prompt is spoken aloud *and* shown as short text.
- **Never punish.** No lives, no timers, no game-over, no harsh "wrong" buzzers. A wrong answer triggers a funny reaction and a visual hint, then a retry.
- **Praise often and specifically.** "You checked the tens first, genius!" beats "Good job." Vary praise so it doesn't get stale.
- **Humor is a feature.** Characters say silly things, make goofy faces, and occasionally break the fourth wall. Keep jokes kid-appropriate and kind (never mocking the player).
- **Use correct math vocabulary.** Say what his teacher says: "greater than," "less than," "equal to," and so on. For comparing numbers, never use "bigger," "smaller," or "larger" in prompts, hints, or praise. Each game's spec lists its required terms.
- **On a number line, describe position with "left" and "right"** (numbers to the right are greater, numbers to the left are less), not "farther along" or "how far."
- **Visual scaffolding over explanation.** Show the concept (number line, tens groups, hops) rather than telling.
- **Short sessions.** A round is a few seconds; a "level" is ~10 rounds. Celebrate at the end of each level.
- **Adaptive, not linear.** Track which question types he misses and serve more of those, mixed with easy wins to keep confidence up.

## Look and feel: flashy, fun, exciting

Every game should feel like a celebration. When in doubt, add more juice.

- **Everything moves.** Idle animations on every character (bobbing, blinking, fidgeting), wobbly buttons, a lively animated background (drifting shapes, twinkling stars, parallax). Nothing on screen is ever fully still.
- **Every tap gets a reaction.** Squash-and-stretch, a sound, and a particle puff on every touch, even on menu buttons.
- **Bright, saturated, high-contrast palette** with bold outlines, rounded shapes, and chunky playful type.
- **Big entrances.** Cards and characters bounce, spin, or zoom in rather than just appearing. Scene transitions use swipes, wipes, or bursts.
- **Use Phaser 4 effects freely:** glow on the correct answer, shine sweeps on buttons and stars, bloom on celebrations, screen shake and flashes for big moments.
- **Escalating hype.** Streaks build visibly: a combo meter fills up, the music gets an extra layer, the background gets more colorful, and the characters get more excited.
- **Flashy never blocks learning.** Effects must not cover the numbers or the number line while he's deciding. Save the biggest effects for after an answer.

## Praise and positive reinforcement (core feature, not decoration)

- **Praise every correct answer**, with a sound, an animation, and a spoken line. Bigger streaks get bigger celebrations.
- **Praise effort and strategy, not just results:** "You looked at the tens first!", "You used the number line like a scientist!", "You kept trying and got it!" Specific praise teaches; generic praise wears out.
- **Celebrate recovery as much as success.** Getting it right after a hint earns a full celebration.
- **Celebration tiers:**
  - Correct: sparkle burst, happy character reaction, praise line, chime.
  - Streak of 3: confetti, combo meter flash, character dance.
  - Streak of 5+: full-screen fireworks, screen shake, all characters cheer, a music sting.
  - Level complete: a big party scene with a star rating (always at least one star; stars only go up), a fanfare, a silly character dance-off, and a sticker or trophy for his collection.
- **Collectibles** he can revisit: stickers, trophies, or character costumes unlocked by playing. Earned through effort (rounds played, levels finished), never lost.
- **Personal bests.** Call out improvements: "New record streak!", "You beat your best score!"
- **Huge, varied line banks** (dozens of lines per situation) so praise stays fresh. Never repeat the same line twice in a row.
- **Never negative.** No sad sounds aimed at the player, no red X's, no score that goes down, no losing collectibles.

## Tech stack

- **Vite + TypeScript** (strict mode)
- **Phaser 4** for game scenes, animation, tweens, input, and built-in effects (glow, bloom, shine) for celebrations
  - Phaser 4's API is close to Phaser 3's but not identical (e.g. tint color and tint mode are separate: `setTint(c).setTintMode(...)`). Don't assume Phaser 3 APIs; check the Phaser 4 docs or the `skills/` folder in the Phaser package when unsure, and let the TypeScript build catch mismatches.
- **Art drawn with code** (Phaser Graphics / generated textures, SVG where handy). No image assets unless clearly CC0 and committed with attribution in `CREDITS.md`.
- **Audio:**
  - Music: procedural, catchy, loopable tracks via **Tone.js** (no copyrighted music, no external audio files required).
  - SFX: procedural Web Audio (or Tone.js synths): boings, pops, slide whistles, fanfares, silly "bonk."
  - Voice: **Web Speech API (`speechSynthesis`)** for character lines, paired with on-screen speech bubbles. Duck music volume while a character speaks.
- **PWA:** `vite-plugin-pwa` (manifest + service worker) so it installs to the Home Screen and plays offline.
- **Persistence:** `localStorage` via the shared progress module. No backend, no analytics, no network calls at runtime.

## Repo structure

```
src/
  main.ts              # boots Phaser, registers scenes
  shell/               # app shell: TapToStart, Menu, Settings (mute/music toggles)
  shared/
    audio/             # music player, sfx library, speech helper (queue, ducking)
    characters/        # reusable code-drawn characters + line banks
    ui/                # big touch buttons, speech bubbles, confetti, star bursts
    progress.ts        # per-game, per-skill stats in localStorage (versioned schema)
    praise.ts          # shared praise/encouragement line picker (no immediate repeats)
  games/
    registry.ts        # list of games shown in the menu
    <game-id>/         # one folder per game, self-contained
      index.ts         # exports a GameDefinition (id, title, icon draw fn, scenes)
      ...
public/                # PWA icons, etc.
.github/workflows/deploy.yml
```

### Adding a new game

1. Create `src/games/<game-id>/` with an `index.ts` exporting a `GameDefinition`.
2. Add it to `src/games/registry.ts`. The menu picks it up automatically.
3. Reuse `shared/` for audio, characters, UI, praise, and progress. Don't fork shared code into a game; extend it.
4. Games must not import from other games.

## iPad / Safari constraints (important)

- **Touch first:** large tap targets (see the iPad mini sizes below), generous spacing, no hover-dependent UI, no right-click, no keyboard required.
- **Audio unlock:** iOS blocks audio and speech until a user gesture. The app starts on a big "Tap to Play" screen that starts the Tone.js context and primes `speechSynthesis`.
- **Target device: iPad mini (6th gen and later), landscape.** Its CSS viewport is **1133×744** (aspect ratio about 1.52), on an 8.3" screen.
  - Design the game at a **1133×744 logical resolution** and scale with Phaser's `Scale.FIT` (and `autoCenter`), so it fills the iPad mini exactly. Other iPads letterbox slightly, which is fine.
  - The screen is physically small, so size for small hands on a small display: tap targets at least **72×72 CSS px** for gameplay (64 minimum for chrome), number cards around 250 px, main numbers at least 140 px tall, and body text at least 22 px.
  - Keep the layout uncluttered: no more than two answer targets plus one helper button on screen at once, with the number line always fully visible along the bottom.
  - When running as a Home Screen app, the full 744 px height is available. In Safari's browser view it's shorter, so `Scale.FIT` should handle that without clipping anything important.
- **Landscape layout** is the target; handle portrait gracefully with a "turn me sideways" screen.
- Respect safe-area insets; disable pinch-zoom, double-tap zoom, text selection, and pull-to-refresh in-game.
- Test at **1133×744** first, then sanity-check 1180×820 and 1024×768.
- `speechSynthesis` voices load asynchronously and vary by device; pick a friendly English voice if available and fall back gracefully. Speech must never block gameplay if it fails.

## Privacy

The repo and site are **public**. Never commit the child's name, photos, voice recordings, or any personal details. Progress stays on the device only.

## Deployment

- Repo: `math-fun`. Site: `https://<username>.github.io/math-fun/`
- Vite `base` is `/math-fun/`; all asset paths must respect it.
- Pushing to `main` runs `.github/workflows/deploy.yml` (build, then `actions/deploy-pages`). Pages source must be set to **GitHub Actions** in repo settings.
- Service worker uses `autoUpdate` so new deploys reach the installed iPad app on next launch.

## Commands

```
npm run dev       # dev server, exposed on LAN (--host) for testing on the iPad
npm run build     # typecheck + production build
npm run preview   # serve the production build locally
npm run lint
npm test          # Vitest unit tests (question generation, adaptivity, progress)
```

## Code conventions

- Keep game logic (question generation, answer checking, adaptivity) in plain TS modules with unit tests, separate from Phaser scene code.
- Character line banks live in data files, not inline in scenes, so they're easy to extend.
- No magic numbers for layout; use a shared layout/theme module (colors, font sizes, spacing).
- Big, rounded, high-contrast, playful typography. Numbers must be very legible.

## Definition of done for any change

- `npm run build` and `npm test` pass.
- Works by touch in an iPad-sized viewport, with sound on and off.
- No console errors.
- A wrong answer always leads to a hint and a retry, never a dead end.