import {should} from 'chai'
import {removeNullValues} from '../lib/utils'
should()

describe('fn_helpers', () => {
  context("", () => {
    it('should return same year when not specified', () => {
      const obj = removeNullValues({a: 1, b: "", c: null, d: undefined})

      obj.should.deep.equal({a: 1, b: ""})
    })
  })
})
