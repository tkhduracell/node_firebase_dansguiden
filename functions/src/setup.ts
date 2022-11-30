// Source map support
import 'source-map-support/register'
import { ErrorReporting } from  '@google-cloud/error-reporting'

const errorReporting = new ErrorReporting()

export { errorReporting }
