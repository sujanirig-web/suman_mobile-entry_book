// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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


// --- 2. GLOBAL STATE ---
let repairs = [];
let currentTab = 'all';
let currentImageData = null;
let currentlyEditingId = null;

// --- 3. AUTH GATEKEEPER ---
onAuthStateChanged(auth, (user) => {
    console.log("USER:", user); // 👈 ADD THIS

    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        if (user) {
            overlay.style.display = 'none';
            loadData(); 
        } else {
            overlay.style.display = 'flex';
            repairs = [];
            window.filterTable();
        }
    }
});

function loadData() {
    const repairsCol = query(
        collection(db, "repairs"),
        orderBy("createdAt", "desc"),
        limit(100) // 👈 LIMIT DATA
    );

   onSnapshot(repairsCol, (snapshot) => {
    repairs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id 
    }));

    window.filterTable();
});
}
function setTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active-tab', 'ring-2', 'ring-green-600');
    });

    const activeCard = document.getElementById(`card-${tab}`);
    if (activeCard) {
        activeCard.classList.add('active-tab', 'ring-2', 'ring-green-600');
    }

    window.filterTable();
}

// 👇 make it visible to HTML
window.setTab = setTab;


// --- 5. EXPORTING ALL FUNCTIONS TO WINDOW (Fixes "Not Defined" Errors) ---

window.toggleModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.toggle('hidden');
        if (modal.classList.contains('hidden')) {
            const form = document.getElementById('repairForm');
            if (form) form.reset();
            window.removeImage();
            currentlyEditingId = null;
            const title = document.getElementById('modalTitle');
            if (title) title.textContent = "New Repair Job";
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
    const r = repairs.find(x => x.id === id);
    if(r && r.id) {
        const flow = ['pending', 'repairing', 'completed', 'cancelled'];
        const nextStatus = flow[(flow.indexOf(r.status) + 1) % flow.length];
        await updateDoc(doc(db, "repairs", r.id), { status: nextStatus });
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
    if(confirm("Permanently delete this entry from cloud?")) {
        const repair = repairs.find(r => r.id === id);
        if (repair?.id) {
            await deleteDoc(doc(db, "repairs", repair.id));
        }
    }
};

window.filterTable = function() {
    const query = document.getElementById('searchInput')?.value.trim() || "";
    const filterVal = document.getElementById('statusFilter')?.value || "all";

    let searchResults = repairs;

    if (query) {
        const cleanedQuery = query.toLowerCase().trim();
        const tokens = cleanedQuery.split(/\s+/); // multi-word

        const fuse = new Fuse(repairs, {
            keys: [
                { name: 'customer', weight: 3 },
                { name: 'phone', weight: 2.5 },
                { name: 'sn', weight: 2 },
                { name: 'device', weight: 1.5 },
                { name: 'issue', weight: 1.2 },
                { name: 'date', weight: 0.8 }
            ],
            threshold: 0.35,
            ignoreLocation: true,
            includeScore: true
        });

        // 🔥 FUZZY SEARCH
        let fuzzy = fuse.search(cleanedQuery);

        // 🔥 TOKEN MATCH (VERY SMART)
        let exact = repairs.filter(r => {
            const combined = `
                ${r.customer || ''} 
                ${r.phone || ''} 
                ${r.sn || ''} 
                ${r.device || ''} 
                ${r.issue || ''}
            `.toLowerCase();

            return tokens.every(t => combined.includes(t));
        });

        // 🔥 PHONE PRIORITY BOOST
        let phoneBoost = repairs.filter(r =>
            r.phone && cleanedQuery.length >= 4 && r.phone.includes(cleanedQuery)
        );

        // 🔥 SORT FUZZY
        fuzzy.sort((a, b) => a.score - b.score);
        fuzzy = fuzzy.map(r => r.item);

        // 🔥 MERGE (PRIORITY ORDER)
        searchResults = [
            ...phoneBoost,
            ...exact,
            ...fuzzy
        ];

        // 🔥 REMOVE DUPLICATES
        searchResults = Array.from(
            new Map(searchResults.map(i => [i.id, i])).values()
        );
    }

    // 🔥 FILTER AFTER SEARCH
    let data = searchResults.filter(r => {
        const matchesTab = (currentTab === 'all') || 
            (currentTab === 'pending' && r.status !== 'completed') || 
            (currentTab === 'fixed' && r.status === 'completed');

        const matchesStatus = (filterVal === 'all') || (r.status === filterVal);

        return matchesTab && matchesStatus;
    });

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
    const repairForm = document.getElementById('repairForm');
    if (repairForm) {
        repairForm.onsubmit = async function(e) {
            e.preventDefault();
            showToast("Syncing...");

            let finalImageUrl = currentImageData;
            console.log("Current User:", auth.currentUser);
            try {
                // ImgBB Upload
                if (currentImageData && currentImageData.startsWith('data:image')) {
                    const imgFormData = new FormData();
                    imgFormData.append("image", currentImageData.split(',')[1]);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=50e3528b32a0303dab2a1de6244e6198`, { method: "POST", body: imgFormData });
                    const result = await res.json();
                    if (result.success) finalImageUrl = result.data.url;
                }
        const passwordInput = document.getElementById('devicePassword').value;        

                const formData = {
                    customer: document.getElementById('customerName').value,
                    phone: document.getElementById('customerPhone').value,
                    device: document.getElementById('deviceModel').value,
                    sn: document.getElementById('snNumber').value,
                    issue: document.getElementById('issueType').value,
                  

                    cost: Number(document.getElementById('cost').value) || 0,
                    paid: Number(document.getElementById('paid').value) || 0,
                    image: finalImageUrl,
                    updatedAt: new Date().toISOString()
                };
                // 👇 only attach password if user typed something
if (passwordInput.trim() !== "") {
    formData.password = passwordInput;
}

if (currentlyEditingId) {
    const r = repairs.find(x => x.id === currentlyEditingId);

    const newPaid = formData.paid;
    const newCost = formData.cost;

    // ✅ only completed if cost > 0 AND fully paid
    const isCompleted = newCost > 0 && newPaid >= newCost;

    await updateDoc(doc(db, "repairs", r.id), {
        ...formData,
        status: isCompleted ? 'completed' : 'pending' // 👈 force correct state
    });


                } else {
    const now = new Date();

    let finalDate = now.toLocaleDateString();

    try {
        if (window.NepaliDate) {
            const nepDate = new NepaliDate(now);
            finalDate = nepDate.format
                ? nepDate.format('YYYY/MM/DD')
                : nepDate.toString();
        }
    } catch (e) {
        console.log("Nepali conversion failed:", e);
    }

   const isCompleted = formData.cost > 0 && formData.paid >= formData.cost;
const newEntry = {
    ...formData,
    status: isCompleted ? 'completed' : 'pending',
    date: finalDate,
    createdAt: new Date()
};
    await addDoc(collection(db, "repairs"), newEntry);
}
                window.toggleModal('entryModal');
            } catch (err) { alert("Error: " + err.message); }
        };
    }
};