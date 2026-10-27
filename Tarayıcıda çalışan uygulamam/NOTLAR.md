# Çalışma Notları — Bollinger Tarayıcı

## Dosyalar
- `index.html` — güncel/çalışan sürüm (üzerinde çalışıyoruz).
- `index.original.html` — kullanıcının ilk gönderdiği, hiç dokunulmamış yedek.
- `index.kusursuz-filtreleme.html` — grafik/filtreleme işleri bittikten sonra alınan isimli yedek (ara kontrol noktası).

## Bugün (bu oturumda) yapılanlar

### 1. İlk 7 düzeltme (hesaplama/çalışma hataları)
- ATR/STOP hesaplaması gerçek True Range formülüne çevrildi (gap'leri kaçırmıyor artık).
- İlerleme sayaçları `finally` bloklarına taşındı (erken elenenler sayılıyor, ilerleme çubuğu takılmıyor).
- "1G düşen / 1S dönen" (patlama) kriterine son 5 mumluk net değişim kontrolü (`son5Oran`) eklendi.
- Sıfırla/tekrar tarama güvenliği: `TARAMA_SURUMU` sayaç + `DURDUR` kontrolü tüm async adımlara eklendi (iptal garantisi).
- Kilitli zaman dilimleri artık ayrı `kilitliDilimler` dizisiyle doğru saklanıp geri yükleniyor.
- Otomatik tarama ayarı sayfa açılışında zamanlayıcıyı gerçekten yeniden başlatıyor (`otomatikBaslat`).
- Kullanılmayan ölü kod (`favoriGuncelle()`, var olmayan DOM'a erişiyordu) tamamen silindi; yanlış yorum satırı düzeltildi.

### 2. Grafik (sparkline) iyileştirmeleri
- Grafik verisi ham fiyat yerine hareketli BB% serisine çevrildi (Bollinger bant konumunu gösteriyor).
- Y ekseni veriye göre otomatik odaklanıyor (dar aralıkta düz görünme sorunu çözüldü).
- 80/20 çizgileri kaldırıldı, sadece 50 (orta) çizgi kaldı — ve bu çizgi her zaman kutunun tam ortasına sabitlendi.
- Çizgi/dolgu 50'nin üstünde yeşil, altında kırmızı olacak şekilde ikiye bölündü (clipPath ile).
- Satır/grafik yükseklik oranı kullanıcı isteğine göre ayarlandı (satır 50 → grafik 45), sütun genişletildi, boşluklar minimize edildi.
- "Grafik" sütun başlığına tıklanarak sıralama eklendi (`grafikTrendSkoru()` — son çeyrek ile ilk çeyrek arasındaki eğim farkına bakıyor, "trend yeni dönmüş mü" sorusuna cevap veriyor).

### 3. Favori buton incelemesi
- Kullanıcının anlatımı doğrulandı: ★ tek buton, 3 duruma dönüyor (boş → favori → kilit/pozisyon).
- Araç çubuğundaki "Kilitle" butonunun bundan tamamen ayrı bir mekanizma olduğu (aşamalı tarama daraltma) netleştirildi.

### 4. Patlama butonu — 3 yönlü hale getirildi (bugünün ana işi)
- Buton artık 3 durumlu döngü: 🚀 Patlama (nötr/kapalı) → 🟢🚀 Yükseliş (pump ara) → 🔴🚀 Düşüş (dump ara, simetrik kriter: 1G yükselen + 1S dönüp düşen + sıkışma) → tekrar nötr.
- **3 saniyelik debounce**: her tıklamada ikon/renk anında değişiyor ama gerçek tarama başlatma 3 sn gecikmeli; hızlı art arda tıklamada önceki bekleyen başlatma iptal ediliyor.
- Aktif tarama sırasında yön değiştirilirse eski tarama anında iptal ediliyor (`DURDUR` + `TARAMA_SURUMU` ile), ekranda "Yön değiştirildi, 3 sn sonra..." / "Patlama taraması durduruldu." mesajları gösteriliyor (eski "taranıyor..." metni asılı kalmıyor).
- Tüm senaryolar (debounce bekleme, yön değişimi, aktif taramanın iptali, nötre dönüş) tarayıcıda adım adım test edilip doğrulandı.

### 5. Mobil/tablet panel düzenlemeleri (ikinci oturum)
- Sağdaki dikey/alttaki yatay scrollbar sadece mobilde (≤700px) gizlendi — kaydırma hâlâ çalışıyor, görsel şerit yok. (Not: ilk denemede yanlışlıkla masaüstünü de etkiliyordu, fark edilip `@media` içine taşındı.)
- BTC üst panelindeki zaman dilimi kutuları (`#btcDilimler`) ve seçili zaman dilimi butonları (`.zaman-btn`) mobilde tek satıra sığacak şekilde küçültüldü, aralarındaki boşluk azaltıldı.
- Üst satır (`Binance Futures ⌄ · 🟢 Bağlı` ve `Otomatik: Kapalı ⌄ 🔊`) mobilde tek satıra alındı; "744 parite · 0 yeni" detay metni mobilde gizlendi (masaüstünde duruyor).
- **Borsa seçimine BİST İstanbul ve Nasdaq eklendi** — ŞİMDİLİK SADECE GÖRSEL/KOZMETİK: seçilince şık bir toast bildirimi ("...entegrasyonu yakında eklenecek") çıkıp otomatik Binance Futures'a geri dönüyor. Gerçek veri çekmiyorlar (teknik sebep: ccxt kripto-only, BİST/Nasdaq için ücretsiz+CORS uyumlu tarayıcı-içi veri kaynağı yok, farklı işlem saatleri).
- BTC üst panelindeki küçük grafiğin zaman butonlarının üzerine taşması düzeltildi: kök sebep, `.spark-kutu`'nun her yerde sabit 45px yükseklik kullanması ama `#btcGrafik` kutusunun 30px olmasıydı → `#btcGrafik .spark-kutu { height:100% }` + `overflow:hidden` ile düzeltildi (global düzeltme, bug fix olduğu için masaüstünü de iyileştirdi, bozmadı).
- Tara/Patlama/Kilitle/Sıfırla butonları mobilde 64px→54px genişliğe indirildi.
- **Liste tablosunda mobilde Grafik sütunu da gösterildi**: sütun genişlikleri ve aralar daraltıldı (★20px, Sembol 72px, BB% 32px, Değişim 44px, Grafik 1fr, gap 8px→4px); yer açmak için **Hacim ve Durum sütunları mobilde gizlendi** (masaüstünde hâlâ görünüyorlar). Sembol hücresindeki PUMP/DUMP/YENİ/POZİSYON rozetleri artık taşıp bir sonraki sütuna bindirmek yerine sembolün altına satır kırarak iniyor (flex-wrap).
- Tüm bu mobil değişiklikler `@media (max-width:700px)` içinde — masaüstü paneli (>700px) bundan etkilenmiyor (sadece yukarıdaki 2 global bug-fix: grafik taşması ve BİST/Nasdaq menü seçenekleri hariç, onlar her ekranda geçerli).

### 6. Patlama taraması, kilitli listeye bağlandı (21 Ekim 2026)
- Patlama artık sabit 1G/1S/4S kriteri kullanmıyor: önce normal tarama ile istenen uzun dilimler taranıp kilitleniyor; sonra kilitli olmayan, kilitlenen en kısa dilimden daha kısa dilim(ler) seçiliyor (ör. kilitli 1G+1Hf+1A düşüş, yeni 1S veya 2S). Yeşil roket yükseliş, kırmızı roket düşüş kırılımı arıyor; seçilen yeni dilimdeki yön renkli roketle belirleniyor, zaman düğmesinin rengi önemli değil.
- Kilit yoksa veya yeni daha kısa dilim seçilmemişse Patlama açılmıyor ve açıklayıcı bildirim gösteriliyor. Yalnızca kilitli sonuçlar taranıyor, birden çok kısa dilim seçildiyse herhangi birinde kırılım yeterli (eşleşen dilimler Durum sütununda yazıyor).
- Sıkışma sonrası tetik: son 12 mumun ortalama boyu/hacmi referans; tetik mumunun boyu en az 2x, hacmi en az 1,5x, gövdesi mum aralığının en az %55'i ve kapanışı önceki 12 mumun en yükseğini/aşağı yön için en düşüğünü kırmalı. Önceki BB genişliği düşük olmalı. Hem oluşmakta olan hem de hemen önce tamamlanmış mum kontrol ediliyor; tamamlanan mum etikette ayrı belirtiliyor. Bu tespit adaydan farklı olarak kırılımı arıyor; kesin kâr/sinyal garantisi değil.
- Kullanıcının 77 kilitli parite + 1S yükseliş ekranındaki sıfır sonucunu canlı önbellekte inceledik: 77/77 mum geçerli, saat 14:26'da saatlik mum henüz 26 dakikalıktı; 77 coinin hiçbirinde anlık mum boyu 2x değildi, yalnız birinin hacmi 1,5x idi. Önceki tamamlanmış mumların da hiçbiri tüm koşulları aynı anda sağlamıyordu. Sıfır sonuç bu örnekte doğal; kaçırılmasın diye son kapanmış mumu da değerlendirme ekledik ve sıfır sonuç metnini netleştirdik.
- 3 saniyelik yön seçimi gecikmesi ve 1 dakikalık tekrar korunuyor; taranan kısa dilimde taze veri zorunlu (eski cache ile yanlış alarm yok). Aynı mumdaki sinyal için tekrar ses çalmıyor; dilim değiştirilirse patlama modu iptal ediliyor. Otomatik normal tarama patlama aktifken karışmıyor.
- Sentetik mumlarla yukarı/aşağı kırılım, karşıt yön, hacim, kilitli liste, seçili dilimler, taze veri ve tekrar alarm davranışları doğrulandı. Verdent statik `.verdentc.json` eklendi, doğrulama geçti.

### 7. Rozet kısaltma + sütun taşma düzeltmesi
- Rozetler kısaltıldı: `PUMP → P`, `DUMP → D`, `PATLAMA → 🚀` (yukarı yön yeşil / aşağı yön kırmızı, CSS `rotate` ile roketin ucu yön gösteriyor), `POZİSYON → $`. Her rozete `title` eklendi, üzerine gelince uzun anlamı görünüyor. Kısaltmalar her ekran genişliğinde geçerli (taşma masaüstünde de vardı).
- Kök sebep düzeltmesi: Sembol hücresi 130px sabit genişlikteydi ama rozetler taşıp BB%/Değişim sütunlarının üzerine biniyordu. Artık `.liste-satir > span:nth-child(2)` flex + `flex-wrap` (rozetler sembolün altına iniyor), tüm hücrelere `min-width:0; overflow:hidden` (grafik hücresi hariç — nokta kırpılmasın).
- Durum sütununa `padding-right:14px` eklendi, metin grafiğe yapışmıyor.
- Doğrulama: tarayıcıda gerçek + sentetik satırlarla (yukarı/aşağı roket, P/D, $) kontrol edildi; `node --check` ve `validate-project.mjs` geçti.

### 8. Buton satırı düzenlemesi (alarm özelliğine hazırlık)
- Zaman dilimi butonlarının arasındaki boşluk 8px → 4px'e indirildi (mobilde zaten 3px'ti).
- Tara/Patlama/Kilit/Sıfırla buton grubu artık satırın en sağına yapışmıyor (`margin-left:auto` kaldırıldı); 1 M butonunun hemen yanında, 10px ayrımla duruyor.
- Grubun sonuna **🔔 Alarm Listesi** butonu eklendi (genişliği metne göre otomatik). Şimdilik tıklanınca "tasarım aşamasında" bildirimi gösteriyor — gerçek alarm penceresi, kullanıcının eski uygulamasından göndereceği örnek tasarıma göre yapılacak.
- Planlanan alarm özelliği: listede coin adına tıklayınca o coine özel alarm popup'ı açılacak (zaman dilimi + yön seçimi; ör. 1S diliminde düşüşe geçince sesli bildirim; alarm kurulu coin ~10 sn'de bir taranacak). Tekrar koruması: bir kez çalar, seviye sıfırlanmadan tekrar çalmaz. Alarm yalnızca sayfa açıkken çalışır.

## Henüz TAMAMLANMAMIŞ / konuşulup karara bağlanmamış konular
- Patlama kurallarının eşikleri (2x mum, 1,5x hacim, son 12 mum, bant genişliği) kullanıcıyla gerçek sonuçlara bakarak ileride ayarlanabilir. Alarm yalnızca sayfa açıkken çalışır; arka planda kalıcı bildirim yok.
- "Durum ve grafik sütunu arasındaki boşluk" için zaman filtresine göre al/sat sinyali ekleme önerisi gündeme geldi ama detaylandırılmadı, karar verilmedi.
- **BİST İstanbul / Nasdaq gerçek entegrasyonu** — menüde şimdilik yalnızca "yakında" bildirimi var; gerçek veri çekme YOK. Hangi veri kaynağı/API kullanılacağı netleşmeli.
- **Takip edilen (kilitli/pozisyon) coin için özel alarm kurma** — henüz tasarlanmadı; mevcut patlama taramasının sesli bildirimi bundan farklıdır.

## Sonraki konular
1. Takip edilen (kilitli ⭐🔒) coin için özel alarm kurma.
2. BİST / Nasdaq gerçek entegrasyonu için veri kaynağı.
3. Patlama eşiklerini kullanıcıyla gerçek veride değerlendirme.

### Grafik verisi sabit 4h (25.10.2026)
- Grafikler artik HER ZAMAN 4 saatlik mumlardan ciziliyor (grafikVerisiCek + grafikleriTazele '4h'); tarama zaman diliminden bagimsiz. 1M/1W taramalarinda grafiklerin bozuk zikzak görünmesi sorunu çözüldü.
- favoriHizliGuncelle / pozisyonHizliGuncelle artik grafikVerisi/grafikYon'u ezmiyor; sadece sayilari guncelliyor. Grafikler favori/kilitli coinlerde artik 10sn/3sn'de bir sekil degistirmiyor.
- Patlama taramasi ve favorileriListeyeEkle de 4h grafik verisi kullanıyor.
- Sparkline renkleri sabitlendi: 50 ustu YESIL, 50 alti KIRMIZI (yon'a gore ters çevirme kaldirildi).


### 26.10.2026 gece oturumu - UI duzenlemeleri
- Sütun genislikleri CSS degiskenleriyle: Favori 36px, Sembol 130px, BB 70px, Degisim 100px, Hacim 90px, Durum 120px, Grafik minmax(175px,1fr).
- Satir 50px + sparkline 45px sabit (grafikler ust uste binmisti, duzeltildi).
- Scrollbar'lar tum modlarda gizlendi (scrollbar-width:none + ::-webkit-scrollbar).
- Ana butonlar (Tara/Patlama/Kilitle/Sifirla/Alarm) zaman butonlariyla ayni 54px genislik; Patlama=roket, Alarm=bell ikonu.
- Ust panel tek satir: Borsa(Binance/BIST/NASDAQ) + Otomatik + ses + durum noktasi. Parite/yeni bilgisi tarama cubugunun ICINDE yaziyor (ilerlemeGuncelle/durumMetniGuncelle).
- BTC paneli kisaltildi (padding 8px, font 16px, grafik ortali).
- ALARM PANEL YENI MANTIK: Yon butonlari KALDIRILDI. Zaman butonlari 3 asamali dongu: bos(gri) - - - Buton boyutu 30px, 5 sutunlu grid. bildirimGoster fonksiyonu geri eklendi (eksikligi click handler'i kiriyordu). Alarm kuruldu toast'i kaldirildi (istenmedi).
- Alarm popup boyutu 360px'e dusuruldu, kompakt.


### TELEGRAM BILDIRIM ENTEGRASYONU (26.10.2026)
- Bot: novaai_alarm_bot (token index.html icinde - PAYLASMA! Yayinlanirsa sunucuya tasinmali).
- Chat ID: 5402738283 - localStorage 'telegramChat' anahtarinda kayitli.
- telegramBildirim()/telegramChatBul()/bildirimGoster() fonksiyonlari eklendi. Alarm tetiklenince bip+banner+Telegram mesaji (YUKSELISE/DUSUSE gecti).
- Ust barda ✈️ butonu: baglanti kurma + test mesaji gonderme.
- SINIR: Uygulama sayfasi acik/arka planda calisirken bildirim gelir. Tamamen kapaliyken bildirim icin sunucu cozulumu gerekir (ileride).

