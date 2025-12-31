/**
 * 2026 Resolution Mindmap - Application Logic
 *
 * A hierarchical mindmap tool for planning and tracking yearly resolutions
 * with budget tracking for time, money, and books.
 *
 * Features:
 * - 5-level hierarchical structure (L1-L5)
 * - Keyboard shortcuts for navigation and editing
 * - Drag-and-drop with visual preview
 * - Budget tracking and aggregation
 * - Local storage persistence
 * - CSV import/export
 * - Dynamic data loading from data.json
 */

// Global state variables
let nodes = [];
let nextId = 1;
let selectedNodeId = null;
let draggedNodeId = null;
let draggedNode = null;

// Keyboard navigation functions
function getAllVisibleNodes() {
    return Array.from(document.querySelectorAll('.node')).map(el =>
        parseInt(el.dataset.nodeId)
    );
}

function selectNode(nodeId, scroll = true) {
    // Remove previous selection
    document.querySelectorAll('.node').forEach(n => n.classList.remove('selected', 'focused'));

    selectedNodeId = nodeId;
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) {
        nodeEl.classList.add('selected', 'focused');
        if (scroll) {
            nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function moveSelection(direction) {
    const visibleNodes = getAllVisibleNodes();
    if (visibleNodes.length === 0) return;

    if (!selectedNodeId) {
        selectNode(visibleNodes[0]);
        return;
    }

    const currentIndex = visibleNodes.indexOf(selectedNodeId);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'up') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
    } else {
        newIndex = currentIndex < visibleNodes.length - 1 ? currentIndex + 1 : currentIndex;
    }

    selectNode(visibleNodes[newIndex]);
}

function toggleSelectedNodeDetails() {
    if (!selectedNodeId) return;
    const details = document.getElementById(`details-${selectedNodeId}`);
    if (details) {
        details.classList.toggle('expanded');
    }
}

function expandSelectedNode() {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const hasChildren = nodes.some(n => n.parent === selectedNodeId);
    if (hasChildren) {
        node.collapsed = false;
        renderMindmap();
        selectNode(selectedNodeId, false);
    }
}

function collapseSelectedNode() {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const hasChildren = nodes.some(n => n.parent === selectedNodeId);
    if (hasChildren) {
        node.collapsed = true;
        renderMindmap();
        selectNode(selectedNodeId, false);
    }
}

function startEditingTitle(nodeId) {
    const titleSpan = document.getElementById(`title-${nodeId}`);
    if (titleSpan) {
        titleSpan.contentEditable = "true";
        titleSpan.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function finishEditingTitle(nodeId) {
    const titleSpan = document.getElementById(`title-${nodeId}`);
    if (titleSpan) {
        const newTitle = titleSpan.textContent.trim();
        titleSpan.contentEditable = "false";

        if (newTitle && newTitle !== '') {
            const node = nodes.find(n => n.id === nodeId);
            if (node && node.title !== newTitle) {
                node.title = newTitle;
                saveData();
            }
        } else {
            // Restore original title if empty
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                titleSpan.textContent = node.title;
            }
        }
    }
}

function editSelectedNodeTitle() {
    if (!selectedNodeId) return;
    startEditingTitle(selectedNodeId);
}

// Handle double-click on title
function handleTitleDoubleClick(nodeId) {
    const details = document.getElementById(`details-${nodeId}`);

    // If details are expanded, collapse them instead of editing
    if (details && details.classList.contains('expanded')) {
        toggleNode(nodeId);
    } else {
        // If details are collapsed, start editing the title
        startEditingTitle(nodeId);
    }
}

// Toggle inline display of attributes
function toggleInlineDisplay(nodeId, attr, checked) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (!node.inlineDisplay) {
        node.inlineDisplay = [];
    }

    if (checked) {
        // Add attribute to inline display if not already there
        if (!node.inlineDisplay.includes(attr)) {
            node.inlineDisplay.push(attr);
        }
    } else {
        // Remove attribute from inline display
        node.inlineDisplay = node.inlineDisplay.filter(a => a !== attr);
    }

    saveData();
    renderMindmap();
    selectNode(nodeId, false);
}

// Start inline editing for time/money
function startInlineEdit(nodeId, attr, element) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Get current value (remove emoji prefix)
    const currentValue = node[attr] || '';

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.style.cssText = 'width: 80px; padding: 2px 4px; border: 1px solid #007aff; border-radius: 3px; font-size: 0.9em;';

    // Replace the span with input
    const parent = element.parentElement;
    parent.replaceChild(input, element);
    input.focus();
    input.select();

    // Save on blur or Enter
    const finishEdit = () => {
        const newValue = input.value.trim();
        node[attr] = newValue;
        saveData();
        renderMindmap();
        selectNode(nodeId, false);
    };

    input.onblur = finishEdit;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            finishEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            renderMindmap();
            selectNode(nodeId, false);
        }
    };
}

function addSiblingNode() {
    if (!selectedNodeId) {
        showAddNodeDialog();
        return;
    }

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    const newTitle = prompt('New node title:');
    if (!newTitle || !newTitle.trim()) return;

    const newNode = {
        id: nextId++,
        level: selectedNode.level,
        title: newTitle.trim(),
        parent: selectedNode.parent,
        collapsed: false,
        priority: '',
        action: '',
        time: '',
        money: '',
        knowledge: '',
        when: '',
        where: '',
        with: '',
        tools: '',
        book: '',
        recordEnabled: false,
        longTermGoal: '',
        yearGoal: '',
        shareEnabled: false,
        shareTo: '',
        recordFrequency: 'daily',
        timeBudget: '',
        moneyBudget: '',
        bookBudget: '',
        inlineDisplay: []  // Array of attribute names to show inline when collapsed
    };

    nodes.push(newNode);
    renderMindmap();
    selectNode(newNode.id);
    saveData();
}

function addChildNode() {
    if (!selectedNodeId) {
        showAddNodeDialog();
        return;
    }

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;

    const currentLevel = parseInt(selectedNode.level.substring(1));
    if (currentLevel >= 5) {
        alert('Maximum level (L5) reached');
        return;
    }

    const newTitle = prompt('New child node title:');
    if (!newTitle || !newTitle.trim()) return;

    const newNode = {
        id: nextId++,
        level: `L${currentLevel + 1}`,
        title: newTitle.trim(),
        parent: selectedNodeId,
        collapsed: false,
        priority: '',
        action: '',
        time: '',
        money: '',
        knowledge: '',
        when: '',
        where: '',
        with: '',
        tools: '',
        book: '',
        recordEnabled: false,
        longTermGoal: '',
        yearGoal: '',
        shareEnabled: false,
        shareTo: '',
        recordFrequency: 'daily',
        timeBudget: '',
        moneyBudget: '',
        bookBudget: '',
        inlineDisplay: []
    };

    nodes.push(newNode);

    // Expand parent when adding child
    selectedNode.collapsed = false;

    renderMindmap();
    selectNode(newNode.id);
    saveData();
}

function deleteSelectedNode() {
    if (!selectedNodeId) return;

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    if (!confirm(`Delete "${node.title}" and all its children?`)) return;

    function deleteNodeAndChildren(nodeId) {
        const children = nodes.filter(n => n.parent === nodeId);
        children.forEach(child => deleteNodeAndChildren(child.id));
        nodes = nodes.filter(n => n.id !== nodeId);
    }

    deleteNodeAndChildren(selectedNodeId);
    selectedNodeId = null;
    renderMindmap();
    saveData();
}

// Drag and drop functions
function handleDragStart(event, nodeId) {
    draggedNodeId = nodeId;
    draggedNode = nodes.find(n => n.id === nodeId);
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const target = event.target.closest('.node');
    if (!target || !draggedNodeId) return;

    const targetId = parseInt(target.dataset.nodeId);
    if (targetId === draggedNodeId) return;

    // Remove old preview
    const oldPreview = document.querySelector('.drag-preview');
    if (oldPreview) {
        oldPreview.remove();
    }

    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Create preview element
    const preview = document.createElement('div');
    preview.className = 'drag-preview';

    // Determine drop position and insert preview
    if (mouseX < rect.width * 0.25) {
        // Make child - insert as first child or after the header
        preview.classList.add('child');
        const targetLevel = parseInt(target.dataset.level.substring(1));
        preview.style.marginLeft = `${(targetLevel) * 20}px`;

        // Find the next sibling or insert after target
        const nextNode = target.nextElementSibling;
        if (nextNode && nextNode.classList.contains('node')) {
            const nextLevel = parseInt(nextNode.dataset.level.substring(1));
            if (nextLevel > targetLevel) {
                // Insert before first child
                target.parentNode.insertBefore(preview, nextNode);
            } else {
                // Insert after target (will be first child)
                target.insertAdjacentElement('afterend', preview);
            }
        } else {
            target.insertAdjacentElement('afterend', preview);
        }
    } else if (mouseY < rect.height * 0.5) {
        // Insert before (sibling)
        const targetLevel = parseInt(target.dataset.level.substring(1));
        preview.style.marginLeft = `${(targetLevel - 1) * 20}px`;
        target.parentNode.insertBefore(preview, target.previousElementSibling);
    } else {
        // Insert after (sibling)
        const targetLevel = parseInt(target.dataset.level.substring(1));
        preview.style.marginLeft = `${(targetLevel - 1) * 20}px`;
        target.insertAdjacentElement('afterend', preview);
    }
}

function handleDrop(event, targetId) {
    event.preventDefault();
    event.stopPropagation();

    // Remove drag preview
    const preview = document.querySelector('.drag-preview');
    if (preview) {
        preview.remove();
    }

    if (!draggedNodeId || draggedNodeId === targetId) return;

    const target = event.target.closest('.node');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const targetNode = nodes.find(n => n.id === targetId);
    const draggedNodeObj = nodes.find(n => n.id === draggedNodeId);

    if (!targetNode || !draggedNodeObj) return;

    // Prevent dropping parent into its own child
    function isDescendant(parentId, childId) {
        let node = nodes.find(n => n.id === childId);
        while (node && node.parent) {
            if (node.parent === parentId) return true;
            node = nodes.find(n => n.id === node.parent);
        }
        return false;
    }

    if (isDescendant(draggedNodeId, targetId)) {
        alert('Cannot move a parent into its own child');
        return;
    }

    // Helper function to recursively update children levels
    function updateChildrenLevels(parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (!parent) return;

        const parentLevel = parseInt(parent.level.substring(1));
        const children = nodes.filter(n => n.parent === parentId);

        children.forEach(child => {
            child.level = `L${parentLevel + 1}`;
            updateChildrenLevels(child.id); // Recursively update grandchildren
        });
    }

    // Determine action based on drop position
    if (mouseX < rect.width * 0.25) {
        // Make child of target
        draggedNodeObj.parent = targetId;
        const targetLevel = parseInt(targetNode.level.substring(1));
        const newLevel = targetLevel + 1;

        // Check if exceeds max level (L5)
        if (newLevel > 5) {
            alert('Cannot exceed maximum level (L5)');
            return;
        }

        draggedNodeObj.level = `L${newLevel}`;
    } else {
        // Make sibling (same level as target)
        draggedNodeObj.parent = targetNode.parent;
        draggedNodeObj.level = targetNode.level;
    }

    // Update all children levels recursively
    updateChildrenLevels(draggedNodeId);

    renderMindmap();
    saveData();
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.node').forEach(n => {
        n.classList.remove('drag-over-left', 'drag-over-right', 'drag-over-top', 'drag-over-bottom');
    });

    // Remove drag preview
    const preview = document.querySelector('.drag-preview');
    if (preview) {
        preview.remove();
    }

    draggedNodeId = null;
    draggedNode = null;
}

function handleDragLeave(event) {
    const target = event.target.closest('.node');
    if (target) {
        target.classList.remove('drag-over-left', 'drag-over-right', 'drag-over-top', 'drag-over-bottom');
    }
}

// Context menu functions
function toggleContextMenu(nodeId, event) {
    const menu = document.getElementById(`context-menu-${nodeId}`);
    const allMenus = document.querySelectorAll('.context-menu');

    // Close all other menus
    allMenus.forEach(m => {
        if (m.id !== `context-menu-${nodeId}`) {
            m.classList.remove('active');
        }
    });

    // Toggle current menu
    menu.classList.toggle('active');

    // Position menu near the button
    if (menu.classList.contains('active')) {
        const button = event.target;
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
    }
}

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(m => {
        m.classList.remove('active');
    });
}

function duplicateNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode = {
        ...node,
        id: nextId++,
        title: node.title + ' (Copy)',
        collapsed: false
    };

    nodes.push(newNode);
    renderMindmap();
    saveData();
}

// Close context menu when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.context-menu') && !e.target.closest('.context-menu-button')) {
        closeAllContextMenus();
    }
});

// Add node before another node
function addNodeBefore(referenceNodeId) {
    const referenceNode = nodes.find(n => n.id === referenceNodeId);
    if (!referenceNode) return;

    const newNode = {
        id: nextId++,
        level: referenceNode.level,
        title: 'New Item',
        parent: referenceNode.parent,
        collapsed: false,
        longTermGoal: '',
        yearGoal: '',
        shareEnabled: false,
        shareTo: '',
        recordEnabled: false,
        recordFrequency: 'daily',
        priority: '',
        action: '',
        time: '',
        money: '',
        knowledge: '',
        when: '',
        where: '',
        with: '',
        tools: '',
        book: '',
        timeBudget: '',
        moneyBudget: '',
        bookBudget: '',
        inlineDisplay: []
    };

    nodes.push(newNode);
    renderMindmap();

    // Enter edit mode for the new node
    setTimeout(() => {
        startEditingTitle(newNode.id);
        selectNode(newNode.id, true);
    }, 100);

    saveData();
}

// Level promotion/demotion functions (simple indentation style)
function promoteNodeLevel() {
    if (!selectedNodeId) return;

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const currentLevel = parseInt(node.level.substring(1));

    // Can always promote until L1
    if (currentLevel === 1) {
        console.log('Already at top level (L1)');
        return;
    }

    // Get current position in nodes array
    const nodeIndex = nodes.indexOf(node);

    // Simply decrease level by 1
    const newLevel = currentLevel - 1;
    node.level = `L${newLevel}`;

    // Find new parent: closest visible node above us at (newLevel - 1)
    if (newLevel === 1) {
        node.parent = null; // L1 nodes have no parent
    } else {
        const visibleNodes = getAllVisibleNodes();
        const currentIndex = visibleNodes.indexOf(selectedNodeId);
        let newParent = null;

        for (let i = currentIndex - 1; i >= 0; i--) {
            const candidate = nodes.find(n => n.id === visibleNodes[i]);
            if (candidate && candidate.level === `L${newLevel - 1}`) {
                newParent = candidate;
                break;
            }
        }

        node.parent = newParent ? newParent.id : null;
    }

    // Update all existing children's levels to maintain parent-child relationship
    // Children should always be at parent level + 1
    updateChildrenLevelsRecursive(selectedNodeId);

    // Adopt nodes below that are exactly 1 level deeper
    // They should become children of the promoted node
    const childLevel = `L${newLevel + 1}`;
    for (let i = nodeIndex + 1; i < nodes.length; i++) {
        const potentialChild = nodes[i];
        const potentialChildLevel = parseInt(potentialChild.level.substring(1));

        // Stop if we hit a node at same or shallower level
        if (potentialChildLevel <= newLevel) {
            break;
        }

        // If exactly 1 level deeper, make it our child
        if (potentialChild.level === childLevel) {
            potentialChild.parent = selectedNodeId;
        }
    }

    renderMindmap();
    selectNode(selectedNodeId, false);
    saveData();
}

function demoteNodeLevel() {
    if (!selectedNodeId) return;

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const currentLevel = parseInt(node.level.substring(1));

    // Cannot demote beyond L5
    if (currentLevel >= 5) {
        alert('Cannot exceed maximum level (L5)');
        return;
    }

    // Check restriction: can only be 1 level deeper than node above
    const visibleNodes = getAllVisibleNodes();
    const currentIndex = visibleNodes.indexOf(selectedNodeId);

    if (currentIndex > 0) {
        const nodeAbove = nodes.find(n => n.id === visibleNodes[currentIndex - 1]);
        if (nodeAbove) {
            const levelAbove = parseInt(nodeAbove.level.substring(1));
            const maxAllowedLevel = levelAbove + 1;

            if (currentLevel + 1 > maxAllowedLevel) {
                console.log(`Cannot demote: node above is L${levelAbove}, maximum allowed is L${maxAllowedLevel}`);
                return;
            }
        }
    }

    // Simply increase level by 1
    const newLevel = currentLevel + 1;
    node.level = `L${newLevel}`;

    // Find new parent: closest visible node above us at (newLevel - 1)
    let newParent = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
        const candidate = nodes.find(n => n.id === visibleNodes[i]);
        if (candidate && candidate.level === `L${newLevel - 1}`) {
            newParent = candidate;
            break;
        }
    }

    node.parent = newParent ? newParent.id : null;

    // First, update all children to maintain parent-child level relationship
    updateChildrenLevelsRecursive(selectedNodeId);

    // Then check if any children are now at invalid levels (same or shallower than parent)
    // and re-parent them as siblings
    const children = getChildren(selectedNodeId);
    children.forEach(child => {
        const childLevel = parseInt(child.level.substring(1));
        if (childLevel <= newLevel) {
            // Child is at same or shallower level, make it a sibling
            child.parent = node.parent;
            // Update this child's descendants too
            updateChildrenLevelsRecursive(child.id);
        }
    });

    renderMindmap();
    selectNode(selectedNodeId, false);
    saveData();
}

// Helper function to recursively update children levels
function updateChildrenLevelsRecursive(parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const parentLevel = parseInt(parent.level.substring(1));
    const children = nodes.filter(n => n.parent === parentId);

    children.forEach(child => {
        child.level = `L${parentLevel + 1}`;
        updateChildrenLevelsRecursive(child.id);
    });
}

// Global keyboard event handler
document.addEventListener('keydown', function(e) {
    // Ignore if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }

    // Ignore if editing contenteditable (node title)
    if (e.target.contentEditable === 'true' || e.target.isContentEditable) {
        return;
    }

    // Ignore if modal is open
    if (document.getElementById('addNodeDialog').style.display === 'flex') {
        return;
    }

    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            moveSelection('up');
            break;
        case 'ArrowDown':
            e.preventDefault();
            moveSelection('down');
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (e.shiftKey) {
                promoteNodeLevel(); // Shift+Left: 레벨 승격
            } else {
                collapseSelectedNode();
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (e.shiftKey) {
                demoteNodeLevel(); // Shift+Right: 레벨 강등
            } else {
                expandSelectedNode();
            }
            break;
        case 'Tab':
            e.preventDefault();
            addChildNode();
            break;
        case 'Enter':
            e.preventDefault();
            addSiblingNode();
            break;
        case ' ':
            e.preventDefault();
            editSelectedNodeTitle();
            break;
        case 'd':
        case 'D':
            e.preventDefault();
            toggleSelectedNodeDetails();
            break;
        case 'Backspace':
        case 'Delete':
            e.preventDefault();
            deleteSelectedNode();
            break;
        default:
            // iPad Safari fallback
            if (e.keyCode === 68 || e.key.toLowerCase() === 'd') {
                e.preventDefault();
                toggleSelectedNodeDetails();
            }
            break;
    }
});

// Time parsing functions
function parseTime(timeStr) {
    if (!timeStr) return 0;

    const match = timeStr.match(/^([\d.]+)([hm])\/([dwmy])$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const period = match[3].toLowerCase();

    // Convert to hours
    let hours = unit === 'h' ? value : value / 60;

    // Convert to weekly
    switch(period) {
        case 'd': return hours * 7;
        case 'w': return hours;
        case 'm': return hours / 4;
        case 'y': return hours / 52;
        default: return 0;
    }
}

function parseMoney(moneyStr) {
    if (!moneyStr) return 0;

    const match = moneyStr.match(/^([\d,]+)\/([dwmy])$/i);
    if (!match) return 0;

    const value = parseFloat(match[1].replace(/,/g, ''));
    const period = match[2].toLowerCase();

    // Convert to weekly
    switch(period) {
        case 'd': return value * 7;
        case 'w': return value;
        case 'm': return value / 4;
        case 'y': return value / 52;
        default: return 0;
    }
}

function formatNumber(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// Book parsing functions
function parseBook(bookStr) {
    if (!bookStr) return 0;

    let count = 0;

    // Count books in brackets: [Book Name]
    const bracketMatches = bookStr.match(/\[([^\]]+)\]/g);
    if (bracketMatches) {
        count += bracketMatches.length;
    }

    // Count additional books: +N
    const plusMatches = bookStr.match(/\+(\d+)/g);
    if (plusMatches) {
        plusMatches.forEach(match => {
            count += parseInt(match.substring(1));
        });
    }

    return count;
}

// Calculate aggregates
function getChildren(nodeId) {
    return nodes.filter(n => n.parent === nodeId);
}

function calculateActuals(nodeId) {
    const children = getChildren(nodeId);

    if (children.length === 0) {
        const node = nodes.find(n => n.id === nodeId);
        return {
            time: parseTime(node.time),
            money: parseMoney(node.money),
            book: parseBook(node.book)
        };
    }

    let totalTime = 0;
    let totalMoney = 0;
    let totalBook = 0;

    children.forEach(child => {
        const childActuals = calculateActuals(child.id);
        totalTime += childActuals.time;
        totalMoney += childActuals.money;
        totalBook += childActuals.book;
    });

    return { time: totalTime, money: totalMoney, book: totalBook };
}

// Render functions
function renderNode(node) {
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;
    const actuals = calculateActuals(node.id);

    let budgetHTML = '';
    if (hasChildren && (node.timeBudget || node.moneyBudget || node.bookBudget)) {
        const timeBudget = parseTime(node.timeBudget);
        const moneyBudget = parseMoney(node.moneyBudget);
        const bookBudget = parseInt(node.bookBudget) || 0;

        const timeOver = actuals.time > timeBudget;
        const moneyOver = actuals.money > moneyBudget;
        const bookOver = actuals.book > bookBudget;

        budgetHTML = `
            <div class="budget-section">
                ${node.timeBudget ? `
                <div class="budget-row">
                    <span class="budget-label">Time Budget:</span>
                    <span class="budget-value">${node.timeBudget}</span>
                </div>
                <div class="budget-row">
                    <span class="budget-label">Time Actual:</span>
                    <span class="budget-value ${timeOver ? 'over' : 'ok'}">${formatNumber(actuals.time)}h/w ${timeOver ? '🔴 초과' : '✓'}</span>
                </div>
                ` : ''}
                ${node.moneyBudget ? `
                <div class="budget-row">
                    <span class="budget-label">Money Budget:</span>
                    <span class="budget-value">${formatNumber(parseMoney(node.moneyBudget))}원/w</span>
                </div>
                <div class="budget-row">
                    <span class="budget-label">Money Actual:</span>
                    <span class="budget-value ${moneyOver ? 'over' : 'ok'}">${formatNumber(actuals.money)}원/w ${moneyOver ? '🔴 초과' : '✓'}</span>
                </div>
                ` : ''}
                ${node.bookBudget ? `
                <div class="budget-row">
                    <span class="budget-label">Book Budget:</span>
                    <span class="budget-value">${bookBudget}권</span>
                </div>
                <div class="budget-row">
                    <span class="budget-label">Book Actual:</span>
                    <span class="budget-value ${bookOver ? 'over' : 'ok'}">${actuals.book}권 ${bookOver ? '🔴 초과' : '✓'}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Build inline display attributes
    const inlineAttrs = node.inlineDisplay || [];
    let inlineHTML = '';

    if (inlineAttrs.length > 0) {
        const inlineItems = [];
        inlineAttrs.forEach(attr => {
            if (node[attr]) {
                let displayValue = '';
                switch(attr) {
                    case 'time':
                        displayValue = `⏱ ${node.time}`;
                        break;
                    case 'money':
                        displayValue = `💰 ${node.money}`;
                        break;
                    case 'book':
                        displayValue = `📚 ${parseBook(node.book)}권`;
                        break;
                    case 'action':
                        displayValue = `📋 ${node.action}`;
                        break;
                    case 'when':
                        displayValue = `📅 ${node.when}`;
                        break;
                    case 'where':
                        displayValue = `📍 ${node.where}`;
                        break;
                    case 'with':
                        displayValue = `👥 ${node.with}`;
                        break;
                    case 'knowledge':
                        displayValue = `📖 ${node.knowledge}`;
                        break;
                    case 'tools':
                        displayValue = `🔧 ${node.tools}`;
                        break;
                    case 'longTermGoal':
                        displayValue = `🎯 ${node.longTermGoal}`;
                        break;
                    case 'yearGoal':
                        displayValue = `📆 ${node.yearGoal}`;
                        break;
                }
                if (displayValue) {
                    // For leaf nodes, make time and money editable inline
                    if (!hasChildren && (attr === 'time' || attr === 'money')) {
                        inlineItems.push(`<span class="inline-editable"
                            ondblclick="event.stopPropagation(); startInlineEdit(${node.id}, '${attr}', this)"
                            style="cursor: text;">${displayValue}</span>`);
                    } else {
                        inlineItems.push(`<span>${displayValue}</span>`);
                    }
                }
            }
        });
        if (inlineItems.length > 0) {
            inlineHTML = `<span class="inline-display" style="color: #86868b; font-size: 0.9em;">${inlineItems.join(' · ')}</span>`;
        }
    }

    const summary = hasChildren
        ? `<div class="node-summary">
            <div class="budget-indicator ${actuals.time > parseTime(node.timeBudget || '999h/w') ? 'over' : ''}">
                ⏱ ${formatNumber(actuals.time)}h/w
            </div>
            <div class="budget-indicator ${actuals.money > parseMoney(node.moneyBudget || '99999999/w') ? 'over' : ''}">
                💰 ${formatNumber(actuals.money)}원/w
            </div>
            <div class="budget-indicator ${actuals.book > parseInt(node.bookBudget || '999') ? 'over' : ''}">
                📚 ${actuals.book}권
            </div>
          </div>`
        : `<div class="node-summary">
            ${node.time ? `<span>⏱ ${node.time}</span>` : ''}
            ${node.money ? `<span>💰 ${node.money}</span>` : ''}
            ${node.book ? `<span>📚 ${parseBook(node.book)}권</span>` : ''}
          </div>`;

    return `
        <div class="add-node-trigger" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
            <div class="add-node-button" onclick="addNodeBefore(${node.id})">+</div>
        </div>
        <div class="node ${node.level}"
             id="node-${node.id}"
             data-node-id="${node.id}"
             data-level="${node.level}"
             tabindex="0"
             draggable="true"
             ondragstart="handleDragStart(event, ${node.id})"
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event, ${node.id})"
             ondragend="handleDragEnd(event)"
             ondragleave="handleDragLeave(event)">
            <div class="node-header" onclick="selectNode(${node.id})" ondblclick="event.stopPropagation(); toggleNode(${node.id})">
                <span class="expand-icon ${hasChildren ? (node.collapsed ? '' : 'expanded') : 'leaf'}"
                      id="icon-${node.id}"
                      onclick="${hasChildren ? `event.stopPropagation(); toggleNodeCollapse(${node.id})` : ''}"
                      style="${hasChildren ? 'cursor: pointer;' : ''}">${hasChildren ? '▶' : '●'}</span>
                <div style="display: flex; align-items: center; flex: 1; gap: 0;">
                    <span class="node-title"
                          contenteditable="false"
                          id="title-${node.id}"
                          ondblclick="event.stopPropagation(); handleTitleDoubleClick(${node.id})"
                          onblur="finishEditingTitle(${node.id})"
                          onkeydown="if(event.key==='Enter'){event.preventDefault();event.stopPropagation();this.blur();} if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.textContent='${node.title.replace(/'/g, "\\'")}';this.blur();}"
                          style="cursor: default; padding: 2px 4px; border-radius: 3px; margin-right: 0;">${node.title}</span><span style="display: inline; padding-left: 2px;">${inlineHTML}</span>
                </div>
                <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
                    ${summary}
                </div>
                <button class="context-menu-button" onclick="event.stopPropagation(); toggleContextMenu(${node.id}, event)">⋯</button>
                <div class="context-menu" id="context-menu-${node.id}">
                    <div class="context-menu-item" onclick="event.stopPropagation(); duplicateNode(${node.id}); closeAllContextMenus();">Duplicate</div>
                    <div class="context-menu-item danger" onclick="event.stopPropagation(); deleteNode(${node.id}); closeAllContextMenus();">Delete</div>
                </div>
            </div>
            <div class="node-details" id="details-${node.id}">
                ${budgetHTML}
                <div class="detail-grid">
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('longTermGoal') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'longTermGoal', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>🎯 Long-term Goal (1+ years)</span>
                        </label>
                        <div class="detail-value">
                            <textarea onchange="updateNode(${node.id}, 'longTermGoal', this.value)"
                                      placeholder="장기 목표 및 비전..."
                                      style="width: 100%; padding: 8px; border: 1px solid #d2d2d7; border-radius: 6px; font-size: 14px; min-height: 60px; resize: vertical; font-family: inherit;">${node.longTermGoal || ''}</textarea>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('yearGoal') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'yearGoal', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>📆 2026 Goal</span>
                        </label>
                        <div class="detail-value">
                            <textarea onchange="updateNode(${node.id}, 'yearGoal', this.value)"
                                      placeholder="올해 달성할 목표..."
                                      style="width: 100%; padding: 8px; border: 1px solid #d2d2d7; border-radius: 6px; font-size: 14px; min-height: 60px; resize: vertical; font-family: inherit;">${node.yearGoal || ''}</textarea>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('action') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'action', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>📋 Action</span>
                        </label>
                        <div class="detail-value">
                            <input type="text" value="${node.action || ''}"
                                   onchange="updateNode(${node.id}, 'action', this.value)"
                                   placeholder="Specific actions to take">
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('when') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'when', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>📅 When</span>
                        </label>
                        <div class="detail-value">
                            <input type="text" value="${node.when || ''}"
                                   onchange="updateNode(${node.id}, 'when', this.value)"
                                   placeholder="Timeline">
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('where') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'where', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>📍 Where</span>
                        </label>
                        <div class="detail-value">
                            <input type="text" value="${node.where || ''}"
                                   onchange="updateNode(${node.id}, 'where', this.value)"
                                   placeholder="Location">
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('with') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'with', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>👥 With</span>
                        </label>
                        <div class="detail-value">
                            <input type="text" value="${node.with || ''}"
                                   onchange="updateNode(${node.id}, 'with', this.value)"
                                   placeholder="People involved">
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('knowledge') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'knowledge', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>📖 Learn and Study</span>
                        </label>
                        <div class="detail-value">
                            <input type="text" value="${node.knowledge || ''}"
                                   onchange="updateNode(${node.id}, 'knowledge', this.value)"
                                   placeholder="Skills or knowledge to acquire">
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox"
                                   ${(node.inlineDisplay || []).includes('tools') ? 'checked' : ''}
                                   onchange="toggleInlineDisplay(${node.id}, 'tools', this.checked)"
                                   style="width: auto; cursor: pointer;"
                                   title="접었을 때 표시">
                            <span>🔧 Tools and Equipments</span>
                        </label>
                        <div class="detail-value">
                            <input type="text" value="${node.tools || ''}"
                                   onchange="updateNode(${node.id}, 'tools', this.value)"
                                   placeholder="Required tools or equipment">
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label">Record</label>
                        <div class="detail-value">
                            <select onchange="updateNode(${node.id}, 'recordFrequency', this.value)"
                                    style="width: 100%; padding: 8px; border: 1px solid #d2d2d7; border-radius: 6px; font-size: 14px;">
                                <option value="daily" ${node.recordFrequency === 'daily' ? 'selected' : ''}>Daily</option>
                                <option value="weekly" ${node.recordFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="monthly" ${node.recordFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label class="detail-label">Share</label>
                        <div class="detail-value">
                            <input type="text"
                                   value="${node.shareTo || ''}"
                                   onchange="updateNode(${node.id}, 'shareTo', this.value)"
                                   placeholder="blog, instagram, linkedin..."
                                   style="width: 100%; padding: 8px; border: 1px solid #d2d2d7; border-radius: 6px; font-size: 14px;">
                        </div>
                    </div>
                    ${hasChildren ? `
                        <div class="detail-item">
                            <label class="detail-label">⏱ Time Budget</label>
                            <div class="detail-value">
                                <input type="text" value="${node.timeBudget || ''}"
                                       onchange="updateNode(${node.id}, 'timeBudget', this.value)"
                                       placeholder="e.g., 10h/w">
                            </div>
                        </div>
                        <div class="detail-item">
                            <label class="detail-label">💰 Money Budget</label>
                            <div class="detail-value">
                                <input type="text" value="${node.moneyBudget || ''}"
                                       onchange="updateNode(${node.id}, 'moneyBudget', this.value)"
                                       placeholder="e.g., 100000/w">
                            </div>
                        </div>
                        <div class="detail-item">
                            <label class="detail-label">📚 Book Budget</label>
                            <div class="detail-value">
                                <input type="text" value="${node.bookBudget || ''}"
                                       onchange="updateNode(${node.id}, 'bookBudget', this.value)"
                                       placeholder="e.g., 10">
                            </div>
                        </div>
                    ` : `
                        <div class="detail-item">
                            <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                                <input type="checkbox"
                                       ${(node.inlineDisplay || []).includes('time') ? 'checked' : ''}
                                       onchange="toggleInlineDisplay(${node.id}, 'time', this.checked)"
                                       style="width: auto; cursor: pointer;"
                                       title="접었을 때 표시">
                                <span>⏱ Time</span>
                            </label>
                            <div class="detail-value">
                                <input type="text" value="${node.time || ''}"
                                       onchange="updateNode(${node.id}, 'time', this.value)"
                                       placeholder="e.g., 2h/w">
                            </div>
                        </div>
                        <div class="detail-item">
                            <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                                <input type="checkbox"
                                       ${(node.inlineDisplay || []).includes('money') ? 'checked' : ''}
                                       onchange="toggleInlineDisplay(${node.id}, 'money', this.checked)"
                                       style="width: auto; cursor: pointer;"
                                       title="접었을 때 표시">
                                <span>💰 Money</span>
                            </label>
                            <div class="detail-value">
                                <input type="text" value="${node.money || ''}"
                                       onchange="updateNode(${node.id}, 'money', this.value)"
                                       placeholder="e.g., 50000/m">
                            </div>
                        </div>
                        <div class="detail-item">
                            <label class="detail-label" style="display: flex; align-items: center; gap: 6px;">
                                <input type="checkbox"
                                       ${(node.inlineDisplay || []).includes('book') ? 'checked' : ''}
                                       onchange="toggleInlineDisplay(${node.id}, 'book', this.checked)"
                                       style="width: auto; cursor: pointer;"
                                       title="접었을 때 표시">
                                <span>📚 Book</span>
                            </label>
                            <div class="detail-value">
                                <input type="text" value="${node.book || ''}"
                                       onchange="updateNode(${node.id}, 'book', this.value)"
                                       placeholder="[Book Title] +2">
                            </div>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderMindmap() {
    let html = '';

    // Helper function to check if a node should be visible
    function shouldRender(node) {
        // Root nodes are always visible
        if (node.parent === null) return true;

        // Check if parent exists and is not collapsed
        const parent = nodes.find(n => n.id === node.parent);
        if (!parent) return true; // Orphaned node, show it anyway
        if (parent.collapsed) return false;

        // Recursively check if all ancestors are expanded
        return shouldRender(parent);
    }

    // Render nodes in array order, checking visibility
    nodes.forEach(node => {
        if (shouldRender(node)) {
            html += renderNode(node);
        }
    });

    document.getElementById('mindmap').innerHTML = html;
    updateDashboard();

    // Restore selection
    if (selectedNodeId) {
        const nodeEl = document.getElementById(`node-${selectedNodeId}`);
        if (nodeEl) {
            nodeEl.classList.add('selected', 'focused');
        } else {
            selectedNodeId = null;
        }
    }
}

function updateDashboard() {
    const rootNodes = nodes.filter(n => n.parent === null);
    let totalTime = 0;
    let totalMoney = 0;
    let totalBook = 0;

    rootNodes.forEach(root => {
        const actuals = calculateActuals(root.id);
        totalTime += actuals.time;
        totalMoney += actuals.money;
        totalBook += actuals.book;
    });

    const timeEl = document.getElementById('totalTime');
    const moneyEl = document.getElementById('totalMoney');
    const bookEl = document.getElementById('totalBook');

    timeEl.textContent = `${formatNumber(totalTime)}h/w`;
    timeEl.className = 'stat ' + (totalTime > 168 ? 'over' : 'ok');

    moneyEl.textContent = `${formatNumber(totalMoney)}원/w`;

    bookEl.textContent = `${totalBook}권`;
    bookEl.className = 'stat';

    document.getElementById('timeStatus').textContent =
        `Available: 168h/w | ${totalTime > 168 ? '🔴 ' + formatNumber(totalTime - 168) + 'h 초과' : '✓ ' + formatNumber(168 - totalTime) + 'h 여유'}`;

    document.getElementById('bookStatus').textContent =
        `Total books to read`;
}

function toggleNode(nodeId) {
    const details = document.getElementById(`details-${nodeId}`);
    const icon = document.getElementById(`icon-${nodeId}`);

    details.classList.toggle('expanded');
    icon.classList.toggle('expanded');
}

function toggleNodeCollapse(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const hasChildren = nodes.some(n => n.parent === nodeId);
    if (!hasChildren) return;

    node.collapsed = !node.collapsed;
    renderMindmap();
    selectNode(nodeId, false);
}

function updateNode(nodeId, field, value) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        node[field] = value;

        // If record checkbox changes, update dropdown state
        if (field === 'recordEnabled') {
            const dropdown = document.querySelector(`#details-${nodeId} select`);
            if (dropdown) {
                dropdown.disabled = !value;
            }
            // Don't re-render for checkbox to avoid losing focus
            return;
        }

        // If share checkbox changes, update textbox state
        if (field === 'shareEnabled') {
            const textbox = document.querySelector(`#details-${nodeId} input[placeholder*="blog"]`);
            if (textbox) {
                textbox.disabled = !value;
            }
            // Don't re-render for checkbox to avoid losing focus
            return;
        }

        const prevSelectedId = selectedNodeId;
        renderMindmap();
        if (prevSelectedId) {
            selectNode(prevSelectedId, false);
            // Re-expand details if it was a title update
            if (field === 'title') {
                const details = document.getElementById(`details-${prevSelectedId}`);
                if (details) {
                    details.classList.add('expanded');
                }
            }
        }
    }
}

function showAddNodeDialog() {
    // Populate parent dropdown
    const parentSelect = document.getElementById('newNodeParent');
    parentSelect.innerHTML = '<option value="">None (Root)</option>';

    nodes.forEach(node => {
        const indent = '　'.repeat(parseInt(node.level.substring(1)) - 1);
        parentSelect.innerHTML += `<option value="${node.id}">${indent}${node.title} (${node.level})</option>`;
    });

    document.getElementById('addNodeDialog').style.display = 'flex';
}

function closeAddNodeDialog() {
    document.getElementById('addNodeDialog').style.display = 'none';
    document.getElementById('newNodeTitle').value = '';
    document.getElementById('newNodeLevel').value = 'L1';
    document.getElementById('newNodeParent').value = '';
}

function createNode() {
    const title = document.getElementById('newNodeTitle').value.trim();
    if (!title) {
        alert('Please enter a title');
        return;
    }

    const level = document.getElementById('newNodeLevel').value;
    const parentId = document.getElementById('newNodeParent').value;

    nodes.push({
        id: nextId++,
        level: level,
        title: title,
        parent: parentId ? parseInt(parentId) : null,
        collapsed: false,
        priority: '',
        action: '',
        time: '',
        money: '',
        knowledge: '',
        when: '',
        where: '',
        with: '',
        tools: '',
        book: '',
        recordEnabled: false,
        longTermGoal: '',
        yearGoal: '',
        shareEnabled: false,
        shareTo: '',
        recordFrequency: 'daily',
        timeBudget: '',
        moneyBudget: '',
        bookBudget: ''
    });

    closeAddNodeDialog();
    renderMindmap();
    saveData();
}

function deleteNode(nodeId) {
    if (!confirm('Are you sure you want to delete this node and all its children?')) {
        return;
    }

    // Find all descendants
    function findDescendants(id) {
        let descendants = [id];
        const children = nodes.filter(n => n.parent === id);
        children.forEach(child => {
            descendants = descendants.concat(findDescendants(child.id));
        });
        return descendants;
    }

    const toDelete = findDescendants(nodeId);
    nodes = nodes.filter(n => !toDelete.includes(n.id));

    renderMindmap();
    saveData();
}

function saveData() {
    localStorage.setItem('mindmapNodes', JSON.stringify(nodes));
    // Silent auto-save - no alert needed
}

function manualSave() {
    saveData();
    // Show brief feedback without blocking
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#34c759';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
}

async function loadData() {
    // First, try to load from localStorage
    const saved = localStorage.getItem('mindmapNodes');
    if (saved) {
        nodes = JSON.parse(saved);
        nextId = Math.max(...nodes.map(n => n.id)) + 1;
        console.log('Loaded data from localStorage');
        return;
    }

    // If no saved data, load from data.json
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('Failed to load data.json');
        }
        nodes = await response.json();
        nextId = Math.max(...nodes.map(n => n.id)) + 1;
        console.log('Loaded initial data from data.json');

        // Save to localStorage for future use
        saveData();
    } catch (error) {
        console.error('Error loading data:', error);
        // Initialize with empty root node if loading fails
        nodes = [{
            id: 1,
            level: 'L1',
            title: 'My 2026 Goals',
            parent: null,
            collapsed: false,
            priority: '',
            action: '',
            time: '',
            money: '',
            knowledge: '',
            when: '',
            where: '',
            with: '',
            tools: '',
            book: '',
            recordEnabled: false,
            longTermGoal: '',
            yearGoal: '',
            shareEnabled: false,
            shareTo: '',
            recordFrequency: 'daily',
            timeBudget: '',
            moneyBudget: '',
            bookBudget: ''
        }];
        nextId = 2;
        console.log('Initialized with empty root node');
    }
}

function exportCSV() {
    const headers = ['Level', 'Title', 'Parent', 'Long-term Goal', '2026 Goal', 'Action', 'When', 'Where', 'With',
                   'Learn and Study', 'Tools and Equipments', 'Time', 'Money', 'Book', 'Record Enabled', 'Record Frequency', 'Share Enabled', 'Share To', 'Time Budget', 'Money Budget', 'Book Budget'];

    const rows = nodes.map(n => [
        n.level, n.title, n.parent || '', n.longTermGoal || '', n.yearGoal || '', n.action, n.when, n.where, n.with,
        n.knowledge, n.tools, n.time, n.money, n.book, n.recordEnabled, n.recordFrequency, n.shareEnabled, n.shareTo, n.timeBudget, n.moneyBudget, n.bookBudget
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2026_resolution.csv';
    a.click();
}

function loadFromCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');

            nodes = [];
            nextId = 1;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
                if (!values || values.length < 2) continue;

                const cleanValue = v => v ? v.replace(/^"|"$/g, '').trim() : '';

                nodes.push({
                    id: nextId++,
                    level: cleanValue(values[0]),
                    title: cleanValue(values[1]),
                    parent: cleanValue(values[2]) ? parseInt(cleanValue(values[2])) : null,
                    priority: cleanValue(values[3]),
                    action: cleanValue(values[4]),
                    time: cleanValue(values[5]),
                    money: cleanValue(values[6]),
                    knowledge: cleanValue(values[7]),
                    when: cleanValue(values[8]),
                    where: cleanValue(values[9]),
                    with: cleanValue(values[10]),
                    tools: cleanValue(values[11]),
                    book: cleanValue(values[12]),
                    timeBudget: cleanValue(values[13]),
                    moneyBudget: cleanValue(values[14]),
                    bookBudget: cleanValue(values[15])
                });
            }

            renderMindmap();
            saveData();
            alert('CSV imported successfully!');
        };
        reader.readAsText(file);
    };
    input.click();
}

// Initialize application
(async function init() {
    // Load data (from localStorage or data.json)
    await loadData();

    // Render the mindmap
    renderMindmap();

    // Auto-select first node
    setTimeout(() => {
        const firstNode = getAllVisibleNodes()[0];
        if (firstNode) {
            selectNode(firstNode, false);
        }
    }, 100);
})();
