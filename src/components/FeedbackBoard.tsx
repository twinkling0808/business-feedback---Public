import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, RefreshCw, LogOut, Settings, User, Bot, Loader2, FileUp, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { StudentInfo, HistoryItem, FeedbackResponse, Assignment } from '../types';

interface Props {
  student: StudentInfo;
  history: HistoryItem[];
  onHistoryChange: (history: HistoryItem[]) => void;
  onGoAdmin: () => void;
  onLogout: () => void;
}

export default function FeedbackBoard({ student, history, onHistoryChange, onGoAdmin, onLogout }: Props) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbwYO2YPaFCIcxCJB7HEGF8mKYGZ2YBZC6TZb9nuYozkeOgT4snLyiIb0CvqyQm7WnXz/exec";

  const fetchGAS = async (url: string, options: any = {}) => {
    // For GET/Read requests, we need to handle CORS. 
    // Since we are moving to client-side, purely direct fetch might fail with CORS unless GAS supports it.
    // However, for POST/Save requests (no-cors), it works fire-and-forget.
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
      // For GET
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          return { status: 'error', data: [] };
        }
      } catch (err) {
        return { status: 'error', data: [] };
      }
    }
  };

  const fetchAssignments = async () => {
    try {
      const result = await fetchGAS(`${GAS_URL}?action=getAssignments&password=professor2025`);
      
      let assignments: Assignment[] = [];
      if (result.status === 'success' && Array.isArray(result.data)) {
        assignments = result.data.map((row: any[], idx: number) => ({
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
      }
      
      const active = assignments.filter(a => a.isActive);
      setActiveAssignments(active);

      // Store global settings
      if (result.globalSettings) {
        (window as any).globalCommonInstruction = result.globalSettings.commonInstruction;
      }
    } catch (err) {
      console.error("Fail to fetch assignments:", err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/hwpx': ['.hwpx']
    }
  } as any);

  // Method 2: PDF.js Text Extraction Fallback
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (err) {
      console.error("PDF.js Extraction Error:", err);
      throw new Error("PDF 읽기 실패: 파일이 손상되었거나 암호가 설정된 PDF입니다. 다른 파일을 시도하거나 텍스트를 직접 붙여넣어 주세요.");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) setSelectedFile(blob);
      }
    }
  };

  const handleGetFeedback = async () => {
    // Validation: 10 chars check
    const isTextShort = inputText.trim().length < 10;
    if (!selectedFile && isTextShort) {
      handleError("⚠️ 문서 내용을 확인할 수 없습니다. 아래 방법 중 하나로 다시 시도해주세요.\n\n방법 1. 텍스트를 직접 복사해서 붙여넣기\n방법 2. 이미지 파일(JPG, PNG)로 변환 후 업로드\n방법 3. PDF가 암호 설정된 경우 암호 해제 후 재시도\n방법 4. 한글 파일은 PDF로 저장 후 업로드");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    let currentInputText = inputText;
    let currentFile = selectedFile;
    
    try {
      // 1. Attempt Method 1: Direct File Upload to Serverless Function
      const result = await requestFeedback(currentInputText, currentFile);
      await handleSuccess(result, currentInputText, currentFile);
    } catch (error: any) {
      console.error("Method 1 (Direct) Failed:", error);
      
      // Check for "내용확인불가" specifically
      if (error.message && error.message.includes("내용확인불가")) {
        // Fallback to PDF extraction if it was a PDF and Gemini vision failed to find content
        if (currentFile && currentFile.type === 'application/pdf') {
          try {
            console.log("Switching to Method 2: Text Extraction Fallback...");
            const extractedText = await extractPdfText(currentFile);
            
            if (extractedText.trim().length < 10) {
               throw new Error("추출된 텍스트가 너무 짧습니다.");
            }

            const combinedText = (currentInputText ? currentInputText + "\n\n" : "") + extractedText;
            const result = await requestFeedback(combinedText, null);
            await handleSuccess(result, combinedText, currentFile);
          } catch (fallbackError: any) {
            console.error("Method 2 (Fallback) Failed:", fallbackError);
            handleError("⚠️ 문서 내용을 확인할 수 없습니다. 아래 방법 중 하나로 다시 시도해주세요.\n\n방법 1. 텍스트를 직접 복사해서 붙여넣기\n방법 2. 이미지 파일(JPG, PNG)로 변환 후 업로드\n방법 3. PDF가 암호 설정된 경우 암호 해제 후 재시도\n방법 4. 한글 파일은 PDF로 저장 후 업로드");
          }
        } else {
          handleError(error.message || "⚠️ 문서 내용을 확인할 수 없습니다. 아래 방법 중 하나로 다시 시도해주세요.");
        }
      } else {
        handleError("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const buildSystemInstruction = () => {
    const commonInstruction = (window as any).globalCommonInstruction || "";
    const currentAssignment = activeAssignments.find(a => a.id === selectedAssignmentId);

    // Default criteria
    let criteriaSection = `
▶ 이메일
① 구조 완결성 (25점) 제목·인사말·용건·마무리·서명이 모두 있는가
② 수신자 맞춤 어조 (25점) 수신 대상에 맞는 격식체·존댓말이 일관되는가
③ 용건의 명확성 (25점) 첫 문단에 목적이 명확히 드러나는가
④ 형식적 무결점 (25점) 오탈자·띄어쓰기·맞춤법 오류가 없는가
    `;

    let specialInfo = "";
    if (currentAssignment) {
      const criteriaList = currentAssignment.criteria || [];
      criteriaSection = `▶ ${currentAssignment.name}\n` + 
        criteriaList.map((c: any, i: number) => 
          `${i+1}. ${c.name} (${c.maxScore}점) ${c.description}`
        ).join('\n');
      specialInfo = `[이 과제 특별 지시사항]\n${currentAssignment.specialInstruction || ""}\n`;
    }

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
당신은 매우 엄격한 비즈니스 문서 작성 수업의 AI 학습 조교입니다.
실무에서 문서 하나의 오류는 기업 신뢰도를 직접 훼손한다는 기준으로 깐깐하게 검토합니다. 
절대로 관대하게 넘어가지 않습니다.

당신은 매우 일관된 기준으로 평가합니다. 동일한 문서는 항상 동일한 점수를 부여합니다. 
주관적 판단을 최소화하고 체크리스트 방식으로 채점합니다.

${currentAssignment ? `현재 수행 중인 과제: ${currentAssignment.name}` : "본 수업 문서 유형: 이메일 / 초청장 / 부고문"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[매우 중요: 내용 확인 불가 처리]
만약 제공된 텍스트나 이미지/PDF에서 문서의 내용(이메일, 초청장, 부고문 등)을 전혀 찾을 수 없거나 글자를 읽을 수 없는 경우,
다른 피드백을 일체 하지 말고 반드시 아래 7글자만 정확하게 출력하십시오:
내용확인불가

[문서 유형별 평가 지표]
${criteriaSection}

[교수자 전체 공통 특별 지시사항]
${commonInstruction}

${specialInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[절대 원칙]
1. 수정된 문장을 절대 직접 써주지 않는다.
2. 오류는 반드시 질문 형태로만 피드백한다.
3. 그러나 오류의 위치는 매우 구체적으로 짚어준다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[형식 오류 피드백 규칙 — 매우 중요]
띄어쓰기·맞춤법·오탈자 오류는 아래 형식으로 반드시 구체적으로 짚는다.
형식: "[X번째 줄] '문제가 되는 단어나 문장' 부분에서 띄어쓰기(또는 맞춤법/오탈자) 오류가 있습니다. 어떻게 수정해야 할지 다시 확인해보시겠어요?"

맞춤법·띄어쓰기 오류를 발견하면 반드시 피드백 본문에서 먼저 구체적으로 지적한다.
구체적 지적 형식: 🔴 [X번째 줄] '오류단어' → 맞춤법 오류 어떻게 수정해야 할지 확인해보시겠어요?

종합평가에서 언급한 내용은 반드시 피드백 본문에도 포함되어 있어야 한다. 
피드백 본문에 없는 내용을 종합평가에서 언급하지 않는다.

체크리스트 순서:
1순위: 오탈자·맞춤법·띄어쓰기 (형식 무결점)
2순위: 구조 누락 항목
3순위: 어조 문제
4순위: 목적 불명확

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[피드백 출력 형식 — 반드시 이 순서로]
1. 문서 유형 확인 "이메일 문서로 확인됩니다."
2. 전체 인상 한 줄
3. 발견된 오류 목록:
🔴 [즉시 수정 필요] "X번째 줄 '____' 부분: ____오류가 있습니다. 어떻게 수정해야 할까요?"
🟡 [확인 필요] "X번째 줄 '____' 부분: ____측면에서 적절한지 다시 검토해보시겠어요?"
4. 수정 안내
5. 오류 목록 (코드가 채점에 사용하며, 학생에게는 보이지 않습니다):
[오류목록]
구조완결성오류: (오류항목 나열, 없으면 '없음')
어조오류: (오류항목 나열, 없으면 '없음')
목적오류: (오류항목 나열, 없으면 '없음')
형식오류: (오류항목 나열, 없으면 '없음')
[/오류목록]
    `;
  };

  const requestFeedback = async (text: string, file: File | null) => {
    const contents: any[] = [];
    if (text) contents.push({ text: `[사용자 입력 본문]\n${text}` });
    
    if (file) {
      const base64 = await fileToBase64(file);
      contents.push({
        inlineData: {
          data: base64,
          mimeType: file.type
        }
      });
      if (file.type === 'application/pdf') {
        contents.push({ text: "이 PDF 문서의 텍스트를 읽고 내용이 있으면 피드백해 주세요. 텍스트를 읽을 수 없으면 '내용확인불가'라고만 답해주세요." });
      }
    }

    const systemInstruction = buildSystemInstruction();

    // Call Netlify Function instead of local /api
    const response = await fetch('/.netlify/functions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, contents }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Server error');
    }
    
    const result = await response.json();
    const feedbackText = result.text;

    if (feedbackText.includes("내용확인불가")) {
      throw new Error("내용확인불가|⚠️ 문서 내용을 확인할 수 없습니다. 아래 방법 중 하나로 다시 시도해주세요.\n\n방법 1. 텍스트를 직접 복사해서 붙여넣기\n방법 2. 이미지 파일(JPG, PNG)로 변환 후 업로드\n방법 3. PDF가 암호 설정된 경우 암호 해제 후 재시도\n방법 4. 한글 파일은 PDF로 저장 후 업로드");
    }

    // Parse scores
    const errorTagMatch = feedbackText.match(/\[오류목록\](.*?)\[\/오류목록\]/s);
    let score1 = 25, score2 = 25, score3 = 25, score4 = 25;

    if (errorTagMatch) {
      const tagContent = errorTagMatch[1];
      const getErrorCount = (category: string): number => {
        const lineMatch = tagContent.match(new RegExp(`${category}:\\s*(.*)`));
        if (!lineMatch) return 0;
        const content = lineMatch[1].trim();
        if (content === "없음" || content === "" || content.includes("오류가 없습니다")) return 0;
        return content.split(',').length;
      };
      const deduction = 5;
      score1 = Math.max(0, 25 - (getErrorCount("구조완결성오류") * deduction));
      score2 = Math.max(0, 25 - (getErrorCount("어조오류") * deduction));
      score3 = Math.max(0, 25 - (getErrorCount("목적오류") * deduction));
      score4 = Math.max(0, 25 - (getErrorCount("형식오류") * deduction));
    }

    const cleanedFeedback = feedbackText.replace(/\[오류목록\].*?\[\/오류목록\]/gs, "").trim();
    const currentAssignment = activeAssignments.find(a => a.id === selectedAssignmentId);
    let docType = currentAssignment ? currentAssignment.name : "기타";

    return {
      feedback: cleanedFeedback,
      scores: { score1, score2, score3, score4, totalScore: score1+score2+score3+score4 },
      docType
    };
  };

  const handleError = (message: string) => {
    const finalMsg = message.includes('|') ? message.split('|')[1] : message;
    const errorMsg: HistoryItem = {
      id: Date.now().toString(),
      type: 'ai',
      text: finalMsg,
      timestamp: new Date().toISOString(),
    };
    onHistoryChange([...history, errorMsg]);
  };

  const handleRetry = () => {
    setInputText('');
    setSelectedFile(null);
  };

  return (
    <div className="max-w-5xl mx-auto h-screen flex flex-col bg-white" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Drag Over Overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#1a3a6b]/90 flex flex-col items-center justify-center text-white p-6"
          >
            <FileUp className="w-20 h-20 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold mb-2">여기에 파일을 놓으세요</h2>
            <p className="text-lg opacity-80">PDF, PPTX, HWPX, 이미지 파일을 인식합니다.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a3a6b] rounded-lg flex items-center justify-center">
            <FileText className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-[#1a3a6b] hidden sm:block">비즈니스 문서 AI 피드백</h1>
          <h1 className="text-lg font-bold text-[#1a3a6b] sm:hidden">BusiDoc AI</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <User className="w-4 h-4 text-[#1a3a6b]" />
            <span className="text-xs sm:text-sm font-medium text-[#1a3a6b]">{student.studentId} {student.studentName}</span>
          </div>
          <button 
            onClick={onGoAdmin}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600" 
            title="관리자"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600" 
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0">
        {/* Left: History Area */}
        <div className="flex-1 flex flex-col md:border-r border-gray-100 bg-gray-50/20 overflow-hidden order-2 md:order-1">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
            {history.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <Bot className="w-12 h-12 opacity-20" />
                <div className="text-center">
                  <p className="font-medium">문서를 입력하거나 파일을 드래그해서 올려주세요</p>
                  <p className="text-xs mt-1 text-gray-300">PDF, PPTX, HWPX 및 이미지 지원</p>
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm ${
                    item.type === 'user' 
                    ? 'bg-[#1a3a6b] text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {item.text}
                    </div>

                    {item.type === 'ai' && item.scores && (
                      <div className="mt-3 p-3 bg-[#fff0f0] border border-red-300 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-start gap-2 text-[#cc0000]">
                          <span className="text-sm shrink-0">⚠️</span>
                          <div className="flex-1">
                            <p className="text-[11px] font-bold leading-none mb-1">AI 피드백 활용 시 주의사항</p>
                            <p className="text-[10px] leading-snug font-medium opacity-90">
                              AI는 완벽하지 않습니다. 동일한 문서라도 피드백이 매번 조금씩 다를 수 있습니다. 
                              반드시 같은 문서를 2회 이상 제출하여 피드백 결과를 교차 확인하세요. 최종 판단은 교수자의 평가기준에 따릅니다.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleGetFeedback}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-500 rounded-md text-[10px] font-bold text-red-500 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
                        >
                          <span>🔄 동일 문서 재확인</span>
                        </button>
                      </div>
                    )}

                    {item.scores && (
                      <div className={`mt-4 overflow-hidden rounded-xl border-2 ${
                        item.scores.totalScore >= 70 ? 'border-green-100 bg-green-50/30' : 
                        item.scores.totalScore >= 50 ? 'border-orange-100 bg-orange-50/30' : 
                        'border-red-100 bg-red-50/30'
                      }`}>
                        <div className={`px-4 py-2 border-b flex items-center gap-2 font-bold text-xs ${
                          item.scores.totalScore >= 70 ? 'border-green-100 text-green-800' : 
                          item.scores.totalScore >= 50 ? 'border-orange-100 text-orange-800' : 
                          'border-red-100 text-red-800'
                        }`}>
                          <span role="img" aria-label="chart">📊</span> 현재 문서 점수
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                            <span>① 구조 완결성</span>
                            <span className="font-bold">{item.scores.score1 || 0} / 25점</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                            <span>② 어조 적합성</span>
                            <span className="font-bold">{item.scores.score2 || 0} / 25점</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                            <span>③ 목적 명확성</span>
                            <span className="font-bold">{item.scores.score3 || 0} / 25점</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                            <span>④ 형식 무결점</span>
                            <span className="font-bold">{item.scores.score4 || 0} / 25점</span>
                          </div>
                        </div>
                        <div className={`px-4 py-3 border-t flex items-center justify-between font-black ${
                          item.scores.totalScore >= 70 ? 'border-green-100 bg-green-50 text-green-700' : 
                          item.scores.totalScore >= 50 ? 'border-orange-100 bg-orange-50 text-orange-700' : 
                          'border-red-100 bg-red-50 text-red-700'
                        }`}>
                          <span className="text-xs uppercase tracking-wider">총점</span>
                          <span className="text-xl">{item.scores.totalScore} / 100점</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex justify-start"
              >
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 flex items-center gap-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1a3a6b]" />
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">AI 학습 조교가 문서를 정밀 분석 중입니다...</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: Input Area */}
        <div className="w-full md:w-[450px] p-4 sm:p-6 bg-white flex flex-col order-1 md:order-2 shrink-0 border-b md:border-b-0 border-gray-100 shadow-xl md:shadow-none z-20">
          <div className="flex-1 flex flex-col min-h-[150px]">
            {activeAssignments.length > 0 && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">수행할 과제 선택</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedAssignmentId('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedAssignmentId === '' 
                      ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]' 
                      : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a3a6b]'
                    }`}
                  >
                    자동 인식
                  </button>
                  {activeAssignments.map(asgn => (
                    <button
                      key={asgn.id}
                      onClick={() => setSelectedAssignmentId(asgn.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        selectedAssignmentId === asgn.id 
                        ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a3a6b]'
                      }`}
                    >
                      {asgn.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">문서 본문 혹은 초안</label>
              <button 
                type="button"
                onClick={() => document.getElementById('file-input')?.click()}
                className="text-[#1a3a6b] text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Paperclip className="w-3 h-3" />
                파일 첨부
              </button>
              <input 
                id="file-input" 
                type="file" 
                className="hidden" 
                onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.pptx,.hwpx"
              />
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              placeholder="이메일, 초청장, 부고문을 직접 입력하거나 파일을 첨부하세요. 이미지를 붙여넣을 수 있습니다."
              className="flex-1 w-full p-4 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/20 focus:bg-white resize-none text-sm transition-all shadow-inner"
            />

            {/* Selected File Preview */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-gray-700 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center w-14 h-14 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
              title="초기화"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
            <button
              onClick={handleGetFeedback}
              disabled={(!inputText.trim() && !selectedFile) || isLoading}
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-bold shadow-lg transition-all ${
                (inputText.trim() || selectedFile) && !isLoading
                ? 'bg-[#1a3a6b] text-white hover:bg-[#132c54] active:scale-[0.98] shadow-blue-900/10'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>AI 피드백 요청</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-start gap-2 text-[10px] text-gray-400 leading-normal">
              <Bot className="w-3 h-3 mt-0.5 shrink-0" />
              <p>TIP: PDF나 이미지 파일을 올려주시면 문서의 형식과 레이아웃까지 정밀하게 분석할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-2 bg-gray-50 text-center shrink-0 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 font-medium tracking-tight">
          이 AI 피드백은 교육용 도구입니다. 최종 완성도는 교수자 지침과 루브릭을 기준으로 점검해 주세요.
        </p>
      </footer>
    </div>
  );
}
