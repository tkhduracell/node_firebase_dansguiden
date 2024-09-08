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

type Override = Pick<SpotifyInfo,'image_large' | 'image_small' | 'name' | 'id'>

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
            spotify: Promise.all([
                spotifyApi(secrets)(events),
                overrides()(events)
            ]).then(([artist, o]) => {
                const out = { ...artist }
                for (const [k, ] of Object.entries(o)) {
                    out[k] = { ...artist[k], ...o[k] }
                }
                return out
            })
        }
    }
}

const overridesMap: Record<string, Override>= {
    'Jompaz': {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fjunix%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fjunix%2Flarge.webp"
    },
    'Junix': {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fjunix%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fjunix%2Flarge.webp"
    },
    'Strike': { 
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fstrike%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fstrike%2Flarge.webp"
    }, 
    'Streaks': {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fstreaks%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fstreaks%2Flarge.webp"
    },
    "Glads": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fglads%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fglads%2Flarge.webp"
    },
    "Hanes Duo": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fhanes_duo%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fhanes_duo%2Flarge.webp"
    },
    "Caspers": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fcaspers%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fcaspers%2Flarge.webp"
    },
    "Lövgrens": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fl_vgrens%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fl_vgrens%2Flarge.webp"
    },
    "Kjellez": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fkjellez%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fkjellez%2Flarge.webp"
    },
    "Pär Norlings": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fp_r_norlings%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fp_r_norlings%2Flarge.webp"
    },
    "Tomas & Co": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Ftomas___co%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Ftomas___co%2Flarge.webp"
    },
    "Eklöfs": {
        id: '',
        image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fekl_fs%2Fsmall.webp",
        image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/media%2Fekl_fs%2Flarge.webp"
    }

}

export function overrides(): (values: DanceEvent[]) => Promise<Record<string, Override>> {
    return async (values: DanceEvent[]) => {
        const out: Record<string, Override> = {}
        for (const event of values) {
            if (event._id && event.band in overridesMap) {
                out[event.band] = { ...overridesMap[event.band] }
            }
        }
        return out
    }
}