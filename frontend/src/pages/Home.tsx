import { Link } from "react-router-dom";

function Home() {
    return (
        <div className="home">
            <h1>
                Welcome to Wordle Multiplayer
            </h1>
            <div className="card">
                <p>Ready to play the classic word guessing game?</p>
                <Link to="/wordle" className="play-button">Play Wordle Single Player</Link>
            </div>
        </div>
    );
}
export default Home;