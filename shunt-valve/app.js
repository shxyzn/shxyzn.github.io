'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const views = ['ap', 'lateral'];
  let mode = 'sample', currentStep = 0, running = false, runId = 0, toastId;
  const selected = {ap: null, lateral: null};
  const versions = {ap: 0, lateral: 0};
  function fitImages() {
    views.forEach(view => {
      const img = $(view + '-image'), frame = $(view + '-frame'), area = frame.parentElement;
      if (!img.naturalWidth || !img.naturalHeight || frame.hidden) return;
      const scale = Math.min(area.clientWidth / img.naturalWidth, area.clientHeight / img.naturalHeight);
      frame.style.width = img.naturalWidth * scale + 'px';
      frame.style.height = img.naturalHeight * scale + 'px';
    });
  }
  const descriptions = [
    '정면·측면 영상 한 쌍을 입력합니다.',
    '각 영상에서 밸브의 위치와 회전 방향을 확인합니다. (예시 위치)',
    '원본 AP 내 밸브 위치를 이용해 방향을 통일합니다.',
    '정렬된 두 영상의 정보를 통합하여 조절 단계를 표시합니다. (시연용 고정값)'
  ];
  function toast(message) { clearTimeout(toastId); $('toast').textContent = message; $('toast').hidden = false; toastId = setTimeout(() => $('toast').hidden = true, 4200); }
  function cancelRun() { runId++; running = false; document.querySelectorAll('.viewer').forEach(v => v.classList.remove('scanning')); }
  function showStep(step) {
    currentStep = step;
    const sample = mode === 'sample';
    document.querySelectorAll('.viewer').forEach(v => v.classList.toggle('show-detection', sample && step >= 1));
    $('alignment').hidden = !sample || step < 2;
    const complete = sample && step === 3;
    $('level').textContent = complete ? '1.0' : '—';
    document.querySelectorAll('.levels>span').forEach((el, i) => el.classList.toggle('selected', complete && i === 1));
    $('status').textContent = sample ? (running ? '시연 중' : (complete ? '시연 완료' : '준비 완료')) : '미리보기';
    $('status').classList.toggle('complete', complete);
    $('location').textContent = sample && step >= 1 ? '원본 AP의 오른쪽' : '—';
    $('orientation').textContent = sample && step >= 2 ? '정렬 완료 · 예시' : '—';
    $('result-hint').textContent = sample ? (complete ? 'PL 1.0은 시연을 위해 지정한 값입니다.' : '예시를 실행하면 결과 표시 방식이 나타납니다.') : '직접 올린 영상은 미리보기만 지원합니다.';
    $('viewer-note').lastChild.textContent = sample ? (step >= 1 ? '초록색 상자: 사전 설정된 밸브 영역 · 실제 검출 결과가 아님' : '밸브 영역은 예시 실행 후 표시됩니다.') : '이 영상에는 검출·분류 결과를 생성하지 않습니다.';
    $('step-caption').textContent = sample ? descriptions[step] : '실제 추론은 연결되어 있지 않습니다. 예시 불러오기로 사용 흐름을 확인하세요.';
    $('run').disabled = !sample || running;
    $('run-label').textContent = sample ? (running ? '분석 흐름 시연 중…' : (complete ? '다시 실행' : '예시 분석 실행')) : 'AI 모델 연결 전';
    document.querySelectorAll('.step').forEach((button, i) => {
      button.disabled = !sample;
      button.classList.toggle('active', i === step);
      button.classList.toggle('done', i < step);
      if(i === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function clearSelection() { views.forEach(view => { versions[view]++; selected[view] = null; $(view + '-upload').value = ''; }); }
  function loadSample() {
    cancelRun(); clearSelection(); mode = 'sample'; $('uploads').hidden = true;
    $('case-title').innerHTML = 'EXAMPLE 01 <span>가상 X-ray 도식</span>';
    $('pair-count').textContent = 'AP + Lateral · 2 views';
    views.forEach(view => {
      const image = $(view + '-image'); image.src = 'assets/' + view + '.svg'; image.alt = '션트 밸브가 표시된 설명용 ' + (view === 'ap' ? '정면' : '측면') + ' X-ray 도식';
      $(view + '-frame').hidden = false;
      $(view + '-viewer').querySelector('.empty-image').hidden = true;
      $(view + '-file').textContent = 'example_' + view + '.svg';
      document.querySelector('[data-view="' + view + '"]').disabled = false;
    }); showStep(0); requestAnimationFrame(fitImages);
  }
  function openCustom() {
    cancelRun(); mode = 'custom'; clearSelection(); $('uploads').hidden = false;
    $('case-title').textContent = 'LOCAL PREVIEW · 내 영상'; $('pair-count').textContent = '0 / 2 images';
    views.forEach(view => { $(view + '-frame').hidden = true; $(view + '-viewer').querySelector('.empty-image').hidden = false; $(view + '-file').textContent = '선택된 영상 없음'; document.querySelector('[data-view="' + view + '"]').disabled = true; });
    showStep(0);
  }
  async function run() {
    if (mode !== 'sample' || running) return;
    cancelRun(); running = true; const id = runId; showStep(0);
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    await pause(350); if (id !== runId) return;
    document.querySelectorAll('.viewer').forEach(v => v.classList.add('scanning'));
    await pause(950); if (id !== runId) return;
    document.querySelectorAll('.viewer').forEach(v => v.classList.remove('scanning')); showStep(1);
    await pause(900); if (id !== runId) return; showStep(2);
    await pause(1100); if (id !== runId) return; running = false; showStep(3);
  }
  $('run').addEventListener('click', run);
  $('sample').addEventListener('click', loadSample);
  $('custom').addEventListener('click', openCustom);
  $('reset').addEventListener('click', () => mode === 'sample' ? loadSample() : openCustom());
  document.querySelectorAll('.step').forEach(button => button.addEventListener('click', () => { if (mode !== 'sample') return; cancelRun(); showStep(Number(button.dataset.step)); }));
  views.forEach(view => {
    $(view + '-upload').addEventListener('change', async event => {
      const file = event.target.files[0]; if (!file) return;
      const version = ++versions[view];
      if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { event.target.value = ''; toast('PNG, JPG 또는 WebP 이미지를 선택해 주세요.'); return; }
      if (file.size > 15 * 1024 * 1024) { event.target.value = ''; toast('파일당 15 MB 이하의 이미지를 선택해 주세요.'); return; }
      try {
        const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const probe = new Image(); probe.src = data; await probe.decode();
        if (mode !== 'custom' || version !== versions[view]) return;
        if (probe.naturalWidth * probe.naturalHeight > 50000000) { toast('이미지가 너무 큽니다. 5,000만 픽셀 이하의 영상을 선택해 주세요.'); return; }
        selected[view] = file.name;
        $(view + '-image').src = data; $(view + '-image').alt = '사용자가 선택한 ' + (view === 'ap' ? '정면' : '측면') + ' 영상';
        $(view + '-frame').hidden = false; $(view + '-viewer').querySelector('.empty-image').hidden = true;
        $(view + '-file').textContent = file.name; document.querySelector('[data-view="' + view + '"]').disabled = false;
        $('pair-count').textContent = Object.values(selected).filter(Boolean).length + ' / 2 images';
        requestAnimationFrame(fitImages);
      } catch { if(mode === 'custom' && version === versions[view]) { event.target.value = ''; toast('이미지를 열 수 없습니다. 다른 파일을 선택해 주세요.'); } }
    });
  });
  document.querySelectorAll('.expand').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.view; $('large-image').src = $(view + '-image').src;
    $('image-title').textContent = view === 'ap' ? '정면(AP) 영상' : '측면(Lateral) 영상'; $('image-dialog').showModal();
  }));
  $('about').addEventListener('click', () => $('about-dialog').showModal());
  document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));
  $('presentation').addEventListener('click', async () => { try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('브라우저의 전체 화면 기능(F11)을 사용해 주세요.'); } });
  document.addEventListener('fullscreenchange', () => { $('presentation').innerHTML = document.fullscreenElement ? '전체 화면 종료 <span aria-hidden="true">⛶</span>' : '발표 화면 <span aria-hidden="true">⛶</span>'; });
  views.forEach(view => $(view + '-image').addEventListener('load', fitImages));
  new ResizeObserver(fitImages).observe(document.querySelector('.viewers'));
  loadSample();
})();
