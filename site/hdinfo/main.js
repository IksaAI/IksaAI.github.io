// 「複製」按鈕：複製指令到剪貼簿，失敗時請使用者手動選取
const COPIED_RESET_MS = 2000
const COPY_TEXT = {
  zh: { copied: '已複製', manual: '請按 ⌘C 複製' },
  en: { copied: 'Copied', manual: 'Press ⌘C to copy' },
  ja: { copied: 'コピーしました', manual: '⌘C でコピーしてください' },
}
const copyText = COPY_TEXT[document.documentElement.lang.slice(0, 2)] ?? COPY_TEXT.zh

for (const button of document.querySelectorAll('[data-copy-target]')) {
  const label = button.textContent
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget)
    if (!target) return
    try {
      await navigator.clipboard.writeText(target.textContent.trim())
      button.textContent = copyText.copied
    } catch {
      window.getSelection()?.selectAllChildren(target)
      button.textContent = copyText.manual
    }
    setTimeout(() => {
      button.textContent = label
    }, COPIED_RESET_MS)
  })
}
