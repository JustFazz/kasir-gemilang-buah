import { state } from "./config.js";
import {
    formatRupiah,
    playSound,
    showToast,
    getTodayDateString,
} from "./utils.js";
import { dbAdd, dbGetAll, dbUpdate, dbDelete } from "./db.js";
import { addToSyncQueue } from "./sync.js";

export function switchTab(tabName) {
    document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
    document
        .querySelectorAll(".page-content")
        .forEach((page) => page.classList.remove("active"));

    if (tabName === "input") {
        document.getElementById("tab-input-btn").classList.add("active");
        document.getElementById("page-input").classList.add("active");
        //renderRecentTransactions();
    } else {
        document.getElementById("tab-riwayat-btn").classList.add("active");
        document.getElementById("page-riwayat").classList.add("active");
        //renderHistory();
    }
}

export function unlockApp() {
    const input = document.getElementById("app-pin-input").value;
    if (input === state.appPin) {
        document.getElementById("app-lock-screen").style.display = "none";
        document.getElementById("app-pin-input").value = "";
        showToast("Aplikasi Berhasil Dibuka");
    } else {
        showToast("PIN Salah!");
        document.getElementById("app-pin-input").value = "";
    }
}

export function setSubTab(subTab) {
    state.currentSubTab = subTab;
    document
        .querySelectorAll(".sub-tab-btn")
        .forEach((btn) => btn.classList.remove("active"));

    const subTabMap = {
        all: "subtab-all",
        Cash: "subtab-cash",
        QRIS: "subtab-qris",
        Bank: "subtab-bank",
        Out: "subtab-out",
    };

    if (subTabMap[subTab]) {
        document.getElementById(subTabMap[subTab]).classList.add("active");
    }

    // Cukup filter DOM secara instan tanpa fetch IndexedDB
    filterHistoryDOM();
}

export function setMode(mode) {
    state.currentMode = mode;
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

    const transferTypeGroup = document.getElementById("group-transfer-type");
    if (mode === "Transfer") {
        transferTypeGroup.style.display = "grid";
        setTransferType("qris");
    } else {
        transferTypeGroup.style.display = "none";
    }
}

export function setTransferType(type) {
    state.currentTransferType = type;
    document
        .getElementById("btn-transfer-qris")
        .classList.toggle("active", type === "qris");
    document
        .getElementById("btn-transfer-bank")
        .classList.toggle("active", type === "bank");
}

export function pressKey(key) {
    if (key === "C") {
        state.rawAmount = "0";
    } else if (key === "BACK") {
        state.rawAmount =
            state.rawAmount.length > 1 ? state.rawAmount.slice(0, -1) : "0";
    } else if (key === "00") {
        if (state.rawAmount !== "0") state.rawAmount += "00";
    } else {
        if (state.rawAmount === "0") {
            state.rawAmount = key;
        } else if (state.rawAmount.length < 12) {
            state.rawAmount += key;
        }
    }
    //playSound("click");
    updateDisplay();
}

export function updateDisplay() {
    const val = parseInt(state.rawAmount, 10) || 0;
    document.getElementById("display-amount").innerText = formatRupiah(val);
}

export async function saveTransaction() {
    const amount = parseInt(state.rawAmount, 10);
    if (!amount || amount <= 0)
        return showToast("Nominal transaksi tidak valid!");

    const noteInput = document.getElementById("input-keterangan").value.trim();
    let note = noteInput;

    if (state.currentMode === "Out" && !note) {
        return showToast("Harap isi keterangan pengeluaran!");
    }

    if (!note) {
        if (state.currentMode === "Cash") note = "Pemasukan Cash";
        else if (state.currentMode === "Transfer") {
            note =
                state.currentTransferType === "qris"
                    ? "Pemasukan QRIS"
                    : "Pemasukan Bank";
        }
    }

    const now = new Date();
    const dateOnly = getTodayDateString();
    const timeOnly = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const data = {
        id: Date.now(),
        type: state.currentMode,
        subType:
            state.currentMode === "Transfer" ? state.currentTransferType : null,
        amount: amount,
        note: note,
        dateOnly: dateOnly,
        timeOnly: timeOnly,
        verified: false,
    };

    await dbAdd(data);
    await addToSyncQueue("create", 999999, data);

    state.rawAmount = "0";
    updateDisplay();
    document.getElementById("input-keterangan").value = "";
    renderRecentTransactions();
    renderHistory();
    playSound("success");
    setMode("Cash");
    showToast("Transaksi berhasil disimpan!");
}

export function getDisplayType(item) {
    if (item.type === "Transfer") {
        return item.subType === "bank" ? "Bank" : "QRIS";
    }
    return item.type;
}

export async function renderRecentTransactions() {
    const recentList = document.getElementById("recent-list");
    if (!recentList) return;
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

export async function renderHistory() {
    const selectedDate = document.getElementById("history-date-picker").value;
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";

    const all = await dbGetAll();
    const dateFiltered = all.filter((i) => i.dateOnly === selectedDate);

    // Perhitungan Statistik Total
    let totalCash = 0,
        totalQris = 0,
        totalBank = 0,
        totalOut = 0;
    dateFiltered.forEach((i) => {
        if (i.type === "Cash") totalCash += i.amount;
        else if (i.type === "Out") totalOut += i.amount;
        else if (i.type === "Transfer") {
            if (i.subType === "bank") totalBank += i.amount;
            else totalQris += i.amount;
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

    if (dateFiltered.length === 0) {
        historyList.innerHTML =
            '<div class="empty-state">Tidak ada transaksi pada tanggal ini.</div>';
        document.getElementById("history-count").innerText = "0 Catatan";
        return;
    }

    dateFiltered.sort((a, b) => b.id - a.id);
    dateFiltered.forEach((item) => {
        const displayType = getDisplayType(item);
        const isTF = item.type === "Transfer";

        const el = document.createElement("div");
        el.className = "history-item";

        // Simpan atribut data untuk filter cepat via DOM
        el.dataset.type = item.type;
        el.dataset.subtype = item.subType || "";

        el.innerHTML = `
            <div class="item-main">
                <span class="type-badge ${displayType}">${displayType}</span>
                <div class="item-details">
                    <span class="item-amount">${formatRupiah(item.amount)}</span>
                    <span class="item-note">${item.note}</span>
                </div>
            </div>
            <div class="item-actions">
                <span class="item-time"><i class="fa-regular fa-clock"></i> ${item.timeOnly}</span>
                <button class="btn-icon edit-btn" onclick="openEditModal(${item.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete-btn" onclick="deleteTransaction(${item.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        historyList.appendChild(el);
    });

    // Terapkan filter sub-tab yang sedang aktif ke elemen DOM yang baru dibuat
    filterHistoryDOM();
}

export function filterHistoryDOM() {
    const historyList = document.getElementById("history-list");
    const items = historyList.querySelectorAll(".history-item");
    let visibleCount = 0;

    items.forEach((el) => {
        const type = el.dataset.type;
        const subType = el.dataset.subtype;

        let shouldShow = false;
        if (state.currentSubTab === "all") {
            shouldShow = true;
        } else if (state.currentSubTab === "Cash") {
            shouldShow = type === "Cash";
        } else if (state.currentSubTab === "Out") {
            shouldShow = type === "Out";
        } else if (state.currentSubTab === "QRIS") {
            shouldShow =
                type === "Transfer" && (subType === "qris" || subType === "");
        } else if (state.currentSubTab === "Bank") {
            shouldShow = type === "Transfer" && subType === "bank";
        }

        if (shouldShow) {
            el.style.display = ""; // Mengembalikan ke display bawaan CSS (flex/block)
            visibleCount++;
        } else {
            el.style.display = "none";
        }
    });

    // Perbarui jumlah catatan yang terlihat
    document.getElementById("history-count").innerText =
        `${visibleCount} Catatan`;

    // Kelola pesan empty state jika tidak ada item yang cocok dengan sub-tab
    let emptyState = historyList.querySelector(".empty-state-subtab");
    if (visibleCount === 0 && items.length > 0) {
        if (!emptyState) {
            emptyState = document.createElement("div");
            emptyState.className = "empty-state empty-state-subtab";
            emptyState.innerText = "Tidak ada transaksi pada sub-tab ini.";
            historyList.appendChild(emptyState);
        }
        emptyState.style.display = "";
    } else if (emptyState) {
        emptyState.style.display = "none";
    }
}

export async function deleteTransaction(id) {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        await dbDelete(id);
        renderRecentTransactions();
        renderHistory();
        showToast("Transaksi berhasil dihapus");
    }
}

export function openEditModal(id) {
    dbGetAll().then((all) => {
        const item = all.find((t) => t.id === id);
        if (!item) return;

        document.getElementById("edit-id").value = item.id;
        let editValue = item.type;
        if (item.type === "Transfer") {
            editValue =
                item.subType === "bank" ? "Transfer-bank" : "Transfer-qris";
        }

        document.getElementById("edit-type").value = editValue;
        document.getElementById("edit-amount").value = item.amount;
        document.getElementById("edit-keterangan").value = item.note === "Pemasukan Cash" ? "" : item.note === "Pemasukan QRIS" ? "" : item.note === "Pemasukan Bank" ? "" : item.note;
        document.getElementById("edit-modal").classList.add("active");
    });
}

export function closeEditModal() {
    document.getElementById("edit-modal").classList.remove("active");
}

export async function handleEditSubmit(e) {
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
                  : existing.subType === "bank" ? "Pemasukan Bank" : "Pemasukan QRIS");

        await dbUpdate(existing);
        renderRecentTransactions();
        renderHistory();
        closeEditModal();
        showToast("Transaksi diperbarui!");
    }
}

export function openChangePinModal() {
    document.getElementById("pin-old").value = "";
    document.getElementById("pin-new").value = "";
    document.getElementById("pin-confirm").value = "";
    document.getElementById("change-pin-modal").classList.add("active");
}

export function closeChangePinModal() {
    document.getElementById("change-pin-modal").classList.remove("active");
}

export function handleChangePinSubmit(e) {
    e.preventDefault();
    const oldPin = document.getElementById("pin-old").value;
    const newPin = document.getElementById("pin-new").value;
    const confirmPin = document.getElementById("pin-confirm").value;

    if (oldPin !== state.appPin) return showToast("PIN saat ini tidak sesuai!");
    if (newPin.length !== 4 || isNaN(newPin))
        return showToast("PIN Baru harus 4 digit angka!");
    if (newPin !== confirmPin)
        return showToast("Konfirmasi PIN Baru tidak cocok!");

    state.appPin = newPin;
    localStorage.setItem("app_pin", newPin);
    closeChangePinModal();
    showToast("PIN Aplikasi berhasil diperbarui!");
}
