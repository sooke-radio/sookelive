const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://example.com'

/** @type {import('next-sitemap').IConfig} */
  const robotsOpts = (process.env.SITE_ENV === 'prod' || process.env.SITE_ENV === 'production')  ? {
    policies: [
      {
        userAgent: '*',
        disallow: '/admin/*',
      },
    ]
  } : {
    policies: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ]
  };

module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: ['/posts-sitemap.xml', '/pages-sitemap.xml', '/*', '/posts/*'],
  robotsTxtOptions: robotsOpts,
  additionalSitemaps: [`${SITE_URL}/pages-sitemap.xml`, `${SITE_URL}/posts-sitemap.xml`],
}
