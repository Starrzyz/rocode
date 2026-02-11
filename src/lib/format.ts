/** 
 * Advanced markdown → HTML formatter.
 * Handles: headers, bold, italic, strikethrough, ordered/unordered lists,
 * blockquotes, horizontal rules, links, code blocks, inline code, line breaks.
 * Code blocks get a data attribute for copy functionality.
 */
export function formatMessage(text: string, isStreaming?: boolean): string {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // ── Code blocks: ```lang\ncode\n``` ──
    let blockIndex = 0;
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
        const id = `codeblock-${blockIndex++}-${Date.now()}`;
        const langLabel = lang || 'code';
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-block-lang">${langLabel}</span>
                <button class="code-copy-btn" data-copy-target="${id}" aria-label="Copy code">Copy</button>
            </div>
            <pre><code id="${id}">${code.trim()}</code></pre>
        </div>`;
    });

    // ── Incomplete code block while streaming → "Rocode is coding..." ──
    if (isStreaming && /```(\w*)\n[^`]*$/.test(text)) {
        html = html.replace(/```(\w*)\n([^`]*)$/, () => {
            return `<div class="code-block-wrapper coding-animation">
                <div class="coding-indicator">
                    <div class="coding-dots"><span></span><span></span><span></span></div>
                    <span>Rocode is writing code...</span>
                </div>
            </div>`;
        });
    }

    // ── Blockquotes: > text ──
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // ── Headers: # to ###### ──
    html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

    // ── Horizontal rules: --- or *** ──
    html = html.replace(/^(-{3,}|\*{3,})$/gm, '<hr>');

    // ── Unordered lists: - item or * item ──
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // ── Ordered lists: 1. item ──
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // ── Links: [text](url) ──
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // ── Inline code: `code` (after code blocks so backticks in code blocks are safe) ──
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // ── Bold + Italic: ***text*** ──
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // ── Bold: **text** ──
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // ── Italic: *text* ──
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // ── Strikethrough: ~~text~~ ──
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // ── Line breaks (but not after block elements) ──
    html = html.replace(/\n/g, '<br>');
    // Clean up <br> after block elements
    html = html.replace(/(<\/h[1-6]>|<\/blockquote>|<\/ul>|<\/li>|<\/pre>|<\/div>|<hr>)<br>/g, '$1');

    return html;
}
