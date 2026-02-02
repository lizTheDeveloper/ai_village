/**
 * Plant Environmental Adaptations
 *
 * How alien plants cope with extreme or unusual environmental conditions.
 * Because survival means adapting to whatever the universe throws at you.
 */

export interface EnvironmentalAdaptation {
  name: string;
  environment: string;
  mechanism: string;
  advantages: string[];
  disadvantages: string[];
  flavorText: string;
}

export const ENVIRONMENTAL_ADAPTATIONS: Record<string, EnvironmentalAdaptation> = {
  'desert_succulent': {
    name: 'Desert Succulent',
    environment: 'Arid desert with extreme heat and minimal water',
    mechanism: 'Stores water in thick tissues, waxy coating reduces evaporation',
    advantages: ['Drought tolerance', 'Heat resistance', 'Minimal water needs'],
    disadvantages: ['Slow growth', 'Frost vulnerability', 'Attractive to thirsty animals'],
    flavorText: 'Water hoarder. Stores precious liquid. Waits for rain. Decades pass. Still waiting. Still alive.',
  },
  'arctic_antifreeze': {
    name: 'Arctic Survivor',
    environment: 'Frozen tundra with extreme cold and short growing season',
    mechanism: 'Produces biological antifreeze compounds, low-profile growth',
    advantages: ['Freeze resistance', 'Snow protection', 'Competition-free zone'],
    disadvantages: ['Very slow growth', 'Short active season', 'Limited height'],
    flavorText: 'Blood runs cold. Literally. Ice forms. Plant survives. Frozen but functioning. Barely.',
  },
  'aquatic_submersible': {
    name: 'Deep Aquatic',
    environment: 'Underwater habitats at various depths',
    mechanism: 'Gas bladders for buoyancy, modified leaves for underwater photosynthesis',
    advantages: ['Constant water supply', 'No drought ever', 'Unique niche'],
    disadvantages: ['Light limitations', 'Current vulnerability', 'Limited seed dispersal'],
    flavorText: 'Lives underwater. Breathes dissolved gas. Roots optional. Floats elegantly. Fish approve.',
  },
  'cave_dweller': {
    name: 'Cavern Adapted',
    environment: 'Underground caves with no natural light',
    mechanism: 'Bioluminescence or chemosynthesis, no pigmentation',
    advantages: ['Stable temperature', 'Protected from weather', 'Minimal competition'],
    disadvantages: ['Zero photosynthesis', 'Limited nutrients', 'Pale and weird'],
    flavorText: 'Lives in darkness. Makes own light. Or not. Pale. Ghostly. Thriving anyway.',
  },
  'volcanic_extremophile': {
    name: 'Volcanic Edge Dweller',
    environment: 'Near active volcanoes with extreme heat and toxic gases',
    mechanism: 'Heat-resistant proteins, sulfur metabolism',
    advantages: ['No competition', 'Mineral-rich soil', 'Geothermal energy'],
    disadvantages: ['Constant eruption risk', 'Toxic environment', 'Hard to visit'],
    flavorText: 'Lives near lava. Eats sulfur. Heat is home. Eruptions annoying. Survives anyway.',
  },
  'salt_flat_tolerant': {
    name: 'Halophyte',
    environment: 'Highly saline environments like salt flats or coastal areas',
    mechanism: 'Salt excretion glands, osmotic regulation',
    advantages: ['No freshwater competition', 'Salt marsh domination', 'Unique niche'],
    disadvantages: ['Constant salt management', 'Energy-intensive', 'Salty taste'],
    flavorText: 'Drinks seawater. Excretes salt. Others die. This thrives. Taste of victory is salty.',
  },
  'high_altitude': {
    name: 'Alpine Pioneer',
    environment: 'Mountain peaks with thin air, UV radiation, extreme cold',
    mechanism: 'UV-blocking pigments, compact growth, wind resistance',
    advantages: ['No tall competitors', 'Clean air', 'Dramatic views'],
    disadvantages: ['Thin atmosphere', 'Extreme weather', 'Poor soil'],
    flavorText: 'Grows on peaks. Thin air. Burning sun. Strong wind. Still grows. Stubbornness incarnate.',
  },
  'acid_pool': {
    name: 'Acidophile',
    environment: 'Highly acidic environments like volcanic hot springs',
    mechanism: 'Acid-resistant cell walls, proton pumps',
    advantages: ['Zero competition', 'Concentrated minerals', 'Unique chemistry'],
    disadvantages: ['Corrosive environment', 'Limited spread', 'Dangerous to touch'],
    flavorText: 'Bathes in acid. Thrives. Others dissolve. This grows. Evolution has weird sense of humor.',
  },
  'radioactive_zone': {
    name: 'Radiotolerant',
    environment: 'Areas with high background radiation',
    mechanism: 'Enhanced DNA repair, radiation-absorbing pigments',
    advantages: ['Unique energy source', 'No competition', 'Mutation accelerator'],
    disadvantages: ['Constant DNA damage', 'Glows unnervingly', 'Makes neighbors nervous'],
    flavorText: 'Eats radiation. Repairs constantly. Mutates frequently. Evolves rapidly. Glows. Unsettling.',
  },
  'floating_aerial': {
    name: 'Atmospheric Drifter',
    environment: 'Upper atmosphere, never touches ground',
    mechanism: 'Gas-filled bladders, collects moisture and nutrients from air',
    advantages: ['Unlimited territory', 'No ground competition', 'Spectacular views'],
    disadvantages: ['Wind-dependent', 'Nutrient-poor', 'Where is ground anyway'],
    flavorText: 'Never touches earth. Floats forever. Collects dew. Eats dust. Free. Lost. Happy.',
  },
  'deep_sea_vent': {
    name: 'Hydrothermal Specialist',
    environment: 'Deep ocean near hydrothermal vents',
    mechanism: 'Chemosynthesis, pressure-resistant tissues',
    advantages: ['Constant energy source', 'Warm water', 'No light needed'],
    disadvantages: ['Extreme pressure', 'Toxic chemicals', 'Hard to study'],
    flavorText: 'Miles underwater. Near boiling vents. Crushing pressure. Toxic soup. Home sweet home.',
  },
  'parasitic_host_adapted': {
    name: 'Host Dependent',
    environment: 'Inside or on specific host organisms',
    mechanism: 'Modified roots penetrate host, shares nutrient system',
    advantages: ['Constant nutrients', 'Protected environment', 'Travel with host'],
    disadvantages: ['Host-dependent', 'Limited hosts', 'Reputation damage'],
    flavorText: 'Lives inside others. Takes without asking. Cozy. Warm. Relationship complicated.',
  },
  'epiphyte_canopy': {
    name: 'Canopy Dweller',
    environment: 'Tree branches in rainforest canopy, never touches soil',
    mechanism: 'Aerial roots, collects rainfall and debris',
    advantages: ['Access to light', 'Elevated position', 'No ground competition'],
    disadvantages: ['Dry season stress', 'Limited water', 'Falls sometimes'],
    flavorText: 'Lives on trees. Not parasitic. Just sitting there. Collecting rain. Minimal effort. Maximum height.',
  },
  'sand_dune_stabilizer': {
    name: 'Dune Pioneer',
    environment: 'Shifting sand dunes with constant movement',
    mechanism: 'Extensive root network, rapid vertical growth, sand burial tolerance',
    advantages: ['Stabilizes environment', 'First colonizer', 'Creates ecosystem'],
    disadvantages: ['Constant burial', 'Wind damage', 'Sand in everything'],
    flavorText: 'Sand moves. Plant grows faster. Buried again. Grows more. Race against dunes. Never ends.',
  },
  'seasonal_dormancy': {
    name: 'Seasonal Sleeper',
    environment: 'Regions with extreme seasonal variation',
    mechanism: 'Complete dormancy during unfavorable season, rapid emergence',
    advantages: ['Survives extremes', 'Energy efficient', 'Perfect timing'],
    disadvantages: ['Limited growing season', 'Vulnerable during transition', 'Patience required'],
    flavorText: 'Sleeps for months. Wakes precisely. Grows frantically. Sleeps again. Efficient. Boring.',
  },
  'fire_adapted': {
    name: 'Pyrphyte',
    environment: 'Fire-prone ecosystems like savannas and chaparral',
    mechanism: 'Fire-resistant bark, seeds require fire to germinate',
    advantages: ['Eliminates competition', 'Nutrient release', 'Clear ground'],
    disadvantages: ['Requires periodic fire', 'Smoke exposure', 'Burned appearance'],
    flavorText: 'Needs fire to reproduce. Burns regularly. Comes back stronger. Phoenix of plants.',
  },
  'polluted_industrial': {
    name: 'Industrial Survivor',
    environment: 'Heavily polluted industrial areas with toxic soil',
    mechanism: 'Heavy metal accumulation, pollution tolerance',
    advantages: ['Zero competition', 'Phytoremediation value', 'Urban niches'],
    disadvantages: ['Toxic tissues', 'Slow growth', 'Unappetizing'],
    flavorText: 'Grows in poison. Absorbs toxins. Looks terrible. Still alive. Cleanup crew.',
  },
  'intermittent_submersion': {
    name: 'Tidal Tolerant',
    environment: 'Intertidal zones with regular flooding and exposure',
    mechanism: 'Tolerates both submerged and exposed conditions',
    advantages: ['Dual-mode operation', 'Nutrient-rich zone', 'Regular water'],
    disadvantages: ['Salt stress', 'Wave damage', 'Schedule depends on moon'],
    flavorText: 'Underwater sometimes. Exposed sometimes. Adapts constantly. Moon dictates life. Flexible.',
  },
  'cliff_face': {
    name: 'Vertical Specialist',
    environment: 'Sheer cliff faces with minimal soil',
    mechanism: 'Strong adhesion, derives nutrients from rock, horizontal growth',
    advantages: ['No foot traffic', 'Protected from grazing', 'Unique niche'],
    disadvantages: ['Minimal soil', 'Gravity challenges', 'Difficult seed dispersal'],
    flavorText: 'Grows on cliffs. Sideways. Defies gravity. Minimal resources. Maximum determination.',
  },
  'symbiotic_insect': {
    name: 'Insect Partner',
    environment: 'Wherever symbiotic insects can survive',
    mechanism: 'Houses insects that provide defense, nutrients, or pollination',
    advantages: ['Built-in protection', 'Pollination guaranteed', 'Nutrient supplement'],
    disadvantages: ['Dependent on insects', 'Must provide housing', 'Tenant disputes'],
    flavorText: 'Houses bugs. Bugs protect. Mutual benefit. Tiny apartment building. Rent is pollen.',
  },
};
