import _ from "lodash"
import { Histogram, histogram } from "./lib/counter"
import { DanceEvent } from "./lib/types"
import { Bands } from "./lib/spotify"

type SpotifyInfo = {
    id?: string,
    name?: string,
    image_small?: string
    image_large?: string
}

type Override = Pick<SpotifyInfo,'image_large' | 'image_small'>

export type MetadataBandsRecord = {
    counts: Promise<Record<string, Histogram>>,
    spotify?: Promise<Record<string, SpotifyInfo>>
    override?: Promise<Record<string, Override>>
}


export type SpotifySecrets = { client_id: string; client_secret: string }

function spotifyApi(secrets: SpotifySecrets): (values: DanceEvent[]) => Promise<Record<string, SpotifyInfo>> {
    return async (values: DanceEvent[]) => {
        const bands = values.map(e => _.pick(e, 'band'))

        const out: Record<string, SpotifyInfo> = {}
        for (const { band } of _.uniqBy(bands, p => p.band)) {
            const { id, name, images } = await Bands.getArtist(secrets, band) ?? {}
            out[band] = _.omitBy({
                id: id,
                name: name,
                image_small: _.minBy(images, i => Math.abs(64 - (i.width ?? Number.MAX_VALUE)))?.url,
                image_large: _.minBy(images, i => Math.abs(640 - (i.width ?? Number.MAX_VALUE)))?.url
            }, _.isUndefined)
            await new Promise((resolve) => setTimeout(resolve, 500))
        }
        return out
    }
}

export class MetadataBands {
    static build(events: DanceEvent[], secrets: SpotifySecrets): MetadataBandsRecord {
        return {
            counts: histogram('band')(events),
            spotify: spotifyApi(secrets)(events),
            override: overrides()(events) 
        }
    }
}

const overridesMap: Record<string, Override>= {
    'Strike': { 
        image_large: 'https://cdn.spfseniorerna.se/publishedmedia/rphtix6jzbrkpfxxdcu9/strikeIMG_4922_B-1.webp',
        image_small: 'https://cdn.spfseniorerna.se/publishedmedia/rphtix6jzbrkpfxxdcu9/strikeIMG_4922_B-1.webp'
    }, 
    'Streaks': {
        image_large: 'https://cdn.prod.website-files.com/5f6b5aadbbde59e26856cd76/65eaf1d2edfc1997f14b7153_429997161_1082582646181557_3714628852267992768_n.jpg',
        image_small: 'data:image/jpeg;base64,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'
    }
}

export function overrides(): (values: DanceEvent[]) => Promise<Record<string, Override>> {
    return async (values: DanceEvent[]) => {
        const out: Record<string, Override> = {}
        for (const event of values) {
            if (event._id && event.band in overridesMap) {
                out[event._id] = { ...overridesMap[event.band] }
            }
        }
        return out
    }
}