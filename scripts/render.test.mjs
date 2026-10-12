import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeHtml, fillTemplate, formatDate, formatSize, latestDownload, renderChangelog, renderNotes } from './render.mjs'

const RELEASES_URL = 'https://github.com/IksaAI/IksaAI.github.io/releases'

const release = (overrides = {}) => ({
  tag_name: 'v0.6.0',
  name: 'EQalert 0.6.0',
  published_at: '2026-10-12T03:00:00Z',
  html_url: `${RELEASES_URL}/tag/v0.6.0`,
  body: '- 第一版',
  assets: [
    { name: 'EQalert-0.6.0.dmg', size: 2840378, browser_download_url: `${RELEASES_URL}/download/v0.6.0/EQalert-0.6.0.dmg` },
  ],
  ...overrides,
})

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
    dmgUrl: `${RELEASES_URL}/download/v0.6.0/EQalert-0.6.0.dmg`,
    dmgSize: '2.8 MB',
  })
})

test('fails when the newest release has no DMG, so the old site stays up', () => {
  assert.throws(() => latestDownload([]), /DMG/)
  assert.throws(() => latestDownload([release({ assets: [] })]), /DMG/)
})

test('marks only the first release as latest in the changelog', () => {
  const html = renderChangelog([release(), release({ tag_name: 'v0.5.0', body: '' })])
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
