/* eslint-env mocha */
const versions = require('../lib/versions')
const cheerio = require('cheerio')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

chai.should()

// node_modules/.bin/mocha --reporter spec functions/lib/versions.test.js

describe('versions', () => {
  describe('with fake date', () => {
    const $ = cheerio.load(`
    <html>
      <h1>Page</h1>
      <div>
        <div>
            <div>
              <h2>What's New</h2>
            </div>
            <div>
              <div itemprop="description">
                <span jsslot=""> * Foo<br> * Bar</span>
              </div>
              <div>
                  <div role="button">
                    <span>
                        <span>Read more</span>
                    </span>
                  </div>
              </div>
              <div>
                  <div role="button">
                    <span>
                        <span>Collapse</span>
                    </span>
                  </div>
              </div>
            </div>
        </div>
        <div>
            <div>
              <div>Updated</div>
              <span>
                  <div><span>_____ XX, YYYY</span></div>
              </span>
            </div>
            <div>
              <div>Current Version</div>
              <span>
                  <div><span>x.x.x</span></div>
              </span>
            </div>
        </div>
      </div>
    </html>
    `)

    var version = {}
    before(async () => {
      version = await versions.extractContent($)
    })

    it('should return none empty version', () => {
      return version.name.should.be.equal('x.x.x')
    })

    it('should return none empty lines', async () => {
      return version.lines.should.be.eql(['Foo', 'Bar'])
    })

    it('should return none empty date', async () => {
      return version.date.should.be.equal('_____ XX, YYYY')
    })
  })

  describe('real integration', () => {
    var version = {}
    before(async () => {
      version = await versions.fetchLatestVersion(console.debug)
    })

    it('should have lines',  () => {
      return version.lines.should.not.empty
    })
  })
})
