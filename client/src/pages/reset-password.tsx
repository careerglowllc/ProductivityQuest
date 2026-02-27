import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ArrowLeft, Lock, CheckCircle, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Get token from URL
  const params = new URLSearchParams(search);
  const token = params.get("token");

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError("No reset token provided");
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValidToken(true);
        } else {
          setTokenError(data.message || "Invalid or expired reset link");
        }
      } catch (error) {
        console.error("Token validation error:", error);
        setTokenError("Failed to validate reset link");
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Password validation
  const passwordRequirements = [
    { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
    { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
    { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
    { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.test(password));
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast({
        title: "Invalid password",
        description: "Please meet all password requirements",
        variant: "destructive",
      });
      return;
    }

    if (!doPasswordsMatch) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "Password reset successful!",
          description: "You can now log in with your new password.",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/login");
        }, 3000);
      } else {
        toast({
          title: "Reset failed",
          description: data.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 p-4">
        <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border-2 border-yellow-600/40">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-yellow-400 mx-auto mb-4" />
            <p className="text-yellow-200/70">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired token
  if (!isValidToken) {
    return (
      <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 p-4 pt-[env(safe-area-inset-top,1rem)] pb-[env(safe-area-inset-bottom,1rem)] relative overflow-y-auto">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border-2 border-yellow-600/40 relative z-10 my-auto sm:my-0 mt-8 sm:mt-0 mb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
          <CardHeader className="text-center border-b border-yellow-600/20 pb-6">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="text-yellow-400 w-12 h-12 mr-3" />
              <CardTitle className="text-3xl font-serif font-bold text-yellow-100">ProductivityQuest</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Alert className="bg-red-900/30 border-red-600/40 mb-6">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-100 ml-2">
                {tokenError || "This password reset link is invalid or has expired."}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3 text-sm text-yellow-200/70 mb-6">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The link has expired (valid for 1 hour)</li>
                <li>The link has already been used</li>
                <li>The link was copied incorrectly</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/forgot-password")}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold"
              >
                Request New Reset Link
              </Button>
              <Button 
                onClick={() => setLocation("/login")}
                variant="outline"
                className="w-full border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 p-4 pt-[env(safe-area-inset-top,1rem)] pb-[env(safe-area-inset-bottom,1rem)] relative overflow-y-auto">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border-2 border-yellow-600/40 relative z-10 my-auto sm:my-0 mt-8 sm:mt-0 mb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
          <CardHeader className="text-center border-b border-yellow-600/20 pb-6">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="text-yellow-400 w-12 h-12 mr-3" />
              <CardTitle className="text-3xl font-serif font-bold text-yellow-100">ProductivityQuest</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-yellow-100 mb-2">Password Reset Complete!</h2>
              <p className="text-yellow-200/70">Your password has been successfully updated.</p>
            </div>
            
            <Alert className="bg-green-900/30 border-green-600/40 mb-6">
              <AlertDescription className="text-green-100">
                Redirecting you to login in a few seconds...
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setLocation("/login")}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold"
            >
              Go to Login Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 p-4 pt-[env(safe-area-inset-top,1rem)] pb-[env(safe-area-inset-bottom,1rem)] relative overflow-y-auto">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

      <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border-2 border-yellow-600/40 relative z-10 my-auto sm:my-0 mt-8 sm:mt-0 mb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
        <CardHeader className="text-center border-b border-yellow-600/20 pb-6">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="text-yellow-400 w-12 h-12 mr-3" />
            <CardTitle className="text-3xl font-serif font-bold text-yellow-100">ProductivityQuest</CardTitle>
          </div>
          <CardDescription className="text-yellow-200/70">Create your new password</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-yellow-100">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10 bg-slate-700/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-200/40 focus:border-yellow-500/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-400/60 hover:text-yellow-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div 
                    key={index} 
                    className={`text-xs flex items-center ${req.test(password) ? 'text-green-400' : 'text-yellow-200/50'}`}
                  >
                    <CheckCircle className={`w-3 h-3 mr-1.5 ${req.test(password) ? 'opacity-100' : 'opacity-30'}`} />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-yellow-100">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400/60" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10 bg-slate-700/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-200/40 focus:border-yellow-500/60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-400/60 hover:text-yellow-400"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && (
                <div className={`text-xs flex items-center ${doPasswordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                  {doPasswordsMatch ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1.5" />
                      Passwords do not match
                    </>
                  )}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold border-2 border-yellow-500 shadow-lg" 
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Reset Password
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
        </CardContent>
      </Card>
    </div>
  );
}
