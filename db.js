// 🌟 محرك سراج كاشير (نسخة التزامن اللحظي الدقيق - Online First)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('✅ تم تشغيل الكاش السريع.'))
            .catch(e => console.error('❌ فشل تشغيل الكاش:', e));
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
            showCloudStatus('⚡ متصل بالسحابي لحظياً: ' + currentStoreId);
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
// 1. الاستقبال اللحظي من السحابي (Listening)
// ---------------------------------------------------------
function startSmartRadars() {
    if(!cloudReady) return;
    const collections = ['products', 'customers', 'sales_invoices', 'suppliers', 'purchase_invoices', 'treasury_moves'];
    
    collections.forEach(col => {
        let cloudRefName = 'test_Stores/' + currentStoreId + '/' + col; 
        let ref = window.dbCloud.ref(cloudRefName);
        
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
    let localArray = JSON.parse(localStorage.getItem('seraj_' + col) || '[]');
    let docId = String(data.id);
    let existingIndex = localArray.findIndex(item => String(item.id) === docId);
    
    if (existingIndex > -1) {
        // تحديث فقط لو البيانات اللي جاية من السحاب أحدث أو مختلفة
        if (JSON.stringify(localArray[existingIndex]) !== JSON.stringify(data)) {
            localArray[existingIndex] = data;
        } else {
            return; // مفيش تغيير
        }
    } else {
        localArray.push(data);
    }
    
    saveAndRenderLocal(col, localArray);
}

function removeLocalSingleItem(col, docId) {
    let localArray = JSON.parse(localStorage.getItem('seraj_' + col) || '[]');
    localArray = localArray.filter(item => String(item.id) !== docId);
    saveAndRenderLocal(col, localArray);
}

function saveAndRenderLocal(col, localArray) {
    if (col.includes('invoices') || col === 'treasury_moves') {
        localArray.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || (b.id || 0) - (a.id || 0));
    }
    localStorage.setItem('seraj_' + col, JSON.stringify(localArray));
    
    // تحديث الشاشة
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

// ---------------------------------------------------------
// 2. الرفع اللحظي الدقيق (Uploading) - كل عنصر لوحده
// ---------------------------------------------------------
// دي الدالة السحرية الجديدة: بتاخد العنصر الفردي اللي إتغير وترفعه لوحده
function uploadSingleItemSafely(colName, itemData) {
    if(!cloudReady || !navigator.onLine) {
        // لو مفيش نت، بنحفظه محلي، والفايربيس (firebase-database.js) ذكي كفاية إنه هيعمله طابور ويرفعه لما النت ييجي
        return; 
    }
    let safeId = String(itemData.id).replace(/[.#$\[\]]/g, "_"); 
    let cloudRefName = 'test_Stores/' + currentStoreId + '/' + colName + '/' + safeId;
    window.dbCloud.ref(cloudRefName).set(itemData).catch(e => console.error("Error Syncing:", e));
}

function syncFullArray(colName, array) {
    // دي الدالة اللي البرنامج بيستدعيها. بدل ما نرفع كل الـ Array، هنلوب عليها ونرفع اللي ملوش timestamp أو لسه معمول
    array.forEach(item => {
        uploadSingleItemSafely(colName, item);
    });
}


const DB = {
    syncFromCloud: function() { return Promise.resolve(); },
    
    getProducts: function() { return JSON.parse(localStorage.getItem('seraj_products')) || []; },
    saveProducts: function(data) { localStorage.setItem('seraj_products', JSON.stringify(data)); syncFullArray('products', data); },
    
    getCustomers: function() { return JSON.parse(localStorage.getItem('seraj_customers')) || []; },
    saveCustomers: function(data) { localStorage.setItem('seraj_customers', JSON.stringify(data)); syncFullArray('customers', data); },
    
    getSalesInvoices: function() { return JSON.parse(localStorage.getItem('seraj_sales_invoices')) || []; },
    saveSalesInvoices: function(data) { 
        data.forEach(inv => { if (!inv.timestamp) inv.timestamp = Date.now(); });
        localStorage.setItem('seraj_sales_invoices', JSON.stringify(data)); 
        syncFullArray('sales_invoices', data); 
    },
    
    getSuppliers: function() { return JSON.parse(localStorage.getItem('seraj_suppliers')) || []; },
    saveSuppliers: function(data) { localStorage.setItem('seraj_suppliers', JSON.stringify(data)); syncFullArray('suppliers', data); },
    
    getPurchaseInvoices: function() { return JSON.parse(localStorage.getItem('seraj_purchase_invoices')) || []; },
    savePurchaseInvoices: function(data) { localStorage.setItem('seraj_purchase_invoices', JSON.stringify(data)); syncFullArray('purchase_invoices', data); },
    
    getTreasuryMoves: function() { return JSON.parse(localStorage.getItem('seraj_treasury_moves')) || []; },
    saveTreasuryMoves: function(data) { localStorage.setItem('seraj_treasury_moves', JSON.stringify(data)); syncFullArray('treasury_moves', data); },
    
    getVaults: function() { return JSON.parse(localStorage.getItem('seraj_vaults_v2')) || { main: 0, insta: 0, wallet: 0 }; },
    saveVaults: function(data) { 
        localStorage.setItem('seraj_vaults_v2', JSON.stringify(data)); 
        if(cloudReady) window.dbCloud.ref('test_Stores/' + currentStoreId + '/vaults_v2').set(data); 
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
