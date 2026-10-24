// 在畫面出現前決定顯示 macOS 還是 Windows（網址加 ?os=mac 或 ?os=win 可以指定），結果寫在 <html data-platform>。
// 要在 <head> 同步載入，Windows 使用者才不會先閃過 Mac 的下載鈕（同 eqalert/platform.js）。
const PLATFORMS = ['mac', 'win']

function detectPlatform() {
  const requested = new URLSearchParams(location.search).get('os')
  if (PLATFORMS.includes(requested)) return requested
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? ''
  return /^win/i.test(platform) || /Windows/.test(navigator.userAgent) ? 'win' : 'mac'
}

document.documentElement.dataset.platform = detectPlatform()
