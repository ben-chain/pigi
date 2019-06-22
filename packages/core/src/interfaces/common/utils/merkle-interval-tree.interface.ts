/* External Imports */
import BigNumber = require('bn.js')

export interface MerkleIntervalTreeNode {
  index: BigNumber
  hash: Buffer
}

export type MerkleIntervalTreeInclusionProof = MerkleIntervalTreeNode[]
