/** Simple markdown-like formatting → HTML */
export function formatMessage(text: string): string {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}
