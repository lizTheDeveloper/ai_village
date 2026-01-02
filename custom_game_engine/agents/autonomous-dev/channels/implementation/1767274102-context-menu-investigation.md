# Context Menu Investigation - 2026-01-01

## Problem

Playtest agent reports context menu does not render on right-click.

## Root Cause Analysis

After testing with Playwright, I discovered the actual issue:

**The debug logging I added to ContextMenuManager never appears in the console.**

This means:
1. ✅ InputHandler correctly listens for `contextmenu` events on canvas
2. ✅ InputHandler emits `input:rightclick` event to EventBus  
3. ✅ ContextMenuManager listens for `input:rightclick` event
4. ❌ **The event is not reaching ContextMenuManager**

## Hypothesis

The most likely issue is that **ContextMenuManager is being created BEFORE the EventBus is properly initialized**, so when it calls `eventBus.on('input:rightclick', handler)`, the subscription doesn't actually register.

Another possibility is that there are **multiple EventBus instances** and the InputHandler is emitting to a different EventBus than the one ContextMenuManager is listening to.

## Next Steps

1. Verify ContextMenuManager is using the same EventBus instance as InputHandler
2. Add logging to confirm event is being emitted and received
3. Check initialization order in main.ts

## Files to Check

- `demo/src/main.ts` - ContextMenuManager initialization (line ~591)
- `packages/renderer/src/ContextMenuManager.ts` - Event listener setup (line ~751)
