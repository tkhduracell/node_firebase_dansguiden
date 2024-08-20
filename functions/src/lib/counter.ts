import moment from "moment"
import { DanceEvent } from "./types"
import _ from "lodash"

export type Histogram = {
  in_total: number;
  in_7_Days: number;
  in_30_days: number;
  in_90_days: number;
  in_180_days: number;
}

export type Counter = {
  total: number;
}

export function counter(key: keyof DanceEvent): (values: DanceEvent[]) => Promise<Record<string, Counter>> {
  return async (values: DanceEvent[]) => {
    const counts = _.countBy(values.map(e => e[key]))
    return _.merge(_.mapValues(counts, o => ({ total: o })))
  }
}

export function histogram(key: keyof DanceEvent): (values: DanceEvent[]) => Promise<Record<string, Histogram>> {
  return async (values: DanceEvent[]) => {

    const inDays = (days: number) => {
      const limit = moment().utc().startOf('day').add(days, 'days')
      return (e: { date: string }) => {
        return moment(e.date, moment.ISO_8601).isBefore(limit)
      }
    }

    const in7Days = _.countBy(values.filter(inDays(7)), e => e[key])
    const in30Days = _.countBy(values.filter(inDays(30)), e => e[key])
    const in90Days = _.countBy(values.filter(inDays(90)), e => e[key])
    const in180Days = _.countBy(values.filter(inDays(180)), e => e[key])
    const inTotal = _.countBy(values, e => e[key])

    const out = _.merge(
      _.mapValues(inTotal, o => ({ in_total: o })),
      _.mapValues(in7Days, o => ({ in_7_days: o })),
      _.mapValues(in30Days, o => ({ in_30_days: o })),
      _.mapValues(in90Days, o => ({ in_90_days: o })),
      _.mapValues(in180Days, o => ({ in_180_days: o })),
    )
    return out as unknown as Record<string, Histogram>
  }
}