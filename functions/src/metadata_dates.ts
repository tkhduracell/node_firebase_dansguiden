import { counter, Counter } from "./lib/counter"
import { DanceEvent } from "./lib/types"


export type MetadataDatesRecord = {
    counts?: Promise<Record<string, Counter>>,
}


export class MetadataDates {
    static build(events: DanceEvent[]): MetadataDatesRecord {
        return {
            counts: counter('date')(events)
        }
    }
}