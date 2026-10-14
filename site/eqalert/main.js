// 「複製」按鈕：複製指令到剪貼簿，失敗時請使用者手動選取
const COPIED_RESET_MS = 2000

for (const button of document.querySelectorAll('[data-copy-target]')) {
  const label = button.textContent
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget)
    if (!target) return
    try {
      await navigator.clipboard.writeText(target.textContent.trim())
      button.textContent = '已複製'
    } catch {
      window.getSelection()?.selectAllChildren(target)
      button.textContent = '請按 ⌘C 複製'
    }
    setTimeout(() => {
      button.textContent = label
    }, COPIED_RESET_MS)
  })
}

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
