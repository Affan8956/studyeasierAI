
import React, { useState } from 'react';
import { Flashcard } from '../types';

interface FlashcardViewProps {
  flashcards: Flashcard[];
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Validate input is an array
  if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
    return (
      <div className="text-center p-8 text-text-muted flex flex-col items-center justify-center h-64">
        <i className="fas fa-layer-group text-4xl mb-4 opacity-20"></i>
        <p>No flashcards available in this set.</p>
      </div>
    );
  }

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % flashcards.length), 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length), 200);
  };

  const currentCard = flashcards[currentIndex];

  if (!currentCard) return null;

  return (
    <div className="flex flex-col items-center py-12 px-4 w-full animate-fadeIn">
      {/* 3D Card Container */}
      <div className="w-full max-w-xl h-96 perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
        <div
          className={`relative w-full h-full transition-transform duration-700 transform-style-3d shadow-2xl rounded-3xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front Face (Question) */}
          <div className="absolute inset-0 backface-hidden bg-surface rounded-3xl flex flex-col items-center justify-center p-10 text-center border border-border">
             <div className="mb-6 w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-question text-xl"></i>
             </div>
             <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Question</h3>
             <p className="text-2xl font-bold text-text-main leading-snug select-none">{currentCard.front}</p>
             
             <div className="absolute bottom-6 text-text-muted text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-sync-alt"></i> Tap to Reveal
             </div>
          </div>
          
          {/* Back Face (Answer) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-3xl flex flex-col items-center justify-center p-10 text-center border border-indigo-500">
             <div className="mb-6 w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center">
                <i className="fas fa-lightbulb text-xl"></i>
             </div>
             <h3 className="text-xs font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">Answer</h3>
             <p className="text-2xl font-medium text-white leading-relaxed select-none">{currentCard.back}</p>

             <div className="absolute bottom-6 text-indigo-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-sync-alt"></i> Tap to Flip Back
             </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between w-full max-w-xl mt-10">
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="p-4 rounded-2xl bg-surface text-text-muted hover:text-text-main hover:bg-surface2 transition-all border border-border shadow-md"
          title="Previous Card"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        
        <div className="flex flex-col items-center gap-2">
           <span className="text-text-muted font-black text-xs uppercase tracking-widest">
             Card {currentIndex + 1} / {flashcards.length}
           </span>
           <div className="flex gap-1">
              {flashcards.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-indigo-500' : 'w-1.5 bg-border'}`}></div>
              ))}
           </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="p-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          title="Next Card"
        >
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};

export default FlashcardView;
