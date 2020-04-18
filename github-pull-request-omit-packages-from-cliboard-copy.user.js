// ==UserScript==
// @name           github-pull-request-omit-packages-from-clipboard-copy
// @namespace      https://github.com/banyan/userscripts
// @version        0.1
// @description    Omit `packages` from the path for vscode multi root workspace
// @match          https://github.com/*/*/pull/*
// ==/UserScript==

(() => {
  const omit = () => {
    document.querySelectorAll('clipboard-copy').forEach((clipboard) => {
      const m = clipboard.value && clipboard.value.match(/^packages\/(.*)$/);
      if (!!m) {
        clipboard.value = m[1];
      }
    });
  };

  window.addEventListener('load', omit);
})();
