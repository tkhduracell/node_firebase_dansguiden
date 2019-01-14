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
          <div>
            <h2>What's New</h2>
          </div>
          <div>
            <div itemprop="description">
                <content> * Foo
                  <br> * Bar
                </content>
                <div></div>
            </div>
            <div>
                <div role="button">
                  <div></div>
                  <div></div>
                  <content>
                      <span>Read more</span>
                  </content>
                </div>
            </div>
            <div>
                <div role="button">
                  <div></div>
                  <div></div>
                  <content>
                      <span>Collapse</span>
                  </content>
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
  const version = versions.extractContent($)

  it('should return none empty version', async () => {
    return (await version).name.should.be.equal('x.x.x')
  })

  it('should return none empty lines', async () => {
    return (await version).lines.should.be.eql(['Foo', 'Bar'])
  })

  it('should return none empty date', async () => {
    return (await version).date.should.be.equal('_____ XX, YYYY')
  })
})
