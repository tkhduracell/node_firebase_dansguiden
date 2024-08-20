

function delayed<T>(duration: number, t?: T): Promise<T | undefined> {
  return new Promise(((resolve,) => {
    setTimeout(() => resolve(t), duration)
  }))
}

export async function serialDelayed<T> (funcs: Promise<T>[], ms = 0, variance = 0): Promise<T[]> {
  const result = [] as T[]
  for (const p of funcs) {
    result.push(await p)
    await delayed(ms + Math.random() * variance * 2 - variance)
  }
  return result
}

export async function serialDelayedFns<T> (funcs: (() => Promise<T>)[], ms = 0, variance = 0): Promise<T[]> {
  const result = [] as T[]
  for (const p of funcs) {
    result.push(await p())
    await delayed(ms + Math.random() * variance * 2 - variance)
  }
  return result
}
