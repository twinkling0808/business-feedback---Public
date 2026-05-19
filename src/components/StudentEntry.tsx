import { useState } from 'react';
import { StudentInfo } from '../types';
import { User, GraduationCap } from 'lucide-react';

interface Props {
  onStart: (info: StudentInfo) => void;
}

export default function StudentEntry({ onStart }: Props) {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');

  const isValid = studentId.trim() !== '' && studentName.trim() !== '' && /^\d+$/.test(studentId);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#1a3a6b] rounded-full flex items-center justify-center mb-4">
          <GraduationCap className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#1a3a6b]">비즈니스 문서 AI 피드백</h1>
        <p className="text-gray-500 text-sm mt-2">학생 정보를 입력하고 시작하세요</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">학번 (숫자만 입력)</label>
          <div className="relative">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="예: 20241234"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b] transition-all"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
          <div className="relative">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="성함을 입력하세요"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b] transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex items-center justify-center font-bold text-xs">NAME</div>
          </div>
        </div>

        <button
          onClick={() => isValid && onStart({ studentId, studentName })}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-sm transition-all ${
            isValid 
            ? 'bg-[#1a3a6b] text-white hover:bg-[#132c54] active:scale-[0.98]' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
