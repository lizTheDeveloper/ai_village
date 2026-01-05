/**
 * MayorNegotiator - LLM-driven trade agreement negotiation
 *
 * Enables mayor/diplomat agents to negotiate trade agreements using LLM reasoning.
 * Analyzes proposals and generates counter-offers based on:
 * - Civilization's current needs and resources
 * - Historical trade relationship
 * - Strategic priorities
 * - Trust level with trading partner
 */

import type { LLMProvider } from '../types/LLMTypes.js';
import type {
  TradeAgreement,
  TradeTerm,
  CivilizationIdentity,
  CounterOffer,
} from './TradeAgreementTypes.js';
import type { TradeAgreementComponent } from '../components/TradeAgreementComponent.js';
import type { EntityId } from '../types.js';

/**
 * Negotiation decision from LLM
 */
export interface NegotiationDecision {
  /** Decision: accept, reject, or counter */
  decision: 'accept' | 'reject' | 'counter';

  /** Reasoning for the decision */
  reasoning: string;

  /** If countering, the modified terms */
  modifiedTerms?: TradeTerm[];

  /** Strategic concerns about the proposal */
  concerns?: string[];

  /** Opportunities identified in the proposal */
  opportunities?: string[];
}

/**
 * Mayor negotiator for trade agreements
 */
export class MayorNegotiator {
  constructor(private readonly llmProvider: LLMProvider) {}

  /**
   * Evaluate a trade proposal and decide whether to accept, reject, or counter
   */
  public async evaluateProposal(
    proposal: TradeAgreement,
    ourCivilization: CivilizationIdentity,
    ourTradeComp: TradeAgreementComponent,
    _mayorAgentId: EntityId,
    civilizationContext: CivilizationContext
  ): Promise<NegotiationDecision> {
    const prompt = this.buildEvaluationPrompt(
      proposal,
      ourCivilization,
      ourTradeComp,
      civilizationContext
    );

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
        stopSequences: ['</decision>'],
      });

      return this.parseNegotiationDecision(response.text, proposal);
    } catch (error) {
      // If LLM fails, fall back to rule-based decision
      return this.ruleBasedEvaluateProposal(proposal, ourTradeComp, civilizationContext);
    }
  }

  /**
   * Generate a counter-offer for a trade proposal
   */
  public async generateCounterOffer(
    proposal: TradeAgreement,
    ourCivilization: CivilizationIdentity,
    ourTradeComp: TradeAgreementComponent,
    civilizationContext: CivilizationContext,
    concerns: string[]
  ): Promise<CounterOffer> {
    const prompt = this.buildCounterOfferPrompt(
      proposal,
      ourCivilization,
      ourTradeComp,
      civilizationContext,
      concerns
    );

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8,
        maxTokens: 1500,
        stopSequences: ['</counter_offer>'],
      });

      const decision = this.parseCounterOffer(response.text, proposal);

      return {
        proposerId: ourCivilization.id,
        version: (proposal.crossRealmMetadata?.successfulTrades ?? 0) + 1,
        proposedAt: BigInt(Date.now()),
        modifiedTerms: decision.modifiedTerms ?? proposal.terms,
        reasoning: decision.reasoning,
      };
    } catch (error) {
      // Fall back to rule-based counter-offer
      return this.ruleBasedCounterOffer(proposal, ourCivilization, civilizationContext);
    }
  }

  // ===========================================================================
  // Prompt Building
  // ===========================================================================

  /**
   * Build the LLM prompt for evaluating a trade proposal
   */
  private buildEvaluationPrompt(
    proposal: TradeAgreement,
    ourCiv: CivilizationIdentity,
    ourTradeComp: TradeAgreementComponent,
    context: CivilizationContext
  ): string {
    const proposerCiv = proposal.parties.find((p) => p.id !== ourCiv.id);
    const trustLevel = ourTradeComp.diplomaticRelations.get(proposerCiv?.id ?? '')?.trustLevel ?? 'new';

    return `You are the mayor/diplomat of ${ourCiv.name}, responsible for evaluating trade proposals.

# Your Civilization Status
- Population: ${context.population}
- Food Supply: ${context.foodSupply} (${context.foodDaysRemaining} days remaining)
- Key Resources: ${context.keyResources.join(', ')}
- Critical Needs: ${context.criticalNeeds.join(', ')}
- Strategic Focus: ${context.strategicFocus}

# Trade Proposal from ${proposerCiv?.name ?? 'Unknown'}
Scope: ${proposal.scope}
Trust Level: ${trustLevel}

${this.formatTerms(proposal.terms, ourCiv.id)}

# Historical Context
${this.formatDiplomaticHistory(ourTradeComp, proposerCiv?.id)}

# Your Task
Analyze this trade proposal and decide:
1. **ACCEPT** - if the trade is beneficial and fair
2. **REJECT** - if the trade is unfavorable or unacceptable
3. **COUNTER** - if you want to propose modified terms

Consider:
- Does this address our critical needs?
- Is the trade fair given the scope and trust level?
- What are the strategic implications?
- What risks or opportunities does it present?

Respond in this format:
<decision>
DECISION: [ACCEPT|REJECT|COUNTER]
REASONING: [Your strategic reasoning]
CONCERNS: [List any concerns, one per line]
OPPORTUNITIES: [List any opportunities, one per line]
</decision>`;
  }

  /**
   * Build the LLM prompt for generating a counter-offer
   */
  private buildCounterOfferPrompt(
    proposal: TradeAgreement,
    ourCiv: CivilizationIdentity,
    _ourTradeComp: TradeAgreementComponent,
    context: CivilizationContext,
    concerns: string[]
  ): string {
    const proposerCiv = proposal.parties.find((p) => p.id !== ourCiv.id);

    return `You are the mayor/diplomat of ${ourCiv.name}, negotiating a counter-offer for a trade proposal.

# Your Civilization Status
- Population: ${context.population}
- Food Supply: ${context.foodSupply} (${context.foodDaysRemaining} days remaining)
- Key Resources: ${context.keyResources.join(', ')}
- Critical Needs: ${context.criticalNeeds.join(', ')}

# Original Proposal from ${proposerCiv?.name ?? 'Unknown'}
${this.formatTerms(proposal.terms, ourCiv.id)}

# Your Concerns
${concerns.map((c, i) => `${i + 1}. ${c}`).join('\n')}

# Your Task
Propose modified trade terms that address your concerns while still being reasonable for the other party.

Guidelines:
- Adjust quantities, payment, or delivery schedules
- Propose additional items if needed
- Maintain fairness - don't make unreasonable demands
- Consider the trade scope (${proposal.scope}) and associated costs

Respond in this format:
<counter_offer>
REASONING: [Explain your modifications]
MODIFIED_TERMS:
${proposal.terms.map((t, i) => `
TERM ${i + 1}:
  ITEM: ${t.itemId}
  QUANTITY: [Your modified quantity or original: ${t.quantity}]
  PROVIDED_BY: ${t.providedBy}
  RECEIVED_BY: ${t.receivedBy}
  PAYMENT: [Your modified payment or original: ${JSON.stringify(t.payment)}]
`).join('\n')}
</counter_offer>`;
  }

  /**
   * Format trade terms for display
   */
  private formatTerms(terms: TradeTerm[], ourCivId: string): string {
    return terms
      .map((term, i) => {
        const weProvide = term.providedBy === ourCivId;
        const direction = weProvide ? 'WE PROVIDE' : 'WE RECEIVE';
        const paymentStr = term.payment
          ? `\n  Payment: ${term.payment.currency} ${term.payment.amount ?? 'various'}`
          : '';

        return `Term ${i + 1} (${direction}):
  Item: ${term.itemId}
  Quantity: ${term.quantity}
  Delivery: ${term.delivery.method}${paymentStr}`;
      })
      .join('\n\n');
  }

  /**
   * Format diplomatic history
   */
  private formatDiplomaticHistory(
    tradeComp: TradeAgreementComponent,
    partnerId: string | undefined
  ): string {
    if (!partnerId) return 'No prior history';

    const relation = tradeComp.diplomaticRelations.get(partnerId);
    if (!relation) return 'First-time trading partner';

    return `Previous Trades: ${relation.successfulTrades} successful, ${relation.failedTrades} failed
Total Value Exchanged: ${relation.totalValueExchanged}
Recent Incidents: ${relation.incidents.length > 0 ? relation.incidents.map((i) => i.description).join(', ') : 'None'}`;
  }

  // ===========================================================================
  // Response Parsing
  // ===========================================================================

  /**
   * Parse LLM response into negotiation decision
   */
  private parseNegotiationDecision(
    response: string,
    _proposal: TradeAgreement
  ): NegotiationDecision {
    const decisionMatch = response.match(/DECISION:\s*(ACCEPT|REJECT|COUNTER)/i);
    const reasoningMatch = response.match(/REASONING:\s*([^\n]+(?:\n(?!CONCERNS:)[^\n]+)*)/i);
    const concernsMatch = response.match(/CONCERNS:\s*([^]*?)(?=OPPORTUNITIES:|<\/decision>|$)/i);
    const opportunitiesMatch = response.match(/OPPORTUNITIES:\s*([^]*?)(?=<\/decision>|$)/i);

    if (!decisionMatch) {
      throw new Error('LLM response missing DECISION field');
    }

    const decision = decisionMatch[1]!.toLowerCase() as 'accept' | 'reject' | 'counter';
    const reasoning = reasoningMatch?.[1]?.trim() ?? 'No reasoning provided';

    const concerns = concernsMatch?.[1]
      ?.split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !c.startsWith('OPPORTUNITIES:'))
      ?? [];

    const opportunities = opportunitiesMatch?.[1]
      ?.split('\n')
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
      ?? [];

    return {
      decision,
      reasoning,
      concerns,
      opportunities,
    };
  }

  /**
   * Parse counter-offer response
   */
  private parseCounterOffer(response: string, proposal: TradeAgreement): NegotiationDecision {
    const reasoningMatch = response.match(/REASONING:\s*([^\n]+(?:\n(?!MODIFIED_TERMS:)[^\n]+)*)/i);
    const reasoning = reasoningMatch?.[1]?.trim() ?? 'Counter-offer proposed';

    // Parse modified terms
    const modifiedTerms: TradeTerm[] = [];
    const termMatches = response.matchAll(/TERM\s+(\d+):([\s\S]*?)(?=TERM\s+\d+:|<\/counter_offer>|$)/gi);

    for (const match of termMatches) {
      const termIndex = parseInt(match[1]!) - 1;
      const termContent = match[2]!;

      if (termIndex >= 0 && termIndex < proposal.terms.length) {
        const originalTerm = proposal.terms[termIndex]!;

        // Parse quantity
        const quantityMatch = termContent.match(/QUANTITY:\s*(\d+)/i);
        const quantity = quantityMatch ? parseInt(quantityMatch[1]!) : originalTerm.quantity;

        // Parse payment
        const paymentMatch = termContent.match(/PAYMENT:\s*({[^}]+}|.*?)$/im);
        let payment = originalTerm.payment;
        if (paymentMatch) {
          try {
            payment = JSON.parse(paymentMatch[1]!);
          } catch {
            // Keep original payment if parsing fails
          }
        }

        modifiedTerms.push({
          ...originalTerm,
          quantity,
          payment,
        });
      }
    }

    // If no terms were parsed, use original terms
    if (modifiedTerms.length === 0) {
      modifiedTerms.push(...proposal.terms);
    }

    return {
      decision: 'counter',
      reasoning,
      modifiedTerms,
    };
  }

  // ===========================================================================
  // Rule-Based Fallbacks
  // ===========================================================================

  /**
   * Rule-based evaluation fallback (when LLM unavailable)
   */
  private ruleBasedEvaluateProposal(
    proposal: TradeAgreement,
    ourTradeComp: TradeAgreementComponent,
    context: CivilizationContext
  ): NegotiationDecision {
    const concerns: string[] = [];

    // Check if we're giving away critical resources
    for (const term of proposal.terms) {
      if (context.criticalNeeds.includes(term.itemId)) {
        concerns.push(`Giving away critical resource: ${term.itemId}`);
      }
    }

    // Check trust level for cross-realm trades
    if (proposal.scope === 'cross_universe' || proposal.scope === 'cross_multiverse') {
      const proposerCiv = proposal.parties.find((p) => p.id !== ourTradeComp.civilizationId);
      const trustLevel = ourTradeComp.diplomaticRelations.get(proposerCiv?.id ?? '')?.trustLevel ?? 'new';

      if (trustLevel === 'untrusted') {
        concerns.push('Trading across universes with untrusted partner');
      }
    }

    // Simple decision logic
    if (concerns.length > 3) {
      return {
        decision: 'reject',
        reasoning: 'Too many concerns with this proposal',
        concerns,
      };
    } else if (concerns.length > 0) {
      return {
        decision: 'counter',
        reasoning: 'Proposal has concerns that need addressing',
        concerns,
      };
    } else {
      return {
        decision: 'accept',
        reasoning: 'Proposal appears beneficial',
        opportunities: ['Strengthens trade relations'],
      };
    }
  }

  /**
   * Rule-based counter-offer fallback
   */
  private ruleBasedCounterOffer(
    proposal: TradeAgreement,
    ourCiv: CivilizationIdentity,
    _context: CivilizationContext
  ): CounterOffer {
    // Simple rule: reduce quantities we're giving by 20%, increase quantities we're receiving by 20%
    const modifiedTerms = proposal.terms.map((term) => {
      const weProvide = term.providedBy === ourCiv.id;
      const adjustedQuantity = weProvide
        ? Math.floor(term.quantity * 0.8)
        : Math.ceil(term.quantity * 1.2);

      return {
        ...term,
        quantity: adjustedQuantity,
      };
    });

    return {
      proposerId: ourCiv.id,
      version: (proposal.crossRealmMetadata?.successfulTrades ?? 0) + 1,
      proposedAt: BigInt(Date.now()),
      modifiedTerms,
      reasoning: 'Rule-based adjustment: more favorable terms for our civilization',
    };
  }
}

/**
 * Civilization context for negotiation
 */
export interface CivilizationContext {
  /** Current population */
  population: number;

  /** Total food supply */
  foodSupply: number;

  /** Days of food remaining */
  foodDaysRemaining: number;

  /** Key resources available */
  keyResources: string[];

  /** Critical needs (what we urgently need) */
  criticalNeeds: string[];

  /** Strategic focus (expansion, defense, trade, etc.) */
  strategicFocus: string;

  /** Available storage capacity */
  storageCapacity?: number;

  /** Current wealth/currency */
  wealth?: number;
}

/**
 * Create a civilization context from game state
 */
export function createCivilizationContext(
  population: number,
  foodSupply: number,
  foodDaysRemaining: number,
  resources: Map<string, number>,
  needs: string[],
  focus: string
): CivilizationContext {
  // Extract key resources (top 5 by quantity)
  const keyResources = Array.from(resources.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([itemId]) => itemId);

  return {
    population,
    foodSupply,
    foodDaysRemaining,
    keyResources,
    criticalNeeds: needs,
    strategicFocus: focus,
  };
}
