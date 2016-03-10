import Immutable from 'immutable'
import {parse} from 'graphql/language'
import {expect} from 'chai'
import Store from '../'

import schema from '../../../test/schema'

describe('Store', function () {

  describe('acceptQueryResult', function () {

    beforeEach(function () {
      this.initialNodes = {
        '1': {
          id: '1',
          label: 'Initial todo',
        },
        '5': {
          id: '5',
          label: 'Initial todo #2',
        },
      }

      this.initialEdges = [{
        node: {
          id: '1',
          _type: 'NodeReference',
        },
      }, {
        node: {
          id: '5',
          _type: 'NodeReference',
        },
      }]

      this.initialTodos = {
        totalCount: 1,
        pageInfo: {
          hasNextPage: false,
        },
        edges: this.initialEdges,
      }

      this.store = new Store({
        nodes: Immutable.fromJS({
          ...this.initialNodes,
        }),
        data: Immutable.fromJS({
          todos: this.initialTodos,
        }),
      })
    })

    it('should take a simple query result and query', function () {
      const query = parse(`
        query {
          user {
            id
            name
            dateOfBirth
            friends { id }
          }
        }
      `)

      const result = {
        user: {
          id: '10',
          name: 'John Smith',
          dateOfBirth: '2015-03-10 10:00',
          friends: [
            { id: '11' },
            { id: '12' },
            { id: '13' },
            { id: '14' },
            { id: '15' },
            { id: '16' },
          ],
        },
      }

      const updatedStore = this.store.acceptQueryResult(result, query, {}, { schema })

      expect(updatedStore.toJS()).to.eql({
        nodes: {
          ...this.initialNodes,
          '10': {
            id: '10',
            name: 'John Smith',
            dateOfBirth: '2015-03-10 10:00',
            friends: [
              { id: '11', _type: 'NodeReference' },
              { id: '12', _type: 'NodeReference' },
              { id: '13', _type: 'NodeReference' },
              { id: '14', _type: 'NodeReference' },
              { id: '15', _type: 'NodeReference' },
              { id: '16', _type: 'NodeReference' },
            ],
          },
          '11': { id: '11' },
          '12': { id: '12' },
          '13': { id: '13' },
          '14': { id: '14' },
          '15': { id: '15' },
          '16': { id: '16' },
        },
        data: {
          todos: this.initialTodos,
          user: {
            id: '10',
            _type: 'NodeReference',
          },
        },
      })
    })

    it('should take a query result and query', function () {
      const query = parse(`
        query {
          todos {
            totalCount
            edges {
              node {
                id
                author {
                  id
                  name
                }
                label
              }
            }
          }
        }
      `)

      const result = {
        todos: {
          totalCount: 3,
          edges: [{
            node: {
              id: '3',
              author: {
                id: '10',
                name: 'John Smith',
              },
              label: 'Test 1',
            },
          }, {
            node: {
              id: '4',
              author: {
                id: '10',
                name: 'John Smith',
              },
              label: 'Test 2',
            },
          }],
        },
      }

      const updatedStore = this.store.acceptQueryResult(result, query, {}, { schema })

      expect(updatedStore.toJS()).to.eql({
        nodes: {
          ...this.initialNodes,
          '3': {
            id: '3',
            author: {
              id: '10',
              _type: 'NodeReference',
            },
            label: 'Test 1',
          },
          '4': {
            id: '4',
            author: {
              id: '10',
              _type: 'NodeReference',
            },
            label: 'Test 2',
          },
          '10': {
            id: '10',
            name: 'John Smith',
          },
        },
        data: {
          todos: {
            totalCount: 3,
            pageInfo: {
              hasNextPage: false,
            },
            edges: [{
              node: {
                id: '3',
                _type: 'NodeReference',
              },
            }, {
              node: {
                id: '4',
                _type: 'NodeReference',
              },
            }],
          },
        },
      })
    })

    it('should ignore aliases with are an identical call', function () {
      const query = parse(`
        query {
          user {
            id
            name
            anotherName: name
            oneMoreName: name
            dateOfBirth
          }
          currentTime
          actualTime: currentTime
        }
      `)

      const result = {
        user: {
          id: 10,
          name: 'John Smith',
          anotherName: 'John Smith',
          oneMoreName: 'John Smith',
          dateOfBirth: '2015-03-10 10:00',
        },
        currentTime: '2016-01-01 00:00',
        actualTime: '2016-01-01 00:00',
      }

      const updatedStore = this.store.acceptQueryResult(result, query, {}, { schema })

      expect(updatedStore.toJS()).to.eql({
        nodes: {
          ...this.initialNodes,
          '10': {
            id: 10,
            name: 'John Smith',
            dateOfBirth: '2015-03-10 10:00',
          },
        },
        data: {
          todos: this.initialTodos,
          user: {
            id: 10,
            _type: 'NodeReference',
          },
          currentTime: '2016-01-01 00:00',
        },
      })
    })

    it('should store multiple calls with different arguments and variables', function () {
      const query = parse(`
        query($nameType: String!) {
          user {
            id
            name
            anotherName: name(type: $nameType)
            dateOfBirth
          }
          todos {
            totalCount
          }
          completed: todos(completed: true) {
            totalCount
          }
          currentTime
          actualTime: currentTime
        }
      `)

      const variables = { nameType: 'first' }

      const result = {
        user: {
          id: 10,
          name: 'John Smith',
          anotherName: 'John',
          dateOfBirth: '2015-03-10 10:00',
        },
        todos: {
          totalCount: 6,
        },
        completed: {
          totalCount: 2,
        },
        currentTime: '2016-01-01 00:00',
        actualTime: '2016-01-01 00:00',
      }

      const updatedStore = this.store.acceptQueryResult(result, query, variables, { schema })

      expect(updatedStore.toJS()).to.eql({
        nodes: {
          ...this.initialNodes,
          '10': {
            id: 10,
            name: 'John Smith',
            'name|{"type":"first"}': 'John',
            dateOfBirth: '2015-03-10 10:00',
          },
        },
        data: {
          todos: {
            edges: this.initialTodos.edges,
            pageInfo: this.initialTodos.pageInfo,
            totalCount: 6,
          },
          'todos|{"completed":true}': {
            totalCount: 2,
          },
          user: {
            id: 10,
            _type: 'NodeReference',
          },
          currentTime: '2016-01-01 00:00',
        },
      })
    })

    it('should work with fragments and inline fragments', function () {
      const query = parse(`
        query {
          todos {
            totalCount
            edges {
              node {
                ...todo
              }
            }
          }
        }

        fragment todo on Todo {
          id
          author {
            ...on User {
              id
              name
            }
          }
          label
        }
      `)

      const result = {
        todos: {
          totalCount: 3,
          edges: [{
            node: {
              id: '3',
              author: {
                id: '10',
                name: 'John Smith',
              },
              label: 'Test 1',
            },
          }, {
            node: {
              id: '4',
              author: {
                id: '10',
                name: 'John Smith',
              },
              label: 'Test 2',
            },
          }],
        },
      }

      const updatedStore = this.store.acceptQueryResult(result, query, {}, { schema })

      expect(updatedStore.toJS()).to.eql({
        nodes: {
          ...this.initialNodes,
          '3': {
            id: '3',
            author: {
              id: '10',
              _type: 'NodeReference',
            },
            label: 'Test 1',
          },
          '4': {
            id: '4',
            author: {
              id: '10',
              _type: 'NodeReference',
            },
            label: 'Test 2',
          },
          '10': {
            id: '10',
            name: 'John Smith',
          },
        },
        data: {
          todos: {
            totalCount: 3,
            pageInfo: {
              hasNextPage: false,
            },
            edges: [{
              node: {
                id: '3',
                _type: 'NodeReference',
              },
            }, {
              node: {
                id: '4',
                _type: 'NodeReference',
              },
            }],
          },
        },
      })
    })

    it('should handle null values', function () {
      const query = parse(`
        query {
          user {
            id
            name
          }
        }
      `)

      const result = {
        user: null,
      }

      const updatedStore = this.store.acceptQueryResult(result, query, {}, { schema })

      expect(updatedStore.toJS()).to.eql({
        nodes: {
          ...this.initialNodes,
        },
        data: {
          todos: this.initialTodos,
          user: null,
        },
      })
    })

  })

})
