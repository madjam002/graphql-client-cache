import Immutable from 'immutable'

export function isNode(type, data) {
  if (!data) return false
  const id = data.get ? data.get('id') : data.id

  // TODO check graphql type?
  return id != null
}

export const NodeReference = Immutable.Record({
  id: null,
  _type: 'NodeReference',
})
