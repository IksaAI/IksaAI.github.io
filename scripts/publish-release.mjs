// 以 IksaAI（GitHub App）的名義發布 release，release 頁就會顯示 IksaAI 而不是個人帳號
// 在 GitHub Actions 的 publish.yml 裡執行：node scripts/publish-release.mjs <tag>
// 需要環境變數：GH_TOKEN（IksaAI App 的 token）、BOT_LOGIN（例如 iksaai[bot]）、GITHUB_REPOSITORY
//
// 流程：找到同 tag 的 release（通常是你上傳的草稿）→ 把安裝檔下載到 release-assets/
//      → 刪掉原本的 → 由 App 重新建立並上傳安裝檔。
// 失敗時 workflow 會把 release-assets/ 存成 artifact，安裝檔不會遺失。
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isReleaseTag } from './render.mjs'

const API = 'https://api.github.com'
const UPLOADS = 'https://uploads.github.com'
const ASSET_DIR = 'release-assets'
const MAX_RELEASES = 100
const { GH_TOKEN, BOT_LOGIN, GITHUB_REPOSITORY: REPO } = process.env
const tag = process.argv[2] ?? ''

const baseHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

async function github(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url.startsWith('https://') ? url : `${API}${url}`, {
    method,
    headers: { ...baseHeaders, ...headers },
    body,
  })
  if (!response.ok) throw new Error(`${method} ${url} 失敗：HTTP ${response.status} ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

/** 安裝檔會轉址到儲存空間；自己跟轉址，才不會把 token 帶到別的網域 */
async function downloadAsset(asset) {
  const first = await fetch(`${API}/repos/${REPO}/releases/assets/${asset.id}`, {
    headers: { ...baseHeaders, Accept: 'application/octet-stream' },
    redirect: 'manual',
  })
  const response = first.status >= 300 && first.status < 400 ? await fetch(first.headers.get('location')) : first
  if (!response.ok) throw new Error(`下載 ${asset.name} 失敗：HTTP ${response.status}`)
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length !== asset.size) throw new Error(`${asset.name} 大小不符：${data.length} ≠ ${asset.size}`)
  await writeFile(`${ASSET_DIR}/${asset.name}`, data)
}

async function findRelease() {
  const releases = await github(`/repos/${REPO}/releases?per_page=${MAX_RELEASES}`)
  const release = releases.find((candidate) => candidate.tag_name === tag)
  if (!release) {
    throw new Error(`找不到 tag 為 ${tag} 的 release。請先上傳草稿：gh release create ${tag} <安裝檔> --draft --repo ${REPO}`)
  }
  return release
}

async function republish(original) {
  await mkdir(ASSET_DIR, { recursive: true })
  for (const asset of original.assets) await downloadAsset(asset)
  console.log(`已下載 ${original.assets.length} 個安裝檔`)

  // 同一個 tag 不能同時有兩個 release，所以先刪舊的；git tag 本身會保留
  await github(`/repos/${REPO}/releases/${original.id}`, { method: 'DELETE' })
  const created = await github(`/repos/${REPO}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: original.target_commitish || 'main',
      name: original.name || tag,
      body: original.body ?? '',
      draft: false,
      prerelease: original.prerelease,
    }),
  })
  for (const asset of original.assets) {
    await github(`${UPLOADS}/repos/${REPO}/releases/${created.id}/assets?name=${encodeURIComponent(asset.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': asset.content_type || 'application/octet-stream' },
      body: await readFile(`${ASSET_DIR}/${asset.name}`),
    })
  }
  return created
}

if (!isReleaseTag(tag)) throw new Error(`tag 格式應為 <App 代號>-v<版本>（例如 eqalert-v0.7.0）：${tag}`)
if (!GH_TOKEN || !BOT_LOGIN || !REPO) throw new Error('缺少 GH_TOKEN、BOT_LOGIN 或 GITHUB_REPOSITORY')

const original = await findRelease()
if (original.author.login === BOT_LOGIN && !original.draft) {
  console.log(`${tag} 已經由 ${BOT_LOGIN} 發布，不需要再處理`)
} else {
  const created = await republish(original)
  console.log(`✅ ${tag} 已由 ${created.author.login} 發布：${created.html_url}`)
}
