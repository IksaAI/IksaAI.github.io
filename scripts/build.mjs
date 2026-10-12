// 部署前建置：把 site/ 複製到 _site/，填入 GitHub Releases 的最新版本與版本紀錄
// 用法：node scripts/build.mjs（CI 會帶 GITHUB_TOKEN；本機不帶也行，公開 repo 有匿名額度）
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { escapeHtml, fillTemplate, latestDownload, renderChangelog } from './render.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'IksaAI/IksaAI.github.io'
const RELEASES_URL = `https://github.com/${REPO}/releases`
const SOURCE_DIR = 'site'
const OUTPUT_DIR = '_site'
const MAX_RELEASES = 30

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

const releases = await fetchReleases()
const download = latestDownload(releases)
const template = await readFile(`${SOURCE_DIR}/index.html`, 'utf8')
const html = fillTemplate(template, {
  version: escapeHtml(download.version),
  dmgUrl: escapeHtml(download.dmgUrl),
  dmgSize: escapeHtml(download.dmgSize),
  releasesUrl: escapeHtml(RELEASES_URL),
  changelog: renderChangelog(releases),
})

await rm(OUTPUT_DIR, { recursive: true, force: true })
await cp(SOURCE_DIR, OUTPUT_DIR, { recursive: true })
await writeFile(`${OUTPUT_DIR}/index.html`, html)
console.log(`✅ 已建置 ${OUTPUT_DIR}/：最新版本 ${download.version}，共 ${releases.length} 個版本`)
