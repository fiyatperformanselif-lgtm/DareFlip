# DareFlip iOS için AdMob kurulumu

Kullanıcı DareFlip için iOS AdMob uygulamasını ve üç reklam birimini oluşturup kimliklerini ekran görüntüleriyle sağladı. Kimlikler yalnızca `codemagic.yaml` içindeki manuel `ios-app-store` akışına bağlandı. Bu işlem hesap açmaz, reklam gösterimi başlatmaz veya mağaza yayını yapmaz. TestFlight betası resmi Google test kimliklerini kullanmaya devam eder.

Son AdMob ekranında mağaza bağlantısı boş, uygulama onayı **İnceleme gerekli**, uygulama doğrulaması ise **Zorunlu değil** görünüyor. Bunlar ekranın o andaki durumlarıdır; kimliklerin oluşturulması reklam sunma veya mağaza onayı anlamına gelmez. Gizlilik/UMP mesajlarının gerçek hesapta yayımlanması ve cihaz testi ayrıca tamamlanmalıdır.

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

## 3. Codemagic'e bağlanan gerçek iOS kimlikleri

Bu değerler `ios-app-store.environment.vars` içinde yer alır. Aynı değerleri tekrar UI'da girmek veya `dareflip_release` grubu oluşturmak gerekmez:

| Değişken | İçerik |
| --- | --- |
| `ADMOB_IOS_APP_ID` | `ca-app-pub-2587621108337963~5176201712` |
| `VITE_ADMOB_IOS_BANNER` | `ca-app-pub-2587621108337963/7046978749` |
| `VITE_ADMOB_IOS_INTERSTITIAL` | `ca-app-pub-2587621108337963/2295400859` |
| `VITE_ADMOB_IOS_REWARDED` | `ca-app-pub-2587621108337963/8669237517` |

Reklamlı mağaza adayı için aynı akışta `DAREFLIP_RELEASE_PROFILE=production-ads`, `VITE_ADS_ENABLED=true` ve `VITE_ADMOB_TESTING=false` açıkça seçildi. Betanın ayarları değiştirilmedi. Kullanıcının sağlanan kartları koruyarak Apple incelemesine aday hazırlama talebi mevcut olduğundan hash'e bağlı içerik değerlendirmesi kaydedilir; ciddi 1.1.4 riski build çıktısında ve inceleme notlarında belirtilir. Bu kayıt Apple onayı değildir. `ios-app-store` yalnızca yayın adayı yükler; App Review gönderimi veya herkese açık yayın otomatik değildir.

AdMob uygulama/birim kimlikleri istemciye derlenen yapılandırmadır; hesap şifresi, OAuth bilgisi, `.p8`, servis hesabı veya imzalama anahtarı değildir. Hesap sırlarını sohbet veya uygulama kaynağına eklemeyin. Bu dört kimlik üretilmeden gerçekmiş gibi örnek kimlik girilmez.

## 4. Yayıncı sayfaları ve izin mesajları

Kullanıcı aşağıdaki gizlilik/destek/koşul sayfalarının tarayıcıda açıldığını doğruladı:

- Ana sayfa: `https://dareflip.izargames.com/dareflip/`
- Gizlilik: `https://dareflip.izargames.com/dareflip/privacy.html`
- Destek: `https://dareflip.izargames.com/dareflip/support.html`
- Koşullar: `https://dareflip.izargames.com/dareflip/terms.html`
- Destek e-postası: `info@izargames.com`

Kullanıcı DareFlip'i kapsayan GDPR mesajını henüz yayımlamadığını belirtti; sunucuya yüklenen gizlilik politikası bu AdMob mesajını yayımlamaz. AdMob **Privacy & messaging / Gizlilik ve mesajlaşma → Avrupa düzenlemeleri → Mesaj oluştur** bölümünden DareFlip seçilmeli, gerçek gizlilik adresi girilmeli ve uygun dil/kabul/ret/tercih seçenekleriyle mesaj ön izlenip yayımlanmalıdır. Hedef diğer bölgeler için gereken mesajlar da gerçek yayın ayarlarıyla hazırlanır. Uygulama gerekli UMP izni olmadan reklam isteği yapmaz; izin formunun AdMob tarafında yapılandırılması gerekir. Yayın cihazında izin/ret ve geri çekme davranışı ayrıca test edilmelidir. Bu hesap işlemi ajan tarafından yapılmadı.

Sağlanan uygulama kimliğinden doğrulanan yayıncı numarası `pub-2587621108337963` için Google'ın standart doğrudan satıcılık kaydıyla yerel `artifacts/admob/app-ads.txt` dosyası hazırlandı:

```text
google.com, pub-2587621108337963, DIRECT, f08c47fec0942fa0
```

Yüklemeden önce satırı AdMob **app-ads.txt** ekranındaki öneriyle karşılaştırın ve panelin belirttiği geliştirici alan adını esas alın. Dosya o sitenin web kökünde `app-ads.txt` olarak sunulmalıdır; bir uygulama alt klasörü içinde bırakılmaz. Örneğin hedef `dareflip.izargames.com` ise adres `https://dareflip.izargames.com/app-ads.txt` olur. Mevcut bir `app-ads.txt` varsa bu tek satırlık dosyayla üzerine yazmayın; diğer uygulamaların kayıtlarını koruyarak satırı ekleyin. Yerel dosya sunucuya yüklenmedi ve Google tarayıcısının doğrulaması henüz alınmadı. Store bağlantısı ve panelin gerekli inceleme adımları gerçek yayın durumuna göre tamamlanır.

Teknik ayrıntılar [ADMOB.md](ADMOB.md), yayın profilleri [RELEASE_SETUP.md](RELEASE_SETUP.md) içinde yer alır.
