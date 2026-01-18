/**
 * Media, broadcasting, and publishing events.
 */
import type { EntityId } from '../../types.js';

export interface MediaEvents {
  // === Journal Events ===
  'journal:written': {
    agentId: EntityId;
    entryCount: number;
    timestamp?: number;
  };

  // === Paper Events ===
  /** Research paper published (general) */
  'paper:published': {
    paperId: string;
    title: string;
    firstAuthor: string;
    coAuthors: string[];
    researchId: string;
    tier: number;
    citationCount: number;
    isBreakthrough: boolean;
  };

  /** Research paper cited */
  'paper:cited': {
    citingPaperId: string;
    citedPaperId: string;
    citedAuthorId: string;
    citedAuthorName: string;
  };

  // === Publishing Infrastructure Events ===
  /** Publishing technology unlocked via research papers */
  'publishing:technology_unlocked': {
    technologyId: string;
    setId: string;
    setName: string;
    grants: Array<{ type: string; id?: string }>;
    papersPublished: number;
  };

  /** Paper recorded in tracking system */
  'publishing:paper_recorded': {
    paperId: string;
    authorId: EntityId;
    field: string;
    totalPublished: number;
  };

  /** Manual request to check all unlock conditions */
  'publishing:check_unlocks': Record<string, never>;

  /** Scribe copying job started */
  'publishing:scribe_started': {
    jobId: string;
    scribeId: EntityId;
    workshopId: EntityId;
    sourceBookId: string;
  };

  /** Scribe copying job completed */
  'publishing:scribe_completed': {
    jobId: string;
    scribeId: EntityId;
    workshopId: EntityId;
    bookCopied: string;
    quality: number;
  };

  /** Binding job started */
  'publishing:binding_started': {
    jobId: string;
    binderId: EntityId;
    workshopId: EntityId;
    manuscriptId: string;
  };

  /** Binding job completed */
  'publishing:binding_completed': {
    jobId: string;
    binderId: EntityId;
    workshopId: EntityId;
    bookId: string;
    quality: number;
  };

  /** Printing job started */
  'publishing:printing_started': {
    jobId: string;
    printerId: EntityId;
    pressId: EntityId;
    manuscriptId: string;
    copies: number;
  };

  /** Printing job completed */
  'publishing:printing_completed': {
    jobId: string;
    printerId: EntityId;
    pressId: EntityId;
    booksProduced: number;
    quality: number;
  };

  /** Biography writing started */
  'publishing:biography_started': {
    jobId: string;
    writerId: EntityId;
    subjectId: EntityId;
    subjectName: string;
  };

  /** Biography writing completed */
  'publishing:biography_completed': {
    jobId: string;
    writerId: EntityId;
    subjectId: EntityId;
    bookId: string;
    quality: number;
    pages: number;
  };

  // === Library Events ===
  /** Book borrowed from library */
  'library:book_borrowed': {
    libraryId: EntityId;
    borrowerId: EntityId;
    bookId: string;
    dueDate: number;
  };

  /** Book returned to library */
  'library:book_returned': {
    libraryId: EntityId;
    borrowerId: EntityId;
    bookId: string;
    daysOverdue?: number;
  };

  /** Agent reading at library */
  'library:reading': {
    libraryId: EntityId;
    readerId: EntityId;
    bookId: string;
    duration: number;
  };

  /** Library access denied */
  'library:access_denied': {
    libraryId: EntityId;
    agentId: EntityId;
    reason: string;
  };

  // === Bookstore Events ===
  /** Book purchased from bookstore */
  'bookstore:purchase': {
    bookstoreId: EntityId;
    buyerId: EntityId;
    bookId: string;
    price: number;
    quantity: number;
  };

  /** Bookstore restocked */
  'bookstore:restocked': {
    bookstoreId: EntityId;
    bookId: string;
    quantityAdded: number;
    newStock: number;
  };

  /** Bookstore out of stock */
  'bookstore:out_of_stock': {
    bookstoreId: EntityId;
    bookId: string;
    customerId?: EntityId;
  };

  /** Bookstore revenue milestone */
  'bookstore:revenue_milestone': {
    bookstoreId: EntityId;
    totalRevenue: number;
    milestone: number;
  };

  // === Television Broadcasting Events ===
  /** Episode started broadcasting */
  'tv:broadcast:started': {
    stationId: string;
    channelNumber: number;
    contentId: string;
    showId: string;
    isLive: boolean;
  };

  /** Episode finished broadcasting */
  'tv:broadcast:ended': {
    stationId: string;
    channelNumber: number;
    contentId: string;
    showId: string;
    peakViewers: number;
    totalViewers: number;
    averageRating: number;
  };

  /** Viewer tuned into a channel */
  'tv:viewer:tuned_in': {
    viewerId: string;
    stationId: string;
    channelNumber: number;
    contentId: string;
  };

  /** Viewer changed channel or stopped watching */
  'tv:viewer:tuned_out': {
    viewerId: string;
    stationId: string;
    channelNumber: number;
    watchDuration: number;
  };

  /** Viewer rated content after watching */
  'tv:viewer:rated': {
    viewerId: string;
    contentId: string;
    showId: string;
    rating: number;
    willWatchNext: boolean;
  };

  /** Show renewed for another season */
  'tv:show:renewed': {
    showId: string;
    stationId: string;
    newSeason: number;
  };

  /** Show cancelled */
  'tv:show:cancelled': {
    showId: string;
    stationId: string;
    finalSeason: number;
    totalEpisodes: number;
  };

  /** Episode completed production */
  'tv:episode:completed': {
    contentId: string;
    showId: string;
    season: number;
    episode: number;
    qualityScore: number;
  };

  /** Catchphrase learned by viewer */
  'tv:catchphrase:learned': {
    viewerId: string;
    showId: string;
    characterName: string;
    catchphrase: string;
  };

  // === Television Development & Writing Events ===
  /** Show pitch submitted to station */
  'tv:pitch:submitted': {
    pitchId: string;
    stationId: string;
    writerId: string;
    title: string;
    format: string;
  };

  /** Show greenlit for production */
  'tv:show:greenlit': {
    pitchId: string;
    showId: string;
    stationId: string;
    title: string;
    format: string;
    budget: number;
  };

  /** Show pitch rejected */
  'tv:show:rejected': {
    pitchId: string;
    stationId: string;
    title: string;
    reason: string;
  };

  /** Script draft completed */
  'tv:script:draft_completed': {
    scriptId: string;
    showId: string;
    writerId: string;
  };

  /** Script revised */
  'tv:script:revised': {
    scriptId: string;
    showId: string;
    revisionNumber: number;
  };

  /** Script ready for filming after table read */
  'tv:script:ready_to_film': {
    scriptId: string;
    showId: string;
    contentId: string;
  };

  /** New storyline started in a show */
  'tv:storyline:started': {
    showId: string;
    storylineId: string;
    title: string;
    characters: string[];
  };

  /** Storyline resolved or ended */
  'tv:storyline:ended': {
    showId: string;
    storylineId: string;
    resolution: 'resolved' | 'cliffhanger';
  };

  // === Television Production Events ===
  /** Scene filming started */
  'tv:production:scene_started': {
    productionId: string;
    showId: string;
    sceneNumber: number;
    director: string;
    actors: string[];
  };

  /** Take completed for a scene */
  'tv:production:take_completed': {
    productionId: string;
    showId: string;
    sceneNumber: number;
    takeNumber: number;
    qualityScore: number;
    isBest: boolean;
  };

  /** Scene wrapped (filming complete) */
  'tv:production:scene_wrapped': {
    productionId: string;
    showId: string;
    sceneNumber: number;
    totalTakes: number;
    averageQuality: number;
  };

  /** Production day wrapped */
  'tv:production:day_wrapped': {
    productionId: string;
    showId: string;
    scenesCompleted: number;
    totalScenes: number;
  };

  /** Live recording started */
  'tv:production:live_started': {
    productionId: string;
    showId: string;
    contentId: string;
  };

  /** Live recording ended */
  'tv:production:live_ended': {
    productionId: string;
    showId: string;
    contentId: string;
    duration: number;
  };

  // === Television Post-Production Events ===
  /** Post-production job started */
  'tv:postproduction:started': {
    jobId: string;
    contentId: string;
    showId: string;
    scenesCount: number;
  };

  /** Post-production phase completed */
  'tv:postproduction:phase_completed': {
    jobId: string;
    contentId: string;
    phase: 'editing' | 'sound' | 'vfx' | 'color' | 'final_review';
    nextPhase: string;
  };

  /** Post-production finalized - episode ready */
  'tv:postproduction:finalized': {
    contentId: string;
    showId: string;
    finalQuality: number;
    runtime: number;
  };

  // === Television Casting Events ===
  /** Casting call opened */
  'tv:casting:call_opened': {
    callId: string;
    showId: string;
    characterName: string;
    roleType: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';
  };

  /** Audition submitted */
  'tv:casting:audition_submitted': {
    auditionId: string;
    callId: string;
    showId: string;
    characterName: string;
  };

  /** Role cast (actor selected) */
  'tv:casting:role_cast': {
    callId: string;
    showId: string;
    characterName: string;
    agentId: string;
    agentName: string;
    roleType: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';
  };

  /** Contract signed */
  'tv:contract:signed': {
    contractId: string;
    agentId: string;
    showId: string;
    characterName: string;
    role: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';
    compensation: number;
  };

  /** Contract renewed */
  'tv:contract:renewed': {
    contractId: string;
    agentId: string;
    newSeason: number;
    newCompensation: number;
  };

  /** Contract terminated */
  'tv:contract:terminated': {
    contractId: string;
    agentId: string;
    showId: string;
    characterName: string;
    reason: string;
  };

  // === Television Schedule Events ===
  /** Production schedule created */
  'tv:schedule:created': {
    scheduleId: string;
    showId: string;
    productionId: string;
    plannedStartTick: number;
    plannedEndTick: number;
  };

  /** Production schedule confirmed */
  'tv:schedule:confirmed': {
    scheduleId: string;
    productionId: string;
  };

  /** Production started per schedule */
  'tv:schedule:started': {
    scheduleId: string;
    productionId: string;
    actualStartTick: number;
  };

  /** Production completed */
  'tv:schedule:completed': {
    scheduleId: string;
    productionId: string;
    actualEndTick: number;
    onSchedule: boolean;
  };

  /** Milestone completed */
  'tv:milestone:completed': {
    productionId: string;
    milestoneType: 'script_lock' | 'table_read' | 'first_day' | 'wrap' | 'rough_cut' | 'final_delivery';
    name: string;
    onTime: boolean;
  };

  // === Radio Events ===
  /** Listener count updated */
  'radio:listener_update': {
    stationId: string;
    listenerCount: number;
    showName?: string;
  };

  /** Radio show ended */
  'radio:show_ended': {
    stationId: string;
    showName: string;
    peakListeners: number;
    totalListeners: number;
  };

  /** Listener tuned into radio station */
  'radio:listener_tuned_in': {
    agentId: string;
    stationId: string;
    listenerCount: number;
  };

  /** Listener tuned out of radio station */
  'radio:listener_tuned_out': {
    agentId: string;
    stationId: string;
    listenDuration: number;
  };

  /** Radio show started */
  'radio:show_started': {
    stationId: string;
    showName: string;
    djName: string;
    format: 'music' | 'talk' | 'news' | 'sports' | 'variety';
  };

  /** DJ said catchphrase */
  'radio:catchphrase_said': {
    stationId: string;
    djName: string;
    catchphrase: string;
    listenerCount: number;
  };

  /** Agent discovered new song on radio */
  'radio:song_discovered': {
    agentId: string;
    trackId: string;
    trackTitle: string;
    artist: string;
    stationId: string;
  };
}

export type MediaEventType = keyof MediaEvents;
export type MediaEventData = MediaEvents[MediaEventType];
