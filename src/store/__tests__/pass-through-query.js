import Immutable from 'immutable'
import {parse, print} from 'graphql/language'
import {expect} from 'chai'
import Store from '../'

import schema from '../../../test/schema'

describe('Store', function () {

  describe('passThroughQuery', function () {

    beforeEach(function () {
      this.store = new Store({
        nodes: Immutable.fromJS({
          '10': {
            id: '10',
            dateOfBirth: '2015-10-10 10:00',
          },
        }),
        data: Immutable.fromJS({
          todos: {
            totalCount: 4,
          },
          'todos|{"completed":false}': {
            totalCount: 3,
          },
          user: {
            id: '10',
            _type: 'NodeReference',
          },
        }),
      })
    })

    it('should strip query fields for fields that already exist in the store', function () {
      const query = parse(`
        query {
          todos {
            totalCount
            edges {
              node {
                id
                label
                author {
                  ...author
                }
              }
            }
          }
          completedTodos: todos(completed: true) {
            totalCount
          }
          incompleteTodos: todos(completed: false) {
            totalCount
          }
          user {
            ... on User {
              id
              ...user
            }
          }
        }

        fragment user on User {
          dateOfBirth # todo currently doesn't strip fields off fragments
          name
        }

        fragment author on User {
          id
          name
        }
      `)

      const result = this.store.passThroughQuery(query, {}, { schema })

      expect(print(result)).to.equal(`{
  todos {
    edges {
      node {
        id
        label
        author {
          ...author
        }
      }
    }
  }
  completedTodos: todos(completed: true) {
    totalCount
  }
  user {
    ... on User {
      ...user
    }
  }
}

fragment user on User {
  dateOfBirth
  name
}

fragment author on User {
  id
  name
}
`)
    })

  })

})
