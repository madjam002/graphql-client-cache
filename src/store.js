import Immutable from 'immutable'
import {isLeafType} from 'graphql/type'
import {TypeInfo} from 'graphql/utilities'
import {visitAndMapImmutable, visitAndMap, DataTypes} from './utils/visitor'
import {getStorageKey} from './utils/storage-key'

const StoreRecord = Immutable.Record({
  data: Immutable.Map(),
  nodes: Immutable.Map(),
})

const NodeReference = Immutable.Record({
  id: null,
  _type: 'NodeReference',
})

function isNode(type, data) {
  const id = data.get ? data.get('id') : data.id

  // TODO check graphql type?
  return id != null
}

function getDataForStore(query, variables, inData, schema, typeInfo) {
  const nodes = {}

  const data = visitAndMapImmutable(query, variables, inData, ({ objectTree, typeInfo, useKey }) =>
    node => {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      const key = getStorageKey(node, variables)
      useKey(key)

      if (isNode(type, data)) {
        const nodeData = getDataForStore(node.selectionSet, variables, data, schema, typeInfo)
        nodes[data.id] = nodeData.data
        Object.assign(nodes, nodeData.nodes)
        return new NodeReference({ id: data.id })
      }

      if (isLeafType(typeInfo.getType())) {
        return data
      }
    }
  , { schema, typeInfo, dataType: DataTypes.QUERY_RESULT })

  return { data, nodes }
}

function queryStore(store, query, variables, data, schema, typeInfo) {
  return visitAndMap(query, variables, data, ({ objectTree, typeInfo, useKey }) =>
    node => {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      if (node.alias) {
        useKey(node.alias.value)
      }

      if (isNode(type, data)) {
        return queryStore(store, node.selectionSet, variables, store.getNode(data.get('id')), schema, typeInfo)
      }

      if (isLeafType(typeInfo.getType())) {
        return data
      }
    }
  , { schema, typeInfo, dataType: DataTypes.STORE_DATA })
}

export default class Store extends StoreRecord {

  acceptQueryResult(result, query, variables, { schema }) {
    const newStore = this.asMutable()
    const typeInfo = new TypeInfo(schema)

    const { nodes, data } = getDataForStore(query, variables, result, schema, typeInfo)

    newStore.set('data', newStore.get('data').mergeDeep(
      data,
    ))

    Object.keys(nodes).forEach(id => newStore.updateNode(id, nodes[id]))

    return newStore.asImmutable()
  }

  query(query, variables, { schema }) {
    const typeInfo = new TypeInfo(schema)
    const data = queryStore(this, query, variables, this.data, schema, typeInfo)

    return data
  }

  getNode(id) {
    return this.get('nodes').get(id)
  }

  updateNode(id, data) {
    if (this.getNode(id)) {
      return this.mergeDeepIn(['nodes', id], data)
    } else {
      return this.setIn(['nodes', id], data)
    }
  }

}
