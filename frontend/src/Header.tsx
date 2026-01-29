import { Link } from "react-router-dom";

export default function Header() {
    return (
        <header className="header">
            <div className="header-title">
                <h1>wordle-multi</h1>
            </div>
            <nav>
                <div className="nav-links">
                    <Link className="header-nav-link" to="/">Home</Link>
                    <Link className="header-nav-link" to="/about">About</Link>
                    <Link className="header-nav-link" to="/profile">Profile</Link>
                </div>
            </nav>
        </header>
    );
}
