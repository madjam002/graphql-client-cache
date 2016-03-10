import {isLeafType} from 'graphql/type'
import {isNode} from './node'
import {visitAndMap, DataTypes} from '../visitor'

export default function queryStore(store, query, ast, variables, data, schema, typeInfo) {
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
