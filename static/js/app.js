let rawEntries = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', fetchReleaseNotes);

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderEntries();
        });
    });

    const tweetTextarea = document.getElementById('tweetTextarea');
    tweetTextarea.addEventListener('input', updateCharCount);

    const closeModalBtn = document.getElementById('closeModalBtn');
    closeModalBtn.addEventListener('click', closeModal);

    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    const postTweetBtn = document.getElementById('postTweetBtn');
    postTweetBtn.addEventListener('click', launchTweetIntent);
}

async function fetchReleaseNotes() {
    const refreshBtn = document.getElementById('refreshBtn');
    const container = document.getElementById('entriesContainer');
    
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    if (rawEntries.length === 0) {
        container.innerHTML = `
            <div class="card skeleton" style="height: 140px;"></div>
            <div class="card skeleton" style="height: 140px;"></div>
            <div class="card skeleton" style="height: 140px;"></div>
        `;
    }

    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();
        
        if (data.status === 'success') {
            rawEntries = data.entries;
            document.getElementById('lastUpdated').textContent = `Loaded ${data.count} release dates`;
            renderEntries();
        } else {
            showError("Failed to load release notes: " + data.message);
        }
    } catch (err) {
        showError("Network error while fetching release notes.");
        console.error(err);
    } finally {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
}

function renderEntries() {
    const container = document.getElementById('entriesContainer');
    container.innerHTML = '';

    if (!rawEntries || rawEntries.length === 0) {
        container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-muted);">No release notes found.</p></div>';
        return;
    }

    rawEntries.forEach(entry => {
        const parsedBlocks = parseContent(entry.content_html, entry.title, entry.link);
        
        // Filter blocks if needed
        const filteredBlocks = parsedBlocks.filter(b => {
            if (currentFilter === 'all') return true;
            return b.category.toLowerCase() === currentFilter;
        });

        if (filteredBlocks.length === 0 && currentFilter !== 'all') return;

        const card = document.createElement('div');
        card.className = 'card';

        const headerHtml = `
            <div class="card-header">
                <div class="card-date">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${escapeHtml(entry.title)}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-tweet" onclick="prepareTweetForEntry('${escapeHtml(entry.title)}', '${escapeHtml(entry.link)}')">
                        <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Share Date
                    </button>
                </div>
            </div>
        `;

        let contentHtml = `<div class="card-content">`;
        
        filteredBlocks.forEach(block => {
            contentHtml += `
                <div class="update-block" style="border-left-color: ${getCategoryColor(block.category)};">
                    <div class="update-block-header">
                        <span class="tag-badge ${block.category.toLowerCase()}">${escapeHtml(block.category)}</span>
                        <button class="btn-tweet-block" onclick="openTweetModal('${escapeHtml(block.plainText)}', '${escapeHtml(entry.title)}', '${escapeHtml(entry.link)}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            Tweet this update
                        </button>
                    </div>
                    <div>${block.html}</div>
                </div>
            `;
        });

        contentHtml += `</div>`;
        card.innerHTML = headerHtml + contentHtml;
        container.appendChild(card);
    });
}

function parseContent(html, dateTitle, link) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const blocks = [];
    let currentCategory = 'General';
    let currentHtml = '';
    let currentText = '';

    const children = Array.from(tempDiv.children);

    if (children.length === 0) {
        return [{
            category: 'General',
            html: html,
            plainText: tempDiv.textContent.trim()
        }];
    }

    children.forEach((child) => {
        if (child.tagName.toLowerCase() === 'h3') {
            if (currentHtml.trim().length > 0) {
                blocks.push({
                    category: currentCategory,
                    html: currentHtml,
                    plainText: currentText.trim()
                });
            }
            currentCategory = child.textContent.trim();
            currentHtml = '';
            currentText = '';
        } else {
            currentHtml += child.outerHTML;
            currentText += child.textContent + " ";
        }
    });

    if (currentHtml.trim().length > 0) {
        blocks.push({
            category: currentCategory,
            html: currentHtml,
            plainText: currentText.trim()
        });
    }

    return blocks;
}

function getCategoryColor(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) return '#10b981';
    if (cat.includes('changed') || cat.includes('change')) return '#f59e0b';
    if (cat.includes('issue') || cat.includes('fix')) return '#ef4444';
    return '#8b5cf6';
}

function prepareTweetForEntry(title, link) {
    const tweetText = `Check out Google BigQuery updates for ${title}! ${link} #BigQuery #GoogleCloud`;
    showModal(tweetText);
}

function openTweetModal(textSnippet, title, link) {
    // Format text nicely for Twitter
    const cleanSnippet = textSnippet.replace(/\s+/g, ' ').substring(0, 160);
    const tweetText = `🚀 BigQuery Update (${title}):\n"${cleanSnippet}..."\n\nRead more: ${link}\n#BigQuery #GoogleCloud`;
    showModal(tweetText);
}

function showModal(text) {
    const textarea = document.getElementById('tweetTextarea');
    textarea.value = text;
    updateCharCount();
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function updateCharCount() {
    const textarea = document.getElementById('tweetTextarea');
    const counter = document.getElementById('charCounter');
    const len = textarea.value.length;
    counter.textContent = `${len} / 280`;

    counter.classList.remove('warning', 'exceeded');
    if (len > 280) {
        counter.classList.add('exceeded');
    } else if (len > 240) {
        counter.classList.add('warning');
    }
}

function launchTweetIntent() {
    const text = document.getElementById('tweetTextarea').value;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank');
    closeModal();
}

function showError(msg) {
    const container = document.getElementById('entriesContainer');
    container.innerHTML = `
        <div class="card" style="border-color: #ef4444;">
            <p style="color: #ef4444; font-weight: 600;">⚠️ ${escapeHtml(msg)}</p>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
