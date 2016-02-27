export function getStorageKey(node, variables) {
  const baseName = node.name.value

  if (node.arguments.length === 0) {
    return baseName
  }

  const args = {}

  node.arguments.forEach(argument => {
    if (argument.value.kind === 'Variable') {
      args[argument.name.value] = variables[argument.value.name.value]
    } else {
      args[argument.name.value] = argument.value.value
    }
  })

  return baseName + '|' + JSON.stringify(args)
}
