import { counter, Counter } from "./lib/counter"
import { DanceEvent } from "./lib/types"


export type MetadataDatesRecordBuilder = {
    counts: Promise<Record<string, Counter>>,
}

export type MetadataDatesRecord = {
    counts: Record<string, Counter>
}

export class MetadataDates {
    static build(events: DanceEvent[]): MetadataDatesRecordBuilder {
        return {
            counts: counter('date')(events)
        }
    }
}