// --- Bagian 1: Deklarasi Variabel dan Elemen DOM ---

// Elemen Halaman Login
const loginContainer = document.getElementById('login-container');
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const buttonText = document.getElementById('buttonText');
const loader = document.getElementById('loader');
const message = document.getElementById('message');

// Elemen Halaman Dashboard
const dashboardContainer = document.getElementById('dashboard-container');
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');
const overlay = document.getElementById('overlay');
const userDisplayName = document.getElementById('userDisplayName');
const welcomeName = document.getElementById('welcomeName');
const logoutButton = document.getElementById('logoutButton');

// URL Google Apps Script Web App Anda
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwgIiYtJeLgqTfcb6AX1wgBY40jyxuSrhjafP3kigxgAcSz0GinLH3As7UrGGLLd4E/exec'; // <-- GANTI DENGAN URL DEPLOYMENT ANDA

// --- Bagian 2: Logika Aplikasi ---

/**
 * Fungsi untuk menginisialisasi dan menampilkan dashboard.
 */
function initializeDashboard() {
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
        const userData = JSON.parse(userDataString);
        const name = userData.username || 'User';
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        
        userDisplayName.textContent = capitalizedName;
        welcomeName.textContent = capitalizedName;
        
        // Tampilkan dashboard dan sembunyikan login
        loginContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
    } else {
        // Jika tidak ada data user, pastikan halaman login yang tampil
        loginContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
}

/**
 * Fungsi untuk menangani proses login.
 */
async function handleLogin(e) {
    e.preventDefault();

    buttonText.classList.add('hidden');
    loader.classList.remove('hidden');
    loginButton.disabled = true;
    message.textContent = '';
    message.classList.remove('text-red-500', 'text-green-500');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', username, password })
        });
        const result = await response.json();

        if (result.status === 'success') {
            message.textContent = 'Login berhasil! Memuat dashboard...';
            message.classList.add('text-green-500');
            sessionStorage.setItem('user', JSON.stringify(result.data));
            
            setTimeout(() => {
                initializeDashboard();
            }, 1000);
        } else {
            throw new Error(result.message || 'Username atau password salah.');
        }

    } catch (error) {
        message.textContent = error.message;
        message.classList.add('text-red-500');
        buttonText.classList.remove('hidden');
        loader.classList.add('hidden');
        loginButton.disabled = false;
    }
}

/**
 * Fungsi untuk menangani proses logout.
 */
function handleLogout() {
    sessionStorage.removeItem('user');
    // Muat ulang halaman untuk kembali ke state login
    window.location.reload();
}

/**
 * Fungsi untuk toggle sidebar di tampilan mobile.
 */
function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

// --- Bagian 3: Event Listeners ---

// Listener untuk form login
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Listener untuk tombol logout
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}

// Listener untuk hamburger menu dan overlay
if (hamburger && overlay) {
    hamburger.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
}

// Cek status login saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', initializeDashboard);
