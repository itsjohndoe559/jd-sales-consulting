'use client';

import { createContext, useContext, useState } from 'react';

type AddSaleContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const AddSaleContext = createContext<AddSaleContextValue | null>(null);

export function AddSaleProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AddSaleContext.Provider value={{ open, setOpen }}>
      {children}
    </AddSaleContext.Provider>
  );
}

export function useAddSale() {
  const ctx = useContext(AddSaleContext);
  if (!ctx) {
    throw new Error('useAddSale must be used within AddSaleProvider');
  }
  return ctx;
}
