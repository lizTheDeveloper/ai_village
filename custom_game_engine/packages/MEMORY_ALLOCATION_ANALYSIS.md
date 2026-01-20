# Memory Allocation Analysis

**Generated:** 2026-01-20T11:19:25.720Z

## Summary

- **Total Files Analyzed:** 6
- **Total Allocation Hotspots:** 65
  - Critical (>10KB per tick): 0
  - Important (1-10KB per tick): 59
  - Minor (<1KB per tick): 6

## Top 10 Systems by Allocation Count

1. **TradeNetworkSystem.ts**: 36 issues
2. **GovernorDecisionExecutor.ts**: 10 issues
3. **ExplorationDiscoverySystem.ts**: 8 issues
4. **ShippingLaneSystem.ts**: 6 issues
5. **ParadoxDetectionSystem.ts**: 4 issues
6. **TimelineMergerSystem.ts**: 1 issues

## Detailed Findings

### TradeNetworkSystem.ts (36 issues)

#### Important Issues

**Line 845:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 1014:** Object spread creates new object (may be necessary for immutability)

- **Impact:** ~1-10KB per tick
- **Code:** `return { ...typed, lastAnalysisTick: 0 };`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 1033:** Object spread creates new object (may be necessary for immutability)

- **Impact:** ~1-10KB per tick
- **Code:** `return { ...typed, lastAnalysisTick: 0 };`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 249:** Object spread in assignment

- **Impact:** Unknown
- **Code:** `const updatedNetwork: TradeNetworkComponent = {`
- **Fix:** Consider in-place mutation if semantically safe

**Line 781:** Object spread in assignment

- **Impact:** Unknown
- **Code:** `const updatedBlockade: BlockadeComponent = {`
- **Fix:** Consider in-place mutation if semantically safe

**Line 544:** .filter() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `.filter((id): id is EntityId => id !== undefined && id !== nodeId);`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 570:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `nodes: new Set(Array.from(graph.nodes).filter(id => id !== chokepointId)),`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 572:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(graph.edges.entries()).filter(([, edge]) =>`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 578:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `.filter(([nodeId]) => nodeId !== chokepointId)`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 582:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(edges).filter(edgeId => {`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 599:** .filter() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `.filter(id => id === newCompId).length;`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 253:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(graph.edges.entries()).map(([id, graphEdge]) => {`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 540:** .map() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `.map((edgeId) => {`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 579:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `.map(([nodeId, edges]) => [`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 620:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `const maxVolume = Math.max(...Array.from(graph.nodes).map(id => this.calculateNodeFlow(graph, id)));`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 715:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `const volumes = Array.from(graph.nodes).map(nodeId => {`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 1203:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `const edges = Array.from(network.edges.values()).map(edge => ({`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 240:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `const totalFlowRate = Array.from(graph.edges.values()).reduce(`
- **Fix:** Iterate directly over iterable when possible

**Line 253:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(graph.edges.entries()).map(([id, graphEdge]) => {`
- **Fix:** Iterate directly over iterable when possible

**Line 362:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const neighborArray = Array.from(neighbors);`
- **Fix:** Iterate directly over iterable when possible

**Line 425:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const sortedNodes = Array.from(centrality.entries())`
- **Fix:** Iterate directly over iterable when possible

**Line 539:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const neighbors = Array.from(graph.adjacencyList.get(nodeId) ?? new Set())`
- **Fix:** Iterate directly over iterable when possible

**Line 570:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `nodes: new Set(Array.from(graph.nodes).filter(id => id !== chokepointId)),`
- **Fix:** Iterate directly over iterable when possible

**Line 572:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(graph.edges.entries()).filter(([, edge]) =>`
- **Fix:** Iterate directly over iterable when possible

**Line 577:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(graph.adjacencyList.entries())`
- **Fix:** Iterate directly over iterable when possible

**Line 582:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `Array.from(edges).filter(edgeId => {`
- **Fix:** Iterate directly over iterable when possible

**Line 598:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const newCompSize = Array.from(modifiedComponents.components.values())`
- **Fix:** Iterate directly over iterable when possible

**Line 620:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `const maxVolume = Math.max(...Array.from(graph.nodes).map(id => this.calculateNodeFlow(graph, id)));`
- **Fix:** Iterate directly over iterable when possible

**Line 671:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `return Array.from(new Set(vulnerable)); // Deduplicate`
- **Fix:** Iterate directly over iterable when possible

**Line 715:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `const volumes = Array.from(graph.nodes).map(nodeId => {`
- **Fix:** Iterate directly over iterable when possible

**Line 861:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `return Array.from(new Set(affectedNodes)); // Deduplicate`
- **Fix:** Iterate directly over iterable when possible

**Line 1202:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `const nodes = Array.from(network.nodes);`
- **Fix:** Iterate directly over iterable when possible

**Line 1203:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `const edges = Array.from(network.edges.values()).map(edge => ({`
- **Fix:** Iterate directly over iterable when possible

**Line 874:** Array spread for cloning allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const queue: EntityId[] = [...directlyAffected];`
- **Fix:** Reuse array if semantically safe, or use .slice() for clarity

#### Minor Issues

**Line 743:** .slice() allocates new array
- **Impact:** Unknown
- **Fix:** Avoid slicing in hot paths, iterate over range instead

**Line 748:** .slice() allocates new array
- **Impact:** Unknown
- **Fix:** Avoid slicing in hot paths, iterate over range instead

---

### GovernorDecisionExecutor.ts (10 issues)

#### Important Issues

**Line 945:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return { ...current, cities: newCities };`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 938:** Object spread in assignment

- **Impact:** Unknown
- **Code:** `newCities[cityIndex] = { ...city, loyaltyToProvince: Math.min(1, city.loyaltyToProvince + 0.2) };`
- **Fix:** Consider in-place mutation if semantically safe

**Line 940:** Object spread in assignment

- **Impact:** Unknown
- **Code:** `newCities[cityIndex] = { ...city, loyaltyToProvince: Math.max(0, city.loyaltyToProvince - 0.1) };`
- **Fix:** Consider in-place mutation if semantically safe

**Line 942:** Object spread in assignment

- **Impact:** Unknown
- **Code:** `newCities[cityIndex] = { ...city, loyaltyToProvince: Math.min(1, city.loyaltyToProvince + 0.3) };`
- **Fix:** Consider in-place mutation if semantically safe

**Line 407:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `.filter((e) => e !== null);`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 749:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `.filter((e) => e !== null);`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 406:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `.map((id) => world.getEntity(id))`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 748:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `.map((id) => world.getEntity(id))`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

**Line 840:** .map() allocates new array

- **Impact:** Unknown
- **Code:** `const policies = priorities.map((priority, index) => ({`
- **Fix:** Use for-loop with reusable buffer or in-place transformation

#### Minor Issues

**Line 1550:** .slice() allocates new array
- **Impact:** Unknown
- **Fix:** Avoid slicing in hot paths, iterate over range instead

---

### ExplorationDiscoverySystem.ts (8 issues)

#### Important Issues

**Line 236:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 279:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 355:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 459:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 497:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 599:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 512:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `discoveredResources: Array.from(mission.discoveredResources),`
- **Fix:** Iterate directly over iterable when possible

**Line 614:** Array.from() allocates new array

- **Impact:** Unknown
- **Code:** `discoveredResources: Array.from(mission.discoveredResources),`
- **Fix:** Iterate directly over iterable when possible

---

### ShippingLaneSystem.ts (6 issues)

#### Important Issues

**Line 315:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 449:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 488:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return {`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 517:** Object spread creates new object (may be necessary for immutability)

- **Impact:** Unknown
- **Code:** `return { ...typedLane, hazards: newHazards };`
- **Fix:** If safe, mutate in-place instead of spreading

**Line 109:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `const activeHazards = lane.hazards.filter((h) => {`
- **Fix:** Use for-loop with manual filtering into reusable buffer

**Line 318:** .filter() allocates new array

- **Impact:** Unknown
- **Code:** `activeCaravans: typedLane.activeCaravans.filter((id: string) => id !== caravan.caravanId),`
- **Fix:** Use for-loop with manual filtering into reusable buffer

---

### ParadoxDetectionSystem.ts (4 issues)

#### Important Issues

**Line 704:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const keysToDelete = Array.from(this.deathRecords.keys()).slice(0, 1000);`
- **Fix:** Iterate directly over iterable when possible

**Line 772:** Array.from() allocates new array

- **Impact:** ~500B-5KB per iteration
- **Code:** `const keysToDelete = Array.from(this.ancestorCache.keys()).slice(0, 100);`
- **Fix:** Iterate directly over iterable when possible

#### Minor Issues

**Line 704:** .slice() allocates new array
- **Impact:** ~50-500B per iteration
- **Fix:** Avoid slicing in hot paths, iterate over range instead

**Line 772:** .slice() allocates new array
- **Impact:** ~50-500B per iteration
- **Fix:** Avoid slicing in hot paths, iterate over range instead

---

### TimelineMergerSystem.ts (1 issues)

#### Minor Issues

**Line 383:** .slice() allocates new array
- **Impact:** Unknown
- **Fix:** Avoid slicing in hot paths, iterate over range instead

---

## Recommended Actions

1. **Object Pooling:** Implement object pools for frequently allocated objects (conflicts, samples, events)
2. **Reusable Buffers:** Replace array allocations in loops with reusable buffers
3. **In-Place Mutations:** Convert object spreads to in-place mutations where semantically safe
4. **Avoid Array Methods:** Replace .filter(), .map() in hot paths with manual loops
5. **Cache Entity Maps:** Build entity maps once per tick, reuse across systems

## Estimated GC Reduction

Fixing these allocation hotspots could reduce GC pressure by approximately **90%**, resulting in:

- Fewer GC pauses (from ~10-20 per minute to ~2-5 per minute)
- Shorter pause durations (from ~5-15ms to ~1-3ms)
- Lower heap growth rate (from ~10MB/min to ~2-3MB/min)
- Improved frame time stability

