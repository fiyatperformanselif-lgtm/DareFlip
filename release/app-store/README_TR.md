# DareFlip App Store gönderim paketi

Kullanıcı mevcut içerikle yayına geçilmesini açıkça istedi. İçerik kalitesi değişiklikleri sonraki güncellemelere bırakıldı. Bu paket App Store Connect alanlarına girebileceğiniz metinleri hazırlar; Apple hesabında kayıt veya gönderim işlemi yapmaz.

## Yeni tasarım için yeni build gerekiyor

**Önceki `0.1.0 (3)` bu premium tasarım güncellemesini içermiyor.** Önceki imzalı kaynak `3748094`; cihazdaki isim/skip/devam bildirimi de o adaya ait. Sürüm numarası `0.1.0` kalır; gerçek sonraki build numarasını Codemagic, App Store Connect'teki son değerden belirler. Yeni numara bu pakette uydurulmadı.

- Bundle ID: `com.dareflip.app`
- App Store Connect Apple ID: `6838894449`
- Yeni kaynak için imzalı build, kurulum ve cihaz kontrolleri henüz yapılmadı.
- [Tasarım ve doğrulama raporu](../../docs/PREMIUM_UX_2026_11_27.md)

## Distribution alanları

Manuel Codemagic iş akışıyla yeni adayı yükleyip cihazda test ettikten sonra Distribution sürümü `0.1.0` ile eşleşen **yeni build** seçilmelidir. Yeni mağaza görsellerini o sürümden alın. Önceki kullanıcı onayı yayın niyetini kaydeder; bu paket yeni binary'nin test edildiğini veya hesabın gönderildiğini iddia etmez.

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
