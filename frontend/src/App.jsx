import QuestionCard from "./components/QuestionCard";

export default function App() {
  const dummyData = [
    {
      question: "Will Bitcoin reach $100k by 2025?",
      answers: ["Yes", "No", "Not Sure"],
      votes: [120, 80, 30],
      image: "https://source.unsplash.com/400x300/?bitcoin",
      deadline: "2025-12-31T23:59:59Z",
      prizePool: 3.5,
    },
    {
      question: "Will AI surpass human intelligence by 2040?",
      answers: ["Absolutely", "No", "Too early to tell"],
      votes: [150, 50, 70],
      image: "https://source.unsplash.com/400x300/?ai,robot",
      deadline: "2040-01-01T00:00:00Z",
      prizePool: 5,
    },
    {
      question: "Will SpaceX land humans on Mars by 2030?",
      answers: ["Yes", "No"],
      votes: [90, 110],
      image: "https://source.unsplash.com/400x300/?mars,spacex",
      deadline: "2030-12-31T23:59:59Z",
      prizePool: 4.2,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">🔥 Trending Predictions</h1>
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {dummyData.map((q, idx) => (
          <QuestionCard key={idx} {...q} />
        ))}
      </div>
    </div>
  );
}
