// STATE APLIKASI
let currentMode = "Cash";
let currentSubTab = "all"; // all, Cash, Transfer, Out
let rawAmount = "0";

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
    if (subTab === "Transfer")
        document.getElementById("subtab-transfer").classList.add("active");
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
    if (mode === "Cash")
        document.querySelector(".cash-mode").classList.add("active");
    if (mode === "Transfer")
        document.querySelector(".transfer-mode").classList.add("active");
    if (mode === "Out")
        document.querySelector(".out-mode").classList.add("active");

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
    if (!amount || amount <= 0) {
        showToast("Masukkan nominal transaksi yang valid!");
        return;
    }

    const noteInput = document.getElementById("input-keterangan").value.trim();
    let note = noteInput;

    if (currentMode === "Out" && !note) {
        showToast("Harap isi keterangan pengeluaran!");
        return;
    }

    if (!note) {
        note = currentMode === "Cash" ? "Pemasukan Cash" : "Pemasukan Transfer";
    }

    const now = new Date();
    const dateOnly = getTodayDateString();
    const timeOnly =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");

    const newTransaction = {
        id: Date.now(),
        type: currentMode,
        amount: amount,
        note: note,
        dateOnly: dateOnly,
        timeOnly: timeOnly,
        verified: false, // Default verifikasi transfer = false
    };

    await dbAdd(newTransaction);

    rawAmount = "0";
    updateDisplay();
    document.getElementById("input-keterangan").value = "";

    renderRecentTransactions();
    showToast("Transaksi berhasil disimpan!");
}

// FITUR BARU: RENDER 3 TRANSAKSI TERAKHIR PADA BUKAN HALAMAN INPUT
async function renderRecentTransactions() {
    const recentList = document.getElementById("recent-list");
    recentList.innerHTML = "";

    const all = await dbGetAll();
    all.sort((a, b) => b.id - a.id);
    const recentItems = all.slice(0, 3);

    if (recentItems.length === 0) {
        recentList.innerHTML =
            '<div class="empty-state">Belum ada transaksi.</div>';
        return;
    }

    recentItems.forEach((item) => {
        const el = document.createElement("div");
        el.className = "recent-item";
        el.innerHTML = `
        <div class="left">
        <span class="type-badge ${item.type}">${item.type}</span>
        <span>${item.note}</span>
        </div>
        <div class="right">${formatRupiah(item.amount)}
        <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})" title="Edit">
        <i class="fa-solid fa-pen"></i>
        </button> </div>
        `;
        recentList.appendChild(el);
    });
}

// RENDER RIWAYAT DENGAN FILTER TANGGAL & SUB-TAB
async function renderHistory() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";

    const allTransactions = await dbGetAll();

    // Filter berdasarkan tanggal
    let filtered = allTransactions.filter(
        (item) => item.dateOnly === selectedDate,
    );

    // Filter berdasarkan sub-tab (All, Cash, Transfer, Out)
    if (currentSubTab !== "all") {
        filtered = filtered.filter((item) => item.type === currentSubTab);
    }

    let totalCash = 0;
    let totalTransfer = 0;
    let totalOut = 0;

    // Hitung akumulasi harian
    allTransactions
        .filter((item) => item.dateOnly === selectedDate)
        .forEach((item) => {
            if (item.type === "Cash") totalCash += item.amount;
            if (item.type === "Transfer") totalTransfer += item.amount;
            if (item.type === "Out") totalOut += item.amount;
        });

    if (filtered.length === 0) {
        historyList.innerHTML = `<div class="empty-state">Tidak ada transaksi untuk kategori/tanggal ini.</div>`;
    } else {
        filtered.sort((a, b) => b.id - a.id);

        filtered.forEach((item) => {
            const isTransfer = item.type === "Transfer";
            const verifyBtnHTML = isTransfer
                ? `
            <button class="btn-icon verify-btn ${item.verified ? "verified" : ""}" onclick="toggleVerify(${item.id})" title="${item.verified ? "Sudah Diverifikasi" : "Tandai Verifikasi"}">
            <i class="fa-solid ${item.verified ? "fa-circle-check" : "fa-circle-notch"}"></i>
            </button>
            `
                : "";

            const el = document.createElement("div");
            el.className = "history-item";
            el.innerHTML = `
            <div class="item-main">
            <span class="type-badge ${item.type}">${item.type}</span>
            <div class="item-details">
            <span class="item-amount">${formatRupiah(item.amount)}</span>
            <span class="item-note">${item.note || "-"}</span>
            <span class="item-time"><i class="fa-regular fa-clock"></i> ${item.timeOnly}</span>
            </div>
            </div>
            <div class="item-actions">
            ${verifyBtnHTML}
            <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})" title="Edit">
            <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon delete-btn" onclick="deleteTransaction(${item.id})" title="Hapus">
            <i class="fa-solid fa-trash"></i>
            </button>
            </div>
            `;
            historyList.appendChild(el);
        });
    }

    const balance = totalCash - totalOut;

    document.getElementById("stat-total-cash").innerText =
        formatRupiah(totalCash);
    document.getElementById("stat-total-transfer").innerText =
        formatRupiah(totalTransfer);
    document.getElementById("stat-total-out").innerText =
        formatRupiah(totalOut);
    document.getElementById("stat-balance").innerText = formatRupiah(balance);
    document.getElementById("history-count").innerText =
        `${filtered.length} Catatan`;
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

// EKSPOR DATA KE CSV
async function exportCSV() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const all = await dbGetAll();
    const dateFiltered = all.filter((item) => item.dateOnly === selectedDate);

    if (dateFiltered.length === 0) {
        showToast("Tidak ada data transaksi pada tanggal ini untuk diekspor!");
        return;
    }

    // Kelompokkan data menurut jenis transaksi
    const cashItems = dateFiltered.filter((i) => i.type === "Cash");
    const transferItems = dateFiltered.filter((i) => i.type === "Transfer");
    const outItems = dateFiltered.filter((i) => i.type === "Out");

    let csvContent = "\uFEFF"; // UTF-8 BOM untuk kompatibilitas Excel
    csvContent += `LAPORAN TRANSAKSI TANGGAL: ${selectedDate}\n\n`;

    const appendGroup = (title, items) => {
        csvContent += `=== ${title} ===\n`;
        csvContent += `ID,Jenis,Nominal,Keterangan,Tanggal,Jam,Status Verifikasi\n`;
        if (items.length === 0) {
            csvContent += `Tidak ada transaksi\n\n`;
        } else {
            items.forEach((i) => {
                const verifiedStr =
                    i.type === "Transfer"
                        ? i.verified
                            ? "Diverifikasi"
                            : "Belum Verifikasi"
                        : "-";
                csvContent += `"${i.id}","${i.type}","${i.amount}","${i.note.replace(/"/g, '""')}","${i.dateOnly}","${i.timeOnly}","${verifiedStr}"\n`;
            });
            csvContent += `\n`;
        }
    };

    appendGroup("TRANSAKSI CASH", cashItems);
    appendGroup("TRANSAKSI TRANSFER", transferItems);
    appendGroup("TRANSAKSI OUT (PENGELUARAN)", outItems);

    // Download Blob CSV
    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `transaksi-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Data berhasil diekspor ke CSV");
}

// IMPOR DATA DARI CSV
function importCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
        const text = event.target.result;
        const lines = text.split("\n");
        let importedCount = 0;

        for (let line of lines) {
            line = line.trim();
            if (
                !line ||
                line.startsWith("===") ||
                line.startsWith("LAPORAN") ||
                line.startsWith("ID")
            )
                continue;

            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (matches && matches.length >= 6) {
                const clean = matches.map((m) =>
                    m.replace(/^"|"$/g, "").replace(/""/g, '"'),
                );
                const [
                    idStr,
                    type,
                    amountStr,
                    note,
                    dateOnly,
                    timeOnly,
                    verifiedStr,
                ] = clean;

                const amount = parseInt(amountStr, 10);
                if (type && !isNaN(amount)) {
                    const item = {
                        id: parseInt(idStr, 10) || Date.now() + Math.random(),
                        type: type,
                        amount: amount,
                        note: note || "",
                        dateOnly: dateOnly || getTodayDateString(),
                        timeOnly: timeOnly || "00:00",
                        verified: verifiedStr === "Diverifikasi",
                    };
                    await dbUpdate(item);
                    importedCount++;
                }
            }
        }

        renderRecentTransactions();
        renderHistory();
        showToast(`Berhasil mengimpor ${importedCount} transaksi`);
        e.target.value = "";
    };
    reader.readAsText(file);
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
async function openEditModal(id) {
    const all = await dbGetAll();
    const item = all.find((t) => t.id === id);
    if (!item) return;

    document.getElementById("edit-id").value = item.id;
    document.getElementById("edit-type").value = item.type;
    document.getElementById("edit-amount").value = item.amount;
    document.getElementById("edit-keterangan").value = item.note || "";

    document.getElementById("edit-modal").classList.add("active");
}

function closeEditModal() {
    document.getElementById("edit-modal").classList.remove("active");
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("edit-id").value, 10);
    const type = document.getElementById("edit-type").value;
    const amount = parseInt(document.getElementById("edit-amount").value, 10);
    const note = document.getElementById("edit-keterangan").value.trim();

    const all = await dbGetAll();
    const existing = all.find((t) => t.id === id);

    if (existing) {
        existing.type = type;
        existing.amount = amount;
        existing.note =
            note ||
            (type === "Cash"
                ? "Pemasukan Cash"
                : type === "Transfer"
                  ? "Pemasukan Transfer"
                  : "Pengeluaran");

        await dbUpdate(existing);
        renderRecentTransactions();
        renderHistory();
        closeEditModal();
        showToast("Transaksi berhasil diperbarui!");
    }
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
