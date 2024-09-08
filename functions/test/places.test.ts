import {load} from 'cheerio'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)

import { PlacessParser } from '../src/lib/danslogen/places'

describe('places.ts', () => {
  describe('read fixture html', () => {

    it('should have output', async () => {
      const payload = await readFile(path.join(__dirname, 'files', 'places-2022-11-24.html'), { encoding: 'utf-8' })
      const $ = load(payload)

      const out = PlacessParser.extractTableRows($)

      expect(out).toHaveLength(4)

      expect(out).toHaveProperty('[1]', {
        "county": "Tidaholm",
        "city": "Tidaholm",
        "name": "4an Tidaholm",
        "region": "Västra Götaland",
        "website_url": "http://fyranhuset.se/",
      })

      expect(out).toHaveProperty('[2].facebook_url', "https://www.facebook.com/alcatrazlulea/")
      expect(out).toHaveProperty('[3].website_url', "http://www.vastervik.se/overumsfritidsgard")
    })
  })
})
