// ==UserScript==
// @name           github-pull-request-normalize-path-for-monorepo
// @namespace      https://github.com/banyan/userscripts
// @version        0.1
// @description    Omit `packages` and 'src' from the path to align with vscode multi root workspace
// @match          https://github.com/*/*/pull/*
// ==/UserScript==

(() => {
  const normalizePathForMonorepo = () => {
    document.querySelectorAll('clipboard-copy').forEach((clipboard) => {
      const regexp = /^packages\/(.*)\/src\/(.*)$/;
      const m = clipboard.value && clipboard.value.match(regexp);
      if (!!m) {
        clipboard.value = [m[1], m[2]].join('/');
      }
    });
  };

  window.addEventListener('load', normalizePathForMonorepo);
})();
