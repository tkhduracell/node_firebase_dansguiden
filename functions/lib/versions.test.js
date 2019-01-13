/* eslint-env mocha */
const versions = require('./versions')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

chai.should()

// node_modules/.bin/mocha --reporter spec functions/lib/versions.test.js

describe('versions', () => {
  const input = versions.getLatest(console.log)

  it('should return none empty version', async () => {
    const x = await input
    return x.name.should.not.be.empty
  })

  it('should return none empty lines', async () => {
    const x = await input
    return x.lines.should.not.be.empty
  })

  it('should return none empty date', async () => {
    const x = await input
    return x.date.should.not.be.empty
  })
})
