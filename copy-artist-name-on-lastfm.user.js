// ==UserScript==
// @name           copy-artist-name-on-lastfm.user.js
// @namespace      https://github.com/banyan/userscripts
// @version        0.1
// @description    Copy artist name to clipboard on last.fm
// @match          https://www.last.fm/user/*/library/artists
// ==/UserScript==

(() => {
  const names = document.querySelectorAll('.chartlist-name');
  for (const name of names) {
    name.onclick = async () => {
      const origTextColor = getComputedStyle(name).color;
      await navigator.clipboard.writeText(name.innerText);
      name.style = 'color: #BB0003';
      setTimeout(() => {
        name.style = `color: ${origTextColor}`;
      }, 500);
    };
  }
})();
