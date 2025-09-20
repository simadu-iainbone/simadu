const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyeouc129LRBgpmrko0IHmpEpGLyJmUqEA8xCY69g_9bTLlCG5TKqYLoaY341fbYA_v/exec';

// --- GLOBAL REFERENCES (Pre-Initialization) ---
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menu-button');
const sidebarOverlay = document.getElementById('sidebar-overlay'); 

// --- APP STATE ---
const appState = { isSidebarCollapsed: false, currentPage: 1, totalPages: 1, suratMasukCache: {}, agendaToDelete: null, searchTerm: '', filterTujuan: '', filterJenis: '' };

// --- LAZY-LOADED REFERENCES (Post-Initialization) ---
let loginButton, loginText, loginSpinner, loginMessage, logoutButton, userDisplay, userAvatar, userUnit;
let mainContentWrapper, contentPages, sidebarLinks, suratMasukTableContainer, paginationContainer;
let searchFilterForm, resetFilterBtn, suratListView, suratDetailView, backToListButton, detailContentContainer;
let addSuratButton, suratModal, closeModalButton, cancelModalButton, saveSuratButton, suratForm;
let modalTitle, editAgendaId, saveText, saveSpinner, deleteModal, cancelDeleteButton, confirmDeleteButton;

// Fungsi untuk memuat modal secara dinamis
async function loadModals() {
    try {
        const response = await fetch('modals.html');
        if (!response.ok) throw new Error('Network response was not ok.');
        const modalHtml = await response.text();
        const modalContainer = document.getElementById('modal-container');
        if(modalContainer) {
            modalContainer.innerHTML = modalHtml;
        } else {
            throw new Error('Modal container not found in HTML.');
        }
    } catch (error) {
        console.error('Gagal memuat modal:', error);
        const modalContainer = document.getElementById('modal-container');
        if(modalContainer) {
            modalContainer.innerHTML = 
            `<p class="text-red-500 text-center fixed top-5 left-1/2 -translate-x-1/2 bg-white p-4 rounded-md shadow-lg">Gagal memuat komponen modal. Pastikan index.html sudah benar.</p>`;
        }
    }
}

// Fungsi untuk menginisialisasi semua referensi elemen dan event listener
function initializeApp() {
    // --- INITIALIZE REFERENCES ---
    loginButton = document.getElementById('login-button');
    loginText = document.getElementById('login-text');
    loginSpinner = document.getElementById('login-spinner');
    loginMessage = document.getElementById('login-message');
    logoutButton = document.getElementById('logout-button');
    userDisplay = document.getElementById('user-display');
    userAvatar = document.getElementById('user-avatar');
    userUnit = document.getElementById('user-unit');
    mainContentWrapper = document.getElementById('main-content-wrapper');
    contentPages = {
        'dashboard': document.getElementById('dashboard-content'),
        'surat-masuk': document.getElementById('surat-masuk-content'),
        'surat-keluar': document.getElementById('surat-keluar-content')
    };
    sidebarLinks = document.querySelectorAll('#sidebar a[data-page]');
    suratMasukTableContainer = document.getElementById('surat-masuk-table-container');
    paginationContainer = document.getElementById('surat-masuk-pagination-container');
    searchFilterForm = document.getElementById('search-filter-form');
    resetFilterBtn = document.getElementById('reset-filter-btn');
    suratListView = document.getElementById('surat-list-view');
    suratDetailView = document.getElementById('surat-detail-view');
    backToListButton = document.getElementById('back-to-list-button');
    detailContentContainer = document.getElementById('detail-content-container');
    addSuratButton = document.getElementById('add-surat-button');
    suratModal = document.getElementById('surat-modal');
    closeModalButton = document.getElementById('close-modal-button');
    cancelModalButton = document.getElementById('cancel-modal-button');
    saveSuratButton = document.getElementById('save-surat-button');
    suratForm = document.getElementById('surat-form');
    modalTitle = document.getElementById('modal-title');
    editAgendaId = document.getElementById('edit-agenda-id');
    saveText = document.getElementById('save-text');
    saveSpinner = document.getElementById('save-spinner');
    deleteModal = document.getElementById('delete-modal');
    cancelDeleteButton = document.getElementById('cancel-delete-button');
    confirmDeleteButton = document.getElementById('confirm-delete-button');

    // --- INITIALIZE EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', () => { sessionStorage.removeItem('user'); localStorage.removeItem('sidebarCollapsed'); window.location.reload(); });
    menuButton.addEventListener('click', () => {
        if (window.innerWidth >= 640) {
            appState.isSidebarCollapsed = !appState.isSidebarCollapsed;
            sidebar.classList.toggle('sidebar-collapsed');
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-20');
            localStorage.setItem('sidebarCollapsed', appState.isSidebarCollapsed);
        } else {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
        }
    });
    sidebarOverlay.addEventListener('click', () => { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); });
    sidebarLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(link.dataset.page); if (window.innerWidth < 640) { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); } }); });
    paginationContainer.addEventListener('click', (e) => { const btn = e.target.closest('.pagination-btn'); if (btn) { loadSuratMasuk(parseInt(btn.dataset.page, 10)); return; } const gotoBtn = e.target.closest('#goto-page-btn'); if (gotoBtn) { goToPage(); } });
    paginationContainer.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'page-input') { e.preventDefault(); goToPage(); } });
    suratMasukTableContainer.addEventListener('click', (e) => { const editBtn = e.target.closest('.edit-btn'); const deleteBtn = e.target.closest('.delete-btn'); const itemCard = e.target.closest('[data-agenda]'); if (editBtn) { e.stopPropagation(); const agendaId = editBtn.dataset.agenda; const record = findRecordByAgenda(agendaId); if (record) { openModal('edit', record); } return; } if (deleteBtn) { e.stopPropagation(); const agendaId = deleteBtn.dataset.agenda; openDeleteModal(agendaId); return; } if (itemCard) { const agendaId = itemCard.dataset.agenda; showDetailView(agendaId); } });
    backToListButton.addEventListener('click', hideDetailView);
    addSuratButton.addEventListener('click', () => openModal('add'));
    closeModalButton.addEventListener('click', closeModal);
    cancelModalButton.addEventListener('click', closeModal);
    suratForm.addEventListener('submit', handleSaveSurat);
    cancelDeleteButton.addEventListener('click', closeDeleteModal);
    confirmDeleteButton.addEventListener('click', handleDeleteSurat);
    searchFilterForm.addEventListener('submit', (e) => { e.preventDefault(); const formData = new FormData(searchFilterForm); appState.searchTerm = formData.get('searchTerm'); appState.filterTujuan = formData.get('filterTujuan'); appState.filterJenis = formData.get('filterJenis'); appState.suratMasukCache = {}; loadSuratMasuk(1); });
    resetFilterBtn.addEventListener('click', () => { searchFilterForm.reset(); appState.searchTerm = ''; appState.filterTujuan = ''; appState.filterJenis = ''; appState.suratMasukCache = {}; loadSuratMasuk(1); });

    // --- INITIAL PAGE CHECK ---
    if (sessionStorage.getItem('user')) {
        loginContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        initDashboard();
        navigateTo('dashboard');
    } else {
        loginContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
}

// Jalankan aplikasi setelah DOM dimuat dan modal telah di-fetch
document.addEventListener('DOMContentLoaded', async () => {
    await loadModals();
    initializeApp();
});

// --- HELPER & CORE FUNCTIONS ---
function findRecordByAgenda(agendaId) { const allCachedData = Object.values(appState.suratMasukCache).flatMap(page => page.data); return allCachedData.find(row => { const key = Object.keys(row).find(k => k.toLowerCase() === 'agenda'); return row[key] == agendaId; }); }
function showLoading(button, textElement, spinnerElement) { button.disabled = true; textElement.classList.add('hidden'); spinnerElement.classList.remove('hidden'); }
function hideLoading(button, textElement, spinnerElement) { button.disabled = false; textElement.classList.remove('hidden'); spinnerElement.classList.add('hidden'); }
async function handleLogin(e) { e.preventDefault(); loginMessage.textContent = ''; showLoading(loginButton, loginText, loginSpinner); const formData = new FormData(loginForm); const data = Object.fromEntries(formData.entries()); try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'login', ...data }) }); const result = await response.json(); if (result.status === 'success') { loginMessage.textContent = 'Login berhasil! Mengarahkan ke dashboard...'; loginMessage.className = 'text-sm text-center text-green-600'; sessionStorage.setItem('user', JSON.stringify(result.data)); localStorage.setItem('sidebarCollapsed', 'false'); setTimeout(() => { loginContainer.classList.add('hidden'); dashboardContainer.classList.remove('hidden'); initDashboard(); navigateTo('dashboard'); }, 1000); } else { loginMessage.textContent = result.message || 'Login Gagal!'; loginMessage.className = 'text-sm text-center text-red-600'; } } catch (error) { loginMessage.textContent = 'Terjadi kesalahan jaringan.'; loginMessage.className = 'text-sm text-center text-red-600'; } finally { hideLoading(loginButton, loginText, loginSpinner); } }
function initDashboard() { const user = JSON.parse(sessionStorage.getItem('user')); if (user) { userDisplay.textContent = user.username; userAvatar.textContent = user.username.substring(0, 2).toUpperCase(); userUnit.textContent = user.unit; } if (localStorage.getItem('sidebarCollapsed') === 'true' && window.innerWidth >= 640) { appState.isSidebarCollapsed = true; sidebar.classList.add('sidebar-collapsed', 'w-20'); sidebar.classList.remove('w-64'); } }
function navigateTo(page) { Object.values(contentPages).forEach(p => p.classList.add('hidden')); if (contentPages[page]) { contentPages[page].classList.remove('hidden'); } sidebarLinks.forEach(link => { link.classList.remove('active'); if (link.dataset.page === page) { link.classList.add('active'); } }); if (page === 'surat-masuk') { hideDetailView(); appState.suratMasukCache = {}; loadFilterOptions(); loadSuratMasuk(1); } }
async function loadFilterOptions() { const user = JSON.parse(sessionStorage.getItem('user')); const config = user?.config?.suratMasuk; if (!config) return; try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getFilterOptions', idsheet: config.idsheet, nama_sheet: config.masuk }) }); const result = await response.json(); if (result.status === 'success' && result.data) { const tujuanSelect = document.getElementById('filter-tujuan'); const jenisSelect = document.getElementById('filter-jenis'); tujuanSelect.length = 1; jenisSelect.length = 1; if (result.data.tujuan) { result.data.tujuan.forEach(item => { tujuanSelect.add(new Option(item, item)); }); } if (result.data.jenis) { result.data.jenis.forEach(item => { jenisSelect.add(new Option(item, item)); }); } } } catch (error) { console.error("Gagal memuat opsi filter:", error); } }
async function loadSuratMasuk(page) { appState.currentPage = page; const user = JSON.parse(sessionStorage.getItem('user')); const config = user?.config?.suratMasuk; if (!config) { suratMasukTableContainer.innerHTML = `<p class="text-red-500 text-center">Konfigurasi sheet untuk unit Anda tidak ditemukan.</p>`; return; } if (appState.suratMasukCache[page] && !appState.searchTerm && !appState.filterTujuan && !appState.filterJenis) { renderSuratMasukTable(appState.suratMasukCache[page].data); renderPaginationControls(appState.suratMasukCache[page].currentPage, appState.suratMasukCache[page].totalPages); return; } suratMasukTableContainer.innerHTML = `<div class="flex justify-center items-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-green-500"></i></div>`; paginationContainer.innerHTML = ''; try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getSuratMasuk', idsheet: config.idsheet, nama_sheet: config.masuk, page: page, searchTerm: appState.searchTerm, filterTujuan: appState.filterTujuan, filterJenis: appState.filterJenis }) }); const result = await response.json(); if (result.status === 'success' && result.data) { if (!appState.searchTerm && !appState.filterTujuan && !appState.filterJenis) { appState.suratMasukCache[page] = result.data; } appState.totalPages = result.data.totalPages; renderSuratMasukTable(result.data.data); renderPaginationControls(result.data.currentPage, result.data.totalPages); } else { suratMasukTableContainer.innerHTML = `<p class="text-red-500 text-center">${result.message || 'Gagal memuat data.'}</p>`; } } catch (error) { suratMasukTableContainer.innerHTML = `<p class="text-red-500 text-center">Terjadi kesalahan jaringan saat memuat data.</p>`; } }
function renderSuratMasukTable(data) { if (!data || data.length === 0) { suratMasukTableContainer.innerHTML = `<p class="text-center text-gray-500 py-8">Tidak ada data yang cocok dengan kriteria Anda.</p>`; return; } const getValue = (row, key) => { const rowKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase()); return rowKey ? row[rowKey] : ''; }; const getColorBadge = (text) => { if (!text) return ''; const lowerText = text.toLowerCase(); let colorClass = 'bg-gray-100 text-gray-800'; if (['surat dinas', 'nota dinas'].includes(lowerText)) colorClass = 'bg-blue-100 text-blue-800'; if (['selesai', 'diterima', 'optimal'].includes(lowerText)) colorClass = 'bg-green-100 text-green-800'; if (['proses', 'disposisi', 'permohonan'].includes(lowerText)) colorClass = 'bg-yellow-100 text-yellow-800'; return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}">${text}</span>`; }; const tableHeader = `<div class="hidden sm:table-header-group bg-gray-50"><div class="sm:table-row"><div class="sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agenda</div><div class="sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail Surat</div><div class="sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div><div class="sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</div></div></div>`; const tableBody = data.map(row => { const agenda = getValue(row, 'Agenda'); const pengirim = getValue(row, 'Pengirim'); const tujuan = getValue(row, 'Tujuan'); const tglNaskah = getValue(row, 'Tgl Naskah'); const jenis = getValue(row, 'Jenis'); const hal = getValue(row, 'Hal'); const status = getValue(row, 'Status'); return `<div class="sm:table-row-group bg-white hover:bg-gray-50 cursor-pointer" data-agenda="${agenda}"><div class="sm:table-row border-b border-gray-200"><div class="sm:hidden p-4 space-y-3"><div class="flex justify-between items-start"><div class="space-y-1"><p class="font-bold text-gray-800">${agenda}</p><p class="text-sm text-gray-600">${pengirim}</p></div><div class="flex-shrink-0">${getColorBadge(status)}</div></div><p class="text-sm text-gray-700">${hal}</p><div class="flex justify-between items-center text-xs text-gray-500 pt-2 border-t"><span>${tglNaskah} &bull; ${jenis}</span><div class="space-x-4"><button class="edit-btn text-indigo-600 hover:text-indigo-900" data-agenda="${agenda}" title="Edit"><i class="fas fa-edit fa-lg"></i></button><button class="delete-btn text-red-600 hover:text-red-900" data-agenda="${agenda}" title="Hapus"><i class="fas fa-trash fa-lg"></i></button></div></div></div><div class="hidden sm:table-cell px-6 py-4 align-top whitespace-nowrap text-sm font-medium text-gray-900">${agenda}</div><div class="hidden sm:table-cell px-6 py-4 align-top text-sm text-gray-700"><p class="font-semibold">${hal}</p><p class="text-gray-500">Dari: ${pengirim}</p><p class="text-gray-500">Tujuan: ${tujuan}</p></div><div class="hidden sm:table-cell px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500"><div class="flex flex-col"><span>${getColorBadge(status)}</span><span class="mt-1">${getColorBadge(jenis)}</span><span class="mt-1 text-xs">${tglNaskah}</span></div></div><div class="hidden sm:table-cell px-6 py-4 align-top whitespace-nowrap text-center text-sm font-medium"><button class="edit-btn text-indigo-600 hover:text-indigo-900 mr-3" data-agenda="${agenda}" title="Edit"><i class="fas fa-edit"></i></button><button class="delete-btn text-red-600 hover:text-red-900" data-agenda="${agenda}" title="Hapus"><i class="fas fa-trash"></i></button></div></div></div>`; }).join(''); suratMasukTableContainer.innerHTML = `<div class="sm:table w-full border-collapse">${tableHeader}${tableBody}</div>`; }
function renderPaginationControls(currentPage, totalPages) { if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; } const pageInfo = `<div class="text-sm text-gray-600">Halaman ${currentPage} dari ${totalPages}</div>`; let navigationControls = `<div class="flex items-center space-x-4"><div class="flex items-center space-x-2"><label for="page-input" class="text-sm text-gray-600 hidden sm:block">Lompat ke:</label><input type="number" id="page-input" min="1" max="${totalPages}" value="${currentPage}" class="w-16 px-2 py-1.5 text-center border border-gray-300 rounded-md shadow-sm text-sm focus:ring-green-500 focus:border-green-500"><button id="goto-page-btn" class="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">OK</button></div><div class="inline-flex rounded-md shadow-sm">`; if (currentPage > 1) { navigationControls += `<button class="pagination-btn relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${currentPage - 1}">Sebelumnya</button>`; } if (currentPage < totalPages) { navigationControls += `<button class="pagination-btn -ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${currentPage + 1}">Berikutnya</button>`; } navigationControls += `</div></div>`; paginationContainer.innerHTML = pageInfo + navigationControls; }
function goToPage() { const pageInput = document.getElementById('page-input'); if (!pageInput) return; const page = parseInt(pageInput.value, 10); if (page && page > 0 && page <= appState.totalPages) { loadSuratMasuk(page); } else { pageInput.focus(); pageInput.select(); pageInput.classList.add('border-red-500', 'ring-red-500'); setTimeout(() => { pageInput.classList.remove('border-red-500', 'ring-red-500'); }, 2000); } }
function showDetailView(agendaId) { const record = findRecordByAgenda(agendaId); if (!record) { alert('Data tidak ditemukan. Silakan kembali dan coba lagi.'); return; } let detailHtml = ''; for (const key in record) { if (record.hasOwnProperty(key)) { detailHtml += `<div class="py-2"><p class="text-sm font-medium text-gray-500">${key}</p><p class="mt-1 text-md text-gray-900 break-words">${record[key] || '-'}</p></div>`; } } detailContentContainer.innerHTML = detailHtml; suratListView.classList.add('hidden'); suratDetailView.classList.remove('hidden'); }
function hideDetailView() { suratDetailView.classList.add('hidden'); suratListView.classList.remove('hidden'); }
function openModal(mode, data = {}) { suratForm.reset(); const agendaInput = document.getElementById('agenda'); agendaInput.readOnly = false; if (mode === 'add') { modalTitle.textContent = 'Tambah Surat Masuk'; editAgendaId.value = ''; agendaInput.value = 'Memuat nomor...'; agendaInput.disabled = true; suratModal.classList.remove('hidden'); suratModal.classList.add('flex'); (async () => { try { const user = JSON.parse(sessionStorage.getItem('user')); const config = user?.config?.suratMasuk; const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getNextAgendaNumber', idsheet: config.idsheet, nama_sheet: config.masuk }) }); const result = await response.json(); if (result.status === 'success') { agendaInput.value = result.data; agendaInput.readOnly = true; } else { agendaInput.value = ''; alert('Gagal mendapatkan nomor agenda otomatis: ' + result.message); } } catch (error) { agendaInput.value = ''; alert('Terjadi kesalahan jaringan saat mengambil nomor agenda.'); } finally { agendaInput.disabled = false; } })(); } else { modalTitle.textContent = 'Edit Surat Masuk'; const getValue = (row, key) => { const rowKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase()); return rowKey ? row[rowKey] : ''; }; editAgendaId.value = getValue(data, 'Agenda'); for (const element of suratForm.elements) { if (element.name) { const value = getValue(data, element.name); if (value !== undefined) { element.value = value; } } } agendaInput.readOnly = true; suratModal.classList.remove('hidden'); suratModal.classList.add('flex'); } }
function closeModal() { suratModal.classList.add('hidden'); suratModal.classList.remove('flex'); }
async function handleSaveSurat(e) { e.preventDefault(); showLoading(saveSuratButton, saveText, saveSpinner); const formData = new FormData(suratForm); const data = Object.fromEntries(formData.entries()); const user = JSON.parse(sessionStorage.getItem('user')); const config = user?.config?.suratMasuk; const action = editAgendaId.value ? 'updateSuratMasuk' : 'createSuratMasuk'; try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, idsheet: config.idsheet, nama_sheet: config.masuk, payload: data }) }); const result = await response.json(); if (result.status === 'success') { closeModal(); appState.suratMasukCache = {}; loadSuratMasuk(editAgendaId.value ? appState.currentPage : 1); } else { alert('Gagal menyimpan data: ' + result.message); } } catch (error) { alert('Terjadi kesalahan jaringan.'); } finally { hideLoading(saveSuratButton, saveText, saveSpinner); } }
function openDeleteModal(agendaId) { appState.agendaToDelete = agendaId; deleteModal.classList.remove('hidden'); deleteModal.classList.add('flex'); }
function closeDeleteModal() { deleteModal.classList.add('hidden'); deleteModal.classList.remove('flex'); appState.agendaToDelete = null; }
async function handleDeleteSurat() { if (!appState.agendaToDelete) return; const user = JSON.parse(sessionStorage.getItem('user')); const config = user?.config?.suratMasuk; try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteSuratMasuk', idsheet: config.idsheet, nama_sheet: config.masuk, agendaId: appState.agendaToDelete }) }); const result = await response.json(); if (result.status === 'success') { closeDeleteModal(); appState.suratMasukCache = {}; loadSuratMasuk(appState.currentPage); } else { alert('Gagal menghapus data: ' + result.message); } } catch (error) { alert('Terjadi kesalahan jaringan.'); } }

