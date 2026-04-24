// --- 1. FIREBASE IMPORTS ---
// Change 'algoliasearch-lite' to 'algoliasearch'
import algoliasearch from 'https://cdn.jsdelivr.net/npm/algoliasearch@4.22.1/dist/algoliasearch.esm.browser.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
    "a794f93efc346a4a17d20fcebff54ad6" // temporary (fine for now)
);

const algoliaIndex = algoliaClient.initIndex("repairs");


// --- 2. GLOBAL STATE ---
let repairs = [];
let currentTab = 'all';
let currentDate = new Date();
let currentImageData = null;
let currentlyEditingId = null;

// --- 3. AUTH GATEKEEPER ---
onAuthStateChanged(auth, (user) => {
    console.log("USER:", user); // 👈 ADD THIS

    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        if (user) {
            overlay.style.display = 'none';
            loadDataByDay(); 
        } else {
            overlay.style.display = 'flex';
            repairs = [];
            window.filterTable();
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
let unsubscribe = null;

function loadDataByDay() {
    if (unsubscribe) unsubscribe();

    const q = query(
        collection(db, "repairs"),
        orderBy("createdAt", "desc")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        const { start, end } = getDayRange(currentDate);

        repairs = allData.filter(r => {
            if (!r.createdAt) return true; // 👈 show old/broken entries

            let d;

            // ✅ handle string
            if (typeof r.createdAt === "string") {
                d = new Date(r.createdAt);
            }
            // ✅ handle Firestore timestamp
            else if (r.createdAt.seconds) {
                d = new Date(r.createdAt.seconds * 1000);
            }
            else {
                return true; // 👈 fallback: show it
            }

            // ❌ invalid date → still show it
            if (isNaN(d)) return true;

            return d >= start && d <= end;
        });

        console.log("FILTERED:", repairs);

        updateDateLabel();
        window.filterTable();
    });
}

// Label update
function updateDateLabel() {
    const label = document.getElementById('dateLabel');

    if (!label) return;

    try {
        if (window.NepaliDate) {
            const nepDate = new NepaliDate(currentDate);

            label.textContent = nepDate.format
                ? nepDate.format('YYYY/MM/DD')
                : nepDate.toString();
        } else {
            label.textContent = currentDate.toLocaleDateString();
        }
    } catch (e) {
        console.log("BS conversion error:", e);
        label.textContent = currentDate.toLocaleDateString();
    }
}

// 👇 make it visible to HTMl
function setTab(tab) {
    currentTab = tab;

    // update UI active card (optional but good)
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-tab'));
    const active = document.getElementById(`card-${tab}`);
    if (active) active.classList.add('active-tab');

    window.filterTable();
}
window.setTab = setTab;
window.nextDay = function () {
    currentDate.setDate(currentDate.getDate() + 1);
    loadDataByDay();
};

window.prevDay = function () {
    currentDate.setDate(currentDate.getDate() - 1);
    loadDataByDay();
};

window.goToday = function () {
    currentDate = new Date();
    loadDataByDay();
};


// --- 5. EXPORTING ALL FUNCTIONS TO WINDOW (Fixes "Not Defined" Errors) ---

window.toggleModal = function(id) {
    console.log("Opening Modal:", id); 
    const modal = document.getElementById(id);
    if (!modal) {
        console.error("Could not find modal with ID:", id);
        return;
    }

    const isOpening = modal.classList.contains('hidden');
    
    if (isOpening) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Add this to ensure centering works
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto';

        // Reset form only when closing the entry modal
        if (id === 'entryModal') {
            const form = document.getElementById('repairForm');
            if (form) form.reset();
            window.removeImage();
            currentlyEditingId = null;
            document.getElementById('modalTitle').textContent = "New Repair Job";
        }
    }
};

window.handleImageUpload = function(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageData = e.target.result;
            const previewImg = document.getElementById('previewImg');
            const previewDiv = document.getElementById('imagePreview');
            if (previewImg) previewImg.src = currentImageData;
            if (previewDiv) previewDiv.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
};

window.removeImage = function() {
    currentImageData = null;
    const previewDiv = document.getElementById('imagePreview');
    if (previewDiv) previewDiv.classList.add('hidden');
    const gallery = document.getElementById('photoGallery');
    const camera = document.getElementById('photoCamera');
    if (gallery) gallery.value = '';
    if (camera) camera.value = '';
};

window.viewImage = function(src) {
    const modal = document.getElementById('viewImageModal');
    const fullImg = document.getElementById('fullSizeImage');
    if (fullImg) fullImg.src = src;
    if (modal) modal.classList.remove('hidden');
};

window.updateStatus = async function(id) {
    // Find repair in local state OR the ID passed directly
    const r = repairs.find(x => x.id === id);
    const docId = r ? (r.id || r.objectID) : id;
    
    if(docId) {
        const flow = ['pending', 'repairing', 'completed', 'cancelled'];
        // Use a fallback status if r isn't found in current local day view
        const currentStatus = r ? r.status : 'pending';
        const nextStatus = flow[(flow.indexOf(currentStatus) + 1) % flow.length];
        
        await updateDoc(doc(db, "repairs", docId), { status: nextStatus });
        
        // 🔥 CRITICAL: Update Algolia too so search stays in sync
        await algoliaIndex.partialUpdateObject({
            objectID: docId,
            status: nextStatus
        });
    }
};


window.editRepair = function(id) {
    const r = repairs.find(x => x.id === id);
    if (!r) return;
    currentlyEditingId = id;
    document.getElementById('modalTitle').textContent = "Edit Repair #" + id;
    document.getElementById('customerName').value = r.customer;
    document.getElementById('customerPhone').value = r.phone || '';
    document.getElementById('deviceModel').value = r.device;
    document.getElementById('snNumber').value = r.sn || '';
    document.getElementById('issueType').value = r.issue;
    document.getElementById('cost').value = r.cost;
    document.getElementById('paid').value = r.paid;
    if (r.image) {
        currentImageData = r.image || null;
        const previewImg = document.getElementById('previewImg');
        const previewDiv = document.getElementById('imagePreview');
        
        if (previewImg) previewImg.src = r.image;
        if (previewDiv) previewDiv.classList.remove('hidden');
    }
    window.toggleModal('entryModal');
};

window.deleteRepair = async function(id) {
    if(confirm("Permanently delete this entry?")) {
        const r = repairs.find(x => x.id === id || x.objectID === id);
        const docId = r?.objectID || r?.id || id;

        if (docId) {
            await deleteDoc(doc(db, "repairs", docId));
            await algoliaIndex.deleteObject(docId);
        }
    }
};

window.filterTable = async function () {
    const rawQuery = document.getElementById('searchInput')?.value.trim() || "";
    const queryText = rawQuery.toLowerCase();
    const isSearching = rawQuery.length >= 2;
    const filterVal = document.getElementById('statusFilter')?.value || "all";

    let searchResults = [...repairs];

    // =========================
    // 🔥 ALGOLIA SEARCH
    // =========================
    if (isSearching) {
        try {
            const res = await algoliaIndex.search(rawQuery, {
                hitsPerPage: 200
            });

            searchResults = res.hits.map(hit => ({
                ...hit,
                id: hit.objectID
            }));

        } catch (err) {
            console.log("Algolia search error:", err);
        }
    }

    // =========================
    // 🔥 APPLY FILTERS
    // =========================
    let data = searchResults.filter(r => {
    const cost = Number(r.cost) || 0;
    const paid = Number(r.paid) || 0;

    const isPaid =
        (cost > 0 && paid >= cost) ||   // normal case
        (cost === 0 && paid > 0);       // your special case

    const isUnpaid =
        (cost > 0 && paid < cost);

    const matchesTab =
        isSearching ? true : (
            currentTab === 'all' ||
            (currentTab === 'pending' && r.status !== 'completed') ||
            (currentTab === 'fixed' && r.status === 'completed')
        );

    let matchesFilter = true;

    if (filterVal === 'paid') {
        matchesFilter = isPaid;
    } 
    else if (filterVal === 'unpaid') {
        matchesFilter = isUnpaid;
    } 
    else if (filterVal !== 'all') {
        matchesFilter = r.status === filterVal;
    }

    return matchesTab && matchesFilter;
});

    // =========================
    // 🔥 UI LOCK
    // =========================
    const dateNav = document.getElementById('dateLabel')?.parentElement;

    if (dateNav) {
        dateNav.style.opacity = isSearching ? "0.4" : "1";
        dateNav.style.pointerEvents = isSearching ? "none" : "auto";
    }

    // =========================
    // 🔥 RENDER
    // =========================
    renderTable(data);
};

// --- 6. RENDERING LOGIC ---
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
                <div class="font-bold text-slate-800 text-sm">${repair.customer}</div>
                <div class="font-bold text-green-600 text-[16px] uppercase">${repair.device}</div>
                  <div class="font-bold text-[12px] text-black-700">🔒 Pass: ${repair.password}</div>
            </td>
            <td class="px-6 py-6">
                <div class="text-xs font-bold text-slate-600">${repair.issue}</div>
                ${repair.image ? `<img src="${repair.image}" onclick="viewImage('${repair.image}')" class="mt-2 w-10 h-10 rounded-lg object-cover cursor-pointer border shadow-sm">` : ''}
             
            </td>
            <td class="px-6 py-6">
                <button onclick="updateStatus('${repair.id}')" class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${repair.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}">${repair.status}</button>
            </td>
           <td class="px-6 py-6">
    <div class="text-[11px] font-bold text-slate-700">
        Total: रू${(Number(repair.cost) || 0).toLocaleString()}
    </div>
    <div class="text-[11px] font-bold text-emerald-600">
        Paid: रू${(Number(repair.paid) || 0).toLocaleString()}
    </div>
    <div class="text-[11px] font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-500'}">
        Due: रू${due.toLocaleString()}
    </div>
</td>
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

function updateStats() {
    const pending = repairs.filter(r => r.status === 'pending' || r.status === 'repairing').length;
    const fixed = repairs.filter(r => r.status === 'completed').length;
    const revenue = repairs.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    const credit = repairs.reduce((a, c) => a + Math.max(0, (Number(c.cost) || 0) - (Number(c.paid) || 0)), 0);

    if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = repairs.length;
    if(document.getElementById('stat-active')) document.getElementById('stat-active').textContent = pending;
    if(document.getElementById('stat-fixed-count')) document.getElementById('stat-fixed-count').textContent = fixed;
    if(document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = `रू${revenue.toLocaleString()}`;
    if(document.getElementById('stat-credit')) document.getElementById('stat-credit').textContent = `रू${credit.toLocaleString()}`;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if(toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
    }
}

// --- 7. STARTUP & FORM SUBMIT ---
window.onload = () => {
    // Login Logic
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
    

    // Save Logic
repairForm.onsubmit = async function (e) {
    e.preventDefault();

    // Check if showToast exists before calling
    if (typeof showToast === 'function') {
        showToast("Syncing...");
    }

    let finalImageUrl = currentImageData;

    try {
        // --- 1. ImgBB Upload ---
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

        // --- 2. Data Collection with Safety Defaults ---
        const passwordInput = document.getElementById('devicePassword')?.value || "";
      let costVal = Number(document.getElementById('cost').value) || 0;
let paidVal = Number(document.getElementById('paid').value) || 0;

// 🔥 AUTO-FIX: if user entered paid first
if (costVal === 0 && paidVal > 0) {
    costVal = paidVal;
}

// 🔥 COMPLETION LOGIC (clean & reliable)
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

        if (passwordInput.trim() !== "") {
            formData.password = passwordInput;
        }

        // --- 3. Save Logic ---
        if (currentlyEditingId) {
            // EDIT MODE
            const r = repairs.find(x => x.id === currentlyEditingId);
            if (!r) throw new Error("Record not found");

            const updatedData = {
                ...formData,
                status: isCompleted ? 'completed' : 'pending'
            };

            await updateDoc(doc(db, "repairs", r.id), updatedData);
            await algoliaIndex.saveObject({
                objectID: r.id,
                ...updatedData
            });
        } else {
            // CREATE MODE
            const now = new Date();
            let finalDate = now.toLocaleDateString();

            // FIXED: Proper safety check for NepaliDate constructor
            try {
                if (typeof window.NepaliDate === 'function') {
                    const nepDate = new NepaliDate(now);
                    finalDate = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
                }
            } catch (e) {
                console.log("Nepali conversion skipped:", e);
            }

            const newEntry = {
                ...formData,
                status: isCompleted ? 'completed' : 'pending',
                date: finalDate,
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, "repairs"), newEntry);
            await algoliaIndex.saveObject({
                objectID: docRef.id,
                ...newEntry
            });
        }

        // --- 4. Cleanup & Modal Close ---
        // FIXED: Verify toggleModal is a function before calling
        if (typeof window.toggleModal === 'function') {
            window.toggleModal('entryModal');
        } else {
            // Manual fallback if function is missing
            const modal = document.getElementById('entryModal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }

    } catch (err) {
        console.error("Save Error:", err);
        alert("Error: " + err.message);
    }
};

window.syncAllToAlgolia = async function () {
    console.log("🔥 Syncing ALL Firebase data to Algolia...");

    const snapshot = await getDocs(collection(db, "repairs"));

    const batch = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data();

        batch.push({
            objectID: docSnap.id,
            ...data
        });
    });

    await algoliaIndex.saveObjects(batch);

    console.log("✅ Sync complete:", batch.length);
};
}