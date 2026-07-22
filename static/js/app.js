let rawEntries = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes();
    setupEventListeners();
    setupKeyboardShortcuts();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeToggleAria(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleAria(newTheme);
    showToast(`Switched to ${newTheme} mode`);
}

function updateThemeToggleAria(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
    }
}

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchReleaseNotes);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-pressed', 'false');
            });
            e.target.classList.add('active');
            e.target.setAttribute('aria-pressed', 'true');
            currentFilter = e.target.dataset.filter;
            renderEntries();
        });
    });

    const tweetTextarea = document.getElementById('tweetTextarea');
    if (tweetTextarea) tweetTextarea.addEventListener('input', updateCharCount);

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    const postTweetBtn = document.getElementById('postTweetBtn');
    if (postTweetBtn) postTweetBtn.addEventListener('click', launchTweetIntent);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('modalOverlay');
            if (overlay && overlay.classList.contains('active')) {
                closeModal();
            }
        }
    });
}

async function fetchReleaseNotes() {
    const refreshBtn = document.getElementById('refreshBtn');
    const container = document.getElementById('entriesContainer');
    
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }

    if (rawEntries.length === 0 && container) {
        container.innerHTML = `
            <div class="card skeleton" style="height: 140px;" aria-hidden="true"></div>
            <div class="card skeleton" style="height: 140px;" aria-hidden="true"></div>
            <div class="card skeleton" style="height: 140px;" aria-hidden="true"></div>
        `;
    }

    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();
        
        if (data.status === 'success') {
            rawEntries = data.entries;
            const lastUpdatedEl = document.getElementById('lastUpdated');
            if (lastUpdatedEl) lastUpdatedEl.textContent = `Loaded ${data.count} release dates`;
            renderEntries();
        } else {
            showError("Failed to load release notes: " + data.message);
        }
    } catch (err) {
        showError("Network error while fetching release notes.");
        console.error(err);
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
}

function renderEntries() {
    const container = document.getElementById('entriesContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!rawEntries || rawEntries.length === 0) {
        container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-muted);">No release notes found.</p></div>';
        return;
    }

    rawEntries.forEach((entry, entryIdx) => {
        const parsedBlocks = parseContent(entry.content_html, entry.title, entry.link);
        
        const filteredBlocks = parsedBlocks.filter(b => {
            if (currentFilter === 'all') return true;
            return b.category.toLowerCase() === currentFilter;
        });

        if (filteredBlocks.length === 0 && currentFilter !== 'all') return;

        const card = document.createElement('article');
        card.className = 'card';
        card.setAttribute('aria-labelledby', `card-title-${entryIdx}`);

        const headerHtml = `
            <div class="card-header">
                <div class="card-date" id="card-title-${entryIdx}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${escapeHtml(entry.title)}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-copy" aria-label="Copy release notes for ${escapeHtml(entry.title)}" onclick="copyCardContent(${entryIdx})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                    <button class="btn-tweet" aria-label="Share release notes for ${escapeHtml(entry.title)} on Twitter" onclick="prepareTweetForEntry('${escapeHtml(entry.title)}', '${escapeHtml(entry.link)}')">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
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
                        <div class="block-actions">
                            <button class="btn-tweet-block" aria-label="Tweet this ${escapeHtml(block.category)} update" onclick="openTweetModal('${escapeHtml(block.plainText)}', '${escapeHtml(entry.title)}', '${escapeHtml(entry.link)}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                Tweet update
                            </button>
                        </div>
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

function copyCardContent(entryIdx) {
    if (!rawEntries[entryIdx]) return;
    const entry = rawEntries[entryIdx];
    const blocks = parseContent(entry.content_html, entry.title, entry.link);
    
    let textToCopy = `Google BigQuery Release Notes - ${entry.title}\nLink: ${entry.link}\n\n`;
    blocks.forEach(b => {
        textToCopy += `[${b.category}]\n${b.plainText}\n\n`;
    });

    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
        showToast('Card copied to clipboard! 📋');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy to clipboard.');
    });
}

function exportToCSV() {
    if (!rawEntries || rawEntries.length === 0) {
        showToast('No release notes available to export.');
        return;
    }

    const rows = [['Date', 'Category', 'Update Content', 'Link']];

    rawEntries.forEach(entry => {
        const blocks = parseContent(entry.content_html, entry.title, entry.link);
        blocks.forEach(b => {
            if (currentFilter !== 'all' && b.category.toLowerCase() !== currentFilter) {
                return;
            }
            const cleanText = b.plainText.replace(/"/g, '""');
            rows.push([
                `"${entry.title.replace(/"/g, '""')}"`,
                `"${b.category.replace(/"/g, '""')}"`,
                `"${cleanText}"`,
                `"${entry.link}"`
            ]);
        });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Exported release notes to CSV! 📊');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function prepareTweetForEntry(title, link) {
    const tweetText = `Check out Google BigQuery updates for ${title}! ${link} #BigQuery #GoogleCloud`;
    showModal(tweetText);
}

function openTweetModal(textSnippet, title, link) {
    const cleanSnippet = textSnippet.replace(/\s+/g, ' ').substring(0, 160);
    const tweetText = `🚀 BigQuery Update (${title}):\n"${cleanSnippet}..."\n\nRead more: ${link}\n#BigQuery #GoogleCloud`;
    showModal(tweetText);
}

function showModal(text) {
    const textarea = document.getElementById('tweetTextarea');
    if (textarea) textarea.value = text;
    updateCharCount();
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
    }
    if (textarea) textarea.focus();
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

function updateCharCount() {
    const textarea = document.getElementById('tweetTextarea');
    const counter = document.getElementById('charCounter');
    if (!textarea || !counter) return;

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
    const textarea = document.getElementById('tweetTextarea');
    if (!textarea) return;
    const text = textarea.value;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank');
    closeModal();
}

function showError(msg) {
    const container = document.getElementById('entriesContainer');
    if (container) {
        container.innerHTML = `
            <div class="card" style="border-color: #ef4444;">
                <p style="color: #ef4444; font-weight: 600;">⚠️ ${escapeHtml(msg)}</p>
            </div>
        `;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
