import '../setup'

/* External Imports */
import { Contract } from 'web3-eth-contract'
import { StateUpdate, StateUpdateArgs, StateObject, StateObjectData, abi }  from '@pigi/utils'
import debug from 'debug'
const log = debug('test:info:merkle-index-tree')
// import BigNum = require('bn.js')

/* Internal Imports */
import { MerkleIndexTree, MerkleIndexTreeNode  } from '../../src/merkle-index-tree'
import { AssertionError } from 'assert';

describe.only('merkle-index-tree', () => {
  describe('MerkleIndexTreeNode', () => {
    it('should concatenate index and hash after construction', async() => {
      const node = new MerkleIndexTreeNode(Buffer.from([255]), Buffer.from([0])) 
      log('New merkle index tree node:', node)
      const expected = Buffer.concat([Buffer.from([255]), Buffer.from([0])])
      node.data.should.deep.equal(expected)
    })
  })
  describe('MerkleIndexTree', () => {
    describe('parent', () => {
      it('should return the correct parent', async() => {
        const left = new MerkleIndexTreeNode(Buffer.from([13]), Buffer.from([10])) 
        const right = new MerkleIndexTreeNode(Buffer.from([31]), Buffer.from([15])) 
        const parent = MerkleIndexTree.parent(left, right)
        // We calculated the hash by hand.
        parent.data.toString('hex').should.equal('69b053cd194c51ff15ac9db85fc581c4457a7160c78d878e7c5b84f4c1fbb9140a')
      })
      it('should throw if left & right nodes are out of order', async() => {
        const left = new MerkleIndexTreeNode(Buffer.from([13]), Buffer.from([15])) 
        const right = new MerkleIndexTreeNode(Buffer.from([31]), Buffer.from([10])) 
        const parentCall = () => MerkleIndexTree.parent(left, right)
        parentCall.should.throw()
      })
    })
    it('should generate a generic tree', async() => {
      const leaves = []
      for (let i = 0; i < 4; i++) {
        leaves.push(new MerkleIndexTreeNode(Buffer.from([Math.floor(Math.random()*100)]), Buffer.from([i])))
      }
      const indexTree = new MerkleIndexTree(leaves)
      log(indexTree.levels)
      log(indexTree.root)
    })
  })
  describe('MerkleIndexTree', () => {
    it('should at least initialize', async() => {
      const stateObject = new StateObject({predicate: '0xbdAd2846585129Fc98538ce21cfcED21dDDE0a63', parameters: '0x123456'})
      const stateUpdate = new StateUpdate({start: 9, end: 100, block: 1, plasmaContract: '0xbdAd2846585129Fc98538ce21cfcED21dDDE0a63', newState: stateObject})
      log(stateObject, stateUpdate)
      log(stateUpdate.encoded)
      const decoded = StateUpdate.fromEncoded(stateUpdate.encoded)
      log(decoded)
    })
  })
})
