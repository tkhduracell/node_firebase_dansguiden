import { fetchLatestVersion, extractContent, Version } from '../lib/versions'
import cheerio from 'cheerio'
import chai from 'chai'
import {promisify} from 'util'
import fs from 'fs'
import 'mocha'

chai.should()

const readFile = promisify(fs.readFile)

const whatsnew = `
  <div class="W4P4ne ">
    <div class="wSaTQd">
        <h2 class="Rm6Gwb">What's New</h2>
    </div>
    <div jscontroller="IsfMIf" jsaction="rcuQ6b:npT2md" class="PHBdkd" data-content-height="144" jsshadow="">
        <div jsname="bN97Pc" class="DWPxHb" itemprop="description"><span jsslot=""> * Foo<br> *
                Bar</span>
            <div jsname="WgKync" class="uwAgLc f3Fr9d"></div>
        </div>
    </div>
  </div>
`
const meta = `
<div class="IxB2fe">
    <div class="hAyfc">
        <div class="BgcNfc">Updated</div><span class="htlgb">
            <div class="IQ1z0d"><span class="htlgb">March 13, 2019</span></div>
        </span>
    </div>
    <div class="hAyfc">
        <div class="BgcNfc">Current Version</div><span class="htlgb">
            <div class="IQ1z0d"><span class="htlgb">2.9.0</span></div>
        </span>
    </div>
</div>
`
describe('versions', () => {

  context('with fake data', () => {
    const $ = cheerio.load(`
    <html>
      <h1>Page</h1>
      <div>
        ${whatsnew}
        ${meta}
      </div>
    </html>
    `)

    let version = {} as Version
    before(async () => {
      version = await extractContent($)
    })

    it('should return specific version', () => {
      return version.name.should.be.equal('2.9.0')
    })

    it('should return specific lines', async () => {
      return version.lines.should.be.eql(['Foo', 'Bar'])
    })

    it('should return spoecific date', async () => {
      return version.date.should.be.equal('March 13, 2019')
    })
  })

  context('with sample data', () => {
    let version = {} as Version
    before(async () => {
      const html = await readFile('test/files/playstore-2020-02-08.html')
      version = await extractContent(cheerio.load(html))
    })

    it('should return specific version', () => {
      return version.name.should.be.equal('2.3.4')
    })

    it('should return specific lines', async () => {
      return version.lines.should.be.eql(['Reducerat antalet omladdningar'])
    })

    it('should return spoecific date', async () => {
      return version.date.should.be.equal('January 28, 2019')
    })
  })

  context.skip('with real site', () => {
    let version = {} as Version
    before(async () => {
      version = await fetchLatestVersion(() => { })
    })

    it('should have non empty name', () => {
      return version.name.should.not.empty
    })

    it('should have non empty date', () => {
      return version.date.should.not.empty
    })

    it('should have non empty html', () => {
      return version.html.should.not.empty
    })

    it('should have lines as array', () => {
      return version.lines.should.be.a.instanceof(Array)
    })
  })

})
