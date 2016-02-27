import {parse} from 'graphql/language'
import {isLeafType} from 'graphql/type'
import {expect} from 'chai'
import Immutable from 'immutable'
import {visitWithTree, visitAndMapImmutable} from '../visitor'

import schema from '../../../test/schema'

describe('visitWithTree', function () {

  it('should walk a query along with type info and any given object tree', function () {
    const query = parse(`
      query {
        todos {
          edges {
            node {
              ...on Todo {
                id
                label
                author {
                  ...user
                }
              }
            }
          }
          totalCount
        }
      }

      fragment user on User {
        id
        name
      }
    `)

    const tree = {
      todos: {
        totalCount: 3,
        edges: [{
          node: {
            id: 3,
            label: 'Test 1',
            author: {
              id: 10,
              name: 'John Smith',
            },
          },
        }, {
          node: {
            id: 4,
            label: 'Test 2',
            author: {
              id: 10,
              name: 'John Smith',
            },
          },
        }],
      },
    }

    const calls = []

    visitWithTree(query, query, {}, tree, ({ objectTree, typeInfo }) => ({
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
      { type: 'enter', field: 'author', value: tree.todos.edges[0].node.author },
      { type: 'enter', field: 'id', value: tree.todos.edges[0].node.author.id },
      { type: 'leave', field: 'id', value: tree.todos.edges[0].node.author.id },
      { type: 'enter', field: 'name', value: tree.todos.edges[0].node.author.name },
      { type: 'leave', field: 'name', value: tree.todos.edges[0].node.author.name },
      { type: 'leave', field: 'author', value: tree.todos.edges[0].node.author },
      { type: 'leave', field: 'node', value: tree.todos.edges[0].node },

      { type: 'enter', field: 'node', value: tree.todos.edges[1].node },
      { type: 'enter', field: 'id', value: tree.todos.edges[1].node.id },
      { type: 'leave', field: 'id', value: tree.todos.edges[1].node.id },
      { type: 'enter', field: 'label', value: tree.todos.edges[1].node.label },
      { type: 'leave', field: 'label', value: tree.todos.edges[1].node.label },
      { type: 'enter', field: 'author', value: tree.todos.edges[0].node.author },
      { type: 'enter', field: 'id', value: tree.todos.edges[0].node.author.id },
      { type: 'leave', field: 'id', value: tree.todos.edges[0].node.author.id },
      { type: 'enter', field: 'name', value: tree.todos.edges[0].node.author.name },
      { type: 'leave', field: 'name', value: tree.todos.edges[0].node.author.name },
      { type: 'leave', field: 'author', value: tree.todos.edges[0].node.author },
      { type: 'leave', field: 'node', value: tree.todos.edges[1].node },

      { type: 'leave', field: 'edges', value: tree.todos.edges },
      { type: 'enter', field: 'totalCount', value: tree.todos.totalCount },
      { type: 'leave', field: 'totalCount', value: tree.todos.totalCount },
      { type: 'leave', field: 'todos', value: tree.todos },

      { type: 'enter', field: 'id', value: undefined },
      { type: 'leave', field: 'id', value: undefined },
      { type: 'enter', field: 'name', value: undefined },
      { type: 'leave', field: 'name', value: undefined },
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
    const result = visitAndMapImmutable(this.query, this.query, {}, this.tree, ({ objectTree, typeInfo }) =>
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

  it('should walk the tree with data and follow inline fragments', function () {
    const query = parse(`
      query {
        todos {
          edges {
            node {
              ...on Todo {
                id
                author {
                  ...on User {
                    id
                    name
                  }
                }
                label
              }
            }
            cursor
          }
          totalCount
        }
      }
    `)

    const result = visitAndMapImmutable(query, query, {}, this.tree, ({ objectTree, typeInfo }) =>
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

  it('should walk the tree with data and follow fragments', function () {
    const query = parse(`
      query {
        todos {
          edges {
            node {
              ...todo
            }
            cursor
          }
          totalCount
        }
      }

      fragment todo on Todo {
        id
        author {
          ...author
        }
        label
      }

      fragment author on User {
        id
        name
      }
    `)

    const result = visitAndMapImmutable(query, query, {}, this.tree, ({ objectTree, typeInfo }) =>
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
    const result = visitAndMapImmutable(this.query, this.query, {}, this.tree, ({ objectTree, typeInfo }) =>
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
