import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ArrowLeft, Mail, CheckCircle, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast({
          title: "Email sent!",
          description: "Check your inbox for the password reset link.",
        });
      } else {
        // For security, we show success even if email doesn't exist
        // This prevents email enumeration attacks
        setSubmitted(true);
        toast({
          title: "Email sent!",
          description: "If an account exists with this email, you'll receive a reset link.",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 p-4 pt-[env(safe-area-inset-top,1rem)] pb-[env(safe-area-inset-bottom,1rem)] relative overflow-y-auto">
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute bottom-40 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border-2 border-yellow-600/40 relative z-10 my-auto sm:my-0 mt-8 sm:mt-0 mb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
        <CardHeader className="text-center border-b border-yellow-600/20 pb-6">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="text-yellow-400 w-12 h-12 mr-3" />
            <CardTitle className="text-3xl font-serif font-bold text-yellow-100">ProductivityQuest</CardTitle>
          </div>
          <CardDescription className="text-yellow-200/70">
            {submitted ? "Check your email" : "Reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {submitted ? (
            <div className="space-y-6">
              <Alert className="bg-green-900/30 border-green-600/40">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <AlertDescription className="text-green-100 ml-2">
                  If an account exists with <strong>{email}</strong>, you'll receive a password reset link shortly.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 text-sm text-yellow-200/70">
                <p>📧 Check your inbox (and spam folder)</p>
                <p>⏱️ The link expires in 1 hour</p>
                <p>🔒 For security, each link can only be used once</p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  variant="outline"
                  className="w-full border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                >
                  Try a different email
                </Button>
                <Button 
                  onClick={() => setLocation("/login")}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-yellow-100">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="email"
                    className="pl-10 bg-slate-700/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-200/40 focus:border-yellow-500/60"
                  />
                </div>
                <p className="text-xs text-yellow-200/50">
                  Enter the email address associated with your account
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold border-2 border-yellow-500 shadow-lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-sm text-yellow-400 hover:text-yellow-300 hover:underline inline-flex items-center"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
