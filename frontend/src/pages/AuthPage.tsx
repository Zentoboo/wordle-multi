import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts";
import type { ValidationError } from "../types/auth";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register, isLoading } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit() {
        setErrors([]);
        setIsSubmitting(true);

        try {
            const validationErrors = isLogin 
                ? await login({ username, password })
                : await register({ username, email, password });

            if (validationErrors.length === 0) {
                // Success - redirect to home or profile
                navigate("/");
            } else {
                setErrors(validationErrors);
            }
        } catch {
            setErrors([{ field: 'general', message: 'An unexpected error occurred' }]);
        } finally {
            setIsSubmitting(false);
        }
    }

    const getFieldError = (field: string): string | null => {
        const error = errors.find(err => err.field === field);
        return error ? error.message : null;
    };

    const hasError = (field: string): boolean => {
        return errors.some(err => err.field === field);
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setErrors([]);
        setUsername("");
        setEmail("");
        setPassword("");
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div>
                <h2>{isLogin ? "Login" : "Register"}</h2>
                
                {/* Format Instructions */}
                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    <strong>Format Requirements:</strong>
                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                        <li>Username: 3-20 characters, letters, numbers, underscores only</li>
                        {!isLogin && <li>Email: Valid email address (e.g., user@example.com)</li>}
                        <li>Password: 6-50 characters</li>
                    </ul>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div>
                        <div>
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                disabled={isSubmitting}
                                aria-invalid={hasError('username')}
                            />
                            {hasError('username') && (
                                <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                    {getFieldError('username')}
                                </div>
                            )}
                        </div>

                        {!isLogin && (
                            <div>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={isSubmitting}
                                    aria-invalid={hasError('email')}
                                />
                                {hasError('email') && (
                                    <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                        {getFieldError('email')}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={isSubmitting}
                                aria-invalid={hasError('password')}
                            />
                            {hasError('password') && (
                                <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                    {getFieldError('password')}
                                </div>
                            )}
                        </div>
                    </div>

                    {hasError('general') && (
                        <div style={{ color: 'red', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            {getFieldError('general')}
                        </div>
                    )}

                    <div>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : (isLogin ? "Login" : "Register")}
                        </button>
                    </div>
                </form>

                <div>
                    <button type="button" onClick={toggleMode} disabled={isSubmitting}>
                        {isLogin ? "Go to Register" : "Go to Login"}
                    </button>
                </div>
            </div>
        </div>
    );
}
