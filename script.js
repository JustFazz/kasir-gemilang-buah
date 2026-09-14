// STATE APLIKASI
let currentMode = "Cash";
let currentSubTab = "all"; // all, Cash, Transfer, Out
let rawAmount = "0";
let currentTransferType = "qris"; // 'qris' atau 'bank'

// CONFIG INDEXEDDB
const DB_NAME = "CatatanTransaksiDB";
const DB_VERSION = 1;
const STORE_NAME = "transactions";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function dbAdd(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(data);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

async function dbGetAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function dbUpdate(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(data);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

async function dbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

async function dbClear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

// INISIALISASI
document.addEventListener("DOMContentLoaded", async () => {
    const today = getTodayDateString();
    document.getElementById("history-date-picker").value = today;

    updateDisplay();
    await seedInitialDataIfEmpty();
    renderRecentTransactions();
    renderHistory();
});

async function seedInitialDataIfEmpty() {
    const items = await dbGetAll();
    if (items.length === 0) {
        const today = getTodayDateString();
        const sampleData = [
            {
                id: 1,
                type: "Cash",
                amount: 100000,
                note: "Modal awal",
                dateOnly: today,
                timeOnly: "08:30",
                verified: false,
            },
            {
                id: 2,
                type: "Transfer",
                amount: 250000,
                note: "Transfer masuk",
                dateOnly: today,
                timeOnly: "09:15",
                verified: true,
            },
            {
                id: 3,
                type: "Out",
                amount: 35000,
                note: "Makan Siang",
                dateOnly: today,
                timeOnly: "12:00",
                verified: false,
            },
        ];
        for (const item of sampleData) {
            await dbAdd(item);
        }
    }
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// GANTI TAB UTAMA
function switchTab(tabName) {
    document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
    document
        .querySelectorAll(".page-content")
        .forEach((page) => page.classList.remove("active"));

    if (tabName === "input") {
        document.getElementById("tab-input-btn").classList.add("active");
        document.getElementById("page-input").classList.add("active");
        renderRecentTransactions();
    } else {
        document.getElementById("tab-riwayat-btn").classList.add("active");
        document.getElementById("page-riwayat").classList.add("active");
        renderHistory();
    }
}

// STATE PIN
let appPin = localStorage.getItem("app_pin") || "1234";

// KUNCI APLIKASI SAAT PERTAMA KALI DIBUKA
document.addEventListener("DOMContentLoaded", async () => {
    // Tampilkan layar kunci
    document.getElementById("app-lock-screen").style.display = "flex";

    document.getElementById("history-date-picker").value = getTodayDateString();
    updateDisplay();
    await seedInitialDataIfEmpty();
});

// BUKA KUNCI APLIKASI UTAMA
function unlockApp() {
    const input = document.getElementById("app-pin-input").value;
    if (input === appPin) {
        document.getElementById("app-lock-screen").style.display = "none";
        document.getElementById("app-pin-input").value = "";
        showToast("Aplikasi Berhasil Dibuka");
    } else {
        showToast("PIN Salah!");
        document.getElementById("app-pin-input").value = "";
    }
}

// FITUR BARU: GANTI SUB-TAB RIWAYAT (All, Cash, Transfer, Out)
function setSubTab(subTab) {
    currentSubTab = subTab;
    document
        .querySelectorAll(".sub-tab-btn")
        .forEach((btn) => btn.classList.remove("active"));

    if (subTab === "all")
        document.getElementById("subtab-all").classList.add("active");
    if (subTab === "Cash")
        document.getElementById("subtab-cash").classList.add("active");
    if (subTab === "QRIS")
        document.getElementById("subtab-qris").classList.add("active");
    if (subTab === "Bank")
        document.getElementById("subtab-bank").classList.add("active");
    if (subTab === "Out")
        document.getElementById("subtab-out").classList.add("active");

    renderHistory();
}

// SET MODE & WARNA TOMBOL SIMPAN
function setMode(mode) {
    currentMode = mode;
    document
        .querySelectorAll(".mode-btn")
        .forEach((btn) => btn.classList.remove("active"));
    document
        .querySelector(`.${mode.toLowerCase()}-mode`)
        .classList.add("active");
    document.getElementById("active-mode-label").innerText = mode;

    const saveBtn = document.getElementById("btn-save");
    saveBtn.className = `key-btn key-submit ${mode.toLowerCase()}-mode`;

    const ketGroup = document.getElementById("group-keterangan");
    if (mode === "Out") {
        ketGroup.style.display = "flex";
    } else {
        ketGroup.style.display = "none";
        document.getElementById("input-keterangan").value = "";
    }
    // Tampilkan sub-type selector jika mode 'Transfer'
    const transferTypeGroup = document.getElementById("group-transfer-type");
    if (mode === "Transfer") {
        transferTypeGroup.style.display = "grid";
        setTransferType("qris"); // Default ke QRIS
    } else {
        transferTypeGroup.style.display = "none";
    }
}

function setTransferType(type) {
    currentTransferType = type;
    document
        .getElementById("btn-transfer-qris")
        .classList.toggle("active", type === "qris");
    document
        .getElementById("btn-transfer-bank")
        .classList.toggle("active", type === "bank");
}

// KALKULATOR KEYPAD
function pressKey(key) {
    if (key === "C") {
        rawAmount = "0";
    } else if (key === "BACK") {
        rawAmount = rawAmount.length > 1 ? rawAmount.slice(0, -1) : "0";
    } else if (key === "00") {
        if (rawAmount !== "0") rawAmount += "00";
    } else {
        if (rawAmount === "0") {
            rawAmount = key;
        } else if (rawAmount.length < 12) {
            rawAmount += key;
        }
    }
    playSound("click");
    updateDisplay();
}

function updateDisplay() {
    const val = parseInt(rawAmount, 10) || 0;
    document.getElementById("display-amount").innerText = formatRupiah(val);
}

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
}

// SIMPAN TRANSAKSI BARU
async function saveTransaction() {
    const amount = parseInt(rawAmount, 10);
    if (!amount || amount <= 0)
        return showToast("Nominal transaksi tidak valid!");

    const noteInput = document.getElementById("input-keterangan").value.trim();
    let note = noteInput;
    if (currentMode === "Out" && !note) {
        showToast("Harap isi keterangan pengeluaran!");
        return;
    }
    if (!note) {
        if (currentMode === "Cash") note = "Pemasukan Cash";
        else if (currentMode === "Transfer")
            note =
                currentTransferType === "qris"
                    ? "Pemasukan QRIS"
                    : "Pemasukan Bank";
    }

    const now = new Date();
    const dateOnly = getTodayDateString();
    const timeOnly = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Tetap menyimpan type: 'Transfer', dengan subType 'qris' atau 'bank'
    await dbAdd({
        id: Date.now(),
        type: currentMode,
        subType: currentMode === "Transfer" ? currentTransferType : null,
        amount: amount,
        note: note,
        dateOnly: dateOnly,
        timeOnly: timeOnly,
        verified: false,
    });

    rawAmount = "0";
    updateDisplay();
    document.getElementById("input-keterangan").value = "";
    renderRecentTransactions();
    playSound("success");
    setMode("Cash");
    showToast("Transaksi berhasil disimpan!");
}

// GET TYPE TRANSAKSI
function getDisplayType(item) {
    if (item.type === "Transfer") {
        return item.subType === "bank" ? "Bank" : "QRIS"; // Legacy data tanpa subType dibaca sebagai QRIS
    }
    return item.type;
}

// RENDER 3 TRANSAKSI TERAKHIR
async function renderRecentTransactions() {
    const recentList = document.getElementById("recent-list");
    recentList.innerHTML = "";

    const all = await dbGetAll();
    all.sort((a, b) => b.id - a.id);
    const items = all.slice(0, 3);

    if (items.length === 0) {
        recentList.innerHTML =
            '<div class="empty-state">Belum ada transaksi.</div>';
        return;
    }

    items.forEach((item) => {
        const displayType = getDisplayType(item);
        const el = document.createElement("div");
        el.className = "recent-item";
        el.innerHTML = `
            <div class="left">
                <span class="type-badge ${displayType}">${displayType}</span>
                <span>${item.note}</span>
            </div>
            <div class="right">
                <span>${formatRupiah(item.amount)}</span>
                <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
        `;
        recentList.appendChild(el);
    });
}

// RENDER HISTORY
async function renderHistory() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";

    const all = await dbGetAll();
    const dateFiltered = all.filter((i) => i.dateOnly === selectedDate);

    // Perhitungan Total
    let totalCash = 0,
        totalQris = 0,
        totalBank = 0,
        totalOut = 0;
    dateFiltered.forEach((i) => {
        if (i.type === "Cash") totalCash += i.amount;
        else if (i.type === "Out") totalOut += i.amount;
        else if (i.type === "Transfer") {
            if (i.subType === "bank") totalBank += i.amount;
            else totalQris += i.amount; // Termasuk data lama
        }
    });

    const totalPemasukan = totalCash + totalQris + totalBank;
    const balance = totalCash - totalOut;

    document.getElementById("stat-total-pemasukan").innerText =
        formatRupiah(totalPemasukan);
    document.getElementById("stat-total-cash").innerText =
        formatRupiah(totalCash);
    document.getElementById("stat-total-qris").innerText =
        formatRupiah(totalQris);
    document.getElementById("stat-total-bank").innerText =
        formatRupiah(totalBank);
    document.getElementById("stat-total-out").innerText =
        formatRupiah(totalOut);
    document.getElementById("stat-balance").innerText = formatRupiah(balance);

    // Filtering Sub-Tab (All, Cash, QRIS, Bank, Out)
    let filtered = dateFiltered.filter((i) => {
        if (currentSubTab === "all") return true;
        if (currentSubTab === "Cash") return i.type === "Cash";
        if (currentSubTab === "Out") return i.type === "Out";
        if (currentSubTab === "QRIS")
            return (
                i.type === "Transfer" && (i.subType === "qris" || !i.subType)
            );
        if (currentSubTab === "Bank")
            return i.type === "Transfer" && i.subType === "bank";
        return true;
    });

    document.getElementById("history-count").innerText =
        `${filtered.length} Catatan`;

    if (filtered.length === 0) {
        historyList.innerHTML =
            '<div class="empty-state">Tidak ada transaksi pada tanggal ini.</div>';
    } else {
        filtered.sort((a, b) => b.id - a.id);
        filtered.forEach((item) => {
            const displayType = getDisplayType(item);
            const isTF = item.type === "Transfer"; // QRIS & Bank mendapatkan tombol verifikasi
            const verifyHTML = isTF
                ? `
                <button class="btn-icon verify-btn ${item.verified ? "verified" : ""}" onclick="toggleVerify(${item.id})">
                    <i class="fa-solid ${item.verified ? "fa-circle-check" : "fa-circle-notch"}"></i>
                </button>
            `
                : "";

            const el = document.createElement("div");
            el.className = "history-item";
            el.innerHTML = `
                <div class="item-main">
                    <span class="type-badge ${displayType}">${displayType}</span>
                    <div class="item-details">
                        <span class="item-amount">${formatRupiah(item.amount)}</span>
                        <span class="item-note">${item.note}</span>
                        <span class="item-time"><i class="fa-regular fa-clock"></i> ${item.timeOnly}</span>
                    </div>
                </div>
                <div class="item-actions">
                    ${verifyHTML}
                    <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-btn" onclick="deleteTransaction(${item.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            historyList.appendChild(el);
        });
    }
}

// FITUR BARU: TOGGLE STATUS VERIFIKASI TRANSFER
async function toggleVerify(id) {
    const all = await dbGetAll();
    const item = all.find((t) => t.id === id);
    if (item) {
        item.verified = !item.verified;
        await dbUpdate(item);
        renderHistory();
        showToast(
            item.verified
                ? "Transfer telah diverifikasi!"
                : "Status verifikasi dibatalkan",
        );
    }
}
// EKSPOR CSV DENGAN PEMISAH <<< >>> KELOMPOK QRIS & BANK
async function exportCSV() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const all = await dbGetAll();
    const filtered = all.filter((i) => i.dateOnly === selectedDate);

    if (filtered.length === 0) {
        showToast("Tidak ada data pada tanggal ini!");
        return;
    }

    let csv =
        "\uFEFF<<< TRANSAKSI CASH >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam\n";
    filtered
        .filter((i) => i.type === "Cash")
        .forEach((i) => {
            csv += `"${i.id}","Cash","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}"\n`;
        });

    csv +=
        "\n<<< TRANSAKSI QRIS >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam,Status Verifikasi\n";
    filtered
        .filter(
            (i) =>
                i.type === "Transfer" && (i.subType === "qris" || !i.subType),
        )
        .forEach((i) => {
            csv += `"${i.id}","QRIS","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}","${i.verified ? "Diverifikasi" : "Belum"}"\n`;
        });

    csv +=
        "\n<<< TRANSAKSI BANK >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam,Status Verifikasi\n";
    filtered
        .filter((i) => i.type === "Transfer" && i.subType === "bank")
        .forEach((i) => {
            csv += `"${i.id}","Bank","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}","${i.verified ? "Diverifikasi" : "Belum"}"\n`;
        });

    csv += "\n<<< TRANSAKSI OUT >>>\nID,Jenis,Nominal,Keterangan,Tanggal,Jam\n";
    filtered
        .filter((i) => i.type === "Out")
        .forEach((i) => {
            csv += `"${i.id}","Out","${i.amount}","${i.note}","${i.dateOnly}","${i.timeOnly}"\n`;
        });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-${selectedDate}.csv`;
    link.click();
    showToast("Laporan CSV berhasil diunduh!");
}

// IMPOR CSV MEMBACA TIPE QRIS & BANK
function importCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt) {
        const lines = evt.target.result.split("\n");
        let count = 0;

        for (let line of lines) {
            line = line.trim();
            // Abaikan baris kosong, header kelompok "<<<", dan header kolom "ID"
            if (!line || line.startsWith("<<<") || line.startsWith("ID"))
                continue;

            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (matches && matches.length >= 6) {
                const clean = matches.map((m) => m.replace(/^"|"$/g, ""));
                const rawType = clean[1]; // Bisa Cash, Transfer, QRIS, Bank, Out

                let mainType = rawType;
                let subType = null;

                // Pemetaan otomatis jenis transaksi
                if (
                    rawType === "QRIS" ||
                    rawType === "Bank" ||
                    rawType === "Transfer"
                ) {
                    mainType = "Transfer";
                    subType = rawType === "Bank" ? "bank" : "qris";
                }

                await dbUpdate({
                    id: parseInt(clean[0], 10) || Date.now() + Math.random(),
                    type: mainType,
                    subType: subType,
                    amount: parseInt(clean[2], 10),
                    note: clean[3],
                    dateOnly: clean[4],
                    timeOnly: clean[5],
                    verified: clean[6] === "Diverifikasi",
                });
                count++;
            }
        }

        renderRecentTransactions();
        renderHistory();
        showToast(`Diimpor ${count} transaksi dari CSV`);
        e.target.value = "";
    };
    reader.readAsText(file);
}

// MODAL GANTI PIN
function openChangePinModal() {
    document.getElementById("pin-old").value = "";
    document.getElementById("pin-new").value = "";
    document.getElementById("pin-confirm").value = "";
    document.getElementById("change-pin-modal").classList.add("active");
}

function closeChangePinModal() {
    document.getElementById("change-pin-modal").classList.remove("active");
}

function handleChangePinSubmit(e) {
    e.preventDefault();
    const oldPin = document.getElementById("pin-old").value;
    const newPin = document.getElementById("pin-new").value;
    const confirmPin = document.getElementById("pin-confirm").value;

    if (oldPin !== appPin) {
        showToast("PIN saat ini tidak sesuai!");
        return;
    }

    if (newPin.length !== 4 || isNaN(newPin)) {
        showToast("PIN Baru harus 4 digit angka!");
        return;
    }

    if (newPin !== confirmPin) {
        showToast("Konfirmasi PIN Baru tidak cocok!");
        return;
    }

    // Simpan PIN Baru ke LocalStorage
    appPin = newPin;
    localStorage.setItem("app_pin", newPin);

    closeChangePinModal();
    showToast("PIN Aplikasi berhasil diperbarui!");
}

// BACKUP JSON
async function exportJSONBackup() {
    try {
        const allData = await dbGetAll();
        if (!allData || allData.length === 0) {
            showToast("Tidak ada data transaksi untuk di-backup!");
            return;
        }

        const jsonString = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonString], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `backup_transaksi_${getTodayDateString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast("Backup JSON berhasil diunduh!");
    } catch (err) {
        showToast("Gagal membuat backup data!");
    }
}

// RESTORE JSON
function importJSONRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Peringatan konfirmasi
    const confirmRestore = confirm(
        "⚠️ PERINGATAN RESTORE DATA:\n\nProses ini akan MENGHAPUS SELURUH DATA LAMA di aplikasi dan menggantinya dengan data dari file backup JSON.\n\nApakah Anda yakin ingin melanjutkan?",
    );

    if (!confirmRestore) {
        e.target.value = ""; // Reset input file jika batal
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (evt) {
        try {
            const data = JSON.parse(evt.target.result);

            if (Array.isArray(data)) {
                // Hapus seluruh data lama di IndexedDB
                await dbClear();

                // Masukkan data baru satu per satu dari file backup
                for (const item of data) {
                    await dbAdd(item);
                }

                // Perbarui tampilan UI
                if (typeof renderRecentTransactions === "function")
                    renderRecentTransactions();
                if (typeof renderHistory === "function") renderHistory();

                showToast("Restore Data Berhasil!");
            } else {
                showToast("Format file JSON tidak sesuai!");
            }
        } catch (err) {
            showToast("Gagal membaca atau memproses file JSON!");
        }
        e.target.value = ""; // Reset input file
    };

    reader.readAsText(file);
}

// HAPUS TRANSAKSI
async function deleteTransaction(id) {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        await dbDelete(id);
        renderRecentTransactions();
        renderHistory();
        showToast("Transaksi berhasil dihapus");
    }
}

// EDIT TRANSAKSI
function closeEditModal() {
    document.getElementById("edit-modal").classList.remove("active");
}

async function openEditModal(id) {
    const all = await dbGetAll();
    const item = all.find((t) => t.id === id);
    if (!item) return;

    document.getElementById("edit-id").value = item.id;

    let editValue = item.type;
    if (item.type === "Transfer") {
        editValue = item.subType === "bank" ? "Transfer-bank" : "Transfer-qris";
    }
    document.getElementById("edit-type").value = editValue;
    document.getElementById("edit-amount").value = item.amount;
    document.getElementById("edit-keterangan").value = item.note || "";

    document.getElementById("edit-modal").classList.add("active");
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("edit-id").value, 10);
    const selectedType = document.getElementById("edit-type").value;
    const amount = parseInt(document.getElementById("edit-amount").value, 10);
    const note = document.getElementById("edit-keterangan").value.trim();

    const all = await dbGetAll();
    const existing = all.find((t) => t.id === id);

    if (existing) {
        if (selectedType.startsWith("Transfer-")) {
            existing.type = "Transfer";
            existing.subType =
                selectedType === "Transfer-bank" ? "bank" : "qris";
        } else {
            existing.type = selectedType;
            existing.subType = null;
        }

        existing.amount = amount;
        existing.note =
            note ||
            (existing.type === "Cash"
                ? "Pemasukan Cash"
                : existing.type === "Out"
                  ? "Pengeluaran"
                  : "Pemasukan Transfer");

        await dbUpdate(existing);
        renderRecentTransactions();
        renderHistory();
        closeEditModal();
        showToast("Transaksi diperbarui!");
    }
}

// SOUND EFFECT
const sounds = {
    click: new Audio("./sounds/click.mp3"),
    success: new Audio("./sounds/success.mp3"),
};

function playSound(name) {
    const sound = sounds[name];

    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {});
}
// NOTIFIKASI TOAST
const toastQueue = [];
let toastShowing = false;

function showToast(message) {
    toastQueue.push(message);

    if (!toastShowing) {
        processToastQueue();
    }
}

function processToastQueue() {
    if (toastQueue.length === 0) {
        toastShowing = false;
        return;
    }

    toastShowing = true;

    const toast = document.getElementById("toast");
    const message = toastQueue.shift();

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");

        // Tunggu sedikit agar animasi hide selesai
        setTimeout(() => {
            processToastQueue();
        }, 300);
    }, 1500);
}

// WAKELOCK
let wakeLock;

async function keepScreenOn() {
    try {
        wakeLock = await navigator.wakeLock.request("screen");
    } catch (err) {
        console.log(err);
    }
}

keepScreenOn();

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        keepScreenOn();
    }
});
