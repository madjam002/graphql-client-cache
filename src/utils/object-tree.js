import {Kind} from 'graphql/language'

export class ObjectTree {
  constructor(tree) {
    this._tree = tree
    this._stack = [this._tree]
  }

  getCurrent() {
    return this._stack[this._stack.length - 1]
  }

  enterIndex(index) {
    const current = this.getCurrent()

    this._index = index
    this._indexAt = this._stack.length + 1
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

      if (current) {
        const next = current.get ? current.get(node.name.value) : current[node.name.value]

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
