import { useContext } from 'react';
import { WeddingContext, type WeddingContextType } from './WeddingContext';

export const useWedding = (): WeddingContextType => {
  const context = useContext(WeddingContext);
  if (!context) {
    throw new Error('useWedding must be used within a WeddingProvider');
  }
  return context;
};
