// 🌟 محرك سراج كاشير (النسخة الاحترافية - الأوفلاين الذكي والتزامن السريع)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(e => console.error(e));
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
    myDeviceName = prompt("مرحباً بك في نسخة التجارب (سراج كاشير) 🛠️\nبرجاء إدخال اسم مميز لهذا الجهاز:");
    if (!myDeviceName || myDeviceName.trim() === "") myDeviceName = "جهاز تجريبي";
    localStorage.setItem('seraj_device_name', myDeviceName);
}

let currentStoreId = localStorage.getItem('seraj_store_id') || 'DemoStore';

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
            showCloudStatus('⚡ متصل بالسحابي: ' + currentStoreId);
            processSyncQueue(); // رفع أي حاجة كانت أوفلاين أول ما النت يشتغل
            startSmartRadars(); 
        };
    };
}

function showCloudStatus(msg) {
    let el = document.getElementById('cloud-sync-status');
    if(!el) {
        el = document.createElement('div');
        el.id = 'cloud-sync-status';
        el.style.cssText = 'position:fixed; bottom:15px; left:15px; background:rgba(0, 255, 102, 0.2); color:#00ff66; padding:8px 16px; border-radius:20px; font-size:14px; font-weight:bold; z-index:99999; border: 1px solid #00ff66; pointer-events: none; transition: all 0.3s ease;';
        document.body.appendChild(el);
    }
    el.innerText = msg;
    setTimeout(() => { el.style.opacity = '0'; }, 4000);
}

// ---------------------------------------------------------
// 1. نظام الطابور (Sync Queue) لرفع بيانات الأوفلاين
// ---------------------------------------------------------
function addToSyncQueue(colName, itemData) {
    let queue = JSON.parse(localStorage.getItem('seraj_sync_queue') || '[]');
    // التأكد من عدم تكرار نفس الفاتورة في الطابور
    queue = queue.filter(q => !(q.col === colName && q.data.id === itemData.id)); 
    queue.push({ col: colName, data: itemData });
    localStorage.setItem('seraj_sync_queue', JSON.stringify(queue));
    processSyncQueue();
}

function processSyncQueue() {
    if (!cloudReady || !navigator.onLine) return;
    let queue = JSON.parse(localStorage.getItem('seraj_sync_queue') || '[]');
    if (queue.length === 0) return;

    showCloudStatus("⏳ جاري مزامنة بيانات الأوفلاين للسحابة...");

    queue.forEach(q => {
        let safeId = String(q.data.id).replace(/[.#$\[\]]/g, "_");
        let cloudRefName = 'test_Stores/' + currentStoreId + '/' + q.col + '/' + safeId;
        
        window.dbCloud.ref(cloudRefName).set(q.data)
            .then(() => {
                // الفاتورة اترفعت بنجاح، نمسحها من الطابور
                let currentQueue = JSON.parse(localStorage.getItem('seraj_sync_queue') || '[]');
                currentQueue = currentQueue.filter(item => !(item.col === q.col && item.data.id === q.data.id));
                localStorage.setItem('seraj_sync_queue', JSON.stringify(currentQueue));
            }).catch(e => console.error("Sync Error", e));
    });
}

// مراقبة رجوع النت عشان نرفع الطابور فوراً
window.addEventListener('online', () => {
    showCloudStatus("🌐 عاد الاتصال بالإنترنت! جاري الرفع...");
    if(cloudReady) processSyncQueue();
});

// مقارنة البيانات لمعرفة التعديل الجديد ووضعه في الطابور
function saveArrayToQueueSafely(colName, newArray) {
    let oldArray = JSON.parse(localStorage.getItem('seraj_cloud_cache_' + colName) || '[]');
    let oldMap = new Map(oldArray.map(i => [String(i.id), i]));
    
    newArray.forEach(newItem => {
        let id = String(newItem.id);
        let oldItem = oldMap.get(id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            addToSyncQueue(colName, newItem); // أضف فقط العناصر المعدلة للطابور
        }
    });
    localStorage.setItem('seraj_cloud_cache_' + colName, JSON.stringify(newArray));
}

// ---------------------------------------------------------
// 2. نظام الاستقبال السريع (Debouncing) لحل مشكلة التقل
// ---------------------------------------------------------
let localCollectionsCache = {};
let renderTimers = {};

function startSmartRadars() {
    if(!cloudReady) return;
    const collections = ['products', 'customers', 'sales_invoices', 'suppliers', 'purchase_invoices', 'treasury_moves'];
    
    collections.forEach(col => {
        let ref = window.dbCloud.ref('test_Stores/' + currentStoreId + '/' + col);
        ref.on('child_added', snap => updateLocalSingleItem(col, snap.val()));
        ref.on('child_changed', snap => updateLocalSingleItem(col, snap.val()));
        ref.on('child_removed', snap => removeLocalSingleItem(col, snap.key));
    });

    window.dbCloud.ref('test_Stores/' + currentStoreId + '/vaults_v2').on('value', snapshot => {
        if (snapshot.exists()) {
            localStorage.setItem('seraj_vaults_v2', JSON.stringify(snapshot.val()));
            if(typeof updateTreasuryUI === 'function') updateTreasuryUI();
        }
    });
}

function updateLocalSingleItem(col, data) {
    if (!localCollectionsCache[col]) {
        localCollectionsCache[col] = JSON.parse(localStorage.getItem('seraj_' + col) || '[]');
    }
    
    let arr = localCollectionsCache[col];
    let docId = String(data.id);
    let existingIndex = arr.findIndex(item => String(item.id) === docId);
    
    if (existingIndex > -1) {
        if (JSON.stringify(arr[existingIndex]) === JSON.stringify(data)) return;
        arr[existingIndex] = data;
    } else {
        arr.push(data);
    }
    
    // السر هنا: بنجمع كل التحديثات ونرسم الشاشة مرة واحدة بس بعد ما تهدأ
    if (renderTimers[col]) clearTimeout(renderTimers[col]);
    renderTimers[col] = setTimeout(() => {
        saveAndRenderLocal(col, localCollectionsCache[col]);
    }, 800); // رسم واحد بعد 800 مللي ثانية
}

function removeLocalSingleItem(col, docId) {
    if (!localCollectionsCache[col]) {
        localCollectionsCache[col] = JSON.parse(localStorage.getItem('seraj_' + col) || '[]');
    }
    localCollectionsCache[col] = localCollectionsCache[col].filter(item => String(item.id) !== docId);
    
    if (renderTimers[col]) clearTimeout(renderTimers[col]);
    renderTimers[col] = setTimeout(() => {
        saveAndRenderLocal(col, localCollectionsCache[col]);
    }, 800);
}

function saveAndRenderLocal(col, localArray) {
    if (col.includes('invoices') || col === 'treasury_moves') {
        localArray.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || (b.id || 0) - (a.id || 0));
    }
    localStorage.setItem('seraj_' + col, JSON.stringify(localArray));
    localStorage.setItem('seraj_cloud_cache_' + col, JSON.stringify(localArray)); 
    
    try {
        if(col === 'products' && typeof renderInventoryTable === 'function') renderInventoryTable();
        if(col === 'sales_invoices' && typeof renderInvoicesHistory === 'function') renderInvoicesHistory();
        if(col === 'customers' && typeof renderCustomersList === 'function') renderCustomersList();
        if(col === 'suppliers' && typeof renderSuppliersList === 'function') renderSuppliersList();
        if(col === 'purchase_invoices' && typeof renderPurchasesHistory === 'function') renderPurchasesHistory();
        if(col === 'treasury_moves' && typeof renderMovementsTable === 'function') renderMovementsTable();
        if(typeof calculateCollectedData === 'function') calculateCollectedData();
    } catch(e) {}
}

const DB = {
    syncFromCloud: function() { return Promise.resolve(); },
    
    getProducts: function() { return JSON.parse(localStorage.getItem('seraj_products')) || []; },
    saveProducts: function(data) { localStorage.setItem('seraj_products', JSON.stringify(data)); saveArrayToQueueSafely('products', data); },
    
    getCustomers: function() { return JSON.parse(localStorage.getItem('seraj_customers')) || []; },
    saveCustomers: function(data) { localStorage.setItem('seraj_customers', JSON.stringify(data)); saveArrayToQueueSafely('customers', data); },
    
    getSalesInvoices: function() { return JSON.parse(localStorage.getItem('seraj_sales_invoices')) || []; },
    saveSalesInvoices: function(data) { 
        data.forEach(inv => { if (!inv.timestamp) inv.timestamp = Date.now(); });
        localStorage.setItem('seraj_sales_invoices', JSON.stringify(data)); 
        saveArrayToQueueSafely('sales_invoices', data); 
    },
    
    getSuppliers: function() { return JSON.parse(localStorage.getItem('seraj_suppliers')) || []; },
    saveSuppliers: function(data) { localStorage.setItem('seraj_suppliers', JSON.stringify(data)); saveArrayToQueueSafely('suppliers', data); },
    
    getPurchaseInvoices: function() { return JSON.parse(localStorage.getItem('seraj_purchase_invoices')) || []; },
    savePurchaseInvoices: function(data) { localStorage.setItem('seraj_purchase_invoices', JSON.stringify(data)); saveArrayToQueueSafely('purchase_invoices', data); },
    
    getTreasuryMoves: function() { return JSON.parse(localStorage.getItem('seraj_treasury_moves')) || []; },
    saveTreasuryMoves: function(data) { localStorage.setItem('seraj_treasury_moves', JSON.stringify(data)); saveArrayToQueueSafely('treasury_moves', data); },
    
    getVaults: function() { return JSON.parse(localStorage.getItem('seraj_vaults_v2')) || { main: 0, insta: 0, wallet: 0 }; },
    saveVaults: function(data) { 
        localStorage.setItem('seraj_vaults_v2', JSON.stringify(data)); 
        if(cloudReady && navigator.onLine) window.dbCloud.ref('test_Stores/' + currentStoreId + '/vaults_v2').set(data); 
    },
    
    applySavedTheme: function() {
        let b = localStorage.getItem('seraj_theme_border'); let g = localStorage.getItem('seraj_theme_glow'); let bg1 = localStorage.getItem('seraj_theme_bg1'); let bg2 = localStorage.getItem('seraj_theme_bg2'); let card = localStorage.getItem('seraj_theme_card'); let text = localStorage.getItem('seraj_theme_text');
        if (b && g) {
            document.documentElement.style.setProperty('--neon-border', b); document.documentElement.style.setProperty('--neon-glow', g);
            if (bg1) document.documentElement.style.setProperty('--bg-dark-1', bg1);
            if (bg2) document.documentElement.style.setProperty('--bg-dark-2', bg2);
            if (card) document.documentElement.style.setProperty('--card-bg', card);
            if (text) document.documentElement.style.setProperty('--text-main', text);
        }
    }
};

initCloud();
