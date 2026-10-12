// Google Analytics 4（評估 ID G-Y5PN5P55LH）
// CSP 不允許 inline script，所以 gtag 的初始化放在這個檔案；gtag.js 本身由各頁 <head> 非同步載入
window.dataLayer = window.dataLayer || []
function gtag() {
  // gtag.js 只認 arguments 物件，不能改成陣列或 rest 參數
  window.dataLayer.push(arguments)
}
gtag('js', new Date())
gtag('config', 'G-Y5PN5P55LH')
