# IzarGames sunucusuna DareFlip sayfaları

Yayıncı adı `IzarGames`, herkese açık destek e-postası `info@izargames.com` olarak kullanıcı tarafından doğrulandı. Kullanıcı kendi sunucusunda, hosting panelindeki dosya yöneticisini kullanacağını belirtti. Panel türü ve alan adına ait web kök dizini henüz bilinmiyor.

`izargames.publisher-plan.json` gerçek uygulama yapılandırması değildir: e-posta alan adından önerilen `https://izargames.com/dareflip/` altındaki yeni sayfaların yükleme planıdır. Sunucuya erişim ortamın proxy'si tarafından origin'e ulaşmadan HTTP CONNECT 403 ile engellendi; bu, sitenin kapalı olduğu anlamına gelmez. Hedef alan adı, klasör ve canlı adresler doğrulanmadan uygulamadaki boş web adresleri doldurulmaz.

## Hazırlanan dosyalar

Mevcut sitenin ana dosyalarını veya başka uygulamaların sayfalarını değiştirmeden, ayrı `dareflip` klasöründe dört dosya kullanılacak:

- `index.html`: DareFlip yayıncı bilgileri.
- `privacy.html`: gizlilik politikası.
- `support.html`: destek ve iletişim.
- `terms.html`: kullanım koşulları.

Her dosya EN/TR içerik ve kendi CSS'ini içerir; harici script, font veya stylesheet gerektirmez. Seçilecek uygulama sürümüyle aynı reklam açıklamasına sahip paket kullanılmalıdır. Reklamlı ve reklamsız varyantlar ayrı hazırlanır; aynı klasöre birlikte yüklenmez.

```sh
node scripts/build-public-pages.mjs --config site/izargames.publisher-plan.json --ads-enabled true --out-dir artifacts/legal-site/izargames-ad-enabled
node scripts/build-public-pages.mjs --config site/izargames.publisher-plan.json --ads-enabled false --out-dir artifacts/legal-site/izargames-ad-free
```

Bu komutlar yalnızca yerel dosya üretir; sunucuya yüklemez, DNS değiştirmez ve alan adı sahipliği kanıtlamaz. Manifest `deploymentVerified: false` olarak kalır. Dosyalar yayıncı/sürüm kontrolünden sonra doğrulanan HTTPS web kökünün `dareflip` alt klasörüne yüklenmelidir; mevcut bir klasör varsa önce içeriği incelenir.

## Hosting panelinden yükleme

1. Uygulamanın seçilen reklam sürümüyle eşleşen ZIP'i indirin: reklamlı uygulama için `DareFlip-IzarGames-ad-enabled.zip`, reklamsız uygulama için `DareFlip-IzarGames-ad-free.zip`. Henüz yayın profili seçilmedi; iki paketi aynı hedefe yüklemeyin.
2. Panelde **Alan Adları / Domains** bölümünden sitenin gerçek alan adını ve **Document Root / Belge Kökü** değerini kontrol edin. Dosya yöneticisinde o dizini açın. cPanel'de `public_html`, Plesk'te `httpdocs` olabilir; addon domain farklı bir klasör kullanabilir. Klasör adını varsaymayın.
3. ZIP'i bilgisayarınızda açın. İçindeki yalnızca `dareflip` klasörünü web köküne yükleyin. Sonuç, örneğin doğrulanan web kökü `public_html` ise `public_html/dareflip/privacy.html` olmalıdır. Panel klasör yüklemeyi desteklemiyorsa web kökünde `dareflip` oluşturup dört HTML dosyasını içine yükleyin. Arşivi önceden oluşturulmuş `dareflip` klasörünün içinde açmayın; `dareflip/dareflip` şeklinde iç içe klasör oluşmamalıdır.
4. Ana sitenin `index.html`, `.htaccess` veya diğer uygulama dosyalarına dokunmayın. Mevcut `dareflip` klasörü varsa içeriğini kontrol edip yedekleyin; bu pakete ait olmayan dosyaları silmeyin. ZIP, `YUKLEME.txt` ve `local-build-manifest.json` dosyalarını herkese açık web köküne yüklemek gerekmez.
5. Tarayıcıdan gerçek alan adında `/dareflip/`, `/dareflip/privacy.html`, `/dareflip/support.html` ve `/dareflip/terms.html` adreslerini açın. Bir site yönlendirmesi bu adresler yerine ana sayfayı gösteriyorsa hosting panelindeki yol/yönlendirme ayarını kontrol edin; başka uygulamaları etkileyen genel kuralları değiştirmeyin.

## Yükleme sonrası

Gerçek tarayıcıdan dört adresin HTTPS üzerinden 200 döndüğünü, doğru IzarGames iletişim bilgisini, iki dili ve seçilen reklam sürümünü gösterdiğini kontrol edin. Ardından doğrulanan web/gizlilik/destek adresleri `src/config/publisher.json` içine alınır ve uygulama yeniden hazırlanır. Şifre veya özel SSH anahtarı sohbet içinde paylaşılmaz.
