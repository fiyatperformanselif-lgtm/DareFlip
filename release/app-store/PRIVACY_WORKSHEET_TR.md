# App Privacy, yaş ve ihracat bilgileri

Bu çalışma, önceki build 3 için incelenmiş ve premium kaynakta değişmemiş veri/reklam davranışını, kullanıcı tarafından bildirilen **0.1.0 (4)** adayı için ayırır. Build 4 IPA içeriği ve cihazdaki veri trafiği doğrudan incelenmedi; kaynak ve resmi Google SDK manifesti kanıtı kullanılır. App Store Connect'teki yanıtlar bu ajan tarafından girilmedi. Google manifesti SDK genelindeki beyanlardır; uygulamanın hesap/UMP/mediation ayarlarının veya gerçekleşen ağ trafiğinin yerine geçmez.

## Uygulamanın kendi davranışı

| Konu | Kaynakla doğrulanan durum |
| --- | --- |
| Üyelik, giriş, sunucu | Oyun için yok; incelemeci hesabı gerekmez. |
| Oyuncu adı, seçilen cinsiyet, favoriler, ilerleme | Cihazda saklanır; DareFlip bunları sunucuya veya reklam çağrılarına aktarmaz. |
| Oyuncu yanıtları, mikrofon, video | Kaydedilmez. |
| Paylaşım | Oluşturulan PNG kart metni/türü/modu/zorluğu/markasını içerir; oyuncu adı/cinsiyeti eklenmez. Sistem paylaşım ekranının hedefini kullanıcı seçer. |
| Reklam | AdMob Banner/Interstitial/Rewarded var; isteğe bağlıdır ve UMP canRequestAds sonucuyla kapılanır. |
| Kişiselleştirme | Üç reklam isteği de npa:true kullanır. Bu tek başına No Tracking veya Data Not Collected sonucu vermez. |

Kaynaklar: `src/domain/storage.ts`, `src/services/share.ts`, `src/services/ads.ts`, `src/App.tsx`, `site/content.mjs`.

## Google Mobile Ads 13.11.0 resmi beyanı

Kurulu Capacitor AdMob 8.4.2 paketinin Google Mobile Ads bağımlılığı tam `13.11.0` sürümüdür. Resmi Google SPM paketinin bildirdiği ZIP indirildi; SHA256 değeri paket tanımındakiyle birebir eşleşti. Device/simulator gizlilik manifestleri aynıdır. Ayrıntılar `google-mobile-ads-privacy-evidence.json` dosyasındadır.

Reklamlı sürüm için **Data Not Collected / Veri Toplanmıyor** seçeneği uygun değildir. SDK manifestinin bildirdiği veri türleri:

| App Privacy veri türü | Kimlikle ilişkili | İzleme için | SDK'da belirtilen amaçlar |
| --- | --- | --- | --- |
| Coarse Location / Yaklaşık Konum | Evet | Hayır | Üçüncü taraf reklamı, geliştirici reklam/pazarlaması, analiz |
| Advertising Data / Reklam Verileri | Evet | Hayır | Üçüncü taraf reklamı, geliştirici reklam/pazarlaması, analiz |
| Product Interaction / Ürün Etkileşimi | Evet | Hayır | Üçüncü taraf reklamı, geliştirici reklam/pazarlaması, analiz |
| Device ID / Aygıt Kimliği | Evet | **Evet** | Üçüncü taraf reklamı, geliştirici reklam/pazarlaması, analiz |
| Performance Data / Performans Verileri | Hayır | Hayır | Üçüncü taraf reklamı, geliştirici reklam/pazarlaması, analiz |
| Other Diagnostic Data / Diğer Tanılama Verileri | Hayır | Hayır | Üçüncü taraf reklamı, geliştirici reklam/pazarlaması, analiz |
| Crash Data / Çökme Verileri | Hayır | Hayır | Analiz |

Bu tablodaki SDK beyanlarını hesapta gerçekten kullanılan özellik/amaçlarla birlikte değerlendirin. Manifestte App Functionality amacı yoktur; tahminen eklenmedi. `npa:true`, cihaz kimliği için SDK'nın izleme beyanını kendiliğinden silmez. Oyuncu bilgilerinin yerelde kalması da Google SDK'nın veri beyanlarını ortadan kaldırmaz. İlave mediation/sağlayıcı veya kampanya etkinse onların uygulanan veri pratikleri de hesaba katılır.

## UMP ve ATT ayrımı

Mevcut arayüz doğrudan ATT istemek için `attOptIn:false` gönderir. Ancak eklentinin kurulu `docs/consent.md` belgesi, AdMob'da yayımlanmış **IDFA mesajlarının** UMP üzerinden ayrıca ATT penceresi gösterebildiğini açıkça belirtir. Dolayısıyla yalnızca arayüzde ayrı ATT düğmesi olmamasına dayanarak izleme veya ATT davranışı yoktur denmez.

Bu adayın yayın plisti varsayılan bir ATT açıklaması eklemez. Hesapta ayrıca IDFA mesajı veya izleme davranışı etkinleştirilecekse bu davranış ve gerekli `NSUserTrackingUsageDescription` yeni native build ile birlikte gözden geçirilmelidir. Şu an istenen AdMob GDPR mesajı ayrı bir hesap işlemidir; web sunucusuna gizlilik politikası yüklemek onu yayımlamaz. Gerçek cihazda izin/ret ve geri çekme akışı henüz bu ajan tarafından görülmedi.

## Yaş ve içerik soruları

Özel modda yetişkin/cinsel temalar ve görevler vardır. Bunlar açıklama ve inceleme notlarında açıkça belirtilmiştir. Görsel çıplaklık bulunmaması, cinsel metin kategorilerinin None seçilmesini doğrulamaz. Apple'ın güncel anketindeki içerik türü/sıklığına mevcut deste üzerinden doğru yanıt verilir; hesaplanan yaş derecesi burada uydurulmaz. Yaş onayı ve koşulsuz geçme, Guideline 1.1.4'teki ciddi içerik riskini kaldırmaz.

Kaynakta kumar, bahis, simüle kumar, yarışma, uygulama içi sohbet veya herkese açık kullanıcı içeriği sistemi bulunmaz. Şişeyle oyuncu seçimi ve isteğe bağlı ödüllü reklamlar bir bahis mekaniği değildir.

## İhracat / şifreleme

Uygulamanın kendi şifreleme algoritması/uygulaması bulunmadı. Reklam/ağ hizmetlerinde işletim sisteminin HTTPS özellikleri kullanılabilir; bu, hiç şifreleme kullanılmadığı anlamına gelmez. Apple'ın soruları standart/işletim sistemi şifrelemesi ile istisna dışı uygulama şifrelemesini ayırır. Gerçek soruya ve kullanılan SDK'lara göre ilgili istisna değerlendirilir; kaynağa bakılmadan bütün sorulara otomatik Hayır yanıtı verilmez. Bu adayda `ITSAppUsesNonExemptEncryption` anahtarı yoktur; TestFlight/Distribution soru sorarsa hesapta tamamlanır.
