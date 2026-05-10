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

// GLOBAL STATE 
let displayedRepairs = [];
let repairs = [];
let fullMonthRepairs = [];
let currentTab = 'all';
let currentDate = new Date();
let currentNepaliYear = 2082;
let currentNepaliMonth = 1;
let currentView = 'day';
let currentImageData = null;
let currentlyEditingId = null;
let unsubscribe = null;
let currentSearchQuery = "";
let searchDebounceTimer = null;

// ========== Censorship for Revenue and Due ==========
let revenueCensored = true;
let dueCensored = true;
let revenueTimer = null;
let dueTimer = null;

function censorRevenue() {
    const revenueEl = document.getElementById('stat-revenue');
    if (revenueEl) {
        revenueEl.classList.add('blur-strong');
    }
    revenueCensored = true;
    if (revenueTimer) clearTimeout(revenueTimer);
}

function censorDue() {
    const dueEl = document.getElementById('stat-credit');
    if (dueEl) {
        dueEl.classList.add('blur-strong');
    }
    dueCensored = true;
    if (dueTimer) clearTimeout(dueTimer);
}

function uncensorRevenue() {
    const revenueEl = document.getElementById('stat-revenue');
    if (revenueEl) {
        revenueEl.classList.remove('blur-strong');
    }
    revenueCensored = false;
    if (revenueTimer) clearTimeout(revenueTimer);
    revenueTimer = setTimeout(() => {
        censorRevenue();
    }, 1000);
}

function uncensorDue() {
    const dueEl = document.getElementById('stat-credit');
    if (dueEl) {
        dueEl.classList.remove('blur-strong');
    }
    dueCensored = false;
    if (dueTimer) clearTimeout(dueTimer);
    dueTimer = setTimeout(() => {
        censorDue();
    }, 1000);
}

window.toggleRevenueCensor = function() {
    if (revenueCensored) {
        uncensorRevenue();
    } else {
        // If already uncensored and tapped again, restart the 5s timer
        if (revenueTimer) clearTimeout(revenueTimer);
        revenueTimer = setTimeout(() => {
            censorRevenue();
        }, 1000);
    }
};

window.toggleDueCensor = function() {
    if (dueCensored) {
        uncensorDue();
    } else {
        if (dueTimer) clearTimeout(dueTimer);
        dueTimer = setTimeout(() => {
            censorDue();
        }, 1000);
    }
};

// Pagination
let currentPage = 1;
const itemsPerPage = 50;
let totalFilteredForMonth = 0;

if ("Notification" in window) {
    Notification.requestPermission();
}

// ========== HELPER: Smart sort by SN (DESCENDING: largest SN first) ==========
function sortBySNDesc(arr) {
    return arr.sort((a, b) => {
        const snA = a.sn || '';
        const snB = b.sn || '';
        // Extract numeric prefix
        const numA = parseInt(snA, 10);
        const numB = parseInt(snB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA; // descending numeric
        }
        if (!isNaN(numA)) return -1; // numbers before non-numbers
        if (!isNaN(numB)) return 1;
        return snB.localeCompare(snA); // descending string compare
    });
}

function adToBsYearMonth(adDate) {
    try {
        if (typeof window.NepaliDate !== 'function') {
            return { year: 2080, month: 1 };
        }
        const nepDate = new NepaliDate(adDate);
        let year = nepDate.getYear();
        let month = nepDate.getMonth();
        if (isNaN(year)) year = 2080;
        if (isNaN(month)) month = 1;
        return { year, month };
    } catch (e) {
        return { year: 2080, month: 1 };
    }
}

function sendNotification(title, body) {
    showToast(body);
    try {
        if (window.Notification && Notification.permission === "granted") {
            new Notification(title, { body });
        }
    } catch(e) {}
}

function updateSearchResultLocally(updatedRepair) {
    const index = displayedRepairs.findIndex(r => r.id === updatedRepair.id);
    if (index !== -1) {
        displayedRepairs[index] = { ...displayedRepairs[index], ...updatedRepair };
        renderTable(displayedRepairs);
    }
    const repairIndex = repairs.findIndex(r => r.id === updatedRepair.id);
    if (repairIndex !== -1) {
        repairs[repairIndex] = { ...repairs[repairIndex], ...updatedRepair };
    }
    const monthIndex = fullMonthRepairs.findIndex(r => r.id === updatedRepair.id);
    if (monthIndex !== -1) {
        fullMonthRepairs[monthIndex] = { ...fullMonthRepairs[monthIndex], ...updatedRepair };
    }
}

const pendingLogs = new Map();

async function logChange(repairId, field, oldValue, newValue, repairTitle) {
    const oldStr = String(oldValue);
    const newStr = String(newValue);
    const key = `${repairId}|${field}|${oldStr}|${newStr}`;
    const lastTime = pendingLogs.get(key);
    const now = Date.now();
    if (lastTime && (now - lastTime) < 10000) return;
    pendingLogs.set(key, now);
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
    } catch (err) {
        console.error("Failed to write log:", err);
        pendingLogs.delete(key);
    }
    setTimeout(() => pendingLogs.delete(key), 10000);
}

onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        if (user) {
            overlay.style.display = 'none';
            const { year, month } = adToBsYearMonth(new Date());
            currentNepaliYear = Number(year);
            currentNepaliMonth = Number(month);
            loadData();
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

function loadData() {
    if (unsubscribe) unsubscribe();
    const q = query(collection(db, "repairs"), orderBy("createdAt", "desc"));
    unsubscribe = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        
        if (currentView === 'day') {
            const { start, end } = getDayRange(currentDate);
            let dayRepairs = allData.filter(r => {
                if (!r.createdAt) return true;
                let d;
                if (typeof r.createdAt === "string") d = new Date(r.createdAt);
                else if (r.createdAt.seconds) d = new Date(r.createdAt.seconds * 1000);
                else return true;
                if (isNaN(d)) return true;
                return d >= start && d <= end;
            });
            // Sort descending by SN
            dayRepairs = sortBySNDesc(dayRepairs);
            repairs = dayRepairs;
            fullMonthRepairs = [];
            currentPage = 1;
            updateDateLabel();
            window.filterTable();
            updateStats();
        } else {
            let monthRepairs = allData.filter(r => {
                if (!r.createdAt) return false;
                let d;
                if (typeof r.createdAt === "string") d = new Date(r.createdAt);
                else if (r.createdAt.seconds) d = new Date(r.createdAt.seconds * 1000);
                else return false;
                if (isNaN(d)) return false;
                const { year, month } = adToBsYearMonth(d);
                return year === currentNepaliYear && month === currentNepaliMonth;
            });
            // Sort descending by SN
            monthRepairs = sortBySNDesc(monthRepairs);
            fullMonthRepairs = monthRepairs;
            repairs = monthRepairs;
            currentPage = 1;
            updateDateLabel();
            applyFiltersAndPaginate();
            updateStats();
        }
    });
}

function applyFiltersAndPaginate() {
    if (currentView !== 'month') return;
    let filtered = [...fullMonthRepairs];
    
    // Tab filter
    if (currentTab === 'pending') {
        filtered = filtered.filter(r => r.status !== 'completed' && r.status !== 'returned');
    } else if (currentTab === 'fixed') {
        filtered = filtered.filter(r => r.status === 'completed');
    } else if (currentTab === 'returned') {
        filtered = filtered.filter(r => r.status === 'returned');
    }
    
    // Status dropdown filter
    const filterVal = document.getElementById('statusFilter')?.value || "all";
    if (filterVal !== 'all') {
        filtered = filtered.filter(r => {
            const cost = Number(r.cost) || 0;
            const paid = Number(r.paid) || 0;
            const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
            const isUnpaid = (cost > 0 && paid < cost);
            if (filterVal === 'paid') return isPaid;
            if (filterVal === 'unpaid') return isUnpaid;
            return r.status === filterVal;
        });
    }
    
    // Search filter
    const searchInput = document.getElementById('searchInput');
    let query = '';
    if (searchInput) query = searchInput.value.trim();
    if (query.length >= 2) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(r => 
            (r.customer || '').toLowerCase().includes(lowerQuery) ||
            (r.device || '').toLowerCase().includes(lowerQuery) ||
            (r.sn || '').toLowerCase().includes(lowerQuery) ||
            (r.phone || '').toLowerCase().includes(lowerQuery)
        );
    }
    
    // Sort descending by SN before pagination
    filtered = sortBySNDesc(filtered);
    
    totalFilteredForMonth = filtered.length;
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    displayedRepairs = paginated;
    renderTable(displayedRepairs);
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const container = document.getElementById('loadMoreContainer');
    if (!container) return;
    if (currentView !== 'month') {
        container.innerHTML = '';
        return;
    }
    const hasMore = currentPage * itemsPerPage < totalFilteredForMonth;
    if (hasMore) {
        container.innerHTML = `<button onclick="loadMore()" class="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-100 transition">Load More (${totalFilteredForMonth - currentPage * itemsPerPage} remaining)</button>`;
    } else {
        container.innerHTML = '';
    }
}

window.loadMore = function() {
    if (currentView !== 'month') return;
    currentPage++;
    applyFiltersAndPaginate();
};

function resetPagination() {
    currentPage = 1;
    if (currentView === 'month') {
        applyFiltersAndPaginate();
    }
}

function matchesCurrentFilters(repair) {
    const filterVal = document.getElementById('statusFilter')?.value || "all";
    const cost = Number(repair.cost) || 0;
    const paid = Number(repair.paid) || 0;
    const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
    const isUnpaid = (cost > 0 && paid < cost);
    let matchesTab = false;
    if (currentTab === 'all') matchesTab = true;
    else if (currentTab === 'pending') matchesTab = (repair.status !== 'completed' && repair.status !== 'returned');
    else if (currentTab === 'fixed') matchesTab = (repair.status === 'completed');
    else if (currentTab === 'returned') matchesTab = (repair.status === 'returned');
    else matchesTab = true;
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
        if (currentView === 'day') {
            if (window.NepaliDate) {
                const nepDate = new NepaliDate(currentDate);
                label.textContent = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
            } else {
                label.textContent = currentDate.toLocaleDateString();
            }
        } else {
            const monthNamesBS = ['Baisakh','Jestha','Ashad','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
            let monthIndex = Number(currentNepaliMonth) - 1;
            if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) monthIndex = 0;
            const year = Number(currentNepaliYear) || 2080;
            label.textContent = `${monthNamesBS[monthIndex]} ${year}`;
        }
    } catch (e) {
        label.textContent = currentView === 'day' ? currentDate.toLocaleDateString() : `${currentNepaliYear || '?'}/${currentNepaliMonth || '?'}`;
    }
}

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-tab'));
    const active = document.getElementById(`card-${tab}`);
    if (active) active.classList.add('active-tab');
    if (currentView === 'day') {
        window.filterTable();
    } else {
        resetPagination();
    }
}
window.setTab = setTab;

function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
        if (currentView === 'day') {
            window.filterTable();
        } else {
            resetPagination();
        }
    }
}

window.prevPeriod = function () {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() - 1);
        clearSearchInput();
        loadData();
    } else {
        if (currentNepaliMonth === 1) {
            currentNepaliMonth = 12;
            currentNepaliYear--;
        } else {
            currentNepaliMonth--;
        }
        clearSearchInput();
        loadData();
    }
};

window.nextPeriod = function () {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
        clearSearchInput();
        loadData();
    } else {
        if (currentNepaliMonth === 12) {
            currentNepaliMonth = 1;
            currentNepaliYear++;
        } else {
            currentNepaliMonth++;
        }
        clearSearchInput();
        loadData();
    }
};

window.goToday = function () {
    const today = new Date();
    currentDate = today;
    const { year, month } = adToBsYearMonth(today);
    currentNepaliYear = year;
    currentNepaliMonth = month;
    clearSearchInput();
    loadData();
};

window.toggleViewMode = function () {
    if (currentView === 'day') {
        currentView = 'month';
        const { year, month } = adToBsYearMonth(currentDate);
        currentNepaliYear = year;
        currentNepaliMonth = month;
        loadData();
    } else {
        currentView = 'day';
        loadData();
    }
    const icon = document.getElementById('viewToggleIcon');
    if (icon) icon.classList.toggle('rotate-180');
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
    if (currentView === 'day') {
        currentDate = d;
    } else {
        const { year, month } = adToBsYearMonth(d);
        currentNepaliYear = year;
        currentNepaliMonth = month;
    }
    clearSearchInput();
    loadData();
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
    const currentStatus = repair.status || 'pending';
    let nextStatus;
    if (currentStatus === 'pending') nextStatus = 'completed';
    else if (currentStatus === 'completed') nextStatus = 'returned';
    else if (currentStatus === 'returned') nextStatus = 'pending';
    else nextStatus = 'pending';
    try {
        await updateDoc(doc(db, "repairs", id), { status: nextStatus });
        await algoliaIndex.partialUpdateObject({ objectID: id, status: nextStatus });
        showToast(`Status changed to ${nextStatus}`);
        const updatedRepair = { ...repair, status: nextStatus };
        updateSearchResultLocally(updatedRepair);
        if (currentView === 'month') {
            const index = fullMonthRepairs.findIndex(r => r.id === id);
            if (index !== -1) fullMonthRepairs[index] = updatedRepair;
            applyFiltersAndPaginate();
        } else {
            window.filterTable();
        }
        updateStats();
    } catch (err) {
        console.error(err);
        alert("Failed to update status");
    }
};

window.markAsReturned = async function (id) {
    const repair = repairs.find(r => r.id === id) || displayedRepairs.find(r => r.id === id);
    if (!repair) {
        showToast("Repair not found", true);
        return;
    }
    if (repair.status === 'returned') {
        showToast("Already marked as returned");
        return;
    }
    try {
        await updateDoc(doc(db, "repairs", id), { status: 'returned' });
        await algoliaIndex.partialUpdateObject({ objectID: id, status: 'returned' });
        showToast(`Marked as returned`);
        const updatedRepair = { ...repair, status: 'returned' };
        updateSearchResultLocally(updatedRepair);
        if (currentView === 'month') {
            const index = fullMonthRepairs.findIndex(r => r.id === id);
            if (index !== -1) fullMonthRepairs[index] = updatedRepair;
            applyFiltersAndPaginate();
        } else {
            window.filterTable();
        }
        updateStats();
    } catch (err) {
        console.error(err);
        alert("Failed to mark as returned");
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
        if (currentView === 'month') {
            fullMonthRepairs = fullMonthRepairs.filter(r => r.id !== id);
            applyFiltersAndPaginate();
        } else {
            repairs = repairs.filter(r => r.id !== id);
            window.filterTable();
        }
        updateStats();
    } catch (err) {
        console.error(err);
        alert("Delete failed");
    }
};

window.filterTable = function() {
    if (currentView !== 'day') return;
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
            let matchesTab = false;
            if (currentTab === 'all') matchesTab = true;
            else if (currentTab === 'pending') matchesTab = (r.status !== 'completed' && r.status !== 'returned');
            else if (currentTab === 'fixed') matchesTab = (r.status === 'completed');
            else if (currentTab === 'returned') matchesTab = (r.status === 'returned');
            else matchesTab = true;
            let matchesFilter = true;
            if (filterVal === 'paid') matchesFilter = isPaid;
            else if (filterVal === 'unpaid') matchesFilter = isUnpaid;
            else if (filterVal !== 'all') matchesFilter = r.status === filterVal;
            return matchesTab && matchesFilter;
        });
        // Sort descending by SN
        data = sortBySNDesc(data);
        displayedRepairs = data;
        renderTable(displayedRepairs);
        updateLoadMoreButton();
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
        hits = sortBySNDesc(hits); // sort search results descending by SN
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
        if (currentView === 'day') {
            performSearch(query);
        } else {
            currentSearchQuery = query;
            resetPagination();
        }
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
        let statusColor = '';
        if (repair.status === 'completed') statusColor = 'bg-emerald-50 text-emerald-600';
        else if (repair.status === 'returned') statusColor = 'bg-blue-50 text-blue-600';
        else statusColor = 'bg-orange-50 text-orange-600';
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
                <button onclick="updateStatus('${repair.id}')" class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}">${repair.status || 'pending'}</button>
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
                ${repair.status !== 'returned' ? `<button onclick="event.stopPropagation(); markAsReturned('${repair.id}')" class="text-slate-300 hover:text-green-600" title="Mark as Returned"><i class="fas fa-undo-alt"></i></button>` : ''}
             </tr>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats() {
    let dataForStats = [];
    if (currentView === 'day') {
        dataForStats = repairs;
    } else {
        dataForStats = fullMonthRepairs;
    }
    const pending = dataForStats.filter(r => r.status === 'pending').length;
    const fixed = dataForStats.filter(r => r.status === 'completed').length;
    const returned = dataForStats.filter(r => r.status === 'returned').length;
    const revenue = dataForStats.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    const credit = dataForStats.reduce((a, c) => a + Math.max(0, (Number(c.cost) || 0) - (Number(c.paid) || 0)), 0);
    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = dataForStats.length;
    if (document.getElementById('stat-active')) document.getElementById('stat-active').textContent = pending;
    if (document.getElementById('stat-fixed-count')) document.getElementById('stat-fixed-count').textContent = fixed;
    if (document.getElementById('stat-returned-count')) document.getElementById('stat-returned-count').textContent = returned;
    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = `रू${revenue.toLocaleString()}`;
    if (document.getElementById('stat-credit')) document.getElementById('stat-credit').textContent = `रू${credit.toLocaleString()}`;

    // Re-apply censorship after updating numbers
    if (revenueCensored) {
        document.getElementById('stat-revenue')?.classList.add('blur-strong');
    } else {
        document.getElementById('stat-revenue')?.classList.remove('blur-strong');
    }
    if (dueCensored) {
        document.getElementById('stat-credit')?.classList.add('blur-strong');
    } else {
        document.getElementById('stat-credit')?.classList.remove('blur-strong');
    }
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
            if (currentView === 'day') {
                window.filterTable();
            } else {
                resetPagination();
            }
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

            const formData = {
                customer: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                device: document.getElementById('deviceModel').value,
                sn: document.getElementById('snNumber').value,
                issue: document.getElementById('issueType').value,
                cost: costVal,
                paid: paidVal,
                image: finalImageUrl,
                updatedAt: new Date().toISOString()
            };
            const passwordInput = document.getElementById('devicePassword')?.value;
            if (passwordInput && passwordInput.trim() !== "") formData.password = passwordInput;

            if (currentlyEditingId) {
                // Edit existing repair (preserve createdAt)
                const oldDocRef = doc(db, "repairs", currentlyEditingId);
                const oldSnap = await getDoc(oldDocRef);
                let updatedRepair = null;
                if (oldSnap.exists()) {
                    const oldData = oldSnap.data();
                    const repairTitle = `${oldData.customer || ''} - ${oldData.device || ''}`;
                    if (oldData.phone !== formData.phone) {
                        await logChange(currentlyEditingId, "phone", oldData.phone || "", formData.phone, repairTitle);
                        sendNotification("Phone changed", `Repair #${currentlyEditingId}: ${oldData.phone || "empty"} → ${formData.phone}`);
                    }
                    if (Number(oldData.cost || 0) !== costVal) {
                        await logChange(currentlyEditingId, "cost", oldData.cost || 0, costVal, repairTitle);
                        sendNotification("Price changed", `Repair #${currentlyEditingId}: cost ${oldData.cost || 0} → ${costVal}`);
                    }
                    if (Number(oldData.paid || 0) !== paidVal) {
                        await logChange(currentlyEditingId, "paid", oldData.paid || 0, paidVal, repairTitle);
                        sendNotification("Payment changed", `Repair #${currentlyEditingId}: paid ${oldData.paid || 0} → ${paidVal}`);
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
                    if (currentView === 'month') {
                        const idx = fullMonthRepairs.findIndex(r => r.id === currentlyEditingId);
                        if (idx !== -1) fullMonthRepairs[idx] = updatedRepair;
                        applyFiltersAndPaginate();
                    } else {
                        window.filterTable();
                    }
                    updateStats();
                }
            } else {
                // NEW ENTRY – use the currently selected date (day view date or today for month view)
                let selectedDate;
                if (currentView === 'day') {
                    selectedDate = new Date(currentDate);
                } else {
                    selectedDate = new Date();
                }
                selectedDate.setHours(12, 0, 0, 0);
                const createdAtISO = selectedDate.toISOString();
                let finalDateStr = "";
                try {
                    if (typeof window.NepaliDate === 'function') {
                        const nepDate = new NepaliDate(selectedDate);
                        finalDateStr = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
                    } else {
                        finalDateStr = selectedDate.toLocaleDateString();
                    }
                } catch (e) {
                    finalDateStr = selectedDate.toLocaleDateString();
                }
                const newEntry = {
                    ...formData,
                    status: isCompleted ? 'completed' : 'pending',
                    date: finalDateStr,
                    createdAt: createdAtISO
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