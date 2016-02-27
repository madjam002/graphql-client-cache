import {TypeInfo} from 'graphql/utilities'
import {visit, Kind} from 'graphql/language'
import {visitWithTypeInfo} from 'graphql/language/visitor'
import {GraphQLList} from 'graphql/type'
import Immutable from 'immutable'

import {ObjectTree} from './object-tree'
import {ImmutableBuilder} from './immutable-builder'
import {getVisitFn} from './visitor-util'

export {Types as DataTypes} from './object-tree'

export function isNode(maybeNode) {
  return maybeNode && typeof maybeNode.kind === 'string'
}

export function visitWithTree(query, ast, variables, tree, visitorFn, { schema, typeInfo, dataType }) {
  if (!typeInfo) typeInfo = new TypeInfo(schema)
  const objectTree = new ObjectTree(tree, ast, variables, dataType)

  const visitor = visitorFn({ objectTree, typeInfo })

  return visitTree(visitor, query, ast, variables, objectTree, typeInfo)
}

export function visitAndMapImmutable(query, ast, variables, tree, mapFnFactory, { schema, typeInfo, objectTree, dataType }) {
  if (!typeInfo) typeInfo = new TypeInfo(schema)
  if (!objectTree) objectTree = new ObjectTree(tree, ast, variables, dataType)
  const builder = new ImmutableBuilder(objectTree, typeInfo)

  const useKey = builder.useKey.bind(builder)

  const mapFn = mapFnFactory({ objectTree, typeInfo, useKey })

  const visitor = {
    Field: {
      enter(node) {
        const res = mapFn(...arguments)
        return builder.enter(node, res)
      },
      leave(node) {
        builder.leave(node)
      },
    },
    FragmentDefinition: {
      enter(node) {
        return null
      },
    },
    enterIndex(index) {
      builder.enterIndex(index)
    },
    leaveIndex() {
      builder.pop()
    },
  }

  visitTree(visitor, query, ast, variables, objectTree, typeInfo)

  return builder.get()
}

export function visitAndMap(query, ast, variables, tree, mapFnFactory, opts) {
  return visitAndMapImmutable(query, ast, variables, tree, mapFnFactory, opts).toJS()
}

export function visitTree(visitor, query, ast, variables, objectTree, typeInfo) {
  const treeVisitor = {
    enter(node) {
      const subTree = objectTree.enter(node)

      if (node.kind === Kind.FRAGMENT_SPREAD) {
        const name = node.name.value
        const fragments = query.definitions.filter(def => def.name && def.name.value === name)

        if (fragments.length > 0) {
          const fragment = fragments[0]

          visitTree(visitor, query, fragment.selectionSet, variables, objectTree, typeInfo)
        }
      }

      const currentType = typeInfo.getType()

      const fn = getVisitFn(visitor, node.kind, /* isLeaving */ false)

      if ((Array.isArray(subTree) || Immutable.List.isList(subTree)) && currentType instanceof GraphQLList) {
        if (fn) {
          fn.apply(visitor, arguments)
        }

        subTree.forEach((treePart, index) => {
          objectTree.enterIndex(index)
          if (visitor.enterIndex) visitor.enterIndex(index)

          visitTree(visitor, query, node.selectionSet, variables, objectTree, typeInfo)

          if (visitor.leaveIndex) visitor.leaveIndex(index)
          objectTree.pop()
        })

        const leaveFn = getVisitFn(visitor, node.kind, /* isLeaving */ true)
        if (leaveFn) {
          leaveFn.apply(visitor, arguments)
        }

        objectTree.leave(node)

        return false
      }

      if (fn) {
        const result = fn.apply(visitor, arguments)

        if (result !== undefined) {
          objectTree.leave(node)
        }
        return result
      }
    },
    leave(node) {
      const fn = getVisitFn(visitor, node.kind, /* isLeaving */ true)
      let result
      if (fn) {
        result = fn.apply(visitor, arguments)
      }

      objectTree.leave(node)

      return result
    },
  }

  return visit(ast, visitWithTypeInfo(typeInfo, treeVisitor))
}
