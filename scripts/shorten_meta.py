import re

ui_path = 'frontend/src/i18n/ui.ts'
with open(ui_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find `index.meta.desc` for each language and shorten it if > 150 chars.
# A basic regex to parse the strings:
# We'll just replace the specific long strings with shorter manual versions.

replacements = {
    # French: was 201 chars
    "Téléchargez des vidéos TikTok (sans filigrane), Twitter/X et Facebook en HD — gratuit, instantané, sans inscription. Extrayez également l'audio en MP3. Fonctionne sur iPhone, Android et ordinateur.": 
    "Téléchargez des vidéos TikTok, Twitter et FB en HD sans filigrane. Convertisseur MP3 gratuit. Sans inscription, sur iPhone et Android.",
    
    # Spanish: was 183 chars
    "Descargue videos de TikTok (sin marca de agua), Twitter/X y Facebook en HD — gratis, al instante, sin registro. Extraiga también audio a MP3. Funciona en iPhone, Android y PC.":
    "Descarga videos de TikTok, Twitter y Facebook en HD sin marca de agua. Conversor MP3 gratis. Sin registro, compatible con iPhone y Android.",
    
    # Turkish: was 172 chars
    "TikTok (filigransız), Twitter/X ve Facebook videolarını HD olarak indirin — ücretsiz, anında, kayıt gerektirmez. MP3 ses çıkarma da mevcut. iPhone, Android ve masaüstünde çalışır.":
    "TikTok, Twitter ve FB videolarını ücretsiz ve filigransız olarak HD indirin. iPhone ve Android için kayıt gerektirmeyen video ve MP3 dönüştürücü.",

    # Portuguese (PT):
    "Baixe vídeos do TikTok (sem marca d'água), Twitter/X e Facebook em HD — grátis, instantâneo, sem registro. Extraia também áudio para MP3. Funciona em iPhone, Android e PC.":
    "Baixe vídeos do TikTok, Twitter e Facebook em HD sem marca d'água. Conversor MP3 grátis e rápido. Sem registro, para iPhone, Android e PC.",

    # German:
    "Laden Sie TikTok-Videos (ohne Wasserzeichen), Twitter/X und Facebook in HD herunter — kostenlos, sofort, ohne Anmeldung. Extrahieren Sie auch Audio in MP3.":
    "Laden Sie TikTok, Twitter & Facebook Videos in HD ohne Wasserzeichen herunter. Kostenloser MP3-Konverter ohne Anmeldung, auf allen Geräten.",

    # Arabic:
    "قم بتنزيل مقاطع فيديو TikTok (بدون علامة مائية) و Twitter/X و Facebook بجودة HD — مجانًا وفوريًا وبدون تسجيل. استخراج الصوت إلى MP3 أيضًا. يعمل على iPhone و Android وسطح المكتب.":
    "قم بتنزيل مقاطع فيديو TikTok وTwitter وFB بجودة HD بدون علامات. محول MP3 مجاني. بدون تسجيل، يعمل على هواتف iPhone و Android وأجهزة الكمبيوتر.",
    
    # Hindi:
    "टिकटॉक (बिना वॉटरमार्क), ट्विटर/एक्स और फेसबुक से एचडी में वीडियो डाउनलोड करें। मुफ़्त, तुरंत, कोई साइनअप नहीं। ऑडियो को एमपी3 में भी निकालें।":
    "बिना वॉटरमार्क के TikTok, Twitter और फेसबुक वीडियो HD में डाउनलोड करें। मुफ़्त MP3 कनवर्टर, कोई साइनअप नहीं, सभी डिवाइस पर आसानी से काम करता है।"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(ui_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Shortened meta descriptions in ui.ts")
