# Neural Systems

Brain-Computer Interfaces, Virtual Reality training, and mind upload technology.

## Overview

Neural systems manage cybernetic augmentation through BCIs, accelerated skill training via VR simulations, and consciousness digitization. Two systems handle distinct aspects: NeuralInterfaceSystem for implant management and mind uploading, VRTrainingSystem for simulation-based skill development.

## Systems

### NeuralInterfaceSystem (Priority 165)

Manages neural implants, VR sessions, and uploaded minds.

**Implant Types**: basic_bci (thought-to-text), sensory_augment (enhanced senses), memory_assist (perfect recall), skill_chip (instant downloads), full_dive (complete VR), hive_link (group consciousness), upload_ready (consciousness transfer)

**Upload Mechanics**: Traditional upload is destructive (biological dies). Hybrid mode creates digital backup while preserving biological. Forking creates multiple copies. Existential crisis level increases over subjective runtime.

**Bandwidth & Integration**: Each implant has bandwidth (thoughts/sec), processing power, integration level (0-1, brain merge degree). Integration starts at 0.1, increases over time.

### VRTrainingSystem (Priority 166)

Accelerated skill training through time-dilated simulations.

**Training Categories**: combat, medical, technical, social, artistic, athletic, academic, survival, piloting, psychic

**Difficulty Progression**: tutorial (2x time dilation, 0.2 max skill), novice (5x, 0.4), intermediate (10x, 0.6), advanced (20x, 0.8), master (50x, 0.95), impossible (100x, 1.0)

**Death Mechanics**: Simulations track death count. Higher difficulty = more frequent simulated deaths. Psychological impact accumulates. Death-free runs unlock achievements.

## Components

**neural_interface**: Tracks implants, current VR session, upload status, uploaded mind data, downloaded skills, mental firewall strength, privacy mode

**vr_training**: Records completed programs, total simulated hours, simulated deaths, VR-enhanced skills, achievements, current session, addiction/dissociation levels

## API

```typescript
// Install neural implant
const implant = neuralSystem.installImplant(world, agentEntity, 'skill_chip');

// Start VR session
const session = neuralSystem.startVRSession(world, hostEntity, 'combat_sim', [participant1], {
  timeDilation: 10,
  painEnabled: false
});

// Upload consciousness
const mind = neuralSystem.beginMindUpload(world, agentEntity, 'cloud_substrate');

// Fork uploaded mind
const fork = neuralSystem.forkMind(world, mindId, 'backup_substrate');

// Start training program
const trainingSession = vrSystem.startSession(world, traineeEntity, 'combat_advanced');

// Process simulated death
vrSystem.processSimulatedDeath(sessionId, 'environmental hazard');

// Complete training
const achievements = vrSystem.completeSession(world, sessionId, 0.85);
```

## Throttling

NeuralInterfaceSystem: 50 ticks (2.5 sec). VRTrainingSystem: 20 ticks (1 sec).

## Events

`neural:implant_installed`, `vr:session_started`, `vr:session_ended`, `neural:mind_uploaded`, `neural:mind_forked`, `neural:skill_downloaded`, `neural:existential_thought`, `vr:program_created`, `vr:simulated_death`, `vr:session_completed`
