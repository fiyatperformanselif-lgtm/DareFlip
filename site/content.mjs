/** Static policy/support copy. Publishing identity is supplied only by publisher.json. */
export function pageCopy(page, publisher, adsEnabled) {
  const privacy = {
    title: "Privacy Policy",
    titleTr: "Gizlilik Politikası",
    en: [
      {
        title: "Publisher and contact",
        paragraphs: [
          `${publisher.name} publishes DareFlip. Contact ${publisher.supportEmail} for privacy questions or requests. The support and privacy links on this page are the publisher’s configured addresses.`,
        ],
      },
      {
        title: "Gameplay and your information",
        paragraphs: [
          "DareFlip is an offline Truth or Dare game. It does not require an account or operate a gameplay backend. Names, gender choices, favorites, settings and session progress are not uploaded to a DareFlip server. Answers are spoken between players; the app does not record them.",
          "Social modes support 2–20 players. Private Flirty is a separate mode for exactly two adult partners, each confirming that they are at least 18 and want to play. Random excludes private Flirty cards. Starting a game does not imply agreement to an activity; either partner can stop or skip without explanation or a penalty.",
        ],
      },
      {
        title: "Information stored on your device",
        paragraphs: [
          "Player names, explicit gender choices, mode, difficulty, language, preferences, favorites, unlocked packs, private-session acknowledgement and current session are stored locally to run and resume the game. Gender is not inferred from a name; “Prefer not to say” is a valid choice. Gameplay names and gender choices are not sent to advertising services.",
          "Reset local data in Settings to erase the app’s local progress and preferences. Clearing application/browser data or uninstalling can also remove them. Device backups may retain copies under your operating-system backup settings. Review those settings if you share a device.",
        ],
      },
      ...(adsEnabled
        ? [
            {
              title: "Optional advertising in this edition",
              paragraphs: [
                "This edition supports optional native advertising through Google AdMob and Google’s User Messaging Platform (UMP). Core gameplay works without ads, without network access, and when an ad cannot load. The web version does not request native ads.",
                "The app requests ads only after you choose to enable them and UMP reports that ad requests are permitted. Where offered, Google’s consent form and privacy options let you manage your choices. Advertising can be disabled in Settings. Any iOS system tracking permission is separate; declining tracking does not prevent gameplay.",
                "The app requests non-personalized ads. These can still involve identifiers, IP address, approximate location inferred from IP, device/app information, ad interactions and diagnostic data for delivery, fraud prevention, measurement and frequency controls. Google and its partners process data according to their policies, consent settings and applicable law. Exact practices depend on the SDK, platform and region.",
                "Ads are excluded from sensitive-card and private Flirty contexts. Optional bonus packs unlock only after an earned reward is confirmed; closing an ad never restricts the core game.",
              ],
              links: [
                {
                  href: "https://policies.google.com/technologies/ads",
                  label: "Google advertising privacy information",
                },
                {
                  href: "https://policies.google.com/privacy",
                  label: "Google Privacy Policy",
                },
              ],
            },
          ]
        : [
            {
              title: "Advertising is disabled in this edition",
              paragraphs: [
                "This edition has advertising disabled. DareFlip’s advertising feature does not make ad requests. Core gameplay does not require viewing an ad.",
              ],
            },
          ]),
      {
        title: "Sharing",
        paragraphs: [
          "Sharing is your explicit choice. The app creates a card image on your device and opens the system share sheet, or downloads a PNG in a browser. Generated card images exclude player names and gender choices. The destination you choose handles shared information under its own terms and privacy policy.",
          "The app attempts to remove temporary native share images from its cache after sharing. Copies saved or sent to another app are controlled by you and that destination. Share private-partner content only with both partners’ agreement.",
        ],
      },
      {
        title: "Age and voluntary participation",
        paragraphs: [
          "DareFlip is intended for adults, not children. The private mode’s two confirmations are declarations, not independent identity or age verification. Consent can change at any time. No card overrides a person’s current decision. Do not enter personal information you do not want other players to see.",
        ],
      },
      {
        title: "Choices, retention and requests",
        paragraphs: [
          `Local gameplay information stays on the device until you delete it, subject to device backups and storage behavior. There is no DareFlip gameplay account or server-held answer history to delete. You can reset local data, change sound/haptics and language, and decide whether to share. For publisher privacy requests, email ${publisher.supportEmail}.`,
          ...(adsEnabled
            ? [
                "For information processed by Google, use Google’s privacy controls and the advertising choices available in the app. Google or share destinations may process data internationally and retain it under their own policies.",
              ]
            : [
                "A share destination you choose may process data internationally and retain it under its own policies.",
              ]),
        ],
      },
      {
        title: "This website and changes",
        paragraphs: [
          "These static pages include no analytics scripts, advertising scripts or contact form. Your hosting provider may process ordinary website request data, such as IP address and browser information, under its own policy. Emailing support discloses the information you choose to send and involves your email provider and the publisher’s email service.",
          "The publisher will update this policy when the game’s configuration or data practices change. The date on this page identifies this version.",
        ],
      },
    ],
    tr: [
      {
        title: "Yayıncı ve iletişim",
        paragraphs: [
          `DareFlip’in yayıncısı ${publisher.name}. Gizlilik sorularınız ve talepleriniz için ${publisher.supportEmail} adresine yazabilirsiniz. Bu sayfadaki destek ve gizlilik bağlantıları yayıncının yapılandırdığı adreslerdir.`,
        ],
      },
      {
        title: "Oyun ve bilgileriniz",
        paragraphs: [
          "DareFlip çevrimdışı bir Doğruluk mu Cesaret mi oyunudur. Üyelik gerektirmez ve oyun verilerini tutan bir sunucusu yoktur. İsimler, cinsiyet seçimleri, favoriler, ayarlar ve oyun ilerlemesi DareFlip sunucusuna yüklenmez. Cevaplar oyuncular arasında sözlü olarak paylaşılır; uygulama bunları kaydetmez.",
          "Sosyal modlar 2–20 oyuncuyu destekler. Özel Flört modu, 18 yaşında veya daha büyük olduğunu ve oynamak istediğini ayrı ayrı onaylayan tam iki yetişkin partner içindir. Rastgele modu özel Flört kartlarını içermez. Oyuna başlamak, bir etkinliği kabul etmek anlamına gelmez; her iki partner de açıklama yapmadan ve ceza almadan durabilir veya kartı geçebilir.",
        ],
      },
      {
        title: "Cihazınızda saklanan bilgiler",
        paragraphs: [
          "Oyuncu isimleri, açık cinsiyet seçimleri, mod, zorluk, dil, tercihler, favoriler, açılan paketler, özel oturum onayı ve mevcut oyun, oyunu çalıştırmak ve sürdürmek için yerel olarak saklanır. İsimden cinsiyet çıkarımı yapılmaz; “Belirtmek istemiyorum” geçerli bir seçimdir. Oyuncu isimleri ve cinsiyet seçimleri reklam hizmetlerine gönderilmez.",
          "Uygulamanın yerel ilerlemesini ve tercihlerini silmek için Ayarlar’daki yerel verileri sıfırlama seçeneğini kullanın. Uygulama veya tarayıcı verilerini temizlemek ya da uygulamayı kaldırmak da bunları silebilir. İşletim sistemi yedekleme ayarlarınıza bağlı olarak yedeklerde kopyalar kalabilir. Cihazınızı paylaşıyorsanız bu ayarları gözden geçirin.",
        ],
      },
      ...(adsEnabled
        ? [
            {
              title: "Bu sürümde isteğe bağlı reklamlar",
              paragraphs: [
                "Bu sürüm Google AdMob ve Google’ın Kullanıcı Mesajlaşma Platformu (UMP) üzerinden isteğe bağlı native reklamları destekler. Ana oyun reklam olmadan, internetsizken ve reklam yüklenemediğinde de çalışır. Web sürümü native reklam isteği göndermez.",
                "Uygulama yalnızca siz reklamları açmayı seçtikten ve UMP reklam isteğine izin verildiğini bildirdikten sonra reklam ister. Sunulduğu yerlerde Google’ın izin formu ve gizlilik seçenekleri tercihlerinizi yönetmenizi sağlar. Reklamları Ayarlar’dan kapatabilirsiniz. iOS’un sistem takip izni ayrıdır; takip iznini reddetmek oyunu engellemez.",
                "Uygulama kişiselleştirilmemiş reklamlar ister. Bu reklamlar da gösterim, dolandırıcılığı önleme, ölçüm ve sıklık kontrolü için tanımlayıcılar, IP adresi, IP’den çıkarılan yaklaşık konum, cihaz ve uygulama bilgileri, reklam etkileşimleri ve tanılama verilerini işleyebilir. Google ve iş ortakları verileri kendi politikaları, izin tercihleri ve geçerli hukuk doğrultusunda işler. Ayrıntılar SDK’ya, platforma ve bölgeye bağlıdır.",
                "Hassas kartlarda ve özel Flört bağlamında reklam gösterilmez. İsteğe bağlı bonus paketler yalnızca kazanılan ödül onaylandıktan sonra açılır; reklamı kapatmak ana oyunu kısıtlamaz.",
              ],
              links: [
                {
                  href: "https://policies.google.com/technologies/ads",
                  label: "Google reklam gizliliği bilgileri",
                },
                {
                  href: "https://policies.google.com/privacy",
                  label: "Google Gizlilik Politikası",
                },
              ],
            },
          ]
        : [
            {
              title: "Bu sürümde reklamlar kapalı",
              paragraphs: [
                "Bu sürümde reklamlar kapalıdır. DareFlip’in reklam özelliği reklam isteği göndermez. Ana oyunu oynamak için reklam izlemek gerekmez.",
              ],
            },
          ]),
      {
        title: "Paylaşım",
        paragraphs: [
          "Paylaşmak sizin açık seçiminizdir. Uygulama kart görselini cihazınızda oluşturup sistem paylaşım ekranını açar veya tarayıcıda PNG dosyası indirir. Oluşturulan kart görsellerinde oyuncu isimleri ve cinsiyet seçimleri yer almaz. Seçtiğiniz paylaşım hedefi bilgileri kendi koşulları ve gizlilik politikası kapsamında işler.",
          "Uygulama, native paylaşımın ardından geçici görselleri önbelleğinden silmeye çalışır. Başka bir uygulamaya kaydedilen veya gönderilen kopyalar sizin ve o hizmetin kontrolündedir. Partnerinize özel içerikleri yalnızca iki tarafın da onayıyla paylaşın.",
        ],
      },
      {
        title: "Yaş ve gönüllü katılım",
        paragraphs: [
          "DareFlip çocuklar için değil, yetişkinler için tasarlanmıştır. Özel moddaki iki onay birer beyandır; bağımsız kimlik veya yaş doğrulaması değildir. Rıza her an değişebilir. Hiçbir kart bir kişinin o anki kararını geçersiz kılamaz. Diğer oyuncuların görmesini istemediğiniz kişisel bilgileri girmeyin.",
        ],
      },
      {
        title: "Tercihler, saklama süresi ve talepler",
        paragraphs: [
          `Yerel oyun bilgileri siz silene kadar, cihazın yedekleme ve depolama davranışlarına bağlı olarak cihazda kalır. Silinecek bir DareFlip oyun hesabı veya sunucuda tutulan cevap geçmişi yoktur. Yerel verileri sıfırlayabilir, ses/titreşim ve dil tercihlerini değiştirebilir, paylaşım yapıp yapmamayı seçebilirsiniz. Yayıncıya gizlilik talepleriniz için ${publisher.supportEmail} adresine yazın.`,
          ...(adsEnabled
            ? [
                "Google’ın işlediği bilgiler için Google gizlilik kontrollerini ve uygulamadaki reklam tercihlerini kullanın. Google veya paylaşım hedefleri verileri farklı ülkelerde işleyebilir ve kendi politikalarına göre saklayabilir.",
              ]
            : [
                "Seçtiğiniz paylaşım hedefi verileri farklı ülkelerde işleyebilir ve kendi politikasına göre saklayabilir.",
              ]),
        ],
      },
      {
        title: "Bu web sitesi ve değişiklikler",
        paragraphs: [
          "Bu statik sayfalarda analiz betikleri, reklam betikleri veya iletişim formu yoktur. Barındırma sağlayıcınız IP adresi ve tarayıcı bilgileri gibi sıradan web isteği verilerini kendi politikası kapsamında işleyebilir. Desteğe e-posta gönderdiğinizde paylaşmayı seçtiğiniz bilgiler, e-posta sağlayıcınız ve yayıncının e-posta hizmeti üzerinden iletilir.",
          "Yayıncı, oyunun yapılandırması veya veri işleme uygulamaları değiştiğinde bu politikayı günceller. Sayfadaki tarih bu sürümü belirtir.",
        ],
      },
    ],
  };
  const terms = {
    title: "Terms of Use",
    titleTr: "Kullanım Koşulları",
    en: [
      {
        title: "Publisher and voluntary play",
        paragraphs: [
          `DareFlip is published by ${publisher.name}. Contact ${publisher.supportEmail} with questions about these terms.`,
          "DareFlip is intended for adults. Social modes support 2–20 players; private Flirty is exclusively for two adult partners who each confirm being at least 18 and choosing to play together. It includes private adult-partner content. The confirmations are declarations, not independent age verification.",
        ],
      },
      {
        title: "Your choice on every card",
        paragraphs: [
          "Starting a game does not mean consenting to an activity. Both partners must be willing at that moment. Anyone can skip a card, stop or leave without an explanation or game penalty. Never pressure another person. No card overrides a person’s current boundaries or applicable law.",
          "Random excludes private Flirty cards. Selecting a social or Random game does not opt anyone into private content. On private cards, first-person words such as “me” and “my” refer to the other partner.",
        ],
      },
      {
        title: "Responsible use",
        paragraphs: [
          "Do not use the game for dangerous, unlawful, humiliating, discriminatory or nonconsensual activities. Do not perform an activity when the circumstances make it unsafe. You remain responsible for how you choose to use the game.",
        ],
      },
      {
        title: "Content and sharing",
        paragraphs: [
          "The app’s software, artwork, branding and content are subject to applicable intellectual-property rights and third-party licenses. You may share individual cards through the app for personal, noncommercial use, subject to those rights and the destination service’s rules. Share private-partner content only with both partners’ agreement.",
          "A content update may introduce new card editions. Earlier saved cards and favorites retain their own wording rather than silently becoming different prompts. Preserving an earlier group save does not authorize a new private session.",
        ],
      },
      {
        title: "Offline use, storage and optional services",
        paragraphs: [
          "No account is required for core play. Progress and preferences are saved locally and can be lost if device storage is cleared, the app is uninstalled, or a device fails. Keep this in mind before resetting local data.",
          ...(adsEnabled
            ? [
                "This edition supports optional advertising and rewarded packs, subject to consent, availability and network access. Declining or closing an ad does not restrict core gameplay. Bonus access requires confirmation of an earned reward.",
              ]
            : [
                "Advertising is disabled in this edition. Core play does not depend on watching an ad.",
              ]),
          "This version includes no subscriptions or in-app purchases. Sharing destinations and device/platform services operate under their own terms.",
        ],
      },
      {
        title: "Availability and your legal rights",
        paragraphs: [
          "The app is provided as available, subject to mandatory consumer protections. To the extent permitted by applicable law, uninterrupted availability and compatibility with every device are not guaranteed. These terms do not exclude rights or liabilities that cannot legally be excluded.",
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          `Material changes to these terms will be dated and communicated through the app or publisher’s website. For support or questions about your use of DareFlip, contact ${publisher.supportEmail}.`,
        ],
      },
    ],
    tr: [
      {
        title: "Yayıncı ve gönüllü oyun",
        paragraphs: [
          `DareFlip’in yayıncısı ${publisher.name}. Bu koşullarla ilgili sorularınız için ${publisher.supportEmail} adresine yazabilirsiniz.`,
          "DareFlip yetişkinler için tasarlanmıştır. Sosyal modlar 2–20 oyuncuyu destekler. Özel Flört modu yalnızca 18 yaşında veya daha büyük olduğunu ve birlikte oynamak istediğini ayrı ayrı onaylayan iki yetişkin partner içindir; partnere özel yetişkin içeriği içerir. Onaylar birer beyandır, bağımsız yaş doğrulaması değildir.",
        ],
      },
      {
        title: "Her kartta seçim sizin",
        paragraphs: [
          "Oyuna başlamak bir etkinliğe rıza göstermek anlamına gelmez. İki partner de o anda istekli olmalıdır. Herkes açıklama yapmadan ve oyun cezası almadan bir kartı geçebilir, durabilir veya ayrılabilir. Kimseye baskı yapmayın. Hiçbir kart kişinin o anki sınırlarını veya geçerli hukuku geçersiz kılamaz.",
          "Rastgele modu özel Flört kartlarını içermez. Sosyal veya Rastgele oyun seçmek özel içeriğe katılmak anlamına gelmez. Özel kartlardaki “bana”, “beni” ve “benim” gibi ifadeler diğer partneri kasteder.",
        ],
      },
      {
        title: "Sorumlu kullanım",
        paragraphs: [
          "Oyunu tehlikeli, yasa dışı, aşağılayıcı, ayrımcı veya rıza dışı etkinlikler için kullanmayın. Koşullar bir etkinliği güvensiz kılıyorsa yapmayın. Oyunu nasıl kullandığınızdan sorumlusunuz.",
        ],
      },
      {
        title: "İçerik ve paylaşım",
        paragraphs: [
          "Uygulamanın yazılımı, görselleri, markası ve içeriği geçerli fikrî mülkiyet haklarına ve üçüncü taraf lisanslarına tabidir. Bu haklara ve paylaşım hedefinin kurallarına uyarak tekil kartları uygulama üzerinden kişisel, ticari olmayan kullanım için paylaşabilirsiniz. Partnere özel içerikleri yalnızca iki tarafın da onayıyla paylaşın.",
          "İçerik güncellemeleri yeni kart sürümleri getirebilir. Önceden kaydedilmiş kartlar ve favoriler sessizce farklı sorulara dönüşmek yerine kendi metinlerini korur. Eski bir grup kaydının korunması yeni bir özel oturum için onay sayılmaz.",
        ],
      },
      {
        title: "Çevrimdışı kullanım, depolama ve isteğe bağlı hizmetler",
        paragraphs: [
          "Ana oyun için üyelik gerekmez. İlerleme ve tercihler yerel olarak saklanır; cihaz verileri temizlendiğinde, uygulama kaldırıldığında veya cihaz arızalandığında kaybolabilir. Yerel verileri sıfırlamadan önce bunu dikkate alın.",
          ...(adsEnabled
            ? [
                "Bu sürüm izinlere, kullanılabilirliğe ve internet erişimine bağlı isteğe bağlı reklamları ve ödüllü paketleri destekler. Reklamı reddetmek veya kapatmak ana oyunu kısıtlamaz. Bonus erişimi için kazanılan ödülün onaylanması gerekir.",
              ]
            : [
                "Bu sürümde reklamlar kapalıdır. Ana oyun reklam izlemeye bağlı değildir.",
              ]),
          "Bu sürümde abonelik veya uygulama içi satın alma yoktur. Paylaşım hedefleri ve cihaz/platform hizmetleri kendi koşullarıyla çalışır.",
        ],
      },
      {
        title: "Kullanılabilirlik ve yasal haklarınız",
        paragraphs: [
          "Uygulama zorunlu tüketici korumaları saklı kalmak üzere mevcut hâliyle sunulur. Geçerli hukukun izin verdiği ölçüde kesintisiz kullanılabilirlik veya her cihazla uyumluluk garanti edilmez. Bu koşullar, hukuken hariç tutulamayan hakları veya sorumlulukları ortadan kaldırmaz.",
        ],
      },
      {
        title: "Değişiklikler ve iletişim",
        paragraphs: [
          `Bu koşullardaki önemli değişiklikler tarihlendirilir ve uygulama veya yayıncının web sitesi üzerinden bildirilir. DareFlip kullanımıyla ilgili destek ve sorularınız için ${publisher.supportEmail} adresine yazın.`,
        ],
      },
    ],
  };
  const support = {
    title: "Support",
    titleTr: "Destek",
    en: [
      {
        title: "Contact the publisher",
        paragraphs: [
          `For help with DareFlip, email ${publisher.supportEmail}. Include your device model, operating-system version, app version/build, language, and the steps needed to reproduce the issue. Do not send passwords, private answers, intimate photos or other players’ personal information. Remove player names from screenshots before sending them.`,
          `${publisher.name} is the publisher. This page does not offer a response-time guarantee or an account login.`,
        ],
      },
      {
        title: "Start a game",
        paragraphs: [
          "Choose a mode, enter 2–20 player names for a social game and make an explicit gender choice for each player. “Prefer not to say” is valid. Choose a difficulty, start the game, spin the bottle and select Truth or Dare.",
          "Private Flirty is for exactly two adult partners. Each person must make their own named confirmation that they are at least 18 and want to play. Both must still be willing for each activity. You can always stop or skip without explaining why. Random excludes private Flirty.",
        ],
      },
      {
        title: "Resume and card editions",
        paragraphs: [
          "Continue on the home screen resumes the session saved on this device. Cards do not repeat within a matching pool until it is exhausted; replaying those cards requires an explicit fresh deck. Earlier saved cards and favorites keep their original wording.",
          "An older group save does not automatically become a private two-partner game. Start a new two-person private game and complete both confirmations to use the new private cards.",
        ],
      },
      {
        title: "Sound, vibration and language",
        paragraphs: [
          "Sound and haptic settings are in Settings. Silent mode and system/device restrictions can suppress feedback. Available interface languages and card translations can differ; missing translations are disclosed and use English fallback.",
          "The active English and Turkish card editions are paired. Listing another language does not imply that all its cards, legal text or interface strings have been translated.",
        ],
      },
      {
        title: "Offline play and sharing",
        paragraphs: [
          "Installed core gameplay works without an internet connection. A browser needs an initial successful load/cache before offline use. Updates, support email, destination apps and optional services may need a connection.",
          "Sharing opens the native share sheet or downloads a PNG in a browser. Cancelling sharing does not alter the game. Player names and gender choices are omitted from generated images. Private-partner content should only be shared with both partners’ agreement.",
        ],
      },
      {
        title: adsEnabled
          ? "Optional ads and bonus packs"
          : "Advertising is disabled",
        paragraphs: adsEnabled
          ? [
              "Ads are native-only, optional, and subject to your choices, UMP permission, network access and availability. An unavailable ad never stops core play. Optional reward unlocks require confirmation that a reward was earned; closing an ad is not a reward.",
              "Use Settings to disable ads or open available advertising privacy choices. If a privacy form or ad cannot load, you can continue the game.",
            ]
          : [
              "This edition has advertising disabled. Core gameplay does not require watching ads.",
            ],
      },
      {
        title: "Resetting local information",
        paragraphs: [
          "Reset local data in Settings removes local progress, favorites and preferences from the app. This cannot be undone by signing in because DareFlip has no gameplay account or recovery server. Device backups may have their own retained copies. See the privacy policy before resetting or sharing a device.",
        ],
      },
    ],
    tr: [
      {
        title: "Yayıncıya ulaşın",
        paragraphs: [
          `DareFlip için yardım almak üzere ${publisher.supportEmail} adresine yazın. Cihaz modelinizi, işletim sistemi sürümünü, uygulama sürümünü/build numarasını, dili ve sorunu tekrar oluşturma adımlarını ekleyin. Parola, özel cevap, mahrem fotoğraf veya başka oyuncuların kişisel bilgilerini göndermeyin. Göndermeden önce ekran görüntülerindeki oyuncu isimlerini kaldırın.`,
          `Yayıncı ${publisher.name}. Bu sayfa yanıt süresi garantisi veya hesap girişi sunmaz.`,
        ],
      },
      {
        title: "Oyun başlatma",
        paragraphs: [
          "Bir mod seçin, sosyal oyun için 2–20 oyuncu adı ekleyin ve her oyuncu için açık bir cinsiyet seçimi yapın. “Belirtmek istemiyorum” geçerlidir. Zorluğu seçip oyunu başlatın, şişeyi çevirin ve Doğruluk ya da Cesaret seçin.",
          "Özel Flört modu tam iki yetişkin partner içindir. Her kişi 18 yaşında veya daha büyük olduğunu ve oynamak istediğini kendi adıyla onaylamalıdır. Her etkinlik için iki kişinin de o anda istekli olması gerekir. Nedenini açıklamadan her zaman durabilir veya kartı geçebilirsiniz. Rastgele modu özel Flört kartlarını içermez.",
        ],
      },
      {
        title: "Devam etme ve kart sürümleri",
        paragraphs: [
          "Ana ekrandaki devam seçeneği bu cihazda saklanan oturumu sürdürür. Aynı havuzdaki kartlar tükenene kadar tekrar etmez; bunları yeniden oynamak için desteyi açıkça yenilemek gerekir. Önceden kaydedilmiş kartlar ve favoriler kendi özgün metinlerini korur.",
          "Eski bir grup kaydı kendiliğinden iki partnere özel bir oyuna dönüşmez. Yeni özel kartlar için yeni bir iki kişilik oyun başlatıp iki onayı da tamamlayın.",
        ],
      },
      {
        title: "Ses, titreşim ve dil",
        paragraphs: [
          "Ses ve dokunsal geri bildirim tercihleri Ayarlar’dadır. Sessiz mod ve sistem/cihaz kısıtlamaları geri bildirimi engelleyebilir. Arayüz dilleriyle kart çevirilerinin kapsamı farklı olabilir; eksik çeviriler belirtilir ve İngilizce gösterilir.",
          "Aktif İngilizce ve Türkçe kart sürümleri eşleşir. Başka bir dilin listelenmesi, o dildeki tüm kartların, yasal metinlerin veya arayüzün çevrildiği anlamına gelmez.",
        ],
      },
      {
        title: "Çevrimdışı oyun ve paylaşım",
        paragraphs: [
          "Kurulu ana oyun internetsiz çalışır. Tarayıcıda çevrimdışı kullanım için önce başarılı bir yükleme ve önbellekleme gerekir. Güncellemeler, destek e-postası, paylaşım hedefleri ve isteğe bağlı hizmetler bağlantı gerektirebilir.",
          "Paylaşım native paylaşım ekranını açar veya tarayıcıda PNG indirir. Paylaşımı iptal etmek oyunu değiştirmez. Oluşturulan görsellerde oyuncu isimleri ve cinsiyet seçimleri yer almaz. Partnere özel içerikler yalnızca iki tarafın da onayıyla paylaşılmalıdır.",
        ],
      },
      {
        title: adsEnabled
          ? "İsteğe bağlı reklamlar ve bonus paketler"
          : "Reklamlar kapalı",
        paragraphs: adsEnabled
          ? [
              "Reklamlar yalnızca native uygulamada, isteğe bağlı olarak sunulur; tercihlerinize, UMP iznine, internet erişimine ve kullanılabilirliğe bağlıdır. Reklam bulunamaması ana oyunu durdurmaz. İsteğe bağlı paket açma için ödülün kazanıldığının onaylanması gerekir; reklamı kapatmak ödül sayılmaz.",
              "Reklamları kapatmak veya sunulan reklam gizliliği seçeneklerini açmak için Ayarlar’ı kullanın. İzin formu veya reklam yüklenemezse oyuna devam edebilirsiniz.",
            ]
          : [
              "Bu sürümde reklamlar kapalıdır. Ana oyun reklam izlemeyi gerektirmez.",
            ],
      },
      {
        title: "Yerel bilgileri sıfırlama",
        paragraphs: [
          "Ayarlar’daki yerel verileri sıfırlama seçeneği uygulamadaki ilerlemeyi, favorileri ve tercihleri kaldırır. DareFlip’in oyun hesabı veya kurtarma sunucusu olmadığı için giriş yaparak geri alınamaz. Cihaz yedeklerinde ayrı kopyalar kalabilir. Sıfırlamadan veya bir cihazı paylaşmadan önce gizlilik politikasını okuyun.",
        ],
      },
    ],
  };
  return { privacy, terms, support }[page];
}
