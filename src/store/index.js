import Immutable from 'immutable'
import {TypeInfo} from 'graphql/utilities'

import getDataForStore from './get-data-for-store'
import queryStore from './query-store'
import canFulfillQuery from './can-fulfill-query'
import passThroughQuery from './pass-through-query'

const StoreRecord = Immutable.Record({
  data: Immutable.Map(),
  nodes: Immutable.Map(),
})

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
