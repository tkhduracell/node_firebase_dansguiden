#!./node_modules/.bin/ts-node

import * as admin from 'firebase-admin'
import * as sharp from 'sharp'

admin.initializeApp({
    storageBucket: 'dansguiden-b3a7d.appspot.com'
})

import { createInterface } from 'node:readline/promises'
(async () => {
    
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    
    const band = await rl.question('Name of band: ')
    
    const url = await rl.question('Image URL: ')
    
    try { new URL(url) } catch (e) {
        console.error('Invalid URL', e)
        process.exit(1)
    }
    
    // 2. download the image
    const resp = await fetch(url)
    if (!resp.ok) {
        console.error('Failed to download image', resp)
        process.exit(1)
    }

    const buffer = await resp.arrayBuffer()
    const original = await sharp.default(buffer)
        .webp()
        .toBuffer()

    // 3. resize to 100x100
    const resized = await sharp.default(buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp()
        .toBuffer()
    
    // 4. upload resized+original to firestore cloud storage /media
    
    const dir = band.replace(/[^a-z0-9]/gi, '_')
        .replace(/å/gi, 'a')
        .replace(/ä/gi, 'a')
        .replace(/ö/gi, 'o')
        .toLowerCase()
    const largeFile = admin.storage().bucket().file(`media/${dir}/large.webp`)
    await largeFile.save(Buffer.from(original))
    await largeFile.makePublic()
    const largeFileUrl = largeFile.publicUrl()
    
    const smallFile = admin.storage().bucket().file(`media/${dir}/small.webp`)
    await smallFile.save(Buffer.from(resized))
    await smallFile.makePublic()
    const smallFileUrl = smallFile.publicUrl()

    console.log(`
    "${band}": {
        id: '',
        image_small: "${smallFileUrl}",
        image_large: "${largeFileUrl}"
    }
    `)
    process.exit(0)
})()
