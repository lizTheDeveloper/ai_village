/**
 * GameShowSystem - Competition and game show management
 *
 * Handles:
 * - Contestant selection and management
 * - Game mechanics and rules
 * - Prize distribution
 * - Tournament brackets
 * - Live audience voting
 */

import type { World } from '../../ecs/World.js';
import type { EventBus } from '../../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../../ecs/SystemContext.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';

// ============================================================================
// GAME SHOW TYPES
// ============================================================================

export type GameShowFormat =
  | 'trivia'           // Knowledge-based questions
  | 'puzzle'           // Word/logic puzzles
  | 'physical'         // Physical challenges
  | 'talent'           // Talent competition
  | 'dating'           // Dating game format
  | 'survival'         // Elimination survival
  | 'cooking'          // Cooking competition
  | 'deal_making'      // Deal or negotiation games
  | 'wheel'            // Wheel/chance-based
  | 'panel';           // Celebrity panel game

export type EliminationType =
  | 'single'           // One contestant eliminated per round
  | 'half'             // Half eliminated per round
  | 'voted'            // Audience/peer voting
  | 'scored'           // Lowest score eliminated
  | 'none';            // No elimination (point accumulation)

export interface GameShow {
  id: string;
  showId: string;
  name: string;
  format: GameShowFormat;
  eliminationType: EliminationType;

  /** Host(s) */
  hosts: string[];

  /** Prize pool */
  grandPrize: Prize;
  consolationPrizes: Prize[];

  /** Rules and mechanics */
  rules: GameRules;

  /** Episode configuration */
  episodesPerSeason: number;
  contestantsPerEpisode: number;
}

export interface GameRules {
  roundCount: number;
  timePerRound: number; // in game ticks
  pointsPerCorrect: number;
  pointsPerIncorrect: number;
  bonusRoundEnabled: boolean;
  audienceLifelineEnabled: boolean;
  phoneAFriendEnabled: boolean;
}

export interface Prize {
  id: string;
  name: string;
  value: number;
  description: string;
  type: 'cash' | 'item' | 'experience' | 'title';
}

// ============================================================================
// CONTESTANTS
// ============================================================================

export interface Contestant {
  id: string;
  agentId: string;
  agentName: string;
  episodeId: string;

  /** Performance stats */
  score: number;
  roundsPlayed: number;
  correctAnswers: number;
  incorrectAnswers: number;

  /** Status */
  status: 'active' | 'eliminated' | 'winner' | 'runner_up';
  eliminatedInRound?: number;

  /** Lifelines used */
  lifelinesUsed: string[];

  /** Audience favorability 0-100 */
  audienceFavorability: number;
}

export interface ContestantApplication {
  id: string;
  agentId: string;
  agentName: string;
  showId: string;
  submittedTick: number;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted';
  auditionScore?: number;
  personality: string;
  backstory: string;
}

// ============================================================================
// EPISODES AND ROUNDS
// ============================================================================

export interface GameShowEpisode {
  id: string;
  showId: string;
  gameShowId: string;
  episodeNumber: number;
  seasonNumber: number;

  /** Contestants in this episode */
  contestants: Contestant[];

  /** Round progression */
  currentRound: number;
  rounds: GameRound[];

  /** Status */
  status: 'preparing' | 'live' | 'completed';
  startTick?: number;
  endTick?: number;

  /** Winner */
  winnerId?: string;
  prizeAwarded?: Prize;
}

export interface GameRound {
  id: string;
  roundNumber: number;
  name: string;

  /** Questions/challenges for this round */
  challenges: GameChallenge[];
  currentChallengeIndex: number;

  /** Status */
  status: 'pending' | 'active' | 'completed';
  startTick?: number;
  endTick?: number;

  /** Eliminated this round */
  eliminatedContestants: string[];

  /** Points awarded this round */
  pointsAwarded: Map<string, number>;
}

export interface GameChallenge {
  id: string;
  type: 'trivia' | 'puzzle' | 'physical' | 'creative' | 'speed';

  /** Question/challenge content */
  prompt: string;
  correctAnswer?: string;
  options?: string[];
  timeLimit: number; // ticks

  /** Difficulty affects points */
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  pointValue: number;

  /** Results */
  responses: Map<string, ChallengeResponse>;
  revealed: boolean;
}

export interface ChallengeResponse {
  contestantId: string;
  answer: string;
  responseTime: number; // ticks
  isCorrect: boolean;
  pointsAwarded: number;
}

// ============================================================================
// GAME SHOW MANAGER
// ============================================================================

export class GameShowManager {
  private events!: SystemEventManager;

  private gameShows: Map<string, GameShow> = new Map();
  private episodes: Map<string, GameShowEpisode> = new Map();
  private applications: Map<string, ContestantApplication> = new Map();

  /** Question banks by category */
  private questionBanks: Map<string, GameChallenge[]> = new Map();

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'GameShowSystem');
  }

  // ============================================================================
  // GAME SHOW SETUP
  // ============================================================================

  createGameShow(config: {
    showId: string;
    name: string;
    format: GameShowFormat;
    eliminationType: EliminationType;
    hosts: string[];
    grandPrize: Prize;
    rules?: Partial<GameRules>;
    contestantsPerEpisode?: number;
  }): GameShow {
    const defaultRules: GameRules = {
      roundCount: 3,
      timePerRound: 5 * 60 * 20, // 5 minutes at 20 ticks/sec
      pointsPerCorrect: 100,
      pointsPerIncorrect: 0,
      bonusRoundEnabled: true,
      audienceLifelineEnabled: true,
      phoneAFriendEnabled: false,
    };

    const gameShow: GameShow = {
      id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      showId: config.showId,
      name: config.name,
      format: config.format,
      eliminationType: config.eliminationType,
      hosts: config.hosts,
      grandPrize: config.grandPrize,
      consolationPrizes: [],
      rules: { ...defaultRules, ...config.rules },
      episodesPerSeason: 13,
      contestantsPerEpisode: config.contestantsPerEpisode ?? 4,
    };

    this.gameShows.set(gameShow.id, gameShow);

    this.events.emitGeneric('tv:game_show:created', {
      gameShowId: gameShow.id,
      name: config.name,
      format: config.format,
      grandPrize: config.grandPrize.name,
    }, config.showId);

    return gameShow;
  }

  addConsolationPrize(gameShowId: string, prize: Prize): boolean {
    const gameShow = this.gameShows.get(gameShowId);
    if (!gameShow) return false;

    gameShow.consolationPrizes.push(prize);
    return true;
  }

  // ============================================================================
  // CONTESTANT MANAGEMENT
  // ============================================================================

  submitApplication(
    showId: string,
    agentId: string,
    agentName: string,
    personality: string,
    backstory: string,
    currentTick: number
  ): ContestantApplication {
    const application: ContestantApplication = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      agentName,
      showId,
      submittedTick: currentTick,
      status: 'pending',
      personality,
      backstory,
    };

    this.applications.set(application.id, application);

    this.events.emitGeneric('tv:game_show:application_submitted', {
      applicationId: application.id,
      showId,
      agentName,
    }, agentId);

    return application;
  }

  reviewApplication(applicationId: string, accepted: boolean, score?: number): boolean {
    const application = this.applications.get(applicationId);
    if (!application || application.status !== 'pending') return false;

    application.status = accepted ? 'accepted' : 'rejected';
    application.auditionScore = score;

    this.events.emitGeneric('tv:game_show:application_reviewed', {
      applicationId,
      agentId: application.agentId,
      agentName: application.agentName,
      accepted,
      score,
    }, application.showId);

    return true;
  }

  getAcceptedApplications(showId: string): ContestantApplication[] {
    return Array.from(this.applications.values())
      .filter(a => a.showId === showId && a.status === 'accepted');
  }

  // ============================================================================
  // EPISODE MANAGEMENT
  // ============================================================================

  createEpisode(
    gameShowId: string,
    episodeNumber: number,
    seasonNumber: number,
    contestantIds: string[]
  ): GameShowEpisode | null {
    const gameShow = this.gameShows.get(gameShowId);
    if (!gameShow) return null;

    // Create contestants from IDs
    const contestants: Contestant[] = contestantIds.map(agentId => {
      const app = Array.from(this.applications.values())
        .find(a => a.agentId === agentId && a.status === 'accepted');

      return {
        id: `contestant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        agentName: app?.agentName ?? 'Unknown',
        episodeId: '', // Will be set below
        score: 0,
        roundsPlayed: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        status: 'active',
        lifelinesUsed: [],
        audienceFavorability: 50 + Math.random() * 20, // 50-70 starting
      };
    });

    // Generate rounds
    const rounds = this.generateRounds(gameShow);

    const episode: GameShowEpisode = {
      id: `ep_${gameShowId}_s${seasonNumber}e${episodeNumber}`,
      showId: gameShow.showId,
      gameShowId,
      episodeNumber,
      seasonNumber,
      contestants,
      currentRound: 0,
      rounds,
      status: 'preparing',
    };

    // Set episode ID on contestants
    contestants.forEach(c => { c.episodeId = episode.id; });

    this.episodes.set(episode.id, episode);

    this.events.emitGeneric('tv:game_show:episode_created', {
      episodeId: episode.id,
      gameShowId,
      episodeNumber,
      seasonNumber,
      contestantCount: contestants.length,
    }, gameShow.showId);

    return episode;
  }

  private generateRounds(gameShow: GameShow): GameRound[] {
    const rounds: GameRound[] = [];

    for (let i = 0; i < gameShow.rules.roundCount; i++) {
      const isBonus = i === gameShow.rules.roundCount - 1 && gameShow.rules.bonusRoundEnabled;

      rounds.push({
        id: `round_${Date.now()}_${i}`,
        roundNumber: i + 1,
        name: isBonus ? 'Bonus Round' : `Round ${i + 1}`,
        challenges: this.generateChallenges(gameShow.format, isBonus ? 1 : 5),
        currentChallengeIndex: 0,
        status: 'pending',
        eliminatedContestants: [],
        pointsAwarded: new Map(),
      });
    }

    return rounds;
  }

  private generateChallenges(format: GameShowFormat, count: number): GameChallenge[] {
    const challenges: GameChallenge[] = [];

    for (let i = 0; i < count; i++) {
      const difficulty = i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard';
      const pointMultiplier = { easy: 1, medium: 2, hard: 3, expert: 5 };

      challenges.push({
        id: `challenge_${Date.now()}_${i}`,
        type: this.getChallengeType(format),
        prompt: this.generatePrompt(format, difficulty),
        correctAnswer: 'placeholder', // Would be generated properly
        options: format === 'trivia' ? ['A', 'B', 'C', 'D'] : undefined,
        timeLimit: 30 * 20, // 30 seconds at 20 ticks/sec
        difficulty,
        pointValue: 100 * pointMultiplier[difficulty],
        responses: new Map(),
        revealed: false,
      });
    }

    return challenges;
  }

  private getChallengeType(format: GameShowFormat): GameChallenge['type'] {
    switch (format) {
      case 'trivia': return 'trivia';
      case 'puzzle': return 'puzzle';
      case 'physical':
      case 'survival': return 'physical';
      case 'talent':
      case 'cooking': return 'creative';
      default: return 'trivia';
    }
  }

  private generatePrompt(_format: GameShowFormat, difficulty: string): string {
    // Would integrate with LLM for real questions
    const prompts = {
      easy: 'What color is the sky on a clear day?',
      medium: 'Name the largest planet in our solar system.',
      hard: 'What year was the village founded?',
    };
    return prompts[difficulty as keyof typeof prompts] ?? prompts.easy;
  }

  // ============================================================================
  // GAMEPLAY
  // ============================================================================

  startEpisode(episodeId: string, currentTick: number): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'preparing') return false;

    episode.status = 'live';
    episode.startTick = currentTick;
    episode.currentRound = 0;

    // Start first round
    const firstRound = episode.rounds[0];
    if (firstRound) {
      firstRound.status = 'active';
      firstRound.startTick = currentTick;
    }

    const gameShow = this.gameShows.get(episode.gameShowId);

    this.events.emitGeneric('tv:game_show:episode_started', {
      episodeId,
      gameShowName: gameShow?.name,
      contestantCount: episode.contestants.length,
      roundCount: episode.rounds.length,
    }, episode.showId);

    return true;
  }

  submitAnswer(
    episodeId: string,
    contestantId: string,
    answer: string,
    responseTick: number
  ): ChallengeResponse | null {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'live') return null;

    const contestant = episode.contestants.find(c => c.id === contestantId);
    if (!contestant || contestant.status !== 'active') return null;

    const round = episode.rounds[episode.currentRound];
    if (!round || round.status !== 'active') return null;

    const challenge = round.challenges[round.currentChallengeIndex];
    if (!challenge || challenge.revealed) return null;

    // Check if already answered
    if (challenge.responses.has(contestantId)) return null;

    const isCorrect = answer.toLowerCase() === challenge.correctAnswer?.toLowerCase();
    const startTick = round.startTick ?? responseTick;
    const responseTime = responseTick - startTick;

    // Bonus for fast answers
    const speedBonus = Math.max(0, (challenge.timeLimit - responseTime) / challenge.timeLimit * 0.5);
    const points = isCorrect ? Math.round(challenge.pointValue * (1 + speedBonus)) : 0;

    const response: ChallengeResponse = {
      contestantId,
      answer,
      responseTime,
      isCorrect,
      pointsAwarded: points,
    };

    challenge.responses.set(contestantId, response);

    // Update contestant stats
    if (isCorrect) {
      contestant.correctAnswers++;
      contestant.score += points;
    } else {
      contestant.incorrectAnswers++;
    }

    this.events.emitGeneric('tv:game_show:answer_submitted', {
      episodeId,
      contestantId,
      contestantName: contestant.agentName,
      isCorrect,
      points,
      responseTime,
    }, episode.showId);

    return response;
  }

  revealAnswer(episodeId: string): GameChallenge | null {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'live') return null;

    const round = episode.rounds[episode.currentRound];
    if (!round || round.status !== 'active') return null;

    const challenge = round.challenges[round.currentChallengeIndex];
    if (!challenge || challenge.revealed) return null;

    challenge.revealed = true;

    this.events.emitGeneric('tv:game_show:answer_revealed', {
      episodeId,
      challengeId: challenge.id,
      correctAnswer: challenge.correctAnswer,
      respondents: Array.from(challenge.responses.values()).map(r => ({
        contestantId: r.contestantId,
        isCorrect: r.isCorrect,
        points: r.pointsAwarded,
      })),
    }, episode.showId);

    return challenge;
  }

  advanceChallenge(episodeId: string, currentTick: number): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'live') return false;

    const round = episode.rounds[episode.currentRound];
    if (!round || round.status !== 'active') return false;

    round.currentChallengeIndex++;

    if (round.currentChallengeIndex >= round.challenges.length) {
      // End of round
      return this.endRound(episodeId, currentTick);
    }

    return true;
  }

  endRound(episodeId: string, currentTick: number): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'live') return false;

    const round = episode.rounds[episode.currentRound];
    if (!round) return false;

    round.status = 'completed';
    round.endTick = currentTick;

    // Calculate points for this round
    for (const contestant of episode.contestants) {
      if (contestant.status !== 'active') continue;

      let roundPoints = 0;
      for (const challenge of round.challenges) {
        const response = challenge.responses.get(contestant.id);
        if (response) {
          roundPoints += response.pointsAwarded;
        }
      }
      round.pointsAwarded.set(contestant.id, roundPoints);
    }

    // Handle elimination
    const gameShow = this.gameShows.get(episode.gameShowId);
    if (gameShow) {
      this.handleElimination(episode, round, gameShow);
    }

    // Update rounds played for all active contestants
    for (const contestant of episode.contestants) {
      if (contestant.status === 'active') {
        contestant.roundsPlayed++;
      }
    }

    this.events.emitGeneric('tv:game_show:round_ended', {
      episodeId,
      roundNumber: round.roundNumber,
      eliminated: round.eliminatedContestants,
      standings: episode.contestants
        .filter(c => c.status === 'active')
        .sort((a, b) => b.score - a.score)
        .map(c => ({ name: c.agentName, score: c.score })),
    }, episode.showId);

    // Check for next round or end
    episode.currentRound++;
    if (episode.currentRound >= episode.rounds.length) {
      return this.endEpisode(episodeId, currentTick);
    }

    // Start next round
    const nextRound = episode.rounds[episode.currentRound];
    if (nextRound) {
      nextRound.status = 'active';
      nextRound.startTick = currentTick;
    }

    return true;
  }

  private handleElimination(
    episode: GameShowEpisode,
    round: GameRound,
    gameShow: GameShow
  ): void {
    const activeContestants = episode.contestants.filter(c => c.status === 'active');

    if (activeContestants.length <= 1) return; // Can't eliminate last contestant

    switch (gameShow.eliminationType) {
      case 'scored': {
        // Eliminate lowest scorer
        const sorted = [...activeContestants].sort((a, b) => a.score - b.score);
        const toEliminate = sorted[0];
        if (toEliminate) {
          toEliminate.status = 'eliminated';
          toEliminate.eliminatedInRound = round.roundNumber;
          round.eliminatedContestants.push(toEliminate.id);
        }
        break;
      }

      case 'half': {
        // Eliminate bottom half
        const sorted = [...activeContestants].sort((a, b) => a.score - b.score);
        const eliminateCount = Math.floor(sorted.length / 2);
        for (let i = 0; i < eliminateCount; i++) {
          const contestant = sorted[i];
          if (contestant) {
            contestant.status = 'eliminated';
            contestant.eliminatedInRound = round.roundNumber;
            round.eliminatedContestants.push(contestant.id);
          }
        }
        break;
      }

      case 'single': {
        // Eliminate one (lowest scorer this round)
        const roundScores = Array.from(round.pointsAwarded.entries());
        if (roundScores.length > 0) {
          roundScores.sort((a, b) => a[1] - b[1]);
          const lowestId = roundScores[0]![0];
          const contestant = activeContestants.find(c => c.id === lowestId);
          if (contestant) {
            contestant.status = 'eliminated';
            contestant.eliminatedInRound = round.roundNumber;
            round.eliminatedContestants.push(contestant.id);
          }
        }
        break;
      }

      // 'voted' and 'none' don't auto-eliminate
      default:
        break;
    }
  }

  endEpisode(episodeId: string, currentTick: number): boolean {
    const episode = this.episodes.get(episodeId);
    if (!episode) return false;

    episode.status = 'completed';
    episode.endTick = currentTick;

    // Determine winner (highest score among active)
    const activeContestants = episode.contestants.filter(c => c.status === 'active');
    activeContestants.sort((a, b) => b.score - a.score);

    const winner = activeContestants[0];
    const runnerUp = activeContestants[1];

    if (winner) {
      winner.status = 'winner';
      episode.winnerId = winner.id;

      const gameShow = this.gameShows.get(episode.gameShowId);
      if (gameShow) {
        episode.prizeAwarded = gameShow.grandPrize;
      }
    }

    if (runnerUp) {
      runnerUp.status = 'runner_up';
    }

    this.events.emitGeneric('tv:game_show:episode_ended', {
      episodeId,
      winnerId: winner?.id,
      winnerName: winner?.agentName,
      winnerScore: winner?.score,
      prizeAwarded: episode.prizeAwarded?.name,
    }, episode.showId);

    return true;
  }

  // ============================================================================
  // LIFELINES
  // ============================================================================

  useAudienceLifeline(episodeId: string, contestantId: string): Map<string, number> | null {
    const episode = this.episodes.get(episodeId);
    if (!episode || episode.status !== 'live') return null;

    const contestant = episode.contestants.find(c => c.id === contestantId);
    if (!contestant || contestant.lifelinesUsed.includes('audience')) return null;

    const gameShow = this.gameShows.get(episode.gameShowId);
    if (!gameShow?.rules.audienceLifelineEnabled) return null;

    contestant.lifelinesUsed.push('audience');

    // Simulate audience poll
    const round = episode.rounds[episode.currentRound];
    const challenge = round?.challenges[round.currentChallengeIndex];
    if (!challenge?.options) return null;

    const results = new Map<string, number>();
    let remaining = 100;

    // Correct answer gets higher percentage
    for (let i = 0; i < challenge.options.length; i++) {
      const option = challenge.options[i]!;
      const isCorrect = option.toLowerCase() === challenge.correctAnswer?.toLowerCase();

      let percentage: number;
      if (isCorrect) {
        percentage = 40 + Math.random() * 30; // 40-70% for correct
      } else if (i === challenge.options.length - 1) {
        percentage = remaining;
      } else {
        percentage = Math.random() * (remaining / 2);
      }

      percentage = Math.round(percentage);
      results.set(option, percentage);
      remaining -= percentage;
    }

    this.events.emitGeneric('tv:game_show:lifeline_used', {
      episodeId,
      contestantId,
      lifeline: 'audience',
      results: Object.fromEntries(results),
    }, episode.showId);

    return results;
  }

  // ============================================================================
  // QUESTION BANK
  // ============================================================================

  addQuestionToBank(category: string, challenge: GameChallenge): void {
    let bank = this.questionBanks.get(category);
    if (!bank) {
      bank = [];
      this.questionBanks.set(category, bank);
    }
    bank.push(challenge);
  }

  getQuestionsFromBank(category: string, count: number): GameChallenge[] {
    const bank = this.questionBanks.get(category);
    if (!bank || bank.length === 0) return [];

    // Shuffle and take
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getGameShow(gameShowId: string): GameShow | undefined {
    return this.gameShows.get(gameShowId);
  }

  getEpisode(episodeId: string): GameShowEpisode | undefined {
    return this.episodes.get(episodeId);
  }

  getShowEpisodes(showId: string): GameShowEpisode[] {
    return Array.from(this.episodes.values()).filter(e => e.showId === showId);
  }

  getContestantHistory(agentId: string): Contestant[] {
    const history: Contestant[] = [];
    for (const episode of this.episodes.values()) {
      const contestant = episode.contestants.find(c => c.agentId === agentId);
      if (contestant) {
        history.push(contestant);
      }
    }
    return history;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.gameShows.clear();
    this.episodes.clear();
    this.applications.clear();
    this.questionBanks.clear();
    this.events.cleanup();
  }
}

// ============================================================================
// GAME SHOW SYSTEM
// ============================================================================

export class GameShowSystem extends BaseSystem {
  readonly id = 'GameShowSystem';
  readonly priority = 72;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private manager = new GameShowManager();

  protected onInitialize(_world: World, eventBus: EventBus): void {
    this.manager.setEventBus(eventBus);
  }

  getManager(): GameShowManager {
    return this.manager;
  }

  protected onUpdate(_ctx: SystemContext): void {
    // Game show system is primarily event-driven
  }

  protected onCleanup(): void {
    this.manager.cleanup();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let gameShowSystemInstance: GameShowSystem | null = null;

export function getGameShowSystem(): GameShowSystem {
  if (!gameShowSystemInstance) {
    gameShowSystemInstance = new GameShowSystem();
  }
  return gameShowSystemInstance;
}

export function resetGameShowSystem(): void {
  if (gameShowSystemInstance) {
    gameShowSystemInstance.cleanup();
  }
  gameShowSystemInstance = null;
}
