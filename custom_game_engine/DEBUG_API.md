# Debug Actions API

**`window.game`** provides programmatic access to game state and dev tools from browser console (F12).

## Core Access

```javascript
game.world                // World instance
game.gameLoop             // GameLoop instance
game.renderer             // Renderer instance
game.devPanel             // DevPanel instance
game.agentInfoPanel       // AgentInfoPanel instance
game.animalInfoPanel      // AnimalInfoPanel instance
game.resourcesPanel       // ResourcesPanel instance
game.buildingRegistry     // BuildingBlueprintRegistry instance
game.placementUI          // BuildingPlacementUI instance
```

## Agent Selection

```javascript
game.setSelectedAgent(agentId);  // Updates DevPanel Skills + AgentInfoPanel
game.setSelectedAgent(null);     // Deselect
const id = game.getSelectedAgent();  // Returns string|null
```

## Skill Management

All skill operations require an agent ID.

```javascript
game.grantSkillXP(agentId, amount);  // Returns boolean, 100 XP = 1 level, random skill
const skills = game.getAgentSkills(agentId);  // { skillName: level } or null
```

**Example:**
```javascript
const agents = game.world.query().with('agent').executeEntities();
game.grantSkillXP(agents[0].id, 500);
console.log(game.getAgentSkills(agents[0].id));  // { farming: 2.5, crafting: 1.2, ... }
game.setSelectedAgent(agents[0].id);
```

## DevPanel Direct Access

```javascript
game.devPanel.spawnX = 100;
game.devPanel.spawnY = 150;
game.devPanel.setSelectedAgentId('some-agent-id');
game.devPanel.getSelectedAgentId();
```

## Building Management (Test API)

```javascript
__gameTest.placeBuilding(blueprintId, x, y);
__gameTest.getBuildings();  // [{ entityId, type, position, building }]
__gameTest.getAllBlueprints();
__gameTest.getBlueprintsByCategory('production');
__gameTest.getUnlockedBlueprints();
__gameTest.getBlueprintDetails('tent');
```

## Query Examples

```javascript
// Find all agents
game.world.query().with('agent').executeEntities();

// Find all agents with skills
game.world.query().with('agent').with('skills').executeEntities();

// Find all buildings
game.world.query().with('building').executeEntities();

// Get entity by ID
game.world.getEntity(id);

// Get component from entity
agent.getComponent('identity');
agent.getComponent('skills');
agent.getComponent('position');
```

## Practical Workflows

### Grant XP to All Agents
```javascript
game.world.query().with('agent').with('skills').executeEntities()
  .forEach(a => game.grantSkillXP(a.id, 100));
```

### Select Best Farmer
```javascript
const agents = game.world.query().with('agent').with('skills').executeEntities();
const best = agents
  .map(a => ({ id: a.id, farming: a.getComponent('skills').levels.farming || 0 }))
  .sort((a, b) => b.farming - a.farming)[0];
game.setSelectedAgent(best.id);
console.log(`Selected best farmer with ${best.farming} farming`);
```

### Spawn Agents at Random Locations
```javascript
for (let i = 0; i < 10; i++) {
  game.devPanel.spawnX = Math.floor(Math.random() * 200);
  game.devPanel.spawnY = Math.floor(Math.random() * 200);
  // Then click "Spawn Wandering Agent" in DevPanel
}
```

### Find Nearby Entities
```javascript
const pos = game.world.getEntity(agentId).getComponent('position');
const nearby = game.world.query().with('position').executeEntities()
  .filter(e => {
    const p = e.getComponent('position');
    const dx = p.x - pos.x, dy = p.y - pos.y;
    return dx*dx + dy*dy < 100;  // Within 10 tiles
  });
```

### Inspect Agent State
```javascript
const agent = game.world.getEntity(agentId);
console.log({
  identity: agent.getComponent('identity'),
  position: agent.getComponent('position'),
  needs: agent.getComponent('needs'),
  behavior: agent.getComponent('behavior'),
  memory: agent.getComponent('memory'),
  skills: agent.getComponent('skills'),
});
```

## Important Notes

1. **Agent IDs required**: All skill ops need `agentId` parameter
2. **Selection sync**: `setSelectedAgent()` syncs both DevPanel and AgentInfoPanel
3. **XP calculation**: 100 XP = 1 skill level
4. **Random skill**: XP is granted to a random skill the agent already has
5. **Error handling**: Methods return `false` or `null` on errors (check console)
6. **Test API**: `__gameTest` methods are experimental and may change
