# 254Chronicles

254Chronicles is a browser-based party game inspired by Kenyan culture and history. Players take turns explaining words to their team without saying the word itself, racing against a 30-second timer. The entire game (UI, styles, and logic) lives in a single HTML file.

## What This Project Contains

- A complete single-page game UI (landing, gameplay, modals, overlays).
- Embedded styling (custom CSS + Tailwind CSS utilities).
- Embedded game logic (JavaScript inside the HTML).
- Local-only persistence for user sessions and saved scores.

## How To Run

Open `index.html` in any modern browser. No build step is required.

## Libraries and Assets

The page pulls in a few CDN libraries:

- Tailwind CSS for utility-first styling.
- Font Awesome for UI icons.
- Tone.js for sound effects.
- canvas-confetti for the game-over celebration.

The background image is a Kenya flag photo from iStock (credited in the in-app Settings modal).

## Page Structure Overview

The page is a single container centered on a fixed background image. Inside the container, different sections are shown or hidden based on game state.

### Intro Screen

- Title, welcome message, team count input, and round count input.
- Button to generate team name inputs.
- Dynamic team name inputs are injected after clicking "Set Teams".
- "Begin Game" appears once teams are set.

### Gameplay Screen

- Timer and score panel.
- Current team and round summary.
- Word display area.
- "Skip" and "Next" controls for word flow.
- Optional "Review Skipped Words" button if there are skipped words.
- Pause/Resume and Exit controls.

### Modals and Overlays

- Rules modal (game instructions and scoring details).
- Settings modal (sound effects toggle + credits/licensing).
- Profile modal (mock auth + saved scores list).
- Round summary overlay after each team turn.
- Game over overlay with final team rankings and "Play Again".
- Exit confirmation overlay.

## Game Data

- `masterWords` contains the full list of words/phrases used in the game.
- Each round and team receives 5 unique words from a shuffled pool.
- Used words are tracked to avoid repetition within a session.

## Game Flow (High Level)

1. **Set Teams**: User chooses number of teams (2-5), names each team.
2. **Start Game**: Words are shuffled and allocated per team/round.
3. **Round Start**: Timer resets to 30s, score starts at 0, and the first word appears.
4. **Word Actions**:
	- "Next" = correct guess; score increments.
	- "Skip" = word moves to skipped list (no penalty).
5. **Review Mode**: If words were skipped, the player can review them before the round ends.
6. **Round Summary**: Shows correct and skipped counts, plus total score for the team.
7. **Next Team or Next Round**: Continues until all rounds for all teams are complete.
8. **Game Over**: Teams are ranked by score, and confetti triggers.

## Scoring Rules

- 1 point per correct word.
- Skips are allowed without penalty.
- Skipped words can be reviewed for points if time remains.

## Timer and Sound

- Timer is fixed at 30 seconds per team turn.
- A ticking sound plays every second.
- When 5 seconds remain, the pitch changes for urgency.
- End-of-round sound plays when time reaches 0.
- Sound effects can be toggled in Settings.

## Local Storage and "Profile"

The Profile modal uses localStorage as a lightweight mock auth system:

- `254C_users` holds created users.
- `254C_session` holds the active session.
- `254C_scores` stores saved round scores for logged-in users.

This is client-only storage and not secure or production-ready.

## Controls Summary

- **Set Teams**: Generates team name inputs.
- **Begin Game**: Starts the match with the configured teams and rounds.
- **Next**: Marks the word as correct and advances.
- **Skip**: Moves the word to the skipped list.
- **Review Skipped Words**: Enables a final pass on skipped words.
- **Pause/Resume**: Toggles the timer.
- **Exit**: Prompts to confirm exit and reloads the page if confirmed.

## Notes and Limitations

- The game is designed for local play and single browser sessions.
- The "Profile" feature is a local mock; no real authentication exists.
- All configuration is hardcoded in `index.html`.

## File Layout

```
index.html   # All UI, styles, and logic
README.md    # This documentation
LICENSE
```
