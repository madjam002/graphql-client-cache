import {TypeInfo} from 'graphql/utilities'
import {visit} from 'graphql/language'
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

export function visitWithTypes(ast, visitorFn, { schema }) {
  const typeInfo = new TypeInfo(schema)
  return visit(ast, visitWithTypeInfo(typeInfo, visitorFn(typeInfo)))
}

export function visitWithTypesAndTree(ast, tree, visitorFn, { schema }) {
  const typeInfo = new TypeInfo(schema)
  const objectTree = new ObjectTree(tree)

  const visitor = visitorFn({ objectTree, typeInfo })

  return visitTree(visitor, ast, objectTree, typeInfo)
}

export function visitAndMapImmutable(ast, variables, tree, mapFnFactory, { schema, typeInfo, objectTree, dataType }) {
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
    enterIndex(index) {
      builder.enterIndex(index)
    },
    leaveIndex() {
      builder.pop()
    },
  }

  visitTree(visitor, ast, objectTree, typeInfo)

  return builder.get()
}

export function visitAndMap(ast, variables, tree, mapFnFactory, opts) {
  return visitAndMapImmutable(ast, variables, tree, mapFnFactory, opts).toJS()
}

export function visitWithTree(visitor, typeInfo, objectTree) {
  return {
    enter(node) {
      const subTree = objectTree.enter(node)

      const currentType = typeInfo.getType()

      const fn = getVisitFn(visitor, node.kind, /* isLeaving */ false)

      if ((Array.isArray(subTree) || Immutable.List.isList(subTree)) && currentType instanceof GraphQLList) {
        if (fn) {
          fn.apply(visitor, arguments)
        }

        subTree.forEach((treePart, index) => {
          objectTree.enterIndex(index)
          if (visitor.enterIndex) visitor.enterIndex(index)

          visitTree(visitor, node.selectionSet, objectTree, typeInfo)

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
}

export function visitTree(visitor, ast, objectTree, typeInfo) {
  const treeVisitor = visitWithTree(visitor, typeInfo, objectTree)

  return visit(ast, visitWithTypeInfo(typeInfo, treeVisitor))
}
