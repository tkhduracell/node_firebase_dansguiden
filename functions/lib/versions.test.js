/* eslint-env mocha */
const versions = require('./versions')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

chai.should()

// node_modules/.bin/mocha --reporter spec functions/lib/versions.test.js

describe('versions', () => {
  const version = versions.getLatest(() => {})

  it('should return none empty version', async () => {
    return (await version).name.should.not.be.empty
  })

  it('should return none empty lines', async () => {
    return (await version).lines.should.not.be.empty
  })

  it('should return none empty date', async () => {
    return (await version).date.should.not.be.empty
  })
})
