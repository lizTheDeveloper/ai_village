# Metrics Analyzers - Sociological Analysis Modules

## Overview

Analyzers transform collected metrics into sociological insights. Each analyzer processes raw event data to compute graph metrics, spatial patterns, inequality indices, and cultural diffusion rates.

**Part of Phase 24: Sociological Metrics**

## Analyzer Types

### NetworkAnalyzer
Social network graph analysis using adjacency lists and Floyd-Warshall shortest paths.

**Capabilities:**
- **Centrality**: Degree, betweenness, closeness, eigenvector (power iteration)
- **Structure**: Density, clustering coefficient, diameter, average path length
- **Communities**: Louvain-style component detection, modularity calculation
- **Influence**: Identify top influential nodes by composite centrality scores

**Key methods:**
```typescript
const analyzer = new NetworkAnalyzer(collector, storage);
analyzer.buildNetwork(); // Construct from relationship/conversation events
const metrics = analyzer.getMetrics(); // Get density, clustering, diameter
const centrality = analyzer.calculateCentrality(); // All centrality scores
const communities = analyzer.detectCommunities(); // Community detection
const top10 = analyzer.getInfluentialNodes(10); // Top influencers
```

**Algorithms:**
- Centrality: Power iteration (100 iterations, convergence at 0.0001)
- Shortest paths: Floyd-Warshall O(n³)
- Community detection: Connected components + subgraph density

---

### SpatialAnalyzer
Spatial pattern analysis for movement, territories, and segregation.

**Capabilities:**
- **Heatmaps**: Grid-based density visualization with normalization
- **Hotspots**: DBSCAN-like clustering (configurable radius/minPoints)
- **Territories**: Bounding box detection per agent from position history
- **Distribution**: Mean center, standard distance, deviational ellipse, nearest neighbor index
- **Segregation**: Dissimilarity index, isolation index, concentration, clustering

**Key methods:**
```typescript
const analyzer = new SpatialAnalyzer(collector, storage);
analyzer.recordPosition(agentId, x, y, timestamp);
const heatmap = analyzer.generateHeatmap(resolution); // Grid-based density
const hotspots = analyzer.detectHotspots(minPoints, radius); // DBSCAN clustering
const territories = analyzer.detectTerritories(); // Agent territories
const distribution = analyzer.calculateSpatialDistribution(); // Statistical metrics
const segregation = analyzer.calculateSegregation('groupAttribute'); // Segregation indices
```

**Algorithms:**
- Heatmap: Grid binning with min-max normalization
- Hotspots: DBSCAN-like (radius threshold, minPoints for core points)
- Segregation: Dissimilarity (spatial evenness), isolation (exposure), concentration (variance from center)
- Nearest neighbor: Clark-Evans ratio (observed vs expected distances)

---

### InequalityAnalyzer
Economic inequality metrics (Gini, Lorenz, stratification).

**Capabilities:**
- **Inequality indices**: Gini coefficient, Theil index, Atkinson index, Palma ratio
- **Distribution**: Lorenz curve (20 points default), wealth snapshots with percentiles
- **Stratification**: Quintile-based strata (Lower, Lower-Middle, Middle, Upper-Middle, Upper)
- **Mobility**: Quartile transition matrix, upward/downward/persistence rates
- **Concentration**: Herfindahl-Hirschman Index, top-N shares, entropy

**Key methods:**
```typescript
const analyzer = new InequalityAnalyzer();
analyzer.recordWealth(agentId, wealth, timestamp);
const gini = analyzer.calculateGini(); // 0-1 coefficient
const lorenz = analyzer.calculateLorenzCurve(20); // Lorenz curve points
const summary = analyzer.getInequalitySummary(); // All inequality metrics
const strata = analyzer.analyzeStratification(); // Quintile strata
const mobility = analyzer.calculateMobilityMatrix(startTime, endTime); // Transition matrix
const concentration = analyzer.calculateConcentration(); // HHI, top shares, entropy
```

**Metrics:**
- **Gini**: (2 * Σ(i * xi)) / (n * Σ(xi)) - (n + 1) / n
- **Theil**: Σ((xi / μ) * ln(xi / μ)) / n (entropy-based)
- **Atkinson**: 1 - (Σ((xi / μ)^(1-ε)) / n)^(1 / (1-ε)) (inequality aversion parameter ε)
- **Palma**: top 10% wealth / bottom 40% wealth

---

### CulturalDiffusionAnalyzer
Behavior and cultural spread tracking (innovation, adoption, cascades).

**Capabilities:**
- **Adoption tracking**: Record behavior adoption with source attribution
- **Innovation detection**: Automatic identification of new behaviors and originators
- **Cascades**: BFS-based diffusion tree construction with depth and timing
- **Adoption curves**: S-curve phase detection (innovators → laggards), time to half-adoption
- **Influencers**: Identify originators and spreaders by reach and cascade size
- **Cultural traits**: Track behavior stability and prevalence over time

**Key methods:**
```typescript
const analyzer = new CulturalDiffusionAnalyzer();
analyzer.recordAdoption(agentId, behavior, prevBehavior, source, timestamp);
const innovations = analyzer.getInnovations(); // All tracked innovations
const cascade = analyzer.calculateCascade(innovationId); // Diffusion tree
const curve = analyzer.calculateAdoptionCurve(innovationId); // S-curve with phase
const influencers = analyzer.identifyInfluencers(10); // Top 10 spreaders
const traits = analyzer.analyzeCulturalTraits(); // Stability and prevalence
const summary = analyzer.getDiffusionSummary(); // Overview metrics
```

**Algorithms:**
- Cascade: BFS from originator through source attribution links
- Adoption phases: <2.5% innovators, <16% early adopters, <50% early majority, <84% late majority, ≥84% laggards
- Influencer ranking: Composite of innovations originated, times influenced, cascade size, reach
- Trait stability: Average duration agents hold trait before switching

---

## Usage

All analyzers provide `exportForVisualization()` for dashboard integration:

```typescript
// Network analysis
const networkViz = networkAnalyzer.exportForVisualization();
// { nodes, edges, metrics }

// Spatial analysis
const spatialViz = spatialAnalyzer.exportForVisualization();
// { heatmap, hotspots, territories, trails, distribution }

// Inequality analysis
const inequalityViz = inequalityAnalyzer.exportForVisualization();
// { distribution, lorenzCurve, summary, stratification, concentration }

// Cultural diffusion analysis
const diffusionViz = diffusionAnalyzer.exportForVisualization();
// { innovations, cascades, adoptionCurves, behaviorDistribution, influencers, culturalTraits, summary }
```

## Memory Management

- **NetworkAnalyzer**: Adjacency list (O(V + E)), shortest paths cached during centrality calculation
- **SpatialAnalyzer**: Position history capped at 1,000 positions per agent (FIFO)
- **InequalityAnalyzer**: Wealth history capped at 100 snapshots per agent (FIFO)
- **CulturalDiffusionAnalyzer**: Adoption events capped at 10,000 total (FIFO)

All analyzers provide `clear()` for manual cleanup.
