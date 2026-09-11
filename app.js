//app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, getDoc, limit, where, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const ICONS = {
    book: ["448 512", "M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z"],
    plusCircle: ["512 512", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"],
    times: ["384 512", "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"],
    layerGroup: ["576 512", "M264.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 149.8C37.4 145.8 32 137.3 32 128s5.4-17.9 13.9-21.8L264.5 5.2zM476.9 209.6l53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 277.8C37.4 273.8 32 265.3 32 256s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0l152-70.2zm-152 198.2l152-70.2 53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 405.8C37.4 401.8 32 393.3 32 384s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0z"],
    clock: ["512 512", "M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"],
    circleCheck: ["512 512", "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"],
    undoAlt: ["512 512", "M125.7 160H176c17.7 0 32 14.3 32 32s-14.3 32-32 32H48c-17.7 0-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v51.2L97.6 97.6c87.5-87.5 229.3-87.5 316.8 0s87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L125.7 160z"],
    edit: ["512 512", "M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"],
    trash: ["448 512", "M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"],
    images: ["576 512", "M160 32c-35.3 0-64 28.7-64 64V320c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H160zM396 138.7l96 144c4.9 7.4 5.4 16.8 1.2 24.6S480.9 320 472 320H328 280 200c-9.2 0-17.6-5.3-21.6-13.6s-2.9-18.2 2.9-25.4l64-80c4.6-5.7 11.4-9 18.7-9s14.2 3.3 18.7 9l17.3 21.6 56-84C360.5 132 368 128 376 128s15.5 4 20 10.7zM192 128a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM48 120c0-13.3-10.7-24-24-24S0 106.7 0 120V344c0 75.1 60.9 136 136 136H456c13.3 0 24-10.7 24-24s-10.7-24-24-24H136c-48.6 0-88-39.4-88-88V120z"],
    camera: ["512 512", "M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"],
    handHoldingDollar: ["576 512", "M312 24V34.5c6.4 1.2 12.6 2.7 18.2 4.2c12.8 3.4 20.4 16.6 17 29.4s-16.6 20.4-29.4 17c-10.9-2.9-21.1-4.9-30.2-5c-7.3-.1-14.7 1.7-19.4 4.4c-2.1 1.3-3.1 2.4-3.5 3c-.3 .5-.7 1.2-.7 2.8c0 .3 0 .5 0 .6c.2 .2 .9 1.2 3.3 2.6c5.8 3.5 14.4 6.2 27.4 10.1l.9 .3 0 0c11.1 3.3 25.9 7.8 37.9 15.3c13.7 8.6 26.1 22.9 26.4 44.9c.3 22.5-11.4 38.9-26.7 48.5c-6.7 4.1-13.9 7-21.3 8.8V232c0 13.3-10.7 24-24 24s-24-10.7-24-24V220.6c-9.5-2.3-18.2-5.3-25.6-7.8c-2.1-.7-4.1-1.4-6-2c-12.6-4.2-19.4-17.8-15.2-30.4s17.8-19.4 30.4-15.2c2.6 .9 5 1.7 7.3 2.5c13.6 4.6 23.4 7.9 33.9 8.3c8 .3 15.1-1.6 19.2-4.1c1.9-1.2 2.8-2.2 3.2-2.9c.4-.6 .9-1.8 .8-4.1l0-.2c0-1 0-2.1-4-4.6c-5.7-3.6-14.3-6.4-27.1-10.3l-1.9-.6c-10.8-3.2-25-7.5-36.4-14.4c-13.5-8.1-26.5-22-26.6-44.1c-.1-22.9 12.9-38.6 27.7-47.4c6.4-3.8 13.3-6.4 20.2-8.2V24c0-13.3 10.7-24 24-24s24 10.7 24 24zM568.2 336.3c13.1 17.8 9.3 42.8-8.5 55.9L433.1 485.5c-23.4 17.2-51.6 26.5-80.7 26.5H192 32c-17.7 0-32-14.3-32-32V416c0-17.7 14.3-32 32-32H68.8l44.9-36c22.7-18.2 50.9-28 80-28H272h16 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H288 272c-8.8 0-16 7.2-16 16s7.2 16 16 16H392.6l119.7-88.2c17.8-13.1 42.8-9.3 55.9 8.5zM193.6 384l0 0-.9 0c.3 0 .6 0 .9 0z"],
    history: ["512 512", "M75 75L41 41C25.9 25.9 0 36.6 0 57.9V168c0 13.3 10.7 24 24 24H134.1c21.4 0 32.1-25.9 17-41l-30.8-30.8C155 85.5 203 64 256 64c106 0 192 86 192 192s-86 192-192 192c-40.8 0-78.6-12.7-109.7-34.4c-14.5-10.1-34.4-6.6-44.6 7.9s-6.6 34.4 7.9 44.6C151.2 495 201.7 512 256 512c141.4 0 256-114.6 256-256S397.4 0 256 0C185.3 0 121.3 28.7 75 75zm181 53c-13.3 0-24 10.7-24 24V256c0 6.4 2.5 12.5 7 17l72 72c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-65-65V152c0-13.3-10.7-24-24-24z"],
    chevronDown: ["512 512", "M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"]
};

function icon(name, cls = "") {
    const [vb, d] = ICONS[name];
    return `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 ${vb}" width="1em" height="1em" fill="currentColor" aria-hidden="true" style="vertical-align:-0.125em"><path d="${d}"/></svg>`;
}

const WORKER_URL = 'https://relife-api-proxy.sujanirig.workers.dev';

let db, auth, algoliaAppId;

let displayedRepairs = [];
let repairs = [];
let fullMonthRepairs = [];
let currentTab = 'all';
let currentDate = new Date();
let currentNepaliYear = 2082;
let currentNepaliMonth = 1;
let currentView = 'day';
let currentImageData = null;
let preImg = { tag: "", compressed: "", url: "", promise: null };
let currentlyEditingId = null;
let unsubscribe = null;
let currentSearchQuery = "";
let searchDebounceTimer = null;
let searchSeq = 0;
let searchAbortController = null;
let isLoading = false;

let currentPage = 1;
const itemsPerPage = 50;
let totalFilteredItems = 0;
let fullFilteredList = [];
let isSearchActive = false;
let searchFilteredList = [];

let preViewModeBeforeSearch = 'day';
let preNepaliYearBeforeSearch = 2082;
let preNepaliMonthBeforeSearch = 1;
let preDateBeforeSearch = new Date();

let revenueCensored = true;
let dueCensored = true;
let revenueTimer = null;
let dueTimer = null;
let globalMaxSN = 0;
let serialCounterReady = false;

function algoliaSafe(data) {
    const clone = { ...data };
    delete clone.password;
    return clone;
}

async function syncToAlgolia(objectID, data) {
    try {
        console.log(`🔄 Syncing to Algolia: ${objectID}`);
        const response = await fetch(`${WORKER_URL}/update-algolia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(algoliaSafe({ objectID, ...data }))
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Algolia sync failed for ${objectID}:`, errorText);
            return false;
        }
        console.log(`✅ Synced to Algolia: ${objectID}`);
        return true;
    } catch (error) {
        console.error(`❌ Network error syncing ${objectID}:`, error);
        return false;
    }
}

async function deleteFromAlgolia(objectID) {
    try {
        console.log(`🔄 Deleting from Algolia: ${objectID}`);
        const response = await fetch(`${WORKER_URL}/delete-algolia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objectID })
        });
        if (!response.ok) {
            console.error(`❌ Algolia delete failed for ${objectID}`);
            return false;
        }
        console.log(`✅ Deleted from Algolia: ${objectID}`);
        return true;
    } catch (error) {
        console.error(`❌ Network error deleting ${objectID}:`, error);
        return false;
    }
}

function updateSearchResultLocally(updatedRepair) {
    const updateArray = (arr) =>
        arr.map(item =>
            item.id === updatedRepair.id
                ? { ...item, ...updatedRepair }
                : item
        );

    repairs = updateArray(repairs);
    fullMonthRepairs = updateArray(fullMonthRepairs);
    fullFilteredList = updateArray(fullFilteredList);
    searchFilteredList = updateArray(searchFilteredList);
    displayedRepairs = updateArray(displayedRepairs);

    renderTable(displayedRepairs);
    updateStats();
}

function censorRevenue() {
    const revenueEl = document.getElementById('stat-revenue');
    if (revenueEl) revenueEl.classList.add('blur-strong');
    revenueCensored = true;
    if (revenueTimer) clearTimeout(revenueTimer);
}
function censorDue() {
    const dueEl = document.getElementById('stat-credit');
    if (dueEl) dueEl.classList.add('blur-strong');
    dueCensored = true;
    if (dueTimer) clearTimeout(dueTimer);
}
function uncensorRevenue() {
    const revenueEl = document.getElementById('stat-revenue');
    if (revenueEl) revenueEl.classList.remove('blur-strong');
    revenueCensored = false;
    if (revenueTimer) clearTimeout(revenueTimer);
    revenueTimer = setTimeout(() => censorRevenue(), 1000);
}
function uncensorDue() {
    const dueEl = document.getElementById('stat-credit');
    if (dueEl) dueEl.classList.remove('blur-strong');
    dueCensored = false;
    if (dueTimer) clearTimeout(dueTimer);
    dueTimer = setTimeout(() => censorDue(), 1000);
}
window.toggleRevenueCensor = function() {
    if (revenueCensored) uncensorRevenue();
    else {
        if (revenueTimer) clearTimeout(revenueTimer);
        revenueTimer = setTimeout(() => censorRevenue(), 1000);
    }
};
window.toggleDueCensor = function() {
    if (dueCensored) uncensorDue();
    else {
        if (dueTimer) clearTimeout(dueTimer);
        dueTimer = setTimeout(() => censorDue(), 1000);
    }
};

function sortBySNDesc(arr) {
    return arr.sort((a, b) => {
        const snA = a.sn || '', snB = b.sn || '';
        const numA = parseInt(snA, 10), numB = parseInt(snB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return snB.localeCompare(snA);
    });
}

function sortBySNAsc(arr) {
    return arr.sort((a, b) => {
        const snA = a.sn || '', snB = b.sn || '';
        const numA = parseInt(snA, 10), numB = parseInt(snB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return snA.localeCompare(snB);
    });
}

function adToBsYearMonth(adDate) {
    try {
        if (typeof window.NepaliDate !== 'function') return { year: 2080, month: 1 };
        const nepDate = new NepaliDate(adDate);
        let year = nepDate.getYear();
        let month = nepDate.getMonth();
        if (isNaN(year)) year = 2080;
        if (isNaN(month)) month = 1;
        if (month >= 0 && month <= 11) month += 1;
        if (month < 1) month = 1;
        if (month > 12) month = 12;
        return { year, month };
    } catch (e) {
        return { year: 2080, month: 1 };
    }
}

function getTodayBSDate() {
    const today = new Date();
    try {
        const nepDate = new NepaliDate(today);
        return nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
    } catch (e) {
        return today.toLocaleDateString();
    }
}

function getNextSerialNumber() {
    let next = globalMaxSN + 1;
    const taken = new Set();
    repairs.concat(fullMonthRepairs).forEach(r => taken.add(String(r.sn)));
    while (taken.has(String(next))) next++;
    return String(next);
}

const pendingLogs = new Map();
async function logChange(repairId, field, oldValue, newValue, repairTitle) {
    const oldStr = String(oldValue), newStr = String(newValue);
    const key = `${repairId}|${field}|${oldStr}|${newStr}`;
    const lastTime = pendingLogs.get(key);
    const now = Date.now();
    if (lastTime && (now - lastTime) < 10000) return;
    pendingLogs.set(key, now);
    const user = auth.currentUser;
    const userEmail = user ? user.email : "unknown";
    try {
        await addDoc(collection(db, "logs"), {
            repairId, field, oldValue: oldStr, newValue: newStr,
            changedBy: userEmail, timestamp: new Date().toISOString(), repairTitle
        });
    } catch (err) {
        console.error("Failed to write log:", err);
        pendingLogs.delete(key);
    }
    setTimeout(() => pendingLogs.delete(key), 10000);
}


async function loadConfig() {
    const res = await fetch(`${WORKER_URL}/config`);
    if (!res.ok) throw new Error("Failed to load configuration");
    const config = await res.json();

    const firebaseConfig = {
        apiKey: config.firebaseApiKey,
        authDomain: config.firebaseAuthDomain,
        projectId: config.firebaseProjectId,
        storageBucket: "relife-entry-book.firebasestorage.app",
        messagingSenderId: "736685646269",
        appId: "1:736685646269:web:387441b954cd4f123f72d4"
    };
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth();
    algoliaAppId = config.algoliaAppId;

    onAuthStateChanged(auth, (user) => {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            if (user) {
                overlay.style.display = 'none';
                const { year, month } = adToBsYearMonth(new Date());
                currentNepaliYear = Number(year);
                currentNepaliMonth = Number(month);
                currentPage = 1;
                ensureSerialCounter().finally(() => loadData());
            } else {
                overlay.style.display = 'flex';
                if (unsubscribe) { unsubscribe(); unsubscribe = null; }
                repairs = [];
                displayedRepairs = [];
                fullMonthRepairs = [];
                fullFilteredList = [];
                searchFilteredList = [];
                isSearchActive = false;
                currentPage = 1;
                applyFiltersAndRender();
            }
        }
    });
}

function getDayRange(date) {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);
    return { start, end };
}

function isoDayBounds(date) {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
}

function bsMonthBounds(year, month) {
    try {
        if (typeof window.NepaliDate !== 'function') return null;
        const startAD = new NepaliDate(Number(year), Number(month) - 1, 1).getAD();
        let ny = Number(year), nm = Number(month) + 1;
        if (nm > 12) { nm = 1; ny++; }
        const endAD = new NepaliDate(ny, nm - 1, 1).getAD();
        if (!startAD || !endAD || isNaN(startAD.getTime()) || isNaN(endAD.getTime())) return null;
        return { start: startAD.toISOString(), end: endAD.toISOString() };
    } catch (e) {
        return null;
    }
}


async function refreshGlobalMaxSN() {
    if (!db) return;
    const prevMax = globalMaxSN;
    try {
        const snap = await getDoc(doc(db, "counters", "serial"));
        if (snap.exists()) {
            globalMaxSN = Math.max(globalMaxSN, Number(snap.data().max) || 0);
        }
    } catch (e) {
        console.warn("Serial counter read failed:", e);
    }
    try {
        const recent = await getDocs(query(collection(db, "repairs"), orderBy("createdAt", "desc"), limit(200)));
        let mx = 0;
        recent.forEach(d => {
            const n = parseInt(d.data().sn, 10);
            if (!isNaN(n) && n > mx) mx = n;
        });
        if (mx > globalMaxSN) globalMaxSN = mx;
        serialCounterReady = true;
        if (globalMaxSN !== prevMax) {
            setDoc(doc(db, "counters", "serial"), { max: globalMaxSN }).catch(() => {});
        }
    } catch (e) {
        console.warn("Previous-day SN check failed – using known max:", e);
    }
}

async function ensureSerialCounter() {
    if (serialCounterReady || !db) return;
    await refreshGlobalMaxSN();
}

async function isSnTaken(snStr) {
    try {
        const snap = await getDocs(query(collection(db, "repairs"), where("sn", "==", String(snStr)), limit(1)));
        return !snap.empty;
    } catch (e) {
        return false;
    }
}

window.fixLegacyDates = async function () {
    if (!confirm("Scan all records and normalize old date formats?\nThis fixes entries created by older versions so date filtering stays accurate. Run once.")) return;
    showToast("Scanning records...");
    try {
        const snap = await getDocs(collection(db, "repairs"));
        let fixed = 0;
        const ops = [];
        snap.forEach(d => {
            const v = d.data().createdAt;
            let iso = null;
            if (typeof v === "string") {
                if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) {
                    const p = new Date(v);
                    if (!isNaN(p.getTime())) iso = p.toISOString();
                }
            } else if (v && typeof v.seconds === "number") {
                iso = new Date(v.seconds * 1000).toISOString();
            }
            if (iso) { ops.push(updateDoc(d.ref, { createdAt: iso })); fixed++; }
        });
        if (ops.length) await Promise.all(ops);
        showToast(`Checked ${snap.size} records – normalized ${fixed}`);
        if (fixed > 0 && auth.currentUser) loadData();
    } catch (err) {
        console.error("fixLegacyDates failed:", err);
        showToast("Fix failed – see console", true);
    }
};


function loadData() {
    if (unsubscribe) unsubscribe();
    let bounds = null;
    if (currentView === 'day') bounds = isoDayBounds(currentDate);
    else if (currentView === 'month') bounds = bsMonthBounds(currentNepaliYear, currentNepaliMonth);
    const q = bounds
        ? query(collection(db, "repairs"), where("createdAt", ">=", bounds.start), where("createdAt", "<", bounds.end))
        : query(collection(db, "repairs"));
    isLoading = true;
    showLoadingSpinner(true);
    unsubscribe = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));


        let maxSN = 0;
        for (const r of allData) {
            const num = parseInt(r.sn, 10);
            if (!isNaN(num) && num > maxSN) {
                maxSN = num;
            }
        }
        globalMaxSN = Math.max(globalMaxSN, maxSN);

        if (currentView === 'day') {
            const { start, end } = getDayRange(currentDate);
            let dayRepairs = allData.filter(r => {
                let d = typeof r.createdAt === "string" ? new Date(r.createdAt) : (r.createdAt && r.createdAt.seconds) ? new Date(r.createdAt.seconds * 1000) : null;
                if (!d || isNaN(d)) return false;
                return d >= start && d <= end;
            });
            repairs = sortBySNDesc(dayRepairs);
            fullMonthRepairs = [];
        } else {
            let monthRepairs = allData.filter(r => {
                if (!r.createdAt) return false;
                let d = typeof r.createdAt === "string" ? new Date(r.createdAt) : r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000) : null;
                if (!d || isNaN(d)) return false;
                const { year, month } = adToBsYearMonth(d);
                return year === currentNepaliYear && month === currentNepaliMonth;
            });
            fullMonthRepairs = sortBySNDesc(monthRepairs);
            repairs = fullMonthRepairs;
        }

        updateDateLabel();
        const searchInput = document.getElementById('searchInput');
        const searchVal = searchInput ? searchInput.value.trim() : '';
        if (searchVal.length >= 2) {
    console.log("Skipping automatic Algolia refresh");
    renderTable(displayedRepairs);
        } else {
            isSearchActive = false;
            applyFiltersAndRender();
        }
        updateStats();
        isLoading = false;
        showLoadingSpinner(false);
    }, (err) => {
        console.error("Snapshot error:", err);
        isLoading = false;
        showLoadingSpinner(false);
        showToast("Live sync error – please reload the page", true);
    });
}

function showLoadingSpinner(show) {
    const container = document.getElementById('loadMoreContainer');
    if (container) {
        if (show) {
            container.innerHTML = '<div class="flex justify-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>';
        } else if (!isSearchActive && currentPage * itemsPerPage < totalFilteredItems) {
        } else {
            container.innerHTML = '';
        }
    }
}


function applyFiltersAndRender() {
    if (isSearchActive) return;
    let sourceData = (currentView === 'month') ? fullMonthRepairs : repairs;
    let filtered = [...sourceData];
    if (currentTab === 'pending') filtered = filtered.filter(r => r.status !== 'completed' && r.status !== 'returned');
    else if (currentTab === 'fixed') filtered = filtered.filter(r => r.status === 'completed');
    else if (currentTab === 'returned') filtered = filtered.filter(r => r.status === 'returned');
    const filterVal = document.getElementById('statusFilter')?.value || "all";
    const todayBS = getTodayBSDate();
    if (filterVal === 'today') {
        filtered = filtered.filter(r => r.date === todayBS);
    } else if (filterVal !== 'all') {
        filtered = filtered.filter(r => {
            const cost = Number(r.cost) || 0, paid = Number(r.paid) || 0;
            const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
            const isUnpaid = (cost > 0 && paid < cost);
            if (filterVal === 'paid') return isPaid;
            if (filterVal === 'unpaid') return isUnpaid;
            return r.status === filterVal;
        });
    }
    const searchInput = document.getElementById('searchInput');
    let query = searchInput ? searchInput.value.trim() : '';
    if (query.length >= 2) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(r => 
            (r.customer || '').toLowerCase().includes(lowerQuery) ||
            (r.device || '').toLowerCase().includes(lowerQuery) ||
            (r.sn || '').toLowerCase().includes(lowerQuery) ||
            (r.phone || '').toLowerCase().includes(lowerQuery) ||
            (r.issue || '').toLowerCase().includes(lowerQuery) ||
            (r.date || '').toLowerCase().includes(lowerQuery)
        );
    }
    filtered = sortBySNDesc(filtered);
    fullFilteredList = filtered;
    totalFilteredItems = fullFilteredList.length;

   
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = totalPages > 0 ? totalPages : 1;
    }
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    displayedRepairs = fullFilteredList.slice(start, start + itemsPerPage);
    renderTable(displayedRepairs);
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
    const containerTop = document.getElementById('paginationTop');
    const containerBottom = document.getElementById('paginationBottom');
    if (!containerTop || !containerBottom) return;
    const show = totalPages > 1;
    const html = show ? `
        <div class="flex items-center justify-center gap-4 mt-6 mb-6">
            <button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                ← Previous
            </button>
            <span class="text-sm text-slate-600">Page ${currentPage} of ${totalPages} (${totalFilteredItems} entries)</span>
            <button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                Next →
            </button>
        </div>
    ` : '';
    containerTop.innerHTML = html;
    containerBottom.innerHTML = html;
}

window.goToPage = function(page) {
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    if (isSearchActive) {
        const start = (currentPage - 1) * itemsPerPage;
        displayedRepairs = searchFilteredList.slice(start, start + itemsPerPage);
        renderTable(displayedRepairs);
        updatePaginationControls();
    } else {
        applyFiltersAndRender();
    }
};

function resetPagination() {
    currentPage = 1;
    if (isSearchActive) {
        const start = 0;
        displayedRepairs = searchFilteredList.slice(start, start + itemsPerPage);
        renderTable(displayedRepairs);
        updatePaginationControls();
    } else {
        applyFiltersAndRender();
    }
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
    currentPage = 1; 
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    if (query.length >= 2) performSearch(query);
    else {
        isSearchActive = false;
        resetPagination();
    }
}
window.setTab = setTab;

function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
        isSearchActive = false;
        resetPagination();
    }
}


window.prevPeriod = function () {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() - 1);
    } else {
        if (currentNepaliMonth === 1) { currentNepaliMonth = 12; currentNepaliYear--; }
        else { currentNepaliMonth--; }
    }
    currentPage = 1;
    clearSearchInput();
    loadData();
};
window.nextPeriod = function () {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
    } else {
        if (currentNepaliMonth === 12) { currentNepaliMonth = 1; currentNepaliYear++; }
        else { currentNepaliMonth++; }
    }
    currentPage = 1;
    clearSearchInput();
    loadData();
};
window.goToday = function () {
    const today = new Date();
    currentDate = today;
    const { year, month } = adToBsYearMonth(today);
    currentNepaliYear = year;
    currentNepaliMonth = month;
    currentPage = 1;
    clearSearchInput();
    loadData();
};
window.toggleViewMode = function () {
    if (currentView === 'day') {
        currentView = 'month';
        const { year, month } = adToBsYearMonth(currentDate);
        currentNepaliYear = year;
        currentNepaliMonth = month;
    } else {
        currentView = 'day';
    }
    currentPage = 1;
    clearSearchInput();
    loadData();
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
        if (id === 'entryModal' && currentlyEditingId === null) {
            const snField = document.getElementById('snNumber');
            if (snField) {
                snField.value = getNextSerialNumber();
                refreshGlobalMaxSN().then(() => {
                    const current = parseInt(snField.value, 10);
                    const suggested = parseInt(getNextSerialNumber(), 10);
                    if (!isNaN(suggested) && (isNaN(current) || suggested > current)) {
                        snField.value = String(suggested);
                    }
                }).catch(() => {});
            }
        }
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
function uploadImageBlob(blob) {
    const fd = new FormData();
    fd.append("image", blob, "repair.jpg");
    return fetch(`${WORKER_URL}/upload`, { method: "POST", body: fd })
        .then(res => res.json())
        .then(result => {
            if (result && result.success) return result.data;
            throw new Error("ImgBB upload failed");
        });
}


function preProcessImage(dataUrl) {
    preImg = { tag: "", compressed: "", url: "", promise: null };
    if (!dataUrl || !dataUrl.startsWith('data:image')) return;
    const tag = dataUrl;
    preImg.tag = tag;
    compressImage(dataUrl, 1024, 0.7).then(compressed => {
        if (currentImageData !== tag || !compressed || compressed === dataUrl) return;
        preImg.compressed = compressed;
        preImg.promise = fetch(compressed).then(r => r.blob()).then(uploadImageBlob).then(data => {
            if (currentImageData !== tag) return null;
            preImg.url = data.url || "";
            return data;
        }).catch(err => {
            console.warn("Background photo upload failed – will retry on save:", err);
            return null;
        });
    }).catch(() => {});
}

window.handleImageUpload = function (input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
        showToast("Image too large – max 20MB", true);
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        currentImageData = e.target.result;
        const previewImg = document.getElementById('previewImg');
        const previewDiv = document.getElementById('imagePreview');
        if (previewImg) previewImg.src = currentImageData;
        if (previewDiv) previewDiv.classList.remove('hidden');
        preProcessImage(currentImageData);
    };
    reader.readAsDataURL(file);
};
window.removeImage = function () {
    currentImageData = null;
    preImg = { tag: "", compressed: "", url: "", promise: null };
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
window.jumpToRepairDate = async function (repair) {
    if (!repair) return;
    if (!repair.createdAt && repair.id && db) {
        try {
            const snap = await getDoc(doc(db, "repairs", repair.id));
            if (snap.exists()) repair = { ...snap.data(), id: snap.id };
        } catch (e) { console.error("Jump lookup failed:", e); }
    }
    if (!repair.createdAt) { showToast("This record has no date info", true); return; }
    let d = typeof repair.createdAt === "string" ? new Date(repair.createdAt) : repair.createdAt.seconds ? new Date(repair.createdAt.seconds * 1000) : null;
    if (!d || isNaN(d)) return;
    if (currentView === 'day') currentDate = d;
    else { const { year, month } = adToBsYearMonth(d); currentNepaliYear = year; currentNepaliMonth = month; }
    clearSearchInput();
    loadData();
    showToast("Jumped to selected date");
};
window.jumpToRepairDateById = function (id) {
    const r = findRepairAnywhere(id);
    if (r) window.jumpToRepairDate(r);
};

function compressImage(dataUrl, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}


function smartLocalSearch(query, sourceArray) {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];
    let limit = 2000;
    if (query.length <= 3) limit = 800;
    const limitedArray = sourceArray.slice(0, limit);
    const scored = limitedArray.map(repair => {
        const fields = {
            date: (repair.date || '').toLowerCase(),
            customer: (repair.customer || '').toLowerCase(),
            device: (repair.device || '').toLowerCase(),
            sn: (repair.sn || '').toLowerCase(),
            phone: (repair.phone || '').toLowerCase(),
            issue: (repair.issue || '').toLowerCase()
        };
        let totalScore = 0;
        for (let word of words) {
            let bestFieldScore = 0;
            if (fields.date.includes(word)) {
                let score = 20;
                if (fields.date === word) score = 30;
                else if (fields.date.startsWith(word) || fields.date.endsWith(word)) score = 25;
                bestFieldScore = Math.max(bestFieldScore, score);
            }
            if (fields.customer.includes(word)) {
                let score = 15;
                if (fields.customer === word) score = 25;
                else if (fields.customer.split(/\s+/).some(part => part === word)) score = 20;
                else if (fields.customer.startsWith(word)) score = 18;
                bestFieldScore = Math.max(bestFieldScore, score);
            }
            if (fields.device.includes(word)) {
                let score = 12;
                if (fields.device === word) score = 20;
                else if (fields.device.split(/\s+/).some(part => part === word)) score = 16;
                else if (fields.device.startsWith(word)) score = 14;
                bestFieldScore = Math.max(bestFieldScore, score);
            }
            if (fields.issue.includes(word)) {
                let score = 6;
                if (fields.issue.split(/\s+/).some(part => part === word)) score = 10;
                bestFieldScore = Math.max(bestFieldScore, score);
            }
            if (fields.sn.includes(word)) {
                let score = 4;
                if (fields.sn === word) score = 12;
                else if (fields.sn.startsWith(word)) score = 8;
                bestFieldScore = Math.max(bestFieldScore, score);
            }
            if (fields.phone.includes(word)) {
                let score = 2;
                if (fields.phone === word) score = 6;
                else if (fields.phone.startsWith(word)) score = 4;
                bestFieldScore = Math.max(bestFieldScore, score);
            }
            totalScore += bestFieldScore;
        }
        return { repair, score: totalScore };
    });
    let results = scored.filter(item => item.score > 0).sort((a,b) => b.score - a.score);
    let final = results.map(item => item.repair);
    const filterVal = document.getElementById('statusFilter')?.value || "all";
    const todayBS = getTodayBSDate();
    final = final.filter(r => {
        const cost = Number(r.cost) || 0, paid = Number(r.paid) || 0;
        const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
        const isUnpaid = (cost > 0 && paid < cost);
        let matchesTab = false;
        if (currentTab === 'all') matchesTab = true;
        else if (currentTab === 'pending') matchesTab = (r.status !== 'completed' && r.status !== 'returned');
        else if (currentTab === 'fixed') matchesTab = (r.status === 'completed');
        else if (currentTab === 'returned') matchesTab = (r.status === 'returned');
        else matchesTab = true;
        let matchesFilter = true;
        if (filterVal === 'today') matchesFilter = (r.date === todayBS);
        else if (filterVal === 'paid') matchesFilter = isPaid;
        else if (filterVal === 'unpaid') matchesFilter = isUnpaid;
        else if (filterVal !== 'all') matchesFilter = r.status === filterVal;
        return matchesTab && matchesFilter;
    });
    return final;
}


async function performSearch(query) {
    const reqId = ++searchSeq;
    if (!isSearchActive) {
        preViewModeBeforeSearch = currentView;
        preNepaliYearBeforeSearch = currentNepaliYear;
        preNepaliMonthBeforeSearch = currentNepaliMonth;
        preDateBeforeSearch = new Date(currentDate);
    }
    currentSearchQuery = query;
    const isSearching = query.length >= 2;
    if (!isSearching) {
        isSearchActive = false;
        resetPagination();
        return;
    }
    isSearchActive = true;
    showLoadingSpinner(true);
    try {
        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();
        const response = await fetch(`${WORKER_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, page: 0, hitsPerPage: 200 }),
            signal: searchAbortController.signal
        });
        if (!response.ok) throw new Error(`Worker search failed: ${response.status}`);
        const res = await response.json();
        if (reqId !== searchSeq) return;
        let hits = res.hits.map(hit => ({ ...hit, id: hit.objectID || hit.id }));
        const todayBS = getTodayBSDate();
        hits = hits.filter(r => {
            const filterVal = document.getElementById('statusFilter')?.value || "all";
            const cost = Number(r.cost) || 0, paid = Number(r.paid) || 0;
            const isPaid = (cost > 0 && paid >= cost) || (cost === 0 && paid > 0);
            const isUnpaid = (cost > 0 && paid < cost);
            let matchesTab = false;
            if (currentTab === 'all') matchesTab = true;
            else if (currentTab === 'pending') matchesTab = (r.status !== 'completed' && r.status !== 'returned');
            else if (currentTab === 'fixed') matchesTab = (r.status === 'completed');
            else if (currentTab === 'returned') matchesTab = (r.status === 'returned');
            else matchesTab = true;
            let matchesFilter = true;
            if (filterVal === 'today') matchesFilter = (r.date === todayBS);
            else if (filterVal === 'paid') matchesFilter = isPaid;
            else if (filterVal === 'unpaid') matchesFilter = isUnpaid;
            else if (filterVal !== 'all') matchesFilter = r.status === filterVal;
            return matchesTab && matchesFilter;
        });
        const trimmedQuery = query.trim();
        const isNumericQuery = /^\d+$/.test(trimmedQuery);
        if (isNumericQuery && hits.length > 0) {
            const exactIndex = hits.findIndex(r => r.sn === trimmedQuery);
            if (exactIndex !== -1) {
                const exactMatch = hits[exactIndex];
                const remaining = hits.filter((_, idx) => idx !== exactIndex);
                const sortedRemaining = sortBySNDesc(remaining);
                hits = [exactMatch, ...sortedRemaining];
            } else {
                hits = sortBySNDesc(hits);
            }
        } else if (hits.length > 0) {
            hits = sortBySNDesc(hits);
        }
        if (reqId !== searchSeq) return;
        searchFilteredList = hits;
        totalFilteredItems = hits.length;

        currentPage = 1; 
        displayedRepairs = hits.slice(0, itemsPerPage);
        renderTable(displayedRepairs);
        updatePaginationControls();
        if (hits.length === 0) showToast(`No results for "${query}"`);
        else showToast(`Found ${hits.length} result${hits.length !== 1 ? 's' : ''}`);
    } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (reqId !== searchSeq) return;
        console.error("Worker search error:", err);
        const sourceData = (currentView === 'month') ? fullMonthRepairs : repairs;
        let hits = smartLocalSearch(query, sourceData);
        const trimmedQuery = query.trim();
        const isNumericQuery = /^\d+$/.test(trimmedQuery);
        if (isNumericQuery && hits.length > 0) {
            const exactIndex = hits.findIndex(r => r.sn === trimmedQuery);
            if (exactIndex !== -1) {
                const exactMatch = hits[exactIndex];
                const remaining = hits.filter((_, idx) => idx !== exactIndex);
                const sortedRemaining = sortBySNDesc(remaining);
                hits = [exactMatch, ...sortedRemaining];
            } else {
                hits = sortBySNDesc(hits);
            }
        } else if (hits.length > 0) {
            hits = sortBySNDesc(hits);
        }
        if (reqId !== searchSeq) return;
        searchFilteredList = hits;
        totalFilteredItems = hits.length;
        currentPage = 1; 
        displayedRepairs = hits.slice(0, itemsPerPage);
        renderTable(displayedRepairs);
        updatePaginationControls();
        showToast(`Search completed with ${hits.length} results (local backup)`);
    } finally {
        if (reqId === searchSeq) showLoadingSpinner(false);
    }
}

function onSearchInput() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const query = input.value.trim();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => performSearch(query), 300);
}


function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderTable(data = repairs) {
    const tbody = document.getElementById('repairTableBody');
    const noData = document.getElementById('noDataMessage');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (noData) noData.classList.toggle('hidden', data.length > 0);
    if (data.length === 0) return;
    const fragment = document.createDocumentFragment();
    data.forEach(repair => {
        const due = (Number(repair.cost) || 0) - (Number(repair.paid) || 0);
        const tr = document.createElement('tr');
        tr.className = "table-row-hover group border-b border-slate-50";
        tr.dataset.id = repair.id;
        let statusColor = repair.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : repair.status === 'returned' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600';
        tr.innerHTML = `
            <td class="px-8 py-6">
                <div class="text-[0px] font-bold text-slate-0">#${escHtml(repair.id)}</div>
                <div class="text-[13px] font-bold text-green-800 uppercase mt-1">SN: ${escHtml(repair.sn || 'NONE')}</div>
                <div
                    data-action="jump"
                    class="text-[12px] font-bold text-blue-600 uppercase mt-1 tracking-wider cursor-pointer hover:underline hover:text-blue-700 transition-colors"
                    title="Jump to this date"
                >
                    ${escHtml(repair.date || '')}
                </div>
                <div class="text-[12px] font-bold text-slate-700 uppercase mt-1 tracking-wider">${escHtml(repair.phone || '')}</div>
            </td>
            <td class="px-7 py-7">
                <div class="font-bold text-slate-800 text-sm">${escHtml(repair.customer || '')}</div>
                <div class="font-bold text-green-600 text-[16px] uppercase">${escHtml(repair.device || '')}</div>
                <div class="font-bold text-[12px] text-black-700">🔒 Pass: ${escHtml(repair.password || '')}</div>
            </td>
            <td class="px-6 py-6">
                <div class="text-xs font-bold text-slate-600">${escHtml(repair.issue || '')}</div>
                ${repair.image ? `<img src="${escHtml(repair.imageThumb || repair.image)}" data-full="${escHtml(repair.image)}" alt="" data-action="view" loading="lazy" decoding="async" width="40" height="40" class="mt-2 w-10 h-10 rounded-lg object-cover cursor-pointer border shadow-sm">` : ''}
              </td>
            <td class="px-6 py-6">
                <button type="button" data-action="status" class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}">${escHtml(repair.status || 'pending')}</button>
              </td>
            <td class="px-6 py-6">
                <div class="text-[11px] font-bold text-slate-700">Total: रू${(Number(repair.cost) || 0).toLocaleString()}</div>
                <div class="text-[11px] font-bold text-emerald-600">Paid: रू${(Number(repair.paid) || 0).toLocaleString()}</div>
                <div class="text-[11px] font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-500'}">Due: रू${due.toLocaleString()}</div>
              </td>
            <td class="px-8 py-6 text-right space-x-3">
                <button type="button" data-action="edit" class="text-slate-300 hover:text-indigo-600">${icon('edit')}</button>
                <button type="button" data-action="delete" class="text-slate-300 hover:text-red-500">${icon('trash')}</button>

                ${repair.status !== 'returned' ? `<button type="button" data-action="return" class="text-slate-300 hover:text-green-600" title="Mark as Returned">${icon('undoAlt')}</button>` : ''}
             </td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

let tableDelegateAttached = false;
function attachTableDelegate() {
    const tbody = document.getElementById('repairTableBody');
    if (!tbody || tableDelegateAttached) return;
    tableDelegateAttached = true;
    tbody.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const row = el.closest('tr');
        const id = row ? row.dataset.id : null;
        switch (el.dataset.action) {
            case 'view': window.viewImage(el.getAttribute('data-full') || el.getAttribute('src')); break;
            case 'jump': if (id) window.jumpToRepairDateById(id); break;
            case 'status': if (id) window.updateStatus(id); break;
            case 'edit': if (id) window.editRepair(id); break;
            case 'delete': if (id) window.deleteRepair(id); break;
            case 'return': if (id) window.markAsReturned(id); break;
        }
    });
}

function findRepairAnywhere(id) {
    return displayedRepairs.find(x => x.id === id || x.objectID === id)
        || repairs.find(x => x.id === id || x.objectID === id)
        || fullMonthRepairs.find(x => x.id === id || x.objectID === id)
        || searchFilteredList.find(x => x.id === id || x.objectID === id)
        || null;
}

function updateStats() {
    let dataForStats = (currentView === 'day') ? repairs : fullMonthRepairs;
    const pending = dataForStats.filter(r => r.status !== 'completed' && r.status !== 'returned').length;
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
    if (revenueCensored) document.getElementById('stat-revenue')?.classList.add('blur-strong');
    else document.getElementById('stat-revenue')?.classList.remove('blur-strong');
    if (dueCensored) document.getElementById('stat-credit')?.classList.add('blur-strong');
    else document.getElementById('stat-credit')?.classList.remove('blur-strong');
}

let toastHideTimer = null;
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toastMsg.style.color = isError ? '#fca5a5' : '';
        toast.classList.remove('translate-y-20', 'opacity-0');
        if (toastHideTimer) clearTimeout(toastHideTimer);
        toastHideTimer = setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
    }
}

window.showLogsModal = async function () {
    const logsModal = document.getElementById('logsModal');
    if (!logsModal) return;
    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '<div class="p-4 text-center">Loading logs...</div>';
    window.toggleModal('logsModal');
    try {
        const q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(200));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { logsList.innerHTML = '<div class="p-4 text-center text-slate-500">No logs found.</div>'; return; }
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
        logsList.innerHTML = html;
    } catch (err) { console.error(err); logsList.innerHTML = '<div class="p-4 text-center text-red-500">Failed to load logs.</div>'; }
};

function toggleLogoMenu() {
    let menu = document.getElementById('logoDropdown');
    if (!menu) {
        const iconDiv = document.querySelector('.flex.items-center.gap-3');
        if (!iconDiv) return;
        menu = document.createElement('div');
        menu.id = 'logoDropdown';
        menu.className = 'absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 hidden';
        menu.innerHTML = `
            <button onclick="event.stopPropagation(); showLogsModal(); toggleLogoMenu();" class="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-t-xl flex items-center gap-2">
                ${icon('history', 'text-slate-500')} 📜 View Logs
            </button>
            <button onclick="event.stopPropagation(); fixLegacyDates();" class="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2">
                🛠️ Normalize Dates (run once)
            </button>
            <button onclick="event.stopPropagation(); toggleLogoMenu();" class="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-b-xl flex items-center gap-2">
                ${icon('times', 'text-slate-500')} Close
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


window.updateStatus = async function (id) {
    const repair = findRepairAnywhere(id);
    if (!repair) { showToast("Repair not found", true); return; }
    const currentStatus = repair.status || 'pending';
    let nextStatus = currentStatus === 'pending' ? 'completed' : currentStatus === 'completed' ? 'returned' : currentStatus === 'returned' ? 'pending' : 'pending';
    try {
        await updateDoc(doc(db, "repairs", id), { status: nextStatus });
        const updatedRepair = { ...repair, status: nextStatus };
        const synced = await syncToAlgolia(id, updatedRepair);
        showToast(synced ? `Status changed to ${nextStatus} (synced)` : `Status changed to ${nextStatus} – search sync failed`, !synced);
        updateSearchResultLocally(updatedRepair);
        updateStats();
    } catch (err) { console.error(err); alert("Failed to update status"); }
};

window.markAsReturned = async function (id) {
    const repair = findRepairAnywhere(id);
    if (!repair) { showToast("Repair not found", true); return; }
    if (repair.status === 'returned') { showToast("Already marked as returned"); return; }
    try {
        await updateDoc(doc(db, "repairs", id), { status: 'returned' });
        const updatedRepair = { ...repair, status: 'returned' };
        const synced = await syncToAlgolia(id, updatedRepair);
        showToast(synced ? `Marked as returned (synced)` : `Marked as returned – search sync failed`, !synced);
        updateSearchResultLocally(updatedRepair);
        updateStats();
    } catch (err) { console.error(err); alert("Failed to mark as returned"); }
};

window.editRepair = function (id) {
    const repair = findRepairAnywhere(id);
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
    if (repair.image) { previewImg.src = repair.image; previewDiv.classList.remove('hidden'); }
    else { previewDiv.classList.add('hidden'); }
    window.toggleModal('entryModal');
};

window.deleteRepair = async function (id) {
    if (!confirm("Delete this entry?")) return;
    try {
        await deleteDoc(doc(db, "repairs", id));
        await deleteFromAlgolia(id);
        showToast("Deleted successfully (synced)");
        if (currentView === 'month') {
            fullMonthRepairs = fullMonthRepairs.filter(r => r.id !== id);
            repairs = fullMonthRepairs;
        } else {
            repairs = repairs.filter(r => r.id !== id);
        }
        displayedRepairs = displayedRepairs.filter(r => r.id !== id);
        if (isSearchActive) {
            searchFilteredList = searchFilteredList.filter(r => r.id !== id);
            totalFilteredItems = searchFilteredList.length;
            const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
            if (currentPage > totalPages) {
                currentPage = totalPages > 0 ? totalPages : 1;
            }
            if (currentPage < 1) currentPage = 1;
            const start = (currentPage - 1) * itemsPerPage;
            displayedRepairs = searchFilteredList.slice(start, start + itemsPerPage);
            renderTable(displayedRepairs);
            updatePaginationControls();
        } else {
            applyFiltersAndRender();
        }
        updateStats();
    } catch (err) { console.error(err); alert("Delete failed"); }
};


(async () => {
    try {
        await loadConfig();
        console.log("✅ Config loaded, Algolia sync ready");
    } catch (err) {
        console.error("Failed to load config:", err);
        alert("Unable to load application configuration. Please check your network and try again.");
        return;
    }
    attachTableDelegate();
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        const originalLabel = loginBtn.textContent;
        loginBtn.onclick = async () => {
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            try {
                loginBtn.textContent = "Verifying...";
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                loginBtn.textContent = originalLabel;
                alert("Invalid Credentials");
            }
        };
    }
    const logoArea = document.querySelector('.flex.items-center.gap-3');
    if (logoArea) {
        logoArea.style.cursor = 'pointer';
        logoArea.addEventListener('click', (e) => { e.stopPropagation(); toggleLogoMenu(); });
    }
    const dateLabel = document.getElementById('dateLabel');
    if (dateLabel) dateLabel.addEventListener('click', () => window.goToday());
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', onSearchInput);
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            const searchInputEl = document.getElementById('searchInput');
            const query = searchInputEl ? searchInputEl.value.trim() : '';
            if (query.length >= 2) performSearch(query);
            else resetPagination();
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
            let finalThumbUrl = "";
            if (currentImageData && currentImageData.startsWith('data:image')) {
                try {
                    const tag = currentImageData;
                    const pre = preImg.tag === tag && preImg.promise ? preImg : null;
                    let uploadedData = pre && pre.url ? pre.url : "";
                    if (!uploadedData) {
                        showToast("Compressing and uploading image...");
                        const compressedDataUrl = await compressImage(currentImageData, 1024, 0.7);
                        const blob = await (await fetch(compressedDataUrl)).blob();
                        uploadedData = await uploadImageBlob(blob).catch(err => {
                            console.warn("Photo upload failed, retrying...", err);
                            return uploadImageBlob(blob);
                        });
                    }
                    if (uploadedData && uploadedData.url) {
                        finalImageUrl = uploadedData.url;
                        if (uploadedData.thumb && uploadedData.thumb.url) finalThumbUrl = uploadedData.thumb.url;
                    } else throw new Error("ImgBB upload failed");
                } catch (uploadErr) {
                    console.error("Image upload failed:", uploadErr);
                    finalImageUrl = "";
                    showToast("Image upload failed – saving without photo", true);
                }
            }
            let costVal = Number(document.getElementById('cost').value) || 0;
            let paidVal = Number(document.getElementById('paid').value) || 0;
            if (costVal === 0 && paidVal > 0) costVal = paidVal;
            const isCompleted = costVal > 0;
            const formData = {
                customer: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                device: document.getElementById('deviceModel').value,
                sn: document.getElementById('snNumber').value,
                issue: document.getElementById('issueType').value,
                cost: costVal,
                paid: paidVal,
                image: finalImageUrl,
                ...(finalThumbUrl ? { imageThumb: finalThumbUrl } : {}),
                updatedAt: new Date().toISOString()
            };
            const passwordInput = document.getElementById('devicePassword')?.value;
            formData.password = (passwordInput || '').trim();
            if (currentlyEditingId) {
                const oldDocRef = doc(db, "repairs", currentlyEditingId);
                const oldSnap = await getDoc(oldDocRef);
                const prevData = oldSnap.exists() ? oldSnap.data() : {};
                let existingDate = null;
                let prevStatus = "";
                if (oldSnap.exists()) {
                    const oldData = oldSnap.data();
                    existingDate = oldData.date;
                    prevStatus = oldData.status || "";
                    const repairTitle = `${oldData.customer || ''} - ${oldData.device || ''}`;
                    await Promise.all([
                        ((oldData.phone || "") !== formData.phone) ? logChange(currentlyEditingId, "phone", oldData.phone || "", formData.phone, repairTitle) : null,
                        (Number(oldData.cost || 0) !== costVal) ? logChange(currentlyEditingId, "cost", oldData.cost || 0, costVal, repairTitle) : null,
                        (Number(oldData.paid || 0) !== paidVal) ? logChange(currentlyEditingId, "paid", oldData.paid || 0, paidVal, repairTitle) : null
                    ].filter(Boolean));
                }
               
                if (!existingDate && oldSnap.exists() && oldSnap.data().createdAt) {
                    const oldData = oldSnap.data();
                    let dateObj = typeof oldData.createdAt === "string" ? new Date(oldData.createdAt) : oldData.createdAt.seconds ? new Date(oldData.createdAt.seconds * 1000) : null;
                    if (dateObj && !isNaN(dateObj)) {
                        const nepDate = new NepaliDate(dateObj);
                        existingDate = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
                    }
                }
                if (!existingDate) existingDate = getTodayBSDate();
                const updatedData = { ...prevData, ...formData, status: (prevStatus === 'returned') ? 'returned' : (isCompleted ? 'completed' : (prevStatus || 'pending')), date: existingDate };
                await updateDoc(doc(db, "repairs", currentlyEditingId), updatedData);
                const synced = await syncToAlgolia(currentlyEditingId, updatedData);
                showToast(synced ? "Updated successfully (synced)" : "Updated – search sync failed", !synced);
                const updatedRepair = { ...updatedData, id: currentlyEditingId };
                updateSearchResultLocally(updatedRepair);
                updateStats();
            } else {
                try {
                    await refreshGlobalMaxSN();
                    let guard = 0;
                    while (guard++ < 50 && formData.sn && await isSnTaken(formData.sn)) {
                        const bumped = getNextSerialNumber();
                        document.getElementById('snNumber').value = bumped;
                        formData.sn = bumped;
                        showToast(`SN already used (previous day) – adjusted to #${bumped}`);
                    }
                } catch (snErr) {
                    console.warn("SN auto-check skipped:", snErr);
                }
                let selectedDate = (currentView === 'day') ? new Date(currentDate) : new Date();
                if (currentView === 'month' && typeof window.NepaliDate === 'function') {
                    try {
                        const bsDate = new NepaliDate(Number(currentNepaliYear), Number(currentNepaliMonth) - 1, 1);
                        const adDate = bsDate.getAD ? bsDate.getAD() : null;
                        if (adDate && !isNaN(adDate.getTime())) {
                            selectedDate = new Date(adDate);
                        }
                    } catch (dateErr) { }
                }
                selectedDate.setHours(12,0,0,0);
                const createdAtISO = selectedDate.toISOString();
                let finalDateStr = "";
                try {
                    if (typeof window.NepaliDate === 'function') {
                        const nepDate = new NepaliDate(selectedDate);
                        finalDateStr = nepDate.format ? nepDate.format('YYYY/MM/DD') : nepDate.toString();
                    } else finalDateStr = selectedDate.toLocaleDateString();
                } catch(e) { finalDateStr = selectedDate.toLocaleDateString(); }
                const newEntry = { ...formData, status: isCompleted ? 'completed' : 'pending', date: finalDateStr, createdAt: createdAtISO };
                const docRef = await addDoc(collection(db, "repairs"), newEntry);
                const parsedSn = parseInt(newEntry.sn, 10);
                if (!isNaN(parsedSn) && parsedSn > globalMaxSN) {
                    globalMaxSN = parsedSn;
                    if (serialCounterReady) setDoc(doc(db, "counters", "serial"), { max: globalMaxSN }).catch(() => {});
                }
                const synced = await syncToAlgolia(docRef.id, newEntry);
                showToast(synced ? "Repair added (synced)" : "Repair added – search sync failed", !synced);
                if (isSearchActive) {
                    await performSearch(currentSearchQuery);
                } else {
                    loadData();
                }
                updateStats();
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
})();