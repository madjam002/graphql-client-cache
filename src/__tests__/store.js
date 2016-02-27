import Immutable from 'immutable'
import {parse} from 'graphql/language'
import {expect} from 'chai'
import Store from '../store'

import schema from '../../test/schema'

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
          }
        }
      `)

      const result = {
        user: {
          id: 10,
          name: 'John Smith',
          dateOfBirth: '2015-03-10 10:00',
        },
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

  })

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
          author: {
            id: '10',
            _type: 'NodeReference',
          },
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
          totalCount: 1,
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
          totalCount: 1,
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
          theTotalCount: 1,
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
          totalCount: 1,
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

  })

})
