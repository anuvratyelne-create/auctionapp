# Auction Sound Effects

This directory contains sound effects for the auction system.

## Required Sound Files

Add the following MP3 files to this directory:

| File | Description | Recommended Duration |
|------|-------------|---------------------|
| `bid.mp3` | Played when a new bid is placed | 200-300ms |
| `sold.mp3` | Celebratory sound when player is sold | 2-3s |
| `unsold.mp3` | Sound when player goes unsold | 1-2s |
| `tick.mp3` | Countdown tick for last 5 seconds | 100ms |
| `buzzer.mp3` | Buzzer when timer expires | 500ms |
| `whoosh.mp3` | Transition sound when new player enters | 500ms |

## Recommended Sound Sources

You can find free sound effects at:
- https://freesound.org
- https://mixkit.co/free-sound-effects/
- https://pixabay.com/sound-effects/

## Tips

- Keep files small (under 100KB each for quick loading)
- Use MP3 format for best compatibility
- Test sounds at different volumes before use

## Missing Sounds

If sound files are missing, the app will gracefully handle it and continue working without sounds. A warning will be logged to the console.
