// Source map support
import 'source-map-support/register'

// Error reporting
import { ErrorReporting } from '@google-cloud/error-reporting'

let errorReporting: ErrorReporting = (() => { }) as unknown as ErrorReporting

if (process.env.NODE_ENV === 'production') {
    errorReporting = new ErrorReporting()
}

export { errorReporting }
