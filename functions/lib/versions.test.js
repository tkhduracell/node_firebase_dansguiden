/* eslint-env mocha */
const versions = require('./versions')
const cheerio = require('cheerio')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

chai.should()

// node_modules/.bin/mocha --reporter spec functions/lib/versions.test.js

describe('versions', () => {

  const $ = cheerio.load(`
    <html>
      <h1>Page</h1>
      <div>
        <div>
          <h2>What's New</h2>
        </div>
        <content>* Foobar</content>
      </div>
      <div>
        <div>Current Version</div>
          <span>
            <div>
              <span>2.2.23</span>
            </div>
          </span>
        </div>
        <div>Updated</div>
          <span>
            <div>
              <span>August 13, 2018</span>
            </div>
          </span>
        </div>
      </div>
    </html>
  `)
  const version = versions.extractContent($)

  it('should return none empty version', async () => {
    return (await version).name.should.be.equal('2.2.23')
  })

  it('should return none empty lines', async () => {
    return (await version).lines.should.be.eql(['Foobar'])
  })

  it('should return none empty date', async () => {
    return (await version).date.should.be.equal('August 13, 2018')
  })
})
