/* Internal Imports */
import { Transaction, TransactionProof, ChainDB } from '../../../interfaces'

/**
 * HistoryManager implementation for PG's Plasma Cashflow variant.
 */
export class PGHistoryManager {
  /**
   * Creates the manager.
   * @param db ChainDB to interact with.
   */
  constructor(private db: ChainDB) {}

  /**
   * Adds a set of transactions to the local state.
   * Does nothing if the transaction is already in the state.
   * @param transactions Set of transactions to add.
   */
  public async addTransactions(transactions: Transaction[]): Promise<void> {
    // TODO: Figure out the correct DB key.
    // TODO: Figure out how to encode transactions here.
    /*
    const ops: Batch[] = transactions.map(
      (tx): PutBatch => {
        return {
          type: 'put',
          key: tx.hash,
          value: tx.encoded,
        }
      }
    )
    await this.db.batch(ops)
    */
  }

  /**
   * Generates a transaction proof for a given transaction.
   * Assumes that the recipient has access to public
   * information (e.g. plasma blocks).
   * @param transaction Transaction to generate a proof for.
   * @returns the transaction proof.
   */
  public async getTransactionProof(
    transaction: Transaction
  ): Promise<TransactionProof> {
    return
  }
}
