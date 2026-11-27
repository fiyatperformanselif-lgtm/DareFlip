# DareFlip App Store gönderim paketi

Kullanıcı mevcut içerikle yayına geçilmesini açıkça istedi. İçerik kalitesi değişiklikleri sonraki güncellemelere bırakıldı. Bu paket App Store Connect alanlarına girebileceğiniz metinleri hazırlar; Apple hesabında kayıt veya gönderim işlemi yapmaz.

## Gönderilecek aday: 0.1.0 (4)

Kullanıcı 27 Kasım 2026 tarihinde yeni tasarım build'inin TestFlight'a yüklendiğini ve sürüm/build bilgisinin **0.1.0 (4)** olduğunu bildirdi; bu adayla yayına geçilmesini istedi. Önceki **0.1.0 (3)** eski tasarımın tarihsel kaydıdır.

- Sürüm: `0.1.0`
- Build: `4`
- Bundle ID: `com.dareflip.app`
- App Store Connect Apple ID: `6838894449`
- Beklenen uygulama kaynağı: `979d6b36bd5b6198606d90250d5d16cd98dcca68` (premium UX). Build 4'ün gerçek kaynak SHA'sı veya imzalı IPA içeriği bu oturumda doğrudan doğrulanmadı.
- Yeni build'in cihaz testi ve hesaptaki işlem durumu bağımsız olarak incelenmedi. Kullanıcı bildirimi, Apple inceleme onayı değildir.
- [Tasarım ve doğrulama raporu](../../docs/PREMIUM_UX_2026_11_27.md)

Ekrandaki `1.0` taslağını ve eksik alanları düzeltmek için [alan eşlemesi](FIELD_ERRORS_TR.md).

## Distribution ve gönderim

1. [App Store Connect → DareFlip](https://appstoreconnect.apple.com/apps/6838894449/distribution) → **Distribution → 0.1.0** ekranında Build alanından **4** numaralı adayı seçin.
2. **Version Release** alanında **Automatically release this version** seçin ve kaydedin. Yayın, Apple onayından sonra gerçekleşir.
3. **Add for Review → Submit for Review** akışını tamamlayın. Panel eksik zorunlu alan bildirirse gerçek hata listesine göre tamamlayın; bu paket bu alanların hesapta dolu olduğunu iddia etmez.

Bu dosya güncellemesi uygulama kodunu değiştirmez; yalnızca bu evrak değişikliği için yeniden native build gerekmez. Hesaba erişecek connector/tarayıcı kontrol aracı bulunmadığından gönderim bu ajan tarafından yapılmadı.

English (U.S.) için alan eşlemesi:

| App Store Connect alanı | Dosya / değer |
| --- | --- |
| Name | `en-US/name.txt` |
| Subtitle | `en-US/subtitle.txt` |
| Promotional Text | `en-US/promotional_text.txt` |
| Description | `en-US/description.txt` |
| Keywords | `en-US/keywords.txt` |
| App Review Notes | `en-US/review_notes.txt` |
| Copyright | `2026 IzarGames` |
| Support URL | `https://dareflip.izargames.com/dareflip/support.html` |
| Marketing URL | `https://dareflip.izargames.com/dareflip/` |
| Privacy Policy URL | `https://dareflip.izargames.com/dareflip/privacy.html` |

İnceleme için giriş gerekmez. App Review iletişim alanlarını gerçek iletişim bilgilerinizle doldurun; telefon numarası bu pakette uydurulmadı. E-posta için doğrulanan destek adresi `info@izargames.com` kullanıma hazırdır.

## Görseller, yaş ve gizlilik alanları

Mevcut `artifacts/screenshots/` çıktıları Chromium tasarım referanslarıdır. Mağazaya yüklendiği veya native cihaz/simülatörde çekildiği iddia edilmez. App Store Connect'in istediği iPhone/iPad alanlarına gerçek sürümün cihaz/simülatör görüntülerini yükleyin; oyuncu adlarında kurgusal isimler kullanın. Bu dosyaların hesapta bulunup bulunmadığı henüz görülmedi.

Yaş derecelendirmesinde özel yetişkin modunun cinsel temaları ve görevleri dürüstçe belirtilmelidir. Görsellerde çıplaklık olmaması, metinlerde cinsel içerik bulunmadığı anlamına gelmez. Apple'ın hesapladığı yaş derecesi bu pakette uydurulmadı. 18+ yaş onayı ciddi App Review Guideline 1.1.4 riskini kaldırmaz; özel mod açıklama ve inceleme notlarında açıkça yer alır.

Reklamlı sürüm için **Data Not Collected / Veri Toplanmıyor** seçilmemelidir. Kaynakla doğrulanan ayrımlar ve Google SDK'nın resmi gizlilik manifesti `PRIVACY_WORKSHEET_TR.md` içindedir. Mağazadaki gerçek veri türü/amaç/ilişkilendirme/izleme yanıtları kullanılan ayarlara göre tamamlanır; bu paket hesapta gizlilik etiketi yayımlamaz. Sunucudaki gizlilik sayfası, AdMob GDPR izin mesajını da yayımlamaz.

## İncelemeye gönderme ve yayın

Gerekli alanları kaydedip sayfanın **Add for Review → Submit for Review** akışını tamamlayın. Apple eksik alan bildirirse paneldeki gerçek hata listesi esas alınır. Kullanıcı yayına geçilmesini istediği için onaydan sonra otomatik yayın seçeneği amaca uygundur; bu seçim de hesapta kullanıcı tarafından yapılır. Apple'ın kararı henüz alınmadı. TestFlight'taki Ready to Submit durumu, App Store inceleme onayı değildir.

Bu oturumda Apple hesabına veri girecek tarayıcı/connector erişimi yoktur; gerçek başvuru hesabın açık olduğu App Store Connect ekranından yapılmalıdır. Şifre, API anahtarı veya imzalama anahtarı bu pakette bulunmaz ve sohbet içinde paylaşılması gerekmez.
