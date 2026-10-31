import React, { useState } from 'react';
import { ArrowLeft, Check, Layers, GraduationCap } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { User } from '../types';

interface SelectClassScreenProps {
  onBack: () => void;
  selectedClass: string;
  onSelectClass: (c: string) => void;
  currentUser?: User | null;
}

export const SelectClassScreen: React.FC<SelectClassScreenProps> = ({
  onBack,
  selectedClass,
  onSelectClass,
  currentUser,
}) => {
  const [currentChoice, setCurrentChoice] = useState(selectedClass);

  const activeUser = currentUser || StorageService.getCurrentUser();
  const allowedClasses = StorageService.getAllowedClassesForUser(activeUser);

  const handleConfirm = () => {
    onSelectClass(currentChoice);
    onBack();
  };

  return (
    <div className="flex-1 w-full bg-[#F5F7F6] flex flex-col justify-between relative">
      {/* Header (Matching Reference Item 10) */}
      <header className="sticky top-0 bg-[#075B36] text-white px-4 py-3.5 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white tracking-tight">
            Pilih Kelas
          </h1>
        </div>
      </header>

      {/* Class List with Radio Buttons (Matching Reference Item 10 Exactly) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {activeUser?.role !== 'siswa' && (
          <div
            onClick={() => setCurrentChoice('all')}
            className={`w-full bg-white rounded-2xl p-4 border transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.99] ${
              currentChoice === 'all' || currentChoice === 'Semua Kelas'
                ? 'border-[#078749] ring-1 ring-[#078749]/30 bg-emerald-50/20'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div>
              <span
                className={`text-sm font-semibold tracking-wide block ${
                  currentChoice === 'all' || currentChoice === 'Semua Kelas' ? 'text-[#075B36] font-bold' : 'text-slate-800'
                }`}
              >
                {activeUser?.role === 'guru' ? 'Semua Kelas (Kelas Ajar)' : 'Semua Kelas'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Tampilkan rekap/data seluruh kelas yang Anda kelola
              </span>
            </div>

            {/* Radio Indicator */}
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                currentChoice === 'all' || currentChoice === 'Semua Kelas'
                  ? 'border-[#078749] bg-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {(currentChoice === 'all' || currentChoice === 'Semua Kelas') && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#078749]"></div>
              )}
            </div>
          </div>
        )}

        {allowedClasses.map((item) => {
          const isSelected = currentChoice === item.nama;

          return (
            <div
              key={item.id}
              onClick={() => setCurrentChoice(item.nama)}
              className={`w-full bg-white rounded-2xl p-4 border transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.99] ${
                isSelected
                  ? 'border-[#078749] ring-1 ring-[#078749]/30 bg-emerald-50/20'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                <span
                  className={`text-sm font-semibold tracking-wide block ${
                    isSelected ? 'text-[#075B36] font-bold' : 'text-slate-800'
                  }`}
                >
                  {item.nama}
                </span>
                {item.waliKelas && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Wali Kelas: {item.waliKelas}
                  </span>
                )}
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-[#078749] bg-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#078749]"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Select Button (Matching Reference Item 10: "Pilih") */}
      <div className="p-4 bg-white/95 backdrop-blur-xs border-t border-slate-200 shrink-0">
        <button
          onClick={handleConfirm}
          className="w-full py-3 px-4 rounded-xl bg-[#078749] hover:bg-[#075B36] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-800/20 transition-all flex items-center justify-center cursor-pointer"
        >
          Pilih
        </button>
      </div>
    </div>
  );
};
