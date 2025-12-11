# Story: Implement defensive shields (bunkers)

**GitHub Issue:** #9
**Priority:** P1 (High)
**Status:** completed
**Epic:** #1

## Objective
Add classic destructible bunkers that protect the player from invader bullets.

## Acceptance Criteria
- [x] 4 bunkers positioned between player and invaders
- [x] Bunkers are destructible (take damage from bullets)
- [x] Both player and invader bullets damage bunkers
- [x] Visual degradation as bunkers take damage
- [x] Bunkers reset on new level

## Implementation Notes
- 4 bunkers with classic arcade shape (rounded top, arch at bottom)
- Pixel-based destruction system using a 2D grid (20x15 pixels per bunker)
- Random damage pattern for natural-looking destruction
- Invaders also destroy bunker pixels on contact
- Green color matching arcade aesthetic

---
_Managed by Claude Code `/manage` workflow_
