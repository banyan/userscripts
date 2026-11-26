// ==UserScript==
// @name           Yahoo! JAPAN Topics Only
// @namespace      https://github.com/banyan/
// @version        1.0.0
// @description    Yahoo! JAPAN トップのニューストピックスだけを全カテゴリ縦に並べて表示する
// @match          https://www.yahoo.co.jp/
// @match          https://www.yahoo.co.jp/?*
// @run-at         document-end
// @grant          none
// ==/UserScript==

(() => {
  'use strict';

  const ROOT_ID = 'banyan-yahoo-topics';
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const CATEGORIES = {
    topics: { label: '主要', url: 'https://news.yahoo.co.jp/topics/top-picks' },
    economy: {
      label: '経済',
      url: 'https://news.yahoo.co.jp/categories/business',
    },
    entertainment: {
      label: 'エンタメ',
      url: 'https://news.yahoo.co.jp/categories/entertainment',
    },
    sports: {
      label: 'スポーツ',
      url: 'https://news.yahoo.co.jp/categories/sports',
    },
    domestic: {
      label: '国内',
      url: 'https://news.yahoo.co.jp/categories/domestic',
    },
    world: { label: '国際', url: 'https://news.yahoo.co.jp/categories/world' },
    computer: { label: 'IT', url: 'https://news.yahoo.co.jp/categories/it' },
    science: {
      label: '科学',
      url: 'https://news.yahoo.co.jp/categories/science',
    },
    local: { label: '地域', url: 'https://news.yahoo.co.jp/categories/local' },
  };
  const FINANCE_LABELS = {
    nikkei225: '日経平均',
    nydow: 'NYダウ',
    usdExchange: 'ドル/円',
  };

  // The page only renders the selected tab, but the server embeds every tab's
  // articles in the initial store. Read the script text rather than
  // window.__store, which the app bundle may already have consumed.
  const readStore = () => {
    const PREFIX = 'window.__store =';
    const script = [...document.scripts].find((s) =>
      s.textContent.trimStart().startsWith(PREFIX),
    );
    if (!script) {
      throw new Error('Yahoo topics: window.__store script not found');
    }
    const json = script.textContent
      .trim()
      .slice(PREFIX.length)
      .replace(/;$/, '');
    return JSON.parse(json);
  };

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  const formatDate = (unixSeconds) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .formatToParts(new Date(unixSeconds * 1000))
        .map((p) => [p.type, p.value]),
    );
    return `${parts.month}/${parts.day}(${parts.weekday}) ${parts.hour}:${parts.minute}`;
  };

  const renderArticle = (article) => {
    const item = el('li', {}, [
      el('a', {
        className: 'bn-title',
        href: article.link,
        textContent: article.title,
      }),
    ]);
    if (article.isLive) {
      item.append(
        el('span', { className: 'bn-badge bn-live', textContent: 'LIVE' }),
      );
    }
    if (article.isNew) {
      item.append(
        el('span', { className: 'bn-badge bn-new', textContent: 'NEW' }),
      );
    }
    if (article.commentCount > 0) {
      item.append(
        el('span', {
          className: 'bn-comments',
          textContent: article.commentCount.toLocaleString('ja-JP'),
          title: 'コメント数',
        }),
      );
    }
    return item;
  };

  const renderLargeArticle = (large) =>
    el('a', { className: 'bn-large', href: large.link }, [
      el('img', { src: large.image.url, alt: '', loading: 'lazy' }),
      el('span', { className: 'bn-large-title', textContent: large.title }),
      el('span', {
        className: 'bn-meta',
        textContent: `${formatDate(large.pubDateTime)} ${large.copyright}`,
      }),
    ]);

  const renderFinance = (finance) =>
    el(
      'dl',
      { className: 'bn-finance' },
      Object.entries(finance).flatMap(([key, { value, delta }]) => {
        const label = FINANCE_LABELS[key];
        if (!label) {
          throw new Error(`Yahoo topics: unknown finance key "${key}"`);
        }
        const dd = el('dd', { textContent: value });
        if (delta) {
          dd.append(
            el('span', {
              className: delta.startsWith('-') ? 'bn-down' : 'bn-up',
              textContent: ` ${delta}`,
            }),
          );
        }
        return [el('dt', { textContent: label }), dd];
      }),
    );

  const renderTab = (tab) => {
    const category = CATEGORIES[tab.tabId];
    if (!category) {
      throw new Error(`Yahoo topics: unknown tab "${tab.tabId}"`);
    }
    const body = el('div', { className: 'bn-body' }, [
      el('ul', { className: 'bn-list' }, tab.articles.map(renderArticle)),
    ]);
    if (tab.largeArticle) {
      body.append(renderLargeArticle(tab.largeArticle));
    } else if (tab.financeData) {
      body.append(renderFinance(tab.financeData));
    }
    return el('section', { className: 'bn-category' }, [
      el('h2', {}, [
        el('a', { href: category.url, textContent: category.label }),
      ]),
      body,
    ]);
  };

  const { tabs } = readStore().topics;
  if (!tabs?.length) {
    throw new Error('Yahoo topics: no tabs in store');
  }
  // Build everything before hiding the page, so a parse failure leaves it intact.
  const root = el('main', { id: ROOT_ID }, tabs.map(renderTab));

  const style = el('style', {
    textContent: `
      html, body {
        min-width: 0 !important;
        background: #f4f6fb !important;
      }
      body > :not(#${ROOT_ID}) {
        display: none !important;
      }
      #${ROOT_ID} {
        box-sizing: border-box;
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        padding: 24px 16px 48px;
        font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
        color: #222;
      }
      #${ROOT_ID} a {
        color: #1d3994;
        text-decoration: none;
      }
      #${ROOT_ID} a:hover {
        text-decoration: underline;
      }
      #${ROOT_ID} .bn-category {
        margin-bottom: 20px;
        background: #fff;
        border: 1px solid #b6c3e0;
      }
      #${ROOT_ID} h2 {
        margin: 0;
        padding: 10px 16px;
        background: #e8eefb;
        border-bottom: 1px solid #b6c3e0;
        font-size: 16px;
        font-weight: bold;
      }
      #${ROOT_ID} h2 a {
        color: #222;
      }
      #${ROOT_ID} .bn-body {
        display: flex;
        gap: 16px;
        padding: 10px 16px 14px;
      }
      #${ROOT_ID} .bn-list {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      #${ROOT_ID} .bn-list li {
        padding: 5px 0 5px 12px;
        font-size: 16px;
        line-height: 1.5;
        position: relative;
      }
      #${ROOT_ID} .bn-list li::before {
        content: "・";
        position: absolute;
        left: -4px;
      }
      #${ROOT_ID} .bn-badge {
        display: inline-block;
        margin-left: 6px;
        padding: 0 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        line-height: 16px;
        vertical-align: 2px;
        color: #fff;
      }
      #${ROOT_ID} .bn-new {
        background: #f5a700;
      }
      #${ROOT_ID} .bn-live {
        background: #e60033;
      }
      #${ROOT_ID} .bn-comments {
        margin-left: 6px;
        font-size: 13px;
        color: #7a86a3;
      }
      #${ROOT_ID} .bn-comments::before {
        content: "💬";
        margin-right: 2px;
        font-size: 11px;
        filter: grayscale(1) opacity(0.7);
      }
      #${ROOT_ID} .bn-large {
        flex: 0 0 160px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 4px;
      }
      #${ROOT_ID} .bn-large img {
        width: 160px;
        height: 107px;
        object-fit: cover;
      }
      #${ROOT_ID} .bn-large-title {
        font-size: 15px;
        line-height: 1.4;
      }
      #${ROOT_ID} .bn-meta {
        font-size: 12px;
        line-height: 1.4;
        color: #777;
      }
      #${ROOT_ID} .bn-finance {
        flex: 0 0 160px;
        margin: 4px 0 0;
        font-size: 13px;
      }
      #${ROOT_ID} .bn-finance dt {
        color: #777;
      }
      #${ROOT_ID} .bn-finance dd {
        margin: 0 0 8px;
        font-size: 15px;
        font-weight: bold;
      }
      #${ROOT_ID} .bn-up {
        color: #d0021b;
        font-size: 12px;
      }
      #${ROOT_ID} .bn-down {
        color: #1d8a3a;
        font-size: 12px;
      }
      @media (max-width: 600px) {
        #${ROOT_ID} .bn-body {
          flex-direction: column;
        }
        #${ROOT_ID} .bn-large,
        #${ROOT_ID} .bn-finance {
          flex-basis: auto;
        }
      }
    `,
  });
  document.head.append(style);
  document.body.append(root);
})();
