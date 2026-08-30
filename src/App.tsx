import React, { useState, useEffect, useMemo } from 'react';
import { getGeckos, getHistory, addFeeding, addMetric, addGecko, deleteHistoryItem } from './api';
import { Gecko, HistoryItem, Metric, Feeding } from './types';
import { format, differenceInDays, differenceInMonths, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Plus, Scale, Droplets, Thermometer, Bug, Leaf, Activity, History, ChevronDown, X, Trash2, Bell } from 'lucide-react';
import { Card, Button, Input, Label, Select } from './components/ui';
import { cn } from './lib/utils';

// --- Cute Speech Bubble Component ---
const SpeechBubble = ({ text, color = "bg-[#82C881]", textColor = "text-white" }: { text: string, color?: string, textColor?: string }) => (
  <div className={cn("relative px-4 py-2 rounded-[16px] text-sm font-bold inline-block animate-float cute-shadow z-10", color, textColor)}>
    {text}
    <div className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45", color)}></div>
  </div>
);

// --- Modals ---
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#5C4D43]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[85dvh] flex flex-col rounded-[32px] border-4 border-[#F2EBE1] p-6 shadow-xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-2xl font-bold text-[#5C4D43]">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 bg-[#FAF5E8] rounded-full text-[#A89E95] hover:text-[#5C4D43] transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="overflow-y-auto -mx-2 px-2 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [geckos, setGeckos] = useState<Gecko[]>([]);
  const [activeGeckoId, setActiveGeckoId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  
  // Modals state
  const [isFeedingModalOpen, setFeedingModalOpen] = useState(false);
  const [isWeightModalOpen, setWeightModalOpen] = useState(false);
  const [isEnvModalOpen, setEnvModalOpen] = useState(false);
  const [isAddGeckoModalOpen, setAddGeckoModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'metric' | 'feeding'} | null>(null);

  useEffect(() => {
    loadGeckos();
  }, []);

  // Notifications logic
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Ensure we only trigger once per minute by checking seconds
      if (seconds === 0) {
        // Daily at 7:00 AM for Temperature & Humidity
        if (hours === 7 && minutes === 0) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("온습도 기록 시간이에요!", { 
              body: "우리 게코를 위해 오늘의 온도와 습도를 기록해주세요. 🌡️💧",
              icon: "/favicon.png"
            });
          }
        }

        // Sunday at 7:00 PM (19:00) for Weight
        if (day === 0 && hours === 19 && minutes === 0) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("체중 기록 시간이에요!", { 
              body: "오늘은 일요일! 한 주 동안 얼마나 자랐는지 체중을 기록해주세요. ⚖️",
              icon: "/favicon.png"
            });
          }
        }
      }
    };

    const intervalId = setInterval(checkTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activeGeckoId) {
      loadHistory(activeGeckoId);
    }
  }, [activeGeckoId]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showToast('이 브라우저는 알림 기능을 지원하지 않습니다.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('알림 권한이 허용되었습니다! 🔔');
    } else {
      showToast('알림 권한이 거부되었습니다.');
    }
  };

  const loadGeckos = async () => {
    setLoading(true);
    try {
      const data = await getGeckos();
      setGeckos(data);
      if (data.length > 0 && !activeGeckoId) {
        setActiveGeckoId(data[0].id);
      }
    } catch (e) {
      showToast('개체 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (id: string) => {
    setLoading(true);
    try {
      const data = await getHistory(id);
      setHistory(data);
    } catch (e) {
      showToast('기록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteHistory = (id: string, type: 'metric' | 'feeding') => {
    setItemToDelete({ id, type });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteHistoryItem(itemToDelete.id, itemToDelete.type);
      setHistory(prev => prev.filter(item => item.id !== itemToDelete.id));
      showToast('기록이 삭제되었습니다. 🗑️');
    } catch (e) {
      showToast('삭제에 실패했습니다.');
    } finally {
      setItemToDelete(null);
    }
  };

  const activeGecko = (Array.isArray(geckos) ? geckos : []).find(g => g.id === activeGeckoId);
  
  // Computed values
  const metrics = (Array.isArray(history) ? history : []).filter(h => h.type === 'metric') as Metric[];
  const feedings = (Array.isArray(history) ? history : []).filter(h => h.type === 'feeding') as Feeding[];
  
  const latestWeightMetric = metrics.find(m => m.weight !== undefined && m.weight !== null && !isNaN(m.weight as any));
  const previousWeightMetric = metrics.find(m => m.weight !== undefined && m.weight !== null && !isNaN(m.weight as any) && m !== latestWeightMetric);
  const weightDiff = latestWeightMetric && previousWeightMetric && latestWeightMetric.weight && previousWeightMetric.weight ? (latestWeightMetric.weight - previousWeightMetric.weight) : 0;
  const latestEnvMetric = metrics.find(m => m.temperature !== undefined && m.temperature !== null && !isNaN(m.temperature as any));
  
  const latestFeeding = feedings.length > 0 ? feedings[0] : null;
  const daysSinceLastFeeding = latestFeeding ? differenceInDays(new Date(), parseISO(latestFeeding.fed_at)) : null;

  const ageInMonths = activeGecko ? differenceInMonths(new Date(), parseISO(activeGecko.birth_date)) : 0;

  // Chart data
  const chartData = useMemo(() => {
    return [...metrics].reverse().map(m => ({
      date: format(parseISO(m.recorded_at), 'MM/dd'),
      weight: m.weight,
      temp: m.temperature,
      humidity: m.humidity
    }));
  }, [metrics]);

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FAF5E8]/90 backdrop-blur-md px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="relative group">
            <select
              value={activeGeckoId || ''}
              onChange={(e) => setActiveGeckoId(e.target.value)}
              className="appearance-none bg-transparent font-bold text-2xl pr-8 py-1 focus:outline-none cursor-pointer text-[#5C4D43]"
            >
              {(Array.isArray(geckos) ? geckos : []).map((g, idx) => (
                <option key={g.id || `gecko-${idx}`} value={g.id || ''}>{g.name || '알 수 없는 개체'}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-[#A89E95] pointer-events-none" size={24} />
          </div>
          <div className="flex gap-2">
            <button onClick={requestNotificationPermission} className="p-3 rounded-[16px] bg-white border-2 border-[#F2EBE1] text-[#FFB067] cute-shadow active:translate-y-[2px] active:shadow-none transition-all" title="알림 권한 설정">
              <Bell size={24} />
            </button>
            <button onClick={() => setAddGeckoModalOpen(true)} className="p-3 rounded-[16px] bg-white border-2 border-[#F2EBE1] text-[#82C881] cute-shadow active:translate-y-[2px] active:shadow-none transition-all" title="새 개체 등록">
              <Plus size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-8">
        {loading && history.length === 0 ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-[#F2EBE1] rounded-[28px]"></div>
            <div className="h-64 bg-[#F2EBE1] rounded-[28px]"></div>
          </div>
        ) : !activeGecko ? (
           <div className="text-center py-20">
             <div className="text-6xl mb-4 animate-bounce">🦎</div>
             <h2 className="text-2xl font-bold mb-2">개체를 등록해주세요</h2>
             <p className="text-[#A89E95] mb-6">아직 등록된 크레스티드 게코가 없습니다.</p>
             <Button onClick={() => setAddGeckoModalOpen(true)}>첫 개체 등록하기</Button>
           </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-base text-[#A89E95] px-2 font-medium">
                  <span>{activeGecko.gender === 'female' ? '암컷' : activeGecko.gender === 'male' ? '수컷' : '미구분'}</span>
                  <span>•</span>
                  <span>{activeGecko.has_tail ? '유미' : '무미'}</span>
                  <span>•</span>
                  <span>생후 {ageInMonths}개월</span>
                </div>

                {/* Big Cards Area */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Weight Card */}
                  <div className="relative pt-6">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex justify-center w-full">
                      <SpeechBubble text="오늘 몸무게는?" color="bg-[#FFB067]" />
                    </div>
                    <Card className="bg-[#FFF8EE] border-[#FFE1A8] h-full flex flex-col items-center justify-center text-center p-6 mt-4">
                      <div className="text-5xl mb-2">⚖️</div>
                      <div className="text-3xl font-bold mb-1 text-[#5C4D43]">{latestWeightMetric?.weight || '-'} <span className="text-xl font-normal opacity-70">g</span></div>
                      {weightDiff !== 0 && (
                        <span className={cn("text-sm font-medium px-3 py-1 rounded-full mb-2", weightDiff > 0 ? "bg-[#FFE1A8] text-[#D98C46]" : "bg-[#F2EBE1] text-[#A89E95]")}>
                          {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}g
                        </span>
                      )}
                      <div className="text-[#A89E95] text-base">최근 체중</div>
                    </Card>
                  </div>

                  {/* Feeding Card */}
                  <div className="relative pt-6">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex justify-center w-full">
                      <SpeechBubble text="밥 맛있게 먹었어!" />
                    </div>
                    <Card className="bg-[#F2FAF2] border-[#C2E5C2] h-full flex flex-col items-center justify-center text-center p-6 mt-4">
                      <div className="text-5xl mb-2">🦗</div>
                      <div className="text-2xl font-bold mb-1 text-[#5C4D43]">{latestFeeding ? format(parseISO(latestFeeding.fed_at), 'MM/dd HH:mm') : '-'}</div>
                      {daysSinceLastFeeding !== null && (
                        <span className="text-sm font-medium px-3 py-1 rounded-full bg-[#C2E5C2] text-[#5B8F5B] mb-2">
                          D+{daysSinceLastFeeding}
                        </span>
                      )}
                      <div className="text-[#A89E95] text-base">마지막 피딩</div>
                    </Card>
                  </div>
                </div>

                {/* Env Cards */}
                <div className="relative pt-8">
                  <div className="absolute top-2 left-6">
                     <SpeechBubble text="온·습도 환경 모니터링" color="bg-[#66B2FF]" />
                  </div>
                  <Card className="bg-white border-[#C2D9FF] p-6 mt-2">
                    <div className="grid grid-cols-2 gap-4 divide-x-2 divide-[#F2EBE1]">
                      <div className="flex flex-col items-center text-center px-2">
                        <div className="text-4xl mb-2">🌡️</div>
                        <div className="text-2xl font-bold text-[#5C4D43]">{latestEnvMetric?.temperature || '-'}°C</div>
                        <div className="text-sm text-[#A89E95] mt-1">적정 22~26°C</div>
                      </div>
                      <div className="flex flex-col items-center text-center px-2">
                        <div className="text-4xl mb-2">💧</div>
                        <div className="text-2xl font-bold text-[#5C4D43]">{latestEnvMetric?.humidity || '-'}%</div>
                        <div className="text-sm text-[#A89E95] mt-1">적정 60~80%</div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Charts */}
                {chartData.length > 0 && (
                  <div className="space-y-6">
                    <Card className="p-4 sm:p-6">
                      <div className="mb-4">
                        <h3 className="font-bold text-xl flex items-center gap-2">📈 체중 성장 추이</h3>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <defs>
                              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82C881" stopOpacity={0.5}/>
                                <stop offset="95%" stopColor="#82C881" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EBE1" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 14, fill: '#A89E95', fontFamily: 'Jua'}} />
                            <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 14, fill: '#A89E95', fontFamily: 'Jua'}} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '20px', border: '4px solid #F2EBE1', fontFamily: 'Jua', backgroundColor: '#FAF5E8', color: '#5C4D43' }}
                            />
                            <Area type="monotone" dataKey="weight" name="체중" stroke="#82C881" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" activeDot={{ r: 8, fill: '#FFB067', stroke: '#fff', strokeWidth: 3 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="font-bold px-2 mb-4 text-2xl">📝 전체 기록</h3>
                {history.length === 0 ? (
                  <div className="text-center py-10 text-[#A89E95] text-lg">기록이 없습니다.</div>
                ) : (
                  <div className="relative border-l-4 border-[#F2EBE1] ml-4 space-y-6 pb-4">
                    {(Array.isArray(history) ? history : []).map((item, idx) => {
                      const isFeeding = item.type === 'feeding';
                      const rawDateString = isFeeding ? (item as Feeding).fed_at : (item as Metric).recorded_at;
                      let date;
                      try {
                        date = rawDateString ? parseISO(rawDateString) : new Date();
                        // Validate date
                        if (isNaN(date.getTime())) {
                          date = new Date(); // Fallback to current if invalid
                        }
                      } catch (e) {
                        date = new Date();
                      }
                      
                      return (
                        <div key={item.id || `history-${idx}`} className="relative pl-8">
                          <div className={cn(
                            "absolute -left-[18px] top-4 text-3xl bg-[#FAF5E8] rounded-full p-1"
                          )}>
                            {isFeeding ? '🦗' : '⚖️'}
                          </div>
                          
                          <Card className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-lg text-[#5C4D43]">
                                  {isFeeding ? '피딩' : '계측'}
                                </span>
                                <span className="text-sm text-[#A89E95]">{format(date, 'yyyy년 MM월 dd일 HH:mm')}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteHistory(item.id, item.type as 'metric' | 'feeding')}
                                className="p-2 text-[#A89E95] hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="기록 삭제"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                            
                            {isFeeding ? (
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[12px] bg-[#F2FAF2] text-[#5B8F5B] text-sm font-bold border-2 border-[#C2E5C2]">
                                    {item.feed_type === 'superfood' ? '슈퍼푸드' : '곤충'}
                                  </span>
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-[12px] bg-[#F2EBE1] text-[#5C4D43] text-sm font-bold border-2 border-[#E5DCD0]">
                                    {item.amount_g}g 급여
                                  </span>
                                  {item.is_dusted && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-[12px] bg-[#FFF8EE] text-[#D98C46] text-sm font-bold border-2 border-[#FFE1A8]">
                                      칼슘 더스팅
                                    </span>
                                  )}
                                </div>
                                {item.memo && <p className="text-base text-[#7A6B60] mt-2 bg-[#FAF5E8] p-3 rounded-[16px]">{item.memo}</p>}
                              </div>
                            ) : (
                              <div className="flex gap-6 mt-3 bg-[#FAF5E8] p-4 rounded-[20px]">
                                {item.weight !== undefined && item.weight !== '' && !isNaN(item.weight) && (
                                  <div className="flex flex-col">
                                    <span className="text-sm text-[#A89E95]">체중</span>
                                    <span className="font-bold text-xl">{item.weight}g</span>
                                  </div>
                                )}
                                {item.temperature !== undefined && item.temperature !== '' && !isNaN(item.temperature) && (
                                  <div className="flex flex-col">
                                    <span className="text-sm text-[#A89E95]">온도</span>
                                    <span className="font-bold text-xl">{item.temperature}°C</span>
                                  </div>
                                )}
                                {item.humidity !== undefined && item.humidity !== '' && !isNaN(item.humidity) && (
                                  <div className="flex flex-col">
                                    <span className="text-sm text-[#A89E95]">습도</span>
                                    <span className="font-bold text-xl">{item.humidity}%</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* FABs for quick logging */}
      {activeGecko && (
        <div className="fixed bottom-32 right-4 sm:right-auto sm:left-1/2 sm:ml-[220px] flex flex-col gap-4 z-40">
          <div className="relative group">
             <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
               <SpeechBubble text="온습도 기록" color="bg-[#5AB2FF]" />
             </div>
            <button 
              onClick={() => setEnvModalOpen(true)}
              className="w-16 h-16 bg-[#5AB2FF] text-white rounded-[24px] border-4 border-[#A3D2FF] shadow-[0_4px_0_#439BE8] flex items-center justify-center hover:bg-[#48A5F2] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <span className="text-3xl">🌡️</span>
            </button>
          </div>

          <div className="relative group">
             <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
               <SpeechBubble text="체중 기록" color="bg-[#FFB067]" />
             </div>
            <button 
              onClick={() => setWeightModalOpen(true)}
              className="w-16 h-16 bg-[#FFB067] text-white rounded-[24px] border-4 border-[#FFD5A8] shadow-[0_4px_0_#D98C46] flex items-center justify-center hover:bg-[#F29F55] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <span className="text-3xl">⚖️</span>
            </button>
          </div>

          <div className="relative group">
             <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
               <SpeechBubble text="피딩 기록" />
             </div>
            <button 
              onClick={() => setFeedingModalOpen(true)}
              className="w-20 h-20 bg-[#82C881] text-white rounded-[28px] border-4 border-[#A3D9A5] shadow-[0_6px_0_#629F61] flex items-center justify-center hover:bg-[#72B771] active:translate-y-[6px] active:shadow-none transition-all"
            >
              <span className="text-4xl">🦗</span>
            </button>
          </div>
        </div>
      )}

      {/* Cute Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white border-4 border-[#F2EBE1] rounded-[32px] cute-shadow p-2 z-40 flex justify-around items-center">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn("flex flex-col items-center justify-center py-2 px-6 rounded-[24px] transition-all", activeTab === 'dashboard' ? "bg-[#FAF5E8] text-[#82C881]" : "text-[#A89E95] hover:bg-[#FAF5E8]/50")}
        >
          <span className="text-2xl mb-1">{activeTab === 'dashboard' ? '🏠' : '🏡'}</span>
          <span className="text-sm font-bold">대시보드</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn("flex flex-col items-center justify-center py-2 px-6 rounded-[24px] transition-all", activeTab === 'history' ? "bg-[#FAF5E8] text-[#82C881]" : "text-[#A89E95] hover:bg-[#FAF5E8]/50")}
        >
          <span className="text-2xl mb-1">{activeTab === 'history' ? '📖' : '📘'}</span>
          <span className="text-sm font-bold">히스토리</span>
        </button>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#FFB067] text-white font-bold px-6 py-3 rounded-[24px] border-4 border-[#FFD5A8] shadow-lg animate-in slide-in-from-top-4 fade-in">
          {toast}
        </div>
      )}

      {/* Modals */}
      <AddFeedingModal 
        isOpen={isFeedingModalOpen} 
        onClose={() => setFeedingModalOpen(false)} 
        geckoId={activeGeckoId!}
        onSuccess={(item: HistoryItem) => {
          setHistory(prev => [item, ...prev].sort((a,b) => new Date(b.type==='metric'?b.recorded_at:b.fed_at).getTime() - new Date(a.type==='metric'?a.recorded_at:a.fed_at).getTime()));
          showToast('피딩이 기록되었습니다.');
          setFeedingModalOpen(false);
        }}
      />

      <AddWeightModal 
        isOpen={isWeightModalOpen} 
        onClose={() => setWeightModalOpen(false)} 
        geckoId={activeGeckoId!}
        onSuccess={(item: HistoryItem) => {
          setHistory(prev => [item, ...prev].sort((a,b) => new Date(b.type==='metric'?b.recorded_at:b.fed_at).getTime() - new Date(a.type==='metric'?a.recorded_at:a.fed_at).getTime()));
          showToast('체중이 기록되었습니다.');
          setWeightModalOpen(false);
        }}
      />

      <AddEnvModal 
        isOpen={isEnvModalOpen} 
        onClose={() => setEnvModalOpen(false)} 
        geckoId={activeGeckoId!}
        onSuccess={(item: HistoryItem) => {
          setHistory(prev => [item, ...prev].sort((a,b) => new Date(b.type==='metric'?b.recorded_at:b.fed_at).getTime() - new Date(a.type==='metric'?a.recorded_at:a.fed_at).getTime()));
          showToast('온습도가 기록되었습니다.');
          setEnvModalOpen(false);
        }}
      />

      <AddGeckoModal 
        isOpen={isAddGeckoModalOpen} 
        onClose={() => setAddGeckoModalOpen(false)} 
        onSuccess={(g: Gecko) => {
          setGeckos(prev => [...prev, g]);
          setActiveGeckoId(g.id);
          showToast('새 개체가 등록되었습니다.');
          setAddGeckoModalOpen(false);
        }}
      />

      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="기록 삭제">
        <div className="space-y-6">
          <p className="text-[#5C4D43] text-lg text-center mt-4">정말로 이 기록을 삭제하시겠습니까?</p>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={() => setItemToDelete(null)}>
              취소
            </Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-600" onClick={confirmDelete}>
              삭제하기
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- Inline Form Components ---

function AddFeedingModal({ isOpen, onClose, geckoId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const item = await addFeeding({
        gecko_id: geckoId,
        fed_at: new Date(fd.get('fed_at') as string).toISOString(),
        feed_type: fd.get('feed_type') as any,
        amount_g: parseFloat(fd.get('amount_g') as string),
        is_dusted: fd.get('is_dusted') === 'on',
        memo: fd.get('memo') as string,
      });
      onSuccess(item);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="피딩 기록">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="fed_at">급여 일시</Label>
          <Input id="fed_at" name="fed_at" type="datetime-local" required defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
        </div>

        <div>
          <Label>급여 종류</Label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col items-center justify-center gap-2 p-4 border-4 border-[#F2EBE1] rounded-[24px] cursor-pointer has-[:checked]:border-[#82C881] has-[:checked]:bg-[#F2FAF2] transition-all bg-[#FAF5E8]">
              <input type="radio" name="feed_type" value="superfood" defaultChecked className="sr-only" />
              <span className="text-3xl">🥣</span>
              <span className="text-lg font-bold">슈퍼푸드</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-4 border-4 border-[#F2EBE1] rounded-[24px] cursor-pointer has-[:checked]:border-[#82C881] has-[:checked]:bg-[#F2FAF2] transition-all bg-[#FAF5E8]">
              <input type="radio" name="feed_type" value="insect" className="sr-only" />
              <span className="text-3xl">🦗</span>
              <span className="text-lg font-bold">곤충</span>
            </label>
          </div>
        </div>
        
        <div>
          <Label htmlFor="amount_g">급여량 (g)</Label>
          <Input id="amount_g" name="amount_g" type="number" step="0.1" min="0" required placeholder="예: 1.5" />
        </div>

        <div className="flex items-center justify-between p-4 border-4 border-[#F2EBE1] bg-[#FAF5E8] rounded-[24px]">
          <div>
            <Label className="mb-0">칼슘 더스팅</Label>
            <span className="text-sm text-[#A89E95]">영양제 첨가 여부</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="is_dusted" className="sr-only peer" />
            <div className="w-14 h-8 bg-[#E5DCD0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#FFB067]"></div>
          </label>
        </div>

        <div>
          <Label htmlFor="memo">메모</Label>
          <Input id="memo" name="memo" placeholder="특이사항 입력" />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? '저장 중...' : '기록 저장'}
        </Button>
      </form>
    </Modal>
  );
}

function AddWeightModal({ isOpen, onClose, geckoId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const item = await addMetric({
        gecko_id: geckoId,
        recorded_at: new Date(fd.get('recorded_at') as string).toISOString(),
        weight: parseFloat(fd.get('weight') as string),
        // Send undefined for environment metrics
      });
      onSuccess(item);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="체중 기록">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="recorded_at">계측 일시</Label>
          <Input id="recorded_at" name="recorded_at" type="datetime-local" required defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
        </div>

        <div>
          <Label htmlFor="weight">체중 (g)</Label>
          <Input id="weight" name="weight" type="number" step="0.1" required placeholder="예: 31.5" />
        </div>
        
        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? '저장 중...' : '기록 저장'}
        </Button>
      </form>
    </Modal>
  );
}

function AddEnvModal({ isOpen, onClose, geckoId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const item = await addMetric({
        gecko_id: geckoId,
        recorded_at: new Date(fd.get('recorded_at') as string).toISOString(),
        temperature: parseFloat(fd.get('temperature') as string),
        humidity: parseFloat(fd.get('humidity') as string),
        // Send undefined for weight
      });
      onSuccess(item);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="온습도 기록">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="recorded_at">측정 일시</Label>
          <Input id="recorded_at" name="recorded_at" type="datetime-local" required defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="temperature">온도 (°C)</Label>
            <Input id="temperature" name="temperature" type="number" step="0.1" required placeholder="예: 24.5" />
          </div>
          <div>
            <Label htmlFor="humidity">습도 (%)</Label>
            <Input id="humidity" name="humidity" type="number" step="1" required placeholder="예: 65" />
          </div>
        </div>
        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? '저장 중...' : '기록 저장'}
        </Button>
      </form>
    </Modal>
  );
}

function AddGeckoModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const gecko = await addGecko({
        name: fd.get('name') as string,
        gender: fd.get('gender') as any,
        has_tail: fd.get('has_tail') === 'true',
        birth_date: new Date(fd.get('birth_date') as string).toISOString(),
      });
      onSuccess(gecko);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="개체 등록">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" required placeholder="개체 이름" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gender">성별</Label>
            <Select id="gender" name="gender" required>
              <option value="unknown">미구분</option>
              <option value="female">암컷</option>
              <option value="male">수컷</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="has_tail">꼬리 유무</Label>
            <Select id="has_tail" name="has_tail" required>
              <option value="true">유미 (있음)</option>
              <option value="false">무미 (없음)</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="birth_date">부화일 (또는 입양일)</Label>
          <Input id="birth_date" name="birth_date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? '등록 중...' : '개체 등록'}
        </Button>
      </form>
    </Modal>
  );
}
