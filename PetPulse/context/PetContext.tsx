import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Pet {
  id: string;
  name: string;
  breed?: string;
  dob?: string;
  height?: string;
  weight?: string;
  size?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  colour?: string;
  gender?: 'Female' | 'Male' | 'Other';
  hasChip?: boolean;
  chipDetails?: string;
  photoURL?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

type Ctx = {
  pets: Pet[];
  selectedPetId: string | null;
  setSelectedPetId: (id: string | null) => void;
  selectedPet: Pet | null;
  loadingPets: boolean;
};

const PetCtx = createContext<Ctx>({
  pets: [],
  selectedPetId: null,
  setSelectedPetId: () => {},
  selectedPet: null,
  loadingPets: true,
});

const STORAGE_KEY = 'petpulse:selectedPetId';

export const PetProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetIdState] = useState<string | null>(null);
  const [loadingPets, setLoadingPets] = useState(true);

  // track auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setPets([]);
      setSelectedPetIdState(null);
    });
    return unsub;
  }, []);

  // load last selected
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) setSelectedPetIdState(v);
    });
  }, []);

  // subscribe pets
  useEffect(() => {
    if (!uid) { setPets([]); setLoadingPets(false); return; }
    const col = collection(db, 'users', uid, 'pets');
    const qy = query(col, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(qy, (snap) => {
      const rows: Pet[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
      setPets(rows);
      setLoadingPets(false);
      if (rows.length && (!selectedPetId || !rows.find(p => p.id === selectedPetId))) {
        setSelectedPetId(rows[0].id);
      }
    }, () => setLoadingPets(false));
    return unsub;
  }, [uid]);

  const setSelectedPetId = (id: string | null) => {
    setSelectedPetIdState(id);
    if (id) AsyncStorage.setItem(STORAGE_KEY, id).catch(()=>{});
  };

  const selectedPet = useMemo(
    () => pets.find(p => p.id === selectedPetId) ?? null,
    [pets, selectedPetId]
  );

  return (
    <PetCtx.Provider value={{ pets, selectedPetId, setSelectedPetId, selectedPet, loadingPets }}>
      {children}
    </PetCtx.Provider>
  );
};

export const usePets = () => useContext(PetCtx);
