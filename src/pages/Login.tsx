import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Building2, ShieldCheck, ClipboardList, Users, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

const Login: React.FC = () => {
  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Slides (gauche) pour présenter l'importance du logiciel
  const slides = [
    { icon: <ShieldCheck className="h-7 w-7 text-primary" />, title: "Sécurité et contrôle", text: "Authentification par code secret, traçabilité et confidentialité." },
    { icon: <ClipboardList className="h-7 w-7 text-primary" />, title: "Pointages simplifiés", text: "Arrivées et départs centralisés, signatures et suivi journalier." },
    { icon: <Users className="h-7 w-7 text-primary" />, title: "Gestion du personnel", text: "Employés, entreprises et droits d’accès multi-tenant." },
    { icon: <BarChart3 className="h-7 w-7 text-primary" />, title: "Rapports et exports", text: "Statistiques, présences et absences, export des données." },
  ];
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveSlide((s) => (s + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, [slides.length]);
 
  const goPrev = () => setActiveSlide((s) => (s - 1 + slides.length) % slides.length);
  const goNext = () => setActiveSlide((s) => (s + 1) % slides.length);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword(password, remember);
      // redirect to previous page or home redirect (role-based)
      const from = location.state?.from?.pathname as string | undefined;
      if (from) return navigate(from, { replace: true });
      return navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-white to-orange-400 flex items-center">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Slideshow à gauche */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-xl aspect-[4/3] rounded-2xl overflow-hidden bg-transparent">
              {slides.map((s, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center transition-opacity duration-700 ${i === activeSlide ? "opacity-100" : "opacity-0"}`}
                >
                  <div className="mb-4">{s.icon}</div>
                  <h3 className="text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-black">{s.text}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={goPrev}
                aria-label="Diapositive précédente"
                title="Précédent"
                className="group absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Précédent</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Diapositive suivante"
                title="Suivant"
                className="group absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Suivant</span>
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Aller à la slide ${i + 1}`}
                    className={`h-1.5 w-6 rounded-full ${i === activeSlide ? "bg-primary" : "bg-muted"}`}
                    onClick={() => setActiveSlide(i)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Formulaire à droite */}
          <div className="max-w-md mx-auto w-full">
            <Card className="w-full border-0 bg-transparent shadow-none">
              <CardHeader>
                  <div className="w-full flex justify-center">
                    <img
                      src="logo_archipointe.jpg"
                      alt="Archi Pointe"
                      className="h-20 w-20 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                <CardTitle className="text-2xl">Bienvenue</CardTitle>
                <CardDescription className="text-black">Veuillez saisir votre code secret pour vous connecter.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Code secret</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Votre code secret"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="mt-4 text-center text-xs text-gray-900 space-y-1">
              <div>© {new Date().getFullYear()} Archi Pointe. Tous droits réservés.</div>
              <div>
                Développé par {" "}
                <a href="https://archiged-gabon.com" className="underline hover:text-foreground text-blue-800 hover:text-blue-600 font-medium inline-flex items-center" target="_blank" rel="noreferrer">
                  ARCHIGED GABON
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

