import { useState } from "react";

const API_URL = "http://localhost:5159/api/auth";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit() {
        setMessage("");

        const url = isLogin ? `${API_URL}/login` : `${API_URL}/register`;

        const body = isLogin
            ? { username, password }
            : { username, email, password };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.text();

            if (!res.ok) {
                setMessage(data);
                return;
            }

            setMessage(data);
        } catch {
            setMessage("Server error");
        }
    }

    return (
        <div className="card">
            <h2>{isLogin ? "Login" : "Register"}</h2>
            <div>
                <input
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />

                {!isLogin && (
                    <input
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                )}

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button onClick={handleSubmit} style={{marginTop: "1.2rem"}}>
                    {isLogin ? "Login" : "Register"}
                </button>
            </div>
            <div>
                <button onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Go to Register" : "Go to Login"}
                </button>
            </div>
            <p>{message}</p>
        </div>
    );
}
