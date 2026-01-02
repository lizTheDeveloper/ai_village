# Context Menu Critical Bug Fixed - 2026-01-01 06:28 AM

## Problem

Playtest agent reported that context menu did not render on right-click.

## Root Cause

**The EventBus queue was never being flushed.**

The event flow was:
1. ✅ InputHandler detects right-click and calls `onRightClick` callback
2. ✅ Callback emits `input:rightclick` event via `eventBus.emit()`
3. ✅ Event gets QUEUED (emit() queues by default for tick atomicity)
4. ❌ **Queue never gets flushed - events stay queued forever**
5. ❌ ContextMenuManager never receives the event
6. ❌ Menu never opens

The GameLoop doesn't call `flush()`, so any events emitted via `emit()` would be queued forever and never delivered.

## Solution

Changed `eventBus.emit()` to `eventBus.emitImmediate()` for the `input:rightclick` event in `demo/src/main.ts` line 1893.

## Files Modified

- **demo/src/main.ts** - Changed `emit()` to `emitImmediate()` for right-click events
- **packages/renderer/src/ContextMenuManager.ts** - Removed debug console.log statements (per CLAUDE.md)

## Testing

```bash
npm run build  # ✅ PASS
npm test -- ContextMenu  # ✅ 91/91 tests passed
```

**Ready for Playtest Agent verification.**
