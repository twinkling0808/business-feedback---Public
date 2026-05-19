import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, RefreshCw, FileDown, Search, Lock, AlertCircle, 
  Plus, Edit2, Archive, CheckCircle, Save, Trash2, X, LayoutList, History 
} from 'lucide-react';
import { AdminData, Assignment, Criteria, GlobalSettings } from '../types';

interface Props {
  onBack: () => void;
}

type AdminTab = 'feedback' | 'assignments';

export default function AdminView({ onBack }: Props) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('feedback');
  const [data, setData] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof AdminData; direction: 'asc' | 'desc' } | null>(null);

  // Assignment states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ commonInstruction: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'professor2025') {
      setIsAuthenticated(true);
      fetchData();
      fetchAssignments();
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  const GAS_URL = "https://script.google.com/macros/s/AKfycbwYO2YPaFCIcxCJB7HEGF8mKYGZ2YBZC6TZb9nuYozkeOgT4snLyiIb0CvqyQm7WnXz/exec";

  const fetchGAS = async (url: string, options: any = {}) => {
    if (options.method === 'POST') {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(options.body)
        });
        return { status: 'success' };
      } catch (err) {
        console.error("GAS POST Error:", err);
        return { status: 'error' };
      }
    } else {
      try {
        const response = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
        const text = await response.text();
        return JSON.parse(text);
      } catch (err) {
        console.error("GAS GET Error:", err);
        return { status: 'error', data: [] };
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchGAS(`${GAS_URL}?action=getData&password=professor2025`);
      
      if (result.status === 'success' && Array.isArray(result.data)) {
        const rows = result.data;
        // Rows[0] is header
        const records: AdminData[] = rows.slice(1).map((row: any[], idx: number) => ({
          id: idx.toString(),
          timestamp: row[0],
          studentId: row[1],
          studentName: row[2],
          docType: row[3],
          originalDoc: row[4],
          feedback: row[5],
          scores: {
            score1: Number(row[6]) || 0,
            score2: Number(row[7]) || 0,
            score3: Number(row[8]) || 0,
            score4: Number(row[9]) || 0,
            totalScore: Number(row[10]) || 0
          }
        }));
        setData(records);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.log('피드백 기록 불러오기 실패:', err);
      setError('기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const result = await fetchGAS(`${GAS_URL}?action=getAssignments&password=professor2025`);
      
      if (result.status === 'success' && Array.isArray(result.data)) {
        const mapped = result.data.map((row: any[], idx: number) => ({
          id: row[15] || idx.toString(),
          name: row[0],
          isActive: row[14] === 'Y',
          criteria: [
            { name: row[1], description: row[2], maxScore: Number(row[3]) },
            { name: row[4], description: row[5], maxScore: Number(row[6]) },
            { name: row[7], description: row[8], maxScore: Number(row[9]) },
            { name: row[10], description: row[11], maxScore: Number(row[12]) },
          ].filter(c => c.name),
          specialInstruction: row[13]
        }));
        setAssignments(mapped);
      } else {
        setAssignments([]);
      }
      
      if (result.globalSettings) {
        setGlobalSettings(result.globalSettings);
      }
    } catch (err) {
      console.log('과제 불러오기 실패:', err);
      setError('과제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'feedback') {
        fetchData();
      } else if (activeTab === 'assignments') {
        fetchAssignments();
      }
    }
  }, [activeTab, isAuthenticated]);

  const handleSaveGlobal = async () => {
    setLoading(true);
    try {
      const payload = { 
        action: 'saveInstruction',
        instruction: globalSettings.commonInstruction 
      };

      // Fire and forget direct GAS POST to avoid CORS issues
      fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
      .then(() => console.log('Global settings saved (no-cors)'))
      .catch(err => console.log('Global save failed (ignoring):', err));

      alert('✅ 공통 지시사항이 저장되었습니다. (반영까지 수 초가 걸릴 수 있습니다)');
    } catch (err) {
      alert('❌ 저장 시도 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignment = async (assignment: Assignment) => {
    setLoading(true);
    try {
      // Flatten assignment structure for GAS
      const payload: any = {
        action: 'saveAssignment',
        name: assignment.name,
        special: assignment.specialInstruction || "",
        active: assignment.isActive ? 'Y' : 'N'
      };

      // Map criteria (supporting up to 4 as requested, can be extended)
      assignment.criteria.forEach((c, i) => {
        if (i < 4) {
          const idx = i + 1;
          payload[`index${idx}name`] = c.name;
          payload[`index${idx}desc`] = c.description;
          payload[`index${idx}score`] = c.maxScore;
        }
      });

      // Fire and forget direct GAS POST
      fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
      .then(() => console.log('Assignment saved (no-cors)'))
      .catch(err => console.log('Assignment save failed (ignoring):', err));

      setIsModalOpen(false);
      // Wait a bit before refreshing to let GAS process
      setTimeout(fetchAssignments, 2000);
      alert('✅ 과제가 저장되었습니다. (반영까지 잠시만 기다려주세요)');
    } catch (err) {
      console.error(err);
      alert('❌ 저장 시도 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignmentActive = async (assignment: Assignment) => {
    const updated = { ...assignment, isActive: !assignment.isActive };
    handleSaveAssignment(updated);
  };

  const downloadCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    // Header
    const headers = ['제출시각', '학번', '이름', '문서유형', '지표1', '지표2', '지표3', '지표4', '총점'];
    
    // Rows
    const rows = data.map(item => [
      new Date(item.timestamp).toLocaleString(),
      item.studentId,
      item.studentName,
      item.docType,
      item.score1,
      item.score2,
      item.score3,
      item.score4,
      item.totalScore
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => '"' + String(cell || '').replace(/"/g, '""') + '"').join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `피드백기록_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadCSV(filteredData);
  };

  const handleSort = (key: keyof AdminData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setData(sortedData);
  };

  const filteredData = (data || []).filter(item => 
    (item.studentName || '').includes(searchTerm) || 
    (item.studentId || '').includes(searchTerm)
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100"
        >
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-red-50 rounded-full">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center mb-6">관리자 접속</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]"
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#1a3a6b] text-white py-3 rounded-xl font-bold hover:bg-[#132c54] transition-all"
            >
              확인
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full text-gray-500 py-2 text-sm font-medium hover:underline"
            >
              뒤로 가기
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'feedback' ? 'bg-white text-[#1a3a6b] shadow-sm' : 'text-gray-400'
              }`}
            >
              <History className="w-4 h-4" />
              피드백 기록
            </button>
            <button 
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'assignments' ? 'bg-white text-[#1a3a6b] shadow-sm' : 'text-gray-400'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              과제 관리
            </button>
          </div>
        </div>
        
        {activeTab === 'feedback' && (
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all"
            >
              <FileDown className="w-4 h-4" />
              엑셀 다운로드
            </button>
          </div>
        )}

        {activeTab === 'assignments' && (
          <button
            onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a3a6b] text-white text-sm font-bold hover:bg-[#132c54] transition-all"
          >
            <Plus className="w-4 h-4" />
            새 과제 추가
          </button>
        )}
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'feedback' ? (
          <>
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="학번 혹은 이름으로 검색"
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b] text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600">제출시각</th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('studentId')}>
                      학번 {sortConfig?.key === 'studentId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600">이름</th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600">문서유형</th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600 text-center">지표1</th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600 text-center">지표2</th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600 text-center">지표3</th>
                    <th className="px-4 py-3 font-semibold border-b text-gray-600 text-center">지표4</th>
                    <th className="px-4 py-3 font-semibold border-b text-[#1a3a6b] text-center">총점</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 tabular-nums">
                        {new Date(item.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.studentId}</td>
                      <td className="px-4 py-3">{item.studentName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.docType === '이메일' ? 'bg-blue-50 text-blue-700' :
                          item.docType === '초청장' ? 'bg-purple-50 text-purple-700' :
                          item.docType === '부고문' ? 'bg-orange-50 text-orange-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {item.docType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.score1}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.score2}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.score3}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.score4}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#1a3a6b]">{item.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <History className="w-12 h-12 opacity-10" />
                  <p className="font-medium text-lg">아직 피드백 기록이 없습니다.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Global Settings */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#1a3a6b] flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    전체 공통 특별 지시사항
                  </h3>
                  <button 
                    onClick={handleSaveGlobal}
                    className="text-xs font-bold bg-[#1a3a6b] text-white px-3 py-1.5 rounded-lg hover:bg-[#132c54]"
                  >
                    공통 사항 저장
                  </button>
                </div>
                <textarea 
                  value={globalSettings.commonInstruction}
                  onChange={(e) => setGlobalSettings({ commonInstruction: e.target.value })}
                  placeholder="예: 이번 주는 어조 항목을 특별히 엄격하게 평가하세요"
                  className="w-full h-24 p-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/20 focus:bg-white transition-all text-sm"
                />
              </div>

              {/* Assignment List */}
              <div className="space-y-4 pb-20">
                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs px-2">등록된 과제 유형 목록</h3>
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <p className="font-medium">과제 목록을 불러오는 중입니다...</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                    <LayoutList className="w-12 h-12 opacity-10" />
                    <p className="font-medium text-lg">등록된 과제가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(assignments || []).map((asgn) => (
                      <div 
                        key={asgn.id} 
                        className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${
                          asgn.isActive ? 'border-gray-100' : 'border-dashed border-gray-300 opacity-60 grayscale'
                        }`}
                      >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${asgn.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <h4 className="font-bold text-lg">{asgn.name || ''}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setEditingAssignment(asgn); setIsModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleAssignmentActive(asgn)}
                            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                              asgn.isActive ? 'text-gray-400 hover:text-orange-600' : 'text-gray-400 hover:text-green-600'
                            }`}
                          >
                            {asgn.isActive ? <Archive className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        {(asgn.criteria || []).map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                            <span>{c.name || ''}</span>
                            <span className="font-medium text-gray-700">{c.maxScore || 0}점</span>
                          </div>
                        ))}
                      </div>
                      {asgn.specialInstruction && (
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[10px] text-blue-600 italic">
                          " {asgn.specialInstruction} "
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

      <AnimatePresence>
        {isModalOpen && (
          <AssignmentModal 
            initialData={editingAssignment} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveAssignment} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignmentModal({ initialData, onClose, onSave }: { 
  initialData: Assignment | null; 
  onClose: () => void; 
  onSave: (a: Assignment) => void;
}) {
  const [formData, setFormData] = useState<Assignment>(initialData || {
    id: Date.now().toString(),
    name: '',
    isActive: true,
    criteria: [
      { name: '구조 완결성', description: '', maxScore: 25 },
      { name: '어조 적합성', description: '', maxScore: 25 },
      { name: '목적 명확성', description: '', maxScore: 25 },
      { name: '형식 무결점', description: '', maxScore: 25 },
    ],
    specialInstruction: ''
  });

  const addCriterion = () => {
    if (formData.criteria.length >= 6) return;
    setFormData({
      ...formData,
      criteria: [...formData.criteria, { name: '', description: '', maxScore: 0 }]
    });
  };

  const removeCriterion = (idx: number) => {
    setFormData({
      ...formData,
      criteria: formData.criteria.filter((_, i) => i !== idx)
    });
  };

  const updateCriterion = (idx: number, field: keyof Criteria, value: string | number) => {
    const nextCriteria = [...formData.criteria];
    nextCriteria[idx] = { ...nextCriteria[idx], [field]: value };
    setFormData({ ...formData, criteria: nextCriteria });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-[#1a3a6b]">
            {initialData ? '과제 정보 편집' : '새 과제 추가'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">과제 유형명</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 프로젝트 제안 메일"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">평가 지표 (최대 6개)</label>
              <button 
                onClick={addCriterion}
                disabled={formData.criteria.length >= 6}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline disabled:text-gray-300"
              >
                <Plus className="w-3 h-3" /> 지표 추가
              </button>
            </div>
            
            <div className="space-y-3">
              {(formData.criteria || []).map((c, i) => (
                <div key={i} className="flex gap-2 items-start bg-gray-50 p-4 rounded-2xl border border-gray-100 relative">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={c.name || ''}
                        onChange={(e) => updateCriterion(i, 'name', e.target.value)}
                        placeholder="지표명 (예: 어조)"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                      />
                      <input 
                        type="number"
                        value={c.maxScore || 0}
                        onChange={(e) => updateCriterion(i, 'maxScore', parseInt(e.target.value) || 0)}
                        placeholder="배점"
                        className="w-20 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                      />
                    </div>
                    <textarea 
                      value={c.description || ''}
                      onChange={(e) => updateCriterion(i, 'description', e.target.value)}
                      placeholder="평가 기준 세부 설명"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs h-16 resize-none"
                    />
                  </div>
                  <button 
                    onClick={() => removeCriterion(i)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">이 과제 전용 특별 지시사항</label>
            <textarea 
              value={formData.specialInstruction}
              onChange={(e) => setFormData({ ...formData, specialInstruction: e.target.value })}
              placeholder="예: 격식보다 창의적인 어휘 사용을 장려하세요"
              className="w-full h-24 p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b] resize-none text-sm"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            취소
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-1 py-3 rounded-xl font-bold bg-[#1a3a6b] text-white hover:bg-[#132c54] transition-all shadow-lg"
          >
            저장하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
