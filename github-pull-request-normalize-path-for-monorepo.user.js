// ==UserScript==
// @name           github-pull-request-normalize-path-for-monorepo
// @namespace      https://github.com/banyan/userscripts
// @version        0.1
// @description    Omit `packages` and 'src' from the path to align with vscode multi root workspace
// @match          https://github.com/*/*/pull/*
// ==/UserScript==

(() => {
  function debounce(fn, waitMs) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.call(this, ...args), waitMs);
    };
  }

  const normalizePathForMonorepo = () => {
    document.querySelectorAll('clipboard-copy').forEach((clipboard) => {
      const regexp = /^packages\/(.*)\/src\/(.*)$/;
      const m = clipboard.value && clipboard.value.match(regexp);
      if (!!m) {
        clipboard.value = [m[1], m[2]].join('/');
      }
    });
  };

  const observeContainer = () => {
    Array.from(
      document.getElementsByClassName('js-diff-progressive-container'),
    ).forEach((target) => {
      new MutationObserver(
        debounce(normalizePathForMonorepo, 1000),
      ).observe(target, { childList: true });
    });
  };

  window.addEventListener('load', () => {
    normalizePathForMonorepo();
    observeContainer();
  });

  // Listen page transition event by pjax
  document.addEventListener(
    'pjax:end',
    () => {
      normalizePathForMonorepo();
      observeContainer();
    },
    true,
  );
})();
