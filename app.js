// --- 1. FIREBASE IMPORTS ---
import algoliasearch from 'https://cdn.jsdelivr.net/npm/algoliasearch@4.22.1/dist/algoliasearch.esm.browser.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// --- 2. GLOBAL STATE ---
let displayedRepairs = [];
let repairs = [];
let currentTab = 'all';
let currentDate = new Date();
let currentImageData = null;
let currentlyEditingId = null;
let unsubscribe = null;

// --- 3. AUTH GATEKEEPER ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        if (user) {
            overlay.style.display = 'none';
            loadDataByDay();
        } else {
            overlay.style.display = 'flex';
            repairs = [];
            if (typeof window.filterTable === 'function') window.filterTable();
        }
    }
});

// --- 4. HELPER: GET DAY RANGE ---
function getDayRange(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// --- 5. LOAD DATA FOR CURRENT DAY (REAL‑TIME) ---
function loadDataByDay() {
    if (unsubscribe) unsubscribe();

    const q = query(collection(db, "repairs"), orderBy("createdAt", "desc"));
    unsubscribe = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const { start, end } = getDayRange(currentDate);

        repairs = allData.filter(r => {
            if (!r.createdAt) return true;
            let d;
            if (typeof r.createdAt === "string") d = new Date(r.createdAt);
            else if (r.createdAt.seconds) d = new Date(r.createdAt.seconds * 1000);
            else return true;
            if (isNaN(d)) return true;
            return d >= start && d <= end;
        });

        updateDateLabel();
        window.filterTable();
    });
}

// --- 6. UPDATE DATE LABEL (NEPALI / ENGLISH) ---
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

// --- 7. TAB SWITCHING ---
function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-tab'));
    const active = document.getElementById(`card-${tab}`);
    if (active) active.classList.add('active-tab');
    window.filterTable();
}
window.setTab = setTab;

// --- 8. DATE NAVIGATION (with search reset) ---
function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
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

// --- 9. MODAL HANDLING ---
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

// --- 10. IMAGE UPLOAD & PREVIEW ---
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

// --- 11. JUMP TO DATE OF A REPAIR ---
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

// --- 12. UPDATE STATUS (CYCLE pending → repairing → completed → cancelled) ---
window.updateStatus = async function (id) {
    // Find the repair in current data to know its current status
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
    } catch (err) {
        console.error(err);
        alert("Failed to update status");
    }
};

// --- 13. EDIT REPAIR (with auto‑jump to correct day) ---
window.editRepair = function (id) {
    const repair = displayedRepairs.find(x => x.id === id || x.objectID === id);
    if (!repair) return;

    // Auto‑jump if the repair belongs to a different day
    if (repair.createdAt) {
        let d;
        if (typeof repair.createdAt === "string") d = new Date(repair.createdAt);
        else if (repair.createdAt.seconds) d = new Date(repair.createdAt.seconds * 1000);
        if (d && !isNaN(d) && d.toDateString() !== currentDate.toDateString()) {
            currentDate = d;
            clearSearchInput();
            loadDataByDay();
            // Re‑trigger edit after data reloads
            setTimeout(() => window.editRepair(id), 500);
            return;
        }
    }

    // Populate form
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

// --- 14. DELETE REPAIR ---
window.deleteRepair = async function (id) {
    if (!confirm("Delete this entry?")) return;
    try {
        await deleteDoc(doc(db, "repairs", id));
        await algoliaIndex.deleteObject(id);
        showToast("Deleted successfully");
    } catch (err) {
        console.error(err);
        alert("Delete failed");
    }
};

// --- 15. FILTER & SEARCH (Algolia + local) ---
window.filterTable = async function () {
    const rawQuery = document.getElementById('searchInput')?.value.trim() || "";
    const isSearching = rawQuery.length >= 2;
    const filterVal = document.getElementById('statusFilter')?.value || "all";

    let searchResults = [...repairs];

    if (isSearching) {
        try {
            const res = await algoliaIndex.search(rawQuery, { hitsPerPage: 200 });
            searchResults = res.hits.map(hit => ({ ...hit, id: hit.objectID }));
        } catch (err) {
            console.log("Algolia search error:", err);
        }
    }

    let data = searchResults.filter(r => {
        const cost = Number(r.cost) || 0;
        const paid = Number(r.paid) || 0;
        const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
        const isUnpaid = (cost > 0 && paid < cost);

        const matchesTab = isSearching ? true : (
            currentTab === 'all' ||
            (currentTab === 'pending' && r.status !== 'completed') ||
            (currentTab === 'fixed' && r.status === 'completed')
        );

        let matchesFilter = true;
        if (filterVal === 'paid') matchesFilter = isPaid;
        else if (filterVal === 'unpaid') matchesFilter = isUnpaid;
        else if (filterVal !== 'all') matchesFilter = r.status === filterVal;

        return matchesTab && matchesFilter;
    });

    // Lock date navigation during search
    const dateNav = document.getElementById('dateLabel')?.parentElement;
    if (dateNav) {
        dateNav.style.opacity = isSearching ? "0.4" : "1";
        dateNav.style.pointerEvents = isSearching ? "none" : "auto";
    }

    displayedRepairs = data;
    renderTable(data);
};

// --- 16. RENDER TABLE ---
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

// --- 17. UPDATE STATS CARDS ---
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

// --- 18. TOAST NOTIFICATION ---
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
    }
}

// --- 19. FORM SUBMIT (CREATE / UPDATE) ---
window.onload = () => {
    // Login handler
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

    // Save handler
    const form = document.getElementById('repairForm');
    if (!form) return;

    form.onsubmit = async function (e) {
        e.preventDefault();
        showToast("Saving...");

        let finalImageUrl = currentImageData;
        try {
            // Upload image to ImgBB if it's a new base64 image
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

            // Auto-fix: if cost is 0 but paid > 0, set cost = paid (prevents negative due)
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
                // UPDATE EXISTING
                const updatedData = { ...formData, status: isCompleted ? 'completed' : 'pending' };
                await updateDoc(doc(db, "repairs", currentlyEditingId), updatedData);
                await algoliaIndex.partialUpdateObject({ objectID: currentlyEditingId, ...updatedData });
                showToast("Updated successfully");
            } else {
                // CREATE NEW
                const now = new Date();
                let finalDate = now.toLocaleDateString();
                try {
                    if (typeof window.NepaliDate === 'function') {
                        const nepDate = new NepaliDate(now);
                        finalDate = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
                    }
                } catch (e) { /* fallback to English date */ }

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

            // Reset and close modal
            window.toggleModal('entryModal');
            currentlyEditingId = null;
            currentImageData = null;
        } catch (err) {
            console.error("Save Error:", err);
            alert("Error: " + err.message);
        }
    };
};

// --- 20. SYNC ALL TO ALGOLIA (UTILITY, NOT USED AUTOMATICALLY) ---
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