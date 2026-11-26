# DareFlip — Xcode açmadan Codemagic → TestFlight

Kendi Mac'inizde Xcode açmanız gerekmez. Codemagic, iOS derleme araçlarını kendi macOS sunucusunda çalıştırır, Apple Distribution kimliğiyle imzalı IPA üretir ve App Store Connect'e yükler. Apple Developer hesabı kimlik/sertifika/profil içindir; derlenen uygulama App Store Connect'in TestFlight bölümünden test edilir. Apple üyeliği ve yetkili imzalama erişimi yine gereklidir.

Workflow: **`ios-testflight`**, dosya: kökteki `codemagic.yaml`. Akış yalnızca Codemagic'te elle başlatılır. GitHub'a push tek başına iOS yüklemesi başlatmaz. Akış **upload-only** çalışır: otomatik dış TestFlight beta incelemesi, test grubu dağıtımı veya App Store yayını göndermez. Bu işlemler ve Apple'ın soruları kullanıcı kontrolündedir.

## 1. Apple tarafında uygulama kaydı

Apple Developer → Certificates, Identifiers & Profiles üzerinden ekibinizin sahip olduğu açık bir Bundle ID kaydedin. Geçici kimlik **`com.dareflip.app`**; yalnızca ekibiniz için kullanılabiliyorsa bunu seçin. Kimlik kullanılamıyorsa `codemagic.yaml` içindeki tek bundle anchor değerini kendi gerçek kimliğinizle değiştirin. Aynı anchor imzalama seçimini ve build ortamındaki `BUNDLE_ID` değerini besler; CI, Capacitor ve Xcode yapılandırmasını buna eşitler.

App Store Connect → My Apps bölümünde bu Bundle ID ile iOS uygulamasını oluşturun. SKU'yu siz belirleyin. Uygulamanın **Apple ID** adlı sayısal kimliğini kaydedin; bu Apple hesabı e-posta adresi değildir. Developer **Team ID** değerini de üyelik bilgilerinden alın. Bu değerler uydurulamaz.

## 2. Codemagic'e GitHub reposunu ekleyin

Codemagic'te GitHub hesabını bağlayıp `fiyatperformanselif-lgtm/DareFlip` reposunu ekleyin. `codemagic.yaml` tabanlı yapılandırmayı ve **main** dalını kullanın. GitHub erişimini Codemagic uygulamasına bu repo için verin.

## 3. Apple API bağlantısını güvenli olarak kurun

Bu proje, Codemagic'te zaten kayıtlı **Kahvehanem ASC** bağlantısını kullanır. Aynı Apple ekibindeki DareFlip uygulamasına erişimi olan bu bağlantı için yeni bir anahtar oluşturmanız gerekmez. Farklı bir hesapta ilk kurulum yapılıyorsa App Store Connect → Users and Access → Integrations → App Store Connect API bölümünde yetkili ekip kullanıcısıyla bir **team API key** oluşturun. Codemagic'in yayımlama entegrasyonu için belgelenen **App Manager** erişimini kullanın. Sertifika/profil yönetimi için hesabın ilgili Apple ve Codemagic ekip yetkileri de bulunmalıdır.

`.p8` anahtarı yalnızca bir kez indirilebilir. Key ID ve Issuer ID değerlerini kaydedin. Bunları ve özel anahtarı yalnızca Codemagic'in güvenli entegrasyon alanına girin; GitHub'a, YAML'e veya sohbete koymayın.

Codemagic → Team settings → Team integrations → Developer Portal → Connect/Manage keys bölümünde mevcut bağlantının adını kontrol edin. YAML'de kullanılan ad tam olarak şudur:

```text
Kahvehanem ASC
```

Mevcut bağlantıyı yeniden adlandırmayın. Farklı bir hesapta yeni bağlantı gerekiyorsa Add key alanında Key ID, Issuer ID ve `.p8` dosyasını güvenli biçimde tanımlayın ve YAML'deki `integrations.app_store_connect` değerini oradaki gerçek adla eşleştirin. Codemagic gerekli Apple API bilgilerini build ortamına kendisi bağlar; ayrıca parolanızı veya API anahtarını repo environment variable'ı olarak yazmayın.

## 4. İmzalama kimliklerini Codemagic'te hazırlayın

Team settings → codemagic.yaml settings → Code signing identities:

- **iOS certificates:** Apple Distribution sertifikasını, eşleşen özel anahtarıyla birlikte ekleyin. Mevcut `.p12` varsa güvenli yükleme alanını ve parolasını kullanın. Yoksa Codemagic'in Generate certificate yolundan Apple API bağlantınızla oluşturun; arayüzün indirme/parola ve Upload adımlarını tamamlayın. Sertifika listede kullanılabilir görünmelidir. Eski bir sertifikanın yalnızca `.cer` dosyası özel anahtarı sağlamaz.
- **iOS provisioning profiles:** Fetch profiles veya Upload yoluyla bu Bundle ID ve bu dağıtım sertifikası için oluşturulmuş **App Store / App Store Connect distribution** profilini ekleyin. Sertifika/profil eşleşmesinin geçerli olduğunu doğrulayın. Development veya Ad Hoc profili seçmeyin.

Akış `ios_signing.distribution_type: app_store` ve Bundle ID ile bu **Codemagic'te kayıtlı** kimlikleri seçer. Henüz profil yoksa Apple Developer → Profiles → + → App Store Connect dağıtım türü yolundan kayıtlı App ID'nizi ve Codemagic için oluşturduğunuz dağıtım sertifikasını seçin; profili Generate/download ile oluşturup Codemagic'e Upload edin. Fetch profiles var olmayan bir profili oluşturmaz. Sertifika/profilin yalnızca Apple hesabında bulunması yeterli değildir. Bu yöntem için sohbette özel anahtar paylaşmanız veya yerel Xcode kullanmanız gerekmez.

## 5. İki uygulama bilgisini girin

Codemagic'in uygulama/ekip environment variables bölümünde **`dareflip_beta`** grubunu oluşturun ve şu iki değeri ekleyin:

| Değişken | Gireceğiniz gerçek değer |
| --- | --- |
| `APP_STORE_APPLE_ID` | App Store Connect'teki DareFlip uygulamasının sayısal Apple ID'si |
| `APPLE_TEAM_ID` | Apple Developer ekibinizin Team ID'si |

Bunlar özel anahtar değildir; yine de gerçek hesap değerleri YAML'e tahmin edilerek eklenmemiştir. API özel anahtarı yalnızca önceki entegrasyonda kalır. `BUNDLE_ID` YAML anchor'dan gelir; farklı bir UI değeriyle üzerine yazmayın. Kimlik değişecekse anchor'ı ve Apple uygulama/profil kaydını birlikte değiştirin.

## 6. Derlemeyi başlatın

Codemagic → Start new build → branch **main** → workflow **ios-testflight**.

Akış bağımlılıkları lockfile ile kurar, TypeScript/lint/birim kontrollerini yapar, test reklamlı iOS web paketini hazırlar, App Store Connect'teki uygulamanın Bundle ID'sini doğrular, önceki build numarasından yeni bir numara seçer, imzalama profilini uygular ve IPA üretip yükler. Sertifika/profil veya API bilgileri eksikse hata verir; tahmini hesap bilgileriyle devam etmez.

Build numarası kontrolü ağ/API hatasını ilk yükleme gibi yorumlamaz. Aynı uygulama için iki beta build'ini aynı anda başlatmayın; eşzamanlı işler veya başka bir yükleme aynı numarayı seçebilir. Böyle bir durumda hata veren işi diğer yükleme işlendikten sonra yeniden çalıştırın.

Başarılı işin Artifacts bölümünde IPA ve loglar bulunur. iOS derleme/imza/yükleme başarısı ancak Codemagic iş kaydıyla doğrulanabilir; bu Linux makinesinde native archive çalıştırılmamıştır.

## 7. TestFlight'tan yükleyin

Apple yüklemeyi işledikten sonra App Store Connect → DareFlip → TestFlight bölümüne girin. Gerekiyorsa ihracat/şifreleme sorularını gerçek uygulama ve SDK'lara göre yanıtlayın. Ardından iç test grubunu seçip kendinizi ekleyin. iPhone/iPad'de TestFlight uygulamasıyla daveti kabul edip yükleyin.

`submit_to_testflight: false` yüklemeyi engellemez; Codemagic'in otomatik **beta incelemesi gönderimini** kapatır. Dış test kullanıcıları için Beta App Review gerekiyorsa bunu siz başlatırsınız. `submit_to_app_store: false` otomatik mağaza gönderimini de kapatır. Tamamlanmamış 5.000 kart/20 dil hedefi dürüstçe açıklanan iç beta testini teknik olarak engellemez.

## Mevcut doğrulama sınırı

Uygulamanın web kontrolleri ve iOS payload/sync komutu Linux'ta denenmiştir. YAML ve CI yardımcıları ayrıca yerel olarak denetlenmiştir. Kullanıcının 27 Kasım 2026'da paylaştığı ekran, `3748094` için `ios-app-store` run index 2'nin **finished** olduğunu, imzalı archive/export ve Publishing adımlarının tamamlandığını, `App.ipa` çıktısının 3.67 MB olduğunu gösteriyor. Bu, çalışan bulut derleme/yükleme akışına ilişkin kullanıcı kanıtıdır; bu ortamdan kimlik doğrulamalı IPA veya Apple hesabı doğrudan incelenmedi. Gerçek sürüm/build numarası ve işlenme durumu App Store Connect → DareFlip → TestFlight ekranından okunmalıdır. Codemagic index 2, uygulamanın build numarası olarak kabul edilmez. Apple incelemesi, cihaz testi ve herkese açık yayın ayrıca doğrulanır.

Kodlama, imzalama veya yükleme hatasını paylaşırken `.p8`, sertifika özel anahtarı, parolalar, oturum çerezleri ve API token'larını gizleyin. Kodun tamamı ve mevcut test/ürün kapsamı `DEVELOPMENT_STATUS.md` içinde açıklanmıştır.

Resmi kaynaklar: [Codemagic App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/), [iOS signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/), [code signing identities](https://docs.codemagic.io/partials/code-signing-identities/).

## Mağaza adayı için ayrı akış: `ios-app-store`

`ios-testflight` test reklamlı beta akışı olarak kalır. Mağaza adayı için `ios-app-store` akışını **elle** başlatın. Bu akış da yalnızca imzalı adayı App Store Connect'e yükler: beta incelemesine, App Store incelemesine veya herkese açık yayına otomatik göndermez.

Yayıncı gerçek iOS AdMob kimliklerini sağladıktan sonra `codemagic.yaml` içindeki `ios-app-store.environment.vars` doğrudan `production-ads` profilini ve dört kimliği içerir. `dareflip_release` adlı ek grup oluşturmanız veya bu değerleri tekrar girmeniz gerekmez. Aşağıdaki tablo iki desteklenen profilin anlamını açıklar; mevcut manuel mağaza akışında sağdaki profil seçilidir:

| Değişken | Reklamsız aday | Gerçek reklamlı aday |
| --- | --- | --- |
| `DAREFLIP_RELEASE_PROFILE` | `ad-free` | `production-ads` |
| `VITE_ADS_ENABLED` | `false` | `true` |
| `VITE_ADMOB_TESTING` | Akış tarafından `false` | Akış tarafından `false` |
| `ADMOB_IOS_APP_ID` | Gerekmez | Yayıncıya ait gerçek iOS uygulama kimliği (`~`) |
| `VITE_ADMOB_IOS_BANNER` | Gerekmez | Gerçek banner birim kimliği (`/`) |
| `VITE_ADMOB_IOS_INTERSTITIAL` | Gerekmez | Gerçek interstitial birim kimliği (`/`) |
| `VITE_ADMOB_IOS_REWARDED` | Gerekmez | Gerçek rewarded birim kimliği (`/`) |

İki profil de mevcut `dareflip_beta` grubundaki gerçek `APPLE_TEAM_ID`/`APP_STORE_APPLE_ID` ve kayıtlı dağıtım sertifikası/profilini kullanır. Uygulama ve reklam kimlikleri herkese açık yapılandırma değerleridir; API özel anahtarları ve imzalama anahtarları yalnızca güvenli Codemagic alanlarında tutulur.

Yeni akış, **derlemeden önce** iOS yayın ön kontrolünü çalıştırır. Yayıncı bilgileri, politika/destek bağlantıları, içerik ve seçilen reklam profili ön kontrolü geçmeden web paketi veya native archive üretilmez. `release:ios` komutu aynı ön kontrolü kendi içinde de uygular; doğrudan çağrı geçidi atlamaz:

```sh
# Bu bir profil seçimi örneğidir; tamamlanmış yayıncı/ürün ayarlarının yerini tutmaz.
DAREFLIP_RELEASE_PROFILE=ad-free VITE_ADS_ENABLED=false VITE_ADMOB_TESTING=false npm run release:ios
```

`ad-free`, JavaScript'teki reklam çağrılarını kapatmakla yetinmez: Capacitor plugin allowlist'inden AdMob'u çıkarır, SwiftPM köprüsünü dört temel eklentiyle yeniden üretir ve iOS Info.plist'ten GAD/ATT/SKAdNetwork reklam anahtarlarını kaldırır. Üretilen bağımlılık listesi doğrulanır. `production-ads`, örnek kimlikleri kabul etmez; yayıncıya ait uygulama/birim kimlikleri ve gözden geçirilmiş SDK/UMP gizlilik ayarları gerekir. İsteğe bağlı `IOS_TRACKING_USAGE_DESCRIPTION` yalnızca yayıncı tarafından gözden geçirilmiş bir ATT açıklamasıdır; mevcut arayüz ATT izni istemediğinden varsayılan olarak eklenmez.

Beta hazırlama komutu (`npm run beta:ios`) özellikle test modunu yeniden kurar: AdMob eklentisini ve resmi örnek uygulama kimliği/ATT açıklamasını geri getirir. Bu nedenle yalnızca YAML'de `VITE_ADMOB_TESTING` değerini değiştirmek beta akışını mağaza akışına dönüştürmez; mağaza için `release:ios`/`ios-app-store` kullanın.

Linux'ta `python3 scripts/ios-ad-profile-tests.py` ile bağımsız geçici proje üzerinde gerçek Capacitor sync doğrulanmıştır: reklamsız SwiftPM/plugin listesi, reklam anahtarlarının kaldırılması, tekrarlı çalıştırmada aynı sonuç ve beta yapılandırmasına dönüş. Bu kontrol bir iOS derlemesi, imza, IPA incelemesi veya cihaz testi değildir. Yeni mağaza akışının gerçek Codemagic sonucu ve Apple işlem/inceleme durumu ayrıca doğrulanmalıdır.
