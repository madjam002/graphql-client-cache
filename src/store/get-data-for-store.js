import {isLeafType} from 'graphql/type'
import {isNode, NodeReference} from './node'
import {visitAndMapImmutable, DataTypes} from '../visitor'
import {getStorageKey} from '../utils/storage-key'

export default function getDataForStore(query, ast, variables, inData, schema, typeInfo) {
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
