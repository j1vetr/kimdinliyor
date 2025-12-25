import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
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
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Gizlilik Politikası</h1>
                <p className="text-sm text-muted-foreground">Son güncelleme: 24 Aralık 2024</p>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Giriş</h2>
                <p className="text-muted-foreground leading-relaxed">
                  TOOV Internet Solutions ("biz", "bizim" veya "Şirket") olarak, Kim Dinliyor? uygulamasını ("Uygulama") kullanırken gizliliğinizi korumayı taahhüt ediyoruz. Bu Gizlilik Politikası, kişisel verilerinizi nasıl topladığımızı, kullandığımızı, paylaştığımızı ve koruduğumuzu açıklamaktadır.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Toplanan Veriler</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Uygulamamızı kullanırken aşağıdaki verileri toplayabiliriz:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Google Hesap Bilgileri:</strong> Ad, e-posta adresi ve profil fotoğrafı</li>
                  <li><strong>YouTube Verileri:</strong> Beğenilen videolar listesi ve abone olunan kanallar (yalnızca oyun sırasında, geçici olarak)</li>
                  <li><strong>Oyun Verileri:</strong> Oyun skorları, oda bilgileri ve oyun istatistikleri</li>
                  <li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı türü ve cihaz bilgileri</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Verilerin Kullanım Amacı</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Topladığımız verileri aşağıdaki amaçlarla kullanırız:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Oyun deneyimini sağlamak ve geliştirmek</li>
                  <li>Kullanıcı kimlik doğrulaması yapmak</li>
                  <li>Oyun içi etkileşimleri yönetmek</li>
                  <li>Teknik sorunları tespit etmek ve çözmek</li>
                  <li>Yasal yükümlülüklerimizi yerine getirmek</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. YouTube API Kullanımı</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Uygulamamız YouTube API Hizmetlerini kullanmaktadır. YouTube API Hizmetlerini kullanarak, Google Gizlilik Politikası'nı (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://policies.google.com/privacy</a>) kabul etmiş olursunuz. YouTube verilerinize erişim yalnızca oyun oturumu süresince geçerlidir ve kalıcı olarak saklanmaz.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Veri Paylaşımı</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Kişisel verilerinizi aşağıdaki durumlar dışında üçüncü taraflarla paylaşmayız:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Yasal zorunluluk durumlarında</li>
                  <li>Hizmet sağlayıcılarımızla (veri işleme amacıyla)</li>
                  <li>Açık izniniz olduğunda</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Veri Güvenliği</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz. Bu önlemler arasında şifreleme, güvenli sunucu altyapısı ve erişim kontrolü bulunmaktadır. Ancak, internet üzerinden yapılan hiçbir veri iletiminin %100 güvenli olmadığını belirtmek isteriz.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Veri Saklama Süresi</h2>
                <p className="text-muted-foreground leading-relaxed">
                  YouTube verileriniz yalnızca aktif oyun oturumu süresince geçici olarak işlenir ve oturum sonunda silinir. Hesap bilgileriniz, hesabınızı silene kadar veya yasal saklama süreleri boyunca tutulur.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Haklarınız</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Verilerinize erişim talep etme</li>
                  <li>Verilerinizin düzeltilmesini isteme</li>
                  <li>Verilerinizin silinmesini talep etme</li>
                  <li>Veri işlemeye itiraz etme</li>
                  <li>Veri taşınabilirliği talep etme</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Çerezler</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Uygulamamız, oturum yönetimi ve kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz, ancak bu durumda bazı özellikler düzgün çalışmayabilir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Değişiklikler</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Önemli değişiklikler yapıldığında, uygulama üzerinden veya e-posta yoluyla bilgilendirileceksiniz.
                </p>
              </section>

              <section className="pt-6 border-t">
                <h2 className="text-xl font-semibold mb-3">11. İletişim</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
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
