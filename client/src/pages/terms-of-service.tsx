import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Ana Sayfa
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-6 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Kullanım Koşulları</h1>
                <p className="text-sm text-muted-foreground">Son güncelleme: 24 Aralık 2024</p>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Kabul</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Kim Dinliyor? uygulamasını ("Uygulama") kullanarak, bu Kullanım Koşulları'nı ("Koşullar") kabul etmiş olursunuz. Bu koşulları kabul etmiyorsanız, lütfen uygulamayı kullanmayınız. TOOV Internet Solutions ("biz", "bizim" veya "Şirket") bu koşulları önceden bildirmeksizin değiştirme hakkını saklı tutar.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Hizmet Tanımı</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Kim Dinliyor?, kullanıcıların YouTube hesaplarını bağlayarak arkadaşlarıyla eğlenceli bir tahmin oyunu oynamalarını sağlayan çok oyunculu bir web uygulamasıdır. Oyun, kullanıcıların beğendiği videolar ve abone olduğu kanallar üzerinden sorular oluşturur.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Hesap ve Kayıt</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Uygulamayı kullanmak için Google hesabınızla giriş yapmanız gerekmektedir. Hesabınızı kullanırken:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Doğru ve güncel bilgiler sağlamayı kabul edersiniz</li>
                  <li>Hesap güvenliğinizden siz sorumlusunuz</li>
                  <li>Hesabınızın yetkisiz kullanımını derhal bildirmeyi kabul edersiniz</li>
                  <li>Başkalarının hesaplarını kullanmamayı taahhüt edersiniz</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. YouTube API Hizmetleri</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Uygulamamız YouTube API Hizmetlerini kullanmaktadır. Uygulamayı kullanarak, YouTube Hizmet Şartları'nı (<a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.youtube.com/t/terms</a>) ve Google Gizlilik Politikası'nı (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://policies.google.com/privacy</a>) kabul etmiş olursunuz.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Kullanım Kuralları</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Uygulamayı kullanırken aşağıdaki kurallara uymayı kabul edersiniz:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Yasalara ve düzenlemelere uygun davranmak</li>
                  <li>Diğer kullanıcılara saygılı olmak</li>
                  <li>Sistemi kötüye kullanmamak veya manipüle etmemek</li>
                  <li>Zararlı içerik veya yazılım paylaşmamak</li>
                  <li>Uygulamanın normal işleyişini bozmamak</li>
                  <li>Otomatik bot veya script kullanmamak</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Fikri Mülkiyet</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Uygulama ve içeriği (tasarım, kod, grafikler, logolar) TOOV Internet Solutions'a aittir ve telif hakkı yasalarıyla korunmaktadır. YouTube içerikleri ilgili içerik sahiplerine aittir. Uygulamayı kullanarak herhangi bir fikri mülkiyet hakkı elde etmezsiniz.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Sorumluluk Reddi</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Uygulama "olduğu gibi" sunulmaktadır. Şirket olarak:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Hizmetin kesintisiz veya hatasız olacağını garanti etmiyoruz</li>
                  <li>YouTube API değişikliklerinden kaynaklanan sorunlardan sorumlu değiliz</li>
                  <li>Kullanıcı kaynaklı içeriklerden sorumlu değiliz</li>
                  <li>Üçüncü taraf hizmetlerinin kullanılabilirliğini garanti etmiyoruz</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Sorumluluk Sınırı</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Yasaların izin verdiği azami ölçüde, TOOV Internet Solutions, uygulamanın kullanımından kaynaklanan doğrudan, dolaylı, arızi, özel veya sonuç olarak ortaya çıkan zararlardan sorumlu tutulamaz. Bu sınırlama, sözleşme, haksız fiil veya diğer hukuki teorilere dayalı talepleri kapsar.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Hesap Askıya Alma ve Fesih</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Bu koşulları ihlal etmeniz durumunda, önceden bildirim yapmaksızın hesabınızı askıya alabilir veya sonlandırabiliriz. Hesabınızı istediğiniz zaman kapatabilirsiniz. Fesih durumunda, verileriniz Gizlilik Politikamıza uygun şekilde işlenir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Değişiklikler</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Bu Kullanım Koşulları'nı zaman zaman güncelleyebiliriz. Önemli değişiklikler yapıldığında, uygulama üzerinden bilgilendirileceksiniz. Değişikliklerden sonra uygulamayı kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Uygulanacak Hukuk</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Bu Koşullar, Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıklar İstanbul Mahkemeleri ve İcra Daireleri tarafından çözümlenecektir.
                </p>
              </section>

              <section className="pt-6 border-t">
                <h2 className="text-xl font-semibold mb-3">12. İletişim</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Kullanım koşullarımız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
                </p>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <p><strong>Şirket:</strong> TOOV Internet Solutions</p>
                  <p><strong>Adres:</strong> Gürsel, İmrahor Cd. No:29/B D:3.Kat Ofis: 322, 34400 Kağıthane/İstanbul</p>
                  <p><strong>E-posta:</strong> <a href="mailto:hello@toov.com.tr" className="text-primary hover:underline">hello@toov.com.tr</a></p>
                  <p><strong>Telefon:</strong> 0850 309 4769</p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
