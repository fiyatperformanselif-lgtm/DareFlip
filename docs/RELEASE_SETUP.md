# App Store yayını için teknik hazırlık

Bu hazırlık iki açık yayın profili sunar. Hiçbir profil otomatik seçilmez; mevcut `ios-testflight` akışı test reklamlarıyla devam eder. Yeni `ios-app-store` akışı da elle başlatılır ve hazır adayı yükler; App Review gönderimi veya herkese açık yayın otomatik yapılmaz.

## Tamamlanması gereken gerçek bilgiler

`src/config/publisher.json` yalnızca herkese açık beş alanı içerir: `name`, `supportEmail`, `websiteUrl`, `privacyUrl`, `supportUrl`. Şifreler, imzalama anahtarları ve hesap sırları bu dosyaya yazılmaz. Alanlar gerçek bilgiler gelene kadar boştur; örnek alan adları veya uydurulmuş adreslerle yayına hazırmış gibi gösterilmez.

Doğrulanan yayıncı adı **IzarGames**, destek e-postası **info@izargames.com** olarak yapılandırıldı. Kullanıcı sayfaları kendi sunucusuna hosting panelindeki dosya yöneticisinden yükleyecek. Üç web adresi canlı yayın doğrulanana kadar boş kalır. Ayrı `dareflip` klasörünün yerel paketleri ve yükleme adımları [sunucu kılavuzunda](../site/IZARGAMES_SERVER.md) yer alır; önerilen adres planı yayına hazır uygulama yapılandırması değildir.

Uygulama destek ekranı bu yapılandırmadan çalışan e-posta, destek ve gizlilik bağlantılarını oluşturur. Yapılandırılmamış durumda eksikliği açıkça gösterir. Uygulamadaki EN/TR gizlilik/koşul metni ve üretilebilen web sayfaları aynı içerik kaynağını kullanır. Reklamsız ve reklamlı sürümler için farklı, gerçeğe uygun veri işleme açıklaması seçilir.

## Reklam profilleri

| Profil           | Gerekli ayarlar                                                                                                              | Davranış                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ad-free`        | `VITE_ADS_ENABLED=false`, `VITE_ADMOB_TESTING=false`                                                                         | Reklam/UMP/ATT çağrıları kapalı; native AdMob bağımlılığı ve reklam/izleme plist anahtarları paketten çıkarılır. Reklam izleme ve kilitli ödül butonları gösterilmez; daha önce kazanılmış paket hakkı korunur. |
| `production-ads` | `VITE_ADS_ENABLED=true`, `VITE_ADMOB_TESTING=false`, gerçek `ADMOB_IOS_APP_ID` ve üç gerçek `VITE_ADMOB_IOS_*` birim kimliği | Mevcut izin ve hassas içerik kısıtları korunur. Test kimlikleri kabul edilmez; kimlik biçiminin doğrulanması hesap sahipliğini kanıtlamaz.                                                                      |

Geliştirme/test modu üretim build'ine sızamaz: çelişen `NODE_ENV` değerleri reddedilir ve release alt süreçleri üretim modunda çalışır. Betaya dönmek için `npm run beta:ios` test yapılandırmasını geri kurar. Native profil testleri asıl projeyi değiştirmeden `/tmp` kopyalarıyla çalışır.

## İçerik kararı

Gönderilen Flirty-v3 kartları bu teknik hazırlık sırasında değiştirilmedi. App Store için içerik kapsamı hâlâ yayıncının yanıtını bekliyor. Önceki [yayın değerlendirmesi](APP_STORE_READINESS.md) bu destenin politika riskini açıklar.

`src/config/store-review.json` şu anda `pending` durumundadır. İçerik değerlendirmesi seçilen aktif katalog ve uygulamadan erişilebilen iki arşivin birlikte hash'ine bağlıdır; katalog veya arşiv değişirse eski değerlendirme geçerli sayılmaz. Bu kayıt Apple onayı değildir. İncelemeciye farklı içerik gösteren veya onay sonrasında gizli içeriği açan bir mekanizma eklenmedi.

`src/config/store-listing.json` gerçek mağaza iddialarını denetler. 5.000 kart hedefi ve eksik diğer diller yol haritası uyarılarıdır; Apple minimumları olarak sunulmaz. Tamamlanmış dil veya erişilebilir kart sayısı hakkında yanlış iddia yapılırsa kontrol durur.

## Yayın adayı hazırlama

Gerçek yapılandırma ve içerik kararı tamamlandıktan sonra seçilen profil ortamda açıkça verilmelidir:

```sh
npm run check:release -- --platform ios --profile ad-free
npm run release:ios -- --profile ad-free
```

Bu komutlar tek başına profil/kimlik değerlerini tamamlamaz. Eksik veya çelişen ayarlar varsa derleme başlamadan durur. İlk aşama amaçlanan yapılandırmayı doğrular; sync sonrasındaki ikinci aşama üretilen gerçek plist, SPM ve plugin listesini denetler. Android ayarları iOS kontrolünün ön koşulu yapılmaz; Android için doğrulanmamış sonuç iddia edilmez.

Codemagic'teki yeni `dareflip_release` değişken grubu seçilen profil ve reklam ayarlarını içerir. Önceden kullanılan Apple takım/app kimliği ve entegrasyon kurulumu korunur. [Codemagic kılavuzundaki](CODEMAGIC_TESTFLIGHT.md) `ios-app-store` akışını kullanın. Build sonrasında gerçek sürüm/build numarasıyla App Store Connect metadata, yaş/gizlilik/ihracat soruları, ekran görüntüleri ve cihaz kontrolleri tamamlanmalıdır.

## Gizlilik ve destek sayfaları

Gerçek yayıncı alanları ve açık reklam modu gereklidir:

```sh
VITE_ADS_ENABLED=false npm run public:build
```

Komut `artifacts/legal-site/` altında dört bağımsız EN/TR HTML sayfası ve manifest üretir. Eksik/örnek bilgilerle çıktı üretmez. Adresler verilen gerçek HTTPS değerlerinden alınır; bir Terms adresi verilmediyse varmış gibi uydurulmaz. Yerel üretim hosting/deployment veya erişilebilirlik kanıtı değildir; sayfalar gerçek adreslerde yayınlanıp kontrol edilmelidir.

## Doğrulama

```sh
npm run typecheck
npm run lint
npm test
npm run test:release
```

Ek tarayıcı kontrolleri normal beta akışını ve ayrı, yalnızca test sürecine ait reklamsız yapılandırmayı sınar. Test kimlikleri ve yayıncı fikstürleri canlı hesap bilgisi olarak kaydedilmez veya yayınlanmaz. Bu kontroller native iPhone çalıştırması, hukuki yeterlilik, gerçek reklam dolumu veya Apple onayı anlamına gelmez.
