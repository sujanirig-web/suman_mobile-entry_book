const STORAGE_KEY = 'relife_entrybook_v1';
let repairs = [];
let currentTab = 'all';
let currentImageData = null;
let currentlyEditingId = null; // Track if we are editing

// IMAGE HANDLING
function handleImageUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageData = e.target.result;
            const preview = document.getElementById('imagePreview');
            document.getElementById('previewImg').src = currentImageData;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    currentImageData = null;
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('photoGallery').value = '';
    document.getElementById('photoCamera').value = '';
}

function viewImage(src) {
    const modal = document.getElementById('viewImageModal');
    document.getElementById('fullSizeImage').src = src;
    modal.classList.remove('hidden');
}

// DATA CORE
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    repairs = saved ? JSON.parse(saved) : [];
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repairs));
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.toggle('hidden');
        // Reset form if closing
        if (modal.classList.contains('hidden')) {
            document.getElementById('repairForm').reset();
            removeImage();
            currentlyEditingId = null;
            document.getElementById('modalTitle').textContent = "New Repair Job";
        }
    }
}

// EDIT FUNCTION
function editRepair(id) {
    const r = repairs.find(x => x.id === id);
    if (!r) return;

    currentlyEditingId = id;
    document.getElementById('modalTitle').textContent = "Edit Repair #" + id;
    
    // Fill the form with existing data
    document.getElementById('customerName').value = r.customer;
    document.getElementById('customerPhone').value = r.phone || '';
    document.getElementById('deviceModel').value = r.device;
    document.getElementById('snNumber').value = r.sn || '';
    document.getElementById('issueType').value = r.issue;
    document.getElementById('cost').value = r.cost;
    document.getElementById('paid').value = r.paid;
    
    if (r.image) {
        currentImageData = r.image;
        document.getElementById('previewImg').src = r.image;
        document.getElementById('imagePreview').classList.remove('hidden');
    }

    toggleModal('entryModal');
}

function renderTable(data = repairs) {
    const tbody = document.getElementById('repairTableBody');
    tbody.innerHTML = '';
    document.getElementById('noDataMessage').classList.toggle('hidden', data.length > 0);

    data.forEach(repair => {
        const due = (Number(repair.cost) || 0) - (Number(repair.paid) || 0);
        const tr = document.createElement('tr');
        tr.className = "table-row-hover group border-b border-slate-50";
        tr.innerHTML = `
            <td class="px-8 py-6">
                <div class="text-xs font-bold text-slate-400">#${repair.id}</div>
                <div class="text-[10px] font-bold text-indigo-600 uppercase mt-1">SN: ${repair.sn || 'NONE'}</div>
                <div class="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">${repair.date || ''}</div>
            </td>
            <td class="px-6 py-6">
                <div class="font-bold text-slate-800 text-sm">${repair.customer}</div>
                <div class="font-bold text-green-600 text-[10px] uppercase">${repair.device}</div>
            </td>
            <td class="px-6 py-6">
                <div class="text-xs font-bold text-slate-600">${repair.issue}</div>
                ${repair.image ? `<img src="${repair.image}" onclick="viewImage('${repair.image}')" class="mt-2 w-10 h-10 rounded-lg object-cover cursor-pointer border shadow-sm">` : ''}
            </td>
            <td class="px-6 py-6">
                <button onclick="updateStatus('${repair.id}')" class="status-pill status-${repair.status}">${repair.status}</button>
            </td>
            <td class="px-6 py-6">
                <div class="text-xs font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-500'}">Due: रू${due.toLocaleString()}</div>
            </td>
            <td class="px-8 py-6 text-right space-x-3">
                <button onclick="editRepair('${repair.id}')" class="text-slate-300 hover:text-indigo-600"><i class="fas fa-edit"></i></button>
                <button onclick="deleteRepair('${repair.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
}


function deleteRepair(id) {
    if(confirm("Are you sure you want to delete this entry?")) {
        repairs = repairs.filter(r => r.id !== id);
        saveData();
        filterTable();
        showToast("Entry Deleted");
    }
}

function updateStatus(id) {
    const flow = ['pending', 'repairing', 'completed', 'cancelled'];
    const r = repairs.find(x => x.id === id);
    if(r) {
        r.status = flow[(flow.indexOf(r.status) + 1) % flow.length];
        saveData(); filterTable();
    }
}

function updateStats() {
    const pendingCount = repairs.filter(r => r.status === 'pending' || r.status === 'repairing').length;
    const fixedCount = repairs.filter(r => r.status === 'completed').length;
    const revenue = repairs.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    const credit = repairs.reduce((a, c) => a + Math.max(0, (Number(c.cost) || 0) - (Number(c.paid) || 0)), 0);

    document.getElementById('stat-total').textContent = repairs.length;
    document.getElementById('stat-active').textContent = pendingCount;
    document.getElementById('stat-fixed-count').textContent = fixedCount;
    document.getElementById('stat-revenue').textContent = `रू${revenue.toLocaleString()}`;
    document.getElementById('stat-credit').textContent = `रू${credit.toLocaleString()}`;
}// --- TAB SWITCHING LOGIC ---
function setTab(tab) {
    // 1. Update the global variable so filterTable() knows which tab is active
    currentTab = tab;
    
    // 2. Update the UI: Remove active styling from all cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active-tab');
    });
    
    // 3. Add active styling to the card that was just clicked
    const selectedVisual = document.getElementById(`card-${tab}`);
    if (selectedVisual) {
        selectedVisual.classList.add('active-tab');
    }

    // 4. Run the filter to refresh the table rows
    filterTable();
}


function filterTable() {
    const query = document.getElementById('searchInput').value.trim();
    
    // 1. If search is empty, just show the normal tab filtering
    if (!query) {
        const tabFiltered = repairs.filter(r => {
            if (currentTab === 'all') return true;
            if (currentTab === 'pending') return r.status !== 'completed';
            if (currentTab === 'fixed') return r.status === 'completed';
            return true;
        });
        renderTable(tabFiltered);
        return;
    }

    // 2. Configure the "Smart Search"
    const options = {
        keys: ['customer', 'device', 'issue', 'sn', 'id'], // What fields to search
        threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything. 0.3 is the "sweet spot" for typos.
        distance: 100,
        ignoreLocation: true
    };

    const fuse = new Fuse(repairs, options);
    const results = fuse.search(query);

    // 3. Extract the items and apply the current Tab filter
    const searchMatches = results.map(result => result.item);
    
    const finalFiltered = searchMatches.filter(r => {
        if (currentTab === 'all') return true;
        if (currentTab === 'pending') return r.status !== 'completed';
        if (currentTab === 'fixed') return r.status === 'completed';
        return true;
    });

    renderTable(finalFiltered);
}



function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

document.getElementById('repairForm').onsubmit = function(e) {
    e.preventDefault();
    
    const formData = {
        customer: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        device: document.getElementById('deviceModel').value,
        sn: document.getElementById('snNumber').value,
        issue: document.getElementById('issueType').value,
        cost: Number(document.getElementById('cost').value) || 0,
        paid: Number(document.getElementById('paid').value) || 0,
        image: currentImageData 
    };

    if (currentlyEditingId) {
        const index = repairs.findIndex(r => r.id === currentlyEditingId);
        // Keep the original date when editing
        repairs[index] = { ...repairs[index], ...formData };
        showToast("Entry Updated");
    } else {
        const now = new Date();
        let finalDate = "";

        // Safety check for NepaliDate library
        try {
            if (typeof NepaliDate !== 'undefined') {
                const nDate = new window.NepaliDate(now);
                const nepaliDate = nDate.format('YYYY/MM/DD');
                const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                finalDate = `${nepaliDate} | ${time}`;
            } else {
                finalDate = now.toLocaleDateString(); // Fallback to AD if library fails
            }
        } catch (err) {
            finalDate = now.toLocaleDateString();
        }

        const newEntry = {
            id: Math.floor(1000 + Math.random() * 9000).toString(),
            ...formData,
            status: 'pending',
            date: finalDate
        };

        repairs.unshift(newEntry);
        showToast("New Job Logged");
    }

    saveData();
    toggleModal('entryModal');
    filterTable();
};

window.onload = () => { loadData(); renderTable(); };