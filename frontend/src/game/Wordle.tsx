import { useState } from "react";
import "./wordle.css";

const WORDS: string[] = ["REACT", "PLANT", "CHAIR", "MOUSE", "SMILE"];

function Wordle() {
    const [solution] = useState<string>(() =>
        WORDS[Math.floor(Math.random() * WORDS.length)]
    );

    const [answer, setAnswer] = useState<string>("");
    const [guesses, setGuesses] = useState<string[]>([]);
    const [colors, setColors] = useState<number[][]>([]);
    const [result, setResult] = useState<string>("");
    const [gameOver, setGameOver] = useState(false);

    const solutionKeyValue = solution.split("").reduce<Record<string, number>>(
        (acc, letter) => {
            acc[letter] = (acc[letter] || 0) + 1;
            return acc;
        },
        {}
    );

    function updateAnswer(newAnswer: string): void {
        if (newAnswer.length <= 5 && /^[A-Z]*$/.test(newAnswer)) {
            setAnswer(newAnswer);
        }
    }

    function submitAnswer(): void {
        if (answer.length !== 5) {
            setResult("Enter 5 letters");
            return;
        }

        setGuesses([...guesses, answer]);

        const currentKeyValue = { ...solutionKeyValue };
        const guessColors = Array(5).fill(0);
        // 0: gray 1: yellow 2: green
        for (let i = 0; i < 5; i++) {
            if (answer[i] === solution[i]) {
                guessColors[i] = 2;
                currentKeyValue[answer[i]]--;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (guessColors[i] === 0 && currentKeyValue[answer[i]] > 0) {
                guessColors[i] = 1;
                currentKeyValue[answer[i]]--;
            }
        }

        setColors([...colors, guessColors]);
        setAnswer("");

        if (answer === solution) {
            setResult("Correct");
            setGameOver(true);
            return;
        }

        if (guesses.length >= 6) {
            setResult(`Game Over`);
            setGameOver(true);
            return;
        }
    }

    return (
        <>
            <div>Solution: {solution}</div>

            <div className="wordle-grid">
                {[...Array(6)].map((_, row) => (
                    <div key={row} className="wordle-row">
                        {[...Array(5)].map((_, col) => {
                            const letter = row < guesses.length ? guesses[row][col] || "" : "";
                            const color = row < colors.length ? colors[row][col] : 0;

                            return (
                                <div
                                    key={col}
                                    className={`wordle-cell color-${color}`}
                                >
                                    {letter}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>


            <input
                disabled={gameOver}
                value={answer}
                onChange={(e) => updateAnswer(e.currentTarget.value.toUpperCase())}
            />

            <button disabled={gameOver} onClick={submitAnswer}>
                Check
            </button>

            <div>Answer: {result}</div>
            <div>Key-value: {JSON.stringify(solutionKeyValue)}</div>
        </>
    );
}

export default Wordle;