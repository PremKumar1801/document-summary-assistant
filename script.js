// folio — client-side PDF/image summarizer (pdf.js + tesseract.js, no server involved)

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filebar = document.getElementById('filebar');
const filenameEl = document.getElementById('filename');
const clearFileBtn = document.getElementById('clearFile');
const goBtn = document.getElementById('goBtn');
const statusEl = document.getElementById('status');
const statusText = document.getElementById('statusText');
const errorBox = document.getElementById('errorBox');
const result = document.getElementById('result');
const summaryTextEl = document.getElementById('summaryText');
const statsLine = document.getElementById('statsLine');
const keywordsEl = document.getElementById('keywords');
const copyBtn = document.getElementById('copyBtn');
const lengthSelect = document.getElementById('lengthSelect');

let currentFile = null;
let summaryLength = 'medium';

const LENGTH_RATIOS = { short: 0.12, medium: 0.25, long: 0.45 };
const STOPWORDS = new Set("a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves".split(" "));

function showError(msg){
  errorBox.textContent = msg;
  errorBox.classList.add('active');
}
function clearError(){
  errorBox.textContent = '';
  errorBox.classList.remove('active');
}
function setStatus(msg){
  statusText.textContent = msg;
  statusEl.classList.add('active');
}
function hideStatus(){
  statusEl.classList.remove('active');
}

['dragenter','dragover'].forEach(evt=>{
  dropzone.addEventListener(evt, e=>{
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('dragover');
  });
});
['dragleave','drop'].forEach(evt=>{
  dropzone.addEventListener(evt, e=>{
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', e=>{
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f);
});
dropzone.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e=>{
  if(e.target.files[0]) handleFile(e.target.files[0]);
});
clearFileBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  currentFile = null;
  fileInput.value = '';
  filebar.style.display = 'none';
  goBtn.disabled = true;
  result.classList.remove('active');
  clearError();
});

function handleFile(f){
  clearError();
  const okTypes = ['application/pdf','image/png','image/jpeg','image/webp'];
  if(!okTypes.includes(f.type)){
    showError("Can't read that file type — stick to PDF, PNG, or JPG.");
    return;
  }
  if(f.size > 25 * 1024 * 1024){
    showError("That file's too big — 25MB max for now.");
    return;
  }
  currentFile = f;
  filenameEl.textContent = f.name + '  ·  ' + (f.size/1024/1024).toFixed(2) + ' MB';
  filebar.style.display = 'flex';
  goBtn.disabled = false;
  result.classList.remove('active');
}

lengthSelect.addEventListener('click', e=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  summaryLength = btn.dataset.len;
  [...lengthSelect.children].forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
});

goBtn.addEventListener('click', async ()=>{
  if(!currentFile) return;
  clearError();
  result.classList.remove('active');
  goBtn.disabled = true;
  try{
    let text = '';
    if(currentFile.type === 'application/pdf'){
      setStatus('Extracting text from PDF…');
      text = await extractPdfText(currentFile);
      if(!text.trim()){
        setStatus('No selectable text found — running OCR on pages…');
        text = await ocrPdfFallback(currentFile);
      }
    } else {
      setStatus('Running OCR on image…');
      text = await ocrImage(currentFile);
    }

    if(!text || text.trim().length < 20){
      throw new Error("Couldn't pull enough readable text out of this one.");
    }

    setStatus('Generating summary…');
    const { summary, keywords, sentenceCount, wordCount } = summarize(text, summaryLength);
    renderResult(summary, keywords, wordCount, text.split(/\s+/).filter(Boolean).length);

  }catch(err){
    console.error(err);
    showError(err.message || 'Something broke while processing that — try again?');
  }finally{
    hideStatus();
    goBtn.disabled = false;
  }
});

async function extractPdfText(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for(let i=1; i<=pdf.numPages; i++){
    setStatus('Reading page ' + i + ' of ' + pdf.numPages + '…');
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(it=>it.str).join(' ');
    text += pageText + '\n\n';
  }
  return text;
}

async function ocrPdfFallback(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  const maxPages = Math.min(pdf.numPages, 8); // scanned PDFs can run long — cap it so a 40-page scan doesn't lock up the tab
  for(let i=1; i<=maxPages; i++){
    setStatus('OCR on page ' + i + ' of ' + maxPages + '…');
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const { data } = await Tesseract.recognize(canvas, 'eng');
    text += data.text + '\n\n';
  }
  return text;
}

async function ocrImage(file){
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: m=>{
      if(m.status === 'recognizing text'){
        setStatus('Running OCR… ' + Math.round(m.progress*100) + '%');
      }
    }
  });
  return data.text;
}

// extractive summary, not a real NLP model — score each sentence by how many
// "important" (non-stopword) terms it has, then keep the top-scoring sentences
// in their original order so the result still reads top to bottom.
function summarize(rawText, length){
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  // naive split on . ! ? — trips up on things like "Dr." or "e.g." but good enough here
  const sentences = cleaned.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleaned];
  const trimmedSentences = sentences.map(s=>s.trim()).filter(s=>s.length > 3);

  const wordFreq = {};
  const words = cleaned.toLowerCase().match(/[a-z']+/g) || [];
  words.forEach(w=>{
    if(STOPWORDS.has(w) || w.length < 3) return;
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });

  const scored = trimmedSentences.map((s, idx)=>{
    const sWords = s.toLowerCase().match(/[a-z']+/g) || [];
    let score = 0;
    sWords.forEach(w=>{ if(wordFreq[w]) score += wordFreq[w]; });
    const normScore = sWords.length ? score / sWords.length : 0;
    // slight boost for early sentences (lede) and penalize very long/short sentences
    const posBoost = idx < 3 ? 1.15 : 1;
    return { text: s, score: normScore * posBoost, idx };
  });

  const ratio = LENGTH_RATIOS[length] || 0.25;
  const targetCount = Math.max(2, Math.round(trimmedSentences.length * ratio));
  const top = [...scored].sort((a,b)=>b.score - a.score).slice(0, targetCount);
  const ordered = top.sort((a,b)=>a.idx - b.idx);

  const topKeywords = Object.entries(wordFreq)
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 8)
    .map(([w])=>w);

  const summaryHtml = ordered.map(s=>{
    let sentence = s.text;
    topKeywords.forEach(kw=>{
      const re = new RegExp('\\b(' + kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')\\b', 'gi');
      sentence = sentence.replace(re, '<mark>$1</mark>');
    });
    return sentence;
  }).join(' ');

  return {
    summary: summaryHtml,
    keywords: topKeywords,
    sentenceCount: ordered.length,
    wordCount: ordered.reduce((acc,s)=>acc + (s.text.split(/\s+/).length), 0)
  };
}

function renderResult(summaryHtml, keywords, summaryWordCount, originalWordCount){
  summaryTextEl.innerHTML = summaryHtml;
  const reduction = originalWordCount > 0 ? Math.round((1 - summaryWordCount/originalWordCount) * 100) : 0;
  statsLine.textContent = originalWordCount + ' words → ' + summaryWordCount + ' words  ·  ' + reduction + '% shorter';
  keywordsEl.innerHTML = '';
  keywords.forEach(k=>{
    const span = document.createElement('span');
    span.textContent = k;
    keywordsEl.appendChild(span);
  });
  result.classList.add('active');
}

copyBtn.addEventListener('click', ()=>{
  const text = summaryTextEl.innerText;
  navigator.clipboard.writeText(text).then(()=>{
    copyBtn.textContent = 'Copied ✓';
    setTimeout(()=> copyBtn.textContent = 'Copy summary', 1500);
  });
});