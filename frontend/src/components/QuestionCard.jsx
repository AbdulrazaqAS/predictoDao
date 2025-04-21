import { useEffect, useState } from "react";

export default function QuestionCard({
  question,
  answers,
  votes,
  image,
  deadline,
  prizePool,
}) {
  const totalVotes = votes.reduce((a, b) => a + b, 0);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeDiff = new Date(deadline) - now;
      if (timeDiff <= 0) {
        setTimeLeft("Closed");
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
      const seconds = Math.floor((timeDiff / 1000) % 60);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
      {image && (
        <img
          src={image}
          alt="Question visual"
          className="h-48 md:h-auto md:w-48 object-cover"
        />
      )}

      <div className="p-4 flex-1">
        <h2 className="text-lg font-semibold mb-2">{question}</h2>

        <div className="space-y-2 mb-4">
          {answers.map((answer, idx) => {
            const percent = totalVotes === 0 ? 0 : (votes[idx] / totalVotes) * 100;
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{answer}</span>
                  <span>{Math.round(percent)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>⏳ {timeLeft}</span>
          <span>🎁 {prizePool} ETH</span>
        </div>
      </div>
    </div>
  );
}
