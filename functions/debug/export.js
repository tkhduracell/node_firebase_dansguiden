const path = require('path')

const dumper = require('../lib/dumper')
const {table} = require('../lib/database')()

const save = dumper.dump(table, path.join(__dirname, '../../backups'))

save('events')
save('versions')
save('images')
save('band_metadata')
