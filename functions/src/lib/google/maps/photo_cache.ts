import * as admin from 'firebase-admin'
import { PlacesApi } from './places_api'

const BUCKET = 'dansguiden-b3a7d.appspot.com'

export type PhotoSize = '256' | '1024'

function extToContentType(ext: string): string {
    if (ext === 'png') return 'image/png'
    if (ext === 'webp') return 'image/webp'
    return 'image/jpeg'
}

function contentTypeToExt(contentType: string | null): string {
    if (!contentType) return 'jpg'
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('webp')) return 'webp'
    return 'jpg'
}

export class PhotoCache {
    /**
     * Download a Google Places photo and store it publicly in Cloud Storage.
     * Returns the public Storage URL. Throws on download/upload failure so the
     * caller can decide whether to fall through to a direct API URL.
     *
     * Storage path is deterministic on (placeId, size), so re-runs overwrite
     * the same object and avoid orphaning blobs.
     */
    static async cache(apiKey: string, ref: string, placeId: string, size: PhotoSize): Promise<string> {
        const url = PlacesApi.photoUrl(apiKey, ref, size)
        const resp = await fetch(url)
        if (!resp.ok) {
            throw new Error(`Places photo download failed: ${resp.status} ${resp.statusText}`)
        }
        const buffer = Buffer.from(await resp.arrayBuffer())
        const ext = contentTypeToExt(resp.headers.get('content-type'))
        const contentType = extToContentType(ext)
        const path = `media/places-api/${placeId}/${size}.${ext}`

        const file = admin.storage().bucket(BUCKET).file(path)
        await file.save(buffer, {
            contentType,
            metadata: { cacheControl: 'public, max-age=31536000, immutable' }
        })
        await file.makePublic()

        return `https://storage.googleapis.com/${BUCKET}/${path}`
    }
}
