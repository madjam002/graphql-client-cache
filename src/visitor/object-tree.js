import {Kind} from 'graphql/language'
import {getStorageKey} from '../utils/storage-key'

export const Types = {
  STORE_DATA: 1,
  QUERY_RESULT: 2,
}

export class ObjectTree {
  constructor(tree, query, queryVariables, type = Types.STORE_DATA) {
    this._tree = tree
    this._stack = [this._tree]
    this._query = query
    this._queryVariables = queryVariables
    this._type = type
  }

  getCurrent() {
    return this._stack[this._stack.length - 1]
  }

  enterIndex(index) {
    const current = this.getCurrent()

    this._index = index
    this._indexAt = this._stack.length
    this._stack.push(current.get ? current.get(index) : current[index])
  }

  getIndex() {
    if (this._indexAt === this._stack.length - 1) return this._index
    return null
  }

  pop() {
    if (this._indexAt === this._stack.length) {
      this._index = null
    }

    this._stack.pop()
  }

  enter(node) {
    if (node.kind === Kind.FIELD) {
      const current = this.getCurrent()

      let key

      if (this._type === Types.QUERY_RESULT) {
        key = node.alias ? node.alias.value : node.name.value
      } else {
        key = getStorageKey(node, this._queryVariables)
      }

      if (current) {
        const next = current.get ? current.get(key) : current[key]

        this._stack.push(next)
        return next
      } else {
        this._stack.push(undefined)
        return undefined
      }
    }
  }

  leave(node) {
    if (node.kind === Kind.FIELD) {
      this._stack.pop()
    }
  }
}
