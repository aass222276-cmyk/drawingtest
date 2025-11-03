document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素 ---
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnClear = document.getElementById('btnClear');
    const pageIndicator = document.getElementById('pageIndicator');
    const toolbar = document.getElementById('toolbar'); // ツールバーの高さを取得するため

    // --- 状態 ---
    let isDrawing = false; // 描画中かどうかのフラグ
    let dpr = window.devicePixelRatio || 1; // 高解像度ディスプレイ対応
    
    // ======[修正箇所 (ページ状態)]======
    let currentPageIndex = 0;
    let pageDrawings = []; // 全ページの「絵」を保存する金庫 (DataURL文字列の配列)
    // ======[修正ここまで]======


    // --- 描画設定 (初期化時にまとめて設定) ---
    function applyContextSettings() {
        ctx.strokeStyle = 'black'; // 線の色
        ctx.lineWidth = 5;         // 線の太さ (PoCのため固定)
        ctx.lineCap = 'round';     // 線の先端を丸く
        ctx.lineJoin = 'round';    // 線の接合点を丸く
    }


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
        
        // ======[修正箇所 (ボタンイベント)]======
        // 前のページへ
        btnPrev.addEventListener('click', () => {
            if (currentPageIndex > 0) {
                saveCurrentPage(); // (1) 現在の絵を保存
                loadPage(currentPageIndex - 1); // (2) 前のページを読み込む
            }
        });

        // 次のページへ
        btnNext.addEventListener('click', () => {
            saveCurrentPage(); // (1) 現在の絵を保存
            loadPage(currentPageIndex + 1); // (2) 次のページを読み込む
        });
        
        // このページを消去
        btnClear.addEventListener('click', () => {
            const cssWidth = canvas.width / dpr;
            const cssHeight = canvas.height / dpr;
            ctx.clearRect(0, 0, cssWidth, cssHeight); // キャンバスをまっさらに
            saveCurrentPage(); // まっさらな状態を保存
        });
        // ======[修正ここまで]======
    }
    
    
    // ======[修正箇所 (コアロジック新設)]======
    
    // [中核ロジック 1] 現在のキャンバスを「画像データ」として保存
    function saveCurrentPage() {
        try {
            // 現在のキャンバスの状態をPNG画像データ(文字列)として取得
            const dataURL = canvas.toDataURL();
            // 金庫(配列)の現在のページ番号の位置に保存
            pageDrawings[currentPageIndex] = dataURL;
        } catch (e) {
            console.error("キャンバスの保存に失敗しました。", e);
        }
    }

    // [中核ロジック 2] 指定ページの「画像データ」をキャンバスに復元
    function loadPage(index) {
        // キャンバスのCSS上のサイズを取得 (clearRectやdrawImageで使う)
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        
        // (1) まずキャンバスをまっさらに消去
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        
        // (2) 金庫から指定ページの画像データ(文字列)を取り出す
        const imgString = pageDrawings[index];
        
        if (imgString) {
            // (3) 画像データがあれば、それを復元する
            const img = new Image();
            img.onload = () => {
                // 画像の読み込み完了後に、キャンバスに描画(貼り付け)
                ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
            };
            img.src = imgString; // 画像ソースとして設定
        }
        
        // (4) 現在のページ番号を更新
        currentPageIndex = index;
        
        // (5) UI（ページ番号やボタン）を更新
        updateUI();
    }

    // [中核ロジック 3] UI（ページ番号やボタン）の更新
    function updateUI() {
        pageIndicator.textContent = `${currentPageIndex + 1}`;
        // 0ページ目なら「前へ」ボタンを無効化
        btnPrev.disabled = (currentPageIndex === 0);
    }
    // ======[修正ここまで]======


    // ======[修正箇所 (resizeCanvas)]======
    // --- キャンバスリサイズ処理 ---
    function resizeCanvas() {
        // [重要] リサイズでキャンバスが消える前に、現在の内容を保存
        saveCurrentPage();
        
        dpr = window.devicePixelRatio || 1;
        
        // ツールバーの高さを考慮
        const toolbarHeight = toolbar.clientHeight || 40;
        const cssWidth = window.innerWidth;
        const cssHeight = window.innerHeight - toolbarHeight; // ツールバー分を引く

        // (1) キャンバスの「見た目」のサイズ (CSSピクセル) を設定
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        
        // (2) キャンバスの「解像度」 (物理ピクセル) を設定
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        
        // (3) DRPに合わせて描画スケールも調整
        ctx.scale(dpr, dpr);

        // (4) リセットされた線の設定を再適用
        applyContextSettings();
        
        // [重要] リサイズ後に、保存しておいた内容を再読み込み
        loadPage(currentPageIndex);
    }
    // ======[修正ここまで]======


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
        ctx.beginPath(); // 新しいパスを開始
        ctx.moveTo(x, y);  // ペンを(x, y)に移動
        canvas.setPointerCapture(e.pointerId);
    }

    // 描画中
    function onPointerMove(e) {
        if (!isDrawing) return; // 押されていなければ何もしない
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y); // 現在位置から(x, y)まで線を引く
        ctx.stroke();     // 線を描画
    }

    // 描画終了
    function onPointerUp(e) {
        if (!isDrawing) return;
        isDrawing = false;
        
        // [重要] 描画が終わった瞬間、現在のページ内容を「上書き保存」する
        // これをしないと、ページを切り替えた時に「描き途中の絵」が消えてしまう
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