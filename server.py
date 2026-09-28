import sqlite3
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telebot import TeleBot, types

# =====================================================================
# ⚙️ CONFIGURATION & INITIALIZATION
# =====================================================================
# Replace this with the authentic secret token you received from @BotFather
BOT_TOKEN = "8888596063:AAGxm_7sh290Zemwop9wHK7NtK32SbjEm24"  

# Replace this with your secure HTTPS static web hosting URL where your index.html is located
WEBAPP_URL = "https://yourdomain.com"  

bot = TeleBot(BOT_TOKEN)
app = FastAPI(title="Telegram Bingo Game Backend Engine")

# CORS configurations allowing your Telegram Frontend web layer to interact with the API securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# 🗄️ SQLITE DATABASE INITIALIZATION
# =====================================================================
def init_db():
    """Initializes the SQLite framework and structures persistent relational schema."""
    conn = sqlite3.connect("bingo_game.db")
    cursor = conn.cursor()
    # 2ኛ. Profiles database schema supporting distinct wallets, telegram IDs, and telephone numbers
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            telegram_id TEXT PRIMARY KEY,
            username TEXT,
            telephone TEXT DEFAULT '+251912345678',
            main_wallet REAL DEFAULT 500.0,
            play_wallet REAL DEFAULT 150.0
        )
    """)
    conn.commit()
    conn.close()

# Invoke the database setup routine prior to bootstrapping runtime services
init_db()

# =====================================================================
# 🤖 TELEGRAM BOT CONTROLLER SECTION
# =====================================================================
@bot.message_handler(commands=['start', 'help'])
def start_command(message):
    """Handles introductory /start payloads, registering novel participants and vending WebApp anchors."""
    tg_id = str(message.from_user.id)
    username = message.from_user.first_name if message.from_user.first_name else "Player"
    
    # Securely append user metadata into the operational database cluster if nonexistent
    conn = sqlite3.connect("bingo_game.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)", 
        (tg_id, username)
    )
    conn.commit()
    conn.close()

    # Formulate interactive inline button referencing your remote Web App build
    markup = types.InlineKeyboardMarkup()
    webapp_button = types.InlineKeyboardButton(
        text="🎮 Play Bingo (ጌም ክፈት)", 
        web_app=types.WebAppInfo(url=WEBAPP_URL)
    )
    markup.add(webapp_button)
    
    welcome_text = (
        f"ሰላም {username}👋፣ ወደ ቢንጎ ጨዋታ እንኳን ደህና መጡ!\n\n"
        "ለመጫወት እና ካርቴላ ለመምረጥ ከታች ያለውን የጌም ቁልፍ ይጫኑ።"
    )
    bot.send_message(message.chat.id, welcome_text, reply_markup=markup)

# =====================================================================
# 🌐 FASTAPI APPLICATION ENDPOINTS (REST API)
# =====================================================================
class StakeRequest(BaseModel):
    telegram_id: str
    cards_count: int
    stake_per_card: float

@app.get("/api/user/{tg_id}")
def get_user_profile(tg_id: str):
    """Fetches user context including Main Wallet, Play Wallet, ID, and telephone properties."""
    conn = sqlite3.connect("bingo_game.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT telegram_id, telephone, main_wallet, play_wallet FROM users WHERE telegram_id = ?",(tg_id,)
    )
    user = cursor.fetchone()
    conn.close()
    
    # Fallback to demo structures if user hasn't initialized the conversation stream via bot first
    if not user:
        return {
            "telegram_id": tg_id,
            "telephone": "+251912345678",
            "main_wallet": 500.0,
            "play_wallet": 150.0
        }
        
    return {
        "telegram_id": user[0],
        "telephone": user[1],
        "main_wallet": user[2],
        "play_wallet": user[3]
    }

@app.post("/api/deduct-stake")
def deduct_stake(req: StakeRequest):
    """Deducts operational stake totals sequentially from Play Wallet, fallback to Main Wallet."""
    total_stake = req.cards_count * req.stake_per_card
    
    conn = sqlite3.connect("bingo_game.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT play_wallet, main_wallet FROM users WHERE telegram_id = ?", 
        (req.telegram_id,)
    )
    wallets = cursor.fetchone()
    
    if not wallets:
        conn.close()
        raise HTTPException(status_code=404, detail="ተጫዋች አልተገኘም! በመጀመሪያ ቦቱን ጀምር ይበሉት።")
        
    play_bal, main_bal = wallets
    
    # Algorithmic deduction route prioritization: Play Wallet -> Main Wallet
    if play_bal >= total_stake:
        cursor.execute(
            "UPDATE users SET play_wallet = play_wallet - ? WHERE telegram_id = ?", 
            (total_stake, req.telegram_id)
        )
    elif (play_bal + main_bal) >= total_stake:
        remainder = total_stake - play_bal
        cursor.execute(
            "UPDATE users SET play_wallet = 0, main_wallet = main_wallet - ? WHERE telegram_id = ?", 
            (remainder, req.telegram_id)
        )
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="ይቅርታ፣ ካርቴላ ለመምረጥ በቂ ቀሪ ሂሳብ የሎትም!")
        
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Successfully deducted {total_stake} ETB stake."}

# =====================================================================
# 🚀 CORE SYSTEM BOOTSTRAPPING ENGINE
# =====================================================================
if __name__ == "__main__":
    print("🤖 Launching Background Telegram Bot Threads...")
    # Fork Telegram Bot polling runtime context into an independent daemon thread to prevent lockouts
    bot_thread = threading.Thread(target=lambda: bot.infinity_polling(), daemon=True)
    bot_thread.start()
    
    print("🌐 Spinning up local HTTP FastAPI REST Web-Server cluster on port 8000...")
    # Deploy API server on all network adapters globally targeting explicit internal port configurations
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)