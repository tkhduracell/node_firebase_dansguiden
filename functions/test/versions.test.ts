import { fetchLatestVersion, extractContent, Version } from '../lib/versions'
import cheerio from 'cheerio'
import {promisify} from 'util'
import fs from 'fs'

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

  describe('with fake data', () => {
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
    beforeAll(async () => {
      version = await extractContent($)
    })

    it('should return specific version', () => {
      expect(version.name).toStrictEqual('2.9.0')
    })

    it('should return specific lines', async () => {
      expect(version.lines).toStrictEqual(['Foo', 'Bar'])
    })

    it('should return spoecific date', async () => {
      expect(version.date).toStrictEqual('March 13, 2019')
    })
  })

  describe('with sample data', () => {
    let version = {} as Version
    beforeAll(async () => {
      const html = await readFile('test/files/playstore-2020-02-08.html')
      version = await extractContent(cheerio.load(html))
    })

    it('should return specific version', () => {
      expect(version.name).toStrictEqual('2.3.4')
    })

    it('should return specific lines', async () => {
      expect(version.lines).toStrictEqual(['Reducerat antalet omladdningar'])
    })

    it('should return spoecific date', async () => {
      expect(version.date).toStrictEqual('January 28, 2019')
    })
  })

  describe.skip('with real site', () => {
    let version = {} as Version
    beforeAll(async () => {
      version = await fetchLatestVersion()
    })

    it('should have non empty name', () => {
      expect(version.name).not.toBeTruthy()
    })

    it('should have non empty date', () => {
      expect(version.date).not.toBeTruthy()
    })

    it('should have non empty html', () => {
      expect(version.html).not.toBeTruthy()
    })

    it('should have lines as array', () => {
      expect(version.lines).toBeInstanceOf(Array)
    })
  })

})
