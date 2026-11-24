# DareFlip — Xcode açmadan Codemagic → TestFlight

Kendi Mac'inizde Xcode açmanız gerekmez. Codemagic, iOS derleme araçlarını kendi macOS sunucusunda çalıştırır, Apple Distribution kimliğiyle imzalı IPA üretir ve App Store Connect'e yükler. Apple Developer hesabı kimlik/sertifika/profil içindir; derlenen uygulama App Store Connect'in TestFlight bölümünden test edilir. Apple üyeliği ve yetkili imzalama erişimi yine gereklidir.

Workflow: **`ios-testflight`**, dosya: kökteki `codemagic.yaml`. Akış yalnızca Codemagic'te elle başlatılır. GitHub'a push tek başına iOS yüklemesi başlatmaz. Akış **upload-only** çalışır: otomatik dış TestFlight beta incelemesi, test grubu dağıtımı veya App Store yayını göndermez. Bu işlemler ve Apple'ın soruları kullanıcı kontrolündedir.

## 1. Apple tarafında uygulama kaydı

Apple Developer → Certificates, Identifiers & Profiles üzerinden ekibinizin sahip olduğu açık bir Bundle ID kaydedin. Geçici kimlik **`com.dareflip.app`**; yalnızca ekibiniz için kullanılabiliyorsa bunu seçin. Kimlik kullanılamıyorsa `codemagic.yaml` içindeki tek bundle anchor değerini kendi gerçek kimliğinizle değiştirin. Aynı anchor imzalama seçimini ve build ortamındaki `BUNDLE_ID` değerini besler; CI, Capacitor ve Xcode yapılandırmasını buna eşitler.

App Store Connect → My Apps bölümünde bu Bundle ID ile iOS uygulamasını oluşturun. SKU'yu siz belirleyin. Uygulamanın **Apple ID** adlı sayısal kimliğini kaydedin; bu Apple hesabı e-posta adresi değildir. Developer **Team ID** değerini de üyelik bilgilerinden alın. Bu değerler uydurulamaz.

## 2. Codemagic'e GitHub reposunu ekleyin

Codemagic'te GitHub hesabını bağlayıp `fiyatperformanselif-lgtm/DareFlip` reposunu ekleyin. `codemagic.yaml` tabanlı yapılandırmayı ve **main** dalını kullanın. GitHub erişimini Codemagic uygulamasına bu repo için verin.

## 3. Apple API bağlantısını güvenli olarak kurun

App Store Connect → Users and Access → Integrations → App Store Connect API bölümünde yetkili ekip kullanıcısıyla bir **team API key** oluşturun. Codemagic'in yayımlama entegrasyonu için belgelenen **App Manager** erişimini kullanın. Sertifika/profil yönetimi için hesabın ilgili Apple ve Codemagic ekip yetkileri de bulunmalıdır.

`.p8` anahtarı yalnızca bir kez indirilebilir. Key ID ve Issuer ID değerlerini kaydedin. Bunları ve özel anahtarı yalnızca Codemagic'in güvenli entegrasyon alanına girin; GitHub'a, YAML'e veya sohbete koymayın.

Codemagic → Team settings → Team integrations → Developer Portal → Connect/Manage keys → Add key yolundan bağlantıyı ekleyin. Bağlantı adını tam olarak şöyle verin:

```text
dareflip-app-store-connect
```

Key ID, Issuer ID ve `.p8` dosyasını bu alanda tanımlayın. YAML'deki `integrations.app_store_connect` bu adı kullanır. Codemagic gerekli Apple API bilgilerini build ortamına kendisi bağlar; ayrıca parolanızı veya API anahtarını repo environment variable'ı olarak yazmayın.

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

Uygulamanın web kontrolleri ve iOS payload/sync komutu Linux'ta denenmiştir. YAML ve CI yardımcıları ayrıca yerel olarak denetlenmiştir. Codemagic uygulaması, Apple entegrasyonu, sertifika/profil ve iki hesap değişkeni kullanıcı tarafından bağlanmadan burada bulut build'i veya TestFlight yüklemesi başlatılamaz. Başarılı Git push, başarılı Apple yüklemesi anlamına gelmez.

Kodlama, imzalama veya yükleme hatasını paylaşırken `.p8`, sertifika özel anahtarı, parolalar, oturum çerezleri ve API token'larını gizleyin. Kodun tamamı ve mevcut test/ürün kapsamı `DEVELOPMENT_STATUS.md` içinde açıklanmıştır.

Resmi kaynaklar: [Codemagic App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/), [iOS signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/), [code signing identities](https://docs.codemagic.io/partials/code-signing-identities/).
