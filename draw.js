document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素 ---
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnClear = document.getElementById('btnClear');
    const pageIndicator = document.getElementById('pageIndicator');
    const toolbar = document.getElementById('toolbar'); 

    // ======[修正箇所 (ツールボタン)]======
    const btnPen = document.getElementById('btnPen');
    const btnEraser = document.getElementById('btnEraser');
    // ======[修正ここまで]======

    // --- 状態 ---
    let isDrawing = false; // 描画中かどうかのフラグ
    let dpr = window.devicePixelRatio || 1; // 高解像度ディスプレイ対応
    
    let currentPageIndex = 0;
    let pageDrawings = []; // 全ページの「絵」を保存する金庫 (DataURL文字列の配列)
    
    // ======[修正箇所 (ツール状態)]======
    let currentTool = 'pen'; // 'pen' または 'eraser'
    let penWidth = 5;
    let eraserWidth = 30; // 消しゴムは太め
    const CANVAS_BG_COLOR = '#f0f0f0'; // キャンバスの背景色
    // ======[修正ここまで]======


    // ======[修正箇所 (applyContextSettings)]======
    // --- 描画設定 (ツールに応じて設定を切り替え) ---
    function applyContextSettings() {
        if (currentTool === 'pen') {
            // ペンモード
            ctx.strokeStyle = 'black';
            ctx.lineWidth = penWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        } else if (currentTool === 'eraser') {
            // 消しゴムモード (背景色で太く塗る)
            ctx.strokeStyle = CANVAS_BG_COLOR;
            ctx.lineWidth = eraserWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }
    // ======[修正ここまで]======


    // --- 初期化 ---
    function init() {
        // キャンバスの解像度を調整
        resizeCanvas();
        // ページ状態を初期化（0ページ目を読み込む）
        loadPage(0);

        // --- イベントリスナー ---
        // 描画
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerCancel);
        
        // リサイズ
        window.addEventListener('resize', resizeCanvas);
        
        // ページ操作ボタン
        btnPrev.addEventListener('click', () => {
            if (currentPageIndex > 0) {
                saveCurrentPage(); // (1) 現在の絵を保存
                loadPage(currentPageIndex - 1); // (2) 前のページを読み込む
            }
        });
        btnNext.addEventListener('click', () => {
            saveCurrentPage(); // (1) 現在の絵を保存
            loadPage(currentPageIndex + 1); // (2) 次のページを読み込む
        });
        btnClear.addEventListener('click', () => {
            const cssWidth = canvas.width / dpr;
            const cssHeight = canvas.height / dpr;
            ctx.clearRect(0, 0, cssWidth, cssHeight); // キャンバスをまっさらに
            saveCurrentPage(); // まっさらな状態を保存
        });
        
        // ======[修正箇所 (ツール切り替えイベント)]======
        btnPen.addEventListener('click', () => {
            currentTool = 'pen';
            applyContextSettings();
            // UIの active クラスを更新
            btnPen.classList.add('active');
            btnEraser.classList.remove('active');
        });
        
        btnEraser.addEventListener('click', () => {
            currentTool = 'eraser';
            applyContextSettings();
            // UIの active クラスを更新
            btnEraser.classList.add('active');
            btnPen.classList.remove('active');
        });
        // ======[修正ここまで]======
    }
    
    
    // --- 中核ロジック (変更なし) ---
    
    // [中核ロジック 1] 現在のキャンバスを「画像データ」として保存
    function saveCurrentPage() {
        try {
            const dataURL = canvas.toDataURL();
            pageDrawings[currentPageIndex] = dataURL;
        } catch (e) {
            console.error("キャンバスの保存に失敗しました。", e);
        }
    }

    // [中核ロジック 2] 指定ページの「画像データ」をキャンバスに復元
    function loadPage(index) {
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        
        const imgString = pageDrawings[index];
        
        if (imgString) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
                // [修正] 復元後、現在のツール設定を再適用
                applyContextSettings(); 
            };
            img.src = imgString;
        } else {
             // [修正] 新しいページの場合も、ツール設定を適用
            applyContextSettings();
        }
        
        currentPageIndex = index;
        updateUI();
    }

    // [中核ロジック 3] UI（ページ番号やボタン）の更新
    function updateUI() {
        pageIndicator.textContent = `${currentPageIndex + 1}`;
        btnPrev.disabled = (currentPageIndex === 0);
    }
    

    // --- キャンバスリサイズ処理 ---
    function resizeCanvas() {
        saveCurrentPage();
        
        dpr = window.devicePixelRatio || 1;
        
        const toolbarHeight = toolbar.clientHeight || 40;
        const cssWidth = window.innerWidth;
        const cssHeight = window.innerHeight - toolbarHeight; 

        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        
        ctx.scale(dpr, dpr);

        // [修正] リサイズ後の再適用は loadPage が行う
        // applyContextSettings(); 
        
        loadPage(currentPageIndex);
    }


    // --- 座標取得ヘルパー ---
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top)
        };
    }

    // --- イベントハンドラ (描画ロジック自体は変更なし) ---

    // 描画開始
    function onPointerDown(e) {
        isDrawing = true;
        const { x, y } = getCoords(e);
        ctx.beginPath(); 
        ctx.moveTo(x, y);  
        canvas.setPointerCapture(e.pointerId);
    }

    // 描画中
    function onPointerMove(e) {
        if (!isDrawing) return;
        
        // ======[修正箇所 (getCoalescedEvents)]======
        // [かくつき改善] 中間座標も取得して、より滑らかに描画
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        
        for (const event of events) {
            const { x, y } = getCoords(event);
            ctx.lineTo(x, y); 
        }
        ctx.stroke(); // ループの最後でまとめて描画
        // ======[修正ここまで]======
    }

    // 描画終了
    function onPointerUp(e) {
        if (!isDrawing) return;
        isDrawing = false;
        
        // [重要] 描画が終わった瞬間、現在のページ内容を「上書き保存」する
        saveCurrentPage();
        
        canvas.releasePointerCapture(e.pointerId);
    }
    
    // 描画キャンセル
    function onPointerCancel(e) {
        isDrawing = false;
        canvas.releasePointerCapture(e.pointerId);
    }

    // --- 実行 ---
    init();
});