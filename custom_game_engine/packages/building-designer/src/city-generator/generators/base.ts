/**
 * Base City Generators
 *
 * Grid-based and organic city generators for standard city types.
 */

import type { CitySpec, GeneratedCity, Plot, Street, Position, DistrictType } from '../types.js';
import { CITY_SIZES, SECTOR_SIZE, STREET_WIDTHS } from '../constants.js';
import {
  SeededRandom,
  createEmptyGrid,
  fillRect,
  strokeRect,
  drawLine,
  gridToString,
  getBuildingDimensions,
  selectBuildingForPlot,
  getDistrictSymbol,
} from '../utils.js';

// =============================================================================
// GRID CITY GENERATOR (Planned Human)
// =============================================================================

/**
 * Generate a grid-based planned city.
 * Orthogonal streets, regular blocks, clear zoning.
 */
export function generateGridCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  // Create empty grid
  const grid = createEmptyGrid(width, height, '.');

  const streets: Street[] = [];
  const plots: Plot[] = [];

  // Grid parameters
  const blockSize = SECTOR_SIZE * 2;  // 32 tiles per block
  const arterialSpacing = blockSize * 2;  // Every 2 blocks
  const localSpacing = blockSize;

  // 1. Generate arterial roads (main grid)
  let streetId = 0;

  // Horizontal arterials
  for (let y = arterialSpacing; y < height - arterialSpacing / 2; y += arterialSpacing) {
    const street: Street = {
      id: `street_h_${streetId++}`,
      points: [{ x: 0, y }, { x: width - 1, y }],
      width: STREET_WIDTHS.arterial,
      type: 'arterial',
    };
    streets.push(street);
    fillRect(grid, 0, y - 1, width, STREET_WIDTHS.arterial, '=');
  }

  // Vertical arterials
  for (let x = arterialSpacing; x < width - arterialSpacing / 2; x += arterialSpacing) {
    const street: Street = {
      id: `street_v_${streetId++}`,
      points: [{ x, y: 0 }, { x, y: height - 1 }],
      width: STREET_WIDTHS.arterial,
      type: 'arterial',
    };
    streets.push(street);
    fillRect(grid, x - 1, 0, STREET_WIDTHS.arterial, height, '|');
  }

  // Intersection markers
  for (let y = arterialSpacing; y < height - arterialSpacing / 2; y += arterialSpacing) {
    for (let x = arterialSpacing; x < width - arterialSpacing / 2; x += arterialSpacing) {
      fillRect(grid, x - 1, y - 1, STREET_WIDTHS.arterial, STREET_WIDTHS.arterial, '+');
    }
  }

  // 2. Generate local streets within blocks
  for (let by = 0; by < height; by += arterialSpacing) {
    for (let bx = 0; bx < width; bx += arterialSpacing) {
      // Add a local street through the middle of each super-block
      const midX = bx + arterialSpacing / 2;
      const midY = by + arterialSpacing / 2;

      if (midX < width && midY < height) {
        // Vertical local street
        if (midX > 0 && midX < width - 1) {
          fillRect(grid, midX, by, STREET_WIDTHS.local, Math.min(arterialSpacing, height - by), '-');
          streets.push({
            id: `local_v_${streetId++}`,
            points: [{ x: midX, y: by }, { x: midX, y: by + arterialSpacing }],
            width: STREET_WIDTHS.local,
            type: 'local',
          });
        }
        // Horizontal local street
        if (midY > 0 && midY < height - 1) {
          fillRect(grid, bx, midY, Math.min(arterialSpacing, width - bx), STREET_WIDTHS.local, '-');
          streets.push({
            id: `local_h_${streetId++}`,
            points: [{ x: bx, y: midY }, { x: bx + arterialSpacing, y: midY }],
            width: STREET_WIDTHS.local,
            type: 'local',
          });
        }
      }
    }
  }

  // 3. Assign districts based on distance from center
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  // District rings
  const districtRings: { maxDist: number; types: DistrictType[] }[] = [
    { maxDist: 0.15, types: ['civic', 'market'] },
    { maxDist: 0.3, types: ['market', 'wealthy', 'research'] },
    { maxDist: 0.5, types: ['residential', 'industrial'] },
    { maxDist: 0.7, types: ['residential', 'storage'] },
    { maxDist: 1.0, types: ['agricultural', 'slums'] },
  ];

  // 4. Create plots within blocks
  let plotId = 0;
  const plotSize = SECTOR_SIZE - 2;  // Leave room for streets

  for (let by = 2; by < height - plotSize; by += localSpacing / 2) {
    for (let bx = 2; bx < width - plotSize; bx += localSpacing / 2) {
      // Skip if on a street
      const cellChar = grid[by]?.[bx];
      if (cellChar === '=' || cellChar === '|' || cellChar === '+' || cellChar === '-') {
        continue;
      }

      // Determine district type by distance from center
      const distFromCenter = Math.sqrt(
        Math.pow(bx + plotSize / 2 - centerX, 2) +
        Math.pow(by + plotSize / 2 - centerY, 2)
      ) / maxDist;

      let districtType: DistrictType = 'residential';
      for (const ring of districtRings) {
        if (distFromCenter <= ring.maxDist) {
          districtType = rng.pick(ring.types);
          break;
        }
      }

      // Create plot
      const plot: Plot = {
        id: `plot_${plotId++}`,
        bounds: { x: bx, y: by, width: plotSize, height: plotSize },
        districtType,
      };

      // Select and assign building
      const building = selectBuildingForPlot(plot, spec.species, rng);
      if (building) {
        plot.building = building;

        // Draw building footprint
        const dims = getBuildingDimensions(building);
        const symbol = getDistrictSymbol(districtType);
        strokeRect(grid, bx, by, dims.width, dims.height, symbol);
      }

      plots.push(plot);
    }
  }

  // 5. Add walls if enabled
  if (spec.wallsEnabled !== false) {
    strokeRect(grid, 0, 0, width, height, '#');

    // Add gates
    const gateCount = spec.gatesCount ?? 4;
    const gatePositions = [
      { x: width / 2, y: 0 },           // North
      { x: width / 2, y: height - 1 },  // South
      { x: 0, y: height / 2 },          // West
      { x: width - 1, y: height / 2 },  // East
    ].slice(0, gateCount);

    for (const gate of gatePositions) {
      grid[Math.floor(gate.y)]![Math.floor(gate.x)]! = 'G';
      // Widen gate
      if (gate.y === 0 || gate.y === height - 1) {
        grid[Math.floor(gate.y)]![Math.floor(gate.x) - 1]! = 'G';
        grid[Math.floor(gate.y)]![Math.floor(gate.x) + 1]! = 'G';
      } else {
        grid[Math.floor(gate.y) - 1]![Math.floor(gate.x)]! = 'G';
        grid[Math.floor(gate.y) + 1]![Math.floor(gate.x)]! = 'G';
      }
    }
  }

  // 6. Mark city center
  fillRect(grid, Math.floor(centerX) - 2, Math.floor(centerY) - 2, 5, 5, 'C');
  grid[Math.floor(centerY)]![Math.floor(centerX)]! = 'T';  // Town hall / temple

  // Compile stats
  const districtCounts: Partial<Record<DistrictType, number>> = {};
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  const streetLength = streets.reduce((sum, s) => {
    const dx = s.points[1]!.x - s.points[0]!.x;
    const dy = s.points[1]!.y - s.points[0]!.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots },
    buildings: plots.filter(p => p.building).map(p => p.building!),
    ascii: gridToString(grid),
    stats: {
      totalBuildings: plots.filter(p => p.building).length,
      totalPlots: plots.length,
      districtCounts: districtCounts as Record<DistrictType, number>,
      streetLength: Math.round(streetLength),
    },
  };
}

// =============================================================================
// ORGANIC CITY GENERATOR (Medieval)
// =============================================================================

/**
 * Generate an organic medieval city.
 * Voronoi-based blocks, radial growth from center.
 */
export function generateOrganicCity(spec: CitySpec, rng: SeededRandom): GeneratedCity {
  const size = CITY_SIZES[spec.size];
  const width = size.tiles;
  const height = size.tiles;

  const grid = createEmptyGrid(width, height, '.');
  const streets: Street[] = [];
  const plots: Plot[] = [];

  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Generate Voronoi seed points
  const seedCount = Math.floor(size.sectors * size.sectors * 0.7);
  const seeds: { x: number; y: number; type: DistrictType }[] = [];

  // Central seed (civic)
  seeds.push({ x: centerX, y: centerY, type: 'civic' });

  // Generate other seeds with some clustering
  for (let i = 1; i < seedCount; i++) {
    // Prefer points closer to center initially, spreading out
    const angle = rng.next() * Math.PI * 2;
    const maxRadius = Math.min(width, height) / 2 - 10;
    const radius = Math.pow(rng.next(), 0.7) * maxRadius;  // Bias toward center

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    // Assign district type based on distance
    const distRatio = radius / maxRadius;
    let type: DistrictType;
    if (distRatio < 0.2) {
      type = rng.pick(['civic', 'market', 'wealthy']);
    } else if (distRatio < 0.4) {
      type = rng.pick(['market', 'residential', 'research']);
    } else if (distRatio < 0.6) {
      type = rng.pick(['residential', 'industrial']);
    } else if (distRatio < 0.8) {
      type = rng.pick(['residential', 'storage', 'slums']);
    } else {
      type = rng.pick(['agricultural', 'slums', 'military']);
    }

    seeds.push({ x: Math.floor(x), y: Math.floor(y), type });
  }

  // 2. Create Voronoi-like regions using simple nearest-seed assignment
  const regionMap: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => -1)
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let nearestSeed = 0;

      for (let i = 0; i < seeds.length; i++) {
        const dist = Math.sqrt(
          Math.pow(x - seeds[i]!.x, 2) + Math.pow(y - seeds[i]!.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestSeed = i;
        }
      }

      regionMap[y]![x]! = nearestSeed;
    }
  }

  // 3. Draw region boundaries as streets
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const current = regionMap[y]![x]!;
      const neighbors = [
        regionMap[y - 1]![x]!,
        regionMap[y + 1]![x]!,
        regionMap[y]![x - 1]!,
        regionMap[y]![x + 1]!,
      ];

      // If any neighbor is different, this is a boundary (street)
      if (neighbors.some(n => n !== current)) {
        grid[y]![x]! = '~';  // Organic street marker
      }
    }
  }

  // 4. Widen main streets (boundaries between different district types)
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (grid[y]![x]! === '~') {
        const current = regionMap[y]![x]!;
        const currentType = seeds[current]?.type;

        // Check if this borders a different district TYPE (not just different region)
        let bordersDifferentType = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighbor = regionMap[y + dy]?.[x + dx];
            if (neighbor !== undefined && neighbor !== current) {
              const neighborType = seeds[neighbor]?.type;
              if (neighborType !== currentType) {
                bordersDifferentType = true;
              }
            }
          }
        }

        if (bordersDifferentType) {
          // Widen to arterial
          grid[y]![x]! = '=';
          if (grid[y - 1]?.[x] === '.') grid[y - 1]![x]! = '=';
          if (grid[y + 1]?.[x] === '.') grid[y + 1]![x]! = '=';
          if (grid[y]?.[x - 1] === '.') grid[y]![x - 1]! = '=';
          if (grid[y]?.[x + 1] === '.') grid[y]![x + 1]! = '=';
        }
      }
    }
  }

  // 5. Create radial roads from center
  const roadCount = rng.nextInt(4, 8);
  for (let i = 0; i < roadCount; i++) {
    const angle = (i / roadCount) * Math.PI * 2 + rng.next() * 0.3;
    const endX = centerX + Math.cos(angle) * (width / 2 - 5);
    const endY = centerY + Math.sin(angle) * (height / 2 - 5);

    drawLine(grid, Math.floor(centerX), Math.floor(centerY),
             Math.floor(endX), Math.floor(endY), '=', 2);
  }

  // 6. Create plots within regions
  let plotId = 0;
  const plotSize = 8;  // Smaller plots for organic city
  const usedCells = new Set<string>();

  for (const seed of seeds) {
    // Find cells belonging to this seed's region
    const regionCells: Position[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (regionMap[y]![x]! === seeds.indexOf(seed)) {
          regionCells.push({ x, y });
        }
      }
    }

    // Place plots within region (not on streets)
    const shuffledCells = rng.shuffle(regionCells);
    let placedInRegion = 0;
    const maxPlotsPerRegion = Math.floor(regionCells.length / (plotSize * plotSize));

    for (const cell of shuffledCells) {
      if (placedInRegion >= maxPlotsPerRegion) break;

      // Check if we can place a plot here
      const key = `${Math.floor(cell.x / plotSize)},${Math.floor(cell.y / plotSize)}`;
      if (usedCells.has(key)) continue;

      // Check if area is clear (not on streets)
      let clear = true;
      for (let dy = 0; dy < plotSize && clear; dy++) {
        for (let dx = 0; dx < plotSize && clear; dx++) {
          const checkY = cell.y + dy;
          const checkX = cell.x + dx;
          if (checkY >= height || checkX >= width ||
              grid[checkY]![checkX]! === '=' || grid[checkY]![checkX]! === '~') {
            clear = false;
          }
        }
      }

      if (clear) {
        usedCells.add(key);

        const plot: Plot = {
          id: `plot_${plotId++}`,
          bounds: { x: cell.x, y: cell.y, width: plotSize, height: plotSize },
          districtType: seed.type,
        };

        // Select building
        const building = selectBuildingForPlot(plot, spec.species, rng);
        if (building) {
          plot.building = building;
          const dims = getBuildingDimensions(building);
          const symbol = getDistrictSymbol(seed.type);
          strokeRect(grid, cell.x, cell.y, Math.min(dims.width, plotSize),
                    Math.min(dims.height, plotSize), symbol);
        }

        plots.push(plot);
        placedInRegion++;
      }
    }
  }

  // 7. Draw city center (market square)
  const squareSize = Math.floor(size.sectors * 1.5);
  fillRect(grid, Math.floor(centerX) - squareSize, Math.floor(centerY) - squareSize,
           squareSize * 2, squareSize * 2, ' ');
  strokeRect(grid, Math.floor(centerX) - squareSize, Math.floor(centerY) - squareSize,
             squareSize * 2, squareSize * 2, 'M');
  grid[Math.floor(centerY)]![Math.floor(centerX)]! = 'T';  // Temple/Town hall

  // 8. Add walls
  if (spec.wallsEnabled !== false) {
    // Organic walls follow a roughly circular pattern
    const wallRadius = Math.min(width, height) / 2 - 3;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const wobble = rng.next() * 4 - 2;
      const wx = Math.floor(centerX + Math.cos(angle) * (wallRadius + wobble));
      const wy = Math.floor(centerY + Math.sin(angle) * (wallRadius + wobble));
      if (wy >= 0 && wy < height && wx >= 0 && wx < width) {
        grid[wy]![wx]! = '#';
      }
    }

    // Add gates where radial roads meet walls
    for (let i = 0; i < roadCount; i++) {
      const angle = (i / roadCount) * Math.PI * 2;
      const gx = Math.floor(centerX + Math.cos(angle) * wallRadius);
      const gy = Math.floor(centerY + Math.sin(angle) * wallRadius);
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
        grid[gy]![gx]! = 'G';
        // Widen gate
        for (let d = -1; d <= 1; d++) {
          const gx2 = Math.floor(centerX + Math.cos(angle + d * 0.05) * wallRadius);
          const gy2 = Math.floor(centerY + Math.sin(angle + d * 0.05) * wallRadius);
          if (gy2 >= 0 && gy2 < height && gx2 >= 0 && gx2 < width) {
            grid[gy2]![gx2]! = 'G';
          }
        }
      }
    }
  }

  // Compile stats
  const districtCounts: Partial<Record<DistrictType, number>> = {};
  for (const plot of plots) {
    districtCounts[plot.districtType] = (districtCounts[plot.districtType] || 0) + 1;
  }

  return {
    spec,
    layout: { width, height, grid, districts: [], streets, plots },
    buildings: plots.filter(p => p.building).map(p => p.building!),
    ascii: gridToString(grid),
    stats: {
      totalBuildings: plots.filter(p => p.building).length,
      totalPlots: plots.length,
      districtCounts: districtCounts as Record<DistrictType, number>,
      streetLength: 0,  // Complex to calculate for organic
    },
  };
}
