// ==========================================
// المحاسب الذكي - النسخة الآمنة والذكية
// ==========================================

let isManagerMode = false;
let recognition;
let currentImageData = null; 
let isRecording = false; 
let isAudioEnabled = true; 
let manualMicStop = false; 

function unlockAudio() {
    if(isAudioEnabled && 'speechSynthesis' in window) {
        let msg = new SpeechSynthesisUtterance(' '); 
        msg.lang = 'ar-EG';
        msg.volume = 0.01; 
        window.speechSynthesis.speak(msg);
    }
}

function speakArabic(text) {
    if (!isAudioEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    let cleanText = text.replace(/[*_#\[\]"{}]/g, '').trim();
    if(cleanText === '') return;
    let msg = new SpeechSynthesisUtterance(cleanText);
    msg.lang = 'ar'; 
    msg.rate = 1.1;     
    msg.pitch = 1;      
    window.speechSynthesis.speak(msg);
}

function buildAIBrainUI() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-fab { position: fixed; bottom: 80px; left: 20px; width: 60px; height: 60px; background: #1e3a8a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(37,99,235,0.5); z-index: 9999; border: 2px solid #3b82f6; transition: transform 0.2s; }
        #ai-fab:active { transform: scale(0.92); }
        #ai-chat-window { position: fixed; bottom: 150px; left: 20px; width: 380px; max-width: 92vw; height: 560px; background: white; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: none; flex-direction: column; z-index: 9999; overflow: hidden; font-family: Arial, sans-serif; direction: rtl; }
        #ai-header { background: #1e3a8a; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        #ai-toggle-container { display: flex; align-items: center; gap: 8px; font-size: 14px; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 20px; }
        .switch { position: relative; display: inline-block; width: 40px; height: 20px; margin: 0; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #f59e0b; }
        input:checked + .slider:before { transform: translateX(20px); }
        #ai-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f3f4f6; display: flex; flex-direction: column; gap: 10px; user-select: text; -webkit-user-select: text; }
        .ai-msg { max-width: 88%; padding: 12px 15px; border-radius: 15px; font-size: 15px; line-height: 1.6; user-select: text; -webkit-user-select: text; }
        .ai-msg.user { background: #2563eb; color: white; align-self: flex-start; border-bottom-right-radius: 0; }
        .ai-msg.bot { background: white; color: black; align-self: flex-end; border: 1px solid #e5e7eb; border-bottom-left-radius: 0; }
        .ai-msg img { max-width: 100%; border-radius: 10px; margin-bottom: 5px; }
        #ai-input-area { display: flex; flex-direction: column; background: white; border-top: 1px solid #e5e7eb; padding: 8px; }
        #ai-image-preview-container { display: none; padding: 5px 10px; background: #eef2ff; border-bottom: 1px solid #ddd; font-size: 12px; color: #2563eb; align-items: center; justify-content: space-between; }
        .ai-controls { display: flex; gap: 8px; align-items: flex-end; }
        #ai-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 12px; outline: none; font-size: 15px; resize: none; height: 60px; font-family: inherit; }
        .ai-btn { background: #2563eb; color: white; border: none; padding: 8px; border-radius: 50%; cursor: pointer; width: 42px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .ai-btn.mic-active { background: #dc2626; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        #ai-camera-input { display: none; }
    `;
    document.head.appendChild(style);

    const robotSvg = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="9" cy="16" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="16" r="1.5" fill="currentColor"></circle>
            <path d="M12 2v3"></path>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    `;

    const uiHTML = `
        <div id="ai-fab" title="المحاسب الذكي">${robotSvg}</div>
        <div id="ai-chat-window">
            <div id="ai-header">
                <span style="font-weight:bold; font-size: 16px;">المحاسب الذكي</span>
                <div id="ai-toggle-container">
                    <button id="ai-speaker-btn" style="background:none; border:none; font-size:20px; cursor:pointer; padding:0;" title="تشغيل/إيقاف الصوت">🔊</button>
                    <button id="ai-clear-btn" style="background:none; border:none; font-size:18px; cursor:pointer; padding:0;" title="مسح المحادثة">🗑️</button>
                    <span>عام</span>
                    <label class="switch" title="تبديل بين وضع البائع ووضع المدير">
                        <input type="checkbox" id="ai-mode-toggle">
                        <span class="slider"></span>
                    </label>
                    <span style="color: #fde68a;">مدير</span>
                </div>
            </div>
            <div id="ai-messages"></div>
            <div id="ai-input-area">
                <div id="ai-image-preview-container">
                    <span>🖼️ تم إرفاق صورة</span>
                    <button onclick="clearImage()" style="background:none; border:none; color:red; cursor:pointer;">❌ إلغاء</button>
                </div>
                <div class="ai-controls">
                    <input type="file" id="ai-camera-input" accept="image/*">
                    <button id="ai-camera-btn" class="ai-btn" title="تصوير فاتورة">📷</button>
                    <textarea id="ai-input" placeholder="اسألني أو ارفع فاتورة..."></textarea>
                    <button id="ai-mic-btn" class="ai-btn" title="تحدث بالصوت">🎤</button>
                    <button id="ai-send-btn" class="ai-btn" title="إرسال">➤</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    loadSavedHistory();

    document.getElementById('ai-fab').addEventListener('click', () => {
        const win = document.getElementById('ai-chat-window');
        win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
    });

    document.getElementById('ai-speaker-btn').addEventListener('click', (e) => {
        isAudioEnabled = !isAudioEnabled;
        e.target.innerText = isAudioEnabled ? '🔊' : '🔇';
        if (!isAudioEnabled) window.speechSynthesis.cancel();
        else unlockAudio();
    });

    document.getElementById('ai-clear-btn').addEventListener('click', () => {
        if(confirm("هل تريد مسح سجل المحادثة؟")) {
            localStorage.removeItem('seraj_ai_chat_history');
            document.getElementById('ai-messages').innerHTML = '';
            addMessage('bot', 'أهلاً بك يا بشمهندس هاني! أنا جاهز أسمعك 🎤 (نسخة الحماية 🔒).', null, false);
        }
    });

    document.getElementById('ai-mode-toggle').addEventListener('change', (e) => {
        isManagerMode = e.target.checked;
        addMessage('bot', isManagerMode ? '🔒 تم التبديل لوضع **المدير المالي** (جميع الأسعار الحقيقية مكشوفة).' : '🤝 تم التبديل لـ **الوضع العام** (تطبيق الحماية 10% أو 15%).');
    });

    document.getElementById('ai-send-btn').addEventListener('click', () => {
        unlockAudio(); 
        sendMessage();
    });
    
    document.getElementById('ai-input').addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            unlockAudio(); 
            sendMessage();
        } 
    });
    
    document.getElementById('ai-camera-btn').addEventListener('click', () => document.getElementById('ai-camera-input').click());
    document.getElementById('ai-camera-input').addEventListener('change', handleImageUpload);

    setupMic();
}

function loadSavedHistory() {
    let saved = localStorage.getItem('seraj_ai_chat_history');
    if (saved) {
        try {
            let history = JSON.parse(saved);
            history.forEach(m => addMessage(m.sender, m.text, m.imgSrc, false));
        } catch(e) {
            addMessage('bot', 'أهلاً بك يا بشمهندس هاني! أنا جاهز أسمعك 🎤 (نسخة الحماية 🔒).', null, false);
        }
    } else {
        addMessage('bot', 'أهلاً بك يا بشمهندس هاني! أنا جاهز أسمعك 🎤 (نسخة الحماية 🔒).', null, false);
    }
}

function saveHistory(sender, text, imgSrc) {
    let saved = localStorage.getItem('seraj_ai_chat_history');
    let history = saved ? JSON.parse(saved) : [];
    history.push({ sender, text, imgSrc });
    if(history.length > 50) history.shift(); 
    localStorage.setItem('seraj_ai_chat_history', JSON.stringify(history));
}

function addMessage(sender, text, imgSrc = null, shouldSave = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-msg ' + sender;
    let content = '';
    if(imgSrc) content += `<img src="${imgSrc}"><br>`;
    content += text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    msgDiv.innerHTML = content;
    document.getElementById('ai-messages').appendChild(msgDiv);
    document.getElementById('ai-messages').scrollTop = document.getElementById('ai-messages').scrollHeight;
    if(shouldSave) saveHistory(sender, text, imgSrc);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageData = { mime_type: file.type, data: e.target.result.split(',')[1] };
        document.getElementById('ai-image-preview-container').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

window.clearImage = function() {
    currentImageData = null;
    document.getElementById('ai-camera-input').value = '';
    document.getElementById('ai-image-preview-container').style.display = 'none';
}

function smartFilterText(rawText) {
    let text = rawText.toLowerCase();
    const stopWords = ['عاوز', 'عايز', 'هاتلي', 'هات', 'ضيف', 'حط', 'اديني', 'واحد', 'حته', 'قطعه', 'صنف', 'لو سمحت', 'ممكن', 'بقولك', 'تضيف', 'عشان'];
    stopWords.forEach(word => {
        let regex = new RegExp('\\b' + word + '\\b', 'g');
        text = text.replace(regex, '');
    });
    text = text.replace(/رسيفير/g, 'ريسيفر');
    text = text.replace(/لد/g, 'ليد');
    text = text.replace(/led/g, 'ليد');

    const engNumbers = ['0','1','2','3','4','5','6','7','8','9'];
    const arNumbers  = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    text = text.split('').map(c => engNumbers.includes(c) ? arNumbers[engNumbers.indexOf(c)] : c).join('');
    
    return text.trim();
}

// ----------------------------------------------------
// لوب إعادة فتح المايك الإجباري وتجاهل إيرور السكوت
// ----------------------------------------------------
function setupMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { document.getElementById('ai-mic-btn').style.display = 'none'; return; }
    recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = true; 
    recognition.interimResults = false;
    
    recognition.onstart = () => { 
        manualMicStop = false; 
        unlockAudio(); 
        isRecording = true;
        document.getElementById('ai-mic-btn').classList.add('mic-active'); 
        document.getElementById('ai-input').placeholder = 'اتكلم براحتك.. أنا بسجل كل حاجة 🔴'; 
        if(isAudioEnabled) window.speechSynthesis.cancel(); 
    };
    
    recognition.onresult = (e) => { 
        let finalTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) { finalTranscript += e.results[i][0].transcript + ' '; }
        }
        document.getElementById('ai-input').value += smartFilterText(finalTranscript) + " "; 
    };
    
    recognition.onend = () => { 
        if (!manualMicStop) {
            // الموبايل هيفصل، الكود هيستنى 50 ملي ثانية ويفتح المايك تاني غصب عنه!
            setTimeout(() => {
                if(!manualMicStop) {
                    try { recognition.start(); } catch(e) {}
                }
            }, 50); 
        } else {
            isRecording = false;
            document.getElementById('ai-mic-btn').classList.remove('mic-active'); 
            document.getElementById('ai-input').placeholder = 'اسألني أو ارفع فاتورة...'; 
        }
    };

    // تجاهل إيرور "لا يوجد صوت" عشان ميكسرش اللوب
    recognition.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            manualMicStop = true; 
        }
    };
    
    document.getElementById('ai-mic-btn').addEventListener('click', () => {
        if (isRecording) { 
            manualMicStop = true; 
            recognition.stop(); 
        } else { 
            manualMicStop = false;
            unlockAudio();
            try { recognition.start(); } catch(e) {}
        }
    });
}

// ----------------------------------------------------
// الغرفة النظيفة (حذف أي مصطلحات إنجليزية وتعريب البيانات تماماً)
// ----------------------------------------------------
function getSafeShopData() {
    let originalProducts = DB.getProducts() || [];
    let safeData = {};

    if (isManagerMode) {
        // المدير بيتبعتله الداتا الأصلية كاملة بدون أي تعديل
        safeData = {
            products: originalProducts,
            customers: DB.getCustomers(),
            vaults: DB.getVaults(),
            suppliers: DB.getSuppliers()
        };
    } else {
        // البائع بيتبعتله قاموس "عربي فقط" مفيش فيه كلمة PurchasePrice خالص
        let cleanProducts = [];
        
        originalProducts.forEach(p => {
            let realCost = parseFloat(p.purchasePrice) || 0;
            if (p.lots && p.lots.length > 0) {
                realCost = parseFloat(p.lots[p.lots.length - 1].purchasePrice) || realCost;
            }
            
            // القاعدة الذهبية للحماية:
            let markup = realCost < 100 ? 1.15 : 1.10;
            let fakeCost = Math.ceil(realCost * markup); 
            
            // تفصيل الصنف على مقاس البائع بالعربي عشان جيميناي ميفهمش حاجة تانية
            cleanProducts.push({
                "اسم_الصنف": p.name,
                "الرصيد_المتاح": p.quantity,
                "سعر_البيع": p.price,
                "التكلفة": fakeCost
            });
        });

        safeData = { "المنتجات": cleanProducts };
    }
    return safeData;
}

async function sendMessage() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if(!text && !currentImageData) return;
    
    const displayImg = currentImageData ? 'data:' + currentImageData.mime_type + ';base64,' + currentImageData.data : null;
    input.value = '';
    addMessage('user', text || 'استخرج الأصناف من هذه الفاتورة وقم بإضافتها للنظام.', displayImg);
    
    const imgDataForApi = currentImageData; 
    clearImage(); 
    
    const loaderId = 'loader-' + Date.now();
    addMessage('bot', '<span id="'+loaderId+'">جاري التحليل... ⏳</span>', null, false);

    try {
        const shopData = getSafeShopData();
        
        let roleInstruction = isManagerMode 
            ? "أنت في وضع (المدير). مسموح لك بكشف كل الأسرار المالية."
            : `أنت في وضع (البائع). 
            قاعدة هامة: استخدم حقل "التكلفة" المرفق في البيانات كأقل سعر مسموح للبيع. ولا تذكر أي شيء عن نسب الخصم أو الإضافة. إذا سأل المستخدم عن التكلفة أجب بالرقم الموجود في "التكلفة" فقط.`;

        let systemInstruction = `أنت مساعد ذكي لبرنامج "سراج كاشير". 
        ${roleInstruction}
        هذه بيانات المخزن: ${JSON.stringify(shopData)}.
        
        إذا طلب إدراج فاتورة، ابحث عن أقرب اسم في المخزن.
        ورد بصيغة JSON فقط: [{"n": "اسم الصنف", "q": العدد}].
        ممنوع أي نص مع كود JSON. للأسئلة العادية أجب كنص عادي.`;

        let finalPrompt = systemInstruction + "\n\nسؤال المستخدم: " + (text || "استخرج أصناف الفاتورة");
        
        let requestContents = [{ text: finalPrompt }];
        if (imgDataForApi) {
            requestContents.push({ inline_data: { mime_type: imgDataForApi.mime_type, data: imgDataForApi.data } });
        }

// 1. استدعاء المفتاح من الذاكرة في نفس لحظة الإرسال
   let savedKey = localStorage.getItem('ai_api_key') || localStorage.getItem('seraj_ai_key');

        // 2. إيقاف الإرسال وتنبيه المستخدم إذا كان المفتاح غير موجود
        if (!savedKey || savedKey.trim() === "") {
            let errorMsg = "❌ برجاء إدخال مفتاح الذكاء الاصطناعي من شاشة الإعدادات (الترس ⚙️) أولاً!";
            document.getElementById(loaderId).parentElement.innerHTML = errorMsg;
            saveHistory('bot', errorMsg, null);
            speakArabic("برجاء إدخال المفتاح من الإعدادات");
            return;
        }

        // 3. تنظيف المفتاح وتجهيز الرابط
        const cleanKey = savedKey.replace(/[^a-zA-Z0-9_.\-]/g, ''); 
        const finalUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + cleanKey;

        // 4. إرسال الطلب لجوجل
        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: requestContents }] })
        });

        const data = await response.json();

        if (!response.ok) {
            let errorMsg = "❌ تم مؤقتاً إيقاف الطلبات من جوجل، انتظر ثوان معدودة وجرب تاني.";
            document.getElementById(loaderId).parentElement.innerHTML = errorMsg;
            saveHistory('bot', errorMsg, null);
            speakArabic("الرجاء الانتظار قليلاً ثم المحاولة");
            return;
        }
        const reply = data.candidates[0].content.parts[0].text;
        let messageBox = document.getElementById(loaderId).parentElement;
        
        try {
            let jsonMatch = reply.match(/\[.*\]/s); 
            if (jsonMatch) { 
let isPurchase = text.includes('شرا') || text.includes('مشتريات') || text.includes('مورد') || window.location.href.includes('purchase');
let isStore = text.includes('مخزن') || text.includes('جرد') || text.includes('نواقص') || window.location.href.includes('store');
let itemsArray = JSON.parse(jsonMatch[0]);

if (isStore) {
    let searchWords = itemsArray.map(item => item.n).join(' ');
    if (window.location.href.includes('store')) {
        let searchInput = document.getElementById('inventorySearch');
        if (searchInput) {
            searchInput.value = searchWords;
            if (typeof renderInventoryTable === 'function') renderInventoryTable();
        }
        let msgTxt = `✅ تم تجهيز طابور الأصناف في المخزن!`;
        messageBox.innerHTML = msgTxt;
        saveHistory('bot', msgTxt, null);
        speakArabic(`تم تجهيز الأصناف المطلوبة في طابور المخزن`);
    } else {
        sessionStorage.setItem('pendingAIStoreQueue', searchWords);
        let finalMsg = "✅ جاري تحويلك للمخزن وتجهيز الطابور...";
        messageBox.innerHTML = finalMsg;
        saveHistory('bot', finalMsg, null);
        speakArabic("جاري تحويلك لصفحة المخزن");
        setTimeout(() => { window.location.href = "store.html"; }, 1500);
    }
    return;
}
                
const insertItemsToInvoice = () => {
                    let successCount = 0;
                    let localDB = DB.getProducts(); // الداتا الأصلية وقت الإدراج للفاتورة
                    const cleanText = (txt) => txt.toString().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').trim();

                    itemsArray.forEach(item => {
                        let searchName = cleanText(item.n);
                        let bestMatch = localDB.find(p => cleanText(p.name) === searchName);
                        if (!bestMatch) {
                            let matches = localDB.filter(p => cleanText(p.name).includes(searchName) || searchName.includes(cleanText(p.name)));
                            if (matches.length > 0) bestMatch = matches[0];
                        }

                        if (bestMatch && typeof invoice !== 'undefined') {
                            let existing = invoice.findIndex(x => x.id === bestMatch.id);
                            if(existing > -1) { 
                                invoice[existing].qty += (parseFloat(item.q) || 1); 
                            } else {
                                let pPrice = (bestMatch.lots && bestMatch.lots.length > 0) ? bestMatch.lots[bestMatch.lots.length - 1].purchasePrice : (bestMatch.purchasePrice || 0);
                                let sPrice = (bestMatch.lots && bestMatch.lots.length > 0) ? bestMatch.lots[bestMatch.lots.length - 1].price : (bestMatch.price || 0);
                                
                                // التصليح هنا: غيرنا الكلمة لـ price عشان الفاتورة تقرأ السعر صح
                                invoice.unshift({ ...bestMatch, purchasePrice: pPrice, price: sPrice, qty: (parseFloat(item.q) || 1) });
                            }
                            successCount++;
                        }
                    });

                    if(typeof saveDraft === 'function') saveDraft();
                    if(typeof renderTable === 'function') renderTable();

                    let msgTxt = `✅ تم نزول <b>${successCount}</b> صنف للفاتورة مباشرة!`;
                    messageBox.innerHTML = msgTxt;
                    saveHistory('bot', msgTxt, null);
                    speakArabic(`تم إضافة الأصناف للفاتورة بنجاح`);
                };

                if (isPurchase && !window.location.href.includes('purchase')) {
                    sessionStorage.setItem('pendingAICart_purchase', jsonMatch[0]);
                    let finalMsg = "✅ جاري تحويلك لصفحة فاتورة الشراء...";
                    messageBox.innerHTML = finalMsg;
                    saveHistory('bot', finalMsg, null);
                    speakArabic("جاري تحويلك لصفحة المشتريات");
                    setTimeout(() => { window.location.href = "purchases.html"; }, 1500);
                    return; 
                } else if (!isPurchase && !window.location.href.includes('sales') && !window.location.href.includes('index')) {
                    sessionStorage.setItem('pendingAICart', jsonMatch[0]);
                    let finalMsg = "✅ جاري تحويلك لصفحة المبيعات...";
                    messageBox.innerHTML = finalMsg;
                    saveHistory('bot', finalMsg, null);
                    speakArabic("جاري تحويلك لصفحة المبيعات");
                    setTimeout(() => { window.location.href = "sales.html"; }, 1500);
                    return; 
                } else {
                    insertItemsToInvoice();
                    return;
                }
            }
        } catch (e) { console.log("الرد نص عادي", e); }

        messageBox.innerHTML = reply.replace(/\*(.*?)\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
        saveHistory('bot', reply, null);
        speakArabic(reply); 
        
    } catch(err) {
        console.error("AI Error: ", err);
        let errorMsg = "❌ عذراً، هناك مشكلة في الاتصال.";
        document.getElementById(loaderId).parentElement.innerHTML = errorMsg;
        saveHistory('bot', errorMsg, null);
        speakArabic("عذراً، حدثت مشكلة في الاتصال");
    }
}

window.addEventListener('load', buildAIBrainUI);

window.addEventListener('load', () => {
    let pSales = sessionStorage.getItem('pendingAICart');
    let pPurchases = sessionStorage.getItem('pendingAICart_purchase');
let pStore = sessionStorage.getItem('pendingAIStoreQueue');
    
const insertItems = (dataStr) => {
        let itemsArray = JSON.parse(dataStr);
        let successCount = 0;
        let localDB = DB.getProducts(); 
        const cleanText = (txt) => txt.toString().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىي]/g, 'ي').trim();

        itemsArray.forEach(item => {
            let searchName = cleanText(item.n);
            let bestMatch = localDB.find(p => cleanText(p.name) === searchName);
            if (!bestMatch) {
                let matches = localDB.filter(p => cleanText(p.name).includes(searchName) || searchName.includes(cleanText(p.name)));
                if (matches.length > 0) bestMatch = matches[0];
            }

            if (bestMatch && typeof invoice !== 'undefined') {
                let existing = invoice.findIndex(x => x.id === bestMatch.id);
                if(existing > -1) { 
                    invoice[existing].qty += (parseFloat(item.q) || 1); 
                } else {
                    let pPrice = (bestMatch.lots && bestMatch.lots.length > 0) ? bestMatch.lots[bestMatch.lots.length - 1].purchasePrice : (bestMatch.purchasePrice || 0);
                    let sPrice = (bestMatch.lots && bestMatch.lots.length > 0) ? bestMatch.lots[bestMatch.lots.length - 1].price : (bestMatch.price || 0);
                    
                    // التصليح هنا كمان
                    invoice.unshift({ ...bestMatch, purchasePrice: pPrice, price: sPrice, qty: (parseFloat(item.q) || 1) });
                }
                successCount++;
            }
        });
        
        if(typeof saveDraft === 'function') saveDraft();
        if(typeof renderTable === 'function') renderTable();
        speakArabic(`تم إدراج الأصناف بنجاح`);
    };

    if (pSales && typeof searchProducts === 'function') {
        insertItems(pSales);
        sessionStorage.removeItem('pendingAICart');
    }
    
    if (pPurchases && window.location.href.includes('purchase') && typeof searchProducts === 'function') {
        insertItems(pPurchases);
        sessionStorage.removeItem('pendingAICart_purchase');
    }
    if (pStore && window.location.href.includes('store')) {
    let searchInput = document.getElementById('inventorySearch');
    if(searchInput) {
        searchInput.value = pStore;
        if(typeof renderInventoryTable === 'function') renderInventoryTable();
    }
    sessionStorage.removeItem('pendingAIStoreQueue');
    speakArabic("تم تجهيز الطابور بنجاح");
}
});
