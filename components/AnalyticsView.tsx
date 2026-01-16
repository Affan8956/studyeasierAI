
import React, { useState, useEffect } from 'react';
import { StudySession, AIStudyCoachResponse, AIInsightsResponse, StudentProfileData } from '../types';
import { getStudySessions } from '../services/historyService';
import { generateStudyCoach, generateStudyInsights } from '../services/geminiService';

interface AnalyticsViewProps {
  userId: string;
}

const ROASTS = [
  "I've seen screen savers working harder than you today.",
  "Opening the analytics tab doesn't count as studying.",
  "Zero progress? Did you get lost on the way to the dashboard?",
  "Your potential is infinite. Your current study time? Not so much.",
  "A gold fish has a longer attention span than this session.",
  "Are you studying or just admiring the UI?",
  "Less staring, more learning.",
  "I'd calculate your IQ based on this activity, but I can't divide by zero."
];

const MOTIVATION = [
  "Consistency is the currency of mastery. Keep earning.",
  "Small steps every day lead to massive results.",
  "You're building the future you. Don't stop now.",
  "Focus is a muscle. You're getting stronger.",
  "The expert in anything was once a beginner.",
  "Deep work is the superpower of the 21st century.",
  "You are doing great. Just one more pomodoro.",
  "Excellence is not an act, but a habit."
];

const HIGH_ACHIEVER = [
  "You're on fire! Don't forget to hydrate.",
  "Academic weapon status: ACHIEVED.",
  "Leave some knowledge for the rest of us!",
  "Unstoppable. The data doesn't lie.",
  "This is what dedication looks like."
];

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ userId }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [coach, setCoach] = useState<AIStudyCoachResponse | null>(null);
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Stats
  const [totalMinutesDB, setTotalMinutesDB] = useState(0);
  const [streak, setStreak] = useState(0);
  const [burnoutRisk, setBurnoutRisk] = useState<'low' | 'moderate' | 'high'>('low');
  const [productivityScore, setProductivityScore] = useState(0);

  // Live Timer State (Whole App Usage)
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [currentQuote, setCurrentQuote] = useState("");
  
  // Coach Wizard State
  const [coachMode, setCoachMode] = useState<'view' | 'setup'>('view');
  const [studentProfile, setStudentProfile] = useState<StudentProfileData>({
    careerGoal: '',
    fieldOfStudy: '',
    institution: '',
    degreeType: '',
    wakeUpTime: '07:00',
    bedTime: '23:00',
    lectureTimes: '',
    detailedSchedule: ''
  });

  // Load Initial Data
  useEffect(() => {
    // 1. Load History from DB
    const loadData = async () => {
      const data = await getStudySessions(userId);
      setSessions(data);
      calculateStats(data);
    };
    loadData();

    // 2. Load Profile
    const savedProfile = localStorage.getItem('student_profile');
    if (savedProfile) {
      setStudentProfile(JSON.parse(savedProfile));
    } else {
      setCoachMode('setup');
    }
    
    // 3. Load Saved Coach Data
    const savedCoach = localStorage.getItem('latest_coach_report');
    if (savedCoach) {
        setCoach(JSON.parse(savedCoach));
    }

    // 4. Poll DB for updates
    const dbInterval = setInterval(loadData, 10000); 

    // 5. LIVE TICKER for Whole App Usage
    const tickInterval = setInterval(() => {
      // Read the GLOBAL tracker set by App.tsx
      const today = new Date().toISOString().split('T')[0];
      const key = `app_usage_seconds_${today}`;
      const seconds = parseInt(localStorage.getItem(key) || '0');
      setTodaySeconds(seconds);
    }, 1000);

    return () => {
      clearInterval(dbInterval);
      clearInterval(tickInterval);
    };
  }, [userId]);

  // Quote Rotation Logic based on usage
  useEffect(() => {
    const totalTodayMinutes = Math.floor(todaySeconds / 60);
    
    let pool = ROASTS;
    if (totalTodayMinutes > 180) pool = HIGH_ACHIEVER;
    else if (totalTodayMinutes > 30) pool = MOTIVATION;

    if (!currentQuote || !pool.includes(currentQuote)) {
      setCurrentQuote(pool[Math.floor(Math.random() * pool.length)]);
    }

    const rotateInterval = setInterval(() => {
       setCurrentQuote(pool[Math.floor(Math.random() * pool.length)]);
    }, 60000);

    return () => clearInterval(rotateInterval);
  }, [todaySeconds, currentQuote]);

  // Update Stats when live timer changes
  useEffect(() => {
    // Recalculate productivity score based on live data
    // Score = (Consistency * 4) + (Volume * 2) + (Variety * 5)
    // Capped at 100
    const volumeScore = Math.min((todaySeconds / 60) / 120 * 20, 40); // Max 40pts for 2 hours
    const streakScore = Math.min(streak * 2, 30); // Max 30pts for 15 day streak
    
    const baseScore = Math.min(100, Math.round(volumeScore + streakScore + 30)); // Base 30
    setProductivityScore(baseScore);
  }, [todaySeconds, streak]);

  const calculateStats = (data: StudySession[]) => {
    // 1. All Time Total (DB)
    const dbTotal = data.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    setTotalMinutesDB(dbTotal);

    // 2. Streak Calculation (Checking LocalStorage 'last_active_date')
    // We use a simple consecutive day check logic
    const today = new Date().toISOString().split('T')[0];
    const lastActive = localStorage.getItem('last_active_date');
    
    // If we used the app today, streak is at least 1 or current stored streak
    // This is a simplified streak logic for the demo
    let calculatedStreak = 1; 
    // In a real app, you'd store streak_count in DB and check dates. 
    // Here we approximate based on session history + today
    const uniqueDays = new Set(data.map(s => new Date(s.startTime).setHours(0,0,0,0)));
    if (todaySeconds > 0) uniqueDays.add(new Date().setHours(0,0,0,0));
    setStreak(uniqueDays.size); // Showing Total Active Days instead of consecutive for robustness in this scope

    // 3. Burnout Risk
    const recent = data.slice(0, 5);
    const avgRecentDuration = recent.reduce((a, b) => a + b.durationMinutes, 0) / (recent.length || 1);
    
    if (avgRecentDuration > 120) setBurnoutRisk('high');
    else if (avgRecentDuration > 60) setBurnoutRisk('moderate');
    else setBurnoutRisk('low');
  };

  const runAIAnalysis = async () => {
    setLoadingAI(true);
    try {
        const [coachData, insightsData] = await Promise.all([
            generateStudyCoach(
              `Total Lifetime: ${totalMinutesDB}m, Active Days: ${streak}, Today: ${Math.floor(todaySeconds/60)}m`,
              studentProfile
            ),
            generateStudyInsights(sessions)
        ]);
        setCoach(coachData);
        setInsights(insightsData);
        localStorage.setItem('latest_coach_report', JSON.stringify(coachData));
        setCoachMode('view');
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingAI(false);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('student_profile', JSON.stringify(studentProfile));
    runAIAnalysis(); // Auto-generate upon saving profile
  };

  const formatFullTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderWeeklyChart = () => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const usage = new Array(7).fill(0);
      sessions.forEach(s => {
          if (Date.now() - s.startTime < 7 * 24 * 60 * 60 * 1000) {
              const day = new Date(s.startTime).getDay();
              usage[day] += s.durationMinutes;
          }
      });
      // Add live time to today
      const todayIdx = new Date().getDay();
      usage[todayIdx] += Math.floor(todaySeconds / 60);

      const max = Math.max(...usage, 60); // Min scale 60m

      return (
          <div className="flex items-end justify-between h-32 gap-2 mt-4">
              {days.map((d, i) => (
                  <div key={d} className="flex flex-col items-center gap-2 flex-1 group">
                      <div className="w-full h-full flex flex-col justify-end relative">
                         {/* Bar */}
                         <div 
                           className={`w-full rounded-t-lg transition-all duration-500 ${i === todayIdx ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-surface2 hover:bg-indigo-500/50'}`}
                           style={{ height: `${(usage[i] / max) * 100}%`, minHeight: '4px' }}
                         ></div>
                         {/* Tooltip */}
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-border text-text-main text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-10">
                             {usage[i]}m
                         </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase ${i === todayIdx ? 'text-emerald-400' : 'text-text-muted'}`}>{d}</span>
                  </div>
              ))}
          </div>
      );
  };

  const grandTotalSeconds = (totalMinutesDB * 60) + todaySeconds;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
              <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                Analytics Hub
              </h1>
              <p className="text-text-muted font-medium">Real-time performance tracking & AI Guidance.</p>
           </div>
           
           <div className="flex gap-2">
             <button 
               onClick={() => setCoachMode('setup')}
               className="px-4 py-3 bg-surface border border-border hover:bg-surface2 text-text-muted hover:text-text-main rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
             >
               <i className="fas fa-cog"></i> Profile
             </button>
             <button 
               onClick={runAIAnalysis}
               disabled={loadingAI}
               className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all"
             >
               {loadingAI ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-sync-alt"></i>}
               Refresh Report
             </button>
           </div>
        </header>

        {/* --- DYNAMIC QUOTE BANNER --- */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-6 mb-10 relative overflow-hidden animate-fadeIn">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                 <i className={`fas ${todaySeconds < 900 ? 'fa-fire-extinguisher' : 'fa-fire'}`}></i>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">
                     {todaySeconds < 900 ? "Reality Check" : "Momentum Active"}
                  </p>
                  <p className="text-lg md:text-xl font-bold text-white leading-tight italic">
                    "{currentQuote}"
                  </p>
               </div>
            </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {/* 1. Today's Whole App Usage (LIVE) */}
            <div className="bg-surface p-6 rounded-3xl border border-emerald-500/30 shadow-lg relative overflow-hidden group col-span-2 lg:col-span-2">
               <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500 group-hover:scale-110 transition-transform"><i className="fas fa-stopwatch text-6xl"></i></div>
               <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-2">Whole App Usage (Today)</p>
               
               {/* LIVE UPCOUNTER */}
               <p className="text-5xl font-black text-text-main tabular-nums tracking-tighter">
                 {formatFullTime(todaySeconds)}
               </p>
               
               <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Tracking Active</span>
               </div>
            </div>

            {/* 2. Lifetime Focus */}
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md flex flex-col justify-center">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Lifetime Total</p>
               <p className="text-2xl font-black text-text-main tabular-nums">
                 {Math.floor(grandTotalSeconds / 3600)}<span className="text-xs text-text-muted ml-1">h</span> {Math.floor((grandTotalSeconds % 3600) / 60)}<span className="text-xs text-text-muted ml-1">m</span>
               </p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md flex flex-col justify-center">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Total Active Days</p>
               <p className="text-3xl font-black text-emerald-400">{streak}</p>
            </div>
            
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md flex flex-col justify-center">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Productivity IQ</p>
               <div className="relative w-16 h-16">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface2" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path className="text-purple-500" strokeDasharray={`${productivityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-text-main">{productivityScore}</div>
               </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
           {/* Weekly Chart */}
           <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl lg:col-span-1">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Weekly Activity</h3>
              {renderWeeklyChart()}
           </div>

           {/* AI PLANNER / COACH */}
           <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl lg:col-span-2 relative overflow-hidden flex flex-col">
               
               {/* Mode Switch: View vs Setup */}
               {coachMode === 'setup' ? (
                 <div className="animate-fadeIn h-full flex flex-col">
                    <h3 className="text-lg font-black text-text-main mb-6 flex items-center gap-2">
                       <i className="fas fa-user-cog text-indigo-500"></i> Setup Your AI Coach
                    </h3>
                    <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                       <div className="md:col-span-2">
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Career Goal</label>
                         <input required type="text" placeholder="e.g. Software Engineer at Google" className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-sm mt-1" 
                            value={studentProfile.careerGoal} onChange={e => setStudentProfile({...studentProfile, careerGoal: e.target.value})} />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Field of Study</label>
                         <input required type="text" placeholder="e.g. Computer Science" className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-sm mt-1" 
                            value={studentProfile.fieldOfStudy} onChange={e => setStudentProfile({...studentProfile, fieldOfStudy: e.target.value})} />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Degree / College</label>
                         <input required type="text" placeholder="e.g. B.Tech" className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-sm mt-1" 
                            value={studentProfile.degreeType} onChange={e => setStudentProfile({...studentProfile, degreeType: e.target.value})} />
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Wake Up Time</label>
                          <input type="time" className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-sm mt-1"
                            value={studentProfile.wakeUpTime} onChange={e => setStudentProfile({...studentProfile, wakeUpTime: e.target.value})} />
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Bed Time</label>
                          <input type="time" className="w-full bg-surface2 border border-border rounded-xl px-4 py-2 text-sm mt-1"
                            value={studentProfile.bedTime} onChange={e => setStudentProfile({...studentProfile, bedTime: e.target.value})} />
                       </div>
                       <div className="md:col-span-2">
                         <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Detailed Weekly Routine</label>
                         <textarea 
                            required 
                            placeholder={`Please list your schedule day by day for an accurate plan.\n\nExample:\nMon: 9am-11am Math Lecture, 2pm-4pm Physics Lab.\nTue: Free until 2pm, then 2pm-5pm Part-time work.\nWed: ...`} 
                            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm mt-1 h-32 resize-none" 
                            value={studentProfile.detailedSchedule} 
                            onChange={e => setStudentProfile({...studentProfile, detailedSchedule: e.target.value})} 
                         />
                       </div>
                       <div className="md:col-span-2 pt-2">
                          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-all">
                             Save & Generate Plan
                          </button>
                       </div>
                    </form>
                 </div>
               ) : (
                 <div className="animate-fadeIn h-full flex flex-col">
                    {!coach ? (
                       <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-10">
                          <i className="fas fa-clipboard-list text-4xl mb-4 text-text-muted"></i>
                          <p className="text-xs font-bold uppercase tracking-widest">No Plan Generated Yet</p>
                          <button onClick={() => setCoachMode('setup')} className="mt-4 text-indigo-400 hover:text-indigo-300 font-bold underline">Configure Profile</button>
                       </div>
                    ) : (
                       <>
                          <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white"><i className="fas fa-robot"></i></div>
                                <div>
                                   <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Daily Executive Plan</h3>
                                   <p className="text-[10px] text-text-muted font-bold">Based on your {studentProfile.fieldOfStudy} goals</p>
                                </div>
                             </div>
                             <div className="text-[10px] bg-surface2 px-2 py-1 rounded text-text-muted border border-border">
                                {new Date().toLocaleDateString()}
                             </div>
                          </div>

                          <div className="mb-6 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                             <p className="text-text-main text-sm font-medium italic">"{coach.diagnosis}"</p>
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                             {coach.daily_schedule && coach.daily_schedule.map((slot, idx) => (
                                <div key={idx} className="flex gap-4 p-3 rounded-xl bg-surface2 border border-border hover:border-indigo-500/30 transition-all">
                                   <div className="min-w-[80px] text-xs font-black text-text-muted pt-1">{slot.time_block}</div>
                                   <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                         <span className={`w-2 h-2 rounded-full ${
                                            slot.type === 'study' ? 'bg-indigo-500' : 
                                            slot.type === 'class' ? 'bg-emerald-500' :
                                            slot.type === 'break' ? 'bg-amber-500' : 'bg-slate-500'
                                         }`}></span>
                                         <h4 className="text-sm font-bold text-text-main">{slot.activity}</h4>
                                      </div>
                                      <p className="text-xs text-text-muted">{slot.notes}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </>
                    )}
                 </div>
               )}
           </div>
        </div>

        {/* AI Insights Section */}
        {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4"><i className="fas fa-lightbulb mr-2"></i> Key Insights</h4>
                    <ul className="space-y-2">
                        {insights.insights.map((ins, i) => (
                            <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span> {ins}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-3xl">
                    <h4 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-4"><i className="fas fa-clock mr-2"></i> Optimal Pattern</h4>
                    <div className="flex items-center justify-between mt-4">
                         <div>
                             <p className="text-[10px] uppercase text-text-muted font-bold">Best Time</p>
                             <p className="text-xl font-black text-purple-400 capitalize">{insights.study_pattern.best_time}</p>
                         </div>
                         <div>
                             <p className="text-[10px] uppercase text-text-muted font-bold">Top Mode</p>
                             <p className="text-xl font-black text-purple-400 capitalize">{insights.study_pattern.most_effective_mode.replace('_', ' ')}</p>
                         </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AnalyticsView;
