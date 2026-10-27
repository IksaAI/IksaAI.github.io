// 部署前建置：把 site/ 複製到 _site/，再依 apps.json 與 GitHub Releases
// 填入各 App 頁的版本、下載連結與版本紀錄，並產生工作室首頁的 App 方格
// 用法：node scripts/build.mjs（CI 會帶 GITHUB_TOKEN；本機不帶也行，公開 repo 有匿名額度）
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import {
  escapeHtml,
  fillTemplate,
  homeText,
  latestDownload,
  localizeApp,
  newsFrom,
  PAGE_LANGS,
  redirectPage,
  releasesFor,
  renderChangelog,
  soonSpan,
  validateApps,
} from './render.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'IksaAI/IksaAI.github.io'
const REPO_URL = `https://github.com/${REPO}`
const SITE_URL = 'https://iksaai.github.io'
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

/** 每個 App 的版本與最新下載；某個 App 的最新 release 缺安裝檔就讓建置失敗，網站維持上一版 */
function collectEntries(apps, releases) {
  return apps.map((app) => {
    const appReleases = releasesFor(releases, app.slug)
    try {
      return { app, releases: appReleases, download: latestDownload(appReleases, { windows: app.windows === true, portable: app.portable === true }) }
    } catch (error) {
      throw new Error(`${app.name}（tag 前綴 ${app.slug}-v）：${error.message}`, { cause: error })
    }
  })
}

/** 沒有這個檔案就回 null（App、首頁不一定有英文、日文版） */
const readIfExists = (path) => readFile(path, 'utf8').catch((error) => (error.code === 'ENOENT' ? null : Promise.reject(error)))

/** 繁中在根目錄，其他語言在 /<語言>/ 底下 */
const langDir = (lang) => (lang === 'zh' ? OUTPUT_DIR : `${OUTPUT_DIR}/${lang}`)
const ALL_LANGS = ['zh', ...PAGE_LANGS]

/** 舊網址 /<slug>/<語言>/ 轉到 /<語言>/<slug>/（PolyComme 的英文、日文頁曾經放在舊網址） */
async function writeOldLangRedirect(slug, lang) {
  const dir = `${OUTPUT_DIR}/${slug}/${lang}`
  await mkdir(dir, { recursive: true })
  await writeFile(`${dir}/index.html`, redirectPage(`../../${lang}/${slug}/`, `${SITE_URL}/${lang}/${slug}/`))
}

/** App 頁：繁中的 <slug>/index.html，加上有做的 <語言>/<slug>/index.html，版本紀錄各用自己的語言 */
async function buildAppPage({ app, releases, download }) {
  const values = escapeAll({
    ...download,
    releasesUrl: `${REPO_URL}/releases?q=${app.slug}-v&expanded=true`,
  })
  for (const lang of ALL_LANGS) {
    const path = `${langDir(lang)}/${app.slug}/index.html`
    const template = lang === 'zh' ? await readFile(path, 'utf8') : await readIfExists(path)
    if (template === null) continue
    await writeFile(path, fillTemplate(template, { ...values, changelog: renderChangelog(releases, lang) }))
    if (lang !== 'zh') await writeOldLangRedirect(app.slug, lang)
  }
}

/** 首頁連到 App 頁：那個語言有做就連同語言的頁面，沒有就連繁中頁 */
const appHref = (slug, lang) =>
  lang === 'zh' || existsSync(`${langDir(lang)}/${slug}/index.html`) ? `${slug}/` : `${homeText(lang).root}${slug}/`

const appValues = ({ app, download }, lang) => {
  const text = homeText(lang)
  const localized = localizeApp(app, lang)
  return escapeAll({
    href: appHref(app.slug, lang),
    root: text.root,
    sep: text.sep,
    versionText: text.version(download.version),
    featuredLabel: text.featured,
    downloadApp: text.downloadApp(app.name),
    readMore: text.readMore,
    slug: app.slug,
    name: app.name,
    subtitle: localized.subtitle,
    tagline: localized.tagline,
    requirements: localized.requirements,
    icon: app.icon,
    screenshot: app.screenshot,
    screenshotAlt: localized.screenshotAlt,
  })
}

/** 工作室首頁：繁中的 index.html，加上有做的 <語言>/index.html */
async function buildHome(entries, templates, lang) {
  const path = `${langDir(lang)}/index.html`
  const page = lang === 'zh' ? await readFile(path, 'utf8') : await readIfExists(path)
  if (page === null) return
  const { feature, work, news, soon } = templates
  const text = homeText(lang)
  const featured = entries.find(({ app }) => app.featured) ?? entries[0]
  const others = entries.filter((entry) => entry !== featured)
  const numberOf = (entry) => numbered(entries.indexOf(entry))

  const featuredApp = localizeApp(featured.app, lang)
  const overlay = featuredApp.overlay
    ? `<img class="overlay" src="${escapeHtml(text.root + featuredApp.overlay)}" width="1280" height="800" alt="${escapeHtml(featuredApp.overlayAlt ?? '')}" loading="lazy">`
    : ''
  const featuredHtml = fillTemplate(feature, { ...appValues(featured, lang), no: numberOf(featured), overlayImg: overlay })
  const worksHtml = [
    ...others.map((entry) => fillTemplate(work, { ...appValues(entry, lang), no: numberOf(entry) })),
    fillTemplate(soon, { span: String(soonSpan(others.length, BENTO_COLUMNS)), no: numbered(entries.length), moreSoon: escapeHtml(text.moreSoon) }),
  ].join('\n')
  const newsHtml = newsFrom(entries, NEWS_LIMIT, lang)
    .map((item) => fillTemplate(news, escapeAll({ ...item, href: `${appHref(item.slug, lang)}#releases`, sep: text.sep })))
    .join('\n')

  const html = fillTemplate(page, {
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
const [feature, work, news, soon] = await Promise.all(['feature', 'work', 'news-item', 'soon'].map(loadTemplate))
await Promise.all(ALL_LANGS.map((lang) => buildHome(entries, { feature, work, news, soon }, lang)))
console.log(`✅ 已建置 ${OUTPUT_DIR}/：${entries.map(({ app, download }) => `${app.name} ${download.version}`).join('、')}`)
