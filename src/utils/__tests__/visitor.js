import {parse} from 'graphql/language'
import {isLeafType} from 'graphql/type'
import {expect} from 'chai'
import Immutable from 'immutable'
import {visitWithTypesAndTree, visitAndMapImmutable} from '../visitor'

import schema from '../../../test/schema'

describe('visitWithTypesAndTree', function () {

  it('should walk a query along with type info and any given object tree', function () {
    const query = parse(`
      query {
        todos {
          edges {
            node {
              id
              label
            }
          }
          totalCount
        }
      }
    `)

    const tree = {
      todos: {
        totalCount: 3,
        edges: [{
          node: {
            id: 3,
            label: 'Test 1',
          },
        }, {
          node: {
            id: 4,
            label: 'Test 2',
          },
        }],
      },
    }

    const calls = []

    visitWithTypesAndTree(query, tree, ({ objectTree, typeInfo }) => ({
      Field: {
        enter: node => {
          calls.push({ type: 'enter', field: node.name.value, value: objectTree.getCurrent() })
        },
        leave: node => {
          calls.push({ type: 'leave', field: node.name.value, value: objectTree.getCurrent() })
        },
      },
    }), { schema })

    expect(calls).to.eql([
      { type: 'enter', field: 'todos', value: tree.todos },
      { type: 'enter', field: 'edges', value: tree.todos.edges },
      { type: 'enter', field: 'node', value: tree.todos.edges[0].node },
      { type: 'enter', field: 'id', value: tree.todos.edges[0].node.id },
      { type: 'leave', field: 'id', value: tree.todos.edges[0].node.id },
      { type: 'enter', field: 'label', value: tree.todos.edges[0].node.label },
      { type: 'leave', field: 'label', value: tree.todos.edges[0].node.label },
      { type: 'leave', field: 'node', value: tree.todos.edges[0].node },
      { type: 'enter', field: 'node', value: tree.todos.edges[1].node },
      { type: 'enter', field: 'id', value: tree.todos.edges[1].node.id },
      { type: 'leave', field: 'id', value: tree.todos.edges[1].node.id },
      { type: 'enter', field: 'label', value: tree.todos.edges[1].node.label },
      { type: 'leave', field: 'label', value: tree.todos.edges[1].node.label },
      { type: 'leave', field: 'node', value: tree.todos.edges[1].node },
      { type: 'leave', field: 'edges', value: tree.todos.edges },
      { type: 'enter', field: 'totalCount', value: tree.todos.totalCount },
      { type: 'leave', field: 'totalCount', value: tree.todos.totalCount },
      { type: 'leave', field: 'todos', value: tree.todos },
    ])
  })

})

describe('visitAndMapImmutable', function () {

  beforeEach(function () {
    this.query = parse(`
      query {
        todos {
          edges {
            node {
              id
              author {
                id
                name
              }
              label
            }
            cursor
          }
          totalCount
        }
      }
    `)

    this.tree = {
      todos: {
        totalCount: 3,
        edges: [{
          node: {
            id: 3,
            author: {
              id: 10,
              name: 'John Smith',
            },
            label: 'Test 1',
          },
          cursor: 3,
        }, {
          node: {
            id: 4,
            label: 'Test 2',
            author: {
              id: 10,
              name: 'John Smith',
            },
          },
          cursor: 4,
        }, {
          node: {
            id: 5,
            label: 'Test 3',
            author: {
              id: 11,
              name: 'Jane Smith',
            },
          },
          cursor: 5,
        }],
      },
    }
  })

  it('should walk the tree with data and return an immutable map', function () {
    const result = visitAndMapImmutable(this.query, {}, this.tree, ({ objectTree, typeInfo }) =>
      node => {
        const data = objectTree.getCurrent()

        if (isLeafType(typeInfo.getType())) {
          return data
        }
      }
    , { schema })

    expect(result.toJS()).to.eql({
      todos: this.tree.todos,
    })
  })

  it('should walk the tree with data and respect map function result', function () {
    const result = visitAndMapImmutable(this.query, {}, this.tree, ({ objectTree, typeInfo }) =>
      node => {
        const data = objectTree.getCurrent()

        if (data.id) {
          return Immutable.Map({
            id: data.id,
            _type: 'Node',
          })
        }

        if (isLeafType(typeInfo.getType())) {
          return data
        }
      }
    , { schema })

    expect(result.toJS()).to.eql({
      todos: {
        totalCount: 3,
        edges: [{
          node: {
            id: 3,
            _type: 'Node',
          },
          cursor: 3,
        }, {
          node: {
            id: 4,
            _type: 'Node',
          },
          cursor: 4,
        }, {
          node: {
            id: 5,
            _type: 'Node',
          },
          cursor: 5,
        }],
      },
    })
  })

})
