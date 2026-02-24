let categories = JSON.parse(localStorage.getItem('orbit_cats')) || ["Academics", "Fitness", "Reading", "Work", "Programming"];
let tasks = JSON.parse(localStorage.getItem('orbit_flow_v12')) || [];
let selectedDate = new Date().toLocaleDateString('en-CA');
let viewDate = new Date();
let currentCategory = categories[0];
let touchStartX = 0;

const haptic = {
    light: () => navigator.vibrate && navigator.vibrate(10),
    medium: () => navigator.vibrate && navigator.vibrate(25),
    success: () => navigator.vibrate && navigator.vibrate([10, 30, 10]),
};

// --- Analytics ---
function updateStats(range) {
    haptic.light();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${range}`).classList.add('active');
    
    const display = document.getElementById('stats-display');
    const now = new Date();
    let filteredTasks = tasks;

    if (range === 'day') {
        filteredTasks = tasks.filter(t => t.date === selectedDate);
    } else if (range === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        filteredTasks = tasks.filter(t => new Date(t.date) >= weekAgo);
    }

    if (filteredTasks.length === 0) {
        display.innerHTML = `<div style="text-align:center; padding:40px; color:var(--dim);">No data for this period.</div>`;
        return;
    }

    const categoriesPresent = [...new Set(filteredTasks.map(t => t.cat))];
    let html = `<div style="display:flex; flex-direction:column; gap:15px; margin-top:10px;">`;
    categoriesPresent.forEach(cat => {
        const catTasks = filteredTasks.filter(t => t.cat === cat);
        const completed = catTasks.filter(t => t.done).length;
        const percentage = Math.round((completed / catTasks.length) * 100);
        html += `<div class="stat-row">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; font-weight:700; color:var(--text);">
                        <span>${cat}</span><span>${percentage}%</span>
                    </div>
                    <div style="width:100%; height:8px; background:var(--bg-system); border-radius:10px; overflow:hidden;">
                        <div style="width:${percentage}%; height:100%; background:var(--accent); border-radius:10px; transition: width 0.4s ease;"></div>
                    </div>
                </div>`;
    });
    display.innerHTML = html + `</div>`;
}

// --- Category Logic ---
function toggleDropUp() { haptic.light(); document.getElementById('drop-up-menu').classList.toggle('show'); }
function selectCategory(cat) { 
    haptic.medium(); 
    currentCategory = cat; 
    document.getElementById('selected-cat-display').innerText = cat; 
    document.getElementById('drop-up-menu').classList.remove('show'); 
}
function refreshCategoryMenu() {
    const menu = document.getElementById('drop-up-menu');
    let html = categories.map(c => `<div class="drop-item" onclick="selectCategory('${c}')">${c}</div>`).join('');
    html += `<div class="drop-item add-new-cat" onclick="promptNewCategory()">+ New Category</div>`;
    menu.innerHTML = html;
    localStorage.setItem('orbit_cats', JSON.stringify(categories));
}
function promptNewCategory() {
    const name = prompt("New category name:");
    if (name && !categories.includes(name)) { categories.push(name); refreshCategoryMenu(); selectCategory(name); }
}

// --- Calendar Logic ---
function initCalendar(focusDate = new Date()) {
    const scroller = document.getElementById('mini-scroller');
    scroller.innerHTML = '';
    document.getElementById('month-label').innerText = focusDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    for (let i = -7; i < 14; i++) {
        const d = new Date(focusDate);
        d.setDate(d.getDate() + i);
        const dStr = d.toLocaleDateString('en-CA');
        const unit = document.createElement('div');
        unit.className = `date-unit ${dStr === selectedDate ? 'active' : ''}`;
        if (dStr === selectedDate) unit.id = "active-date"; 
        unit.innerHTML = `<div style="font-size:10px; font-weight:800; color:var(--dim); margin-bottom:6px;">${d.toLocaleDateString('en-US', {weekday:'short'}).toUpperCase()}</div><div class="d-num">${d.getDate()}</div>`;
        unit.onclick = () => {
            haptic.light(); selectedDate = dStr; updateHeader(d); initCalendar(d); render();
        };
        scroller.appendChild(unit);
    }
    setTimeout(() => {
        const activeElem = document.getElementById('active-date');
        if (activeElem) activeElem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
}

function updateHeader(d) {
    document.getElementById('header-day').innerText = d.toLocaleDateString('en-US', { weekday: 'short' });
    document.getElementById('header-date').innerText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function openCalendarModal() { haptic.light(); document.getElementById('calendar-modal').classList.add('open'); renderModal(); }
function closeCalendarModal(e) { if (e.target.id === 'calendar-modal') e.target.classList.remove('open'); }
function changeMonth(step) { haptic.light(); viewDate.setMonth(viewDate.getMonth() + step); renderModal(); }

function renderModal() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    document.getElementById('modal-month-label').innerText = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        grid.innerHTML += `<div class="grid-day ${dStr === selectedDate ? 'selected' : ''}" onclick="selectFromModal('${dStr}')">${i}</div>`;
    }
}

function selectFromModal(dStr) {
    haptic.success(); selectedDate = dStr;
    const d = new Date(dStr); viewDate = new Date(d);
    updateHeader(d); initCalendar(d); render();
    document.getElementById('calendar-modal').classList.remove('open');
}

// --- Swipe Logic ---
function handleTouchStart(e) { touchStartX = e.touches[0].clientX; }
function handleTouchEnd(e, idxInFiltered) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 70) {
        haptic.medium();
        e.currentTarget.classList.add('deleting');
        setTimeout(() => {
            const filteredTasks = tasks.filter(t => t.date === selectedDate);
            const taskToDelete = filteredTasks[idxInFiltered];
            const trueIdx = tasks.indexOf(taskToDelete);
            if (trueIdx > -1) { tasks.splice(trueIdx, 1); render(); }
        }, 400); 
    }
}

// --- Task Rendering ---
function render() {
    const feed = document.getElementById('task-feed');
    feed.innerHTML = '';
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    if (dayTasks.length === 0) {
        feed.innerHTML = `<div style="text-align:center; margin-top:100px; color:var(--dim); font-size:14px;">☁️ No objectives today.</div>`;
    } else {
        dayTasks.forEach((task, filteredIdx) => {
            const originalIdx = tasks.indexOf(task);
            feed.innerHTML += `
                <div class="task-card ${task.done ? 'done' : ''}" ontouchstart="handleTouchStart(event)" ontouchend="handleTouchEnd(event, ${filteredIdx})">
                    <div class="checkbox" onclick="toggle(${originalIdx})"></div>
                    <div class="t-content">
                        <div class="t-text" style="font-weight:600; color:var(--text);">${task.text}</div>
                        <div style="font-size:11px; color:var(--dim); margin-top:4px;">${task.cat}</div>
                    </div>
                </div>`;
        });
    }
    localStorage.setItem('orbit_flow_v12', JSON.stringify(tasks));
}

// --- Initialization ---
document.getElementById('add-btn').onclick = () => {
    const input = document.getElementById('task-input');
    if(!input.value) return;
    haptic.success();
    tasks.push({ text: input.value, cat: currentCategory, date: selectedDate, done: false });
    input.value = ''; render();
};

window.toggle = (i) => { haptic.medium(); tasks[i].done = !tasks[i].done; render(); };
function setTheme(t) { 
    document.body.className = t === 'dark' ? 'dark-mode' : ''; 
    localStorage.setItem('theme', t); 
    
    // Update button visual state
    document.querySelectorAll('.t-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase() === t) btn.classList.add('active');
    });
}

document.getElementById('open-settings').onclick = () => { 
    haptic.medium(); document.getElementById('sidebar').classList.add('open'); updateStats('day'); 
};
function closeSidebar(e) { if (e.target.id === 'sidebar') document.getElementById('sidebar').classList.remove('open'); }
document.getElementById('jump-today').onclick = () => {
    const today = new Date(); selectedDate = today.toLocaleDateString('en-CA'); viewDate = new Date();
    updateHeader(today); initCalendar(today); render();
};

setTheme(localStorage.getItem('theme') || 'light');
refreshCategoryMenu();
initCalendar();
updateHeader(new Date());
render();