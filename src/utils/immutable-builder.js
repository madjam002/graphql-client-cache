import {isLeafType, GraphQLList} from 'graphql/type'
import Immutable from 'immutable'

export class ImmutableBuilder {
  constructor(objectTree, typeInfo) {
    this._tree = Immutable.Map({}).asMutable()
    this._stack = [this._tree]
    this._keyStack = [null]

    this.objectTree = objectTree
    this._typeInfo = [typeInfo]
  }

  push(key, value) {
    this._stack.push(value)
    this._keyStack.push(key)
  }

  pop() {
    this._stack.pop()
    this._keyStack.pop()
  }

  get() {
    return this._tree.asImmutable()
  }

  getTypeInfo() {
    return this._typeInfo[this._typeInfo.length - 1]
  }

  getCurrent() {
    return this._stack[this._stack.length - 1]
  }

  getKey() {
    return this._keyStack[this._keyStack.length - 1]
  }

  useKey(key) {
    this.nextKey = key
  }

  pushTypeInfo(typeInfo) {
    this._typeInfo.push(typeInfo)
  }

  popTypeInfo() {
    this._typeInfo.pop()
  }

  enterIndex(index) {
    const curr = this.getCurrent()
    curr.set(index, Immutable.Map().asMutable())
    this.push(index, curr.get(index))
  }

  enter(node, mapRes) {
    const type = this.getTypeInfo().getType()
    const data = this.objectTree.getCurrent()
    const curr = this.getCurrent()
    const key = this.objectTree.getIndex() != null
      ? this.objectTree.getIndex()
      : this.nextKey || node.name.value

    this.nextKey = null

    if (mapRes === undefined && !isLeafType(type)) {
      if ((Array.isArray(data) || Immutable.List.isList(data)) && type instanceof GraphQLList) {
        curr.set(key, Immutable.List().asMutable())
        this.push(key, curr.get(key))
      } else {
        curr.set(key, Immutable.Map({}).asMutable())
        this.push(key, curr.get(key))
      }

      return
    }

    curr.set(key, mapRes)

    return false // don't enter this node
  }

  leave(node) {
    const curr = this.getCurrent()
    const key = this.getKey()

    this.pop()

    const parent = this.getCurrent()
    parent.set(key, curr.asImmutable())
  }
}
