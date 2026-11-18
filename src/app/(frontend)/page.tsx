import PageTemplate, { generateMetadata } from './[slug]/page'

// Must be a literal export here (route segment config can't be re-exported).
// Periodic refresh so time-based content (e.g. episodes reaching their air date) appears without a save.
export const revalidate = 600

export default PageTemplate

export { generateMetadata }
