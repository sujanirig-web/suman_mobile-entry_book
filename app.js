// 1. FIREBASE and algolia IMPORTS 
import algoliasearch from 'https://cdn.jsdelivr.net/npm/algoliasearch@4.22.1/dist/algoliasearch.esm.browser.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDFEwq_evYAot2DEtErBO58u6ABWBjVZ5M",
    authDomain: "relife-entry-book.firebaseapp.com",
    projectId: "relife-entry-book",
    storageBucket: "relife-entry-book.firebasestorage.app",
    messagingSenderId: "736685646269",
    appId: "1:736685646269:web:387441b954cd4f123f72d4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const algoliaClient = algoliasearch(
    "SRL627FPXS",
    "a794f93efc346a4a17d20fcebff54ad6"
);
const algoliaIndex = algoliaClient.initIndex("repairs");

// 2. GLOBAL STATE 
let displayedRepairs = [];
let repairs = [];
let currentTab = 'all';
let currentDate = new Date();
let currentImageData = null;
let currentlyEditingId = null;
let unsubscribe = null;
let currentSearchQuery = "";
let searchDebounceTimer = null;

if ("Notification" in window) {
    Notification.requestPermission();
}

function sendNotification(title, body) {
    showToast(body);
    try {
        if (window.Notification && Notification.permission === "granted") {
            new Notification(title, { body });
        }
    } catch(e) {
        console.warn("Notifications not supported", e);
    }
}

function updateSearchResultLocally(updatedRepair) {
    const index = displayedRepairs.findIndex(r => r.id === updatedRepair.id);
    if (index !== -1) {
        displayedRepairs[index] = { ...displayedRepairs[index], ...updatedRepair };
        renderTable(displayedRepairs);
        console.log("✅ Search result updated instantly");
    }
    const repairIndex = repairs.findIndex(r => r.id === updatedRepair.id);
    if (repairIndex !== -1) {
        repairs[repairIndex] = { ...repairs[repairIndex], ...updatedRepair };
    }
}

const pendingLogs = new Map();

async function logChange(repairId, field, oldValue, newValue, repairTitle) {
    const oldStr = String(oldValue);
    const newStr = String(newValue);
    const key = `${repairId}|${field}|${oldStr}|${newStr}`;

    const lastTime = pendingLogs.get(key);
    const now = Date.now();
    if (lastTime && (now - lastTime) < 10000) {
        console.warn(`⚠️ Duplicate log blocked for key: ${key}`);
        return;
    }

    pendingLogs.set(key, now);
    console.log(`📝 Attempting to log: ${key}`);

    const user = auth.currentUser;
    const userEmail = user ? user.email : "unknown";
    try {
        await addDoc(collection(db, "logs"), {
            repairId,
            field,
            oldValue: oldStr,
            newValue: newStr,
            changedBy: userEmail,
            timestamp: new Date().toISOString(),
            repairTitle
        });
        console.log(`✅ Log written: ${key}`);
    } catch (err) {
        console.error("Failed to write log:", err);
        pendingLogs.delete(key);
    }
    setTimeout(() => {
        pendingLogs.delete(key);
    }, 10000);
}

onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        if (user) {
            overlay.style.display = 'none';
            loadDataByDay();
        } else {
            overlay.style.display = 'flex';
            repairs = [];
            displayedRepairs = [];
            if (typeof window.filterTable === 'function') window.filterTable();
        }
    }
});

function getDayRange(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function loadDataByDay() {
    if (unsubscribe) unsubscribe();
    const q = query(collection(db, "repairs"), orderBy("createdAt", "desc"));
    unsubscribe = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const { start, end } = getDayRange(currentDate);
        const newRepairs = allData.filter(r => {
            if (!r.createdAt) return true;
            let d;
            if (typeof r.createdAt === "string") d = new Date(r.createdAt);
            else if (r.createdAt.seconds) d = new Date(r.createdAt.seconds * 1000);
            else return true;
            if (isNaN(d)) return true;
            return d >= start && d <= end;
        });
        
        repairs = newRepairs;
        updateDateLabel();

        const isSearching = currentSearchQuery.length >= 2;
        if (isSearching) {
            snapshot.docChanges().forEach(change => {
                const changedRepair = { ...change.doc.data(), id: change.doc.id };
                if (change.type === 'added' || change.type === 'modified') {
                    const idx = displayedRepairs.findIndex(r => r.id === changedRepair.id);
                    if (idx !== -1) {
                        displayedRepairs[idx] = { ...displayedRepairs[idx], ...changedRepair };
                    } else if (change.type === 'added') {
                        if (matchesCurrentFilters(changedRepair)) {
                            displayedRepairs.unshift(changedRepair);
                        }
                    }
                } else if (change.type === 'removed') {
                    const idx = displayedRepairs.findIndex(r => r.id === changedRepair.id);
                    if (idx !== -1) displayedRepairs.splice(idx, 1);
                }
            });
            displayedRepairs = displayedRepairs.filter(r => matchesCurrentFilters(r));
            renderTable(displayedRepairs);
        } else {
            window.filterTable();
        }
        updateStats();
    });
}

function matchesCurrentFilters(repair) {
    const filterVal = document.getElementById('statusFilter')?.value || "all";
    const cost = Number(repair.cost) || 0;
    const paid = Number(repair.paid) || 0;
    const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
    const isUnpaid = (cost > 0 && paid < cost);
    
    let matchesTab = (currentTab === 'all' ||
                      (currentTab === 'pending' && repair.status !== 'completed') ||
                      (currentTab === 'fixed' && repair.status === 'completed'));
    
    let matchesFilter = true;
    if (filterVal === 'paid') matchesFilter = isPaid;
    else if (filterVal === 'unpaid') matchesFilter = isUnpaid;
    else if (filterVal !== 'all') matchesFilter = repair.status === filterVal;
    
    let matchesText = true;
    if (currentSearchQuery.length >= 2) {
        const text = `${repair.customer||''} ${repair.device||''} ${repair.sn||''} ${repair.phone||''}`.toLowerCase();
        matchesText = text.includes(currentSearchQuery.toLowerCase());
    }
    return matchesTab && matchesFilter && matchesText;
}

function updateDateLabel() {
    const label = document.getElementById('dateLabel');
    if (!label) return;
    try {
        if (window.NepaliDate) {
            const nepDate = new NepaliDate(currentDate);
            label.textContent = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
        } else {
            label.textContent = currentDate.toLocaleDateString();
        }
    } catch (e) {
        label.textContent = currentDate.toLocaleDateString();
    }
}

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-tab'));
    const active = document.getElementById(`card-${tab}`);
    if (active) active.classList.add('active-tab');
    window.filterTable();
}
window.setTab = setTab;

function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
        window.filterTable();
    }
}

window.nextDay = function () {
    currentDate.setDate(currentDate.getDate() + 1);
    clearSearchInput();
    loadDataByDay();
};

window.prevDay = function () {
    currentDate.setDate(currentDate.getDate() - 1);
    clearSearchInput();
    loadDataByDay();
};

window.goToday = function () {
    currentDate = new Date();
    clearSearchInput();
    loadDataByDay();
};

window.toggleModal = function (id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    const isOpening = modal.classList.contains('hidden');
    if (isOpening) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto';
        if (id === 'entryModal') {
            const form = document.getElementById('repairForm');
            if (form) form.reset();
            window.removeImage();
            currentlyEditingId = null;
            const title = document.getElementById('modalTitle');
            if (title) title.textContent = "New Repair Job";
        }
    }
};

window.handleImageUpload = function (input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentImageData = e.target.result;
            const previewImg = document.getElementById('previewImg');
            const previewDiv = document.getElementById('imagePreview');
            if (previewImg) previewImg.src = currentImageData;
            if (previewDiv) previewDiv.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
};

window.removeImage = function () {
    currentImageData = null;
    const previewDiv = document.getElementById('imagePreview');
    if (previewDiv) previewDiv.classList.add('hidden');
    const gallery = document.getElementById('photoGallery');
    const camera = document.getElementById('photoCamera');
    if (gallery) gallery.value = '';
    if (camera) camera.value = '';
};

window.viewImage = function (src) {
    const modal = document.getElementById('viewImageModal');
    const fullImg = document.getElementById('fullSizeImage');
    if (fullImg) fullImg.src = src;
    if (modal) modal.classList.remove('hidden');
};

window.jumpToRepairDate = function (repair) {
    if (!repair.createdAt) return;
    let d;
    if (typeof repair.createdAt === "string") d = new Date(repair.createdAt);
    else if (repair.createdAt.seconds) d = new Date(repair.createdAt.seconds * 1000);
    if (isNaN(d)) return;
    currentDate = d;
    clearSearchInput();
    loadDataByDay();
    showToast("Jumped to selected date");
};

window.jumpToRepairDateById = function (id) {
    const r = displayedRepairs.find(x => x.id === id || x.objectID === id);
    if (r) window.jumpToRepairDate(r);
};

window.updateStatus = async function (id) {
    const repair = repairs.find(r => r.id === id) || displayedRepairs.find(r => r.id === id);
    if (!repair) {
        showToast("Repair not found", true);
        return;
    }
    const flow = ['pending', 'repairing', 'completed', 'cancelled'];
    const currentStatus = repair.status || 'pending';
    const nextStatus = flow[(flow.indexOf(currentStatus) + 1) % flow.length];
    try {
        await updateDoc(doc(db, "repairs", id), { status: nextStatus });
        await algoliaIndex.partialUpdateObject({ objectID: id, status: nextStatus });
        showToast(`Status changed to ${nextStatus}`);
        const updatedRepair = { ...repair, status: nextStatus };
        updateSearchResultLocally(updatedRepair);
    } catch (err) {
        console.error(err);
        alert("Failed to update status");
    }
};

window.editRepair = function (id) {
    const repair = displayedRepairs.find(x => x.id === id || x.objectID === id);
    if (!repair) return;

    currentlyEditingId = id;
    document.getElementById('modalTitle').textContent = "Edit Repair #" + id;
    document.getElementById('customerName').value = repair.customer || '';
    document.getElementById('customerPhone').value = repair.phone || '';
    document.getElementById('deviceModel').value = repair.device || '';
    document.getElementById('snNumber').value = repair.sn || '';
    document.getElementById('issueType').value = repair.issue || '';
    document.getElementById('cost').value = repair.cost || 0;
    document.getElementById('paid').value = repair.paid || 0;
    document.getElementById('devicePassword').value = repair.password || '';
    currentImageData = repair.image || null;
    const previewImg = document.getElementById('previewImg');
    const previewDiv = document.getElementById('imagePreview');
    if (repair.image) {
        if (previewImg) previewImg.src = repair.image;
        if (previewDiv) previewDiv.classList.remove('hidden');
    } else {
        if (previewDiv) previewDiv.classList.add('hidden');
    }
    window.toggleModal('entryModal');
};

window.deleteRepair = async function (id) {
    if (!confirm("Delete this entry?")) return;
    try {
        await deleteDoc(doc(db, "repairs", id));
        await algoliaIndex.deleteObject(id);
        showToast("Deleted successfully");
        const index = displayedRepairs.findIndex(r => r.id === id);
        if (index !== -1) {
            displayedRepairs.splice(index, 1);
            renderTable(displayedRepairs);
        }
        const repairIndex = repairs.findIndex(r => r.id === id);
        if (repairIndex !== -1) {
            repairs.splice(repairIndex, 1);
        }
    } catch (err) {
        console.error(err);
        alert("Delete failed");
    }
};

window.filterTable = function() {
    if (currentSearchQuery.length >= 2) {
        performSearch(currentSearchQuery);
    } else {
        let data = [...repairs];
        const filterVal = document.getElementById('statusFilter')?.value || "all";
        data = data.filter(r => {
            const cost = Number(r.cost) || 0;
            const paid = Number(r.paid) || 0;
            const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
            const isUnpaid = (cost > 0 && paid < cost);
            const matchesTab = (currentTab === 'all' ||
                                (currentTab === 'pending' && r.status !== 'completed') ||
                                (currentTab === 'fixed' && r.status === 'completed'));
            let matchesFilter = true;
            if (filterVal === 'paid') matchesFilter = isPaid;
            else if (filterVal === 'unpaid') matchesFilter = isUnpaid;
            else if (filterVal !== 'all') matchesFilter = r.status === filterVal;
            return matchesTab && matchesFilter;
        });
        displayedRepairs = data;
        renderTable(displayedRepairs);
    }
};

async function performSearch(query) {
    currentSearchQuery = query;
    const isSearching = query.length >= 2;
    
    if (!isSearching) {
        window.filterTable();
        return;
    }
    
    try {
        const res = await algoliaIndex.search(query, { hitsPerPage: 200 });
        let hits = res.hits.map(hit => ({ ...hit, id: hit.objectID }));
        hits = hits.filter(r => matchesCurrentFilters(r));
        displayedRepairs = hits;
        renderTable(displayedRepairs);
    } catch (err) {
        console.log("Algolia search error:", err);
        displayedRepairs = [];
        renderTable(displayedRepairs);
    }
}

function onSearchInput() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const query = input.value.trim();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        performSearch(query);
    }, 300);
}

function renderTable(data = repairs) {
    const tbody = document.getElementById('repairTableBody');
    const noData = document.getElementById('noDataMessage');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (noData) noData.classList.toggle('hidden', data.length > 0);
    data.forEach(repair => {
        const due = (Number(repair.cost) || 0) - (Number(repair.paid) || 0);
        const tr = document.createElement('tr');
        tr.className = "table-row-hover group border-b border-slate-50";
        tr.innerHTML = `
            <td class="px-8 py-6">
                <div class="text-[0px] font-bold text-slate-0">#${repair.id}</div>
                <div class="text-[13px] font-bold text-green-800 uppercase mt-1">SN: ${repair.sn || 'NONE'}</div>
                <div class="text-[12px] font-bold text-slate-700 uppercase mt-1 tracking-wider">${repair.date || ''}</div>
                <div class="text-[12px] font-bold text-slate-700 uppercase mt-1 tracking-wider">${repair.phone || ''}</div>
            </td>
            <td class="px-7 py-7">
                <div class="font-bold text-slate-800 text-sm">${repair.customer || ''}</div>
                <div class="font-bold text-green-600 text-[16px] uppercase">${repair.device || ''}</div>
                <div class="font-bold text-[12px] text-black-700">🔒 Pass: ${repair.password || ''}</div>
            </td>
            <td class="px-6 py-6">
                <div class="text-xs font-bold text-slate-600">${repair.issue || ''}</div>
                ${repair.image ? `<img src="${repair.image}" onclick="viewImage('${repair.image}')" class="mt-2 w-10 h-10 rounded-lg object-cover cursor-pointer border shadow-sm">` : ''}
              </td>
            <td class="px-6 py-6">
                <button onclick="updateStatus('${repair.id}')" class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${repair.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}">${repair.status || 'pending'}</button>
              </td>
            <td class="px-6 py-6">
                <div class="text-[11px] font-bold text-slate-700">Total: रू${(Number(repair.cost) || 0).toLocaleString()}</div>
                <div class="text-[11px] font-bold text-emerald-600">Paid: रू${(Number(repair.paid) || 0).toLocaleString()}</div>
                <div class="text-[11px] font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-500'}">Due: रू${due.toLocaleString()}</div>
              </td>
            <td class="px-8 py-6 text-right space-x-3">
                <button onclick="event.stopPropagation(); editRepair('${repair.id}')" class="text-slate-300 hover:text-indigo-600"><i class="fas fa-edit"></i></button>
                <button onclick="event.stopPropagation(); deleteRepair('${repair.id}')" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button>
                <button onclick="event.stopPropagation(); jumpToRepairDateById('${repair.id}')" class="text-slate-300 hover:text-blue-500">🏴</button>
              </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
}

function updateStats() {
    const pending = repairs.filter(r => r.status === 'pending' || r.status === 'repairing').length;
    const fixed = repairs.filter(r => r.status === 'completed').length;
    const revenue = repairs.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    const credit = repairs.reduce((a, c) => a + Math.max(0, (Number(c.cost) || 0) - (Number(c.paid) || 0)), 0);
    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = repairs.length;
    if (document.getElementById('stat-active')) document.getElementById('stat-active').textContent = pending;
    if (document.getElementById('stat-fixed-count')) document.getElementById('stat-fixed-count').textContent = fixed;
    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = `रू${revenue.toLocaleString()}`;
    if (document.getElementById('stat-credit')) document.getElementById('stat-credit').textContent = `रू${credit.toLocaleString()}`;
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
    }
}

window.showLogsModal = async function () {
    const logsModal = document.getElementById('logsModal');
    if (!logsModal) return;
    const logsList = document.getElementById('logsList');
    if (logsList) logsList.innerHTML = '<div class="p-4 text-center">Loading logs...</div>';
    window.toggleModal('logsModal');
    try {
        const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            if (logsList) logsList.innerHTML = '<div class="p-4 text-center text-slate-500">No logs found.</div>';
            return;
        }
        let html = '<div class="divide-y divide-slate-100">';
        snapshot.forEach(docSnap => {
            const log = docSnap.data();
            const date = new Date(log.timestamp).toLocaleString();
            html += `
                <div class="p-4 text-sm">
                    <div class="font-bold text-slate-700">Repair: ${log.repairTitle || log.repairId}</div>
                    <div class="text-slate-500">Field: <span class="font-mono">${log.field}</span> changed from <span class="text-red-500">${log.oldValue || "(empty)"}</span> → <span class="text-green-600">${log.newValue || "(empty)"}</span></div>
                    <div class="text-xs text-slate-400">By: ${log.changedBy} at ${date}</div>
                </div>
            `;
        });
        html += '</div>';
        if (logsList) logsList.innerHTML = html;
    } catch (err) {
        console.error(err);
        if (logsList) logsList.innerHTML = '<div class="p-4 text-center text-red-500">Failed to load logs.</div>';
    }
};

function toggleLogoMenu() {
    let menu = document.getElementById('logoDropdown');
    if (!menu) {
        const iconDiv = document.querySelector('.flex.items-center.gap-3');
        if (!iconDiv) return;
        menu = document.createElement('div');
        menu.id = 'logoDropdown';
        menu.className = 'absolute mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 hidden';
        menu.innerHTML = `
            <button onclick="showLogsModal(); toggleLogoMenu();" class="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-t-xl flex items-center gap-2">
                <i class="fas fa-history text-slate-500"></i> 📜 View Logs
            </button>
            <button onclick="toggleLogoMenu();" class="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-b-xl flex items-center gap-2">
                <i class="fas fa-times text-slate-500"></i> Close
            </button>
        `;
        iconDiv.style.position = 'relative';
        iconDiv.appendChild(menu);
        document.addEventListener('click', function(e) {
            if (!iconDiv.contains(e.target) && menu) menu.classList.add('hidden');
        });
    }
    menu.classList.toggle('hidden');
}
window.toggleLogoMenu = toggleLogoMenu;

window.onload = () => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = async () => {
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            try {
                loginBtn.textContent = "Verifying...";
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                loginBtn.textContent = "Access Dashboard";
                alert("Invalid Credentials");
            }
        };
    }

    const logoArea = document.querySelector('.flex.items-center.gap-3');
    if (logoArea) {
        logoArea.style.cursor = 'pointer';
        logoArea.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLogoMenu();
        });
    }

    const dateLabel = document.getElementById('dateLabel');
    if (dateLabel) {
        dateLabel.style.cursor = 'pointer';
        dateLabel.addEventListener('click', () => {
            window.goToday();
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', onSearchInput);
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            window.filterTable();
        });
    }

    const form = document.getElementById('repairForm');
    if (!form) return;

    let isSubmitting = false;

    form.onsubmit = async function (e) {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        showToast("Saving...");

        try {
            let finalImageUrl = currentImageData;
            if (currentImageData && currentImageData.startsWith('data:image')) {
                const imgFormData = new FormData();
                imgFormData.append("image", currentImageData.split(',')[1]);
                const res = await fetch(`https://api.imgbb.com/1/upload?key=50e3528b32a0303dab2a1de6244e6198`, {
                    method: "POST",
                    body: imgFormData
                });
                const result = await res.json();
                if (result.success) finalImageUrl = result.data.url;
            }

            let costVal = Number(document.getElementById('cost').value) || 0;
            let paidVal = Number(document.getElementById('paid').value) || 0;
            if (costVal === 0 && paidVal > 0) costVal = paidVal;

            const isCompleted = paidVal > 0 && paidVal >= costVal;
            const newPhone = document.getElementById('customerPhone').value;
            const newCost = costVal;
            const newPaid = paidVal;
            const newCustomer = document.getElementById('customerName').value;

            const formData = {
                customer: newCustomer,
                phone: newPhone,
                device: document.getElementById('deviceModel').value,
                sn: document.getElementById('snNumber').value,
                issue: document.getElementById('issueType').value,
                cost: newCost,
                paid: newPaid,
                image: finalImageUrl,
                updatedAt: new Date().toISOString()
            };
            const passwordInput = document.getElementById('devicePassword')?.value;
            if (passwordInput && passwordInput.trim() !== "") formData.password = passwordInput;

            if (currentlyEditingId) {
                const oldDocRef = doc(db, "repairs", currentlyEditingId);
                const oldSnap = await getDoc(oldDocRef);
                let updatedRepair = null;
                if (oldSnap.exists()) {
                    const oldData = oldSnap.data();
                    const repairTitle = `${oldData.customer || ''} - ${oldData.device || ''}`;
                    if (oldData.phone !== newPhone) {
                        await logChange(currentlyEditingId, "phone", oldData.phone || "", newPhone, repairTitle);
                        sendNotification("Phone changed", `Repair #${currentlyEditingId}: ${oldData.phone || "empty"} → ${newPhone}`);
                    }
                    if (Number(oldData.cost || 0) !== newCost) {
                        await logChange(currentlyEditingId, "cost", oldData.cost || 0, newCost, repairTitle);
                        sendNotification("Price changed", `Repair #${currentlyEditingId}: cost ${oldData.cost || 0} → ${newCost}`);
                    }
                    if (Number(oldData.paid || 0) !== newPaid) {
                        await logChange(currentlyEditingId, "paid", oldData.paid || 0, newPaid, repairTitle);
                        sendNotification("Payment changed", `Repair #${currentlyEditingId}: paid ${oldData.paid || 0} → ${newPaid}`);
                    }

                    updatedRepair = {
                        ...oldData,
                        ...formData,
                        status: isCompleted ? 'completed' : 'pending',
                        id: currentlyEditingId
                    };
                }

                const updatedData = { ...formData, status: isCompleted ? 'completed' : 'pending' };
                await updateDoc(doc(db, "repairs", currentlyEditingId), updatedData);
                await algoliaIndex.partialUpdateObject({ objectID: currentlyEditingId, ...updatedData });
                showToast("Updated successfully");

                if (updatedRepair) {
                    updateSearchResultLocally(updatedRepair);
                }
            } else {
                const now = new Date();
                let finalDate = now.toLocaleDateString();
                try {
                    if (typeof window.NepaliDate === 'function') {
                        const nepDate = new NepaliDate(now);
                        finalDate = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
                    }
                } catch (e) {}

                const newEntry = {
                    ...formData,
                    status: isCompleted ? 'completed' : 'pending',
                    date: finalDate,
                    createdAt: now.toISOString()
                };
                const docRef = await addDoc(collection(db, "repairs"), newEntry);
                await algoliaIndex.saveObject({ objectID: docRef.id, ...newEntry });
                showToast("Repair added");
            }

            window.toggleModal('entryModal');
            currentlyEditingId = null;
            currentImageData = null;
        } catch (err) {
            console.error("Save Error:", err);
            alert("Error: " + err.message);
        } finally {
            isSubmitting = false;
        }
    };
};

window.syncAllToAlgolia = async function () {
    console.log("🔥 Syncing ALL Firebase data to Algolia...");
    const snapshot = await getDocs(collection(db, "repairs"));
    const batch = [];
    snapshot.forEach(docSnap => {
        batch.push({ objectID: docSnap.id, ...docSnap.data() });
    });
    await algoliaIndex.saveObjects(batch);
    console.log("✅ Sync complete:", batch.length);
};