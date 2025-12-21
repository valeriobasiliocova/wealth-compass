import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signInWithEmail, user } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await signInWithEmail(email, password);
            if (error) throw error;
            // Success is handled by auth state change -> redirect
        } catch (error: any) {
            toast.error(error.message || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md glass-card border-border/50">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Wealth Compass
                    </CardTitle>
                    <CardDescription>
                        Enter your credentials to access your dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-background/50"
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-background/50"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full gradient-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-4 w-4" />
                            )}
                            Sign in
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-border/50 pt-4 mt-2">
                    <p className="text-xs text-muted-foreground text-center">
                        Secured by Supabase Auth. <br />
                        Your data is encrypted and private.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
