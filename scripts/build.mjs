// 部署前建置：把 site/ 複製到 _site/，再依 apps.json 與 GitHub Releases
// 填入各 App 頁的版本、下載連結與版本紀錄，並產生工作室首頁的作品方格
// 用法：node scripts/build.mjs（CI 會帶 GITHUB_TOKEN；本機不帶也行，公開 repo 有匿名額度）
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import {
  escapeHtml,
  fillTemplate,
  latestDownload,
  newsFrom,
  releasesFor,
  renderChangelog,
  soonSpan,
  validateApps,
} from './render.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'IksaAI/IksaAI.github.io'
const REPO_URL = `https://github.com/${REPO}`
const SOURCE_DIR = 'site'
const OUTPUT_DIR = '_site'
const TEMPLATE_DIR = 'templates'
const MAX_RELEASES = 100
const NEWS_LIMIT = 3
const BENTO_COLUMNS = 4

async function fetchReleases() {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=${MAX_RELEASES}`, { headers })
  if (!response.ok) {
    throw new Error(`讀取 GitHub Releases 失敗：HTTP ${response.status} ${await response.text()}`)
  }
  const releases = await response.json()
  return releases.filter((release) => !release.draft && !release.prerelease)
}

const escapeAll = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, escapeHtml(value)]))
const loadTemplate = (name) => readFile(`${TEMPLATE_DIR}/${name}.html`, 'utf8')
const numbered = (index) => String(index + 1).padStart(2, '0')

/** 每個 App 的版本與最新下載；某個 App 還沒有含 DMG 的 release 就讓建置失敗，網站維持上一版 */
function collectEntries(apps, releases) {
  return apps.map((app) => {
    const appReleases = releasesFor(releases, app.slug)
    try {
      return { app, releases: appReleases, download: latestDownload(appReleases) }
    } catch (error) {
      throw new Error(`${app.name}（tag 前綴 ${app.slug}-v）：${error.message}`, { cause: error })
    }
  })
}

async function buildAppPage({ app, releases, download }) {
  const path = `${OUTPUT_DIR}/${app.slug}/index.html`
  const html = fillTemplate(await readFile(path, 'utf8'), {
    ...escapeAll({
      version: download.version,
      dmgUrl: download.dmgUrl,
      dmgSize: download.dmgSize,
      releasesUrl: `${REPO_URL}/releases?q=${app.slug}-v&expanded=true`,
    }),
    changelog: renderChangelog(releases),
  })
  await writeFile(path, html)
}

const appValues = ({ app, download }) =>
  escapeAll({
    slug: app.slug,
    name: app.name,
    subtitle: app.subtitle,
    tagline: app.tagline,
    requirements: app.requirements,
    icon: app.icon,
    screenshot: app.screenshot,
    screenshotAlt: app.screenshotAlt,
    version: download.version,
    dmgUrl: download.dmgUrl,
    dmgSize: download.dmgSize,
  })

async function buildHome(entries) {
  const [featureTemplate, workTemplate, newsTemplate, soonTemplate] = await Promise.all(
    ['feature', 'work', 'news-item', 'soon'].map(loadTemplate),
  )
  const featured = entries.find(({ app }) => app.featured) ?? entries[0]
  const others = entries.filter((entry) => entry !== featured)
  const numberOf = (entry) => numbered(entries.indexOf(entry))

  const overlay = featured.app.overlay
    ? `<img class="overlay" src="${escapeHtml(featured.app.overlay)}" width="1280" height="800" alt="${escapeHtml(featured.app.overlayAlt ?? '')}" loading="lazy">`
    : ''
  const featuredHtml = fillTemplate(featureTemplate, { ...appValues(featured), no: numberOf(featured), overlayImg: overlay })
  const worksHtml = [
    ...others.map((entry) => fillTemplate(workTemplate, { ...appValues(entry), no: numberOf(entry) })),
    fillTemplate(soonTemplate, { span: String(soonSpan(others.length, BENTO_COLUMNS)), no: numbered(entries.length) }),
  ].join('\n')
  const newsHtml = newsFrom(entries, NEWS_LIMIT)
    .map((item) => fillTemplate(newsTemplate, escapeAll(item)))
    .join('\n')

  const path = `${OUTPUT_DIR}/index.html`
  const html = fillTemplate(await readFile(path, 'utf8'), {
    featured: featuredHtml,
    news: newsHtml,
    works: worksHtml,
    workCount: String(entries.length),
    releasesUrl: escapeHtml(`${REPO_URL}/releases`),
  })
  await writeFile(path, html)
}

const apps = validateApps(JSON.parse(await readFile('apps.json', 'utf8')))
const entries = collectEntries(apps, await fetchReleases())

await rm(OUTPUT_DIR, { recursive: true, force: true })
await cp(SOURCE_DIR, OUTPUT_DIR, { recursive: true })
await Promise.all(entries.map(buildAppPage))
await buildHome(entries)
console.log(`✅ 已建置 ${OUTPUT_DIR}/：${entries.map(({ app, download }) => `${app.name} ${download.version}`).join('、')}`)
