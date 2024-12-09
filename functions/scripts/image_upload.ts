#!./node_modules/.bin/ts-node

import * as admin from 'firebase-admin'
import * as sharp from 'sharp'

admin.initializeApp({
    storageBucket: 'dansguiden-b3a7d.appspot.com'
})

import { createInterface } from 'node:readline/promises'
import { readFile } from 'node:fs/promises'
(async () => {

    const rl = createInterface({ input: process.stdin, output: process.stdout })

    const name = await rl.question('Name of entity: ')

    const url = await rl.question('Image URL: ')

    let buffer: ArrayBuffer
    if (url.startsWith('http') && url.includes('://')) {
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

        buffer = await resp.arrayBuffer()
    } else {
        try {
            buffer = await readFile(url)
        } catch (e) {
            console.error('Invalid file', e)
            process.exit(1)
        }
    }


    const original = await sharp.default(buffer)
        .webp()
        .toBuffer()

    // 3. resize to 100x100
    const resized = await sharp.default(buffer)
        .resize(300, 300, { fit: 'cover' })
        .webp()
        .toBuffer()

    // 4. upload resized+original to firestore cloud storage /media

    const dirpath = 'media/' + name.replace(/[^a-z0-9]/gi, '_')
        .replace(/å/gi, 'a')
        .replace(/ä/gi, 'a')
        .replace(/ö/gi, 'o')
        .toLowerCase()

    const largeFile = admin.storage().bucket().file(`${dirpath}/large.webp`)
    await largeFile.save(Buffer.from(original))
    await largeFile.makePublic()

    const smallFile = admin.storage().bucket().file(`${dirpath}/small.webp`)
    await smallFile.save(Buffer.from(resized))
    await smallFile.makePublic()


    console.log(`
    functions/src/overrides.ts: 

        '${name}': { dir: '${dirpath}' },
    `)
    process.exit(0)
})()
