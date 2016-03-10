import {isLeafType} from 'graphql/type'
import {isNode} from './node'
import {visitWithTree, DataTypes} from '../visitor'

export default function passThroughQuery(store, query, ast, variables, data, schema, typeInfo) {
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
