/* eslint-env mocha */
const core = require('../core')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
chai.should()

// node_modules/.bin/mocha --reporter spec functions/core.test.js

describe('core', () => {
  function run (fn) {
    const log = (msg) => { console.log(msg) }
    return new Promise((resolve, reject) => {
      fn(log, resolve, reject)
    })
  }

  describe('index', () => {
    it('should return <html></html>', async () => {
      const tableMock = () => ({get: () => []})

      const a = await run(core.fetchIndex(tableMock))

      a.should.include('<!DOCTYPE html>')
      a.should.include('<h1>Dansguiden</h1>')
    })
  })

  describe('getVersion', () => {
    it('should return data', async () => {
      const data = [{foobar: true}]
      const tableMock = () => ({get: () => data})

      const a = core.fetchVersions(tableMock)()

      a.should.have.length(1)
      a.should.equal(data)
    })
  })

  describe('getEvents', () => {
    it('should return data', async () => {
      var data = {}
      data.from = () => data
      data.where = () => data
      data.orderBy = () => data
      data.limit = () => data
      data.get = () => ([{}])

      const tableMock = () => (data)

      const a = core.fetchEvents(tableMock)({
        from: 'a',
        to: 'b'
      })

      a.should.have.length(1)
      a.should.deep.equal([{}])
    })
  })
})
