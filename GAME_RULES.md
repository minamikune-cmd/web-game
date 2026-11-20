# American 8-Ball — MVP Ruleset

## Purpose and scope
This document defines the exact casual rules for the first single-player release. Implement these rules consistently in the rules engine, UI explanations, AI legality checks, and tests. This is a deliberately simplified house ruleset, not a claim of full WPA/BCA tournament compliance.

## Table and groups
- There are 15 object balls: solids 1–7, eight ball 8, stripes 9–15, plus one cue ball.
- At the start of a rack, the table is open and neither player owns a group.
- Groups are assigned only after a player legally pockets a called-by-outcome (no pocket call required) solid or stripe while the table is open. The player receives the pocketed group; the opponent receives the other group.
- The eight ball is never a group-assignment ball.
- Once assigned, groups do not change.

## Break
- The human player breaks first in the MVP.
- A break is considered valid if at least one object ball is pocketed or at least four object balls contact a cushion.
- If the break is invalid, re-rack and allow the same player to break again. This avoids introducing a separate tournament foul procedure in MVP.
- Pocketed balls on a valid break remain pocketed, but the table remains open. If a group ball is pocketed on the break, groups are not assigned by that break.
- If the cue ball is pocketed on the break, re-rack and let the same player break again in this simplified MVP rule.

## Legal shot
For a non-break shot:
1. The cue ball must first contact a ball in the active player's group while that group still has balls remaining.
2. If all of the active player's group balls are pocketed, the first object ball contacted must be the eight ball.
3. After first contact, at least one object ball must be pocketed OR any ball (including the cue ball only if a separate foul has not already occurred) must contact a cushion. For implementation, a cue-ball cushion contact alone does not satisfy this requirement.
4. Pocketing an opponent's ball on an otherwise legal shot is allowed; it does not award a foul and does not change groups.
5. A shot that pockets no ball and satisfies legal-contact/rail requirements passes the turn.

## Fouls
The following are fouls:
- Cue ball is pocketed (scratch).
- No object ball is contacted.
- First object ball contacted is not a legal target under the active player's group state.
- No object ball is pocketed and no object ball contacts a cushion after first contact.
- A ball is driven off the table.

On a foul:
- The opponent takes the next turn with ball-in-hand anywhere on the playing surface.
- Any legally pocketed object balls remain pocketed, except the eight ball outcome is adjudicated separately.
- The active player's turn ends.

## Turn continuation
- On a legal shot, if the shooter pockets one or more balls from their own group, they continue.
- If the table is open and a legal shot pockets a solid or stripe, assign groups and the shooter continues.
- If only opponent balls are pocketed, the turn passes.
- If no ball is pocketed, the turn passes.
- On a foul, the turn passes and the opponent receives ball-in-hand.

## Eight-ball result
- A player may legally target the eight ball only after all balls in their assigned group are pocketed.
- Pocketing the eight ball before clearing the player's group is an immediate loss.
- Pocketing the eight ball on a foul is a loss.
- Pocketing the eight ball after clearing the group on a legal shot wins the rack.
- No called pocket is required; any pocket is valid.
- If the eight ball is not pocketed, ordinary foul and turn rules apply.

## Ball-in-hand and placement
- Ball-in-hand is available anywhere on the playable surface, except overlapping another ball or placing inside a pocket capture region.
- The shot cannot begin until the cue ball is placed in a valid position and confirmed.
- The first implementation may use pointer drag to place the cue ball; keyboard precision controls are optional.

## Deterministic adjudication
- Rule evaluation occurs after all balls have settled, using a complete shot event record (first contact, object-ball cushion contacts after first contact, pocketed ball IDs, cue-ball scratch, off-table events).
- Physics must report events; it must not decide fouls, group assignment, turn ownership, or match result.
- Define and test event ordering for simultaneous contacts. If the physics layer cannot determine a unique first contact within its numerical tolerance, use a documented deterministic tie-break based on stable ball IDs.

## Required rule tests
Cover valid/invalid break, open-table group assignment, legal own-group first contact, wrong first contact, no-contact foul, no-object-rail foul, scratch, off-table foul, opponent ball pocketed, continued turn, turn switch, ball-in-hand placement, early eight loss, eight-on-foul loss, and legal eight win.
