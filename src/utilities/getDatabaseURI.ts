// Builds the mongodb connection string in Node (rather than via raw
// docker-compose ${VAR} interpolation) so MONGO_ROOT_USERNAME/PASSWORD can
// contain URI-reserved characters (@ : / # ? % etc.) without producing a
// malformed connection string - docker-compose substitution can't URL-encode.
export const getDatabaseURI = (): string => {
  if (process.env.DATABASE_URI) return process.env.DATABASE_URI

  const { MONGO_ROOT_USERNAME, MONGO_ROOT_PASSWORD, MONGO_HOST, MONGO_DATABASE } = process.env
  if (!MONGO_ROOT_PASSWORD) return ''

  const username = encodeURIComponent(MONGO_ROOT_USERNAME || 'admin')
  const password = encodeURIComponent(MONGO_ROOT_PASSWORD)
  const host = MONGO_HOST || 'mongodb'
  const database = MONGO_DATABASE || 'payload'

  return `mongodb://${username}:${password}@${host}:27017/${database}?authSource=admin`
}
