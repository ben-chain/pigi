/* External Imports */
const Web3 = require('web3') // tslint:disable-line
import BigNum = require('bn.js')
import debug from 'debug'
const log = debug('info:merkle-index-tree')


/* Internal Imports */
import { reverse, AbiStateUpdate } from '../../../../'
import { keccak256 } from '../../'

const STATE_ID_LENGTH = 16

function getHash(value: Buffer) {
  return keccak256(value)
}

/**
 * Computes the index of the sibling of a node.
 * @param index Index of a node.
 * @returns the index of the sibling of that node.
 */
const getSiblingIndex = (index: number): number => {
  return index + (index % 2 === 0 ? 1 : -1)
}

/**
 * Computes the index of the parent of a node
 * @param index Index of a node.
 * @returns the index of the parent of that node.
 */
const getParentIndex = (index: number): number => {
  return index === 0 ? 0 : Math.floor(index / 2)
}

export class MerkleIndexTreeNode {
  public data: Buffer

  constructor (readonly hash: Buffer, readonly index: Buffer) {
    this.data = Buffer.concat([this.hash, this.index])
  }
}

export class MerkleIndexTree {
  public levels: MerkleIndexTreeNode[][]

  constructor (readonly leaves: any[]) {
    const bottom = this.parseLeaves(leaves)
    this.levels = [bottom]
    this.generate(bottom)
  }

  public static parent (left: MerkleIndexTreeNode, right: MerkleIndexTreeNode): MerkleIndexTreeNode {
    if (Buffer.compare(left.index, right.index) >= 0) {
      throw new Error('Left index (0x' + left.index.toString('hex') + ') not less than right index (0x' + right.index.toString('hex') + ')')
    }
    const concatenated = Buffer.concat([left.data, right.data])
    return new MerkleIndexTreeNode(getHash(concatenated), left.index)
  }

  public static emptyNode (length: number): MerkleIndexTreeNode {
    const hash = Buffer.from(new Array(32).fill(0))
    const filledArray = new Array(length).fill(255)
    const index = Buffer.from(filledArray)
    return new MerkleIndexTreeNode(hash, index)
  }

  public parseLeaves(dataBlocks: any): MerkleIndexTreeNode[] {
    return dataBlocks
  }ƒ

  public root(): MerkleIndexTreeNode {
    return this.levels[this.levels.length - 1][0]
  }

  private generate(children: MerkleIndexTreeNode[]) {
    log('in generate with children', children)
    if(children.length === 1) {
      return
    }
    const parents = []
    for (let i = 0; i < children.length; i += 2) {
      const left = children[i]
      const right = 
        i + 1 === children.length ? MerkleIndexTree.emptyNode(left.index.length) : children[i + 1]
      const parent = MerkleIndexTree.parent(left, right)
      parents.push(parent)
    }

    this.levels.push(parents)
    this.generate(parents)
  }

  public getInclusionProof(leafPosition: number): MerkleIndexTreeNode[] {
    if (!(leafPosition in this.levels[0])) {
      throw new Error('Leaf index ' + leafPosition + ' not in bottom level of tree')
    }

    const inclusionProof: MerkleIndexTreeNode[] = []
    let parentIndex: number
    let siblingIndex = getSiblingIndex(leafPosition)
    for (let i = 0; i < this.levels.length - 1; i++) {
      const level = this.levels[i]
      const node = level[siblingIndex] || MerkleIndexTree.emptyNode(level[0].index.length)
      inclusionProof.push(node)

      // Figure out the parent and then figure out the parent's sibling.
      parentIndex = getParentIndex(siblingIndex)
      siblingIndex = getSiblingIndex(parentIndex)
    }
    return inclusionProof
  }

  /**
   * Checks a Merkle proof.
   * @param leafNode Leaf node to check.
   * @param leafPosition Position of the leaf in the tree.
   * @param inclusionProof Inclusion proof for that transaction.
   * @param root The root node of the tree to check.
   * @returns the implicit bounds covered by the leaf if the proof is valid.
   */
  public static verify(
    leafNode: MerkleIndexTreeNode,
    leafPosition: number,
    inclusionProof: MerkleIndexTreeNode[],
    rootHash: Buffer
  ): any {
    const rootAndBounds = MerkleIndexTree.getRootAndBounds(
      leafNode,
      leafPosition,
      inclusionProof
    )
    // Check that the roots match.
    if (Buffer.compare(rootAndBounds.root.hash, rootHash) !== 0) {
      throw new Error('Invalid Merkle Index Tree roothash.')
    } else {
      return rootAndBounds.bounds
    }
  }

  public static getRootAndBounds(
    leafNode: MerkleIndexTreeNode,
    leafPosition: number,
    inclusionProof: MerkleIndexTreeNode[],
  ): any {
    if (leafPosition < 0) {
      throw new Error('Invalid leaf position.')
    }

    // Compute the path based on the leaf index.
    const path = reverse(
      new BigNum(leafPosition).toString(2, inclusionProof.length)
    )
    console.log('path: ', path)

    // Need the first right sibling to ensure
    // that the tree is monotonically increasing.
    const firstRightSiblingIndex = path.indexOf('0')
    const firstRightSibling = 
      firstRightSiblingIndex >= 0
        ? inclusionProof[firstRightSiblingIndex]
        : undefined

    let computed: MerkleIndexTreeNode = leafNode
    let left: MerkleIndexTreeNode
    let right: MerkleIndexTreeNode
    for (let i = 0; i < inclusionProof.length; i++) {
      const sibling = inclusionProof[i]

      if (path[i] === '1') {
        left = sibling
        right = computed
      } else {
        left = computed
        right = sibling

        // If some right node further up the tree
        // is less than the first right node,
        // the tree construction must be invalid.
        if (
            firstRightSibling && // if it's the last leaf in tree, this doesn't exist
            Buffer.compare(right.index, firstRightSibling.index) === -1)
          {
            console.log('right: ', right)
            console.log('firstRightSibling: ', firstRightSibling)
          throw new Error('Invalid Merkle Index Tree proof--potential intersection detected.')
        }
      }

      computed = this.parent(left, right) // note: this checks left.index < right.index
      // console.log('computed at ' + i + ': ', computed)
    }

    return {
      root: computed,
      bounds: {
        implicitStart: leafPosition == 0 ? new BigNum(0) : leafNode.index,
        implicitEnd: firstRightSibling ? firstRightSibling.index : MerkleIndexTree.emptyNode(leafNode.index.length).index // messy way to get the max index
      }
    }
  }
}

export class MerkleStateIndexTree extends MerkleIndexTree {
  public parseLeaves(dataBlocks: AbiStateUpdate[]): MerkleIndexTreeNode[] {
    const bottom = dataBlocks.map((stateUpdate) => {
      const hash = getHash(Buffer.from(stateUpdate.encoded))
      const index = stateUpdate.range.start.toBuffer('be', STATE_ID_LENGTH)
      return new MerkleIndexTreeNode(hash, index)
    })
    return bottom
  }
}

export interface SubtreeContents {
  address: Buffer
  stateUpdates: AbiStateUpdate[]
}

export class PlasmaBlock extends MerkleIndexTree {
  public subtrees: MerkleStateIndexTree[]

  public parseLeaves(blockContents: SubtreeContents[]): MerkleIndexTreeNode[] {
    const sortedBlockContents = blockContents.sort((subTreeContents1, subTreeContents2) => Buffer.compare(subTreeContents1.address, subTreeContents2.address))
    this.subtrees = []
    const bottom = []
    for (const subtreeContents of sortedBlockContents) {
      const merkleStateIndexTree = new MerkleStateIndexTree(subtreeContents.stateUpdates)
      this.subtrees.push(merkleStateIndexTree)
      bottom.push(new MerkleIndexTreeNode(merkleStateIndexTree.root().hash, subtreeContents.address))
    }
    return bottom
  }

  public getStateUpdateInclusionProof(
    stateUpdatePosition: number,
    addressPosition: number
  ): any {
    return {
      stateTreeInclusionProof: this.subtrees[addressPosition].getInclusionProof(stateUpdatePosition),
      addressTreeInclusionProof: this.getInclusionProof(addressPosition)
    }
  }

  public static verifyStateUpdateInclusionProof(
    stateUpdate: AbiStateUpdate,
    stateTreeInclusionProof: MerkleIndexTreeNode[],
    stateUpdatePosition: number,
    addressTreeInclusionProof: MerkleIndexTreeNode[],
    addressPosition: number,
    blockRootHash: Buffer
  ): any {
    const leafNodeHash: Buffer = getHash(Buffer.from(stateUpdate.encoded))
    const leafNodeIndex: Buffer = stateUpdate.range.start.toBuffer('be', STATE_ID_LENGTH)
    const stateLeafNode: MerkleIndexTreeNode = new MerkleIndexTreeNode(leafNodeHash, leafNodeIndex)
    console.log('calculaated stateLeafNode: ', stateLeafNode)
    const stateUpdateRootAndBounds = MerkleIndexTree.getRootAndBounds(
      stateLeafNode,
      stateUpdatePosition,
      stateTreeInclusionProof
    )
    console.log('stateUpdateRootAndBounds', stateUpdateRootAndBounds)

    const addressLeafHash: Buffer = stateUpdateRootAndBounds.root.hash
    const addressLeafIndex: Buffer = Buffer.from(stateUpdate.depositAddress.slice(2), 'hex')
    const addressLeafNode: MerkleIndexTreeNode = new MerkleIndexTreeNode(addressLeafHash, addressLeafIndex)
    return MerkleIndexTree.verify(
      addressLeafNode,
      addressPosition,
      addressTreeInclusionProof,
      blockRootHash
    )
  }
}