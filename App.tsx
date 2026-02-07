
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Student, ObservationRecord, AppView, CurriculumDoc, Lesson, DocCategory, LessonReport, PendingAnalysis } from './types';
import { INITIAL_STUDENTS, MOCK_OBSERVATION, INITIAL_DOCS, TIMETABLE as INITIAL_TIMETABLE, MOCK_LESSON_REPORTS } from './constants';
import { generateStudentReport, analyzeLessonFidelity, generateFinalReport, analyzePdfContent, extractStudentNamesFromPdf, extractStudentInteractions, StudentInteraction } from './services/geminiService';
import { uploadFileToGemini, deleteFileFromGemini } from './services/fileUploadService';
import { initGoogleAuth, requestAccessToken, findDataFile, uploadToDrive, downloadFromDrive } from './services/googleDriveService';

// --- Sub-components ---

const LoginScreen: React.FC<{ onLogin: (info?: any) => void; isDarkMode: boolean }> = ({ onLogin, isDarkMode }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'findId' | 'findPw'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    school: '',
    subject: ''
  });

  const resetForm = () => setFormData({ email: '', password: '', name: '', school: '', subject: '' });

  const handleModeChange = (newMode: 'login' | 'signup' | 'findId' | 'findPw') => {
    resetForm();
    setMode(newMode);
  };

  const validateAndLogin = () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      alert('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    onLogin();
  };

  const renderForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black">선생님 가입</h2>
              <p className="text-sm text-slate-400 font-bold mt-1">수업비서의 가족이 되어보세요!</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                <input type="text" placeholder="홍길동" className={`w-full h-12 rounded-xl px-4 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이메일 (ID)</label>
                <input type="email" placeholder="example@school.ac.kr" className={`w-full h-12 rounded-xl px-4 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">학교명</label>
                  <input type="text" placeholder="서울중" className={`w-full h-12 rounded-xl px-4 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">과목명</label>
                  <input type="text" placeholder="사회" className={`w-full h-12 rounded-xl px-4 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                <input type="password" placeholder="••••••••" className={`w-full h-12 rounded-xl px-4 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
            </div>
            <button onClick={() => { if (!formData.email || !formData.password) { alert('필수 정보를 입력해주세요.'); return; } alert('가입을 축하드립니다!'); onLogin(formData); }} className="w-full h-14 bg-primary text-white rounded-2xl font-black text-[15px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-6">가입 완료 및 로그인</button>
            <button onClick={() => handleModeChange('login')} className="w-full text-sm font-bold text-slate-400 py-2">이미 계정이 있으신가요?</button>
          </div>
        );
      case 'findId':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black">아이디 찾기</h2>
              <p className="text-sm text-slate-400 font-bold mt-1">등록된 이름과 휴대폰 번호를 입력하세요.</p>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="이름 입력" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} />
              <input type="tel" placeholder="010-0000-0000" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} />
            </div>
            <button onClick={() => alert('입력하신 정보로 등록된 아이디는 [test@school.ac.kr] 입니다.')} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[15px] shadow-lg active:scale-95 transition-all mt-4">아이디 조회하기</button>
            <button onClick={() => handleModeChange('login')} className="w-full text-sm font-bold text-primary py-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[18px]">keyboard_backspace</span>
              로그인으로 돌아가기
            </button>
          </div>
        );
      case 'findPw':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black">비밀번호 찾기</h2>
              <p className="text-sm text-slate-400 font-bold mt-1">이메일로 비밀번호 재설정 링크를 보내드립니다.</p>
            </div>
            <div className="space-y-4">
              <input type="email" placeholder="이메일 주소 입력" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`} />
            </div>
            <button onClick={() => alert('재설정 메일이 발송되었습니다. 메일함을 확인해주세요.')} className="w-full h-14 bg-indigo-500 text-white rounded-2xl font-black text-[15px] shadow-lg active:scale-95 transition-all mt-4">재설정 메일 보내기</button>
            <button onClick={() => handleModeChange('login')} className="w-full text-sm font-bold text-primary py-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[18px]">keyboard_backspace</span>
              로그인으로 돌아가기
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className={`text-[11px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>교사 ID (이메일)</label>
              <input
                type="text"
                placeholder="example@school.ac.kr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full h-14 rounded-2xl px-5 text-[15px] font-bold border-0 ring-1 transition-all focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-[11px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full h-14 rounded-2xl px-5 text-[15px] font-bold border-0 ring-1 transition-all focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`}
              />
            </div>

            <button
              onClick={validateAndLogin}
              className="w-full h-16 bg-primary text-white rounded-3xl font-black text-[16px] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all mt-4"
            >
              로그인 시작하기
            </button>

            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => handleModeChange('findId')} className="text-[12px] font-bold text-slate-400 hover:text-primary transition-colors">아이디 찾기</button>
              <span className="w-px h-3 bg-slate-200"></span>
              <button onClick={() => handleModeChange('findPw')} className="text-[12px] font-bold text-slate-400 hover:text-primary transition-colors">비밀번호 찾기</button>
              <span className="w-px h-3 bg-slate-200"></span>
              <button onClick={() => handleModeChange('signup')} className="text-[12px] font-bold text-primary hover:underline">회원가입</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col px-8 pt-20 pb-12 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      <div className="flex-1 flex flex-col">
        {mode === 'login' && (
          <div className="flex flex-col items-center mb-16 animate-fade-in">
            <div className="size-20 rounded-[2rem] bg-primary flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-500/20">
              <span className="material-symbols-outlined text-[40px]">smart_toy</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">수업비서</h1>
            <p className={`text-[14px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>AI와 함께하는 스마트한 수업 관리</p>
          </div>
        )}
        {renderForm()}
      </div>
    </div>
  );
};

const Drawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  setView: (v: AppView) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
  teacherInfo: { name: string; school: string; subject: string; photoUrl: string };
}> = ({ isOpen, onClose, setView, isDarkMode, toggleDarkMode, onLogout, onEditProfile, teacherInfo }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 left-0 bottom-0 w-[280px] ${isDarkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-white'} z-[70] shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className={`p-8 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'} border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} relative group`}>
          <button
            onClick={() => { onEditProfile(); onClose(); }}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-200/50 transition-colors text-slate-400"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>

          <div className="relative size-16 mb-4 group">
            {teacherInfo.photoUrl ? (
              <img src={teacherInfo.photoUrl} className="size-full rounded-2xl object-cover shadow-lg ring-2 ring-white" alt="Teacher" />
            ) : (
              <div className="size-full rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-[32px]">person</span>
              </div>
            )}
          </div>

          <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{teacherInfo.name} 교사</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold mt-1`}>{teacherInfo.school} • {teacherInfo.subject}</p>
          <button onClick={() => { onEditProfile(); onClose(); }} className="mt-4 text-[11px] font-black text-primary px-3 py-1.5 bg-primary/10 rounded-full">정보 수정</button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <section>
            <p className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">리포트 도구</p>
            <div className="space-y-1">
              <button onClick={() => { setView('batch_report'); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined text-primary">add_chart</span>
                <span className={`text-[14px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>평가보고서 만들기</span>
              </button>
              <button onClick={() => { setView('settings'); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined text-indigo-400">folder_special</span>
                <span className={`text-[14px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>교육과정 자료실</span>
              </button>
              <button onClick={() => { setView('analysis'); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined text-emerald-400">history_edu</span>
                <span className={`text-[14px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>수업 역량 분석</span>
              </button>
            </div>
          </section>

          <section>
            <p className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">환경 설정</p>
            <div className="space-y-1">
              <button onClick={toggleDarkMode} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-orange-400">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                  <span className={`text-[14px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{isDarkMode ? '다크 모드' : '라이트 모드'}</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-primary' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 size-3 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-1'}`}></div>
                </div>
              </button>
            </div>
          </section>
        </div>

        <div className={`p-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'} text-center`}>
          <button onClick={onLogout} className="text-[12px] font-bold text-red-400 mb-4 hover:underline">로그아웃</button>
          <p className="text-[10px] text-slate-400 font-medium">수업비서 EduLog</p>
        </div>
      </div>
    </>
  );
};

const NavigationBar: React.FC<{ activeView: AppView; setView: (v: AppView) => void; isDarkMode: boolean }> = ({ activeView, setView, isDarkMode }) => {
  const items: { id: AppView; icon: string; label: string }[] = [
    { id: 'home', icon: 'home', label: '시간표' },
    { id: 'analysis', icon: 'analytics', label: '수업분석' },
    { id: 'records', icon: 'person_search', label: '학생분석' },
    { id: 'settings', icon: 'settings', label: '셋업' },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 h-[84px] border-t flex items-center justify-around px-6 pb-6 z-50 ${isDarkMode ? 'bg-slate-900/90 backdrop-blur-md border-slate-800' : 'bg-white/90 backdrop-blur-md border-slate-100'}`}>
      {items.map((item) => (
        <button key={item.id} onClick={() => setView(item.id as AppView)}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === item.id ? 'text-primary' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')}`}>
          <span className={`material-symbols-outlined text-[26px] ${activeView === item.id ? 'fill-1' : ''}`}>{item.icon}</span>
          <span className="text-[11px] font-bold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

const LessonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  position: { day: number; period: number } | null;
  onSave: (lesson: Partial<Lesson>) => void;
  onDelete?: (id: string) => void;
  isDarkMode: boolean;
  days: string[];
}> = ({ isOpen, onClose, lesson, position, onSave, onDelete, isDarkMode, days }) => {
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('2-3');
  const [selectedColor, setSelectedColor] = useState('bg-indigo-100 text-indigo-700');

  const colorOptions = [
    { value: 'bg-indigo-100 text-indigo-700', label: '인디고', preview: 'bg-indigo-100' },
    { value: 'bg-blue-100 text-blue-700', label: '파랑', preview: 'bg-blue-100' },
    { value: 'bg-green-100 text-green-700', label: '초록', preview: 'bg-green-100' },
    { value: 'bg-yellow-100 text-yellow-700', label: '노랑', preview: 'bg-yellow-100' },
    { value: 'bg-orange-100 text-orange-700', label: '주황', preview: 'bg-orange-100' },
    { value: 'bg-red-100 text-red-700', label: '빨강', preview: 'bg-red-100' },
    { value: 'bg-pink-100 text-pink-700', label: '분홍', preview: 'bg-pink-100' },
    { value: 'bg-purple-100 text-purple-700', label: '보라', preview: 'bg-purple-100' },
  ];

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setGrade(lesson.grade || '2-3');
      setSelectedColor(lesson.color || 'bg-indigo-100 text-indigo-700');
    } else if (position) {
      setTitle('');
      setGrade('2-3');
      setSelectedColor('bg-indigo-100 text-indigo-700');
    }
  }, [lesson, position, isOpen]);

  const handleSave = () => {
    if (!title.trim()) {
      alert('수업 제목을 입력해주세요.');
      return;
    }

    if (lesson) {
      // Edit existing lesson
      onSave({
        id: lesson.id,
        title,
        grade,
        day: lesson.day,
        period: lesson.period,
        color: selectedColor,
        room: lesson.room,
        achievementCriteria: lesson.achievementCriteria
      });
    } else if (position) {
      // Create new lesson
      onSave({
        title,
        grade,
        day: position.day,
        period: position.period,
        color: selectedColor,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div
          className={`w-full max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-[2.5rem] border shadow-2xl p-8 space-y-6 animate-scale-in pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {lesson ? '수업 수정' : '수업 추가'}
              </h3>
              <p className="text-sm text-slate-400 font-bold mt-1">
                {position && `${days[position.day]}요일 ${position.period}교시`}
                {lesson && `${days[lesson.day]}요일 ${lesson.period}교시`}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`size-10 rounded-full flex items-center justify-center transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                수업 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 역사 2"
                className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 focus:ring-2 focus:ring-primary transition-all ${isDarkMode ? 'bg-slate-950 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                학년-반
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="예: 2-3"
                className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 focus:ring-2 focus:ring-primary transition-all ${isDarkMode ? 'bg-slate-950 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                색상 선택
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`h-12 rounded-xl ${color.preview} flex items-center justify-center font-bold text-xs transition-all hover:scale-105 ${selectedColor === color.value
                      ? 'ring-4 ring-primary ring-offset-2'
                      : 'ring-1 ring-slate-200'
                      }`}
                  >
                    {selectedColor === color.value && (
                      <span className="material-symbols-outlined text-[20px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {lesson && onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('이 수업을 삭제하시겠습니까?')) {
                    onDelete(lesson.id);
                    onClose();
                  }
                }}
                className="flex-1 h-14 rounded-2xl bg-red-500/10 text-red-500 font-black transition-all hover:bg-red-500 hover:text-white active:scale-95"
              >
                삭제
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 h-14 rounded-2xl bg-primary text-white font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              {lesson ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const Header: React.FC<{ title: string; subtitle?: string; onBack?: () => void; isRecording?: boolean; onMenuClick?: () => void; isDarkMode: boolean; teacherPhoto: string; rightAction?: React.ReactNode }> = ({ title, subtitle, onBack, isRecording, onMenuClick, isDarkMode, teacherPhoto, rightAction }) => (
  <header className={`flex items-center justify-between p-4 pt-6 sticky top-0 z-40 transition-colors duration-500 ${isRecording ? 'bg-red-500/10 backdrop-blur-md' : (isDarkMode ? 'bg-slate-950/80' : 'bg-white/80')} backdrop-blur-md`}>
    <button onClick={onBack || onMenuClick} className={`flex size-10 items-center justify-center rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
      <span className="material-symbols-outlined text-[24px]">{onBack ? 'arrow_back' : 'menu'}</span>
    </button>
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        {isRecording && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
        <h2 className={`text-[17px] font-bold leading-tight tracking-tight ${isRecording ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
          {isRecording ? '수업 분석 중' : title}
        </h2>
      </div>
      {subtitle && <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</span>}
    </div>
    <div className="flex items-center gap-2">
      {rightAction}
      <div className={`size-10 flex items-center justify-center rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {teacherPhoto ? (
          <img src={teacherPhoto} className="size-full object-cover" alt="Me" />
        ) : (
          <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
        )}
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('isDarkMode') === 'true');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [teacherInfo, setTeacherInfo] = useState(() => {
    const saved = localStorage.getItem('teacherInfo');
    return saved ? JSON.parse(saved) : {
      name: '김미소',
      school: '서울중학교',
      subject: '역사/사회',
      photoUrl: ''
    };
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [docs, setDocs] = useState<CurriculumDoc[]>(() => {
    const saved = localStorage.getItem('docs');
    return saved ? JSON.parse(saved) : INITIAL_DOCS;
  });

  const [timetable, setTimetable] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('timetable');
    return saved ? JSON.parse(saved) : INITIAL_TIMETABLE;
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [observation, setObservation] = useState<ObservationRecord>(MOCK_OBSERVATION);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lessonFeedback, setLessonFeedback] = useState<any | null>(null);
  const [recordingTranscript, setRecordingTranscript] = useState<string>('');
  const [batchGenerationStatus, setBatchGenerationStatus] = useState<Record<string, { status: 'idle' | 'loading' | 'done', draft: string }>>({});
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [selectedBatchGrade, setSelectedBatchGrade] = useState<string>('2');
  const [selectedBatchClass, setSelectedBatchClass] = useState<string>('3');
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  const [manualView, setManualView] = useState<'none' | 'student' | 'timetable'>('none');
  const [newStudent, setNewStudent] = useState({ name: '', number: '', class: '3', grade: '2', imageUrl: '' });
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({ title: '', grade: '2-3', day: 0, period: 1 });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number>(0);

  // Modal states for timetable editing
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [modalPosition, setModalPosition] = useState<{ day: number; period: number } | null>(null);

  // Modal states for student editing
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Modal states for adding student comment
  const [isAddCommentModalOpen, setIsAddCommentModalOpen] = useState(false);
  const [newComment, setNewComment] = useState({ note: '' });

  // Audio recording state
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // 🆕 학생 검색
  const [activeGradeClassFilter, setActiveGradeClassFilter] = useState<string | null>(null); // 🆕 학년/반 필터

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const teacherPhotoInputRef = useRef<HTMLInputElement>(null);
  const studentPhotoInputRef = useRef<HTMLInputElement>(null);
  const hiddenPdfInputRef = useRef<HTMLInputElement>(null);
  const [activePdfCategory, setActivePdfCategory] = useState<DocCategory | null>(null);
  const wakeLockRef = useRef<any>(null);

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const gradesInRoster = Array.from(new Set(students.map(s => s.grade.toString()))).sort();
  const classesInRoster = Array.from(new Set(students.map(s => s.classNumber.toString()))).sort();

  // 🆕 데이터 마이그레이션 및 동기화 헬퍼 함수들
  const migrateAndSyncData = useCallback(() => {
    let studentsUpdated = false;
    let lessonsUpdated = false;

    // 1. Lesson에 classNumber 추출 (title에서 파싱) 및 history 초기화
    const updatedLessons = timetable.map(lesson => {
      let updated = { ...lesson };
      let changed = false;

      // classNumber 추출
      if (!updated.classNumber && updated.title) {
        const match = updated.title.match(/(\d+)-(.+)/);
        if (match) {
          updated.classNumber = match[2];
          updated.grade = match[1];
          changed = true;
        }
      }

      // history 필드 초기화
      if (!updated.history) {
        updated.history = [];
        changed = true;
      }

      if (changed) lessonsUpdated = true;
      return updated;
    });

    // 2. Student ↔ Lesson 양방향 연결
    const finalLessons = updatedLessons.map(lesson => {
      if (!lesson.studentIds) {
        const matchingStudents = students.filter(s =>
          s.grade === lesson.grade && s.classNumber === lesson.classNumber
        );
        if (matchingStudents.length > 0) {
          lessonsUpdated = true;
          return { ...lesson, studentIds: matchingStudents.map(s => s.id) };
        }
      }
      return lesson;
    });

    const finalStudents = students.map(student => {
      if (!student.lessonIds) {
        const matchingLessons = finalLessons.filter(l =>
          l.grade === student.grade && l.classNumber === student.classNumber
        );
        if (matchingLessons.length > 0) {
          studentsUpdated = true;
          return { ...student, lessonIds: matchingLessons.map(l => l.id) };
        }
      }
      return student;
    });

    if (lessonsUpdated) setTimetable(finalLessons);
    if (studentsUpdated) setStudents(finalStudents);
  }, [timetable, students]);

  // 앱 시작 시 한 번만 마이그레이션 실행 및 구글 인증 초기화
  useEffect(() => {
    initGoogleAuth();
    const migrated = localStorage.getItem('data_migrated_v2');
    if (!migrated) {
      migrateAndSyncData();
      localStorage.setItem('data_migrated_v2', 'true');
    }
  }, [migrateAndSyncData]);

  // Persistence effects
  useEffect(() => { localStorage.setItem('isDarkMode', isDarkMode.toString()); }, [isDarkMode]);
  useEffect(() => { localStorage.setItem('teacherInfo', JSON.stringify(teacherInfo)); }, [teacherInfo]);
  useEffect(() => { localStorage.setItem('students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('docs', JSON.stringify(docs)); }, [docs]);
  useEffect(() => { localStorage.setItem('timetable', JSON.stringify(timetable)); }, [timetable]);

  // Save lesson history index to localStorage
  useEffect(() => {
    if (selectedLesson) {
      const key = `lesson_history_index_${selectedLesson.id}`;
      localStorage.setItem(key, selectedHistoryIndex.toString());
    }
  }, [selectedHistoryIndex, selectedLesson]);

  // Restore lesson history index when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      const key = `lesson_history_index_${selectedLesson.id}`;
      const savedIndex = localStorage.getItem(key);
      const latestIndex = (selectedLesson.history?.length || 1) - 1;

      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex);
        // Use saved index only if it's valid
        if (parsed >= 0 && parsed <= latestIndex) {
          setSelectedHistoryIndex(parsed);
          return;
        }
      }

      // Default to latest history
      setSelectedHistoryIndex(latestIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson?.id, selectedLesson?.history?.length]);

  // 앱 시작 시 미완료 분석 재개
  useEffect(() => {
    const pendingAnalyses = getPendingAnalyses();
    const incompletedAnalyses = pendingAnalyses.filter(
      a => a.status === 'pending' || a.status === 'processing'
    );

    if (incompletedAnalyses.length > 0) {
      console.log(`🔄 미완료 분석 ${incompletedAnalyses.length}개 발견. 재개합니다...`);
      incompletedAnalyses.forEach(analysis => {
        processAnalysisInBackground(analysis.id);
      });
    }
  }, []); // 앱 시작 시 한 번만 실행

  const toggleStudentSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleRecording = useCallback(async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if ('wakeLock' in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request('screen');

        // Initialize MediaRecorder for audio file download
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudioBlob(audioBlob);
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        // Initialize Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'ko-KR';

          let finalTranscript = '';

          recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }
            setRecordingTranscript(finalTranscript + interimTranscript);
          };

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
          };

          recognition.start();
          (window as any).currentRecognition = recognition;
        } else {
          // Fallback if Speech API not available
          console.warn('Web Speech API not available');
        }

        setIsRecording(true);
        setLessonFeedback(null);
        setRecordingTranscript('');
      } catch (err) {
        alert('마이크 권한이 필요합니다.');
      }
    } else {
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (wakeLockRef.current) await wakeLockRef.current.release();

      // Stop speech recognition
      if ((window as any).currentRecognition) {
        (window as any).currentRecognition.stop();
      }

      setIsRecording(false);

      // Get curriculum document URIs for reference
      const curriculumDocs = docs.filter(d =>
        d.category !== 'roster' &&
        d.category !== 'schedule' &&
        d.geminiFileUri &&
        d.uploadStatus === 'completed'
      );
      const referenceDocUris = curriculumDocs.map(d => d.geminiFileUri!);

      // Use actual recording transcript or fallback message
      const transcript = recordingTranscript.trim() || "녹음된 내용이 없습니다. 마이크를 확인해주세요.";

      // 백그라운드 분석을 위한 데이터 저장
      if (selectedLesson) {
        const pendingAnalysis: PendingAnalysis = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          lessonId: selectedLesson.id,
          lessonTitle: selectedLesson.title,
          transcript: transcript,
          achievementCriteria: selectedLesson.achievementCriteria || "",
          referenceDocUris: referenceDocUris,
          studentNames: students.map(s => s.name),
          status: 'pending'
        };

        // localStorage에 저장 and start background processing
        savePendingAnalysis(pendingAnalysis);
        processAnalysisInBackground(pendingAnalysis.id);

        console.log('✅ 분석 작업이 백그라운드에서 시작되었습니다.');
        alert('✅ 녹음이 종료되었습니다!\n\n분석은 백그라운드에서 진행됩니다.\n다른 작업을 계속하셔도 됩니다.');
      }

      setIsGenerating(false);
    }
  }, [isRecording, selectedLesson, docs, timetable, students, recordingTranscript]);

  const handleFileUploadRequest = (category: DocCategory) => {
    setActivePdfCategory(category);
    hiddenPdfInputRef.current?.click();
  };

  const parseCsvAndAddStudents = (csvText: string) => {
    const lines = csvText.split('\n');
    const newStudents: Student[] = [];
    lines.forEach((line, index) => {
      if (!line.trim() || index === 0) return; // Skip empty or header
      const parts = line.split(',');
      if (parts.length >= 1) {
        const name = parts[0].trim();
        if (name) {
          newStudents.push({
            id: Date.now().toString() + index,
            name: name,
            studentNumber: index,
            grade: '2',
            classNumber: '3',
            imageUrl: `https://picsum.photos/seed/${name}/200/200`,
            interactionCount: 0,
            status: 'active',
            history: []
          });
        }
      }
    });
    if (newStudents.length > 0) {
      setStudents(prev => [...prev, ...newStudents]);
      alert(`${newStudents.length}명의 학생이 명렬표에서 자동 등록되었습니다.`);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePdfCategory) return;

    const isRoster = activePdfCategory === 'roster';
    const isSchedule = activePdfCategory === 'schedule';
    const isCurriculum = !isRoster && !isSchedule;

    if (!isRoster && !isSchedule && file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // For curriculum documents, upload to Gemini File API
    if (isCurriculum) {
      const newDoc: CurriculumDoc = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        category: activePdfCategory,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadStatus: 'uploading',
        mimeType: file.type
      };

      // Add document with uploading status
      setDocs(prev => [...prev, newDoc]);

      try {
        // Upload to Gemini File API
        const uploadedFile = await uploadFileToGemini(file);

        // Update document with URI and completed status
        setDocs(prev => prev.map(d =>
          d.id === newDoc.id
            ? { ...d, geminiFileUri: uploadedFile.uri, uploadStatus: 'completed' as const }
            : d
        ));

        alert(`${file.name} 파일이 업로드되었습니다.\n이 문서는 AI 수업 분석 시 참고 자료로 활용됩니다.`);
      } catch (error) {
        console.error("File upload error:", error);

        // Update status to failed
        setDocs(prev => prev.map(d =>
          d.id === newDoc.id
            ? { ...d, uploadStatus: 'failed' as const }
            : d
        ));

        alert(`파일 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      } finally {
        e.target.value = ''; // Reset input
      }
      return;
    }

    // For roster/schedule, use existing base64 method (immediate extraction needed)
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Raw = reader.result as string;
        const base64DataOnly = base64Raw.split(',')[1];

        const newDoc: CurriculumDoc = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          category: activePdfCategory,
          uploadDate: new Date().toISOString().split('T')[0],
          fileData: base64Raw,
          mimeType: file.type
        };

        if (isRoster) {
          setIsGenerating(true);
          try {
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
              const text = atob(base64DataOnly);
              parseCsvAndAddStudents(text);
            } else if (file.type === 'application/pdf') {
              const extractedStudents = await extractStudentNamesFromPdf(base64DataOnly, file.name);
              if (extractedStudents && extractedStudents.length > 0) {
                const newStudents: Student[] = extractedStudents.map((item, idx) => ({
                  id: Date.now().toString() + idx,
                  name: item.name,
                  studentNumber: idx + 1,
                  grade: item.grade || '',
                  classNumber: item.classNumber || '',
                  imageUrl: `https://picsum.photos/seed/${item.name}/200/200`,
                  interactionCount: 0,
                  status: 'active',
                  history: []
                }));
                setStudents(prev => [...prev, ...newStudents]);
                alert(`AI 분석을 통해 ${extractedStudents.length}명의 학생이 등록되었습니다.`);
              } else {
                newDoc.aiSummary = "오류: 문서에서 학생 이름을 찾지 못했습니다.";
              }
            }
          } catch (error) {
            console.error("Roster extraction error:", error);
            newDoc.aiSummary = "오류: 명렬표 분석에 실패했습니다.";
          } finally {
            setIsGenerating(false);
          }
        }

        setDocs(prev => [...prev, newDoc]);
        if (!isRoster) alert(`${file.name} 파일이 업로드되었습니다.`);
      } catch (error) {
        console.error("PDF upload error:", error);
        alert(`파일 업로드 중 오류가 발생했습니다.\n파일이 손상되었거나 형식이 올바르지 않을 수 있습니다.`);
        setIsGenerating(false);
      } finally {
        e.target.value = ''; // Reset input
      }
    };

    reader.onerror = () => {
      alert("파일을 읽는 도중 오류가 발생했습니다.");
      setIsGenerating(false);
      e.target.value = ''; // Reset input
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('이 파일을 삭제하시겠습니까?')) {
      setDocs(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleDownloadFile = (doc: CurriculumDoc) => {
    if (!doc.fileData) {
      alert("파일 데이터가 존재하지 않습니다.");
      return;
    }
    const link = document.createElement("a");
    link.href = doc.fileData;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchGenerate = async () => {
    const targetStudents = students.filter(s =>
      s.grade.toString() === selectedBatchGrade &&
      s.classNumber.toString() === selectedBatchClass &&
      (selectedIds.size === 0 || selectedIds.has(s.id))
    );

    if (targetStudents.length === 0) {
      alert('선택된 학생이 없습니다.');
      return;
    }

    setIsBatchProcessing(true);
    const newStatus = { ...batchGenerationStatus };

    for (const student of targetStudents) {
      newStatus[student.id] = { status: 'loading', draft: '' };
      setBatchGenerationStatus({ ...newStatus });

      try {
        const draft = await generateFinalReport(student.name, student.history);
        newStatus[student.id] = { status: 'done', draft };
        setBatchGenerationStatus({ ...newStatus });
      } catch (e) {
        newStatus[student.id] = { status: 'done', draft: '기록 분석 실패' };
        setBatchGenerationStatus({ ...newStatus });
      }

      await new Promise(resolve => setTimeout(resolve, 800));
    }
    setIsBatchProcessing(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (window.confirm(`${selectedIds.size}명의 학생 정보를 삭제하시겠습니까?`)) {
      setStudents(prev => prev.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      alert('삭제되었습니다.');
    }
  };

  const handleBulkReportStart = () => {
    // Determine the common grade/class or just the first one of the selected
    const firstSelected = students.find(s => selectedIds.has(s.id));
    if (firstSelected) {
      setSelectedBatchGrade(firstSelected.grade.toString());
      setSelectedBatchClass(firstSelected.classNumber.toString());
      setCurrentView('batch_report');
      setIsSelectionMode(false);
    }
  };

  const handleSyncToDrive = async () => {
    try {
      setDriveSyncStatus('syncing');

      // 1. 액세스 토큰 요청 (구글 로그인 팝업)
      const token = await requestAccessToken();

      // 2. 현재 데이터 패키징 (기존 백업 로직 활용)
      const dataToSync = {
        students,
        timetable,
        docs,
        teacherInfo,
        lessonPlans: localStorage.getItem('lessonPlans'),
        curriculum: localStorage.getItem('curriculum'),
      };

      // 3. 구글 드라이브에서 기존 파일 찾기
      const existingFileId = await findDataFile(token);

      if (existingFileId) {
        // 기존 데이터가 있으면 사용자에게 확인 (덮어쓰기 vs 불러오기)
        if (window.confirm('구글 드라이브에 기존 데이터가 있습니다.\n\n[확인]: 현재 데이터를 드라이브에 저장(덮어쓰기)\n[취소]: 드라이브의 데이터를 이 기기로 불러오기')) {
          await uploadToDrive(token, dataToSync, existingFileId);
          alert('✅ 구글 드라이브에 데이터가 저장되었습니다.');
        } else {
          const downloadedData = await downloadFromDrive(token, existingFileId);
          if (downloadedData) {
            // 데이터 복원
            if (downloadedData.students) setStudents(downloadedData.students);
            if (downloadedData.timetable) setTimetable(downloadedData.timetable);
            if (downloadedData.docs) setDocs(downloadedData.docs);
            if (downloadedData.teacherInfo) setTeacherInfo(downloadedData.teacherInfo);
            alert('✅ 구글 드라이브에서 데이터를 불러왔습니다!');
          }
        }
      } else {
        // 파일이 없으면 새로 업로드
        await uploadToDrive(token, dataToSync);
        alert('✅ 구글 드라이브에 새 백업 파일이 생성되었습니다.');
      }

      setDriveSyncStatus('success');
      setTimeout(() => setDriveSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('동기화 오류:', error);
      setDriveSyncStatus('idle');
      alert('❌ 동기화에 실패했습니다. 구글 로그인을 확인해주세요.');
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudentManually = () => {
    if (!newStudent.name || !newStudent.number) {
      alert('학생 이름과 번호를 입력해주세요.');
      return;
    }
    const student: Student = {
      id: Date.now().toString(),
      name: newStudent.name,
      studentNumber: parseInt(newStudent.number),
      grade: newStudent.grade,
      classNumber: newStudent.class,
      imageUrl: newStudent.imageUrl || 'https://picsum.photos/seed/' + newStudent.name + '/200/200',
      interactionCount: 0,
      status: 'active',
      history: []
    };
    const updated = [...students, student];
    setStudents(updated);
    setNewStudent({ name: '', number: '', class: '3', grade: '2', imageUrl: '' });
    setManualView('none');
    alert(`${student.name} 학생이 등록되었습니다.`);
  };

  const handleDeleteStudent = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('정말로 이 학생을 명단에서 삭제하시겠습니까? 관련 모든 기록이 사라집니다.')) {
      setStudents(prev => prev.filter(s => s.id !== id));
      alert('학생이 삭제되었습니다.');
    }
  };

  const handleDownloadRecording = () => {
    if (!recordedAudioBlob) return;
    const url = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson_${new Date().toISOString().slice(0, 10)}_${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditStudent = (student: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStudent(student);
    setIsEditStudentModalOpen(true);
  };

  const handleSaveStudentEdit = () => {
    if (!editingStudent) return;
    setStudents(students.map(s => s.id === editingStudent.id ? editingStudent : s));
    setIsEditStudentModalOpen(false);
    setEditingStudent(null);
  };

  const handleAddLessonManually = () => {
    if (!newLesson.grade) {
      alert('학년-반을 입력해주세요.');
      return;
    }
    const lesson: Lesson = {
      id: 'l-' + Date.now().toString(),
      title: newLesson.grade, // Use grade as title
      grade: newLesson.grade || '2-3',
      room: '교실',
      achievementCriteria: '',
      day: Number(newLesson.day) || 0,
      period: Number(newLesson.period) || 1,
      color: newLesson.color || 'bg-indigo-100 text-indigo-700'
    };
    const updated = [...timetable, lesson];
    setTimetable(updated);
    setNewLesson({ title: '', grade: '2-3', day: 0, period: 1 });
    setManualView('none');
    alert(`${lesson.title} 수업이 시간표에 추가되었습니다.`);
  };

  const handleDeleteLesson = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('정말로 이 수업을 시간표에서 삭제하시겠습니까?')) {
      const updated = timetable.filter(l => l.id !== id);
      setTimetable(updated);
      alert('수업이 삭제되었습니다.');
    }
  };

  const handleSaveLesson = (lessonData: Partial<Lesson>) => {
    if (lessonData.id) {
      // Update existing lesson
      setTimetable(prev => prev.map(l =>
        l.id === lessonData.id ? { ...l, ...lessonData } as Lesson : l
      ));
    } else {
      // Add new lesson
      const newLesson: Lesson = {
        id: 'l-' + Date.now().toString(),
        title: lessonData.title || '',
        grade: lessonData.grade || '2-3',
        room: '교실',
        achievementCriteria: '',
        day: lessonData.day ?? 0,
        period: lessonData.period ?? 1,
        color: lessonData.color || 'bg-indigo-100 text-indigo-700'
      };
      setTimetable(prev => [...prev, newLesson]);
    }
    setIsLessonModalOpen(false);
    setEditingLesson(null);
    setModalPosition(null);
  };

  const handleDeleteLessonFromModal = (id: string) => {
    setTimetable(prev => prev.filter(l => l.id !== id));
    setIsLessonModalOpen(false);
    setEditingLesson(null);
    setModalPosition(null);
  };

  const handleDeleteLessonReport = (lessonId: string, reportIndex: number) => {
    if (!window.confirm('이 분석 기록을 삭제하시겠습니까?')) {
      return;
    }

    setTimetable(prev => prev.map(lesson => {
      if (lesson.id === lessonId && lesson.history) {
        const newHistory = [...lesson.history];
        newHistory.splice(reportIndex, 1);
        return { ...lesson, history: newHistory };
      }
      return lesson;
    }));

    // Update selectedLesson if it's the current lesson
    if (selectedLesson?.id === lessonId) {
      const updatedLesson = timetable.find(l => l.id === lessonId);
      if (updatedLesson) {
        const newHistory = [...(updatedLesson.history || [])];
        newHistory.splice(reportIndex, 1);
        setSelectedLesson({ ...updatedLesson, history: newHistory });
      }
    }
  };

  const handleAddStudentComment = () => {
    if (!selectedStudent || !newComment.note.trim()) {
      alert('코멘트를 입력해주세요.');
      return;
    }

    const newObservation = {
      date: new Date().toLocaleDateString(),
      lessonId: '',
      lessonTitle: '수동 기록',
      observation: '',
      note: newComment.note,
      questionLevel: { tag: '메모', description: newComment.note },
      growthPoint: { title: '관찰 메모', content: newComment.note },
      interactionCount: 0
    };

    setStudents(prev => prev.map(student => {
      if (student.id === selectedStudent.id) {
        return {
          ...student,
          history: [...student.history, newObservation]
        };
      }
      return student;
    }));

    // Update selectedStudent
    setSelectedStudent({
      ...selectedStudent,
      history: [...selectedStudent.history, newObservation]
    });

    setNewComment({ note: '' });
    setIsAddCommentModalOpen(false);
  };

  const handleLogin = (signupInfo?: any) => {
    if (signupInfo) {
      setTeacherInfo({
        name: signupInfo.name,
        school: signupInfo.school,
        subject: signupInfo.subject,
        photoUrl: ''
      });
    }
    setIsLoggedIn(true);
  };

  // 백업 함수: 모든 데이터를 JSON 파일로 다운로드
  const handleBackupData = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        students,
        timetable,
        docs,
        teacherInfo,
        // localStorage의 다른 데이터도 포함
        lessonPlans: localStorage.getItem('lessonPlans'),
        curriculum: localStorage.getItem('curriculum'),
      }
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `수업비서_백업_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ 백업 파일이 다운로드되었습니다!');
  };

  // 복원 함수: JSON 파일을 업로드하여 데이터 복원
  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);

        // 데이터 검증
        if (!backupData.data) {
          throw new Error('올바르지 않은 백업 파일 형식입니다.');
        }

        // 데이터 복원
        if (backupData.data.students) setStudents(backupData.data.students);
        if (backupData.data.timetable) setTimetable(backupData.data.timetable);
        if (backupData.data.docs) setDocs(backupData.data.docs);
        if (backupData.data.teacherInfo) setTeacherInfo(backupData.data.teacherInfo);

        // localStorage 데이터 복원
        if (backupData.data.lessonPlans) {
          localStorage.setItem('lessonPlans', backupData.data.lessonPlans);
        }
        if (backupData.data.curriculum) {
          localStorage.setItem('curriculum', backupData.data.curriculum);
        }

        alert(`✅ 데이터가 복원되었습니다!\n백업 날짜: ${new Date(backupData.timestamp).toLocaleString('ko-KR')}`);
      } catch (error) {
        console.error('복원 오류:', error);
        alert('❌ 백업 파일을 읽는 중 오류가 발생했습니다. 파일을 확인해주세요.');
      }
    };
    reader.readAsText(file);

    // 파일 입력 초기화
    event.target.value = '';
  };

  // ========== 백그라운드 분석 관련 함수 ==========

  // localStorage 헬퍼 함수들
  const savePendingAnalysis = (analysis: PendingAnalysis) => {
    const analyses = getPendingAnalyses();
    analyses.push(analysis);
    localStorage.setItem('pendingAnalyses', JSON.stringify(analyses));
  };

  const getPendingAnalyses = (): PendingAnalysis[] => {
    const saved = localStorage.getItem('pendingAnalyses');
    return saved ? JSON.parse(saved) : [];
  };

  const updateAnalysisStatus = (id: string, status: PendingAnalysis['status'], error?: string) => {
    const analyses = getPendingAnalyses();
    const updated = analyses.map(a =>
      a.id === id ? { ...a, status, error, retryCount: (a.retryCount || 0) + (error ? 1 : 0) } : a
    );
    localStorage.setItem('pendingAnalyses', JSON.stringify(updated));
  };

  const removePendingAnalysis = (id: string) => {
    const analyses = getPendingAnalyses();
    const filtered = analyses.filter(a => a.id !== id);
    localStorage.setItem('pendingAnalyses', JSON.stringify(filtered));
  };

  // 백그라운드 분석 실행 함수
  const processAnalysisInBackground = async (analysisId: string) => {
    const analyses = getPendingAnalyses();
    const analysis = analyses.find(a => a.id === analysisId);

    if (!analysis || analysis.status === 'completed') return;

    // 재시도 횟수 제한 (최대 3회)
    if ((analysis.retryCount || 0) >= 3) {
      updateAnalysisStatus(analysisId, 'failed', '최대 재시도 횟수 초과');
      return;
    }

    try {
      updateAnalysisStatus(analysisId, 'processing');

      // AI 분석 실행
      const result = await analyzeLessonFidelity(
        analysis.transcript,
        analysis.achievementCriteria,
        analysis.referenceDocUris.length > 0 ? analysis.referenceDocUris : undefined
      );

      const report: LessonReport = {
        date: new Date(analysis.timestamp).toLocaleDateString(),
        ...result
      };

      // 수업 history에 저장
      setTimetable(prev => prev.map(l => {
        if (l.id === analysis.lessonId) {
          const newHistory = l.history ? [...l.history, report] : [report];
          return { ...l, history: newHistory };
        }
        return l;
      }));

      // 학생 상호작용 추출
      try {
        const interactions = await extractStudentInteractions(
          analysis.transcript,
          analysis.studentNames
        );

        const validInteractions = interactions.filter(i =>
          i.studentName &&
          i.studentName.trim().length > 0 &&
          i.interaction &&
          i.interaction.trim().length > 5
        );

        if (validInteractions.length > 0) {
          setStudents(prev => prev.map(student => {
            const studentInteraction = validInteractions.find(i => i.studentName === student.name);
            if (studentInteraction) {
              const newObservation = {
                date: new Date(analysis.timestamp).toLocaleDateString(),
                lessonId: analysis.lessonId,
                lessonTitle: analysis.lessonTitle,
                observation: studentInteraction.interaction,
                questionLevel: { tag: '활동', description: studentInteraction.interaction },
                growthPoint: { title: '수업 참여', content: studentInteraction.interaction },
                interactionCount: 1
              };
              return {
                ...student,
                history: [...student.history, newObservation],
                interactionCount: student.interactionCount + 1
              };
            }
            return student;
          }));
        }
      } catch (error) {
        console.error('학생 상호작용 추출 실패:', error);
      }

      // 분석 완료 처리
      updateAnalysisStatus(analysisId, 'completed');

      // 완료된 분석은 24시간 후 자동 삭제
      setTimeout(() => {
        removePendingAnalysis(analysisId);
      }, 24 * 60 * 60 * 1000);

      console.log(`✅ 백그라운드 분석 완료: ${analysis.lessonTitle}`);
    } catch (error) {
      console.error('백그라운드 분석 실패:', error);
      updateAnalysisStatus(analysisId, 'failed', error instanceof Error ? error.message : '알 수 없는 오류');

      // 재시도 (3초 후)
      setTimeout(() => {
        processAnalysisInBackground(analysisId);
      }, 3000);
    }
  };


  const renderContent = () => {
    if (isEditingProfile) {
      return (
        <div className="animate-fade-in p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative size-28 group cursor-pointer"
              onClick={() => teacherPhotoInputRef.current?.click()}
            >
              {teacherInfo.photoUrl ? (
                <img src={teacherInfo.photoUrl} className="size-full rounded-[2.5rem] object-cover ring-4 ring-primary/20 shadow-xl" alt="Me" />
              ) : (
                <div className="size-full rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                  <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white">photo_camera</span>
              </div>
              <input
                type="file"
                ref={teacherPhotoInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageFileChange(e, (base64) => setTeacherInfo({ ...teacherInfo, photoUrl: base64 }))}
              />
            </div>
            <div className="text-center">
              <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>프로필 수정</h3>
              <p className="text-sm text-slate-400 font-bold">사진을 터치하여 앨범이나 카메라를 활용하세요.</p>
            </div>
          </div>

          <div className="space-y-5">
            {[
              { label: '교사 이름', key: 'name', placeholder: '이름 입력' },
              { label: '소속 학교', key: 'school', placeholder: '학교명 입력' },
              { label: '담당 과목', key: 'subject', placeholder: '과목명 입력' },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <label className={`text-[11px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>{field.label}</label>
                <input
                  type="text"
                  value={(teacherInfo as any)[field.key]}
                  onChange={(e) => setTeacherInfo({ ...teacherInfo, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className={`w-full h-14 rounded-2xl px-5 text-[15px] font-bold border-0 ring-1 transition-all focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => { setIsEditingProfile(false); alert('정보가 저장되었습니다.'); }}
            className="w-full h-16 bg-primary text-white rounded-3xl font-black text-[16px] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all mt-4"
          >
            변경사항 저장하기
          </button>
        </div>
      );
    }

    if (currentView === 'batch_report') {
      const targetStudents = students.filter(s =>
        s.grade.toString() === selectedBatchGrade &&
        s.classNumber.toString() === selectedBatchClass
      );
      const isAllDone = targetStudents.length > 0 && targetStudents.every(s => batchGenerationStatus[s.id]?.status === 'done');
      const allSelected = targetStudents.length > 0 && targetStudents.every(s => selectedIds.has(s.id));

      return (
        <div className="animate-fade-in px-6 pb-40 space-y-8">
          <div className="mt-6 flex flex-col gap-2">
            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>평가 대상 선택</h3>
            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>학년과 반을 선택하고 분석 대상을 체크하세요.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">학년 선택</label>
              <select value={selectedBatchGrade} onChange={(e) => { setSelectedBatchGrade(e.target.value); setBatchGenerationStatus({}); setSelectedIds(new Set()); }} className={`w-full h-14 rounded-2xl px-5 font-bold ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                {gradesInRoster.length > 0 ? gradesInRoster.map(g => <option key={g} value={g}>{g}학년</option>) : <option value="">데이터 없음</option>}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">반 선택</label>
              <select value={selectedBatchClass} onChange={(e) => { setSelectedBatchClass(e.target.value); setBatchGenerationStatus({}); setSelectedIds(new Set()); }} className={`w-full h-14 rounded-2xl px-5 font-bold ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                {classesInRoster.length > 0 ? classesInRoster.map(c => <option key={c} value={c}>{c}반</option>) : <option value="">데이터 없음</option>}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <p className="text-[13px] font-bold text-slate-400">대상 학생: {targetStudents.length}명</p>
              <button
                onClick={() => {
                  if (allSelected) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(targetStudents.map(s => s.id)));
                  }
                }}
                className="text-[12px] font-black text-primary flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">{allSelected ? 'check_box' : 'check_box_outline_blank'}</span>
                전체 선택
              </button>
            </div>

            <button onClick={handleBatchGenerate} disabled={isBatchProcessing || selectedIds.size === 0} className={`w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black transition-all ${isBatchProcessing ? 'bg-slate-200 text-slate-400' : (selectedIds.size === 0 ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-xl shadow-blue-500/20 active:scale-95')}`}>
              {isBatchProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined">auto_fix</span>}
              AI 리포트 일괄 생성 ({selectedIds.size}명)
            </button>
          </div>

          <div className="space-y-4">
            {targetStudents.map(student => (
              <div
                key={student.id}
                onClick={() => toggleStudentSelection(student.id)}
                className={`p-6 rounded-[2.5rem] border shadow-sm transition-all cursor-pointer ${selectedIds.has(student.id) ? 'border-primary ring-2 ring-primary/20' : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIds.has(student.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                      {selectedIds.has(student.id) && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                    </div>
                    <img src={student.imageUrl} className="size-10 rounded-full object-cover ring-2 ring-white" />
                    <span className="font-black">{student.name}</span>
                  </div>
                  {batchGenerationStatus[student.id]?.status === 'done' && <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>}
                </div>
                {batchGenerationStatus[student.id]?.status === 'done' && <p className={`mt-4 text-[13px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{batchGenerationStatus[student.id].draft}</p>}
                {batchGenerationStatus[student.id]?.status === 'loading' && <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs"><div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> 분석 중...</div>}
              </div>
            ))}
          </div>

          {isAllDone && (
            <div className={`p-6 rounded-[2.5rem] border shadow-lg animate-fade-in ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-white border-primary/20'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">cloud_done</span>
                  <h4 className="font-black text-[15px]">Google Drive 연동</h4>
                </div>
              </div>
              <button onClick={handleSyncToDrive} disabled={driveSyncStatus === 'syncing'} className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black transition-all ${driveSyncStatus === 'syncing' ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white active:scale-95'}`}>
                {driveSyncStatus === 'syncing' ? <div className="size-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <img src="https://www.gstatic.com/images/branding/product/1x/drive_48dp.png" className="size-5" alt="Drive" />}
                구글 드라이브로 저장하기
              </button>
            </div>
          )}
        </div>
      );
    }

    if (currentView === 'analysis') {
      // Show empty state if no lesson selected
      if (!selectedLesson && !lessonFeedback) {
        // Find lessons with history
        const lessonsWithHistory = timetable.filter(l => l.history && l.history.length > 0);

        return (
          <div className="animate-fade-in p-12 flex flex-col items-center justify-center text-center h-full pb-32">
            <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
              <span className="material-symbols-outlined text-[40px]">analytics</span>
            </div>
            <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>수업 분석 리포트</h3>
            <p className="text-sm text-slate-400 font-bold mb-6">
              {lessonsWithHistory.length > 0
                ? '분석 결과를 확인할 수업을 선택하세요.'
                : '시간표에서 수업을 선택하고 \'기록 시작\'을 진행하면\n이곳에 상세 분석 결과가 쌓입니다.'}
            </p>

            {lessonsWithHistory.length > 0 && (
              <div className="w-full max-w-sm">
                <select
                  onChange={(e) => {
                    const lesson = timetable.find(l => l.id === e.target.value);
                    if (lesson) {
                      setSelectedLesson(lesson);
                      setLessonFeedback(null); // Clear previous lesson's feedback
                      setRecordedAudioBlob(null); // Clear previous lesson's recording
                    }
                  }}
                  className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 focus:ring-2 focus:ring-primary transition-all ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100 text-slate-900'}`}
                >
                  <option value="">수업 선택</option>
                  {lessonsWithHistory.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.history?.length || 0}회 분석)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      }

      // Get all history for the selected lesson
      const allHistory = selectedLesson?.history || [];

      // Display history directly without adding lessonFeedback again
      // (lessonFeedback is already saved to history when recording stops)
      const displayHistory = allHistory;

      // Show empty state if no history
      if (displayHistory.length === 0) {
        return (
          <div className="animate-fade-in px-6 pb-40 space-y-8">
            <div className="mt-6 flex flex-col gap-1">
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedLesson?.title} 분석 이력</h3>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No Analysis Records</p>
            </div>
            <div className={`p-10 rounded-[2.5rem] border border-dashed text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-slate-400 font-bold">아직 진행된 수업 분석 데이터가 없습니다.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="animate-fade-in px-6 pb-40 space-y-6">
          {/* Header */}
          <div className="mt-6 flex flex-col gap-1">
            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedLesson?.title || "분석 리포트"}</h3>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
              총 {displayHistory.length}회 수업 분석
            </p>
          </div>

          {/* Feedback History List */}
          <div className="space-y-6">
            {displayHistory.map((report, idx) => {
              const isNew = idx === 0 && lessonFeedback;
              const indicators = [
                { label: '성취기준 정합성', value: report.achievementAlignment.score, feedback: report.achievementAlignment.feedback, color: 'bg-primary', icon: 'verified_user' },
                { label: '내용 정확성', value: report.contentAccuracy.score, feedback: report.contentAccuracy.feedback, color: 'bg-emerald-500', icon: 'fact_check' },
                { label: '상호작용 품질', value: report.interactionQuality.score, feedback: report.interactionQuality.feedback, color: 'bg-indigo-500', icon: 'record_voice_over' }
              ];

              return (
                <div key={idx} className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-[2.5rem] border shadow-lg space-y-6 transition-all hover:shadow-xl ${isNew ? 'ring-2 ring-primary/50' : ''}`}>
                  {/* Date Header */}
                  <div className="flex justify-between items-center border-b pb-4 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl ${isNew ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                      </div>
                      <div>
                        <h4 className={`font-black text-[16px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {new Date(report.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          {displayHistory.length - idx}회차 수업
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isNew && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-primary text-white">
                          NEW
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteLessonReport(selectedLesson!.id, idx)}
                        className="size-8 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all active:scale-95"
                        title="분석 기록 삭제"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    {indicators.map((item, i) => (
                      <div key={i} className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'} text-center`}>
                        <div className={`size-8 rounded-lg ${item.color}/10 ${item.color.replace('bg-', 'text-')} flex items-center justify-center mx-auto mb-2`}>
                          <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                        </div>
                        <div className={`text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}/10</div>
                        <div className="text-[10px] text-slate-400 font-bold">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Feedback - Collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all">
                      <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>상세 피드백 보기</span>
                      <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>

                    <div className="mt-4 space-y-4">
                      {/* Individual Feedbacks */}
                      {indicators.map((item, i) => (
                        <div key={i} className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`size-6 rounded-lg ${item.color}/10 ${item.color.replace('bg-', 'text-')} flex items-center justify-center`}>
                              <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                            </div>
                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.label}</span>
                          </div>
                          <p className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.feedback}</p>
                        </div>
                      ))}

                      {/* In-depth Analysis */}
                      <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} border-2`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">psychology_alt</span>
                          </div>
                          <h5 className={`font-black text-[14px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI 종합 분석</h5>
                        </div>
                        <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {report.inDepthAnalysis}
                        </p>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedStudent) {
      return (
        <div className="animate-fade-in px-6 pb-40">
          <div className="flex items-center gap-5 mt-6 mb-8">
            <div className="bg-center bg-no-repeat bg-cover rounded-[1.5rem] size-20 shadow-md border-2 border-white ring-4 ring-primary/5"
              style={{ backgroundImage: `url("${selectedStudent.imageUrl}")` }} />
            <div className="flex-1">
              <h3 className={`text-[24px] font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedStudent.name}</h3>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary">누적 {selectedStudent.interactionCount}회</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{selectedStudent.grade}학년 {selectedStudent.classNumber} {selectedStudent.studentNumber}번</span>
              </div>
            </div>
            <button onClick={() => { setEditingStudent(selectedStudent); setIsEditStudentModalOpen(true); }} className="size-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[20px] text-primary">edit</span>
            </button>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-1">
              <p className={`text-[15px] font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>학기별 관찰 로그</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddCommentModalOpen(true)}
                  className="text-[12px] font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-4 py-2 rounded-full transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  코멘트 추가
                </button>
                <button onClick={() => { setIsGenerating(true); generateFinalReport(selectedStudent.name, selectedStudent.history).then(res => { setObservation(prev => ({ ...prev, draft: res })); setIsGenerating(false); }); }} className="text-[12px] font-bold text-primary flex items-center gap-1.5 bg-primary/10 px-4 py-2 rounded-full transition-transform active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">auto_fix</span>
                  개별 세특 생성
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {selectedStudent.history.length > 0 ? selectedStudent.history.map((h, i) => (
                <div key={i} className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-5 rounded-3xl border shadow-sm`}>
                  <div className="flex justify-between mb-3">
                    <span className="text-[12px] font-black text-primary">{h.lessonTitle}</span>
                    <span className="text-[11px] text-slate-400 font-bold">{h.date}</span>
                  </div>
                  {h.observation && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-slate-400 mb-1">💬 수업 중 발언</p>
                      <p className={`text-[14px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{h.observation}</p>
                    </div>
                  )}
                  {h.note && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 mb-1">📝 관찰 메모</p>
                      <p className={`text-[14px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{h.note}</p>
                    </div>
                  )}
                  {!h.observation && !h.note && (
                    <p className={`text-[14px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>기록된 내용이 없습니다.</p>
                  )}
                </div>
              )) : (
                <div className={`text-center py-16 rounded-[2.5rem] border border-dashed ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-sm text-slate-400 font-bold">기록된 수업 발언이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div >
      );
    }

    // Manual view overrides - check before switch statement
    if (manualView === 'student') {
      return (
        <div className="animate-fade-in p-8 space-y-8">
          <div className="flex items-center gap-2"><button onClick={() => setManualView('none')} className="text-slate-400 transition-colors hover:text-primary"><span className="material-symbols-outlined">arrow_back</span></button><h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>학생 수동 추가</h3></div>

          <div className="flex flex-col items-center gap-4">
            <div
              className="relative size-24 rounded-[2rem] bg-slate-100 overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer group"
              onClick={() => studentPhotoInputRef.current?.click()}
            >
              {newStudent.imageUrl ? <img src={newStudent.imageUrl} className="size-full object-cover" alt="Preview" /> : <span className="material-symbols-outlined text-slate-300">add_a_photo</span>}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white">photo_camera</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-bold">터치하여 사진을 등록하세요.</p>
            <input
              type="file"
              ref={studentPhotoInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageFileChange(e, (base64) => setNewStudent({ ...newStudent, imageUrl: base64 }))}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">학년</label>
                <input type="text" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })} placeholder="2학년" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50'}`} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">반</label>
                <input type="text" value={newStudent.class} onChange={e => setNewStudent({ ...newStudent, class: e.target.value })} placeholder="3반" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50'}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">번호</label>
                <input type="number" value={newStudent.number} onChange={e => setNewStudent({ ...newStudent, number: e.target.value })} placeholder="1" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50'}`} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                <input type="text" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="이름" className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50'}`} />
              </div>
            </div>
            <button onClick={handleAddStudentManually} className="w-full h-16 bg-primary text-white rounded-3xl font-black shadow-xl shadow-blue-500/20 mt-4 transition-transform active:scale-95">학생 등록하기</button>
          </div>
        </div>
      );
    }

    if (manualView === 'timetable') {
      const colorOptions = [
        { value: 'bg-indigo-100 text-indigo-700', label: '인디고', preview: 'bg-indigo-100' },
        { value: 'bg-blue-100 text-blue-700', label: '파랑', preview: 'bg-blue-100' },
        { value: 'bg-green-100 text-green-700', label: '초록', preview: 'bg-green-100' },
        { value: 'bg-yellow-100 text-yellow-700', label: '노랑', preview: 'bg-yellow-100' },
        { value: 'bg-orange-100 text-orange-700', label: '주황', preview: 'bg-orange-100' },
        { value: 'bg-red-100 text-red-700', label: '빨강', preview: 'bg-red-100' },
        { value: 'bg-pink-100 text-pink-700', label: '분홍', preview: 'bg-pink-100' },
        { value: 'bg-purple-100 text-purple-700', label: '보라', preview: 'bg-purple-100' },
      ];

      return (
        <div className="animate-fade-in p-8 space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setManualView('none')} className="text-slate-400 transition-colors hover:text-primary">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>수업 추가</h3>
          </div>

          <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold mb-1">요일</p>
                <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {days[Number(newLesson.day) || 0]}요일
                </p>
              </div>
              <div className="w-px h-12 bg-slate-300"></div>
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold mb-1">교시</p>
                <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {newLesson.period}교시
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">학년-반</label>
              <input
                type="text"
                value={newLesson.grade}
                onChange={e => setNewLesson({ ...newLesson, grade: e.target.value })}
                placeholder="예: 2-3"
                className={`w-full h-14 rounded-2xl px-5 font-bold border-0 ring-1 focus:ring-2 focus:ring-primary ${isDarkMode ? 'bg-slate-900 ring-slate-800 text-white' : 'bg-slate-50 ring-slate-100'}`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">색상 선택</label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewLesson({ ...newLesson, color: color.value })}
                    className={`h-12 rounded-xl ${color.preview} flex items-center justify-center font-bold text-xs transition-all hover:scale-105 ${(newLesson.color || 'bg-indigo-100 text-indigo-700') === color.value
                      ? 'ring-4 ring-primary ring-offset-2'
                      : 'ring-1 ring-slate-200'
                      }`}
                  >
                    {(newLesson.color || 'bg-indigo-100 text-indigo-700') === color.value && (
                      <span className="material-symbols-outlined text-[20px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleAddLessonManually} className="w-full h-16 bg-primary text-white rounded-3xl font-black shadow-xl mt-4 active:scale-95 transition-transform">시간표에 추가하기</button>
        </div>
      );
    }

    switch (currentView) {
      case 'settings':

        return (
          <div className="animate-fade-in p-6 space-y-8 pb-32">
            <div className="flex flex-col gap-1"><h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>수업비서 셋업</h3><p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Configuration</p></div>

            {/* 🆕 구글 드라이브 클라우드 동기화 (프리미엄 디자인 적용) */}
            <div className={`p-6 rounded-[2.5rem] border shadow-md relative overflow-hidden transition-all hover:shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[100px] rotate-12">cloud_sync</span>
              </div>

              <div className="flex items-start gap-4 relative z-10">
                <div className={`size-12 rounded-2xl flex items-center justify-center font-black shadow-inner ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                  <span className="material-symbols-outlined text-[28px]">cloud_sync</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-lg font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>구글 드라이브 클라우드 동기화</h4>
                    <div className="flex items-center gap-2">
                      {driveSyncStatus === 'syncing' && <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${driveSyncStatus === 'syncing' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`}>
                        {driveSyncStatus === 'syncing' ? 'Syncing...' : 'Connected'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-bold mb-5 leading-relaxed">
                    핸드폰과 PC 간에 실시간으로 데이터를 마법처럼 주고받습니다.<br />
                    언제 어디서든 끊김 없는 수업 준비를 시작하세요.
                  </p>

                  <button
                    onClick={handleSyncToDrive}
                    disabled={driveSyncStatus === 'syncing'}
                    className={`h-14 w-full rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${driveSyncStatus === 'syncing'
                      ? 'bg-slate-100 text-slate-400 shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${driveSyncStatus === 'syncing' ? 'animate-spin' : ''}`}>
                      {driveSyncStatus === 'syncing' ? 'sync' : 'google_plus_reshare'}
                    </span>
                    {driveSyncStatus === 'syncing' ? '클라우드와 연결 하는 중...' : '지금 바로 데이터 동기화 시작하기'}
                  </button>
                </div>
              </div>
            </div>

            {/* 🆕 데이터 백업/복원 */}
            <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-500 text-[24px]">backup</span>
                <div className="flex-1">
                  <h4 className={`text-sm font-black mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>데이터 백업 및 복원 (오프라인)</h4>
                  <p className={`text-xs mb-3 ${isDarkMode ? 'text-blue-400/70' : 'text-blue-600'}`}>
                    모든 데이터를 JSON 파일로 백업하거나 복원할 수 있습니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBackupData}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      백업 다운로드
                    </button>
                    <input
                      type="file"
                      id="restore-input"
                      className="hidden"
                      accept=".json"
                      onChange={handleRestoreData}
                    />
                    <button
                      onClick={() => document.getElementById('restore-input')?.click()}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      백업 복원
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 🆕 데이터 초기화 */}
            <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-[24px]">warning</span>
                <div className="flex-1">
                  <h4 className={`text-sm font-black mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>데이터 전체 초기화</h4>
                  <p className={`text-xs mb-3 ${isDarkMode ? 'text-red-400/70' : 'text-red-600'}`}>
                    모든 학생, 수업, 녹음 기록이 삭제됩니다.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('⚠️ 정말로 모든 데이터를 삭제하시겠습니까?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 active:scale-95 transition-all"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <input
                type="file"
                ref={hiddenPdfInputRef}
                className="hidden"
                accept=".pdf,.jpg,.png,.jpeg,.csv"
                onChange={handlePdfUpload}
              />
              {[
                { id: 'curriculum', label: '교육과정 문서 (PDF)', icon: 'bookmark_manager', color: 'bg-indigo-500/10 text-indigo-500', num: 1, info: '국가 교육과정 PDF 등록' },
                { id: 'plan', label: '단원 지도 계획서 (PDF)', icon: 'assignment', color: 'bg-emerald-500/10 text-emerald-500', num: 2, info: '학기별 지도 계획 PDF 등록' },
                { id: 'roster', label: '학급 명렬표 (CSV/PDF)', icon: 'group_add', color: 'bg-orange-500/10 text-orange-500', num: 3, canManual: true, manualType: 'student', info: 'PDF나 CSV 파일을 업로드하면 자동 등록됩니다.' },
                { id: 'schedule', label: '시간표 인터페이스 (IMG/PDF)', icon: 'calendar_today', color: 'bg-purple-500/10 text-purple-500', num: 4, canManual: true, manualType: 'timetable', info: '시간표 이미지 또는 PDF' }
              ].map(item => (
                <div key={item.id} className={`p-6 rounded-[2rem] border shadow-sm flex flex-col gap-5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`size-11 rounded-2xl ${item.color} flex items-center justify-center font-black text-lg`}>{item.num}</div>
                      <div>
                        <h4 className={`font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.label}</h4>
                        {item.info && <p className="text-[10px] text-slate-400 font-bold">{item.info}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleFileUploadRequest(item.id as DocCategory)} className={`h-14 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500 hover:border-primary/50' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-primary/50'}`}>
                      <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                      <span className="text-[13px] font-black">파일 등록</span>
                    </button>
                    {item.canManual && (
                      <button onClick={() => setManualView(item.manualType as any)} className={`h-14 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500 hover:border-secondary/50' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-secondary/50'}`}>
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                        <span className="text-[13px] font-black">직접 입력</span>
                      </button>
                    )}
                  </div>
                  {docs.filter(d => d.category === item.id).map(d => (
                    <div key={d.id} className={`p-4 rounded-xl text-xs font-medium flex flex-col gap-2 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2 text-primary">
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-[16px] text-emerald-500">task_alt</span>
                          <span className="truncate">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleDownloadFile(d)} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </button>
                          <button onClick={(e) => handleDeleteFile(d.id, e)} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                      {d.aiSummary?.includes("오류") && <p className="text-[10px] text-red-500 font-bold">{d.aiSummary}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {isGenerating && (
              <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
                <div className={`p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                  <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-black">명렬표 데이터 분석 중입니다...</p>
                </div>
              </div>
            )}
          </div>
        );


      case 'home':
        if (!selectedLesson) {
          return (
            <div className="animate-fade-in p-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex flex-col">
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>시간표</h3>
                </div>
              </div>
              <div className={`flex-1 rounded-[2.5rem] border overflow-hidden flex flex-col shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`grid grid-cols-[1fr_1fr_1fr_1fr_1fr] border-b ${isDarkMode ? 'border-slate-800 bg-slate-800/30' : 'border-slate-50 bg-slate-50/50'}`}>
                  {days.map(day => (<div key={day} className={`h-10 flex items-center justify-center border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} first:border-l-0`}><span className="text-[11px] font-black text-slate-400">{day}</span></div>))}
                </div>
                <div className="flex-1 grid grid-rows-7 relative">
                  {periods.map(p => (
                    <div key={p} className={`grid grid-cols-[1fr_1fr_1fr_1fr_1fr] border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-50'} last:border-b-0`}>
                      {[0, 1, 2, 3, 4].map(d => {
                        const lessons = timetable.filter(l => l.day === d && l.period === p);
                        return (
                          <div
                            key={d}
                            className={`border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-50'} p-0.5 cursor-pointer relative group transition-all ${lessons.length > 0 ? '' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                            onClick={() => {
                              if (lessons.length === 0) {
                                setManualView('timetable');
                                setNewLesson({ title: '', grade: '2-3', day: d, period: p });
                              }
                            }}
                          >
                            {lessons.length > 0 ? (
                              <div className="w-full h-full flex flex-col gap-0.5">
                                {lessons.map((lesson, idx) => (
                                  <div
                                    key={lesson.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLesson(lesson);
                                      setLessonFeedback(null); // Clear previous lesson's feedback
                                      setRecordedAudioBlob(null); // Clear previous lesson's recording
                                    }}
                                    className={`flex-1 rounded-lg ${lesson.color} p-1 flex flex-col items-center justify-center shadow-sm text-center relative hover:scale-[1.05] hover:z-20 transition-all`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteLesson(lesson.id, e)}
                                      className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-[100] active:scale-90"
                                    >
                                      <span className="material-symbols-outlined text-[12px] font-black">close</span>
                                    </button>
                                    <p className="text-[9px] font-black leading-tight mb-0.5 line-clamp-1">{lesson.title}</p>
                                    {lessons.length === 1 && (
                                      <p className="text-[7px] opacity-70 font-bold">{lesson.grade}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="animate-fade-in p-6 h-full flex flex-col">
            <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-500/20 mb-8 relative">
              <button
                onClick={() => setSelectedLesson(null)}
                className="absolute top-6 right-6 size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              <h3 className="text-2xl font-black mb-3">{selectedLesson.title}</h3>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black backdrop-blur-md">
                  {selectedLesson.period}교시
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingLesson(selectedLesson);
                    setModalPosition({ day: selectedLesson.day, period: selectedLesson.period });
                    setIsLessonModalOpen(true);
                  }}
                  className="size-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md ml-1"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              </div>

              <p className="text-blue-100 text-[13px] font-medium opacity-90 leading-relaxed line-clamp-2">
                {selectedLesson.history && selectedLesson.history.length > 0
                  ? `누적 분석 ${selectedLesson.history.length}회`
                  : "아직 진행된 수업 분석 데이터가 없습니다."}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="relative">
                {isRecording && <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>}
                <button onClick={handleToggleRecording} className={`relative z-10 size-48 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-500 shadow-2xl active:scale-95 ${isRecording ? 'bg-red-500 text-white' : (isDarkMode ? 'bg-slate-800 text-primary border-4 border-slate-700' : 'bg-white text-primary border-4 border-slate-50')}`}>
                  <span className="material-symbols-outlined text-[72px]">{isRecording ? 'stop_circle' : 'mic'}</span>
                  <span className="text-base font-black tracking-tight">{isRecording ? '기록 종료' : '기록 시작'}</span>
                </button>
              </div>

              {/* 🆕 실시간 자막 */}
              {isRecording && (
                <div className={`mt-6 p-6 rounded-2xl max-w-md mx-auto ${isDarkMode ? 'bg-slate-800/80 border border-slate-700' : 'bg-white/80 border border-slate-200'} backdrop-blur-sm`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-xs font-bold text-slate-400">실시간 음성 인식 중...</p>
                  </div>
                  <p className={`text-sm leading-relaxed min-h-[60px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {recordingTranscript || "음성을 인식하고 있습니다..."}
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-primary">AI가 수업 역량을 정밀 분석 중입니다...</p>
                </div>
              )}

              {lessonFeedback && (
                <div className={`mt-8 p-6 rounded-[2rem] border animate-fade-in cursor-pointer hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-700'}`} onClick={() => setCurrentView('analysis')}>
                  <h4 className="font-black text-primary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">analytics</span>
                    분석 완료 (결과 확인)
                  </h4>
                  <p className="text-[13px] leading-relaxed line-clamp-3 opacity-80">{lessonFeedback.inDepthAnalysis}</p>
                </div>
              )}

              {/* 🆕 녹음 다운로드 버튼 */}
              {recordedAudioBlob && !isRecording && (
                <button
                  onClick={handleDownloadRecording}
                  className={`mt-4 w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  최근 녹음 파일 다운로드
                </button>
              )}
            </div>
          </div>
        );

      case 'records':
      default:
        return (
          <div className="animate-fade-in p-4 space-y-6">
            <div className="px-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>학생 분석 명단</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Student Analysis List</p>
                </div>
                <div className="flex gap-2">
                  {students.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          // Get currently filtered students
                          const filteredStudents = selectedLesson
                            ? students.filter(s => {
                              const match = selectedLesson.title.match(/(\d+)-(.+)/);
                              if (match) {
                                const [, lessonGrade, lessonClass] = match;
                                return s.grade === lessonGrade && s.classNumber === lessonClass;
                              }
                              return false;
                            })
                            : students;

                          let gradeClassFiltered = filteredStudents;
                          if (activeGradeClassFilter && activeGradeClassFilter.startsWith('grade-')) {
                            const [grade, classNum] = activeGradeClassFilter.replace('grade-', '').split('-');
                            gradeClassFiltered = filteredStudents.filter(s =>
                              s.grade.toString() === grade && s.classNumber === classNum
                            );
                          }

                          const searchFiltered = searchQuery.trim()
                            ? gradeClassFiltered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            : gradeClassFiltered;

                          // Enable selection mode and select all filtered students
                          setIsSelectionMode(true);
                          const newSelectedIds = new Set<string>();
                          searchFiltered.forEach(s => newSelectedIds.add(s.id));
                          setSelectedIds(newSelectedIds);
                        }}
                        className="px-4 py-2 rounded-xl text-[12px] font-black transition-all bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        전체 선택
                      </button>
                      <button
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds(new Set()); }}
                        className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${isSelectionMode ? 'bg-slate-900 text-white' : 'bg-primary/10 text-primary'}`}
                      >
                        {isSelectionMode ? '선택 취소' : '선택'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 반별 필터 */}
              {timetable.length > 0 && (
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    수업 선택 (반별 학생 보기)
                  </label>
                  <select
                    value={activeGradeClassFilter || selectedLesson?.id || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setSelectedLesson(null);
                        setActiveGradeClassFilter(null);
                      } else if (value.startsWith('grade-')) {
                        setActiveGradeClassFilter(value);
                        setSelectedLesson(null);
                      } else {
                        const lesson = timetable.find(l => l.id === value);
                        setSelectedLesson(lesson || null);
                        setActiveGradeClassFilter(null);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="">전체 학생 보기</option>
                    {/* 학년/반별 그룹 */}
                    {(() => {
                      const groups = new Map<string, Set<string>>();
                      students.forEach(s => {
                        const key = s.grade.toString();
                        if (!groups.has(key)) groups.set(key, new Set());
                        groups.get(key)!.add(s.classNumber);
                      });
                      return Array.from(groups.entries()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([grade, classes]) => (
                        <optgroup key={grade} label={`${grade}학년`}>
                          {Array.from(classes).sort().map(classNum => (
                            <option key={`grade-${grade}-${classNum}`} value={`grade-${grade}-${classNum}`}>
                              {grade}학년 {classNum}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pb-32">
              <div className={`overflow-hidden rounded-[2rem] border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <table className="w-full text-left">
                  <thead className={`${isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'} text-[11px] uppercase tracking-wider font-black`}>
                    <tr>
                      <th className="px-4 py-4 whitespace-nowrap w-[60px]">선택</th>
                      <th className="px-4 py-4">학생 정보</th>
                      <th className="px-4 py-4 text-center">분석 횟수</th>
                      {!isSelectionMode && <th className="px-4 py-4 text-right">관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      // 반별 필터링
                      const filteredStudents = selectedLesson
                        ? students.filter(s => {
                          // Lesson title에서 학년-반 정보 추출
                          const match = selectedLesson.title.match(/(\d+)-(.+)/);
                          if (match) {
                            const [, lessonGrade, lessonClass] = match;
                            return s.grade === lessonGrade && s.classNumber === lessonClass;
                          }
                          return false;
                        })
                        : students;

                      // 🆕 학년/반 필터링
                      let gradeClassFiltered = filteredStudents;
                      if (activeGradeClassFilter && activeGradeClassFilter.startsWith('grade-')) {
                        const [grade, classNum] = activeGradeClassFilter.replace('grade-', '').split('-');
                        gradeClassFiltered = filteredStudents.filter(s =>
                          s.grade.toString() === grade && s.classNumber === classNum
                        );
                      }

                      // 🆕 검색어 필터링
                      const searchFiltered = searchQuery.trim()
                        ? gradeClassFiltered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        : gradeClassFiltered;

                      if (searchFiltered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-20 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-[48px] text-slate-200 mb-4">person_off</span>
                                <p className="text-[15px] font-black text-slate-300">
                                  {searchQuery ? `"${searchQuery}"에 대한 검색 결과가 없습니다.` : '등록된 학생이 없습니다.'}
                                </p>
                                {!searchQuery && (
                                  <p className="text-[12px] text-slate-400 mt-2 font-bold">셋업 메뉴에서 명렬표(PDF/CSV)를 등록하거나<br />학생을 직접 추가해주세요.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return searchFiltered.map((s, index) => {
                        // Check if this is the start of a new grade
                        const prevStudent = index > 0 ? searchFiltered[index - 1] : null;
                        const isNewGrade = !prevStudent || prevStudent.grade !== s.grade;

                        return (
                          <React.Fragment key={s.id}>
                            {isNewGrade && (
                              <tr className={`${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
                                <td colSpan={isSelectionMode ? 3 : 4} className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                                    <span className="text-xs font-black text-primary px-2">{s.grade}학년</span>
                                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr
                              className={`group cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                            >
                              <td
                                className="px-4 py-4"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSelectionMode) {
                                    setIsSelectionMode(true);
                                  }
                                  toggleStudentSelection(s.id);
                                }}
                              >
                                <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIds.has(s.id) ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                                  {selectedIds.has(s.id) && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                                </div>
                              </td>
                              <td className="px-4 py-4" onClick={() => !isSelectionMode && setSelectedStudent(s)}>
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                                    {s.imageUrl ? <img src={s.imageUrl} className="size-full object-cover" alt={s.name} /> : <div className="size-full bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-300 text-[18px]">person</span></div>}
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-[14px] font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{s.name}</p>
                                    <p className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{s.grade}학년 {s.classNumber} {s.studentNumber}번</p>
                                    {/* 최근 관찰 내용 표시 */}
                                    {s.history.length > 0 && (
                                      <p className={`text-[11px] font-medium mt-1 line-clamp-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>
                                        최근: {s.history[s.history.length - 1].observation || s.history[s.history.length - 1].note || s.history[s.history.length - 1].questionQuality || '관찰 기록 없음'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${s.history.length > 0 ? 'bg-primary/10 text-primary' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                                  {s.history.length}건
                                </span>
                              </td>
                              {!isSelectionMode && (
                                <td className="px-4 py-4 text-right">
                                  <button
                                    onClick={(e) => handleDeleteStudent(s.id, e)}
                                    className="size-8 rounded-full inline-flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleEditStudent(s, e)}
                                    className="size-8 rounded-full inline-flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors ml-1"
                                  >
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                          </React.Fragment>
                        );
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Selection Action Bar */}
            {isSelectionMode && selectedIds.size > 0 && (
              <div className="fixed bottom-24 left-0 right-0 z-50 px-6 animate-fade-in">
                <div className={`rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}>
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      </div>
                      <div>
                        <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>선택됨</p>
                        <p className="text-xs text-primary font-bold">{selectedIds.size}명의 학생</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBulkDelete}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      <button
                        onClick={handleBulkReportStart}
                        className="px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">auto_fix</span>
                        보고서 생성
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const getHeaderInfo = () => {
    if (isEditingProfile) return { title: "교사 정보 수정", subtitle: "Profile Settings" };
    if (currentView === 'batch_report') return { title: "평가보고서 생성", subtitle: "Batch AI Writer" };
    if (manualView !== 'none') return { title: manualView === 'student' ? '학생 추가' : '수업 추가', subtitle: "Manual Entry" };
    if (selectedStudent) return { title: "학생 개별 분석", subtitle: "Assessment Record" };
    switch (currentView) {
      case 'home': return { title: "시간표", subtitle: "" };
      case 'analysis': return { title: "수업 역량 분석", subtitle: "Professional Insights" };
      case 'settings': return { title: "자료 설정", subtitle: "Configuration" };
      case 'records': default: return { title: "학생 성장 분석", subtitle: "Student Analysis List" };
    }
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} isDarkMode={isDarkMode} />;

  const headerInfo = getHeaderInfo();

  return (
    <div className={`max-w-md mx-auto min-h-screen relative shadow-2xl overflow-hidden pb-24 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-background-light text-slate-900'}`}>
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} setView={(v) => { setCurrentView(v); setSelectedIds(new Set()); setIsSelectionMode(false); }} isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} onLogout={() => { setIsLoggedIn(false); setIsEditingProfile(false); }} onEditProfile={() => setIsEditingProfile(true)} teacherInfo={teacherInfo} />
      <Header title={headerInfo.title} subtitle={headerInfo.subtitle} onBack={manualView !== 'none' ? () => setManualView('none') : (isEditingProfile ? () => setIsEditingProfile(false) : (selectedStudent ? () => setSelectedStudent(null) : (currentView === 'batch_report' ? () => setCurrentView('records') : (selectedLesson && currentView === 'home' ? () => setSelectedLesson(null) : undefined))))} isRecording={isRecording} onMenuClick={() => setIsDrawerOpen(true)} isDarkMode={isDarkMode} teacherPhoto={teacherInfo.photoUrl} />
      <main className="overflow-y-auto no-scrollbar h-[calc(100vh-84px-84px)]">{renderContent()}</main>
      <NavigationBar activeView={currentView} setView={(v) => { setCurrentView(v); setSelectedStudent(null); setSelectedLesson(null); setIsEditingProfile(false); setManualView('none'); setIsSelectionMode(false); setSelectedIds(new Set()); }} isDarkMode={isDarkMode} />

      {/* Lesson Edit Modal */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setEditingLesson(null);
          setModalPosition(null);
        }}
        lesson={editingLesson}
        position={modalPosition}
        onSave={handleSaveLesson}
        days={days}
      />

      {/* Add Comment Modal */}
      {isAddCommentModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] animate-fade-in"
            onClick={() => setIsAddCommentModalOpen(false)}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
            <div
              className={`w-full max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} rounded-[2.5rem] border shadow-2xl p-8 space-y-6 animate-scale-in pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    관찰 코멘트 추가
                  </h3>
                  <p className="text-sm text-slate-400 font-bold mt-1">
                    {selectedStudent?.name} 학생
                  </p>
                </div>
                <button
                  onClick={() => setIsAddCommentModalOpen(false)}
                  className={`size-10 rounded-full flex items-center justify-center transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    관찰 메모
                  </label>
                  <textarea
                    value={newComment.note}
                    onChange={(e) => setNewComment({ note: e.target.value })}
                    placeholder="수업 중 기억에 남는 학생의 모습이나 행동을 기록하세요..."
                    className={`w-full h-32 rounded-2xl px-5 py-4 font-medium border-0 ring-1 focus:ring-2 focus:ring-emerald-500 transition-all resize-none ${isDarkMode ? 'bg-slate-950 ring-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 ring-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setNewComment({ note: '' });
                    setIsAddCommentModalOpen(false);
                  }}
                  className={`flex-1 h-14 rounded-2xl font-black transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}
                >
                  취소
                </button>
                <button
                  onClick={handleAddStudentComment}
                  className="flex-1 h-14 rounded-2xl bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  추가하기
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Student Edit Modal */}
      {isEditStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setIsEditStudentModalOpen(false)}>
          <div className={`w-full max-w-md rounded-3xl p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>학생 정보 수정</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>이름</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>학년</label>
                  <input
                    type="text"
                    value={editingStudent.grade}
                    onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>반</label>
                  <input
                    type="text"
                    value={editingStudent.classNumber}
                    onChange={(e) => setEditingStudent({ ...editingStudent, classNumber: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>번호</label>
                  <input
                    type="number"
                    value={editingStudent.studentNumber}
                    onChange={(e) => setEditingStudent({ ...editingStudent, studentNumber: parseInt(e.target.value) })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsEditStudentModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}
                >
                  취소
                </button>
                <button
                  onClick={handleSaveStudentEdit}
                  className="flex-1 py-3 rounded-xl font-bold bg-primary text-white"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
