# Story: Add difficulty settings (Easy/Normal/Hard)

**GitHub Issue:** #14
**Priority:** P2 (Medium)
**Status:** not-started
**Epic:** #1

## Objective
Allow players to choose difficulty level affecting game parameters.

## Acceptance Criteria
- [ ] Three difficulty options: Easy, Normal, Hard
- [ ] Difficulty selection on start screen
- [ ] Easy: slower invaders, slower bullets, 5 lives
- [ ] Normal: current settings, 3 lives
- [ ] Hard: faster invaders, faster bullets, 2 lives
- [ ] Display current difficulty during gameplay
- [ ] Difficulty affects score multiplier

## Technical Notes
- Add difficulty state variable
- Create difficulty presets object
- Modify start screen to show difficulty selection
- Apply difficulty multipliers to speed/lives constants

---
_Managed by Claude Code `/manage` workflow_
