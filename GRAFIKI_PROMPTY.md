# BAZA Beach — Prompty do generowania grafik (ChatGPT / DALL-E / Midjourney)

Wszystkie grafiki w ciemnej, złoto-bursztynowej palecie (#f0c929, #c8950a, #1a1200).
Styl: cinematic, ciemne tło, złote akcenty, plaża/ocean w tle.

---

## 1. HERO — grafika tła (beach_hero_bg.jpg)
**Gdzie:** hero section jako opcjonalne tło za canvas particles  
**Rozmiar:** 1920×1080 px  
**Prompt:**
```
Ultra-dark cinematic beach at twilight, ocean waves softly illuminated by deep amber and golden sunset glow, 
warm golden particles floating in the air, dark navy-black sky with scattered stars, 
palm tree silhouettes barely visible at edges, photorealistic, 
warm golden-amber color grading (#f0c929, #c8950a), 
no people, wide landscape format, moody atmospheric lighting, 
bokeh in foreground sand, depth of field
```

---

## 2. ProEl — ilustracja 3D (icon_proel_3d.png)
**Gdzie:** sekcja ProEl spotlight, obok listy funkcji  
**Rozmiar:** 600×600 px, tło transparent  
**Prompt:**
```
3D icon illustration of a digital referee clipboard / electronic protocol tablet,
glowing red LIVE indicator dot in top corner, digital timer display showing "09:19",
dark metallic body with golden trim and amber glow effects,
floating in air with soft shadow below, 
cinematic lighting, dark background, 
isolated on transparent background, 
warm golden (#f0c929) accent glow around the device
```

---

## 3. Role — ikona Sędzia (icon_role_judge.png)
**Gdzie:** sekcja ról / hero role chips  
**Rozmiar:** 256×256 px, tło transparent  
**Prompt:**
```
Flat modern icon of a referee whistle with golden metallic sheen,
dark background, warm amber glow around it, 
minimalist clean design, no text,
style: iOS app icon aesthetic, 
color palette: deep dark brown background, golden yellow whistle (#f0c929)
```

---

## 4. Role — ikona Trener (icon_role_coach.png)
**Gdzie:** sekcja ról  
**Rozmiar:** 256×256 px, tło transparent  
**Prompt:**
```
Flat modern icon of a sports coach clipboard with tactical beach handball court diagram drawn on it,
golden pen/marker, dark background, warm amber lighting,
minimalist clean design, no text, 
style: iOS app icon aesthetic,
color palette: dark background, golden (#f0c929) lines and clipboard frame
```

---

## 5. Role — ikona Zawodnik (icon_role_player.png)
**Gdzie:** sekcja ról  
**Rozmiar:** 256×256 px, tło transparent  
**Prompt:**
```
Flat modern icon of a beach handball player silhouette jumping to throw the ball,
golden outline/glow effect, dark background,
minimalist athletic pose, no text,
style: iOS app icon, sports app aesthetic,
color palette: dark navy-black background, bright golden (#f0c929) player silhouette
```

---

## 6. Role — ikona Organizator (icon_role_org.png)
**Gdzie:** sekcja ról  
**Rozmiar:** 256×256 px, tło transparent  
**Prompt:**
```
Flat modern icon of a tournament bracket / organizational chart structure,
golden connecting lines, dark background, amber glow,
minimalist clean design, no text,
style: iOS app icon aesthetic,
color palette: dark background, golden (#f0c929) bracket lines, warm amber glow
```

---

## 7. Roadmap — ikona Kibic LIVE (icon_rm_fans.png)
**Gdzie:** roadmap item "Kibice LIVE"  
**Rozmiar:** 256×256 px, tło transparent  
**Prompt:**
```
Flat 3D icon of a cheerful fan emoji holding a phone showing a live score,
blue glow from the phone screen, dark background,
modern rounded style, no text,
playful but professional look,
color palette: dark background, electric blue phone glow, warm skin tones
```

---

## 8. Roadmap — ikona Tablet (icon_rm_tablet.png)
**Gdzie:** roadmap item "Tablet/iPad"  
**Rozmiar:** 256×256 px, tło transparent  
**Prompt:**
```
Flat 3D icon of a modern iPad/tablet device floating in air,
screen showing a beach handball tournament dashboard with golden UI,
dark metallic body, golden glow from screen,
modern rounded style, no text, no brand logos,
color palette: dark background, golden UI glow (#f0c929), dark device body
```

---

## 9. Store badges (badges_stores.png)
**Gdzie:** sekcja download — placeholder zastąpiony grafiką  
**Rozmiar:** 800×120 px, tło transparent  
**Prompt:**
```
Two app store download badges side by side: "App Store" and "Google Play",
custom design in golden-dark style (no official Apple/Google logos),
dark rounded rectangle buttons with golden border and text,
left: apple logo outline + "Pobierz w App Store", right: play triangle + "Pobierz na Androida",
clean premium look, transparent background,
color palette: dark (#1a1200) button body, golden (#f0c929) border and text, white icons
```

---

## 10. Sekcja "Koniec ze starymi metodami" — grafika tła (pain_bg_texture.png)
**Gdzie:** pain section subtelne tło  
**Rozmiar:** 1200×600 px  
**Prompt:**
```
Abstract dark sandy beach texture, very subtle,
grainy organic texture of dark wet sand at night,
extremely low contrast, almost black with barely visible sand grain texture,
color: very dark brown-black (#0e0a00), ultra-subtle warm undertones,
seamlessly tileable texture, no objects, no horizon
```

---

## 11. Hero — grafika ilustracyjna 3D grupy telefonów (mockup_phones_group.png)  
**(opcjonalna, premium look)**  
**Gdzie:** hero right column zamiast/obok CSS phone mockup  
**Rozmiar:** 800×900 px, tło transparent  
**Prompt:**
```
Three modern smartphones floating in dark space, arranged in a fan/cascade layout,
central phone showing a beach handball tournament app UI (dark amber theme),
left phone slightly rotated and smaller showing a live match timer screen,
right phone slightly rotated showing rule book screen,
phones have golden metallic frames with amber glow emanating from screens,
dark background, dramatic cinematic lighting from below,
photorealistic 3D render, transparent background,
warm golden glow particles floating around the phones
```

---

## Kolejność priorytetów do wygenerowania:

1. **[PILNE]** `icon_proel_3d.png` — używana bezpośrednio w sekcji ProEl spotlight
2. **[PILNE]** `beach_hero_bg.jpg` — wzmocni hero section wizualnie
3. **[WAŻNE]** `mockup_phones_group.png` — hero right column
4. **[WAŻNE]** 4× role icons (`icon_role_*.png`) — do hero chips i sekcji ról
5. **[NICE]** `badges_stores.png` — download section
6. **[NICE]** `pain_bg_texture.png` — pain section
7. **[OPCJA]** roadmap icons × 2

---

## Jak dodać do strony po wygenerowaniu:

### icon_proel_3d.png
W `beach.html` znajdź `.proel-placeholder-note` i zamień `.proel-phone-wrap` na:
```html
<img src="Grafiki/icon_proel_3d.png" alt="ProEl 3D" style="width:280px;filter:drop-shadow(0 0 40px rgba(255,60,60,0.3))">
```

### beach_hero_bg.jpg
W `beach.css` do selektora `.hero-beach` dodaj:
```css
background-image: url('Grafiki/beach_hero_bg.jpg');
background-size: cover;
background-position: center bottom;
```

### mockup_phones_group.png
W `beach.html` zastąp `.hero-phones-wrap`:
```html
<div class="hero-phones-wrap anim-hero anim-d3">
  <img src="Grafiki/mockup_phones_group.png" alt="BAZA Beach" style="max-width:480px;width:100%">
</div>
```
