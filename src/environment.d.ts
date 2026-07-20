declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URI?: string
      MONGO_ROOT_USERNAME?: string
      MONGO_ROOT_PASSWORD?: string
      MONGO_HOST?: string
      MONGO_DATABASE?: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
