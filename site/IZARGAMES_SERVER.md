# IzarGames sunucusuna DareFlip sayfaları

Yayıncı adı `IzarGames`, herkese açık destek e-postası `info@izargames.com` olarak kullanıcı tarafından doğrulandı. Kullanıcının Plesk ekranında **File Manager for dareflip.izargames.com**, `Home directory → dareflip.izargames.com` yolu ve açılmış bir `dareflip` klasörü görülüyor. Reklamlı ZIP bu dizinde açılmış; mevcut yerleşim korunacak, ana dizindeki `index.html` değiştirilmeyecek.

Önceki ZIP'in bağlantıları `izargames.com/dareflip/` içindi. Yeni paket, ekranda görülen alt alan adı ve klasöre göre `https://dareflip.izargames.com/dareflip/` bağlantılarıyla yeniden üretildi. Kullanıcı dört dosyanın izinlerini düzelttikten sonra gizlilik, destek ve koşullar bağlantılarının normal açıldığını doğruladı. `izargames.publisher-plan.json` hedefleri ve kullanıcı doğrulamasını kaydeder; uygulamanın ana sayfa/gizlilik/destek adresleri de artık bu hedeflerle yapılandırılmıştır.

Bu ortamdan yapılan HTTPS isteği proxy tarafından origin'e ulaşmadan HTTP CONNECT 403 ile engellendi. Bu, sitenin kapalı olduğunu göstermez. Kullanıcının tarayıcı doğrulaması bağımsız HTTP/TLS ölçümü değildir; bu yüzden kayıttaki `liveVerified` hâlâ `false`, `publisherConfirmedAccessible` ise `true` değerindedir.

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

Plesk ekranı dört HTML dosyasının doğru `dareflip` klasöründe bulunduğunu, ancak izinlerin `rw-------` (`600`) olduğunu göstermişti. Önceki arşiv yerel derlemenin özel dosya izinlerini taşımıştı. Üretici ve yerel ZIP düzeltildi; kullanıcı sunucudaki düzeltmeyi de tamamladığını bildirdi. Tekrar yükleme yapıldığında yalnızca bu dört HTML'nin izinleri `rw-r--r--` (`644`) olmalıdır: sahip okuyup yazabilir, grup ve diğerleri yalnızca okuyabilir. Çalıştırma izni gerekmez. Klasör izni ekranda `755` görünüyor; başka dosya, dizin veya alt alan adlarına toplu/özyinelemeli izin değişikliği uygulamayın.

Tarayıcıdan şu dört hedefi ayrı ayrı kontrol edin:

- `https://dareflip.izargames.com/dareflip/`
- `https://dareflip.izargames.com/dareflip/privacy.html`
- `https://dareflip.izargames.com/dareflip/support.html`
- `https://dareflip.izargames.com/dareflip/terms.html`

Gerçek yanıtlar HTTPS üzerinden 200 olmalı; Plesk karşılama sayfası veya ana sayfaya yönlendirme yerine doğru EN/TR DareFlip metinleri, IzarGames ve `info@izargames.com` görünmelidir. Menü bağlantıları aynı alt alan adındaki bu sayfalara gitmelidir. Eski apex alan adına giden bağlantılar kalmamalıdır. Başka uygulamaları etkileyen genel yönlendirme kurallarını değiştirmeyin.

Kullanıcı doğrulamasının ardından web/gizlilik/destek adresleri `src/config/publisher.json` içine alındı. Kurulu TestFlight uygulamasına geçmesi için yeni Codemagic build'i gereklidir. Bu güncelleme bağımsız site doğrulaması, yeni imzalı native derleme veya App Store gönderimi anlamına gelmez. Şifre veya özel anahtar sohbet içinde paylaşılmaz.
