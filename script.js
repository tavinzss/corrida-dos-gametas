// ===== Firebase SDK modular (v9) via CDN =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js"; // <- REMOVIDO p/ evitar erro em file://
import {
  getDatabase, ref, set, update, remove,
  onValue, get, runTransaction, onDisconnect, off
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

/* ========================
   CONFIGURAÇÕES DO JOGO
======================== */
const HOST_PIN = "1234";               // <<< TROQUE o PIN do host
const QUESTION_TIME = 20;              // Tempo por pergunta (segundos)
const AUTO_ADVANCE_DELAY = 1200;       // Aguardar após responder (ms)
const FALLBACK_ADVANCE_DELAY = 2000;   // Fallback do host p/ avançar (ms) se algo falhar
const GAME_ID = "sala1";               // Sala
/* ======================== */

const firebaseConfig = {
  apiKey: "AIzaSyBAeg6QQxddTFJcj_G_H_nd6pZFZCXqmDs",
  authDomain: "corrida-dos-gametas-1f088.firebaseapp.com",
  databaseURL: "https://corrida-dos-gametas-1f088-default-rtdb.firebaseio.com/",
  projectId: "corrida-dos-gametas-1f088",
  storageBucket: "corrida-dos-gametas-1f088.appspot.com",
  messagingSenderId: "1014763904289",
  appId: "1:1014763904289:web:b95ba3d5ff299a2c15b260",
  measurementId: "G-MZZNSV211V"
};

// ===== Inicializa Firebase =====
const app = initializeApp(firebaseConfig);
// getAnalytics(app); // <- DESABILITADO para evitar erros em ambientes sem suporte
const db = getDatabase(app);

// ===== Estado local =====
const gameId = GAME_ID;
let playerId = null;
let perguntaIndex = 0;
let timerInterval = null;
let answeredThisRound = false;
let isHost = false;

// Controle do listener de rodada
let qRef = null;
let qCb = null;

// Perguntas (exemplo)
// ===== 15 PERGUNTAS (com pegadinhas) =====
// Formato: { pergunta: "...", opcoes: ["A","B","C","D"], resposta: <índice da correta em opcoes> }
const perguntas = [
  {
    pergunta: "O que é DNA?",
    opcoes: [
      "Ácido ribonucleico (molécula que participa da síntese proteica)",
      "Proteína estrutural que forma os cromossomos",
      "Carboidrato que compõe a parede celular",
      "Ácido desoxirribonucleico (molécula que armazena informação genética)"
    ],
    resposta: 3
  },
  {
    pergunta: "Nas células cancerosas, a multiplicação descontrolada ocorre principalmente por qual divisão celular?",
    opcoes: [
      "Meiose",
      "Amitose (divisão direta típica de eucariotos)",
      "Mitose",
      "Citoquinese sem mitose"
    ],
    resposta: 2
  },
  {
    pergunta: "Bases púricas (purinas) se diferenciam das pirimídicas por:",
    opcoes: [
      "Possuírem um anel; exemplos: adenina e uracila",
      "Possuírem dois anéis; exemplos: adenina e guanina",
      "Serem menores e fazerem sempre 3 ligações de H",
      "Parearem apenas com outras purinas"
    ],
    resposta: 1
  },
  {
    pergunta: "No DNA, o pareamento com TRÊS ligações de hidrogênio ocorre entre:",
    opcoes: [
      "Adenina e Timina",
      "Adenina e Citosina",
      "Guanina e Citosina",
      "Guanina e Timina"
    ],
    resposta: 2
  },
  {
    pergunta: "A implantação (nidação) do blastocisto no endométrio ocorre em qual período do desenvolvimento?",
    opcoes: [
      "Embrionário (3ª a 8ª semanas)",
      "Perinatal (apenas no parto)",
      "Pré-embriônico (até ~2 semanas)",
      "Fetal (da 9ª semana ao nascimento)"
    ],
    resposta: 2
  },
  {
    pergunta: "A organogênese inicial (gastrulação e neurulação) caracteriza principalmente o período:",
    opcoes: [
      "Pré-embriônico (1ª e 2ª semanas)",
      "Embrionário (3ª a 8ª semanas)",
      "Fetal (9ª semana em diante)",
      "Pós-natal"
    ],
    resposta: 1
  },
  {
    pergunta: "Resultado típico da MITOSE em células somáticas é:",
    opcoes: [
      "Quatro células 2n idênticas",
      "Duas células 2n geneticamente idênticas",
      "Duas células n diferentes entre si",
      "Quatro células n idênticas"
    ],
    resposta: 1
  },
  {
    pergunta: "Resultado típico da MEIOSE (formação de gametas) é:",
    opcoes: [
      "Quatro células haploides geneticamente diferentes",
      "Duas células diploides idênticas",
      "Quatro células diploides diferentes",
      "Duas células haploides idênticas"
    ],
    resposta: 0
  },
  {
    pergunta: "Local MAIS comum da fecundação humana:",
    opcoes: [
      "Trompa de Eustáquio (ouvido)",
      "Útero (cavidade uterina)",
      "Trompa de Falópio (tuba uterina)",
      "Ovário"
    ],
    resposta: 2
  },
  {
    pergunta: "Sobre DNA × RNA, assinale a alternativa CORRETA:",
    opcoes: [
      "Ambos possuem timina e uracila",
      "O RNA é exclusivamente dupla-hélice nas células",
      "RNA possui uracila; DNA possui timina",
      "DNA possui ribose; RNA possui desoxirribose"
    ],
    resposta: 2
  },
  {
    pergunta: "O disco embrionário BILAMINAR é formado por:",
    opcoes: [
      "Ectoderma e Mesoderma",
      "Epiblasto e Hipoblasto",
      "Mesoderma e Endoderma",
      "Ectoderma e Endoderma"
    ],
    resposta: 1
  },
  {
    pergunta: "Função marcante da NOTOCORDA durante o desenvolvimento inicial:",
    opcoes: [
      "Produz hormônios para manter o corpo lúteo",
      "Define o eixo corporal e induz a formação da placa neural",
      "Origina diretamente o sistema nervoso central",
      "Diferencia-se no miocárdio do coração"
    ],
    resposta: 1
  },
  {
    pergunta: "A neurulação culmina, principalmente, na formação de qual estrutura?",
    opcoes: [
      "Saco vitelino secundário",
      "Tubo neural",
      "Crista ilíaca",
      "Ducto deferente"
    ],
    resposta: 1
  },
  {
    pergunta: "Quanto à notação de alelos, os genótipos Aa e aa correspondem, respectivamente, a:",
    opcoes: [
      "Homozigoto recessivo; homozigoto dominante",
      "Heterozigoto; homozigoto recessivo",
      "Homozigoto dominante; heterozigoto",
      "Heterozigoto; heterozigoto"
    ],
    resposta: 1
  },
  {
    pergunta: "Sobre agentes teratogênicos, o período de MAIOR risco para malformações é, em geral:",
    opcoes: [
      "O primeiro trimestre (formação de órgãos)",
      "A semana do parto",
      "As duas primeiras horas após a fecundação",
      "O segundo trimestre (crescimento fetal)"
    ],
    resposta: 0
  }
];

// ===== Helpers UI =====
function showScreen(screenId){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove('show'));
  document.getElementById(screenId).classList.add('show');
}
function lockOptions() {
  document.querySelectorAll("#options .option-btn").forEach(b => b.disabled = true);
}
function unlockOptions() {
  document.querySelectorAll("#options .option-btn").forEach(b => b.disabled = false);
}
function renderPlayers(players){
  const list = document.getElementById("playersList");
  const playersCount = Object.keys(players).length;
  const playersInfo = document.getElementById("playersInfo");
  if (playersInfo) playersInfo.innerHTML = `Jogadores: <strong>${playersCount}</strong>`;
  list.innerHTML = "";
  Object.values(players).forEach(p=>{
    const li = document.createElement("li");
    li.innerText = `${p.name} (${p.gamete}) — ${p.position || 0} ponto(s)`;
    list.appendChild(li);
  });
}
function clearTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  const bar = document.getElementById("timerBar");
  if (bar) bar.style.transform = 'scaleX(1)';
  const t = document.getElementById("timerText");
  if (t) t.textContent = 'Tempo: —';
}
function setRoundInfo(){
  const total = perguntas.length;
  const el = document.getElementById("roundInfo");
  if (el) el.innerHTML = `Rodada: <strong>${Math.min(perguntaIndex+1,total)} / ${total}</strong>`;
}
function setHostBadge(){
  const el = document.getElementById("hostInfo");
  if (el) el.innerHTML = `Status: <strong>${isHost ? 'Host' : 'Jogador'}</strong>`;
}
function toast(msg, kind=''){
  const fb = document.getElementById('feedback');
  if (!fb) return;
  fb.textContent = msg || '';
  fb.style.color = kind === 'ok' ? '#86efac' : kind === 'warn' ? '#fde68a' : '#d1d5db';
}

// ===== Inicializa nó do jogo se não existir =====
(async function initGameNode(){
  const roomEl = document.getElementById("roomInfo");
  if (roomEl) roomEl.innerHTML = `Sala: <strong>${gameId}</strong>`;
  const snap = await get(ref(db, `games/${gameId}`));
  if (!snap.exists()) {
    await set(ref(db, `games/${gameId}`), {
      state: "waiting",
      currentQuestion: 0,
      host: null,
      players: {},
      answers: {}
    });
  }
})();

/** RESET DE SALA — garante estado limpo para iniciar (automático) */
async function resetSalaSeNecessario() {
  const [stateSnap, qSnap, playersSnap] = await Promise.all([
    get(ref(db, `games/${gameId}/state`)),
    get(ref(db, `games/${gameId}/currentQuestion`)),
    get(ref(db, `games/${gameId}/players`))
  ]);

  const state = stateSnap.exists() ? stateSnap.val() : "waiting";
  const curQ = qSnap.exists() ? Number(qSnap.val()) : 0;
  const totalQs = perguntas.length;

  const precisaReset =
    state === "finished" ||
    curQ >= totalQs || curQ < 0 || (state !== "waiting" && state !== "started");

  if (precisaReset) {
    await update(ref(db, `games/${gameId}`), {
      state: "waiting",
      currentQuestion: 0,
      answers: {}
    });
  } else {
    const temPlayers = playersSnap.exists() && playersSnap.numChildren() > 0;
    if (state === "started" && !temPlayers) {
      await update(ref(db, `games/${gameId}`), {
        state: "waiting",
        currentQuestion: 0,
        answers: {}
      });
    }
  }
}

/** RESET MANUAL (botão do host) */
async function resetSalaManual(){
  if (!isHost) { alert("Apenas o host pode resetar a sala."); return; }
  if (!confirm("Resetar a sala? Zera rodada e pontuações.")) return;

  try {
    clearTimer();

    // Zera posições
    const playersSnap = await get(ref(db, `games/${gameId}/players`));
    if (playersSnap.exists()) {
      const updates = {};
      playersSnap.forEach(ch => { updates[`${ch.key}/position`] = 0; });
      if (Object.keys(updates).length) {
        await update(ref(db, `games/${gameId}/players`), updates);
      }
    }

    // Limpa respostas e volta estado
    await update(ref(db, `games/${gameId}`), {
      state: "waiting",
      currentQuestion: 0,
      answers: {}
    });

    showScreen("lobbyScreen");
    toast('');
  } catch (e) {
    console.error("[resetSalaManual] ", e);
    alert("Falha ao resetar. Veja o console.");
  }
}

/** Assumir Host via PIN (robusto, sem alertar erro genérico) */
async function claimHost() {
  const pinInput = document.getElementById("hostPinInput");
  const pin = (pinInput?.value || "").trim();
  if (!pin) { alert("Digite o PIN do host."); return; }
  if (pin !== HOST_PIN) { alert("PIN incorreto."); return; }

  const hostRef = ref(db, `games/${gameId}/host`);
  try {
    const res = await runTransaction(hostRef, (cur) => cur || playerId);
    const nowHost = res.committed && res.snapshot.val() === playerId;
    if (nowHost) {
      try { onDisconnect(hostRef).set(null); } catch (e) { console.warn("[onDisconnect] aviso:", e); }
      alert("Você agora é o host.");
      isHost = true;
      setHostBadge();
      await resetSalaSeNecessario();
    } else {
      alert("Já existe um host ativo.");
    }
  } catch (e) {
    console.error("[claimHost] ", e);
    // Evita alerta duplo chato; só loga no console
  }
}
window.claimHost = claimHost;

// ===== Entrar no lobby =====
async function joinLobby(gamete){
  const name = document.getElementById("playerName").value.trim();
  if(!name){ alert("Digite seu nome"); return; }

  playerId = 'p_' + Date.now(); // em produção prefira auth.uid

  await set(ref(db, `games/${gameId}/players/${playerId}`), { name, gamete, position: 0 });
  onDisconnect(ref(db, `games/${gameId}/players/${playerId}`)).remove();

  const hostRef = ref(db, `games/${gameId}/host`);
  onValue(hostRef, async (snap) => {
    const hostNow = snap.val();
    isHost = hostNow === playerId;

    // UI de host
    const resetBtn = document.getElementById("resetBtn");
    const startBtn = document.getElementById("startBtn");
    if (resetBtn) resetBtn.style.display = isHost ? "inline-block" : "none";
    if (startBtn) startBtn.style.display = isHost ? "inline-block" : "none";
    const claimBtn = document.getElementById("claimHostBtn");
    if (claimBtn) claimBtn.disabled = !!hostNow && !isHost;

    setHostBadge();
    if (isHost) await resetSalaSeNecessario();
  });

  showScreen("lobbyScreen");

  // lista de jogadores
  onValue(ref(db, `games/${gameId}/players`), (snapshot)=>{
    renderPlayers(snapshot.val() || {});
  });

  // estado do jogo
  onValue(ref(db, `games/${gameId}/state`), (snapshot)=>{
    const state = snapshot.val();
    clearTimer();

    if(state === "started"){
      // Listener de currentQuestion ATIVO durante o jogo
      if (qRef && qCb) { off(qRef, 'value', qCb); qRef = null; qCb = null; }
      qRef = ref(db, `games/${gameId}/currentQuestion`);
      qCb = () => showPergunta();
      onValue(qRef, qCb);

      showPergunta();
    } else {
      // Fora do jogo: remove listener
      if (qRef && qCb) { off(qRef, 'value', qCb); qRef = null; qCb = null; }

      if(state === "waiting"){
        showScreen("lobbyScreen");
        toast('');
      } else if(state === "finished"){
        showPodium();
      }
    }
  });
}
window.joinLobby = joinLobby;

// ===== Host: iniciar jogo =====
async function startGame(){
  if (!isHost) { alert("Apenas o host pode iniciar."); return; }
  await update(ref(db, `games/${gameId}`), {
    state: "started",
    currentQuestion: 0,
    answers: {}
  });
}
window.startGame = startGame;

// ===== Timer com barra de progresso =====
function startTimer(){
  let timeLeft = QUESTION_TIME;
  const bar = document.getElementById("timerBar");
  const t = document.getElementById("timerText");

  clearTimer();
  t.textContent = `Tempo: ${timeLeft}s`;
  bar.style.transform = 'scaleX(1)';

  timerInterval = setInterval(()=>{
    timeLeft--;
    t.textContent = `Tempo: ${timeLeft}s`;
    const ratio = Math.max(0, timeLeft / QUESTION_TIME);
    bar.style.transform = `scaleX(${ratio})`;
    if(timeLeft <= 0){
      clearTimer();
      lockOptions();
      if (!answeredThisRound) registrarResposta(-1);
      if (isHost) setTimeout(avancarPergunta, AUTO_ADVANCE_DELAY);
    }
  }, 1000);
}

// ===== Exibir pergunta =====
async function showPergunta(){
  showScreen("questionScreen");
  clearTimer();
  answeredThisRound = false;
  toast('');

  const snap = await get(ref(db, `games/${gameId}/currentQuestion`));
  perguntaIndex = snap.exists() ? Number(snap.val()) : 0;
  setRoundInfo();

  if (Number.isNaN(perguntaIndex) || perguntaIndex < 0) {
    await update(ref(db, `games/${gameId}`), { state: "waiting", currentQuestion: 0 });
    showScreen("lobbyScreen");
    return;
  }

  if(perguntaIndex < perguntas.length){
    const p = perguntas[perguntaIndex];
    document.getElementById("questionTitle").textContent = p.pergunta;

    const optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = "";

    p.opcoes.forEach((op,i)=>{
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.dataset.index = String(i);
      btn.textContent = op;
      optionsDiv.appendChild(btn);
    });

    unlockOptions();
    startTimer();
  } else {
    await update(ref(db, `games/${gameId}`), { state: "finished" });
  }
}

// ===== Delegação de clique nas opções (com feedback visual) =====
document.getElementById("options").addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("option-btn")) return;
  if (answeredThisRound) return;

  const i = Number(target.dataset.index);
  const p = perguntas[perguntaIndex];

  answeredThisRound = true;
  lockOptions();
  clearTimer();

  try {
    await registrarResposta(i);
    const ok = i === p.resposta;

    // feedback visual
    if (ok) {
      target.classList.add('correct');
      toast('✅ Boa! Resposta correta.', 'ok');
    } else {
      target.classList.add('wrong');
      toast('❌ Não foi dessa vez.');
      // marca qual era a correta
      document.querySelectorAll("#options .option-btn").forEach(b => {
        if (Number(b.dataset.index) === p.resposta) b.classList.add('correct');
      });
    }

    // host tenta avançar quando todos responderem...
    if (isHost) {
      setTimeout(maybeAdvanceIfAllAnswered, AUTO_ADVANCE_DELAY);
      // ...e garante avanço por fallback (evita travar)
      setTimeout(async () => {
        // se ainda está na mesma pergunta, avança mesmo assim
        const curSnap = await get(ref(db, `games/${gameId}/currentQuestion`));
        const curIdx = curSnap.exists() ? Number(curSnap.val()) : perguntaIndex;
        if (curIdx === perguntaIndex) avancarPergunta();
      }, AUTO_ADVANCE_DELAY + FALLBACK_ADVANCE_DELAY);
    }
  } catch (err) {
    console.error("[click option] ", err);
    answeredThisRound = false;
    toast('⚠️ Erro ao enviar. Tente de novo.', 'warn');
    unlockOptions();
    startTimer();
  }
});

// ===== Registrar resposta =====
function registrarResposta(index){
  return set(ref(db, `games/${gameId}/answers/${perguntaIndex}/${playerId}`), {
    option: index,
    ts: Date.now()
  });
}

// ===== Host: avançar quando todos responderem =====
async function maybeAdvanceIfAllAnswered(){
  const [playersSnap, answersSnap] = await Promise.all([
    get(ref(db, `games/${gameId}/players`)),
    get(ref(db, `games/${gameId}/answers/${perguntaIndex}`))
  ]);

  const totalPlayers = playersSnap.exists() ? playersSnap.numChildren() : 0;
  const answered = answersSnap.exists() ? Object.keys(answersSnap.val()).length : 0;

  if (totalPlayers > 0 && answered >= totalPlayers) {
    avancarPergunta();
  }
}

// ===== Host: pontua e avança =====
async function avancarPergunta(){
  try {
    const flagRef = ref(db, `games/${gameId}/answers/_scored/${perguntaIndex}`);
    const scoredRes = await runTransaction(flagRef, (cur) => (cur === true ? cur : true));
    if (!scoredRes.committed) return;

    const [answersSnap, playersSnap] = await Promise.all([
      get(ref(db, `games/${gameId}/answers/${perguntaIndex}`)),
      get(ref(db, `games/${gameId}/players`))
    ]);

    const p = perguntas[perguntaIndex];
    const answers = answersSnap.exists() ? answersSnap.val() : {};
    const updates = {};

    if (playersSnap.exists()) {
      playersSnap.forEach(child => {
        const pid = child.key;
        const pl = child.val();
        const ans = answers?.[pid];
        if (ans && ans.option === p.resposta) {
          updates[`${pid}/position`] = (pl.position || 0) + 1;
        }
      });
    }

    if (Object.keys(updates).length) {
      await update(ref(db, `games/${gameId}/players`), updates);
    }

    const next = perguntaIndex + 1;
    if (next < perguntas.length) {
      await update(ref(db, `games/${gameId}`), { currentQuestion: next });
      // Listener de currentQuestion re-renderiza para todos
    } else {
      await update(ref(db, `games/${gameId}`), { state: "finished" });
    }
  } catch (e) {
    console.error("[avancarPergunta] ", e);
  }
}

// ===== Pódio =====
async function showPodium() {
  showScreen("podiumScreen");
  clearTimer();

  const snap = await get(ref(db, `games/${gameId}/players`));
  const playersObj = snap.exists() ? snap.val() : {};

  const players = Object.values(playersObj).map(p => ({
    name: p.name || "Jogador",
    gamete: p.gamete || "-",
    position: Number(p.position) || 0
  }));

  players.sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position;
    return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  });

  const podiumDiv = document.getElementById("podium");
  const fullDiv = document.getElementById("fullRanking");

  if (players.length === 0) {
    podiumDiv.innerHTML = "<div class='podium'>Sem jogadores</div>";
    fullDiv.innerHTML = "";
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const classes = ["first", "second", "third"];
  const top3 = players.slice(0, 3);

  podiumDiv.innerHTML = top3.map((p, i) => `
    <div class="podium ${classes[i] || ""}">
      ${medals[i] || `#${i+1}`} • <strong>${p.name}</strong> (${p.gamete})
      — ${p.position} ponto${p.position === 1 ? "" : "s"}
    </div>
  `).join("");

  fullDiv.innerHTML = `
    <ol>
      ${players.map(p => `
        <li>${p.name} (${p.gamete}): ${p.position} ponto${p.position === 1 ? "" : "s"}</li>
      `).join("")}
    </ol>
  `;
}

// Expor funções globais usadas no HTML
window.resetSalaManual = resetSalaManual;
