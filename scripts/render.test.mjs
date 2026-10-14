import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeHtml, fillTemplate, formatDate, formatSize, isReleaseTag, latestDownload, newsFrom, releasesFor, renderChangelog, renderNotes, soonSpan, summaryOf, validateApps } from './render.mjs'

const RELEASES_URL = 'https://github.com/IksaAI/IksaAI.github.io/releases'

const release = (overrides = {}) => ({
  tag_name: 'eqalert-v0.6.0',
  name: 'EQalert 0.6.0',
  published_at: '2026-10-12T03:00:00Z',
  html_url: `${RELEASES_URL}/tag/eqalert-v0.6.0`,
  body: '- 第一版',
  assets: [
    { name: 'EQalert-0.6.0.dmg', size: 2840378, browser_download_url: `${RELEASES_URL}/download/eqalert-v0.6.0/EQalert-0.6.0.dmg` },
  ],
  ...overrides,
})

const EXE = {
  name: 'EQalert-Setup-0.6.0-x64.exe',
  size: 63903815,
  browser_download_url: `${RELEASES_URL}/download/eqalert-v0.6.0/EQalert-Setup-0.6.0-x64.exe`,
}
const withWindows = (overrides = {}) => release({ assets: [...release().assets, EXE], ...overrides })

test('escapes HTML special characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
})

test('formats sizes in decimal MB like Finder', () => {
  assert.equal(formatSize(2840378), '2.8 MB')
  assert.equal(formatSize(15_000_000), '15.0 MB')
})

test('formats dates in Taiwan time', () => {
  assert.equal(formatDate('2026-10-12T03:00:00Z'), '2026-10-12')
  assert.equal(formatDate('2026-10-12T17:00:00Z'), '2026-10-13')
})

test('renders bullet lists, headings, paragraphs and inline markup', () => {
  const html = renderNotes('### 新功能\n- **語言**：五種\n- 指令 `xattr`\n\n說明 <script>')
  assert.equal(
    html,
    '<h4>新功能</h4>\n<ul>\n<li><strong>語言</strong>：五種</li>\n<li>指令 <code>xattr</code></li>\n</ul>\n<p>說明 &lt;script&gt;</p>',
  )
})

test('picks the DMG from the newest release', () => {
  const download = latestDownload([release()])
  assert.deepEqual(download, {
    version: '0.6.0',
    dmgUrl: `${RELEASES_URL}/download/eqalert-v0.6.0/EQalert-0.6.0.dmg`,
    dmgSize: '2.8 MB',
  })
})

test('fails when the newest release has no DMG, so the old site stays up', () => {
  assert.throws(() => latestDownload([]), /DMG/)
  assert.throws(() => latestDownload([release({ assets: [] })]), /DMG/)
})

test('also picks the Windows installer for apps that ship on Windows', () => {
  assert.deepEqual(latestDownload([withWindows()], { windows: true }), {
    version: '0.6.0',
    dmgUrl: `${RELEASES_URL}/download/eqalert-v0.6.0/EQalert-0.6.0.dmg`,
    dmgSize: '2.8 MB',
    exeUrl: EXE.browser_download_url,
    exeSize: '63.9 MB',
    exeName: 'EQalert-Setup-0.6.0-x64.exe',
  })
})

test('fails when a Windows app has no installer in its newest release, so the old site stays up', () => {
  assert.throws(() => latestDownload([release()], { windows: true }), /Windows/)
})

test('links each platform in the changelog', () => {
  const html = renderChangelog([withWindows(), release({ tag_name: 'eqalert-v0.5.0' })])
  assert.match(html, /下載 0\.6\.0：<a href="[^"]+\.dmg">Mac 版（2\.8 MB）<\/a>・<a href="[^"]+\.exe">Windows 版（63\.9 MB）<\/a>/)
  assert.match(html, /下載 0\.5\.0：<a href="[^"]+\.dmg">Mac 版（2\.8 MB）<\/a><\/p>/)
})

test('marks only the first release as latest in the changelog', () => {
  const html = renderChangelog([release(), release({ tag_name: 'eqalert-v0.5.0', body: '' })])
  assert.equal(html.match(/release-latest/g).length, 1)
  assert.match(html, /<h3>0\.5\.0<\/h3>/)
  assert.match(html, /<time datetime="2026-10-12">2026-10-12<\/time>/)
})

test('fills every placeholder and rejects unknown ones', () => {
  assert.equal(fillTemplate('{{a}} / {{b}}', { a: '1', b: '2' }), '1 / 2')
  assert.throws(() => fillTemplate('{{a}} {{missing}}', { a: '1' }), /missing/)
})

test('links only https URLs', () => {
  assert.equal(renderNotes('[官方](https://www.jma.go.jp/)'), '<p><a href="https://www.jma.go.jp/">官方</a></p>')
  assert.equal(renderNotes('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>')
})

test('keeps only the releases of one app, by tag prefix', () => {
  const tags = ['eqalert-v0.7.0', 'nextapp-v1.0.0', 'eqalert-v0.6.0', 'v0.5.0', 'eqalert-beta-v1.0.0']
  const releases = tags.map((tag_name) => release({ tag_name }))
  assert.deepEqual(releasesFor(releases, 'eqalert').map((r) => r.tag_name), ['eqalert-v0.7.0', 'eqalert-v0.6.0'])
})

test('strips the app prefix from the version', () => {
  assert.equal(latestDownload([release({ tag_name: 'next-app-v1.2.0' })]).version, '1.2.0')
})

const app = (overrides = {}) => ({
  slug: 'eqalert',
  name: 'EQalert',
  subtitle: '地震速報・macOS',
  tagline: '平時安心，有事大聲。',
  requirements: 'macOS 14 以上',
  icon: 'eqalert/images/icon-256.png',
  screenshot: 'eqalert/images/mac-main-dark-1280.webp',
  screenshotAlt: 'EQalert 主畫面',
  ...overrides,
})

test('summarises release notes with their first plain line', () => {
  assert.equal(summaryOf('第一個公開版本。\n\n### 功能\n- a'), '第一個公開版本。')
  assert.equal(summaryOf('### 功能\n- **台灣**：`速報` [說明](https://x.tw)'), '台灣：速報 說明')
  assert.equal(summaryOf(''), '')
})

test('the coming-soon tile fills the rest of the row', () => {
  assert.equal(soonSpan(0, 4), 4)
  assert.equal(soonSpan(1, 4), 3)
  assert.equal(soonSpan(4, 4), 4)
  assert.equal(soonSpan(5, 4), 3)
})

test('accepts valid apps and rejects broken apps.json entries', () => {
  assert.deepEqual(validateApps([app()]), [app()])
  assert.throws(() => validateApps([app({ icon: '' })]), /eqalert.*icon/)
  assert.throws(() => validateApps([app({ slug: 'EQ alert' })]), /slug/)
  assert.throws(() => validateApps([app(), app()]), /重複/)
  assert.throws(() => validateApps([]), /apps\.json/)
  assert.deepEqual(validateApps([app({ windows: true })]), [app({ windows: true })])
  assert.throws(() => validateApps([app({ windows: 'yes' })]), /windows/)
})

test('news lists the newest releases across all apps', () => {
  const entries = [
    { app: app(), releases: [release({ tag_name: 'eqalert-v0.7.0', published_at: '2026-11-01T00:00:00Z', body: '修正' }), release()] },
    { app: app({ slug: 'next', name: 'Next' }), releases: [release({ tag_name: 'next-v1.0.0', published_at: '2026-10-20T00:00:00Z' })] },
  ]
  assert.deepEqual(
    newsFrom(entries, 2).map(({ name, version, date, summary, href }) => [name, version, date, summary, href]),
    [['EQalert', '0.7.0', '2026-11-01', '修正', 'eqalert/#releases'], ['Next', '1.0.0', '2026-10-20', '第一版', 'next/#releases']],
  )
})

test('release tags must be <slug>-v<version>', () => {
  for (const tag of ['eqalert-v0.6.0', 'next-app-v1.2.0', 'eqalert-v1.0.0-beta.1']) assert.equal(isReleaseTag(tag), true, tag)
  for (const tag of ['v0.6.0', 'EQalert-v1.0.0', 'eqalert-0.6.0', 'eqalert-v', 'eqalert-v1.0; rm -rf /', '']) assert.equal(isReleaseTag(tag), false, tag)
})
