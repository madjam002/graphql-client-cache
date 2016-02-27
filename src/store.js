import Immutable from 'immutable'
import {isLeafType} from 'graphql/type'
import {TypeInfo} from 'graphql/utilities'
import {visitWithTree, visitAndMapImmutable, visitAndMap, DataTypes} from './utils/visitor'
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
  if (!data) return false
  const id = data.get ? data.get('id') : data.id

  // TODO check graphql type?
  return id != null
}

function getDataForStore(query, ast, variables, inData, schema, typeInfo) {
  const nodes = {}

  const data = visitAndMapImmutable(query, ast, variables, inData, ({ objectTree, typeInfo, useKey }) =>
    node => {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      const key = getStorageKey(node, variables)
      useKey(key)

      if (isNode(type, data)) {
        const nodeData = getDataForStore(query, node.selectionSet, variables, data, schema, typeInfo)
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

function queryStore(store, query, ast, variables, data, schema, typeInfo) {
  return visitAndMap(query, ast, variables, data, ({ objectTree, typeInfo, useKey }) =>
    node => {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      if (node.alias) {
        useKey(node.alias.value)
      }

      if (isNode(type, data)) {
        return queryStore(store, query, node.selectionSet, variables, store.getNode(data.get('id')), schema, typeInfo)
      }

      if (isLeafType(type)) {
        return data
      }
    }
  , { schema, typeInfo, dataType: DataTypes.STORE_DATA })
}

function canFulfillQuery(store, query, ast, variables, data, schema, typeInfo) {
  let canFulfill = true

  visitAndMap(query, ast, variables, data, ({ objectTree, typeInfo, useKey }) =>
    node => {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      if (data == null) {
        canFulfill = false
        return false
      }

      if (isNode(type, data)) {
        const nodeCan = queryStore(store, query, node.selectionSet, variables, store.getNode(data.get('id')), schema, typeInfo)
        if (!nodeCan) {
          canFulfill = false
        }
        return false
      }
    }
  , { schema, typeInfo, dataType: DataTypes.STORE_DATA })

  return canFulfill
}

function passThroughQuery(store, query, ast, variables, data, schema, typeInfo) {
  return visitWithTree(query, ast, variables, data, ({ objectTree, typeInfo }) => ({
    Field: {
      enter(node) {
        const data = objectTree.getCurrent()
        const type = typeInfo.getType()

        if (data != null && isLeafType(type)) {
          return null // remove field
        }

        if (isNode(type, data)) {
          return {
            ...node,
            selectionSet:
              passThroughQuery(store, query, node.selectionSet, variables, store.getNode(data.get('id')), schema, typeInfo),
          }
        }
      },
      leave(node) {
        // remove fields with no selection set
        if (node.selectionSet && node.selectionSet.selections.length === 0) {
          return null
        }
      },
    },
  }), { schema, dataType: DataTypes.STORE_DATA, typeInfo })
}

export default class Store extends StoreRecord {

  acceptQueryResult(result, query, variables, { schema }) {
    const newStore = this.asMutable()
    const typeInfo = new TypeInfo(schema)

    const { nodes, data } = getDataForStore(query, query, variables, result, schema, typeInfo)

    newStore.set('data', newStore.get('data').mergeDeep(
      data,
    ))

    Object.keys(nodes).forEach(id => newStore.updateNode(id, nodes[id]))

    return newStore.asImmutable()
  }

  query(query, variables, { schema }) {
    const typeInfo = new TypeInfo(schema)
    const data = queryStore(this, query, query, variables, this.data, schema, typeInfo)

    return data
  }

  canFulfillQuery(query, variables, { schema }) {
    const typeInfo = new TypeInfo(schema)
    return canFulfillQuery(this, query, query, variables, this.data, schema, typeInfo)
  }

  getNode(id) {
    return this.get('nodes').get(id)
  }

  passThroughQuery(query, variables, { schema }) {
    const typeInfo = new TypeInfo(schema)
    return passThroughQuery(this, query, query, variables, this.data, schema, typeInfo)
  }

  updateNode(id, data) {
    if (this.getNode(id)) {
      return this.mergeDeepIn(['nodes', id], data)
    } else {
      return this.setIn(['nodes', id], data)
    }
  }

}
