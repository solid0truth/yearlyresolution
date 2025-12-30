# 2026 Resolution Mindmap

A hierarchical mindmap application for planning and tracking yearly resolutions with built-in budget management for time, money, and books.

## Features

- **5-Level Hierarchy** (L1-L5) - Organize goals from high-level to detailed tasks
- **Budget Tracking** - Track and aggregate time, money, and book budgets across the hierarchy
- **Keyboard Shortcuts** - Navigate and edit efficiently without a mouse
- **Drag & Drop** - Reorganize nodes with visual preview of drop location
- **Data Persistence** - Auto-save to browser localStorage
- **Import/Export** - CSV support for data backup and sharing

## Project Structure

```
yearlyresolution/
├── index.html          # Main HTML structure
├── styles.css          # All styling and CSS
├── app.js              # Application logic and functionality
├── data.json           # Default/initial node data (JSON format)
└── README.md           # This file
```

## File Organization

### index.html
Clean HTML structure with semantic markup. Links to external CSS and JavaScript files.

### styles.css
All application styling including:
- Responsive layout
- Node hierarchy colors and indentation
- Drag-and-drop visual feedback
- Modal and form styles
- Animations

### app.js
Complete application logic including:
- Data model and state management
- Keyboard navigation system
- Drag-and-drop functionality
- Budget calculations
- Local storage persistence
- CSV import/export functions

### data.json
Default node data in JSON format. Contains the initial mindmap structure with sample nodes for "Me", "Knowledge management", "Body / Health", etc.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ↑↓ | Navigate between nodes |
| ←→ | Collapse/Expand nodes |
| Tab | Add child node |
| Enter | Add sibling node |
| Space | Edit node title |
| D | Toggle details |
| Backspace/Delete | Delete node |

## Getting Started

1. Open `index.html` in a web browser
2. Start editing nodes or create your own structure
3. Changes are automatically saved to localStorage
4. Use CSV export for backups

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript
- CSS Grid and Flexbox
- LocalStorage API
- HTML5 Drag and Drop API

## Development

To modify the application:

1. **Styling**: Edit `styles.css`
2. **Functionality**: Edit `app.js`
3. **Structure**: Edit `index.html`
4. **Default Data**: Edit `data.json` and update the nodes array in `app.js`

## License

This project is open source and available for personal and commercial use.
