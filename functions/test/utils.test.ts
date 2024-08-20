import {removeNullValues} from '../src/lib/utils/utils'

describe('fn_helpers', () => {
  it('should return same year when not specified', () => {
    const obj = removeNullValues({a: 1, b: "", c: null, d: undefined})

    expect(obj).toStrictEqual({a: 1, b: ""})
  })
})
