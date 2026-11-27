# App Privacy ve ekran görüntüsü adımları

Son paylaşılan Distribution ekranında dört engel var: App Privacy beyanı, Privacy Policy URL, 13 inç iPad görüntüsü ve Dynamic Island orta ekran iPhone görüntüsü. Bu ekran, önceki yaş/kategori/iletişim hatalarını artık göstermiyor; hesapta gönderim veya yayın bu ajan tarafından yapılmadı.

## App Privacy

Soldan **App Privacy** bölümünü açın. Privacy Policy alanındaki **Edit** ile şu adresi girip kaydedin:

`https://dareflip.izargames.com/dareflip/privacy.html`

**Get Started / Edit** akışındaki, uygulamanın veya üçüncü taraf ortaklarının veri toplaması sorusuna **Yes** yanıtı verilir. Reklamlı sürüm AdMob içerir; yerel oyuncu bilgilerinin sunucuya gitmemesi reklam SDK'sını bu kapsamın dışında bırakmaz.

Kaynakla doğrulanan Google Mobile Ads 13.11.0 manifesti şu veri türlerini beyan eder:

| App Privacy grubu | Tür |
| --- | --- |
| Location | Coarse Location / Approximate Location |
| Identifiers | Device ID |
| Usage Data | Product Interaction, Advertising Data |
| Diagnostics | Crash Data, Performance Data, Other Diagnostic Data |

Amaç, kimlikle ilişkilendirme ve izleme soruları için [ayrıntılı çalışma sayfası](PRIVACY_WORKSHEET_TR.md) esas alınır. Bunlar SDK genelindeki beyanlardır; gerçek hesap/mediation/IDFA mesajı ayarları ayrıca değerlendirilir. `npa:true` ve arayüzde ATT düğmesi olmaması tek başına No Tracking sonucunu vermez. SDK manifesti Device ID için tracking=true beyan eder; bu fark gerçek ayarlar görülmeden yok sayılmaz. Oyuncu adı, cinsiyet, yanıt ve ilerleme uygulama tarafından sunucuya aktarılmaz.

Beyanların hesapta kaydedilip yayımlanması Admin veya uygun yetkili hesap gerektirir. Burada hesap alanları otomatik doldurulmadı; seçilen amaçlar ve son Publish işlemi doğrulanmadı.

## Mağaza görselleri

[Native simülatör kılavuzundaki](../../docs/IOS_STORE_SCREENSHOTS.md) manuel **ios-store-screenshots** Codemagic akışı gerçek iPhone 16 Pro ve iPad Pro 13 inç (M4) simülatörlerini başlatıp uygulamayı çalıştırır. Yerel Mac/Xcode, Apple şifresi, imzalama sertifikası veya yeni TestFlight yüklemesi gerektirmez. Yeni iş akışı bu Linux ortamında native olarak çalıştırılmadı; başarılı Codemagic çalışması sonrasında üretilen dosyalar kullanılmalıdır.

Hedef modellerin portre ölçüleri iPhone için **1206×2622**, iPad için **2064×2752**. Hesabın tam slot kabul listesi henüz görülmedi. Native akış boyutları denetler, görüntüleri esnetmez ve hata halinde başarılı çekim iddiası üretmez.

Codemagic → **DareFlip → Start new build → Branch: main → Workflow: DareFlip · Native store screenshots (manual)** akışını başlatın. Gerekirse yeni iş akışının görünmesi için depo/YAML listesini yenileyin.

İş başarıyla bittikten sonra **Artifacts → DareFlip-native-store-screenshots.zip** içindeki `upload/` JPEG'lerini ilgili iPhone/iPad alanlarına yükleyin. `raw/` PNG'ler ham kanıttır ve alfa kanalı içerebilir. Manifest gerçek simülatör, kaynak ve çekim bilgilerini taşır. Bu iş akışı App Store'a otomatik görsel veya uygulama göndermez.

Ayrıca hazırlanmış on PNG, çalışan uygulamanın Chromium referanslarıdır. Bunlar native iOS, TestFlight veya Apple slot kabulü kanıtı olarak etiketlenmez. Gerçek simülatör JPEG'leriyle karıştırmayın. İçerik/işlev uyumu ve mağaza önizlemesi yüklemeden önce kontrol edilir.
