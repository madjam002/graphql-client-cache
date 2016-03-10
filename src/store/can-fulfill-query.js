import {isNode} from './node'
import {visitWithTree, DataTypes} from '../visitor'

export default function canFulfillQuery(store, query, ast, variables, data, schema, typeInfo) {
  let canFulfill = true

  visitWithTree(query, ast, variables, data, ({objectTree}) => ({
    Field(node) {
      const data = objectTree.getCurrent()
      const type = typeInfo.getType()

      if (data == null) {
        canFulfill = false
        return false
      }

      if (isNode(type, data)) {
        const nodeCan = canFulfillQuery(store, query, node.selectionSet, variables, store.getNode(data.get('id')), schema, typeInfo)
        if (!nodeCan) {
          canFulfill = false
        }
        return false
      }
    },
    FragmentDefinition() {
      return null
    },
  }), { schema, typeInfo, dataType: DataTypes.STORE_DATA })

  return canFulfill
}
