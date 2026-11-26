# IzarGames sunucusuna DareFlip sayfaları

Yayıncı adı `IzarGames`, herkese açık destek e-postası `info@izargames.com` olarak kullanıcı tarafından doğrulandı. Kullanıcının Plesk ekranında **File Manager for dareflip.izargames.com**, `Home directory → dareflip.izargames.com` yolu ve açılmış bir `dareflip` klasörü görülüyor. Reklamlı ZIP bu dizinde açılmış; mevcut yerleşim korunacak, ana dizindeki `index.html` değiştirilmeyecek.

Önceki ZIP'in bağlantıları `izargames.com/dareflip/` içindi. Yeni paket, ekranda görülen alt alan adı ve klasöre göre `https://dareflip.izargames.com/dareflip/` bağlantılarıyla yeniden üretilir. `izargames.publisher-plan.json` bu hedefleri kaydeder; gerçek uygulama yapılandırması veya canlı yayın kanıtı değildir.

Bu ortamdan yapılan HTTPS isteği proxy tarafından origin'e ulaşmadan HTTP CONNECT 403 ile engellendi. Bu, sitenin kapalı olduğunu göstermez. Plesk'in belge kökü eşleşmesi ve dört sayfanın gerçek HTTPS yanıtı henüz doğrulanmadığından uygulamadaki üç web adresi boş kalır.

## Hazırlanan dosyalar

Dört bağımsız dosya kullanılır:

- `index.html`: DareFlip yayıncı bilgileri.
- `privacy.html`: gizlilik politikası.
- `support.html`: destek ve iletişim.
- `terms.html`: kullanım koşulları.

Her dosya EN/TR içerik ve kendi CSS'ini içerir; harici script, font veya stylesheet gerektirmez. Ekranda yüklenen paket reklamlı sürümdür. Buna uygun yeni yerel paket `DareFlip-subdomain-pages-ad-enabled.zip` adını taşır ve **yalnızca dört HTML dosyasını**, klasör veya yerel manifest eklemeden içerir. Bu seçim uygulamanın üretim reklam profilini veya gerçek AdMob kimliklerini otomatik tamamlamaz. Reklamsız yayın seçilirse aynı kaynaktan reklamsız metinler üretilmelidir; iki sürüm aynı hedefe birlikte yüklenmez.

```sh
node scripts/build-public-pages.mjs --config site/izargames.publisher-plan.json --ads-enabled true --out-dir artifacts/legal-site/subdomain-ad-enabled
```

Komut yerel HTML'leri ve yerel `build-manifest.json` dosyasını üretir; sunucuya yüklemez veya DNS değiştirmez. Manifest `deploymentVerified: false` olarak kalır. Yükleme ZIP'i yalnızca bu çıktının dört HTML dosyasını içerir; manifest kamuya açık dizine yüklenmez.

## Ekrandaki Plesk dizininden devam

1. Plesk'te **Hosting Settings / Barındırma Ayarları → Document Root / Belge Kökü** alanının ekranda görülen alt alan adı dizinine işaret ettiğini doğrulayın. Ana alan adının `httpdocs` dizinine veya başka uygulamaların klasörlerine taşımayın.
2. Ekrandaki **`dareflip` klasörünü açın**. İçinde önceki paketin `index.html`, `privacy.html`, `support.html`, `terms.html` dosyaları bulunmalıdır. Değiştirmeden önce mevcut dört dosyanın kopyasını yerel olarak saklayın.
3. Yeni `DareFlip-subdomain-pages-ad-enabled.zip` dosyasını bu klasöre yükleyip **Archive → Extract Files** ile aynı klasöre açın; yalnızca bu dört HTML dosyasının değiştirilmesine izin verin. Paket içinde ek klasör bulunmadığından `dareflip/dareflip` oluşmaz. Panel bunu desteklemiyorsa ZIP'i bilgisayarda açıp dört dosyayı bu klasöre yükleyin.
4. Sonuç `dareflip.izargames.com/dareflip/privacy.html` şeklinde olmalıdır. Üst dizindeki `index.html`, `.htaccess` ve diğer uygulama dosyalarına dokunmayın.
5. Yeni ZIP'i açtıktan sonra sunucudaki yükleme ZIP'lerini ve önceki paketten üst dizine açılan `YUKLEME.txt` ile `local-build-manifest.json` dosyalarını kaldırabilir veya web kökü dışında saklayabilirsiniz. Kendi yedeğinizi koruyun; başka dosya veya klasörleri silmeyin.

## Yükleme sonrası

Tarayıcıdan şu dört hedefi ayrı ayrı kontrol edin:

- `https://dareflip.izargames.com/dareflip/`
- `https://dareflip.izargames.com/dareflip/privacy.html`
- `https://dareflip.izargames.com/dareflip/support.html`
- `https://dareflip.izargames.com/dareflip/terms.html`

Gerçek yanıtlar HTTPS üzerinden 200 olmalı; Plesk karşılama sayfası veya ana sayfaya yönlendirme yerine doğru EN/TR DareFlip metinleri, IzarGames ve `info@izargames.com` görünmelidir. Menü bağlantıları aynı alt alan adındaki bu sayfalara gitmelidir. Eski apex alan adına giden bağlantılar kalmamalıdır. Başka uygulamaları etkileyen genel yönlendirme kurallarını değiştirmeyin.

Canlı adresler doğrulandıktan sonra web/gizlilik/destek adresleri `src/config/publisher.json` içine alınır ve uygulama yeniden hazırlanır. Bu yerel paket için henüz canlı yayın doğrulaması, native uygulama derlemesi veya App Store gönderimi yapılmadı. Şifre veya özel anahtar sohbet içinde paylaşılmaz.
