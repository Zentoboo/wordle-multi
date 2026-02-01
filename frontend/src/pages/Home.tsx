import { Link } from "react-router-dom";

function Home() {
    return (
        <div className="home">
            <h1>
                word.
            </h1>
            <div className="games-selection">
                <div className="game-card">
                    <p>Play the classic wordle word</p>
                    <p>pure frontend, no backend</p>
                    <>
                        <Link to="/wordle" className="play-button">Play Wordle Single Player</Link>
                    </>
                </div>
                <div className="game-card">
                    <p>Play the multiplayer version</p>
                    <>
                        <Link to="/lobby" className="play-button">Find/Create Lobby </Link>
                    </>
                </div>
            </div>
        </div>
    );
}
export default Home;