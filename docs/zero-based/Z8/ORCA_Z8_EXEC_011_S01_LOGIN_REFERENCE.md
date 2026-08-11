# ORCA Z8 — EXEC-011 S01 Login Reference

- Package: `EXEC-011 — Item-level visual and accessibility closure`
- Surface: `S01 — /login`
- Status: `OWNER-APPROVED VISUAL REFERENCE`
- Date: `2026-08-11`
- Owner approval: `اعتمد صور Login الأربع كمرجع S01`

## Approved reference states

The owner-approved reference consists of the four screenshots supplied in the EXEC-011 review conversation for the same desktop viewport family:

1. Arabic — Dark.
2. Arabic — Light.
3. English — Dark.
4. English — Light.

These screenshots define the S01 desktop visual baseline. They preserve the existing split composition: login card on the left, ORCA real-estate scene and brand on the right, language/theme controls above, and policy/help footer below.

## Approved implementation scope

Only minor polish is authorized for S01:

- slightly harmonize Arabic heading visual weight/size with English;
- reduce excess vertical whitespace between heading and first form field without destabilizing the error state;
- raise dark-mode field-border and placeholder contrast slightly;
- preserve comfortable checkbox interaction target while retaining the current visual checkbox size;
- preserve current button identity and existing hover/focus/disabled/loading behavior;
- preserve the current footer composition and prevent further text-size reduction;
- preserve RTL/LTR icon/input direction behavior;
- no redesign, no authentication/runtime change, no database/API change, and no other surface modification.

## Closure evidence still required

S01 is not finally closed until post-implementation evidence covers:

- Arabic and English;
- Light and Dark;
- desktop and mobile/responsive;
- keyboard traversal and visible focus;
- hover state;
- validation/error state;
- loading/disabled state;
- no horizontal overflow or clipped controls.
