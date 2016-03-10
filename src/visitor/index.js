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

  return visitTree(visitorFn, query, ast, variables, objectTree, typeInfo, schema)
}

export function visitAndMapImmutable(query, ast, variables, tree, mapFnFactory, { schema, typeInfo, objectTree, dataType }) {
  if (!typeInfo) typeInfo = new TypeInfo(schema)
  if (!objectTree) objectTree = new ObjectTree(tree, ast, variables, dataType)
  const builder = new ImmutableBuilder(objectTree, typeInfo)

  const useKey = builder.useKey.bind(builder)

  const visitorFn = ({ objectTree, typeInfo }) => {
    const mapFn = mapFnFactory({ objectTree, typeInfo, useKey })

    builder.pushTypeInfo(typeInfo)

    return {
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
      done() {
        builder.popTypeInfo()
      },
    }
  }

  visitTree(visitorFn, query, ast, variables, objectTree, typeInfo, schema)

  return builder.get()
}

export function visitAndMap(query, ast, variables, tree, mapFnFactory, opts) {
  return visitAndMapImmutable(query, ast, variables, tree, mapFnFactory, opts).toJS()
}

export function visitTree(visitorFn, query, ast, variables, objectTree, typeInfo, schema) {
  const visitor = visitorFn({ objectTree, typeInfo })

  const treeVisitor = {
    enter(node) {
      const subTree = objectTree.enter(node)

      if (node.kind === Kind.FRAGMENT_SPREAD) {
        const name = node.name.value
        const fragments = query.definitions.filter(def => def.name && def.name.value === name)

        if (fragments.length > 0) {
          const fragment = fragments[0]
          const childTypeInfo = new TypeInfo(schema)
          childTypeInfo._typeStack = [schema.getType(fragment.typeCondition.name.value)]
          visitTree(visitorFn, query, fragment.selectionSet, variables, objectTree, childTypeInfo, schema)
        }
      }

      const currentType = typeInfo.getType()

      const fn = getVisitFn(visitor, node.kind, /* isLeaving */ false)
      const leaveFn = getVisitFn(visitor, node.kind, /* isLeaving */ true)

      if ((Array.isArray(subTree) || Immutable.List.isList(subTree)) && currentType instanceof GraphQLList) {
        if (fn) {
          fn.apply(visitor, arguments)
        }

        subTree.forEach((treePart, index) => {
          objectTree.enterIndex(index)

          let enterResult
          if (fn) {
            enterResult = fn.call(visitor, node)
          }

          if (enterResult === false) {
            objectTree.pop()
            return
          }

          visitTree(visitorFn, query, node.selectionSet, variables, objectTree, typeInfo, schema)

          if (leaveFn) leaveFn.call(visitor, node)

          objectTree.pop()
        })

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

  const visitResult = visit(ast, visitWithTypeInfo(typeInfo, treeVisitor))

  if (visitor.done) visitor.done()

  return visitResult
}
