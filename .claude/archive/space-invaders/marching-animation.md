# Story: Add classic marching animation for invaders

**GitHub Issue:** #11
**Priority:** P1 (High)
**Status:** not-started
**Epic:** #1

## Objective
Replace smooth sliding movement with authentic two-frame marching animation where invaders alternate poses as they move in discrete steps.

## Acceptance Criteria
- [ ] Two distinct animation frames for each invader type
- [ ] Invaders move in discrete steps (not smooth sliding)
- [ ] Animation frame alternates with each movement step
- [ ] Movement timing creates the classic 'march' feel
- [ ] Speed still increases as invaders are destroyed

## Technical Notes
- Create two sprite variations for invader drawing
- Use step-based movement instead of continuous
- Sync animation frame change with movement steps

---
_Managed by Claude Code `/manage` workflow_
