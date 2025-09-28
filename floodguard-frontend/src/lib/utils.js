export function cn(...args) {
  return args
    .flatMap((item) => {
      if (!item) return []
      if (typeof item === 'string') return item.split(' ')
      if (Array.isArray(item)) return item
      if (typeof item === 'object') {
        return Object.entries(item)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
      }
      return []
    })
    .filter(Boolean)
    .join(' ')
}

