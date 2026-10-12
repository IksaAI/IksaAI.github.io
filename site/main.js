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
