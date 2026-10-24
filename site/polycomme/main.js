// macOS／Windows 切換：顯示哪個平台由 <html data-platform> 決定，platform.js 載入時先判斷一次
const switchButtons = document.querySelectorAll('[data-set-os]')

function showPlatform(platform) {
  document.documentElement.dataset.platform = platform
  for (const button of switchButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.setOs === platform))
  }
}

for (const button of switchButtons) {
  button.addEventListener('click', () => showPlatform(button.dataset.setOs))
}
showPlatform(document.documentElement.dataset.platform ?? 'mac')
