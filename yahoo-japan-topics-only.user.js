// ==UserScript==
// @name           Yahoo! JAPAN Topics Only
// @namespace      https://github.com/banyan/
// @version        1.2.0
// @description    Yahoo! JAPAN トップのニューストピックスだけを全カテゴリ一画面に並べて表示する
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

  const MAIN_TAB = 'topics';
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
      el('img', { src: large.image.url, alt: '' }),
      el('span', { className: 'bn-large-title', textContent: large.title }),
      el('span', {
        className: 'bn-meta',
        textContent: `${formatDate(large.pubDateTime)} ${large.copyright}`,
      }),
    ]);

  const renderFinance = (finance) =>
    el(
      'p',
      { className: 'bn-finance' },
      Object.entries(finance).map(([key, { value, delta }]) => {
        const label = FINANCE_LABELS[key];
        if (!label) {
          throw new Error(`Yahoo topics: unknown finance key "${key}"`);
        }
        const item = el('span', { className: 'bn-finance-item' }, [
          `${label} `,
          el('b', { textContent: value }),
        ]);
        if (delta) {
          item.append(
            el('span', {
              className: delta.startsWith('-') ? 'bn-down' : 'bn-up',
              textContent: ` ${delta}`,
            }),
          );
        }
        return item;
      }),
    );

  const renderTab = (tab) => {
    const category = CATEGORIES[tab.tabId];
    if (!category) {
      throw new Error(`Yahoo topics: unknown tab "${tab.tabId}"`);
    }
    const isMain = tab.tabId === MAIN_TAB;
    const body = el('div', { className: 'bn-body' }, [
      el('ul', { className: 'bn-list' }, tab.articles.map(renderArticle)),
    ]);
    // Only the main card has room for the photo article; the small cards
    // stay text-only so all categories fit on one screen.
    if (isMain && tab.largeArticle) {
      body.append(renderLargeArticle(tab.largeArticle));
    }
    const section = el(
      'section',
      { className: isMain ? 'bn-category bn-main' : 'bn-category' },
      [
        el('h2', {}, [
          el('a', { href: category.url, textContent: category.label }),
        ]),
        body,
      ],
    );
    if (tab.financeData) {
      section.append(renderFinance(tab.financeData));
    }
    return section;
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
      /* Two columns of cards as wide as a single readable column. */
      #${ROOT_ID} {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 728px));
        justify-content: center;
        gap: 20px;
        align-items: start;
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
        min-width: 0;
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
        gap: 24px;
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
        font-weight: normal;
        color: #7a86a3;
      }
      #${ROOT_ID} .bn-comments::before {
        content: "💬";
        margin-right: 2px;
        font-size: 11px;
        filter: grayscale(1) opacity(0.7);
      }
      #${ROOT_ID} .bn-finance {
        display: flex;
        flex-wrap: wrap;
        gap: 2px 16px;
        margin: 0;
        padding: 8px 16px;
        border-top: 1px solid #e3e8f3;
        font-size: 13px;
        color: #555;
      }
      #${ROOT_ID} .bn-finance b {
        color: #222;
      }
      #${ROOT_ID} .bn-up {
        color: #d0021b;
      }
      #${ROOT_ID} .bn-down {
        color: #1d8a3a;
      }

      /*
       * The main topics card spans both columns and stands out by size,
       * weight and photo, not color.
       */
      #${ROOT_ID} .bn-main {
        grid-column: 1 / -1;
        border-width: 2px;
      }
      #${ROOT_ID} .bn-main h2 {
        padding: 10px 20px;
        font-size: 22px;
      }
      #${ROOT_ID} .bn-main .bn-body {
        padding: 12px 20px 16px;
      }
      #${ROOT_ID} .bn-main .bn-list li {
        padding: 6px 0 6px 14px;
        font-size: 20px;
        font-weight: bold;
      }
      #${ROOT_ID} .bn-main .bn-comments {
        font-size: 14px;
      }
      #${ROOT_ID} .bn-large {
        flex: 0 0 360px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-top: 6px;
      }
      #${ROOT_ID} .bn-large img {
        width: 100%;
        aspect-ratio: 3 / 2;
        object-fit: cover;
      }
      #${ROOT_ID} .bn-large-title {
        font-size: 16px;
        line-height: 1.4;
      }
      #${ROOT_ID} .bn-meta {
        font-size: 12px;
        line-height: 1.4;
        color: #777;
      }

      @media (max-width: 1000px) {
        #${ROOT_ID} {
          grid-template-columns: minmax(0, 728px);
        }
      }
      @media (max-width: 640px) {
        #${ROOT_ID} .bn-main .bn-body {
          flex-direction: column;
        }
        #${ROOT_ID} .bn-large {
          flex-basis: auto;
        }
      }
    `,
  });
  document.head.append(style);
  document.body.append(root);
})();
