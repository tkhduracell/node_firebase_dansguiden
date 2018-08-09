const events = require('./events')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const _ = require('lodash')
chai.use(chaiAsPromised)

chai.should()

describe('events', () => {
  const input = events.update(() => {})

  it('should return none empty array', () => {
    return input.should.eventually.have.length.greaterThan(1)
  })

  it('should return have no unknowns', () => {
    const output = input
      .then(x => x.filter(e => e.type === 'unknown'))

    return output.should.eventually.have.length(0)
  })
})
