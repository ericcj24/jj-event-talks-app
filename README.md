# BigQuery Pulse 🚀

**BigQuery Pulse** is a lightweight, modern web application built with Python (Flask) and vanilla JavaScript that tracks official Google BigQuery release notes in real time and provides an integrated, one-click social publisher to share updates on X (formerly Twitter).

---

## 🌟 Key Features

- **Live RSS/Atom Feed Aggregation**: Automatically fetches and parses Google's official BigQuery release notes XML feed via a backend API endpoint.
- **Categorized Feed Items**: Automatically parses update sections into categories such as **Features**, **Changed**, and **Issues** with color-coded badges.
- **Interactive Filtering**: Filter release updates instantly by category (*All Updates*, *Features*, *Changed*, *Issues*).
- **Social Publisher (X/Twitter Integration)**: Compose and tweet updates directly from a modal pre-filled with formatted text snippets, links, and relevant hashtags (`#BigQuery #GoogleCloud`).
- **Modern Responsive UI**: Built with a sleek dark theme, fluid flex/grid layouts, skeleton loading placeholders, and character counter validation for Twitter's 280-character limit.

---

## 📁 Project Structure

```
├── app.py                      # Flask backend API & feed proxy
├── static/
│   ├── css/
│   │   └── style.css           # Custom CSS styling (dark theme, animations, layouts)
│   └── js/
│       └── app.js              # Client-side logic (API fetching, HTML parsing, filter, modal)
├── templates/
│   └── index.html              # Main HTML5 UI template
├── news.txt                    # Raw feed sample / documentation reference
├── news_summary.txt            # Formatted feed summary reference
└── .gitignore                  # Git ignore rules for Python, OS, & IDE files
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- `pip` (Python package manager)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ericcj24/jj-event-talks-app.git
   cd jj-event-talks-app
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install flask requests feedparser
   ```

---

## 🛠️ Usage

1. **Run the Flask application**:
   ```bash
   python app.py
   ```

2. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

3. **Interact with the App**:
   - Click **Refresh Feed** to reload updates from Google Cloud.
   - Use the category filter chips to toggle between features, changes, and bug fixes.
   - Click **Tweet this update** or **Share Date** on any entry to open the Twitter composer modal.

---

## ⚙️ How It Works (Architecture & Data Flow)

1. **Backend Proxy (`GET /api/release-notes`)**:
   - `app.py` fetches the external Google XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) with a custom `User-Agent`.
   - Uses `feedparser` to parse XML into clean JSON entries containing titles, dates, links, and raw HTML content.

2. **Client Processing (`static/js/app.js`)**:
   - Fetches `/api/release-notes` via `fetch()`.
   - Parses the HTML string of each entry using DOM manipulation to identify `<h3>` tags (*Feature*, *Changed*, etc.) and slice them into individual update blocks.
   - Renders interactive cards with category tags and social share buttons.

3. **Social Web Intent**:
   - Opens an X/Twitter URL intent (`https://twitter.com/intent/tweet?text=...`) pre-populated with formatted title, link, snippet, and hashtags.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
