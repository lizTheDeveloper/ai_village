--[[
  WSAP Bridge - HTTP interface for LLM agent control

  This script runs as a universe server script and provides
  an HTTP API for external agents to observe and control players.

  Endpoints:
    GET  /status   - Check if bridge is running
    POST /observe  - Get current game state
    POST /act      - Execute an action
    POST /reset    - Reset/respawn player

  Note: OpenStarbound's Lua HTTP is client-initiated only,
  so we use a polling mechanism with a command queue.
]]

-- Configuration
local CONFIG = {
  poll_url = "http://localhost:9999/poll",  -- External server to poll for commands
  result_url = "http://localhost:9999/result",  -- Where to send results
  poll_interval = 0.1,  -- Seconds between polls
  enabled = true,
}

-- State
local commandQueue = {}
local lastPollTime = 0

-- ============================================================================
-- Observation Functions
-- ============================================================================

function getPlayerObservation(playerId)
  -- Get player entity
  local player = world.players()[1]  -- For now, first player
  if not player then
    return { error = "No player found" }
  end

  local pos = world.entityPosition(player)
  local health = world.entityHealth(player)

  -- Build observation
  local obs = {
    health = health[1],
    max_health = health[2],
    energy = status.resource("energy") or 100,
    max_energy = status.resourceMax("energy") or 100,
    position = pos,
    world_name = world.type() or "unknown",
    location_description = describeLocation(pos),
    inventory = getInventorySummary(),
    nearby_entities = getNearbyEntities(pos, 20),
    nearby_terrain = getNearbyTerrain(pos),
    effects = getActiveEffects(),
    quests = getActiveQuests(),
    time_of_day = world.timeOfDay() and (world.timeOfDay() < 0.5 and "day" or "night") or "unknown",
  }

  return obs
end

function describeLocation(pos)
  local biome = world.environmentStatusEffects(pos)
  local desc = string.format("At position (%.0f, %.0f)", pos[1], pos[2])

  -- Add biome/environment info
  local dungeonId = world.dungeonId(pos)
  if dungeonId and dungeonId > 0 then
    desc = desc .. " in a dungeon"
  end

  return desc
end

function getInventorySummary()
  local inv = {}

  -- This would need player context to access inventory
  -- Placeholder - real implementation needs player.inventory()

  return inv
end

function getNearbyEntities(pos, radius)
  local entities = {}
  local nearby = world.entityQuery(pos, radius, { includedTypes = {"monster", "npc", "object"} })

  for _, entityId in ipairs(nearby or {}) do
    local epos = world.entityPosition(entityId)
    local etype = world.entityType(entityId)
    local ename = world.entityName(entityId)

    if epos then
      local dx = epos[1] - pos[1]
      local dy = epos[2] - pos[2]
      local dist = math.sqrt(dx*dx + dy*dy)
      local dir = getDirection(dx, dy)

      table.insert(entities, {
        type = etype or "unknown",
        name = ename,
        distance = math.floor(dist),
        direction = dir,
        interactable = world.entityCanDamage(entityId) ~= nil,
        state = getEntityState(entityId),
      })
    end
  end

  return entities
end

function getDirection(dx, dy)
  if math.abs(dx) > math.abs(dy) then
    return dx > 0 and "right" or "left"
  else
    return dy > 0 and "above" or "below"
  end
end

function getEntityState(entityId)
  -- Check entity state (hostile, friendly, etc.)
  local damageTeam = world.entityDamageTeam(entityId)
  if damageTeam then
    if damageTeam.type == "enemy" then
      return "hostile"
    elseif damageTeam.type == "friendly" then
      return "friendly"
    end
  end
  return nil
end

function getNearbyTerrain(pos)
  local terrain = {}

  -- Check tiles in cardinal directions
  local directions = {
    {0, -1, "below"},
    {0, 1, "above"},
    {-1, 0, "left"},
    {1, 0, "right"},
  }

  for _, dir in ipairs(directions) do
    local checkPos = {pos[1] + dir[1], pos[2] + dir[2]}
    local material = world.material(checkPos, "foreground")

    if material then
      table.insert(terrain, {
        type = material,
        direction = dir[3],
        passable = world.pointCollision(checkPos) == false,
      })
    end
  end

  return terrain
end

function getActiveEffects()
  local effects = {}
  -- Would need status context
  -- Placeholder
  return effects
end

function getActiveQuests()
  local quests = {}
  -- Would need player quest context
  -- Placeholder
  return quests
end

-- ============================================================================
-- Action Functions
-- ============================================================================

function executeAction(action, params, playerId)
  local result = {
    success = false,
    message = "Unknown action",
    reward = 0,
    events = {},
    achievements = {},
  }

  -- Action handlers
  local handlers = {
    -- Movement
    move_left = function()
      -- Would send movement input
      result.success = true
      result.message = "Moved left"
    end,

    move_right = function()
      result.success = true
      result.message = "Moved right"
    end,

    jump = function()
      result.success = true
      result.message = "Jumped"
    end,

    -- Interaction
    interact = function()
      -- Find nearest interactable and interact
      local player = world.players()[1]
      if player then
        local pos = world.entityPosition(player)
        local nearby = world.entityQuery(pos, 3, { includedTypes = {"object", "npc"} })
        if nearby and #nearby > 0 then
          -- Would trigger interaction
          result.success = true
          result.message = "Interacted with " .. (world.entityName(nearby[1]) or "object")
        else
          result.success = false
          result.message = "Nothing to interact with"
        end
      end
    end,

    -- Combat
    attack = function()
      result.success = true
      result.message = "Attacked"
    end,

    -- Utility
    wait = function()
      result.success = true
      result.message = "Waited"
    end,

    look = function()
      result.success = true
      result.message = "Looked around"
    end,

    say = function()
      local msg = params and params.message or "..."
      -- Would send chat message
      result.success = true
      result.message = "Said: " .. msg
    end,
  }

  local handler = handlers[action]
  if handler then
    handler()
  else
    result.message = "Action not implemented: " .. tostring(action)
  end

  return result
end

-- ============================================================================
-- Bridge Communication (Polling-based)
-- ============================================================================

-- Since Starbound Lua can't listen for HTTP, we poll an external server
-- The Python adapter runs a small HTTP server that queues commands

function pollForCommands()
  -- Make async HTTP request to poll for commands
  local request = {
    method = "GET",
    url = CONFIG.poll_url,
  }

  promises:add(http.get(CONFIG.poll_url), function(response)
    if response and response.body then
      local ok, command = pcall(sb.parseJson, response.body)
      if ok and command and command.action then
        processCommand(command)
      end
    end
  end)
end

function processCommand(command)
  local result

  if command.type == "observe" then
    result = getPlayerObservation(command.player_id)
  elseif command.type == "act" then
    result = executeAction(command.action, command.parameters, command.player_id)
  elseif command.type == "reset" then
    -- Would trigger respawn
    result = { success = true, message = "Reset" }
  else
    result = { error = "Unknown command type" }
  end

  -- Send result back
  sendResult(command.id, result)
end

function sendResult(commandId, result)
  local body = sb.printJson({
    id = commandId,
    result = result,
  })

  promises:add(http.post(CONFIG.result_url, body, "application/json"), function(response)
    -- Result sent
  end)
end

-- ============================================================================
-- Script Hooks
-- ============================================================================

function init()
  sb.logInfo("[WSAP] Bridge initializing...")

  -- Check if HTTP is available
  if not http then
    sb.logError("[WSAP] HTTP module not available!")
    CONFIG.enabled = false
    return
  end

  sb.logInfo("[WSAP] Bridge ready - polling " .. CONFIG.poll_url)
end

function update(dt)
  if not CONFIG.enabled then return end

  -- Poll for commands periodically
  lastPollTime = lastPollTime + dt
  if lastPollTime >= CONFIG.poll_interval then
    lastPollTime = 0
    pollForCommands()
  end
end

function uninit()
  sb.logInfo("[WSAP] Bridge shutting down")
end
