# DareFlip iOS için AdMob kurulumu

Kullanıcı DareFlip için AdMob uygulamasını ve reklam birimlerini henüz oluşturmadığını bildirdi. Bu kılavuz mevcut reklam entegrasyonuna gerçek yayıncı kimliklerini sağlamak içindir; hesap açmaz veya reklam yayını başlatmaz. TestFlight betası resmi Google test kimliklerini kullanmaya devam eder.

## 1. iOS uygulamasını ekle

[AdMob](https://apps.admob.com/) hesabında **Uygulamalar / Apps → Uygulama ekle / Add app** yolunu açın. Platform **iOS**, uygulama adı **DareFlip** olmalıdır. Uygulama herkese açık App Store'da henüz yayınlanmadıysa mağazada listelenme sorusuna **Hayır / No** yanıtını verin; App Store Connect kaydı ve TestFlight dağıtımı herkese açık mağaza yayını değildir. Panel farklı bir akış sunuyorsa mevcut uygulamanın yayın durumunu doğru belirtin.

Uygulama ayarlarındaki **AdMob App ID** değerini alın. Bu değer `ca-app-pub-` ile başlar ve içinde `~` bulunur. Apple'ın sayısal uygulama kimliği veya `com.dareflip.app` bundle kimliği yerine kullanılamaz.

## 2. Üç reklam birimi oluştur

Uygulamanın **Reklam birimleri / Ad units → Reklam birimi ekle / Add ad unit** bölümünde aşağıdaki türleri oluşturun. Adlar tanımlayıcı önerilerdir; uygulama birim kimliklerini kullanır.

| Tür | Önerilen ad | Uygulamadaki kullanım |
| --- | --- | --- |
| Banner | `DareFlip_iOS_Menu_Banner` | Uygun menü ekranları |
| Interstitial / Geçiş | `DareFlip_iOS_Break_Interstitial` | Uygun doğal oyun molaları |
| Rewarded / Ödüllü | `DareFlip_iOS_Bonus_Rewarded` | İsteğe bağlı bonus paket açma |

Her birim ayrı bir kimlik verir. Birim kimlikleri `ca-app-pub-` ile başlar ve içinde `/` bulunur. Bir reklam biriminin oluşturulması, hesabın veya uygulamanın reklam sunmaya onaylandığı anlamına gelmez; paneldeki gerçek durum ayrıca kontrol edilmelidir.

## 3. Kimlikleri Codemagic'e tanımla

Uygulamanın Codemagic **Environment variables** bölümündeki `dareflip_release` grubuna gerçek değerler eklenir:

| Değişken | İçerik |
| --- | --- |
| `ADMOB_IOS_APP_ID` | AdMob iOS uygulama kimliği (`~` içerir) |
| `VITE_ADMOB_IOS_BANNER` | Banner birim kimliği (`/` içerir) |
| `VITE_ADMOB_IOS_INTERSTITIAL` | Interstitial birim kimliği (`/` içerir) |
| `VITE_ADMOB_IOS_REWARDED` | Rewarded birim kimliği (`/` içerir) |

Reklamlı mağaza adayı için aynı grupta `DAREFLIP_RELEASE_PROFILE=production-ads`, `VITE_ADS_ENABLED=true` ve `VITE_ADMOB_TESTING=false` açıkça seçilir. Bunlar mevcut beta grubunu değiştirmek için kullanılmaz. `ios-app-store` akışı yayın adayı yükler; içerik değerlendirmesi ve diğer yayın hazırlıkları tamamlanmadan kontrolü geçmez. App Review gönderimi veya herkese açık yayın otomatik değildir.

AdMob uygulama/birim kimlikleri istemciye derlenen yapılandırmadır; hesap şifresi, OAuth bilgisi, `.p8`, servis hesabı veya imzalama anahtarı değildir. Hesap sırlarını sohbet veya uygulama kaynağına eklemeyin. Bu dört kimlik üretilmeden gerçekmiş gibi örnek kimlik girilmez.

## 4. Yayıncı sayfaları ve izin mesajları

Kullanıcı aşağıdaki gizlilik/destek/koşul sayfalarının tarayıcıda açıldığını doğruladı:

- Ana sayfa: `https://dareflip.izargames.com/dareflip/`
- Gizlilik: `https://dareflip.izargames.com/dareflip/privacy.html`
- Destek: `https://dareflip.izargames.com/dareflip/support.html`
- Koşullar: `https://dareflip.izargames.com/dareflip/terms.html`
- Destek e-postası: `info@izargames.com`

AdMob **Privacy & messaging / Gizlilik ve mesajlaşma** bölümünde hedef bölgeler için gereken mesajlar gerçek yayın ayarlarıyla hazırlanıp yayımlanmalıdır. Uygulama gerekli UMP izni olmadan reklam isteği yapmaz; izin formunun AdMob tarafında yapılandırılması gerekir. Yayın cihazında izin/ret ve geri çekme davranışı ayrıca test edilmelidir.

AdMob `app-ads.txt` doğrulaması isterse panelin verdiği gerçek yayıncı satırını ve hedef alan adını kullanın. Bu satır henüz sağlanmadığı için tahmini yayıncı numarasıyla bir dosya hazırlanmadı. Gerçek satır alındığında mevcut diğer uygulamaların kayıtlarını koruyarak ilgili web kökündeki `app-ads.txt` dosyasına eklenir ve panelden doğrulanır.

Teknik ayrıntılar [ADMOB.md](ADMOB.md), yayın profilleri [RELEASE_SETUP.md](RELEASE_SETUP.md) içinde yer alır.
