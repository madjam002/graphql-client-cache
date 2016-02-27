import Immutable from 'immutable'
import {isLeafType} from 'graphql/type'
import {TypeInfo} from 'graphql/utilities'
import {visitAndMapImmutable} from './utils/visitor'

const StoreRecord = Immutable.Record({
  data: Immutable.Map(),
  nodes: Immutable.Map(),
})

const NodeReference = Immutable.Record({
  id: null,
  _type: 'NodeReference',
})

function isNode(type, data) {
  // TODO check graphql type?
  return data.id != null
}

function getDataForStore(query, inData, schema, typeInfo) {
  const nodes = {}

  const data = visitAndMapImmutable(query, inData, ({ objectTree, typeInfo }) =>
    node => {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      if (isNode(type, data)) {
        const nodeData = getDataForStore(node.selectionSet, data, schema, typeInfo)
        nodes[data.id] = nodeData.data
        Object.assign(nodes, nodeData.nodes)
        return new NodeReference({ id: data.id })
      }

      if (isLeafType(typeInfo.getType())) {
        return data
      }
    }
  , { schema, typeInfo })

  return { data, nodes }
}

export default class Store extends StoreRecord {

  acceptQueryResult(result, query, variables, { schema }) {
    const newStore = this.asMutable()
    const typeInfo = new TypeInfo(schema)

    const { nodes, data } = getDataForStore(query, result, schema, typeInfo)

    newStore.set('data', newStore.get('data').mergeDeep(
      data,
    ))

    Object.keys(nodes).forEach(id => newStore.updateNode(id, nodes[id]))

    return newStore.asImmutable()
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
