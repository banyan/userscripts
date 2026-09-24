// ==UserScript==
// @name           Hatena Bookmark Side-by-Side Comments
// @namespace      https://github.com/banyan/
// @version        1.3.0
// @description    はてなブックマークの注目コメントと新着コメントを並べて表示する
// @match          https://b.hatena.ne.jp/entry/*
// @run-at         document-end
// @grant          none
// ==/UserScript==

(() => {
  'use strict';

  const root = document.querySelector('.entry-wrapper');
  const panels = root?.querySelector('.js-bookmarks-sort-panels');
  const popular = panels?.querySelector('[data-sort="popular"]');
  const recent = panels?.querySelector('[data-sort="recent"]');
  if (!popular || !recent || root.classList.contains('banyan-dual-comments')) {
    return;
  }

  // Keep the original nodes so stars, menus, and pagination retain their handlers.
  for (const [panel, title] of [
    [popular, '注目コメント'],
    [recent, '新着コメント'],
  ]) {
    const heading = document.createElement('h3');
    heading.className = 'banyan-comment-heading';
    heading.textContent = title;
    panel.prepend(heading);
  }

  const style = document.createElement('style');
  style.textContent = `
    .entry-wrapper.banyan-dual-comments {
      width: calc(100% - 32px);
      max-width: 1440px;
      min-width: 0;
      margin-inline: auto;
    }
    .banyan-dual-comments .entry-aside,
    .banyan-dual-comments .entry-relationContents,
    .banyan-dual-comments > .entry-group,
    .banyan-dual-comments .js-bookmarks-sort-tabs {
      display: none !important;
    }
    .banyan-dual-comments .entry-main {
      flex: 1 1 100%;
      width: 100%;
      min-width: 0;
      padding-right: 0;
      border-right: 0;
      box-sizing: border-box;
    }
    .banyan-dual-comments .js-bookmarks-sort-panels {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;
      align-items: start;
    }
    .banyan-dual-comments .js-bookmarks-sort-panel[data-sort="popular"],
    .banyan-dual-comments .js-bookmarks-sort-panel[data-sort="recent"] {
      display: block !important;
      min-width: 0;
    }
    .banyan-dual-comments .banyan-comment-heading {
      margin: 0;
      padding: 12px 8px;
      border-bottom: 2px solid #00a4cc;
      color: #008eaf;
      font-size: 15px;
      font-weight: bold;
    }
    .banyan-dual-comments [data-sort="recent"] .banyan-also-popular {
      display: none;
    }
    @media (max-width: 800px) {
      .banyan-dual-comments .js-bookmarks-sort-panels {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
      }
    }
  `;
  document.head.append(style);
  root.classList.add('banyan-dual-comments');

  // One bookmark per user per entry, so the user name identifies the comment.
  const ITEM = '.js-bookmark-item[data-user-name]';
  const markAlsoPopular = () => {
    const popularUsers = new Set(
      [...popular.querySelectorAll(ITEM)].map((el) => el.dataset.userName),
    );
    for (const el of recent.querySelectorAll(ITEM)) {
      el.classList.toggle(
        'banyan-also-popular',
        popularUsers.has(el.dataset.userName),
      );
    }
  };
  markAlsoPopular();
  // Both panels append more comments via pagination.
  const observer = new MutationObserver(markAlsoPopular);
  for (const panel of [popular, recent]) {
    observer.observe(panel, { childList: true, subtree: true });
  }
})();
