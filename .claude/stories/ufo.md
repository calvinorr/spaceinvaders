# Story: Add mystery UFO bonus ship

**GitHub Issue:** #10
**Priority:** P1 (High)
**Status:** completed
**Epic:** #1

## Objective
Add a bonus flying saucer that periodically appears at the top of the screen for extra points.

## Acceptance Criteria
- [x] UFO appears randomly at top of screen
- [x] Moves horizontally across the screen
- [x] Awards bonus points when destroyed (50-300 random)
- [x] Distinct visual design (classic saucer shape)
- [x] Disappears if not hit before leaving screen
- [x] Appears more frequently on higher levels

## Implementation Notes
- UFO spawns every 25 seconds (decreasing by 3s per level, min 10s)
- Random direction (left-to-right or right-to-left)
- Points: 50, 100, 150, 200, or 300 × level multiplier
- Magenta/pink saucer with yellow lights and cyan cockpit
- Shows "+bonus" text on destruction

---
_Managed by Claude Code `/manage` workflow_
