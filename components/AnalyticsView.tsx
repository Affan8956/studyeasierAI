
import React, { useState, useEffect } from 'react';
import { StudySession, AIStudyCoachResponse, AIInsightsResponse } from '../types';
import { getStudySessions } from '../services/historyService';
import { generateStudyCoach, generateStudyInsights } from '../services/geminiService';

interface AnalyticsViewProps {
  userId: string;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ userId }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [coach, setCoach] = useState<AIStudyCoachResponse | null>(null);
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Stats
  const [totalMinutesDB, setTotalMinutesDB] = useState(0); // All time from DB
  const [todayMinutesDB, setTodayMinutesDB] = useState(0); // Today from DB
  
  const [streak, setStreak] = useState(0);
  const [burnoutRisk, setBurnoutRisk] = useState<'low' | 'moderate' | 'high'>('low');
  const [productivityScore, setProductivityScore] = useState(0);

  // Live Active Time
  const [liveActiveSeconds, setLiveActiveSeconds] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const data = await getStudySessions(userId);
      setSessions(data);
      calculateStats(data);
    };
    loadData();

    // Polling for live session data from LocalStorage
    const interval = setInterval(() => {
      const startStr = localStorage.getItem('fs_startTime');
      if (startStr) {
        const start = parseInt(startStr);
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setLiveActiveSeconds(elapsed);
      } else {
        setLiveActiveSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const calculateStats = (data: StudySession[]) => {
    // 1. All Time Total
    const total = data.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    setTotalMinutesDB(total);

    // 2. Today's Total
    const startOfDay = new Date().setHours(0,0,0,0);
    const todaySessions = data.filter(s => s.startTime >= startOfDay);
    const todayTotal = todaySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    setTodayMinutesDB(todayTotal);

    // 3. Streak
    let currentStreak = 0;
    const today = new Date().setHours(0,0,0,0);
    const uniqueDays = new Set(data.map(s => new Date(s.startTime).setHours(0,0,0,0)));
    
    // Check backwards from today
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (uniqueDays.has(d.getTime())) {
            currentStreak++;
        } else if (i === 0 && !uniqueDays.has(d.getTime())) {
            continue; 
        } else {
            break;
        }
    }
    setStreak(currentStreak);

    // 4. Burnout Risk
    const recent = data.slice(0, 5);
    const avgRecentDuration = recent.reduce((a, b) => a + b.durationMinutes, 0) / (recent.length || 1);
    const hasBreaks = recent.some(s => s.mode === 'break');
    
    if (avgRecentDuration > 90 && !hasBreaks) setBurnoutRisk('high');
    else if (avgRecentDuration > 60) setBurnoutRisk('moderate');
    else setBurnoutRisk('low');

    // 5. Productivity Score
    const modeCount = new Set(data.map(s => s.mode)).size;
    const score = Math.min(100, Math.round(
        (Math.min(currentStreak, 10) * 4) + 
        (Math.min(total / 60, 20) * 2) + 
        (modeCount * 5)
    ));
    setProductivityScore(score);
  };

  const runAIAnalysis = async () => {
    if (sessions.length === 0) return;
    setLoadingAI(true);
    try {
        const [coachData, insightsData] = await Promise.all([
            generateStudyCoach(`Total: ${totalMinutesDB}m, Streak: ${streak}, Risk: ${burnoutRisk}`),
            generateStudyInsights(sessions)
        ]);
        setCoach(coachData);
        setInsights(insightsData);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingAI(false);
    }
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
      usage[todayIdx] += Math.floor(liveActiveSeconds / 60);

      const max = Math.max(...usage, 1);

      return (
          <div className="flex items-end justify-between h-32 gap-2">
              {days.map((d, i) => (
                  <div key={d} className="flex flex-col items-center gap-2 flex-1">
                      <div 
                        className={`w-full rounded-t-lg relative group transition-all ${i === todayIdx && liveActiveSeconds > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500/20 hover:bg-indigo-500'}`}
                        style={{ height: `${(usage[i] / max) * 100}%`, minHeight: '4px' }}
                      >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             {usage[i]}m
                         </div>
                      </div>
                      <span className="text-[9px] font-black uppercase text-text-muted">{d}</span>
                  </div>
              ))}
          </div>
      );
  };

  // Helper to format time strings
  const formatDuration = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return { hours, mins };
  };

  // Today's Time including Live
  const todayTotalMin = todayMinutesDB + Math.floor(liveActiveSeconds / 60);
  const todayTime = formatDuration(todayTotalMin);

  // All Time including Live
  const grandTotalMin = totalMinutesDB + Math.floor(liveActiveSeconds / 60);
  const allTime = formatDuration(grandTotalMin);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
              <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                Analytics
              </h1>
              <p className="text-text-muted font-medium">Data-driven performance tracking.</p>
           </div>
           <button 
             onClick={runAIAnalysis}
             disabled={loadingAI || sessions.length === 0}
             className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all"
           >
             {loadingAI ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-brain"></i>}
             Generate AI Report
           </button>
        </header>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {/* 1. Today's Focus (Highlighted) */}
            <div className="bg-surface p-6 rounded-3xl border border-emerald-500/30 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500 group-hover:scale-110 transition-transform"><i className="fas fa-calendar-day text-4xl"></i></div>
               <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-2">Today's Focus</p>
               <p className="text-3xl font-black text-text-main tabular-nums">
                 {todayTime.hours}<span className="text-sm text-text-muted ml-1">h</span> {todayTime.mins}<span className="text-sm text-text-muted ml-1">m</span>
               </p>
               {liveActiveSeconds > 0 && (
                 <div className="mt-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
                 </div>
               )}
            </div>

            {/* 2. Lifetime Focus */}
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Lifetime Focus</p>
               <p className="text-3xl font-black text-text-main tabular-nums">
                 {allTime.hours}<span className="text-sm text-text-muted ml-1">h</span> {allTime.mins}<span className="text-sm text-text-muted ml-1">m</span>
               </p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Active Streak</p>
               <p className="text-3xl font-black text-emerald-400">{streak}<span className="text-sm text-text-muted ml-1">days</span></p>
            </div>
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Productivity IQ</p>
               <p className="text-3xl font-black text-purple-400">{productivityScore}</p>
            </div>
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-md">
               <p className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-2">Burnout Risk</p>
               <p className={`text-3xl font-black uppercase ${burnoutRisk === 'high' ? 'text-rose-500' : burnoutRisk === 'moderate' ? 'text-amber-500' : 'text-cyan-400'}`}>
                   {burnoutRisk}
               </p>
            </div>
        </div>

        {/* Charts & AI Coach */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
           {/* Weekly Chart */}
           <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-8">Weekly Volume</h3>
              {renderWeeklyChart()}
           </div>

           {/* AI Coach Card */}
           <div className="bg-surface border border-border rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
               {!coach ? (
                   <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                       <i className="fas fa-user-astronaut text-4xl mb-4 text-text-muted"></i>
                       <p className="text-xs font-bold uppercase tracking-widest">Run AI Analysis for Coaching</p>
                   </div>
               ) : (
                   <div className="animate-fadeIn">
                       <div className="flex items-center gap-3 mb-6">
                           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white"><i className="fas fa-robot"></i></div>
                           <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Coach Diagnosis</h3>
                       </div>
                       <p className="text-text-main font-medium italic mb-6">"{coach.diagnosis}"</p>
                       <div className="space-y-4">
                           {coach.weekly_plan.slice(0, 3).map((p, i) => (
                               <div key={i} className="flex items-center justify-between p-3 bg-surface2 rounded-xl">
                                   <span className="font-bold text-xs">{p.day}</span>
                                   <span className="text-xs text-text-muted">{p.focus}</span>
                                   <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">{p.recommended_minutes}m</span>
                               </div>
                           ))}
                       </div>
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
