# BUG-006: Tab key stops on info icons instead of next input

**Status:** Fixed  
**Found:** 2026-06-08

## Symptom

On forms with info tips (Register, task create/edit, filters, etc.), pressing **Tab** moved focus to the small **i** icon beside each label instead of the next input field. This slowed keyboard-only form filling.

## Cause

`InfoTip` rendered the icon as a focusable `<button type="button">` in the natural document tab order, placed between the label and the following input in the DOM.

## Fix

**`client/src/components/InfoTip.tsx`** — set `tabIndex={-1}` on the info button so it is skipped when tabbing. Tooltip still works on hover and click.

## Verification

- [ ] Register: Tab moves Name → Email → Password → Confirm password (skips all **i** icons)
- [ ] Task modal: Tab moves through fields without stopping on tips
- [ ] Info icon still shows tooltip on hover and toggles on click
