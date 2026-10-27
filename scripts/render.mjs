// 把 GitHub Releases 的資料轉成網頁片段（純函式，方便測試）

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const DATE_FORMAT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' })

export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])

/** 和 Finder 一樣用十進位 MB */
export const formatSize = (bytes) => `${(bytes / 1_000_000).toFixed(1)} MB`

/** 台灣時間的 YYYY-MM-DD */
export const formatDate = (iso) => DATE_FORMAT.format(new Date(iso))

/** tag 格式是「<App 代號>-v<版本>」，例如 eqalert-v0.6.0 */
const versionOf = (release) => release.tag_name.replace(/^(?:.*-)?v(?=\d)/, '')
const dmgOf = (release) => release.assets.find((asset) => asset.name.endsWith('.dmg'))
const exeOf = (release) => release.assets.find((asset) => asset.name.endsWith('.exe'))
const zipOf = (release) => release.assets.find((asset) => asset.name.endsWith('.zip'))

/**
 * App 頁「所有版本與舊版下載」連到 GitHub Releases 的搜尋。只搜 slug：
 * GitHub 搜尋把「-v」當成排除 v，寫成 <slug>-v 會什麼都找不到
 */
export const appReleasesUrl = (repoUrl, slug) => `${repoUrl}/releases?q=${encodeURIComponent(slug)}&expanded=true`

/** 只留下某個 App 的版本（所有 App 共用同一個 repo 的 Releases） */
export const releasesFor = (releases, slug) => releases.filter((release) => release.tag_name.startsWith(`${slug}-v`))

/** 行內語法：**粗體**、`程式碼`、[文字](https://網址)；先跳脫再轉換 */
function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
}

/** release 說明的 Markdown 子集：標題、條列、段落 */
export function renderNotes(markdown) {
  const html = []
  let inList = false
  const closeList = () => {
    if (inList) html.push('</ul>')
    inList = false
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    const item = line.match(/^[-*]\s+(.*)$/)

    if (item) {
      if (!inList) html.push('<ul>')
      inList = true
      html.push(`<li>${renderInline(item[1])}</li>`)
      continue
    }
    closeList()
    if (heading) html.push(`<h4>${renderInline(heading[1])}</h4>`)
    else if (line) html.push(`<p>${renderInline(line)}</p>`)
  }
  closeList()
  return html.join('\n')
}

/**
 * 下載按鈕用的最新版本；最新版沒有 DMG 就讓建置失敗，網站維持上一版。
 * 有 Windows 版的 App（apps.json 的 windows: true），最新版也一定要有 Windows 安裝檔（.exe）；
 * 有免安裝版的（portable: true）還一定要有 .zip
 */
export function latestDownload(releases, { windows = false, portable = false } = {}) {
  const [latest] = releases
  if (!latest) throw new Error('GitHub Releases 裡還沒有版本，請先發布含 DMG 的 release')
  const dmg = dmgOf(latest)
  if (!dmg) throw new Error(`最新的 release ${latest.tag_name} 沒有 DMG 檔`)
  const download = { version: versionOf(latest), dmgUrl: dmg.browser_download_url, dmgSize: formatSize(dmg.size) }
  if (!windows) return download
  const exe = exeOf(latest)
  if (!exe) throw new Error(`最新的 release ${latest.tag_name} 沒有 Windows 安裝檔（.exe）`)
  const withExe = { ...download, exeUrl: exe.browser_download_url, exeSize: formatSize(exe.size), exeName: exe.name }
  if (!portable) return withExe
  const zip = zipOf(latest)
  if (!zip) throw new Error(`最新的 release ${latest.tag_name} 沒有 Windows 免安裝版（.zip）`)
  return { ...withExe, zipUrl: zip.browser_download_url, zipSize: formatSize(zip.size), zipName: zip.name }
}

/**
 * 網站的語言：繁中在根目錄（/、/<slug>/），其他語言整個放在 /<語言>/ 底下（/en/、/en/<slug>/），有做才建置。
 * 版本紀錄的固定文字跟著頁面語言。
 */
export const PAGE_LANGS = ['en', 'ja']
const CHANGELOG_TEXT = {
  zh: { latest: '最新版本', download: '下載', colon: '：', sep: '・', mac: 'Mac 版', windows: 'Windows 版', portable: 'Windows 免安裝版', size: (s) => `（${s}）` },
  en: { latest: 'Latest', download: 'Download', colon: ': ', sep: ' · ', mac: 'Mac', windows: 'Windows', portable: 'Windows portable', size: (s) => ` (${s})` },
  ja: { latest: '最新版', download: 'ダウンロード', colon: '：', sep: '・', mac: 'Mac 版', windows: 'Windows 版', portable: 'Windows ポータブル版', size: (s) => `（${s}）` },
}

/**
 * release 說明可以分語言：`<!-- lang:en -->`、`<!-- lang:ja -->` 之後是那個語言，最前面是繁中（預設）；
 * `<!-- lang:all -->` 之後每個語言都會接上（例如發版流程自動加的 SHA-256）。沒有那個語言就用繁中。
 * 這幾行是 HTML 註解，GitHub 的 release 頁上看不到。
 */
export function notesFor(markdown, lang = 'zh') {
  const parts = markdown.split(/^<!--\s*lang:([a-z]+)\s*-->[ \t]*\r?$/m)
  const sections = { zh: parts[0] }
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i + 1]
  const own = (sections[lang] ?? sections.zh).trim()
  const shared = (sections.all ?? '').trim()
  return [own, shared].filter(Boolean).join('\n\n')
}

const PLATFORM_ASSETS = [
  { key: 'mac', find: dmgOf },
  { key: 'windows', find: exeOf },
  { key: 'portable', find: zipOf },
]

/** 版本紀錄每一版的下載連結：「下載 0.6.0：Mac 版（2.8 MB）・Windows 版（63.9 MB）」 */
function renderDownloads(release, version, text) {
  const links = PLATFORM_ASSETS.flatMap(({ key, find }) => {
    const asset = find(release)
    return asset ? [`<a href="${escapeHtml(asset.browser_download_url)}">${text[key]}${text.size(formatSize(asset.size))}</a>`] : []
  })
  return links.length ? `<p class="release-download">${text.download} ${version}${text.colon}${links.join(text.sep)}</p>` : ''
}

function renderRelease(release, isLatest, lang) {
  const text = CHANGELOG_TEXT[lang] ?? CHANGELOG_TEXT.zh
  const version = escapeHtml(versionOf(release))
  const date = formatDate(release.published_at)
  const download = renderDownloads(release, version, text)
  return `<article class="release">
  <div class="release-meta">
    <h3>${version}</h3>
    <time datetime="${date}">${date}</time>${isLatest ? `\n    <span class="release-latest">${text.latest}</span>` : ''}
  </div>
  <div class="release-notes">
${renderNotes(notesFor(release.body ?? '', lang))}
${download}
  </div>
</article>`
}

export const renderChangelog = (releases, lang = 'zh') =>
  releases.map((release, index) => renderRelease(release, index === 0, lang)).join('\n')

/** 首頁方格的固定文字；root 是語言頁回到根目錄的路徑（apps.json 的圖片路徑以根目錄為準） */
const HOME_TEXT = {
  zh: { root: '', sep: '・', featured: '精選', readMore: '閱讀介紹 →', moreSoon: '更多 App 製作中', version: (v) => `版本 ${v}`, downloadApp: (name) => `下載 ${name}` },
  en: { root: '../', sep: ' · ', featured: 'Featured', readMore: 'Read more →', moreSoon: 'More apps on the way', version: (v) => `Version ${v}`, downloadApp: (name) => `Download ${name}` },
  ja: { root: '../', sep: '・', featured: 'おすすめ', readMore: '詳しく見る →', moreSoon: 'ほかのアプリも制作中', version: (v) => `バージョン ${v}`, downloadApp: (name) => `${name} をダウンロード` },
}

export const homeText = (lang) => HOME_TEXT[lang] ?? HOME_TEXT.zh

/** apps.json 的 App 換成某個語言：有翻譯的欄位（app.en、app.ja）蓋過繁中，沒翻的沿用繁中 */
export const localizeApp = (app, lang) => ({ ...app, ...(app[lang] ?? {}) })

/** 搬走的網址留一頁轉址（GitHub Pages 不能設伺服器轉址），例如舊的 /polycomme/en/ → /en/polycomme/ */
export function redirectPage(relativeUrl, canonicalUrl) {
  const href = escapeHtml(relativeUrl)
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0; url=${href}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <title>IksaAI</title>
</head>
<body>
  <p><a href="${href}">${escapeHtml(canonicalUrl)}</a></p>
</body>
</html>
`
}

/** 填入 {{欄位}}；樣板裡有沒提供的欄位就報錯，避免把 {{...}} 發布出去 */
export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
    if (!(key in values)) throw new Error(`網頁樣板有未知的欄位：${placeholder}`)
    return values[key]
  })
}

const REQUIRED_APP_FIELDS = ['slug', 'name', 'subtitle', 'tagline', 'requirements', 'icon', 'screenshot', 'screenshotAlt']
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 檢查 apps.json：slug 會變成網址與 tag 前綴，所以只能用小寫英文、數字和 - */
export function validateApps(apps) {
  if (!Array.isArray(apps) || apps.length === 0) throw new Error('apps.json 至少要有一個 App')
  const seen = new Set()
  for (const app of apps) {
    if (!SLUG_PATTERN.test(app.slug ?? '')) throw new Error(`apps.json 的 slug 只能用小寫英文、數字和 -：${app.slug}`)
    if (seen.has(app.slug)) throw new Error(`apps.json 有重複的 slug：${app.slug}`)
    seen.add(app.slug)
    const missing = REQUIRED_APP_FIELDS.filter((field) => typeof app[field] !== 'string' || app[field] === '')
    if (missing.length) throw new Error(`apps.json 的 ${app.slug} 缺少欄位：${missing.join('、')}`)
    if ('windows' in app && typeof app.windows !== 'boolean') throw new Error(`apps.json 的 ${app.slug}：windows 只能是 true 或 false`)
    if ('portable' in app && typeof app.portable !== 'boolean') throw new Error(`apps.json 的 ${app.slug}：portable 只能是 true 或 false`)
    if (app.portable && !app.windows) throw new Error(`apps.json 的 ${app.slug}：portable（Windows 免安裝版）要搭配 windows: true`)
    for (const lang of PAGE_LANGS) {
      if (lang in app && (typeof app[lang] !== 'object' || app[lang] === null || Array.isArray(app[lang]))) {
        throw new Error(`apps.json 的 ${app.slug}：${lang} 要是翻譯欄位的物件，例如 { "tagline": "…" }`)
      }
    }
  }
  return apps
}

/** release 說明的第一行純文字（跳過標題），給首頁「最新動態」用 */
export function summaryOf(markdown) {
  const line = markdown
    .split(/\r?\n/)
    .map((text) => text.trim())
    .find((text) => text && !/^#{1,6}\s/.test(text))
  if (!line) return ''
  return line
    .replace(/^[-*]\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]*\)/g, '$1')
}

/** 「更多 App 製作中」那格要橫跨幾欄，才能補滿最後一列 */
export const soonSpan = (workCount, columns) => columns - (workCount % columns)

/** 所有 App 最新的幾個版本，新的在前；摘要用頁面語言的 release 說明 */
export function newsFrom(entries, limit, lang = 'zh') {
  return entries
    .flatMap(({ app, releases }) =>
      releases.map((release) => ({
        slug: app.slug,
        name: app.name,
        version: versionOf(release),
        date: formatDate(release.published_at),
        publishedAt: release.published_at,
        summary: summaryOf(notesFor(release.body ?? '', lang)),
        href: `${app.slug}/#releases`,
      })),
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit)
}

/** release tag 的格式：「<App 代號>-v<版本>」，例如 eqalert-v0.6.0、eqalert-v1.0.0-beta.1 */
export const isReleaseTag = (tag) => /^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?$/.test(tag)
