// 🌟 محرك سراج كاشير (النسخة النهائية النظيفة - تعمل بالخلفية بدون زراير)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) { registration.unregister(); }
    });
}
const firebaseConfig = {
  apiKey: "AIzaSyASQurlODfgqRi812wwzcSGOTetYTaeUfQ",
authDomain: "serajled.firebaseapp.com",
    databaseURL: "https://serajled-default-rtdb.firebaseio.com",
    projectId: "serajled",
    storageBucket: "serajled.firebasestorage.app",
    messagingSenderId: "586272473412",
    appId: "1:586272473412:web:a31487a74d9ea4ea96d711",
    measurementId: "G-6Q7K2H0XJJ"
};

let cloudReady = false;
let myDeviceName = localStorage.getItem('seraj_device_name');
if (!myDeviceName) {
    myDeviceName = prompt("مرحباً بك في سراج كاشير 🤖\nبرجاء إدخال اسم مميز لهذا الجهاز:");
    if (!myDeviceName || myDeviceName.trim() === "") myDeviceName = "جهاز غير معروف";
    localStorage.setItem('seraj_device_name', myDeviceName);
}

function initCloud() {
    let s1 = document.createElement('script');
    s1.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
    document.head.appendChild(s1);
    
    s1.onload = () => {
        let s2 = document.createElement('script');
        s2.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js";
        document.head.appendChild(s2);
        
        s2.onload = () => {
            firebase.initializeApp(firebaseConfig);
            window.dbCloud = firebase.database();
            cloudReady = true;
            showCloudStatus('🟢 متصل (السحابة الجديدة) ⚡');
            startSmartRadars(); 
        };
    };
}

function showCloudStatus(msg) {
    let el = document.getElementById('cloud-sync-status');
    if(!el) {
        el = document.createElement('div');
        el.id = 'cloud-sync-status';
        el.style.cssText = 'position:fixed; bottom:15px; right:15px; background:rgba(0,0,0,0.9); color:#00ff66; padding:8px 16px; border-radius:20px; font-size:14px; font-weight:bold; z-index:99999; border: 1px solid var(--neon-border); pointer-events: none; transition: all 0.3s ease;';
        document.body.appendChild(el);
    }
    el.innerText = msg;
    if(msg.includes('🟢') || msg.includes('✅')) {
        el.style.color = '#00ff66';
        setTimeout(() => { el.style.opacity = '0'; }, 3000);
    } else {
        el.style.color = '#ff9800';
        el.style.opacity = '1';
    }
}

// 🛡️ نظام الذاكرة المجمعة لتحديث الشاشة بدون تهنيج
let memoryCache = {};
let memoryTypes = {};
let saveTimers = {};

function startSmartRadars() {
    if(!cloudReady) return;
    const collections = ['products', 'customers', 'sales_invoices', 'suppliers', 'purchase_invoices', 'treasury_moves'];
    
    collections.forEach(col => {
        let ref = window.dbCloud.ref(col);
        ref.on('child_added', snap => queueChange(col, snap.val(), 'added'));
        ref.on('child_changed', snap => queueChange(col, snap.val(), 'modified'));
        ref.on('child_removed', snap => queueChange(col, {id: snap.key}, 'removed'));
    });

    window.dbCloud.ref('vaults_v2').on('value', snapshot => {
        if (snapshot.exists()) {
            localStorage.setItem('seraj_vaults_v2', JSON.stringify(snapshot.val()));
            if(typeof updateTreasuryUI === 'function') updateTreasuryUI();
        }
    });
}

function queueChange(col, data, type) {
    if (!memoryCache[col]) { memoryCache[col] = {}; memoryTypes[col] = {}; }
    let docId = String(data.id);
    memoryCache[col][docId] = data;
    memoryTypes[col][docId] = type;
    
    if (saveTimers[col]) clearTimeout(saveTimers[col]);
    saveTimers[col] = setTimeout(() => { flushToStorage(col); }, 1500); 
}

function flushToStorage(col) {
    if (!memoryCache[col]) return;
    
    let localArray = JSON.parse(localStorage.getItem('seraj_' + col) || '[]');
    let changed = false;
    
    for (let docId in memoryCache[col]) {
         let data = memoryCache[col][docId];
         let type = memoryTypes[col][docId];
         
         if (type === 'added' || type === 'modified') {
             let existingIndex = localArray.findIndex(item => String(item.id) === docId);
             if (existingIndex > -1) {
                 localArray[existingIndex] = data; 
             } else {
                 localArray.push(data);
             }
             changed = true;
         } else if (type === 'removed') {
             localArray = localArray.filter(item => String(item.id) !== docId);
             changed = true;
         }
    }
    
    if (changed) {
        if (col.includes('invoices') || col === 'treasury_moves') {
            localArray.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || (b.id || 0) - (a.id || 0));
        }
        localStorage.setItem('seraj_' + col, JSON.stringify(localArray));
        localStorage.setItem('seraj_cloud_cache_' + col, JSON.stringify(localArray));
        
        try {
            if (typeof loadDB === 'function') loadDB(); 
            if(col === 'products' && typeof renderInventoryTable === 'function') renderInventoryTable();
            if(col === 'sales_invoices' && typeof renderInvoicesHistory === 'function') renderInvoicesHistory();
            if(col === 'customers' && typeof renderCustomersList === 'function') renderCustomersList();
            if(col === 'suppliers' && typeof renderSuppliersList === 'function') renderSuppliersList();
            if(col === 'purchase_invoices' && typeof renderPurchasesHistory === 'function') renderPurchasesHistory();
            if(col === 'treasury_moves' && typeof renderMovementsTable === 'function') renderMovementsTable();
            if(typeof calculateCollectedData === 'function') calculateCollectedData();
        } catch(e) {}
    }
    
    memoryCache[col] = {};
    memoryTypes[col] = {};
}

// نظام الرفع السريع للعمليات الجديدة
function saveArrayToCloudSafely(colName, newArray) {
    if(!cloudReady || !navigator.onLine) {
        localStorage.setItem('seraj_cloud_cache_' + colName, JSON.stringify(newArray));
        return; 
    }
    let oldArray = JSON.parse(localStorage.getItem('seraj_cloud_cache_' + colName) || '[]');
    let oldMap = new Map(oldArray.map(i => [String(i.id), i]));
    let updates = {};
    let opCount = 0;

    newArray.forEach(newItem => {
        if(!newItem.id) newItem.id = Date.now() + Math.floor(Math.random() * 1000);
        let id = String(newItem.id);
        let safeId = id.replace(/[.#$\[\]]/g, "_"); 
        let oldItem = oldMap.get(id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            updates[safeId] = newItem;
            opCount++;
        }
    });

    if(opCount > 0) {
        window.dbCloud.ref(colName).update(updates).then(() => {
            localStorage.setItem('seraj_cloud_cache_' + colName, JSON.stringify(newArray));
        }).catch(e => {});
    }
}

const DB = {
    syncFromCloud: function() { return Promise.resolve(); },
    getProducts: function() { return JSON.parse(localStorage.getItem('seraj_products')) || []; },
    saveProducts: function(data) { localStorage.setItem('seraj_products', JSON.stringify(data)); saveArrayToCloudSafely('products', data); },
    getCustomers: function() { return JSON.parse(localStorage.getItem('seraj_customers')) || []; },
    saveCustomers: function(data) { localStorage.setItem('seraj_customers', JSON.stringify(data)); saveArrayToCloudSafely('customers', data); },
    getSalesInvoices: function() { return JSON.parse(localStorage.getItem('seraj_sales_invoices')) || []; },
   saveSalesInvoices: function(data) { 
        // الكود ده بيدي وقت مخفي بالمللي ثانية لأي فاتورة جديدة أوتوماتيك
        data.forEach(inv => { if (!inv.timestamp) inv.timestamp = Date.now(); });
        localStorage.setItem('seraj_sales_invoices', JSON.stringify(data)); 
        saveArrayToCloudSafely('sales_invoices', data); 
    },
    getSuppliers: function() { return JSON.parse(localStorage.getItem('seraj_suppliers')) || []; },
    saveSuppliers: function(data) { localStorage.setItem('seraj_suppliers', JSON.stringify(data)); saveArrayToCloudSafely('suppliers', data); },
    getPurchaseInvoices: function() { return JSON.parse(localStorage.getItem('seraj_purchase_invoices')) || []; },
    savePurchaseInvoices: function(data) { localStorage.setItem('seraj_purchase_invoices', JSON.stringify(data)); saveArrayToCloudSafely('purchase_invoices', data); },
    getTreasuryMoves: function() { return JSON.parse(localStorage.getItem('seraj_treasury_moves')) || []; },
    saveTreasuryMoves: function(data) { localStorage.setItem('seraj_treasury_moves', JSON.stringify(data)); saveArrayToCloudSafely('treasury_moves', data); },
    getVaults: function() { return JSON.parse(localStorage.getItem('seraj_vaults_v2')) || { main: 0, insta: 0, wallet: 0 }; },
    saveVaults: function(data) { localStorage.setItem('seraj_vaults_v2', JSON.stringify(data)); if(cloudReady) window.dbCloud.ref('vaults_v2').set(data); },
    applySavedTheme: function() {}
};

initCloud();
// تحديث شامل لألوان الثيمات في كل البرنامج
DB.applySavedTheme = function() {
    let b = localStorage.getItem('seraj_theme_border');
    let g = localStorage.getItem('seraj_theme_glow');
    let bg1 = localStorage.getItem('seraj_theme_bg1');
    let bg2 = localStorage.getItem('seraj_theme_bg2');
    let card = localStorage.getItem('seraj_theme_card');
    let text = localStorage.getItem('seraj_theme_text');

    if (b && g) {
        document.documentElement.style.setProperty('--neon-border', b);
        document.documentElement.style.setProperty('--neon-glow', g);
        if (bg1) document.documentElement.style.setProperty('--bg-dark-1', bg1);
        if (bg2) document.documentElement.style.setProperty('--bg-dark-2', bg2);
        if (card) document.documentElement.style.setProperty('--card-bg', card);
        if (text) document.documentElement.style.setProperty('--text-main', text);
    }
};
