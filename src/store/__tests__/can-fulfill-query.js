import Immutable from 'immutable'
import {parse} from 'graphql/language'
import {expect} from 'chai'
import Store from '../'

import schema from '../../../test/schema'

describe('Store', function () {

  describe('canFulfillQuery', function () {

    beforeEach(function () {
      this.initialNodes = {
        '0': {
          id: '0',
          label: 'Initial todo',
          author: {
            id: '10',
            _type: 'NodeReference',
          },
        },
        '1': {
          id: '1',
          label: 'Initial todo',
          author: {
            id: '10',
            _type: 'NodeReference',
          },
        },
        '5': {
          id: '5',
          label: 'Initial todo #2',
          author: {
            id: '10',
            _type: 'NodeReference',
          },
        },
        '10': {
          id: '10',
          name: 'John Smith',
          'name|{"type":"first"}': 'John',
          'name|{"type":"last"}': 'Smith',
        },
      }

      this.initialEdges = [{
        node: {
          id: '0',
          _type: 'NodeReference',
        },
      }, {
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
        totalCount: 2,
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
          'todos|{"completed":true}': {
            totalCount: 0,
          },
          user: {
            id: '10',
            _type: 'NodeReference',
          },
        }),
      })
    })

    it('should return true when store contains all the data for the query', function () {
      const query = parse(`
        query {
          todos {
            totalCount
            edges {
              node {
                id
                label
                author {
                  id
                  name
                }
              }
            }
          }
          completedTodos: todos(completed: true) {
            totalCount
          }
        }
      `)

      const result = this.store.canFulfillQuery(query, {}, { schema })

      expect(result).to.be.true
    })

    it('should return false when store doesn\'t contains all the data for the query', function () {
      const query = parse(`
        query {
          todos(completed: false) {
            totalCount
          }
        }
      `)

      const result = this.store.canFulfillQuery(query, {}, { schema })

      expect(result).to.be.false
    })

    it('should return true when dealing with null values appropriately', function () {
      const query = parse(`
        query {
          user {
            id
            name
          }
        }
      `)

      const store = new Store({
        data: Immutable.fromJS({
          user: null,
        }),
      })

      const result = store.canFulfillQuery(query, {}, { schema })

      expect(result).to.be.true
    })

  })

})
