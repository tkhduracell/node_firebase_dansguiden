import moment from 'moment'

import { EventsParser, InternalDanceEvent } from '../src/lib/danslogen/events'
import { month } from '../src/lib/utils/date'

describe('EventsParser Integration Test', () => {
  describe('.parse', () => {
    let subject = [] as InternalDanceEvent[]
    beforeAll(async () => {
      try {
        subject = await EventsParser.parse([month(moment().add(1, 'M')).toLocaleLowerCase()])
      } catch {
        fail("Unable to fetch real data, check your internet connection")
      }
    }, 30000)

    it('should return none empty array', () => {
      expect(subject).not.toHaveLength(0)
    })

    it('should return have no unknowns', () => {
      const output = subject.filter(e => e.type === 'unknown')
      expect(output).toHaveLength(0)
    })

    it.skip('should return have no null values', () => {
      const output = subject.filter(e => e.type !== 'unknown')
        .map(e => e.data)
      expect(output.length).toBeGreaterThan(0)
      output.forEach(e => {
        Object.keys(e).forEach(k => {
          expect(e).toHaveProperty(k, expect.stringMatching(/.+/))
        })
      })
    })

    it('should only have proper weekdays', () => {
      const output = subject
        .filter(e => e.type !== 'unknown')
        .map(d => d.data.weekday)
      expect(output.length).toBeGreaterThan(0)

      const weekdays = Array.from(new Set(output).values())
      for (const day of ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']) {
        expect(weekdays).toContain(day)
      }
    })

    it('should only have proper dates', () => {
      const output = subject.filter(e => e.type === 'event').map(d => d.data.date)
      const startofMonth = moment().startOf('month')

      expect(output.length).toBeGreaterThan(0)
      output.forEach(date => {
        expect(moment(date).isValid()).toStrictEqual(true)
        expect(moment(date).isSameOrAfter(startofMonth)).toStrictEqual(true)
      })
    })

    it('should only have proper HH.mm-HH.mm', () => {
      const output = subject.filter(e => e.type === 'event')
      const times = output.filter(e => e.data.time)

      expect(times.length).toBeGreaterThan(0)
      times.forEach(e => {
        expect(e.data.time).toMatch(/^\d{2}:\d{2}(-\d{2}:\d{2})?$/)
      })
    })
  })
})