const events = require('./versions')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const _ = require('lodash')
chai.use(chaiAsPromised)

chai.should()

// node_modules/.bin/mocha --reporter spec functions/lib/versions.test.js

describe('versions', () => {
  const input = events.getLatest(() => {})

  it('should return none empty version', () => {
    return input.then(data => data.name)
      .should.eventually.not.be.empty
  })

  it('should return none empty lines', () => {
    return input.then(data => data.lines)
      .should.eventually.not.be.empty
  })

  it('should return none empty date', () => {
    return input.then(data => data.date)
      .should.eventually.not.be.empty
  })

})
