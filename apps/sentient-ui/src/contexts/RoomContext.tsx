import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface RoomContextType {
  selectedClientId: string | null;
  selectedClientName: string | null;
  selectedVenueId: string | null;
  selectedVenueName: string | null;
  selectedRoomId: string | null;
  selectedRoomName: string | null;
  setRoomContext: (clientId: string, clientName: string, venueId: string, venueName: string, roomId: string, roomName: string) => void;
  clearRoomContext: () => void;
  hasRoomSelected: boolean;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

const STORAGE_KEY = 'sentient_room_context';

interface StoredContext {
  clientId: string;
  clientName: string;
  venueId: string;
  venueName: string;
  roomId: string;
  roomName: string;
}

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedVenueName, setSelectedVenueName] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredContext = JSON.parse(stored);
        setSelectedClientId(parsed.clientId);
        setSelectedClientName(parsed.clientName);
        setSelectedVenueId(parsed.venueId);
        setSelectedVenueName(parsed.venueName);
        setSelectedRoomId(parsed.roomId);
        setSelectedRoomName(parsed.roomName);
        console.log('[RoomContext] Loaded from localStorage:', parsed);
      } catch (error) {
        console.error('[RoomContext] Failed to parse stored context:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setRoomContext = (clientId: string, clientName: string, venueId: string, venueName: string, roomId: string, roomName: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setSelectedVenueId(venueId);
    setSelectedVenueName(venueName);
    setSelectedRoomId(roomId);
    setSelectedRoomName(roomName);

    const context: StoredContext = { clientId, clientName, venueId, venueName, roomId, roomName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    console.log('[RoomContext] Context set:', context);
  };

  const clearRoomContext = () => {
    setSelectedClientId(null);
    setSelectedClientName(null);
    setSelectedVenueId(null);
    setSelectedVenueName(null);
    setSelectedRoomId(null);
    setSelectedRoomName(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('[RoomContext] Context cleared');
  };

  const hasRoomSelected = Boolean(selectedClientId && selectedVenueId && selectedRoomId);

  return (
    <RoomContext.Provider
      value={{
        selectedClientId,
        selectedClientName,
        selectedVenueId,
        selectedVenueName,
        selectedRoomId,
        selectedRoomName,
        setRoomContext,
        clearRoomContext,
        hasRoomSelected,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoomContext = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return context;
};
