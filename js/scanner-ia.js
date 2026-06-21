/* APP BRAGA v1.33.4 - Scanner IA Foto para PDF */
(function(){
  'use strict';

  const state = {
    original: null,
    processed: null,
    rotation: 0,
    lastFileName: '',
    ocrText: ''
  };

  const $ = (id) => document.getElementById(id);
  const els = {};

  function setStatus(message, type){
    if (!els.status) return;
    els.status.textContent = message;
    els.status.dataset.type = type || 'info';
  }

  function normalizeFileName(value){
    const base = String(value || 'Scanner_App_Braga').trim() || 'Scanner_App_Braga';
    return base
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Scanner_App_Braga';
  }

  function todayName(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `Documento_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function ensureCanvas(){
    if (!els.canvas) return null;
    return els.canvas;
  }

  function loadImage(file){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function fitDimensions(w, h, maxSide){
    const scale = Math.min(1, maxSide / Math.max(w,h));
    return { w: Math.round(w * scale), h: Math.round(h * scale), scale };
  }

  function drawImageToCanvas(img){
    const canvas = ensureCanvas();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const maxSide = 1800;
    const dims = fitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxSide);
    canvas.width = dims.w;
    canvas.height = dims.h;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    state.original = ctx.getImageData(0,0,canvas.width,canvas.height);
    state.processed = ctx.getImageData(0,0,canvas.width,canvas.height);
    if (els.empty) els.empty.style.display = 'none';
    canvas.hidden = false;
    toggleActions(true);
    autoEnhance();
  }

  function toggleActions(enabled){
    document.querySelectorAll('[data-scanner-action]').forEach(btn => btn.disabled = !enabled);
  }

  function luminance(r,g,b){ return 0.299*r + 0.587*g + 0.114*b; }

  function autoCropBounds(imageData){
    const { width, height, data } = imageData;
    let minX = width, minY = height, maxX = 0, maxY = 0, found = false;
    const step = Math.max(2, Math.floor(Math.max(width,height) / 700));
    for (let y=0; y<height; y+=step){
      for (let x=0; x<width; x+=step){
        const i = (y*width+x)*4;
        const l = luminance(data[i],data[i+1],data[i+2]);
        const sat = Math.max(data[i],data[i+1],data[i+2]) - Math.min(data[i],data[i+1],data[i+2]);
        // Folha/documento: claro, mas não exige branco perfeito.
        if (l > 132 && sat < 110){
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    const margin = Math.round(Math.min(width,height) * 0.015);
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width, maxX + margin);
    maxY = Math.min(height, maxY + margin);
    const cropW = maxX - minX;
    const cropH = maxY - minY;
    if (cropW < width * .35 || cropH < height * .35) return null;
    return {x:minX,y:minY,w:cropW,h:cropH};
  }

  function enhanceImage(imageData){
    const src = imageData.data;
    const out = new ImageData(imageData.width, imageData.height);
    const dst = out.data;
    const contrast = 1.18;
    const brightness = 10;
    for (let i=0; i<src.length; i+=4){
      let r = src[i], g = src[i+1], b = src[i+2];
      r = ((r - 128) * contrast) + 128 + brightness;
      g = ((g - 128) * contrast) + 128 + brightness;
      b = ((b - 128) * contrast) + 128 + brightness;
      const l = luminance(r,g,b);
      // Limpa fundo de folha para PDF mais branco, mantendo texto escuro.
      if (l > 206) { r = g = b = 255; }
      else if (l < 42) { r = g = b = 0; }
      dst[i] = Math.max(0, Math.min(255, r));
      dst[i+1] = Math.max(0, Math.min(255, g));
      dst[i+2] = Math.max(0, Math.min(255, b));
      dst[i+3] = 255;
    }
    return out;
  }

  function autoEnhance(){
    if (!state.original) return;
    const canvas = ensureCanvas();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let source = state.original;
    const shouldCrop = els.autoCrop ? els.autoCrop.checked : true;
    if (shouldCrop) {
      const bounds = autoCropBounds(source);
      if (bounds) {
        const tmp = document.createElement('canvas');
        tmp.width = bounds.w;
        tmp.height = bounds.h;
        tmp.getContext('2d').putImageData(source, -bounds.x, -bounds.y);
        source = tmp.getContext('2d').getImageData(0,0,tmp.width,tmp.height);
      }
    }
    const enhanced = enhanceImage(source);
    canvas.width = enhanced.width;
    canvas.height = enhanced.height;
    ctx.putImageData(enhanced,0,0);
    state.processed = enhanced;
    setStatus('Documento preparado. Podes gerar o PDF.', 'ok');
  }

  function rotateCanvas(){
    const canvas = ensureCanvas();
    if (!canvas || canvas.hidden) return;
    const tmp = document.createElement('canvas');
    tmp.width = canvas.height;
    tmp.height = canvas.width;
    const tctx = tmp.getContext('2d');
    tctx.translate(tmp.width/2, tmp.height/2);
    tctx.rotate(Math.PI/2);
    tctx.drawImage(canvas, -canvas.width/2, -canvas.height/2);
    canvas.width = tmp.width;
    canvas.height = tmp.height;
    canvas.getContext('2d').drawImage(tmp,0,0);
    state.processed = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    setStatus('Imagem rodada.', 'ok');
  }

  function resetImage(){
    if (!state.original) return;
    const canvas = ensureCanvas();
    canvas.width = state.original.width;
    canvas.height = state.original.height;
    canvas.getContext('2d').putImageData(state.original,0,0);
    state.processed = state.original;
    setStatus('Imagem original reposta.', 'info');
  }

  function downloadPdf(){
    const canvas = ensureCanvas();
    if (!canvas || canvas.hidden) return;
    if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
      setStatus('Biblioteca PDF ainda não carregou. Espera uns segundos e tenta novamente.', 'warn');
      return;
    }
    const { jsPDF } = window.jspdf;
    const format = els.format ? els.format.value : 'a4';
    const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const imgW = pageW - margin * 2;
    const imgH = canvas.height * imgW / canvas.width;
    let drawW = imgW;
    let drawH = imgH;
    if (drawH > pageH - margin * 2) {
      drawH = pageH - margin * 2;
      drawW = canvas.width * drawH / canvas.height;
    }
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    pdf.setFillColor(255,255,255);
    pdf.rect(0,0,pageW,pageH,'F');
    pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
    if (state.ocrText && els.includeOcr && els.includeOcr.checked) {
      // Camada discreta de texto em página extra para pesquisa/cópia.
      pdf.addPage(format, 'portrait');
      pdf.setFontSize(12);
      pdf.text('Texto detetado por OCR', 12, 14);
      pdf.setFontSize(9);
      const lines = pdf.splitTextToSize(state.ocrText, pageW - 24);
      pdf.text(lines, 12, 24);
    }
    const fileName = normalizeFileName(els.fileName && els.fileName.value ? els.fileName.value : todayName()) + '.pdf';
    pdf.save(fileName);
    state.lastFileName = fileName;
    saveHistory(fileName);
    setStatus('PDF criado: ' + fileName, 'ok');
  }

  function saveHistory(fileName){
    try {
      const key = 'appBragaScannerIaHistory';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ name:fileName, at:new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list.slice(0,8)));
      renderHistory();
    } catch(e) {}
  }

  function renderHistory(){
    if (!els.history) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem('appBragaScannerIaHistory') || '[]'); } catch(e) {}
    if (!list.length) {
      els.history.innerHTML = '<div class="scanner-history-item"><span>Ainda não há PDFs criados neste dispositivo.</span></div>';
      return;
    }
    els.history.innerHTML = list.map(item => {
      const d = new Date(item.at);
      return `<div class="scanner-history-item"><strong>📄 ${escapeHtml(item.name)}</strong><small>${d.toLocaleString('pt-PT')}</small></div>`;
    }).join('');
  }

  function escapeHtml(s){
    return String(s || '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  function ensureTesseract(){
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function runOcr(){
    const canvas = ensureCanvas();
    if (!canvas || canvas.hidden) return;
    try {
      setStatus('A ler texto com OCR... pode demorar um pouco.', 'info');
      await ensureTesseract();
      const result = await Tesseract.recognize(canvas.toDataURL('image/png'), 'por+eng', { logger: () => {} });
      state.ocrText = (result && result.data && result.data.text ? result.data.text : '').trim();
      if (els.ocrBox) {
        els.ocrBox.hidden = false;
        els.ocrBox.textContent = state.ocrText || 'Não foi possível detetar texto.';
      }
      setStatus(state.ocrText ? 'OCR concluído. Podes gerar PDF com texto.' : 'OCR concluído, mas não encontrou texto.', state.ocrText ? 'ok' : 'warn');
    } catch (error) {
      setStatus('Erro no OCR: ' + (error.message || error), 'warn');
    }
  }

  async function handleFile(file){
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setStatus('Escolhe uma imagem/foto válida.', 'warn');
      return;
    }
    try {
      setStatus('A preparar foto...', 'info');
      if (els.fileName && !els.fileName.value) els.fileName.value = todayName();
      state.ocrText = '';
      if (els.ocrBox) { els.ocrBox.hidden = true; els.ocrBox.textContent = ''; }
      const img = await loadImage(file);
      drawImageToCanvas(img);
    } catch (error) {
      setStatus('Erro ao abrir foto: ' + (error.message || error), 'warn');
    }
  }

  function bind(){
    els.input = $('scannerIaInput');
    els.canvas = $('scannerIaCanvas');
    els.empty = $('scannerIaEmpty');
    els.status = $('scannerIaStatus');
    els.fileName = $('scannerIaFileName');
    els.format = $('scannerIaFormat');
    els.autoCrop = $('scannerIaAutoCrop');
    els.includeOcr = $('scannerIaIncludeOcr');
    els.ocrBox = $('scannerIaOcrBox');
    els.history = $('scannerIaHistory');
    if (!els.input) return;

    els.input.addEventListener('change', (event) => handleFile(event.target.files && event.target.files[0]));
    document.querySelectorAll('[data-scanner-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.scannerAction;
        if (action === 'enhance') autoEnhance();
        if (action === 'rotate') rotateCanvas();
        if (action === 'reset') resetImage();
        if (action === 'pdf') downloadPdf();
        if (action === 'ocr') runOcr();
      });
    });
    if (els.autoCrop) els.autoCrop.addEventListener('change', autoEnhance);
    if (els.fileName && !els.fileName.value) els.fileName.value = todayName();
    toggleActions(false);
    renderHistory();
    setStatus('Pronto. Tira foto à folha A4 ou escolhe uma imagem.', 'info');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
