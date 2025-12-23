import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center mb-6 gap-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-3xl font-bold">404</h1>
            <p className="text-xl text-muted-foreground">Sayfa Bulunamadı</p>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
          
          <Link href="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              Ana Sayfaya Dön
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
