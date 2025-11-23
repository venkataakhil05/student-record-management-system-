/* ---------- LinkedList implementation (single copy) ---------- */
class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

class StudentLinkedList {
  constructor() { this.head = null; }
  add(data) {
    const node = new Node(data);
    if (!this.head) { this.head = node; return; }
    let cur = this.head;
    while (cur.next) cur = cur.next;
    cur.next = node;
  }
  update(index, data) {
    let cur = this.head, i = 0;
    while (cur && i < index) { cur = cur.next; i++; }
    if (cur) cur.data = data;
  }
  delete(index) {
    if (!this.head) return;
    if (index === 0) { this.head = this.head.next; return; }
    let prev = null, cur = this.head, i = 0;
    while (cur && i < index) { prev = cur; cur = cur.next; i++; }
    if (prev && cur) prev.next = cur.next;
  }
  toArray() {
    const out = []; let cur = this.head;
    while (cur) { out.push(cur.data); cur = cur.next; }
    return out;
  }
  clear() { this.head = null; }
  sortByMarks(ascending = true) {
    if (!this.head || !this.head.next) return;
    let sorted = null;
    while (this.head) {
      let target = this.head, prevToTarget = null;
      let prev = this.head, cur = this.head.next;
      while (cur) {
        if ((ascending && cur.data.marks < target.data.marks) || (!ascending && cur.data.marks > target.data.marks)) {
          target = cur; prevToTarget = prev;
        }
        prev = cur; cur = cur.next;
      }
      if (target === this.head) this.head = this.head.next;
      else if (prevToTarget) prevToTarget.next = target.next;
      target.next = sorted; sorted = target;
    }
    this.head = sorted;
  }
  sortByRoll(ascending = true) {
    if (!this.head || !this.head.next) return;
    let sorted = null;
    while (this.head) {
      let target = this.head, prevToTarget = null;
      let prev = this.head, cur = this.head.next;
      while (cur) {
        if ((ascending && cur.data.roll < target.data.roll) || (!ascending && cur.data.roll > target.data.roll)) {
          target = cur; prevToTarget = prev;
        }
        prev = cur; cur = cur.next;
      }
      if (target === this.head) this.head = this.head.next;
      else if (prevToTarget) prevToTarget.next = target.next;
      target.next = sorted; sorted = target;
    }
    this.head = sorted;
  }
}

/* ---------- App state & persistence ---------- */
const STORAGE_KEY = 'sr_records_v1';
const studentList = new StudentLinkedList();
let editIndex = null;        // used on index.html to edit specific index
let sortAscending = true;    // toggles sorting direction

function persistToLocalStorage() {
  const arr = studentList.toArray();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function loadFromLocalStorage() {
  studentList.clear();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach(it => studentList.add(it));
  } catch (e) { console.error('Failed to load stored data', e); }
}

/* ---------- Save / Edit flow (index.html) ---------- */
function saveStudent() {
  const name = document.getElementById('name').value.trim();
  const roll = document.getElementById('roll').value.trim();
  const grade = document.getElementById('grade').value.trim();
  const marks = parseInt(document.getElementById('marks').value, 10);

  if (!name || !roll || !grade || Number.isNaN(marks)) {
    return alert('Please fill all fields correctly.');
  }

  loadFromLocalStorage();
  const arr = studentList.toArray();

  if (editIndex !== null) {
    // update existing record (ensure new roll doesn't collide)
    const original = arr[editIndex];
    if (roll !== original.roll && arr.some((s, i) => s.roll === roll && i !== editIndex)) {
      return alert('Roll already exists. Choose a unique roll.');
    }
    studentList.update(editIndex, { name, roll, grade, marks });
    editIndex = null;
    sessionStorage.removeItem('sr_edit_roll');
    persistToLocalStorage();
    alert('Record updated.');
    window.location.href = 'list.html';
    return;
  }

  // adding new record: ensure unique roll
  if (arr.some(s => s.roll === roll)) return alert('Roll already exists. Choose a unique roll.');
  studentList.add({ name, roll, grade, marks });
  persistToLocalStorage();
  alert('Student added.');
  window.location.href = 'list.html';
}

/* ---------- List rendering & actions (list.html) ---------- */
function renderTable() {
  loadFromLocalStorage();
  const arr = studentList.toArray();
  const qEl = document.getElementById('q');
  const q = qEl ? (qEl.value || '').toLowerCase() : '';
  const tbody = document.querySelector('#studentTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = arr.filter(s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q));

  if (filtered.length === 0) {
    document.getElementById('empty').style.display = 'block';
  } else {
    document.getElementById('empty').style.display = 'none';
    filtered.forEach((student, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.roll)}</td>
        <td>${escapeHtml(student.grade)}</td>
        <td>${student.marks}</td>
        <td></td>`;
      const actionsCell = tr.querySelector('td:last-child');

      const editBtn = document.createElement('button');
      editBtn.className = 'btn';
      editBtn.innerText = 'Edit';
      editBtn.onclick = () => {
        // find index in full array
        const full = studentList.toArray();
        const idx = full.findIndex(x => x.roll === student.roll);
        if (idx >= 0) {
          sessionStorage.setItem('sr_edit_roll', student.roll);
          // navigate to index.html (index will populate the form from sessionStorage)
          location.href = 'index.html';
        }
      };

      const delBtn = document.createElement('button');
      delBtn.className = 'btn danger';
      delBtn.innerText = 'Delete';
      delBtn.onclick = () => {
        if (!confirm('Delete this record?')) return;
        const full = studentList.toArray();
        const idx = full.findIndex(x => x.roll === student.roll);
        if (idx >= 0) {
          studentList.delete(idx);
          persistToLocalStorage();
          renderTable();
        }
      };

      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }

  const countEl = document.getElementById('studentCount');
  if (countEl) countEl.innerText = 'Total Students: ' + filtered.length;
}

/* ---------- Sorting & clearing ---------- */
function sortByMarks() {
  loadFromLocalStorage();
  studentList.sortByMarks(!sortAscending);
  sortAscending = !sortAscending;
  persistToLocalStorage();
  renderTable();
}
function sortByRoll() {
  loadFromLocalStorage();
  studentList.sortByRoll(!sortAscending);
  sortAscending = !sortAscending;
  persistToLocalStorage();
  renderTable();
}
function clearAll() {
  if (!confirm('Clear all local records?')) return;
  studentList.clear();
  persistToLocalStorage();
  renderTable();
}

/* ---------- CSV import/export ---------- */
// Export CSV
function exportCSV() {
  loadFromLocalStorage();
  const arr = studentList.toArray();
  if (!arr.length) return alert('No records to export.');
  const rows = arr.map(r => [r.name, r.roll, r.grade, r.marks]
    .map(c => `"${String(c).replace(/"/g,'""')}"`).join(','));
  const csv = ['name,roll,grade,marks', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'students.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Import CSV (simple parser)
function importCSVFile(file) {
  const reader = new FileReader();
  reader.onload = e => parseAndMergeCSV(e.target.result);
  reader.readAsText(file);
}
function parseAndMergeCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return alert('Empty CSV file.');
  const firstCols = lines[0].split(',').map(c => c.replace(/["']/g,'').trim().toLowerCase());
  let start = 0;
  if (firstCols.includes('name') && firstCols.includes('roll')) start = 1;
  const parsed = [];
  for (let i = start; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 4) continue;
    const name = cols[0], roll = cols[1], grade = cols[2], marks = parseInt(cols[3], 10);
    if (!name || !roll || Number.isNaN(marks)) continue;
    parsed.push({ name: name.trim(), roll: roll.trim(), grade: grade.trim(), marks });
  }
  if (!parsed.length) return alert('No valid rows found.');
  loadFromLocalStorage();
  const arr = studentList.toArray();
  parsed.forEach(item => {
    const idx = arr.findIndex(s => s.roll === item.roll);
    if (idx >= 0) studentList.update(idx, item);
    else studentList.add(item);
  });
  persistToLocalStorage();
  alert(`Imported ${parsed.length} rows (merged).`);
  renderTable();
}
function parseCSVLine(line) {
  const res = []; let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      res.push(cur); cur = '';
    } else cur += ch;
  }
  res.push(cur);
  return res.map(s => s.trim().replace(/^"(.*)"$/, '$1'));
}
// Expose importCSVFile & exportCSV to pages
window.importCSVFile = importCSVFile;
window.exportCSV = exportCSV;

/* ---------- small utils ---------- */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- Init on DOM ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  // If index page detects sr_edit_roll, set editIndex for save flow
  const editRoll = sessionStorage.getItem('sr_edit_roll');
  if (editRoll && document.getElementById('studentForm')) {
    const arr = studentList.toArray();
    const idx = arr.findIndex(s => s.roll === editRoll);
    if (idx >= 0) editIndex = idx;
  }
  if (document.querySelector('#studentTable')) renderTable();
});
