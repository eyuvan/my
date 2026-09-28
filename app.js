// Global Application Runtime State Declarations
const API_BASE_URL = "http://localhost:8000/api"; 
let tgId = "12345678"; 
let selectedCards = [];
let countdownVal = 49;
const stakePerCard = 10.0;
let userBoardsData = {}; 

// Lifecycle Listener Safeguarding Execution After DOM Parsing Completes
document.addEventListener("DOMContentLoaded", () => {
    initCardSelector(); 
    setupTelegram();
    loadUserData();
    startCountdown();
});

// Sync Context Properties with Upstream Telegram Client Instance
function setupTelegram() {
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.expand();
        if(window.Telegram.WebApp.initDataUnsafe?.user) {
            tgId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
        }
    }
}

// Generate the 1 to 600 Card Grid Dynamically
function initCardSelector() {
    const grid = document.getElementById('cardSelectorGrid');
    if(!grid) return;
    grid.innerHTML = ""; 
    
    for (let i = 1; i <= 600; i++) {
        const card = document.createElement('div');
        card.className = 'card-item';
        card.innerText = i;
        card.onclick = () => {
            if (selectedCards.includes(i)) {
                selectedCards = selectedCards.filter(c => c !== i);
                card.classList.remove('selected');
            } else {
                if (selectedCards.length >= 3) {
                    alert("በአንድ ጊዜ መምረጥ የሚቻለው ቢበዛ 3 ካርቴላዎች ብቻ ነው!");
                    return;
                }
                selectedCards.push(i);
                card.classList.add('selected');
            }
            document.getElementById('selectedCount').innerText = selectedCards.length;
        };
        grid.appendChild(card);
    }
}

// Fetch Remote Accounting Balance State Contexts
async function loadUserData() {
    try {
        let res = await fetch(${API_BASE_URL}/user/${tgId});
        if(res.ok) {
            let data = await res.json();
            document.getElementById('topMainWallet').innerText = data.main_wallet;
            document.getElementById('topPlayWallet').innerText = data.play_wallet;
            document.getElementById('wMain').innerText = data.main_wallet + " ETB";
            document.getElementById('wPlay').innerText = data.play_wallet + " ETB";
            document.getElementById('profTgId').innerText = data.telegram_id;
            document.getElementById('profPhone').innerText = data.telephone;
            document.getElementById('profMain').innerText = data.main_wallet + " ETB";
            document.getElementById('profPlay').innerText = data.play_wallet + " ETB";
        }
    } catch (err) { 
        console.log("Local standalone fallback mode enabled."); 
    }
}

// Deduct Stake Values via API Gateway
async function confirmAndLockCards() {
    if (selectedCards.length === 0) return alert("እባክዎ መጀመሪያ ካርቴላ ይምረጡ!");
    try {
        let res = await fetch(${API_BASE_URL}/deduct-stake, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ telegram_id: tgId, cards_count: selectedCards.length, stake_per_card: stakePerCard })
        });
        if(res.ok) {
            alert("ምርጫዎ ጸድቋል!");
            document.getElementById('lockCardsBtn').disabled = true;
            loadUserData();
        } else {
            let errData = await res.json();
            alert(errData.detail);
        }
    } catch(e) { 
        alert("ምርጫው በUI ደረጃ ተመዝግቧል!"); 
    }
}

// Execute Countdown Match Clocks
function startCountdown() {
    let timerInterval = setInterval(() => {
        countdownVal--;
        document.getElementById('timer').innerText = countdownVal;
        if (countdownVal <= 0) {
            clearInterval(timerInterval);
            startLiveBingoGame();
        }
    }, 1000);
}
// Initialize Active Match Space & Dynamic Matrix Rendering
function startLiveBingoGame() {
    document.getElementById('screen-game').classList.remove('active');
    document.getElementById('screen-bingo-play').classList.add('active');
    
    const boardContainer = document.getElementById('myBingoBoards');
    boardContainer.innerHTML = "";
    userBoardsData = {};
    
    if(selectedCards.length === 0) {
        boardContainer.innerHTML = "<p style='text-align:center;color:#aaa;'>በዚህ ዙር አልተሳተፉም። ቀጣይ ዙር ይጠብቁ።</p>";
        return;
    }

    selectedCards.forEach(cNum => {
        let html = <div style="margin:15px 0 5px 0; font-weight:bold; color:var(--card-selected);">ካርቴላ #${cNum}</div><div class="bingo-grid">;
        ['B','I','N','G','O'].forEach(l => html += <div class="bingo-header">${l}</div>);
        
        userBoardsData[cNum] = {
            matrix: Array(5).fill(null).map(() => Array(5).fill(0)),
            mapping: {},
            hasWon: false
        };

        for(let r=0; r<5; r++) {
            let b = Math.floor(Math.random()*15)+1;      // B: 1-15
            let idxI = Math.floor(Math.random()*15)+16;  // I: 16-30
            let n = (r===2) ? "FREE" : Math.floor(Math.random()*15)+31; // N: 31-45
            let g = Math.floor(Math.random()*15)+46;  // G: 46-60
            let o = Math.floor(Math.random()*15)+61;  // O: 61-75
            
            userBoardsData[cNum].mapping[b] = { row: r, col: 0 };
            userBoardsData[cNum].mapping[idxI] = { row: r, col: 1 };
            if (r !== 2) userBoardsData[cNum].mapping[n] = { row: r, col: 2 };
            userBoardsData[cNum].mapping[g] = { row: r, col: 3 };
            userBoardsData[cNum].mapping[o] = { row: r, col: 4 };

            if (r === 2) userBoardsData[cNum].matrix[r][2] = 1; 

            html += <div class="bingo-cell" id="c-${cNum}-${b}">${b}</div>;
            html += <div class="bingo-cell" id="c-${cNum}-${idxI}">${idxI}</div>;
            html += <div class="bingo-cell ${r===2?'hit':''}">${n}</div>;
            html += <div class="bingo-cell" id="c-${cNum}-${g}">${g}</div>;
            html += <div class="bingo-cell" id="c-${cNum}-${o}">${o}</div>;
        }
        html += </div>;
        boardContainer.innerHTML += html;
    });

    let pool = Array.from({length: 75}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    let idx = 0;
    
    let callInterval = setInterval(() => {
        if(idx >= pool.length) return clearInterval(callInterval);
        let num = pool[idx];
        let lettr = num<=15?'B':num<=30?'I':num<=45?'N':num<=60?'G':'O';
        
        document.getElementById('callerScreen').innerText = ${lettr} - ${num};
        
        selectedCards.forEach(cNum => {
            let board = userBoardsData[cNum];
            if(board && !board.hasWon && board.mapping[num]) {
                let pos = board.mapping[num];
                board.matrix[pos.row][pos.col] = 1;
                
                let cell = document.getElementById(c-${cNum}-${num});
                if(cell) cell.classList.add('hit');
                
                if(checkBingoWinner(board.matrix)) {
                    board.hasWon = true;
                    clearInterval(callInterval);
                    document.getElementById('callerScreen').innerText = 🎉 BINGO! ካርቴላ #${cNum} አሸነፈ!;
                    alert(🎉 BINGO! ካርቴላ ቁጥር #${cNum} አሸንፏል!);
                }
            }
        });
        idx++;
    }, 2500);
}

// Algorithmic Evaluation Engine (Rows, Columns, and Diagonal Axis Checks)
function checkBingoWinner(matrix) {
    for (let r = 0; r < 5; r++) if (matrix[r][0] && matrix[r][1] && matrix[r][2] && matrix[r][3] && matrix[r][4]) return true;
    for (let c = 0; c < 5; c++) if (matrix[0][c] && matrix[1][c] && matrix[2][c] && matrix[3][c] && matrix[4][c]) return true;
    if (matrix[0][0] && matrix[1][1] && matrix[2][2] && matrix[3][3] && matrix[4][4]) return true;
    if (matrix[0][4] && matrix[1][3] && matrix[2][2] && matrix[3][1] && matrix[4][0]) return true;
    return false;
}
// Navigation Tab Management Strategy Handler
function switchTab(event, tab) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if(tab === 'game') {
        if(countdownVal > 0) document.getElementById('screen-game').classList.add('active');
        else document.getElementById('screen-bingo-play').classList.add('active');
    } else {
        document.getElementById('screen-' + tab).classList.add('active');
    }
}