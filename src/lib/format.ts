/** Markdown-like formatting → HTML with copy buttons on code blocks */
export function formatMessage(text: string, isStreaming?: boolean): string {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks: ```lang\ncode\n``` — with copy button and optional "coding" overlay
    let blockIndex = 0;
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
        const id = `code-block-${blockIndex++}`;
        const langLabel = lang || 'code';
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-block-lang">${langLabel}</span>
                <button class="code-copy-btn" onclick="(function(){
                    var el=document.getElementById('${id}');
                    if(el){navigator.clipboard.writeText(el.textContent||'');
                    var btn=el.closest('.code-block-wrapper').querySelector('.code-copy-btn');
                    btn.innerHTML='Copied!';setTimeout(function(){btn.innerHTML='Copy'},1500)}
                })()" aria-label="Copy code">Copy</button>
            </div>
            <pre><code id="${id}">${code.trim()}</code></pre>
        </div>`;
    });

    // Detect incomplete code block at the end (streaming) — show "Rocode is coding" animation
    if (isStreaming && /```(\w*)\n[^`]*$/.test(text)) {
        // Remove the partial code block from the output and show animated placeholder
        html = html.replace(/```(\w*)\n([^`]*)$/, () => {
            return `<div class="code-block-wrapper coding-animation">
                <div class="coding-indicator">
                    <div class="coding-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span>Rocode is coding...</span>
                </div>
            </div>`;
        });
    }

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}
