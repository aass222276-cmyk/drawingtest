document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');

    // --- 状態 ---
    let isDrawing = false; // 描画中かどうかのフラグ
    let dpr = window.devicePixelRatio || 1; // 高解像度ディスプレイ対応

    // --- 描画設定 (初期化時にまとめて設定) ---
    function applyContextSettings() {
        ctx.strokeStyle = 'black'; // 線の色
        ctx.lineWidth = 5;         // 線の太さ (PoCのため固定)
        ctx.lineCap = 'round';     // 線の先端を丸く
        ctx.lineJoin = 'round';    // 線の接合点を丸く
    }


    // --- 初期化 ---
    function init() {
        // キャンバスの解像度をDPRに合わせて調整
        resizeCanvas();

        // --- イベントリスナー ---
        // 描画開始 (指/マウスが押された)
        canvas.addEventListener('pointerdown', onPointerDown);
        // 描画中 (指/マウスが動いた)
        canvas.addEventListener('pointermove', onPointerMove);
        // 描画終了 (指/マウスが離れた)
        canvas.addEventListener('pointerup', onPointerUp);
        // 描画キャンセル (指/マウスが画面外に出たなど)
        canvas.addEventListener('pointercancel', onPointerCancel);
        
        // ウィンドウリサイズ時にも解像度を調整
        window.addEventListener('resize', resizeCanvas);
    }

    // ======[修正箇所 (resizeCanvas)]======
    // --- キャンバスリサイズ処理 ---
    function resizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        
        // [修正] 基準を getBoundingClientRect ではなく window の内側サイズにする
        const cssWidth = window.innerWidth;
        const cssHeight = window.innerHeight;

        // (1) キャンバスの「見た目」のサイズ (CSSピクセル) を設定
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        
        // (2) キャンバスの「解像度」 (物理ピクセル) を設定
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        
        // (3) DRPに合わせて描画スケールも調整
        // ※ canvas.width/height を設定するとcontextがリセットされるため、
        //    必ずこの位置で scale し直す必要がある
        ctx.scale(dpr, dpr);

        // (4) リセットされた線の設定を再適用
        applyContextSettings();
    }
    // ======[修正ここまで]======


    // --- 座標取得ヘルパー ---
    function getCoords(e) {
        // [修正] resizeCanvas で canvas のCSSサイズを window に
        //        一致させたため、rect.left/top は 0 (またはそれに近い値) になるはず。
        //        この計算方法 (clientY - rect.top) が正しく機能するようになる。
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top)
        };
    }

    // --- イベントハンドラ ---

    // 描画開始
    function onPointerDown(e) {
        isDrawing = true;
        const { x, y } = getCoords(e);
        
        ctx.beginPath(); // 新しいパスを開始
        ctx.moveTo(x, y);  // ペンを(x, y)に移動
        
        // [重要] スムーズな描画のためにポインタをキャプチャ
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
        
        // キャプチャを解放
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