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

export type MetadataBandsRecord = {
    counts: Promise<Record<string, Histogram>>,
    spotify?: Promise<Record<string, SpotifyInfo>>
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
            await new Promise((res) => setTimeout(res, 500))
        }
        return out
    }
}

export class MetadataBands {
    static build(events: DanceEvent[], secrets: SpotifySecrets): MetadataBandsRecord {
        return {
            counts: histogram('band')(events),
            spotify: spotifyApi(secrets)(events)
        }
    }
}