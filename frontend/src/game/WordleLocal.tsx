import { useState, useEffect } from "react";
import "./wordle.css";

const KEYBOARD = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"]
];


let WORDS: string[] = [];
let isWordsLoaded = false;

async function loadWords(): Promise<string[]> {
    if (isWordsLoaded) return WORDS;

    try {
        const response = await fetch('/src/assets/valid-wordle-words.txt');
        const text = await response.text();
        WORDS = text.split('\n')
            .filter(word => word.trim().length === 5)
            .map(word => word.trim().toUpperCase());
        isWordsLoaded = true;
        return WORDS;
    } catch (error) {
        console.error('Failed to load words:', error);
        // Fallback to original words if loading fails
        return ["REACT", "PLANT", "CHAIR", "MOUSE", "SMILE"];
    }
}

function Wordle() {
    const [solution, setSolution] = useState<string>("");
    const [answer, setAnswer] = useState<string>("");
    const [guesses, setGuesses] = useState<string[]>([]);
    const [colors, setColors] = useState<number[][]>([]);
    const [result, setResult] = useState<string>("");
    const [gameOver, setGameOver] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [keyColors, setKeyColors] = useState<Record<string, number>>({});


    useEffect(() => {
        loadWords().then(loadedWords => {
            if (loadedWords.length > 0) {
                const randomWord = loadedWords[Math.floor(Math.random() * loadedWords.length)];
                setSolution(randomWord);
                setIsLoading(false);
            }
        });
    }, []);

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

    function isValidWord(word: string): boolean {
        return WORDS.includes(word.toUpperCase());
    }

    function submitAnswer(): void {
        if (answer.length !== 5) {
            setResult("Enter 5 letters");
            return;
        }

        if (!isValidWord(answer)) {
            setResult("Not a valid word");
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

        const newKeyColors = { ...keyColors };

        for (let i = 0; i < 5; i++) {
            const letter = answer[i];
            const cellColor = guessColors[i];

            let mapped = 0;
            if (cellColor === 2) mapped = 3;      // green
            else if (cellColor === 1) mapped = 2; // yellow
            else mapped = 1;                      // gray

            if (!newKeyColors[letter] || mapped > newKeyColors[letter]) {
                newKeyColors[letter] = mapped;
            }
        }

        setKeyColors(newKeyColors);

        if (answer === solution) {
            setResult("Correct");
            setGameOver(true);
            return;
        }

        if (guesses.length >= 5) {
            setResult(`Game Over - Solution was ${solution}`);
            setGameOver(true);
            return;
        }
    }

    //keyboard
    function handleKeyPress(key: string) {
        if (gameOver) return;

        if (key === "ENTER") {
            submitAnswer();
            return;
        }

        if (key === "DEL") {
            setAnswer(a => a.slice(0, -1));
            return;
        }

        if (answer.length < 5) {
            setAnswer(a => a + key);
        }
    }


    return (
        <div>
            <div className="card">
                {isLoading ? (
                    <div>Loading game...</div>
                ) : (
                    <>
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

                        <div>{result}</div>
                    </>
                )}
            </div>
            <div className="keyboard">
                {KEYBOARD.map((row, i) => (
                    <div key={i} className="keyboard-row">
                        {row.map(key => (
                            <button
                                key={key}
                                className={`keyboard-key key-${keyColors[key] || 0}`}
                                onClick={() => handleKeyPress(key)}
                                disabled={gameOver}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

        </div>
    );
}

export default Wordle;