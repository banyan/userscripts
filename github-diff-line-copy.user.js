// ==UserScript==
// @name           github-diff-line-copy.user.js
// @namespace      https://github.com/banyan/userscripts
// @version        0.2
// @description    Copy filename and line number when clicking line numbers in GitHub diff view
// @match          https://github.com/*/pull/*/files
// @match          https://github.com/*/commit/*
// @match          https://github.com/*/compare/*
// ==/UserScript==

(() => {
    'use strict';

    function debounce(fn, waitMs) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.call(this, ...args), waitMs);
        };
    }

    const getFilename = (element) => {
        const fileContainer = element.closest('.file');
        if (!fileContainer) return null;

        const filenameLink = fileContainer.querySelector('.file-header a[title]');
        if (filenameLink?.title) return filenameLink.title;

        const pathElement = fileContainer.querySelector('[data-path]');
        return pathElement?.getAttribute('data-path') || null;
    };

    const copyToClipboard = async (text) => {
        await navigator.clipboard.writeText(text);
    };

    const showGitHubTooltip = (element, text) => {
        // Create tooltip using GitHub's native tooltip structure
        const tooltip = document.createElement('div');
        tooltip.className = 'Popover js-hovercard-content position-absolute';
        tooltip.style.cssText = `
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 100;
        `;

        tooltip.innerHTML = `
            <div class="Popover-message Popover-message--bottom-right Box color-shadow-medium">
                <div class="Box-body">
                    <div class="d-flex flex-items-center">
                        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-check color-fg-success mr-2">
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                        </svg>
                        <span class="text-mono text-small">Copied!</span>
                    </div>
                    <div class="text-mono text-small color-fg-muted mt-1">${text}</div>
                </div>
            </div>
        `;

        // Position the tooltip
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        tooltip.style.left = `${rect.left + scrollLeft + rect.width + 8}px`;
        tooltip.style.top = `${rect.top + scrollTop + (rect.height / 2) - 20}px`;

        document.body.appendChild(tooltip);

        // Remove tooltip after delay
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.2s';
            setTimeout(() => tooltip.remove(), 200);
        }, 2000);
    };

    const handleClick = async (e) => {
        const lineNum = e.target.closest('.blob-num-addition.js-linkable-line-number');
        if (!lineNum) return;

        e.preventDefault();
        e.stopPropagation();

        const lineNumber = lineNum.getAttribute('data-line-number');
        const filename = getFilename(lineNum);

        if (!lineNumber || !filename) return;

        const text = `${filename}:${lineNumber}`;

        await copyToClipboard(text);
        showGitHubTooltip(lineNum, text);
    };

    const attachListeners = () => {
        document.addEventListener('click', handleClick, true);
    };

    const addStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .blob-num-addition.js-linkable-line-number {
                cursor: pointer !important;
                position: relative;
            }
            .blob-num-addition.js-linkable-line-number:hover {
                background-color: rgba(40, 167, 69, 0.15) !important;
            }

            /* Ensure tooltip displays properly */
            .Popover.js-hovercard-content .Popover-message {
                animation: fade-in 0.2s;
            }

            @keyframes fade-in {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    };

    const observeContainer = () => {
        Array.from(
            document.getElementsByClassName('js-diff-progressive-container')
        ).forEach((target) => {
            new MutationObserver(
                debounce(() => {
                    // Re-attach event listeners if needed
                }, 300)
            ).observe(target, { childList: true, subtree: true });
        });
    };

    const init = () => {
        attachListeners();
        addStyles();
        observeContainer();
    };

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Listen for GitHub's page transitions (pjax)
    document.addEventListener('pjax:end', () => {
        observeContainer();
    });
})();
