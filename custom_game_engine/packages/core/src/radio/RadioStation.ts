/**
 * RadioStation - Core radio broadcasting infrastructure
 *
 * Radio stations are simpler than TV stations:
 * - Audio-only broadcast
 * - Music programming, talk shows, news
 * - DJ personalities
 * - Commercial breaks
 * - Signal coverage area
 *
 * Radio predates television and has different cultural impact:
 * - More intimate (one voice in your ear)
 * - Better for music discovery
 * - Talk radio creates strong parasocial relationships
 */


// =============================================================================
// TYPES
// =============================================================================

export type RadioFormat =
  | 'top_40'           // Popular music
  | 'rock'             // Rock music
  | 'classical'        // Classical music
  | 'jazz'             // Jazz music
  | 'country'          // Country music
  | 'talk'             // Talk radio
  | 'news'             // News/information
  | 'sports'           // Sports coverage
  | 'oldies'           // Classic hits
  | 'public'           // Public/community radio
  | 'religious';       // Religious programming

export interface RadioStationConfig {
  callSign: string;          // e.g., "WXYZ"
  frequency: number;         // e.g., 98.5 (FM) or 1050 (AM)
  band: 'AM' | 'FM';
  format: RadioFormat;
  signalStrength: number;    // 0-100, affects coverage radius
  buildingId: string;        // Radio station building
}

export interface RadioStationComponent {
  readonly type: 'radio_station';
  config: RadioStationConfig;
  status: 'off_air' | 'broadcasting' | 'emergency';

  // Staff
  ownerId: string;
  managerId?: string;
  djIds: string[];
  engineerIds: string[];

  // Programming
  currentShow: RadioShow | null;
  schedule: RadioScheduleSlot[];
  musicLibrary: MusicTrack[];

  // Metrics
  listenersCount: number;
  peakListeners: number;
  totalBroadcastHours: number;
  revenue: number;

  // Cultural impact
  famousDJs: string[];
  iconicMoments: string[];
}

export interface RadioShow {
  id: string;
  name: string;
  format: 'music' | 'talk' | 'news' | 'sports' | 'variety';
  hostId: string;
  hostName: string;

  // For talk shows
  guestIds?: string[];
  topic?: string;

  // Timing
  startedAt: number;
  duration: number; // in game ticks
  commercialBreaks: number;

  // Metrics
  currentListeners: number;
  peakListeners: number;
}

export interface RadioScheduleSlot {
  dayOfWeek: number; // 0-6
  hour: number;      // 0-23
  showName: string;
  hostId: string;
  format: RadioShow['format'];
  duration: number;  // hours
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number;  // seconds
  releaseYear: number;
  popularity: number;
  playCount: number;
}

export interface RadioDJ {
  agentId: string;
  stationId: string;
  djName: string;  // On-air name
  specialty: RadioFormat;

  // Career metrics
  yearsOnAir: number;
  fameLevel: number;
  voiceRecognition: number; // 0-100, how recognizable their voice is

  // Personality
  catchphrases: string[];
  musicTaste: string[];  // Preferred genres
  talkStyle: 'energetic' | 'calm' | 'controversial' | 'comedic' | 'serious';

  // Fan following
  fansCount: number;
  socialMediaFollowers: number;
}

export interface RadioCommercial {
  id: string;
  sponsorName: string;
  productName: string;
  duration: number;  // seconds
  jingleText?: string;
  voiceActorId?: string;
  cost: number;      // What sponsor pays
  playCount: number;
  effectiveness: number; // 0-100
}

// =============================================================================
// RADIO STATION MANAGER
// =============================================================================

export class RadioStationManager {
  private stations: Map<string, RadioStationComponent> = new Map();
  private djs: Map<string, RadioDJ> = new Map();
  private commercials: Map<string, RadioCommercial> = new Map();

  // ---------------------------------------------------------------------------
  // Station Management
  // ---------------------------------------------------------------------------

  createStation(entityId: string, config: RadioStationConfig): RadioStationComponent {
    const station: RadioStationComponent = {
      type: 'radio_station',
      config,
      status: 'off_air',
      ownerId: '',
      djIds: [],
      engineerIds: [],
      currentShow: null,
      schedule: [],
      musicLibrary: [],
      listenersCount: 0,
      peakListeners: 0,
      totalBroadcastHours: 0,
      revenue: 0,
      famousDJs: [],
      iconicMoments: [],
    };

    this.stations.set(entityId, station);
    return station;
  }

  getStation(entityId: string): RadioStationComponent | undefined {
    return this.stations.get(entityId);
  }

  goOnAir(stationId: string): boolean {
    const station = this.stations.get(stationId);
    if (!station || station.status === 'broadcasting') return false;

    station.status = 'broadcasting';
    return true;
  }

  goOffAir(stationId: string): boolean {
    const station = this.stations.get(stationId);
    if (!station || station.status === 'off_air') return false;

    station.status = 'off_air';
    station.currentShow = null;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Show Management
  // ---------------------------------------------------------------------------

  startShow(
    stationId: string,
    showName: string,
    format: RadioShow['format'],
    hostId: string,
    hostName: string,
    currentTick: number,
    duration: number
  ): RadioShow | null {
    const station = this.stations.get(stationId);
    if (!station || station.status !== 'broadcasting') return null;

    const show: RadioShow = {
      id: `show_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: showName,
      format,
      hostId,
      hostName,
      startedAt: currentTick,
      duration,
      commercialBreaks: 0,
      currentListeners: station.listenersCount,
      peakListeners: station.listenersCount,
    };

    station.currentShow = show;
    return show;
  }

  endShow(stationId: string): RadioShow | null {
    const station = this.stations.get(stationId);
    if (!station || !station.currentShow) return null;

    const endedShow = station.currentShow;
    station.currentShow = null;

    // Update station's peak if this show beat it
    if (endedShow.peakListeners > station.peakListeners) {
      station.peakListeners = endedShow.peakListeners;
    }

    return endedShow;
  }

  updateListeners(stationId: string, count: number): void {
    const station = this.stations.get(stationId);
    if (!station) return;

    station.listenersCount = count;

    if (station.currentShow) {
      station.currentShow.currentListeners = count;
      if (count > station.currentShow.peakListeners) {
        station.currentShow.peakListeners = count;
      }
    }

    if (count > station.peakListeners) {
      station.peakListeners = count;
    }
  }

  // ---------------------------------------------------------------------------
  // DJ Management
  // ---------------------------------------------------------------------------

  registerDJ(
    agentId: string,
    stationId: string,
    djName: string,
    specialty: RadioFormat
  ): RadioDJ {
    const dj: RadioDJ = {
      agentId,
      stationId,
      djName,
      specialty,
      yearsOnAir: 0,
      fameLevel: 0,
      voiceRecognition: 10, // Starts low
      catchphrases: [],
      musicTaste: [],
      talkStyle: 'energetic',
      fansCount: 0,
      socialMediaFollowers: 0,
    };

    this.djs.set(agentId, dj);

    const station = this.stations.get(stationId);
    if (station && !station.djIds.includes(agentId)) {
      station.djIds.push(agentId);
    }

    return dj;
  }

  getDJ(agentId: string): RadioDJ | undefined {
    return this.djs.get(agentId);
  }

  increaseDJFame(agentId: string, amount: number, _reason: string): boolean {
    const dj = this.djs.get(agentId);
    if (!dj) return false;

    dj.fameLevel = Math.min(100, dj.fameLevel + amount);
    dj.voiceRecognition = Math.min(100, dj.voiceRecognition + amount * 0.5);

    // Add to famous DJs list if they become famous enough
    if (dj.fameLevel >= 70) {
      const station = this.stations.get(dj.stationId);
      if (station && !station.famousDJs.includes(agentId)) {
        station.famousDJs.push(agentId);
      }
    }

    return true;
  }

  addDJCatchphrase(agentId: string, catchphrase: string): boolean {
    const dj = this.djs.get(agentId);
    if (!dj) return false;

    if (!dj.catchphrases.includes(catchphrase)) {
      dj.catchphrases.push(catchphrase);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Music Library
  // ---------------------------------------------------------------------------

  addTrackToLibrary(stationId: string, track: MusicTrack): boolean {
    const station = this.stations.get(stationId);
    if (!station) return false;

    station.musicLibrary.push(track);
    return true;
  }

  playTrack(stationId: string, trackId: string): MusicTrack | null {
    const station = this.stations.get(stationId);
    if (!station) return null;

    const track = station.musicLibrary.find((t) => t.id === trackId);
    if (!track) return null;

    track.playCount++;
    return track;
  }

  getTopTracks(stationId: string, limit: number = 10): MusicTrack[] {
    const station = this.stations.get(stationId);
    if (!station) return [];

    return [...station.musicLibrary]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Commercials
  // ---------------------------------------------------------------------------

  createCommercial(
    sponsorName: string,
    productName: string,
    duration: number,
    cost: number,
    jingleText?: string
  ): RadioCommercial {
    const commercial: RadioCommercial = {
      id: `commercial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sponsorName,
      productName,
      duration,
      jingleText,
      cost,
      playCount: 0,
      effectiveness: 50, // Starts at average
    };

    this.commercials.set(commercial.id, commercial);
    return commercial;
  }

  playCommercial(stationId: string, commercialId: string): boolean {
    const station = this.stations.get(stationId);
    const commercial = this.commercials.get(commercialId);
    if (!station || !commercial) return false;

    commercial.playCount++;
    station.revenue += commercial.cost / 10; // Revenue per play

    if (station.currentShow) {
      station.currentShow.commercialBreaks++;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Coverage & Signal
  // ---------------------------------------------------------------------------

  /**
   * Calculate coverage radius based on signal strength and band
   * FM has shorter range but better quality, AM has longer range
   */
  getCoverageRadius(stationId: string): number {
    const station = this.stations.get(stationId);
    if (!station) return 0;

    const baseRadius = station.config.band === 'AM' ? 100 : 50; // AM travels further
    return baseRadius * (station.config.signalStrength / 100);
  }

  /**
   * Check if a position is within a station's coverage area
   */
  isInCoverage(stationId: string, x: number, y: number, stationX: number, stationY: number): boolean {
    const radius = this.getCoverageRadius(stationId);
    const dx = x - stationX;
    const dy = y - stationY;
    return dx * dx + dy * dy <= radius * radius;
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  getStationStats(stationId: string): {
    callSign: string;
    frequency: string;
    format: RadioFormat;
    status: string;
    currentListeners: number;
    peakListeners: number;
    totalHours: number;
    revenue: number;
    djCount: number;
    trackCount: number;
  } | null {
    const station = this.stations.get(stationId);
    if (!station) return null;

    return {
      callSign: station.config.callSign,
      frequency: `${station.config.frequency} ${station.config.band}`,
      format: station.config.format,
      status: station.status,
      currentListeners: station.listenersCount,
      peakListeners: station.peakListeners,
      totalHours: station.totalBroadcastHours,
      revenue: station.revenue,
      djCount: station.djIds.length,
      trackCount: station.musicLibrary.length,
    };
  }

  getAllStations(): RadioStationComponent[] {
    return Array.from(this.stations.values());
  }

  reset(): void {
    this.stations.clear();
    this.djs.clear();
    this.commercials.clear();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let radioManagerInstance: RadioStationManager | null = null;

export function getRadioStationManager(): RadioStationManager {
  if (!radioManagerInstance) {
    radioManagerInstance = new RadioStationManager();
  }
  return radioManagerInstance;
}

export function resetRadioStationManager(): void {
  if (radioManagerInstance) {
    radioManagerInstance.reset();
    radioManagerInstance = null;
  }
}
