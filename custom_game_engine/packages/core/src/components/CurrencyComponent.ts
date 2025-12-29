import type { Component } from '../ecs/Component.js';

/**
 * Record of a single currency transaction
 */
export interface TransactionRecord {
  id: string;
  type: 'buy' | 'sell' | 'trade' | 'transfer';
  amount: number;
  otherPartyId: string;
  itemId?: string;
  quantity?: number;
  tick: number;
  timestamp: number;
}

/**
 * Component for tracking an entity's currency balance and transaction history
 */
export interface CurrencyComponent extends Component {
  type: 'currency';
  balance: number;
  transactionHistory: TransactionRecord[];
  maxHistorySize: number;
}

/**
 * Create a new CurrencyComponent with initial balance
 */
export function createCurrencyComponent(initialBalance: number = 100): CurrencyComponent {
  return {
    type: 'currency',
    version: 1,
    balance: initialBalance,
    transactionHistory: [],
    maxHistorySize: 100,
  };
}

/**
 * Add or remove currency from a component and record the transaction
 * @param component The currency component to update
 * @param amount The amount to add (positive) or remove (negative)
 * @param record Transaction details (without id, which is generated)
 * @returns Updated component with new balance and transaction record
 * @throws Error if insufficient funds
 */
export function addCurrency(
  component: CurrencyComponent,
  amount: number,
  record: Omit<TransactionRecord, 'id'>
): CurrencyComponent {
  const newBalance = component.balance + amount;
  if (newBalance < 0) {
    throw new Error(`Insufficient funds: have ${component.balance}, need ${-amount}`);
  }

  const transaction: TransactionRecord = {
    ...record,
    id: crypto.randomUUID(),
  };

  const history = [transaction, ...component.transactionHistory].slice(0, component.maxHistorySize);

  return {
    ...component,
    balance: newBalance,
    transactionHistory: history,
  };
}
