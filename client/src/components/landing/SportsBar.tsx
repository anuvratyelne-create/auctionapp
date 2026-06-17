export default function SportsBar() {
  const sports = [
    { name: 'Cricket', icon: '🏏', color: 'from-green-500 to-emerald-500' },
    { name: 'Football', icon: '⚽', color: 'from-blue-500 to-cyan-500' },
    { name: 'Kabaddi', icon: '🤼', color: 'from-orange-500 to-red-500' },
    { name: 'Basketball', icon: '🏀', color: 'from-amber-500 to-orange-500' },
    { name: 'Hockey', icon: '🏑', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <section className="relative py-12 bg-slate-900/50 border-y border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <p className="text-slate-400 text-sm uppercase tracking-wider font-medium">
            Powering auctions across all major sports
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {sports.map((sport) => (
            <div
              key={sport.name}
              className="group flex items-center gap-3 px-6 py-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 rounded-xl transition-all cursor-default"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{sport.icon}</span>
              <span className="text-slate-300 font-medium">{sport.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
