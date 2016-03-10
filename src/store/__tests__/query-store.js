import Immutable from 'immutable'
import {parse} from 'graphql/language'
import {expect} from 'chai'
import Store from '../'

import schema from '../../../test/schema'

describe('Store', function () {

  describe('query', function () {

    beforeEach(function () {
      this.initialNodes = {
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

    it('should query the store and return plain JS objects', function () {
      const query = parse(`
        query {
          todos {
            totalCount
          }
        }
      `)

      const result = this.store.query(query, {}, { schema })

      expect(result).to.eql({
        todos: {
          totalCount: 2,
        },
      })
    })

    it('should query the store with nodes', function () {
      const query = parse(`
        query {
          todos {
            totalCount
          }
          user {
            id
            name
          }
        }
      `)

      const result = this.store.query(query, {}, { schema })

      expect(result).to.eql({
        todos: {
          totalCount: 2,
        },
        user: {
          id: '10',
          name: 'John Smith',
        },
      })
    })

    it('should respect aliases in the query', function () {
      const query = parse(`
        query {
          todos {
            theTotalCount: totalCount
          }
          wooUser: user {
            id
            fullName: name
          }
        }
      `)

      const result = this.store.query(query, {}, { schema })

      expect(result).to.eql({
        todos: {
          theTotalCount: 2,
        },
        wooUser: {
          id: '10',
          fullName: 'John Smith',
        },
      })
    })

    it('should be able to query connections', function () {
      const query = parse(`
        query {
          todos {
            totalCount
            edges {
              node {
                id
                user: author {
                  id
                  fullName: name
                }
                label
              }
            }
          }
        }
      `)

      const result = this.store.query(query, {}, { schema })

      expect(result).to.eql({
        todos: {
          totalCount: 2,
          edges: [{
            node: {
              id: '1',
              label: 'Initial todo',
              user: {
                id: '10',
                fullName: 'John Smith',
              },
            },
          }, {
            node: {
              id: '5',
              label: 'Initial todo #2',
              user: {
                id: '10',
                fullName: 'John Smith',
              },
            },
          }],
        },
      })
    })

    it('should be able to query fields with different call arguments', function () {
      const query = parse(`
        query($nameType: String!) {
          user {
            id
            name
            namePart: name(type: $nameType)
          }
          todos {
            totalCount
          }
          completed: todos(completed: true) {
            totalCount
          }
        }
      `)

      const result = this.store.query(query, {nameType: 'first'}, { schema })

      expect(result).to.eql({
        user: {
          id: '10',
          name: 'John Smith',
          namePart: 'John',
        },
        todos: {
          totalCount: 2,
        },
        completed: {
          totalCount: 0,
        },
      })

      const result2 = this.store.query(query, {nameType: 'last'}, { schema })

      expect(result2).to.eql({
        user: {
          id: '10',
          name: 'John Smith',
          namePart: 'Smith',
        },
        todos: {
          totalCount: 2,
        },
        completed: {
          totalCount: 0,
        },
      })
    })

  })

})
