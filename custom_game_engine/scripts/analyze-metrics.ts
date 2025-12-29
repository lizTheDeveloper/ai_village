/**
 * Analyze metrics from the metrics server to understand agent behavior
 *
 * Usage: npx tsx scripts/analyze-metrics.ts
 */

const HTTP_PORT = 8766;

interface StoredMetric {
  type: string;
  timestamp: number;
  agentId?: string;
  data?: Record<string, unknown>;
}

async function fetchMetrics(): Promise<StoredMetric[]> {
  const response = await fetch(`http://localhost:${HTTP_PORT}/metrics`);
  return response.json();
}

async function analyze() {
  console.log('Fetching metrics from server...\n');

  const metrics = await fetchMetrics();
  console.log(`Total metrics: ${metrics.length}\n`);

  // Count by type
  const byType: Record<string, number> = {};
  for (const m of metrics) {
    byType[m.type] = (byType[m.type] || 0) + 1;
  }

  console.log('Events by type:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  console.log();

  // Analyze behavior changes
  const behaviorChanges = metrics.filter(m => m.type === 'activity:started' || m.type === 'behavior:change');
  console.log(`Behavior changes: ${behaviorChanges.length}`);

  const behaviorCounts: Record<string, number> = {};
  for (const m of behaviorChanges) {
    const behavior = (m.data?.activity || m.data?.to || 'unknown') as string;
    behaviorCounts[behavior] = (behaviorCounts[behavior] || 0) + 1;
  }

  console.log('Behaviors started:');
  for (const [behavior, count] of Object.entries(behaviorCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${behavior}: ${count}`);
  }
  console.log();

  // Analyze deaths
  const deaths = metrics.filter(m => m.type === 'agent:death');
  console.log(`Total deaths: ${deaths.length}`);

  const deathCauses: Record<string, number> = {};
  for (const m of deaths) {
    const cause = (m.data?.causeOfDeath || 'unknown') as string;
    deathCauses[cause] = (deathCauses[cause] || 0) + 1;
  }

  console.log('Death causes:');
  for (const [cause, count] of Object.entries(deathCauses).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cause}: ${count}`);
  }
  console.log();

  // Check for sleep-related events
  const sleepEvents = metrics.filter(m =>
    m.type.includes('sleep') ||
    m.type.includes('woke') ||
    (m.data?.activity && (m.data.activity as string).includes('sleep'))
  );
  console.log(`Sleep-related events: ${sleepEvents.length}`);

  // Look for seek_sleep behavior
  const seekSleepCount = behaviorChanges.filter(m =>
    m.data?.activity === 'seek_sleep' || m.data?.to === 'seek_sleep'
  ).length;
  console.log(`seek_sleep behaviors started: ${seekSleepCount}`);

  const forcedSleepCount = behaviorChanges.filter(m =>
    m.data?.activity === 'forced_sleep' || m.data?.to === 'forced_sleep'
  ).length;
  console.log(`forced_sleep behaviors started: ${forcedSleepCount}`);
  console.log();

  // Building analysis
  const buildEvents = metrics.filter(m =>
    m.type.includes('construction') || m.type.includes('building')
  );
  console.log(`Building-related events: ${buildEvents.length}`);

  const constructionStarted = metrics.filter(m => m.type === 'task:started' && m.data?.taskType === 'construction').length;
  const buildingComplete = metrics.filter(m => m.type === 'building:complete').length;
  console.log(`  Construction started: ${constructionStarted}`);
  console.log(`  Building complete: ${buildingComplete}`);

  // Show building types
  const buildingTypes: Record<string, number> = {};
  for (const m of metrics.filter(m => m.type === 'building:complete')) {
    const type = (m.data?.buildingType || 'unknown') as string;
    buildingTypes[type] = (buildingTypes[type] || 0) + 1;
  }
  console.log('Buildings completed by type:');
  for (const [type, count] of Object.entries(buildingTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }
}

analyze().catch(console.error);
