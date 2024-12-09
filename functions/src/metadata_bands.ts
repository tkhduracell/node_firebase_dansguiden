import _ from "lodash"
import { Histogram, histogram } from "./lib/counter"
import { DanceEvent } from "./lib/types"
import { Bands } from "./lib/spotify"
import { artistsOverrides, Override } from "./overrides"

export type SpotifyInfo = {
    id?: string,
    name?: string,
    image_small?: string
    image_large?: string
}

export type MetadataBandsRecordBuilder = {
    counts: Promise<Record<string, Histogram>>,
    spotify?: Promise<Record<string, SpotifyInfo>>
    override?: Promise<Record<string, Override>>
}

export type MetadataBandsRecord = {
    counts: Histogram,
    spotify?: SpotifyInfo,
    override?: Override,
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
    static build(events: DanceEvent[], secrets: SpotifySecrets): MetadataBandsRecordBuilder {
        return {
            counts: histogram('band')(events),
            spotify: Promise.all([
                spotifyApi(secrets)(events),
                overrides()(events)
            ]).then(([artist, o]) => {
                const out = { ...artist }
                for (const [k,] of Object.entries(o)) {
                    out[k] = { ...artist[k], ...o[k] }
                }
                return out
            })
        }
    }
}

export function overrides(): (values: DanceEvent[]) => Promise<Record<string, Override>> {
    return async (values: DanceEvent[]) => {
        const out: Record<string, Override> = {}
        for (const event of values) {
            if (event._id && event.band in artistsOverrides) {
                out[event.band] = { ...artistsOverrides[event.band] }
            }
        }
        return out
    }
}