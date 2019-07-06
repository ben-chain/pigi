/* External Imports */
import BigNum = require('bn.js')
import debug from 'debug'
const log = debug('info:state-update')

/* Internal Imports */
import { abi, hexStringify } from '../../app'
import { DoubleMerkleInclusionProof, AbiEncodable, MerkleIntervalInclusionProof } from '../../types'
import { AbiStateObject } from './state-object'
import { AbiRange } from './abi-range'

/**
 * Represents a basic abi encodable AbiStateUpdateInclusionProof.
 * Encoding follows the contract struct type :
 *  struct StateUpdateInclusionProof {
        uint128 stateLeafPosition;
        StateSubtreeNode[] stateLeafInclusionProof;
        uint128 assetLeafPosition;
        AssetTreeNode[] assetLeafInclusionProof;
    }
 */

// NOTE ON THIS CLASS: since we want to redo serialization, I chose not to mess with
// abi encoding these objects, and just pulling the jsonified object which can
// be given to ethers.js out.  We can fix this when the rest of serialization
// is handled.

export class AbiStateUpdateInclusionProof implements DoubleMerkleInclusionProof {
  public static abiTypes = ['bytes', 'bytes', 'uint256', 'address']
  public stateTreeInclusionProof: MerkleIntervalInclusionProof
  public assetTreeInclusionProof: MerkleIntervalInclusionProof
  constructor(
    _proof: DoubleMerkleInclusionProof
  ) {
      this.stateTreeInclusionProof = _proof.stateTreeInclusionProof
      this.assetTreeInclusionProof = _proof.assetTreeInclusionProof
  }

  /**
   * @returns the jsonified AbiStateUpdateInclusionProof.
   */
  get jsonified(): any {
    const jsonifiedStatesubtreeInclusionProof = []
    for (let i = 0; i < this.stateTreeInclusionProof.siblings.length; i++) {
        let sibling = this.stateTreeInclusionProof.siblings[i]
        jsonifiedStatesubtreeInclusionProof[i] = {
            hashValue: hexStringify(sibling.hash),
            lowerBound: hexStringify(sibling.lowerBound)
        }
    }

    const jsonifiedAssetTreeInclusionProof = []
    for (let i = 0; i < this.assetTreeInclusionProof.siblings.length; i++) {
        let sibling = this.assetTreeInclusionProof.siblings[i]
        jsonifiedAssetTreeInclusionProof[i] = {
            hashValue: hexStringify(sibling.hash),
            lowerBound: hexStringify(sibling.lowerBound)
        }
    }

    return {
        stateLeafPosition: hexStringify(this.stateTreeInclusionProof.leafPosition),
        stateLeafInclusionProof: jsonifiedStatesubtreeInclusionProof,
        assetLeafPosition: hexStringify(this.assetTreeInclusionProof.leafPosition),
        assetLeafInclusionProof: jsonifiedAssetTreeInclusionProof
    }
  }
}
