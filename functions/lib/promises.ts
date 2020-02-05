

export function delayed<T>(value: T, duration: number): Promise<T> {
  return new Promise(function (resolve, reject) {
    setTimeout(() => resolve(value), duration)
  })
}

export function serial<T>(funcs: Promise<T>[]): Promise<T[]> {
  return funcs.reduce(async (chain: Promise<T[]>, currentTask: Promise<T>) => {
    const previousResults = await chain
    const currentResult = await currentTask
    return [...previousResults, currentResult]
  }, Promise.resolve([]))
}
