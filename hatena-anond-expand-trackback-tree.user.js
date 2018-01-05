// ==UserScript==
// @name           Hatena Anond Expand Trackback Tree
// @namespace      https://github.com/banyan/
// @version        1.2
// @description    はてな匿名ダイアリーのトラックバックツリーをはじめから開いた状態にする
// @match          https://anond.hatelabo.jp/*
// @require        https://gist.githubusercontent.com/os0x/29681/raw/2cedf778cedec6ca4f70b753172fbab445dd0c47/dollarX.js
// ==/UserScript==

(() => {
  const executeBrowserContext = (ids) => {
    ids.forEach((id) => {
      window.eval(`toggleTBContent(${id})`) // works with GM4 as well
    })
  }

  const links = $X("//div[@class=\"refererlist\"]/descendant::li/descendant::a[1]")
  const ids = links.filter(link => (
    link.className !== 'self' && link.href.match(/^https:\/\/anond\.hatelabo\.jp/) // 今開いているエントリーのトラックバックは開かない
  )).map(link => link.href.match(/\d+/))

  executeBrowserContext(ids)
})()
