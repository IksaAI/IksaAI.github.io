// 在畫面出現前決定顯示 macOS 還是 Windows（網址加 ?os=mac 或 ?os=win 可以指定），結果寫在 <html data-platform>。
// 要在 <head> 同步載入，Windows 使用者才不會先閃過 Mac 的內容。
// 兩個平台的截圖都是 loading="lazy"，沒顯示的那組不會下載；顯示中那組的主截圖在這裡先預載。
// 換截圖檔名或尺寸時，MAIN_SHOTS 要跟 index.html 一起改。
const PLATFORMS = ['mac', 'win']
const MAIN_SHOT_SIZES = '(min-width: 1120px) 720px, 92vw'
// 以這支 script 的位置找截圖，英文、日文頁（en/、ja/）才不會指到不存在的 en/images/
const IMAGES = new URL('images/', document.currentScript.src).href
const MAIN_SHOTS = {
  mac: {
    light: `${IMAGES}mac-main-1280.webp 1280w, ${IMAGES}mac-main-2400.webp 2400w`,
    dark: `${IMAGES}mac-main-dark-1280.webp 1280w, ${IMAGES}mac-main-dark-2400.webp 2400w`,
  },
  win: {
    light: `${IMAGES}win-main-1280.webp 1280w`,
    dark: `${IMAGES}win-main-dark-1280.webp 1280w`,
  },
}

function detectPlatform() {
  const requested = new URLSearchParams(location.search).get('os')
  if (PLATFORMS.includes(requested)) return requested
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? ''
  return /^win/i.test(platform) || /Windows/.test(navigator.userAgent) ? 'win' : 'mac'
}

function preloadMainShot(platform) {
  for (const [scheme, srcset] of Object.entries(MAIN_SHOTS[platform])) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.type = 'image/webp'
    link.imageSrcset = srcset
    link.imageSizes = MAIN_SHOT_SIZES
    link.media = `(prefers-color-scheme: ${scheme})`
    link.fetchPriority = 'high'
    document.head.append(link)
  }
}

const detectedPlatform = detectPlatform()
document.documentElement.dataset.platform = detectedPlatform
preloadMainShot(detectedPlatform)
