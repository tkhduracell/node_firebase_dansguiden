/* eslint-env mocha */
const events = require('./events')
const chai = require('chai')

chai.should()
// node_modules/.bin/mocha --reporter spec functions/lib/events.test.js

describe('events', () => {
  const input = events.update(() => {})

  it('should return none empty array', async () => {
    const subject = await input
    return subject.should.have.length.greaterThan(1)
  })

  it('should return have no unknowns', async () => {
    const subject = await input
    const output = subject.filter(e => e.type === 'unknown')

    return output.should.have.length(0)
  })
})
