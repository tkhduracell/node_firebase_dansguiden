import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { MetadataPlaces } from '../src/metadata_places'
import { DanceEvent } from '../src/lib/types'
import { MetadataBands } from '../src/metadata_artists'
import { MetadataDates } from '../src/metadata_dates'

(async () => {
  const client = new SecretManagerServiceClient()
  const [secret] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/GCLOUD_PLACES_API_KEY/versions/1'
  })
  const [clientIdData] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/SPOTIFY_CLIENT_ID/versions/1'
  })
  const [clientSecretData] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/SPOTIFY_CLIENT_SECRET/versions/1'
  })
  
  const places = { api_key: secret.payload?.data?.toString() ?? '' }
  
  const event: DanceEvent = {
    _id: '2023_12_09_streaks',
    band: 'Streaks',
    city: 'Stockholm',
    county: 'Stockholm',
    date: '2022-01-01',
    place: 'Hallunda Folkets Hus',
    region: 'Stockholm',
    time: '20:00',
    weekday: 'Saturday',
    extra: 'extra'
  }

  const place = MetadataPlaces.build([event], places)
  console.log('------------- Places -----------------')
  for (const [key, value] of Object.entries(place ?? {})) {
    console.log(key, await value)
  }

  const band = MetadataBands.build([event], { 
    client_id: clientIdData.payload?.data?.toString() ?? '',
    client_secret: clientSecretData.payload?.data?.toString() ?? ''
  })
  console.log('-------------- Band --------------')
  for (const [key, value] of Object.entries(band ?? {})) {
    console.log(key, await value)
  }

  const date = MetadataDates.build([event])
  console.log('-------------- Date -----------------')
  for (const [key, value] of Object.entries(date ?? {})) {
    console.log(key, await value)
  }

  return null
})()
