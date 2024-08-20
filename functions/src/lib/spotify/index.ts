
import SpotifyWebApi from 'spotify-web-api-node'
import { getAccessToken } from './auth'
import _ from 'lodash'

import { findArtistInfo, searchArtist, remapArtist } from './artists'

export class SpotifyApiClientFactory {
    static async create(secrets: { client_id: string, client_secret: string }): Promise<SpotifyWebApi> {
        const { token } = await getAccessToken(secrets)
        const opts = {
            clientId: secrets.client_id,
            clientSecret: secrets.client_secret,
            accessToken: token.access_token as string
        }
        return new SpotifyWebApi(opts)
    }
}

export type SpotifyClientConfig = {
    client_id: string,
    client_secret: string
}


export type Artist = {
    id: string;
    name: string;
    genres: string[];
    images: ArtistImage[];
}

export type ArtistImage = {
    height?: number;
    width?: number;
    url: string;
}

export class Bands {
    static async getArtist(secrets: SpotifyClientConfig, band: string): Promise<Artist | undefined> {
        const remapped = remapArtist(band)
        try {
            const client = await SpotifyApiClientFactory.create(secrets)
            const spotifyArtists = await searchArtist(client, remapped)
            const mostSimilarArtist = findArtistInfo(remapped, spotifyArtists)
            return mostSimilarArtist
        } catch (e) {
            console.warn('Error looking up artist', { band, remapped }, _.get(e, 'output', e))
            return Promise.resolve(undefined)
        }
    }
}
