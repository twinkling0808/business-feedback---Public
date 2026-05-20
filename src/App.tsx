import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentInfo, HistoryItem } from './types';
import StudentEntry from './components/StudentEntry';
import FeedbackBoard from './components/FeedbackBoard';
import AdminView from './components/AdminView';

type View = 'entry' | 'main' | 'admin';

export default function App() {
  const [view, setView] = useState<View>('entry');
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Simple session persistence for student info
  useEffect(() => {
    const saved = sessionStorage.getItem('busidoc_student');
    if (saved) {
      setStudent(JSON.parse(saved));
      setView('main');
    }
  }, []);

  const handleStart = (info: StudentInfo) => {
    setStudent(info);
    sessionStorage.setItem('busidoc_student', JSON.stringify(info));
    setView('main');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('busidoc_student');
    setStudent(null);
    setHistory([]);
    setView('entry');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {view === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex items-center justify-center p-4"
          >
            <StudentEntry onStart={handleStart} />
          </motion.div>
        )}

        {view === 'main' && student && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <FeedbackBoard 
              student={student} 
              history={history} 
              onHistoryChange={setHistory}
              onGoAdmin={() => setView('admin')}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {view === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <AdminView onBack={() => setView(student ? 'main' : 'entry')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

